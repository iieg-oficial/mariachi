import logging
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from minio.error import S3Error
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, has_permission, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.bucket_policies import get_hidden_prefixes
from app.models.acervo import AcervoFile, AcervoFolder
from app.models.acervo_bucket import AcervoBucket
from app.models.user import Usuario
from app.schemas.acervo import (
    AcervoFileUpdate,
    BulkFileMoveRequest,
    FileMoveRequest,
    FolderCreate,
    FolderResponse,
)
from app.services import acervo_file_service, acervo_thumbnails, tipo_archivo
from app.services.acervo import AcervoClient, ObjectTooLargeError, build_content_disposition
from app.services.actividad_service import registrar_actividad

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/acervo", tags=["acervo"])

_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0, scope='acervo_write')
_upload_rate_limit = rate_limit(max_requests=240, window_seconds=60.0, scope='acervo_upload')


@router.get("", response_model=dict)
async def listar_media(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    bucket_id: int = Query(..., description="ID del bucket"),
    folder: str | None = Query(None),
    type: str | None = Query(None),
    search: str | None = Query(None),
    recursive: bool = Query(False, description="Si false, devuelve solo el primer nivel del prefix (incluye carpetas)"),
    limit: int = Query(
        acervo_file_service.LISTADO_PAGE_SIZE,
        ge=1,
        le=acervo_file_service.LISTADO_MAX_PAGE_SIZE,
        description="Tamaño de página del listado",
    ),
    offset: int = Query(0, ge=0, description="Elementos a saltar antes de la página"),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    return acervo_file_service.listar_media(
        db, bucket, folder, type, search, recursive, limit=limit, offset=offset,
    )


@router.get("/proxy/{bucket_id}/{object_path:path}")
async def proxy_object(
    bucket_id: int,
    object_path: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)
    try:
        stat = client.stat_object(object_path)
    except S3Error as exc:
        if exc.code in {"NoSuchKey", "NoSuchBucket"}:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        logger.exception("action=acervo.proxy.stat user_id=%s bucket=%s key=%s", current_user.id, bucket.acervo_bucket, object_path)
        raise HTTPException(status_code=502, detail="Error consultando acervo")

    response = client.get_object_stream(object_path)

    def iterator():
        try:
            for chunk in response.stream(64 * 1024):
                yield chunk
        finally:
            response.close()
            response.release_conn()

    media_type = stat.content_type or "application/octet-stream"
    headers = {
        "Cache-Control": "private, max-age=300",
        "Content-Length": str(stat.size) if stat.size is not None else "",
        "X-Content-Type-Options": "nosniff",
    }
    disposition = next(
        (
            value
            for key, value in (stat.metadata or {}).items()
            if key.lower() == "content-disposition"
        ),
        None,
    )
    if disposition:
        headers["Content-Disposition"] = disposition
    if not tipo_archivo.es_inline_seguro(media_type):
        headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
        headers["Content-Disposition"] = build_content_disposition(
            object_path.rsplit("/", 1)[-1] or "archivo", "attachment"
        )
    return StreamingResponse(iterator(), media_type=media_type, headers=headers)


def _read_object_bytes(client: AcervoClient, object_name: str) -> bytes:
    response = client.get_object_stream(object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def _serve_thumbnail(
    client: AcervoClient,
    bucket_name: str,
    object_path: str,
    w: int,
    *,
    user_id: str | None = None,
    cache_visibility: str = "private",
):
    try:
        stat = client.stat_object(object_path)
    except S3Error as exc:
        if exc.code in {"NoSuchKey", "NoSuchBucket"}:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        logger.exception(
            "action=acervo.thumb.stat user_id=%s bucket=%s key=%s",
            user_id, bucket_name, object_path,
        )
        raise HTTPException(status_code=502, detail="Error consultando acervo")

    content_type = stat.content_type or acervo_file_service.guess_mime(object_path)

    if content_type == "image/svg+xml" or object_path.lower().endswith(".svg"):
        data = _read_object_bytes(client, object_path)
        return Response(
            content=data,
            media_type="image/svg+xml",
            headers={
                "Cache-Control": f"{cache_visibility}, max-age=86400",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "script-src 'none'; sandbox",
            },
        )

    if not acervo_thumbnails.is_raster_image(content_type):
        raise HTTPException(status_code=415, detail="Tipo no soportado para miniatura")

    width = acervo_thumbnails.normalize_width(w)
    etag = stat.etag
    key = acervo_thumbnails.thumb_key(object_path, etag, width)
    headers = {
        "Cache-Control": f"{cache_visibility}, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
        "ETag": f'"{acervo_thumbnails._clean_etag(etag)}-w{width}"',
    }

    try:
        client.stat_object(key)
        cached = _read_object_bytes(client, key)
        return Response(content=cached, media_type="image/webp", headers=headers)
    except S3Error:
        pass

    try:
        original = _read_object_bytes(client, object_path)
        webp = acervo_thumbnails.generate_webp(original, width)
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "action=acervo.thumb.generate user_id=%s bucket=%s key=%s",
            user_id, bucket_name, object_path,
        )
        raise HTTPException(status_code=502, detail="No se pudo generar la miniatura")

    try:
        client.put_bytes(key, webp, "image/webp")
    except Exception:
        logger.warning(
            "action=acervo.thumb.cache_put bucket=%s key=%s falló (se sirve igual)",
            bucket_name, key,
        )

    return Response(content=webp, media_type="image/webp", headers=headers)


@router.get("/thumb/{bucket_id}/{object_path:path}")
async def thumbnail_object(
    bucket_id: int,
    object_path: str,
    w: int = Query(acervo_thumbnails.DEFAULT_WIDTH, ge=16, le=2048),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)
    return _serve_thumbnail(client, bucket.acervo_bucket, object_path, w, user_id=str(current_user.id))


@router.get("/objetos-bucket", response_model=list[dict])
async def listar_objetos_bucket(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    bucket_id: int = Query(...),
    prefix: str = Query(""),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)
    objects = client.list_objects(prefix=prefix)
    for obj in objects:
        obj["url"] = client.get_file_url(obj["name"])
    return objects


@router.get("/carpetas", response_model=list[FolderResponse])
async def listar_carpetas(
    bucket_id: int = Query(..., description="ID del bucket"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    folders = (
        db.query(AcervoFolder)
        .filter(AcervoFolder.bucket_id == bucket.id)
        .order_by(AcervoFolder.path)
        .all()
    )
    return [acervo_file_service.serialize_folder(f) for f in folders]


@router.get("/carpetas/{bucket_id}/zip")
async def descargar_carpeta_zip(
    bucket_id: int,
    prefix: str = Query("", description="Prefijo dentro del bucket (sin / inicial)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)

    normalized_prefix = prefix.strip("/")
    listing = client.list_objects(
        prefix=f"{normalized_prefix}/" if normalized_prefix else "",
        recursive=True,
    )
    files_only = [o for o in listing if not o["is_dir"]]
    if not files_only:
        raise HTTPException(status_code=404, detail="Carpeta vacia o no encontrada")

    total_size = sum(o["size"] for o in files_only)
    if total_size > acervo_file_service.ZIP_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Carpeta excede el limite de {acervo_file_service.ZIP_MAX_BYTES // (1024 * 1024)} MB "
                f"(es {total_size // (1024 * 1024)} MB). Descarga subcarpetas individuales."
            ),
        )

    base_strip = f"{normalized_prefix}/" if normalized_prefix else ""

    def _entries():
        for obj in files_only:
            name = obj["name"]
            arcname = name[len(base_strip):] if base_strip and name.startswith(base_strip) else name
            yield arcname, lambda n=name: client.get_object_stream(n)

    folder_label = normalized_prefix.split("/")[-1] if normalized_prefix else bucket.acervo_bucket
    safe_label = "".join(c if c.isalnum() or c in "._-" else "_" for c in folder_label) or "acervo"
    zip_filename = f"{safe_label}.zip"

    logger.info(
        "action=acervo.folder.zip user_id=%s bucket_id=%s prefix=%s files=%d size=%d",
        current_user.id, bucket.id, normalized_prefix or "/", len(files_only), total_size,
    )

    return StreamingResponse(
        acervo_file_service.stream_zip(_entries()),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def subir_archivo(
    file: UploadFile = File(...),
    folder: str = Form("/"),
    alt: str = Form(""),
    bucket_id: int = Form(...),
    use_uuid: bool = Form(False),
    on_conflict: str = Form("reject"),
    download_name: str = Form(""),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_upload_rate_limit),
):
    bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "create")
    client = AcervoClient.for_bucket(bucket)

    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    clean_folder = (folder or "").strip().strip("/")
    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, clean_folder)

    if use_uuid:
        key_basename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        desired_original = file.filename
    else:
        key_basename = acervo_file_service.sanitize_filename(file.filename)
        desired_original = key_basename

    final_original, object_key = acervo_file_service.resolve_upload_name(
        db,
        bucket.id,
        folder_path,
        clean_folder,
        original_name=desired_original,
        key_basename=key_basename,
        on_conflict=on_conflict,
    )

    clean_download_name = (download_name or "").strip()[:200]
    content_type = tipo_archivo.detectar_mime_upload(file)

    try:
        url = await client.upload_file(
            file, object_key, clean_download_name or None, content_type=content_type
        )

        nuevo = AcervoFile(
            bucket_id=bucket.id,
            name=object_key,
            original_name=final_original,
            type=content_type,
            size=file.size or 0,
            url=url,
            thumbnail=url if content_type.startswith("image/") else None,
            folder=folder_path,
            uploaded_by=current_user.id,
            metadata_json={
                key: value
                for key, value in (("alt", alt), ("downloadName", clean_download_name))
                if value
            },
        )
        db.add(nuevo)
        db.flush()
        registrar_actividad(
            db,
            actor=current_user,
            action="acervo.file.upload",
            resource_type="acervo.file",
            resource_id=nuevo.id,
            metadata={
                "nombre": final_original,
                "bucket": bucket.acervo_bucket,
                "carpeta": folder_path,
            },
        )
        db.commit()
        db.refresh(nuevo)
        logger.info(
            "action=acervo.upload user_id=%s bucket=%s size=%s name=%s",
            current_user.id, bucket.acervo_bucket, nuevo.size, nuevo.original_name,
        )
        return acervo_file_service.serialize_acervo_file(nuevo)
    except Exception:
        logger.exception("action=acervo.upload.error user_id=%s bucket=%s", current_user.id, bucket.acervo_bucket)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al subir archivo",
        )


@router.post("/chunked/init", status_code=status.HTTP_201_CREATED)
async def chunked_upload_init(
    original_name: str = Form(...),
    content_type: str = Form("application/octet-stream"),
    folder: str = Form("/"),
    alt: str = Form(""),
    bucket_id: int = Form(...),
    total_size: int = Form(...),
    total_chunks: int = Form(...),
    use_uuid: bool = Form(False),
    on_conflict: str = Form("reject"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_upload_rate_limit),
):
    from app.services.acervo_chunked import CHUNK_SIZE, create_session

    bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "create")
    client = AcervoClient.for_bucket(bucket)

    file_extension = original_name.split(".")[-1] if "." in original_name else ""
    clean_folder = (folder or "").strip().strip("/")
    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, clean_folder)

    if use_uuid:
        key_basename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        desired_original = original_name
    else:
        key_basename = acervo_file_service.sanitize_filename(original_name)
        desired_original = key_basename

    final_original, object_key = acervo_file_service.resolve_upload_name(
        db,
        bucket.id,
        folder_path,
        clean_folder,
        original_name=desired_original,
        key_basename=key_basename,
        on_conflict=on_conflict,
    )

    content_type = acervo_file_service.guess_mime(final_original)
    upload_id = client.init_multipart_upload(object_key, content_type)

    session_id = create_session({
        'object_key': object_key,
        'upload_id': upload_id,
        'bucket_id': bucket.id,
        'bucket_name': bucket.acervo_bucket,
        'original_name': final_original,
        'content_type': content_type,
        'folder': folder,
        'alt': alt,
        'total_size': total_size,
        'total_chunks': total_chunks,
        'access_key_ref': bucket.access_key_ref,
        'user_id': current_user.id,
    })

    return {
        'session_id': session_id,
        'chunk_size': CHUNK_SIZE,
    }


