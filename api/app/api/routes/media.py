import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE, get_current_user, get_db, verify_csrf
from app.api.metrics import COUNTER_MEDIA_DELETES, COUNTER_MEDIA_UPLOADS, incr
from app.models.media import Media, MediaFolder
from app.models.media_bucket import MediaBucket
from app.models.project import UserProject
from app.models.user import Usuario
from app.schemas.media import FolderCreate, FolderResponse
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/multimedia", tags=["media"])


def _resolve_bucket_or_403(
    bucket_id: int,
    current_user: Usuario,
    db: Session,
) -> MediaBucket:
    bucket = (
        db.query(MediaBucket)
        .filter(MediaBucket.id == bucket_id, MediaBucket.is_active.is_(True))
        .first()
    )
    if bucket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bucket no encontrado")

    if current_user.role == ADMIN_ROLE:
        return bucket

    membership = (
        db.query(UserProject)
        .filter(
            UserProject.user_id == current_user.id,
            UserProject.project_id == bucket.project_id,
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este bucket")
    return bucket


def _serialize_media(item: Media) -> dict:
    return {
        "id": str(item.id),
        "bucket_id": item.bucket_id,
        "name": item.name,
        "originalName": item.original_name,
        "type": item.type,
        "size": item.size,
        "url": item.url,
        "thumbnail": item.thumbnail,
        "folder": item.folder,
        "uploadedBy": str(item.uploaded_by),
        "uploadedByName": item.uploaded_by_user.name if item.uploaded_by_user else "Unknown",
        "uploadedAt": item.uploaded_at.isoformat(),
        "metadata": item.metadata_json or {},
    }


@router.get("", response_model=list[dict])
async def listar_media(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    bucket_id: int = Query(..., description="ID del bucket"),
    folder: str | None = Query(None),
    type: str | None = Query(None),
    search: str | None = Query(None),
):
    _resolve_bucket_or_403(bucket_id, current_user, db)

    query = db.query(Media).filter(Media.bucket_id == bucket_id)
    if folder:
        query = query.filter(Media.folder == folder)
    if type:
        query = query.filter(Media.type.startswith(type))
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.filter(
            Media.name.ilike(search_lower) | Media.original_name.ilike(search_lower)
        )

    items = query.order_by(Media.uploaded_at.desc()).all()
    return [_serialize_media(item) for item in items]


@router.get("/objetos-bucket", response_model=list[dict])
async def listar_objetos_bucket(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    bucket_id: int = Query(...),
    prefix: str = Query(""),
):
    bucket = _resolve_bucket_or_403(bucket_id, current_user, db)
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
    bucket = _resolve_bucket_or_403(bucket_id, current_user, db)
    client = AcervoClient.for_bucket(bucket)

    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_name = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

    try:
        url = await client.upload_file(file, unique_name)

        nuevo = Media(
            bucket_id=bucket.id,
            name=unique_name,
            original_name=file.filename,
            type=file.content_type or "application/octet-stream",
            size=file.size or 0,
            url=url,
            thumbnail=url if file.content_type and file.content_type.startswith("image/") else None,
            folder=folder,
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
        return _serialize_media(nuevo)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir archivo: {str(e)}",
        )


@router.delete("/{media_id}")
async def eliminar_archivo(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    item = db.query(Media).filter(Media.id == media_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado")

    if item.bucket_id:
        bucket = _resolve_bucket_or_403(item.bucket_id, current_user, db)
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
