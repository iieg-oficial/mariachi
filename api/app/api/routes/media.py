import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from minio.error import S3Error
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE, get_current_user, get_db, verify_csrf
from app.api.metrics import COUNTER_MEDIA_DELETES, COUNTER_MEDIA_UPLOADS, incr
from app.models.media import Media, MediaFolder
from app.models.user import Usuario
from app.schemas.media import FolderCreate, FolderResponse, MediaUpdate
from app.services import media_service
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/multimedia", tags=["media"])


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
    bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
    return media_service.listar_media(db, bucket, folder, type, search, recursive)


@router.get("/proxy/{bucket_id}/{object_path:path}")
async def proxy_object(
    bucket_id: int,
    object_path: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)
    try:
        stat = client.stat_object(object_path)
    except S3Error as exc:
        if exc.code in {"NoSuchKey", "NoSuchBucket"}:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        logger.exception("action=media.proxy.stat user_id=%s bucket=%s key=%s", current_user.id, bucket.acervo_bucket, object_path)
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
    bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
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
    bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
    folders = (
        db.query(MediaFolder)
        .filter(MediaFolder.bucket_id == bucket.id)
        .order_by(MediaFolder.path)
        .all()
    )
    return [media_service.serialize_folder(f) for f in folders]


@router.post("", status_code=status.HTTP_201_CREATED)
async def subir_archivo(
    file: UploadFile = File(...),
    folder: str = Form("/"),
    alt: str = Form(""),
    bucket_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)

    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    base = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

    clean_folder = (folder or "").strip().strip("/")
    object_key = f"{clean_folder}/{base}" if clean_folder else base
    folder_path = media_service.ensure_folder_exists(db, bucket.id, clean_folder)

    try:
        url = await client.upload_file(file, object_key)

        nuevo = Media(
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
            "action=media.upload user_id=%s bucket=%s size=%s name=%s",
            current_user.id, bucket.acervo_bucket, nuevo.size, nuevo.original_name,
        )
        return media_service.serialize_media(nuevo)
    except Exception:
        logger.exception("action=media.upload.error user_id=%s bucket=%s", current_user.id, bucket.acervo_bucket)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al subir archivo",
        )


@router.put("/{media_id}", response_model=dict)
async def actualizar_archivo(
    media_id: int,
    payload: MediaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    item = db.query(Media).filter(Media.id == media_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")
    if item.bucket_id:
        media_service.resolve_bucket_or_403(item.bucket_id, current_user, db)

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
    return media_service.serialize_media(item)


@router.delete("/{media_id:path}")
async def eliminar_archivo(
    media_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if media_id.startswith("dir:"):
        try:
            _, bucket_id_str, name = media_id.split(":", 2)
            bucket_id = int(bucket_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID de directorio invalido")
        if current_user.role != ADMIN_ROLE:
            raise HTTPException(status_code=403, detail="Solo admin puede borrar directorios")
        bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
        client = AcervoClient.for_bucket(bucket)
        prefix = name if name.endswith("/") else f"{name}/"
        deleted = client.delete_prefix(prefix)
        db.query(Media).filter(
            Media.bucket_id == bucket.id,
            Media.name.like(f"{prefix}%"),
        ).delete(synchronize_session=False)
        db.commit()
        incr(COUNTER_MEDIA_DELETES)
        logger.info(
            "action=media.delete.dir user_id=%s bucket=%s prefix=%s deleted=%s",
            current_user.id, bucket.acervo_bucket, prefix, deleted,
        )
        return {"message": f"Directorio eliminado ({deleted} objetos)"}

    if media_id.startswith("bucket:"):
        try:
            _, bucket_id_str, name = media_id.split(":", 2)
            bucket_id = int(bucket_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID sintetico invalido")
        bucket = media_service.resolve_bucket_or_403(bucket_id, current_user, db)
        client = AcervoClient.for_bucket(bucket)
        client.delete_file(name)
        incr(COUNTER_MEDIA_DELETES)
        logger.info("action=media.delete.bucket_only user_id=%s bucket=%s name=%s", current_user.id, bucket_id, name)
        return {"message": "Archivo eliminado del bucket"}

    try:
        media_int = int(media_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID invalido")

    item = db.query(Media).filter(Media.id == media_int).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")

    if item.bucket_id:
        bucket = media_service.resolve_bucket_or_403(item.bucket_id, current_user, db)
        client = AcervoClient.for_bucket(bucket)
        client.delete_file(item.name)

    db.delete(item)
    db.commit()
    incr(COUNTER_MEDIA_DELETES)
    logger.info("action=media.delete user_id=%s media_id=%s name=%s", current_user.id, item.id, item.name)
    return {"message": "Archivo eliminado exitosamente"}


@router.post("/carpetas", status_code=status.HTTP_201_CREATED, response_model=FolderResponse)
async def crear_carpeta(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    bucket = media_service.resolve_bucket_or_403(folder_data.bucket_id, current_user, db)

    if folder_data.parent:
        path = f"{folder_data.parent}{folder_data.name}" if folder_data.parent.endswith('/') else f"{folder_data.parent}/{folder_data.name}"
    else:
        path = f"/{folder_data.name}"

    duplicate = (
        db.query(MediaFolder)
        .filter(
            MediaFolder.bucket_id == bucket.id,
            MediaFolder.path == path,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Carpeta ya existe en este bucket")

    nueva = MediaFolder(
        bucket_id=bucket.id,
        name=folder_data.name,
        path=path,
        parent=folder_data.parent,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return media_service.serialize_folder(nueva)


@router.delete("/carpetas/{folder_id}")
async def eliminar_carpeta(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    folder = db.query(MediaFolder).filter(MediaFolder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carpeta no encontrada")

    media_service.resolve_bucket_or_403(folder.bucket_id, current_user, db)

    media_count = (
        db.query(Media)
        .filter(Media.bucket_id == folder.bucket_id, Media.folder == folder.path)
        .count()
    )
    if media_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La carpeta contiene archivos; muévelos o elimínalos primero",
        )

    db.delete(folder)
    db.commit()
    logger.info(
        "action=media.folder.delete user_id=%s bucket_id=%s folder=%s",
        current_user.id, folder.bucket_id, folder.path,
    )
    return {"message": "Carpeta eliminada"}