@router.post("/chunked/{session_id}/part")
async def chunked_upload_part(
    session_id: str,
    chunk: UploadFile = File(...),
    part_number: int = Form(...),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_upload_rate_limit),
):
    from app.services.acervo_chunked import delete_session, get_session, update_session

    session = get_session(session_id)
    if not session or session.get('user_id') != current_user.id:
        raise HTTPException(status_code=404, detail="Sesion de subida no encontrada o expirada")

    client = AcervoClient._cache.get(f"{session['bucket_name']}:{session['access_key_ref']}")
    if not client:
        raise HTTPException(status_code=500, detail="Cliente acervo no disponible")

    data = await chunk.read()
    if part_number == 1:
        detectado = tipo_archivo.detectar_mime(data[:tipo_archivo.CABECERA_BYTES], session['original_name'])
        if tipo_archivo.es_activo(detectado) and not tipo_archivo.es_activo(session['content_type']):
            client.abort_multipart_upload(session['object_key'], session['upload_id'])
            delete_session(session_id)
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="El contenido del archivo no corresponde a su extension",
            )
        session['content_type'] = detectado
    etag = client.upload_part(session['object_key'], session['upload_id'], part_number, data)

    parts = session.get('parts', [])
    parts.append({'part_number': part_number, 'etag': etag})
    session['parts'] = parts
    update_session(session_id, session)

    logger.info(
        "action=acervo.chunked.part user_id=%s session=%s part=%d size=%d",
        current_user.id, session_id, part_number, len(data),
    )

    return {'part_number': part_number, 'etag': etag}


