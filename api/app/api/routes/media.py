import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from minio.error import S3Error
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.api.metrics import COUNTER_MEDIA_DELETES, COUNTER_MEDIA_UPLOADS, incr
from app.models.media import Media, MediaFolder
from app.models.user import Usuario
from app.schemas.media import FolderCreate, FolderResponse
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


@router.get("/carpetas", response_model=list[dict])
async def listar_carpetas(db: Session = Depends(get_db)):
    folders = db.query(MediaFolder).all()
    return [
        {"id": str(f.id), "name": f.name, "path": f.path, "parent": f.parent}
        for f in folders
    ]


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
    folder_path = media_service.ensure_folder_exists(db, clean_folder)

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


@router.delete("/{media_id:path}")
async def eliminar_archivo(
    media_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
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
    if folder_data.parent:
        path = f"{folder_data.parent}{folder_data.name}" if folder_data.parent.endswith('/') else f"{folder_data.parent}/{folder_data.name}"
    else:
        path = f"/{folder_data.name}"

    nueva = MediaFolder(name=folder_data.name, path=path, parent=folder_data.parent)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return FolderResponse(
        id=str(nueva.id),
        name=nueva.name,
        path=nueva.path,
        parent=nueva.parent,
    )
