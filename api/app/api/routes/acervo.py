import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from minio.error import S3Error
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE, get_current_user, get_db, verify_csrf
from app.api.metrics import COUNTER_MEDIA_DELETES, COUNTER_MEDIA_UPLOADS, incr
from app.api.rate_limit import rate_limit
from app.models.acervo import AcervoFile, AcervoFolder
from app.models.user import Usuario
from app.schemas.acervo import AcervoFileUpdate, FileMoveRequest, FolderCreate, FolderResponse
from app.services import acervo_file_service
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/acervo", tags=["acervo"])

_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0, scope='acervo_write')
_upload_rate_limit = rate_limit(max_requests=240, window_seconds=60.0, scope='acervo_upload')


@router.get("", response_model=list[dict])
async def listar_media(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    bucket_id: int = Query(..., description="ID del bucket"),
    folder: str | None = Query(None),
    type: str | None = Query(None),
    search: str | None = Query(None),
    recursive: bool = Query(False, description="Si false, devuelve solo el primer nivel del prefix (incluye carpetas)"),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    return acervo_file_service.listar_media(db, bucket, folder, type, search, recursive)


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

    headers = {
        "Cache-Control": "private, max-age=300",
        "Content-Length": str(stat.size) if stat.size is not None else "",
    }
    return StreamingResponse(
        iterator(),
        media_type=stat.content_type or "application/octet-stream",
        headers=headers,
    )


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
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_upload_rate_limit),
):
    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)

    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    base = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

    clean_folder = (folder or "").strip().strip("/")
    object_key = f"{clean_folder}/{base}" if clean_folder else base
    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, clean_folder)

    duplicate = (
        db.query(AcervoFile)
        .filter(
            AcervoFile.bucket_id == bucket.id,
            AcervoFile.folder == folder_path,
            AcervoFile.original_name == file.filename,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe '{file.filename}' en esta carpeta",
        )

    try:
        url = await client.upload_file(file, object_key)

        nuevo = AcervoFile(
            bucket_id=bucket.id,
            name=object_key,
            original_name=file.filename,
            type=file.content_type or "application/octet-stream",
            size=file.size or 0,
            url=url,
            thumbnail=url if file.content_type and file.content_type.startswith("image/") else None,
            folder=folder_path,
            uploaded_by=current_user.id,
            metadata_json={"alt": alt} if alt else {},
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        incr(COUNTER_MEDIA_UPLOADS)
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

    bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
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

    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, target_folder)
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
    if item.bucket_id:
        acervo_file_service.resolve_bucket_or_403(item.bucket_id, current_user, db)

    data = payload.model_dump(exclude_unset=True)
    metadata = dict(item.metadata_json or {})
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
    bucket = acervo_file_service.resolve_bucket_or_403(folder_data.bucket_id, current_user, db)

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

    bucket = acervo_file_service.resolve_bucket_or_403(folder.bucket_id, current_user, db)

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

    db.delete(folder)
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
        if current_user.role != ADMIN_ROLE:
            raise HTTPException(status_code=403, detail="Solo admin puede borrar directorios")
        bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
        client = AcervoClient.for_bucket(bucket)
        prefix = name if name.endswith("/") else f"{name}/"
        deleted = client.delete_prefix(prefix)
        db.query(AcervoFile).filter(
            AcervoFile.bucket_id == bucket.id,
            AcervoFile.name.like(f"{prefix}%"),
        ).delete(synchronize_session=False)
        db.query(AcervoFolder).filter(
            AcervoFolder.bucket_id == bucket.id,
            AcervoFolder.path.like(f"{prefix}%"),
        ).delete(synchronize_session=False)
        db.commit()
        incr(COUNTER_MEDIA_DELETES)
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
        bucket = acervo_file_service.resolve_bucket_or_403(bucket_id, current_user, db)
        client = AcervoClient.for_bucket(bucket)
        client.delete_file(name)
        incr(COUNTER_MEDIA_DELETES)
        logger.info("action=acervo.delete.bucket_only user_id=%s bucket=%s name=%s", current_user.id, bucket_id, name)
        return {"message": "Archivo eliminado del bucket"}

    try:
        media_int = int(media_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalido")

    item = db.query(AcervoFile).filter(AcervoFile.id == media_int).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")

    if item.bucket_id:
        bucket = acervo_file_service.resolve_bucket_or_403(item.bucket_id, current_user, db)
        client = AcervoClient.for_bucket(bucket)
        client.delete_file(item.name)

    db.delete(item)
    db.commit()
    incr(COUNTER_MEDIA_DELETES)
    logger.info("action=acervo.delete user_id=%s media_id=%s name=%s", current_user.id, item.id, item.name)
    return {"message": "Archivo eliminado exitosamente"}