@router.post("/chunked/{session_id}/complete", status_code=status.HTTP_201_CREATED)
async def chunked_upload_complete(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_upload_rate_limit),
):
    from app.services.acervo_chunked import delete_session, get_session

    session = get_session(session_id)
    if not session or session.get('user_id') != current_user.id:
        raise HTTPException(status_code=404, detail="Sesion de subida no encontrada o expirada")

    bucket_id = session['bucket_id']
    bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "create")
    client = AcervoClient._cache.get(f"{session['bucket_name']}:{session['access_key_ref']}")
    if not client:
        client = AcervoClient.for_bucket(bucket)

    parts = sorted(session.get('parts', []), key=lambda p: p['part_number'])
    if len(parts) != session['total_chunks']:
        raise HTTPException(
            status_code=400,
            detail=f"Faltan partes: recibidas {len(parts)} de {session['total_chunks']}",
        )

    client.complete_multipart_upload(session['object_key'], session['upload_id'], parts)

    clean_folder = (session['folder'] or "").strip().strip("/")
    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, clean_folder)

    duplicate = (
        db.query(AcervoFile)
        .filter(
            AcervoFile.bucket_id == bucket.id,
            AcervoFile.folder == folder_path,
            AcervoFile.original_name == session['original_name'],
        )
        .first()
    )
    if duplicate:
        client.delete_file(session['object_key'])
        delete_session(session_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe '{session['original_name']}' en esta carpeta",
        )

    url = client.get_file_url(session['object_key'])

    nuevo = AcervoFile(
        bucket_id=bucket.id,
        name=session['object_key'],
        original_name=session['original_name'],
        type=session['content_type'],
        size=session['total_size'],
        url=url,
        thumbnail=url if session['content_type'] and session['content_type'].startswith("image/") else None,
        folder=folder_path,
        uploaded_by=current_user.id,
        metadata_json={"alt": session.get('alt')} if session.get('alt') else {},
    )
    db.add(nuevo)
    db.flush()
    registrar_actividad(
        db,
        actor=current_user,
        action="acervo.file.upload",
        resource_type="acervo.file",
        resource_id=nuevo.id,
        metadata={
            "nombre": session['original_name'],
            "bucket": bucket.acervo_bucket,
            "carpeta": folder_path,
        },
    )
    db.commit()
    db.refresh(nuevo)
    delete_session(session_id)

    logger.info(
        "action=acervo.chunked.complete user_id=%s bucket=%s size=%s name=%s",
        current_user.id, bucket.acervo_bucket, nuevo.size, nuevo.original_name,
    )

    return acervo_file_service.serialize_acervo_file(nuevo)


