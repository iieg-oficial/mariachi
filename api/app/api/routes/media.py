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


_MIME_BY_EXT = {
    "txt": "text/plain", "csv": "text/csv", "pdf": "application/pdf",
    "json": "application/json", "xml": "application/xml",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "zip": "application/zip", "rar": "application/x-rar-compressed",
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml",
    "geojson": "application/geo+json", "shp": "application/octet-stream",
}


def _guess_mime(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return _MIME_BY_EXT.get(ext, "application/octet-stream")


def _folder_from_path(path: str) -> str:
    if "/" not in path:
        return ""
    return "/" + path.rsplit("/", 1)[0]


def _serialize_bucket_only(bucket_id: int, obj: dict) -> dict:
    name = obj["name"]
    is_dir = bool(obj.get("is_dir") or name.endswith("/"))
    last_modified = obj.get("last_modified")
    if last_modified and hasattr(last_modified, "isoformat"):
        last_modified = last_modified.isoformat()
    if is_dir:
        clean = name.rstrip("/")
        return {
            "id": f"dir:{bucket_id}:{name}",
            "bucket_id": bucket_id,
            "name": name,
            "originalName": clean.rsplit("/", 1)[-1],
            "type": "directory",
            "size": 0,
            "url": None,
            "thumbnail": None,
            "folder": _folder_from_path(clean),
            "uploadedBy": None,
            "uploadedByName": "—",
            "uploadedAt": last_modified,
            "metadata": {},
            "bucketOnly": True,
            "isDir": True,
        }
    mime = _guess_mime(name)
    return {
        "id": f"bucket:{bucket_id}:{name}",
        "bucket_id": bucket_id,
        "name": name,
        "originalName": name.rsplit("/", 1)[-1],
        "type": mime,
        "size": obj.get("size", 0),
        "url": obj.get("url"),
        "thumbnail": obj.get("url") if mime.startswith("image/") else None,
        "folder": _folder_from_path(name),
        "uploadedBy": None,
        "uploadedByName": "—",
        "uploadedAt": last_modified,
        "metadata": {},
        "bucketOnly": True,
        "isDir": False,
    }


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
    """Lista archivos del bucket fusionando objetos físicos (MinIO) + registros locales (tabla media).

    Fuente de verdad: el bucket. Los registros locales aportan metadata enriquecida
    (alt, descripción, etc.) cuando existen. Los objetos físicos sin registro local
    aparecen marcados con bucketOnly=true.
    """
    bucket = _resolve_bucket_or_403(bucket_id, current_user, db)

    # 1) Objetos físicos del bucket
    client = AcervoClient.for_bucket(bucket)
    prefix = ""
    if folder and folder != "/":
        prefix = folder.lstrip("/").rstrip("/") + "/"
    bucket_objects = client.list_objects(prefix=prefix, recursive=recursive)
    for obj in bucket_objects:
        if not obj.get("is_dir") and not obj["name"].endswith("/"):
            obj["url"] = client.get_file_url(obj["name"])

    # 2) Registros locales del mismo bucket
    local_items = db.query(Media).filter(Media.bucket_id == bucket_id).all()
    local_by_name = {item.name: item for item in local_items}

    # 3) Fusionar: para cada objeto del bucket, usar el registro local si existe
    results: list[dict] = []
    seen_names: set[str] = set()
    for obj in bucket_objects:
        name = obj["name"]
        seen_names.add(name)
        local = local_by_name.get(name)
        if local is not None:
            entry = _serialize_media(local)
            # Enriquecer con dato fresco del bucket (size/url pueden haber cambiado)
            entry["url"] = obj.get("url") or entry["url"]
            entry["size"] = obj.get("size", entry["size"])
            results.append(entry)
        else:
            results.append(_serialize_bucket_only(bucket_id, obj))

    # 4) Registros locales sin objeto físico (huérfanos): solo cuando hacemos listado
    #    recursivo del bucket (sino no podemos saber si están en otros niveles).
    if recursive:
        for item in local_items:
            if item.name not in seen_names:
                entry = _serialize_media(item)
                entry["orphan"] = True  # señal: existe en BD pero no en bucket
                results.append(entry)

    # 5) Aplicar filtros (en memoria — bucket pequeño, no hay paginación server-side)
    if type:
        results = [r for r in results if (r.get("type") or "").startswith(type)]
    if search:
        s = search.lower()
        results = [
            r for r in results
            if s in (r.get("name") or "").lower()
            or s in (r.get("originalName") or "").lower()
        ]

    return results


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
    base = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

    # Normalizar el prefix de carpeta y construir el path final dentro del bucket
    clean_folder = (folder or "").strip().strip("/")
    object_key = f"{clean_folder}/{base}" if clean_folder else base

    # Asegurar que la carpeta exista en media_folders (FK requirement)
    folder_path = f"{clean_folder}/" if clean_folder else None
    if folder_path:
        existing_folder = db.query(MediaFolder).filter(MediaFolder.path == folder_path).first()
        if not existing_folder:
            new_folder = MediaFolder(
                name=clean_folder.rsplit("/", 1)[-1],
                path=folder_path,
                parent=None,
            )
            db.add(new_folder)
            db.flush()

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
        return _serialize_media(nuevo)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir archivo: {str(e)}",
        )


@router.delete("/{media_id:path}")
async def eliminar_archivo(
    media_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    # Soporte de ids sinteticos para objetos sin registro local: "bucket:{bucket_id}:{name}"
    if media_id.startswith("bucket:"):
        try:
            _, bucket_id_str, name = media_id.split(":", 2)
            bucket_id = int(bucket_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID sintetico invalido")
        bucket = _resolve_bucket_or_403(bucket_id, current_user, db)
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