@router.post("/mover", response_model=dict)
async def mover_archivo(
    payload: FileMoveRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    target_folder = (payload.folder or "").strip().strip("/")

    item = None
    if payload.id.startswith("bucket:"):
        try:
            _, bucket_id_str, src_name = payload.id.split(":", 2)
            bucket_id = int(bucket_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID sintetico invalido")
    else:
        try:
            media_int = int(payload.id)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID invalido")
        item = db.query(AcervoFile).filter(AcervoFile.id == media_int).first()
        if not item or not item.bucket_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
        bucket_id = item.bucket_id
        src_name = item.name

    bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "update")
    client = AcervoClient.for_bucket(bucket)

    basename = src_name.rsplit("/", 1)[-1]
    dest_name = f"{target_folder}/{basename}" if target_folder else basename
    if dest_name == src_name:
        return item and acervo_file_service.serialize_acervo_file(item) or {"name": src_name}

    try:
        client.copy_file(src_name, dest_name)
    except S3Error as exc:
        if exc.code in {"NoSuchKey", "NoSuchBucket"}:
            raise HTTPException(status_code=404, detail="Archivo no encontrado en el bucket")
        logger.exception("action=acervo.move.copy user_id=%s bucket=%s src=%s", current_user.id, bucket.acervo_bucket, src_name)
        raise HTTPException(status_code=502, detail="Error moviendo archivo en el acervo")
    client.delete_file(src_name)
    acervo_thumbnails.cleanup(client, src_name)

    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, target_folder)
    registrar_actividad(
        db,
        actor=current_user,
        action="acervo.file.move",
        resource_type="acervo.file",
        resource_id=item.id if item is not None else payload.id,
        metadata={
            "de": src_name,
            "a": dest_name,
            "bucket": bucket.acervo_bucket,
        },
    )
    if item is not None:
        item.name = dest_name
        item.folder = folder_path
        item.url = client.get_file_url(dest_name)
        if item.thumbnail:
            item.thumbnail = item.url
        db.commit()
        db.refresh(item)
        result = acervo_file_service.serialize_acervo_file(item)
    else:
        db.commit()
        result = {"id": f"bucket:{bucket.id}:{dest_name}", "name": dest_name, "folder": folder_path}

    logger.info(
        "action=acervo.move user_id=%s bucket=%s src=%s dest=%s",
        current_user.id, bucket.acervo_bucket, src_name, dest_name,
    )
    return result


@router.post("/mover-lote", response_model=dict)
async def mover_archivos_lote(
    payload: BulkFileMoveRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    target_folder = (payload.folder or "").strip().strip("/")
    movidos = 0
    fallos = 0
    errores: list[str] = []

    for item_id in payload.ids:
        try:
            item = None
            bucket_id: int
            src_name: str

            if item_id.startswith("bucket:"):
                try:
                    _, bid_str, name = item_id.split(":", 2)
                    bucket_id = int(bid_str)
                    src_name = name
                except ValueError:
                    fallos += 1
                    errores.append(f"{item_id}: ID sintetico invalido")
                    continue
            else:
                try:
                    media_int = int(item_id)
                except ValueError:
                    fallos += 1
                    errores.append(f"{item_id}: ID invalido")
                    continue
                item = db.query(AcervoFile).filter(AcervoFile.id == media_int).first()
                if not item or not item.bucket_id:
                    fallos += 1
                    errores.append(f"{item_id}: no encontrado")
                    continue
                bucket_id = item.bucket_id
                src_name = item.name

            bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "update")
            client = AcervoClient.for_bucket(bucket)

            basename = src_name.rsplit("/", 1)[-1]
            dest_name = f"{target_folder}/{basename}" if target_folder else basename
            if dest_name == src_name:
                continue

            try:
                client.copy_file(src_name, dest_name)
            except S3Error as exc:
                fallos += 1
                errores.append(f"{basename}: error copiando ({exc.code})")
                continue

            client.delete_file(src_name)
            acervo_thumbnails.cleanup(client, src_name)

            folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, target_folder)
            if item is not None:
                item.name = dest_name
                item.folder = folder_path
                item.url = client.get_file_url(dest_name)
                if item.thumbnail:
                    item.thumbnail = item.url

            registrar_actividad(
                db,
                actor=current_user,
                action="acervo.file.move",
                resource_type="acervo.file",
                resource_id=item.id if item is not None else item_id,
                metadata={
                    "de": src_name,
                    "a": dest_name,
                    "bucket": bucket.acervo_bucket,
                },
            )
            movidos += 1
            logger.info(
                "action=acervo.move_lote user_id=%s bucket=%s src=%s dest=%s",
                current_user.id, bucket.acervo_bucket, src_name, dest_name,
            )
        except HTTPException:
            raise
        except Exception:
            fallos += 1
            logger.exception(
                "action=acervo.move_lote.error user_id=%s item_id=%s",
                current_user.id, item_id,
            )

    db.commit()

    return {
        "movidos": movidos,
        "fallos": fallos,
        "errores": errores,
    }


@router.get("/carpetas/{bucket_id}/info", response_model=dict)
async def info_carpeta(
    bucket_id: int,
    prefix: str = Query("", description="Prefijo dentro del bucket (sin / inicial)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)

    normalized_prefix = prefix.strip("/")
    listing = client.list_objects(
        prefix=f"{normalized_prefix}/" if normalized_prefix else "",
        recursive=True,
    )
    files = [
        o for o in listing
        if not o["is_dir"] and not acervo_file_service.is_folder_marker(o["name"])
    ]

    image_exts = {"png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "avif"}
    image_count = sum(
        1 for o in files
        if "." in o["name"] and o["name"].rsplit(".", 1)[-1].lower() in image_exts
    )

    base_strip = f"{normalized_prefix}/" if normalized_prefix else ""
    subfolders = set()
    for o in files:
        rest = o["name"][len(base_strip):] if base_strip and o["name"].startswith(base_strip) else o["name"]
        if "/" in rest:
            subfolders.add(rest.split("/", 1)[0])

    last_modified = max((o["last_modified"] for o in files if o["last_modified"]), default=None)

    return {
        "prefix": normalized_prefix,
        "fileCount": len(files),
        "totalSize": sum(o["size"] for o in files),
        "imageCount": image_count,
        "subfolderCount": len(subfolders),
        "lastModified": last_modified,
    }


_DOCUMENT_MIME_PREFIXES = (
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/json",
    "application/xml",
    "application/geo+json",
    "text/",
)


def _resumen_bucket(bucket: AcervoBucket) -> dict:
    client = AcervoClient.for_bucket(bucket)
    hidden_prefixes = get_hidden_prefixes(bucket.acervo_bucket)
    objetos = [
        o for o in client.list_objects(prefix="", recursive=True)
        if not any(o["name"].startswith(p) for p in hidden_prefixes)
    ]

    carpetas: set[str] = set()
    for obj in objetos:
        acumulado = ""
        for parte in obj["name"].split("/")[:-1]:
            acumulado = f"{acumulado}{parte}/"
            carpetas.add(acumulado)

    archivos = [
        o for o in objetos
        if not o.get("is_dir") and not acervo_file_service.is_folder_marker(o["name"])
    ]

    imagenes = 0
    documentos = 0
    for obj in archivos:
        mime = acervo_file_service.guess_mime(obj["name"])
        if mime.startswith("image/"):
            imagenes += 1
        elif mime.startswith(_DOCUMENT_MIME_PREFIXES):
            documentos += 1

    return {
        "bucketId": bucket.id,
        "bucket": bucket.acervo_bucket,
        "displayName": bucket.display_name,
        "fileCount": len(archivos),
        "imageCount": imagenes,
        "documentCount": documentos,
        "otherCount": len(archivos) - imagenes - documentos,
        "folderCount": len(carpetas),
        "totalSize": sum(o["size"] for o in archivos),
        "lastModified": max((o["last_modified"] for o in archivos if o["last_modified"]), default=None),
    }


@router.get("/resumen", response_model=dict)
async def resumen_acervo(
    bucket_id: int | None = Query(None, description="Limita el resumen a un bucket"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if bucket_id is not None:
        buckets = [acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)]
    else:
        buckets = acervo_file_service.buckets_accesibles(db, current_user)

    resumenes = []
    for bucket in buckets:
        try:
            resumenes.append(_resumen_bucket(bucket))
        except Exception:
            logger.exception(
                "action=acervo.resumen.error user_id=%s bucket=%s",
                current_user.id, bucket.acervo_bucket,
            )
            resumenes.append({
                "bucketId": bucket.id,
                "bucket": bucket.acervo_bucket,
                "displayName": bucket.display_name,
                "fileCount": 0,
                "imageCount": 0,
                "documentCount": 0,
                "otherCount": 0,
                "folderCount": 0,
                "totalSize": 0,
                "lastModified": None,
                "error": True,
            })

    campos = ("fileCount", "imageCount", "documentCount", "otherCount", "folderCount", "totalSize")
    return {
        "buckets": resumenes,
        "totals": {
            "bucketCount": len(resumenes),
            **{campo: sum(r[campo] for r in resumenes) for campo in campos},
            "lastModified": max(
                (r["lastModified"] for r in resumenes if r["lastModified"]),
                default=None,
            ),
        },
    }


@router.put("/{media_id}", response_model=dict)
async def actualizar_archivo(
    media_id: int,
    payload: AcervoFileUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    item = db.query(AcervoFile).filter(AcervoFile.id == media_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    bucket = None
    if item.bucket_id:
        bucket = acervo_file_service.resolve_bucket_escribible(item.bucket_id, current_user, db, "update")

    data = payload.model_dump(exclude_unset=True)
    metadata = dict(item.metadata_json or {})
    if "download_name" in data and (data["download_name"] or "").strip() != (
        metadata.get("downloadName") or ""
    ):
        if not bucket:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo no pertenece a un bucket",
            )
        download_name = (data["download_name"] or "").strip()
        try:
            AcervoClient.for_bucket(bucket).set_download_name(item.name, download_name or None)
        except ObjectTooLargeError as exc:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)
            )
        except (S3Error, ValueError):
            logger.exception(
                "action=acervo.file.download_name user_id=%s bucket=%s key=%s",
                current_user.id, bucket.acervo_bucket, item.name,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo actualizar el nombre de descarga",
            )
        if download_name:
            metadata["downloadName"] = download_name
        else:
            metadata.pop("downloadName", None)
    if "alt" in data:
        if data["alt"]:
            metadata["alt"] = data["alt"]
        else:
            metadata.pop("alt", None)
    if "description" in data:
        if data["description"]:
            metadata["description"] = data["description"]
        else:
            metadata.pop("description", None)
    item.metadata_json = metadata

    if "folder" in data and data["folder"]:
        new_folder = data["folder"].strip()
        item.folder = new_folder if new_folder.endswith("/") else f"{new_folder}/" if new_folder != "/" else "/"

    registrar_actividad(
        db,
        actor=current_user,
        action="acervo.file.update",
        resource_type="acervo.file",
        resource_id=item.id,
        metadata={"fields": sorted(data.keys()), "bucket_id": item.bucket_id},
    )
    db.commit()
    db.refresh(item)
    return acervo_file_service.serialize_acervo_file(item)




@router.post("/carpetas", status_code=status.HTTP_201_CREATED, response_model=FolderResponse)
async def crear_carpeta(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    bucket = acervo_file_service.resolve_bucket_escribible(folder_data.bucket_id, current_user, db, "create")

    path, name, parent = acervo_file_service.normalize_folder_path(folder_data.parent, folder_data.name)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de carpeta invalido")

    duplicate = (
        db.query(AcervoFolder)
        .filter(
            AcervoFolder.bucket_id == bucket.id,
            AcervoFolder.path == path,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Carpeta ya existe en este bucket")

    nueva = AcervoFolder(
        bucket_id=bucket.id,
        name=name,
        path=path,
        parent=parent,
    )
    db.add(nueva)

    client = AcervoClient.for_bucket(bucket)
    client.put_empty_object(acervo_file_service.folder_marker_key(path))

    registrar_actividad(
        db,
        actor=current_user,
        action="acervo.folder.create",
        resource_type="acervo.folder",
        resource_id=path,
        metadata={"bucket": bucket.acervo_bucket},
    )
    db.commit()
    db.refresh(nueva)
    logger.info(
        "action=acervo.folder.create user_id=%s bucket_id=%s folder=%s",
        current_user.id, bucket.id, path,
    )
    return acervo_file_service.serialize_folder(nueva)


@router.delete("/carpetas/{folder_id}")
async def eliminar_carpeta(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    folder = db.query(AcervoFolder).filter(AcervoFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpeta no encontrada")

    bucket = acervo_file_service.resolve_bucket_escribible(folder.bucket_id, current_user, db, "delete")

    media_count = (
        db.query(AcervoFile)
        .filter(AcervoFile.bucket_id == folder.bucket_id, AcervoFile.folder == folder.path)
        .count()
    )
    if media_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La carpeta contiene archivos; muévelos o elimínalos primero",
        )

    client = AcervoClient.for_bucket(bucket)
    client.delete_file(acervo_file_service.folder_marker_key(folder.path))
    client.delete_file(folder.path)
    acervo_thumbnails.cleanup_prefix(client, folder.path)

    db.delete(folder)
    registrar_actividad(
        db,
        actor=current_user,
        action="acervo.folder.delete",
        resource_type="acervo.folder",
        resource_id=folder.path,
        metadata={"bucket": bucket.acervo_bucket},
    )
    db.commit()
    logger.info(
        "action=acervo.folder.delete user_id=%s bucket_id=%s folder=%s",
        current_user.id, folder.bucket_id, folder.path,
    )
    return {"message": "Carpeta eliminada"}


@router.delete("/{media_id:path}")
async def eliminar_archivo(
    media_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    if media_id.startswith("dir:"):
        try:
            _, bucket_id_str, name = media_id.split(":", 2)
            bucket_id = int(bucket_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID de directorio invalido")
        if not has_permission(current_user, "mariachi.acervo.manage"):
            raise HTTPException(status_code=403, detail="Requiere permiso: mariachi.acervo.manage")
        bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "delete")
        client = AcervoClient.for_bucket(bucket)
        prefix = name if name.endswith("/") else f"{name}/"
        deleted = client.delete_prefix(prefix)
        acervo_thumbnails.cleanup_prefix(client, prefix)
        db.query(AcervoFile).filter(
            AcervoFile.bucket_id == bucket.id,
            AcervoFile.name.like(f"{prefix}%"),
        ).delete(synchronize_session=False)
        db.query(AcervoFolder).filter(
            AcervoFolder.bucket_id == bucket.id,
            AcervoFolder.path.like(f"{prefix}%"),
        ).delete(synchronize_session=False)
        registrar_actividad(
            db,
            actor=current_user,
            action="acervo.folder.delete",
            resource_type="acervo.folder",
            resource_id=prefix,
            metadata={"bucket": bucket.acervo_bucket, "objetos": deleted},
        )
        db.commit()
        logger.info(
            "action=acervo.delete.dir user_id=%s bucket=%s prefix=%s deleted=%s",
            current_user.id, bucket.acervo_bucket, prefix, deleted,
        )
        return {"message": f"Directorio eliminado ({deleted} objetos)"}

    if media_id.startswith("bucket:"):
        try:
            _, bucket_id_str, name = media_id.split(":", 2)
            bucket_id = int(bucket_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID sintetico invalido")
        bucket = acervo_file_service.resolve_bucket_escribible(bucket_id, current_user, db, "delete")
        client = AcervoClient.for_bucket(bucket)
        client.delete_file(name)
        acervo_thumbnails.cleanup(client, name)
        registrar_actividad(
            db,
            actor=current_user,
            action="acervo.file.delete",
            resource_type="acervo.file",
            resource_id=name,
            metadata={"nombre": name.rsplit("/", 1)[-1], "bucket": bucket.acervo_bucket},
        )
        db.commit()
        logger.info("action=acervo.delete.bucket_only user_id=%s bucket=%s name=%s", current_user.id, bucket_id, name)
        return {"message": "Archivo eliminado del bucket"}

    try:
        media_int = int(media_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalido")

    item = db.query(AcervoFile).filter(AcervoFile.id == media_int).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")

    bucket = None
    if item.bucket_id:
        bucket = acervo_file_service.resolve_bucket_escribible(item.bucket_id, current_user, db, "delete")
        client = AcervoClient.for_bucket(bucket)
        client.delete_file(item.name)
        acervo_thumbnails.cleanup(client, item.name)

    db.delete(item)
    registrar_actividad(
        db,
        actor=current_user,
        action="acervo.file.delete",
        resource_type="acervo.file",
        resource_id=item.id,
        metadata={
            "nombre": item.original_name,
            "bucket": bucket.acervo_bucket if bucket else None,
            "carpeta": item.folder,
        },
    )
    db.commit()
    logger.info("action=acervo.delete user_id=%s media_id=%s name=%s", current_user.id, item.id, item.name)
    return {"message": "Archivo eliminado exitosamente"}


public_router = APIRouter(prefix="/acervo", tags=["acervo-public"])


@public_router.get("/thumb/{bucket_name}/{object_path:path}")
async def public_thumbnail(
    bucket_name: str,
    object_path: str,
    w: int = Query(acervo_thumbnails.DEFAULT_WIDTH, ge=16, le=2048),
    db: Session = Depends(get_db),
):
    bucket = (
        db.query(AcervoBucket)
        .filter(AcervoBucket.acervo_bucket == bucket_name, AcervoBucket.is_active.is_(True))
        .first()
    )
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket no encontrado")
    if not bucket.is_public:
        raise HTTPException(status_code=404, detail="Bucket no encontrado")
    client = AcervoClient.for_bucket(bucket)
    return _serve_thumbnail(client, bucket.acervo_bucket, object_path, w, cache_visibility="public")
