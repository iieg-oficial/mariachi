from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE
from app.models.media import Media, MediaFolder
from app.models.media_bucket import MediaBucket
from app.models.project import UserProject
from app.models.user import Usuario
from app.services.acervo import AcervoClient

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


def guess_mime(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return _MIME_BY_EXT.get(ext, "application/octet-stream")


def folder_from_path(path: str) -> str:
    if "/" not in path:
        return ""
    return "/" + path.rsplit("/", 1)[0]


def resolve_bucket_or_403(bucket_id: int, current_user: Usuario, db: Session) -> MediaBucket:
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


def serialize_media(item: Media) -> dict:
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


def serialize_bucket_only(bucket_id: int, obj: dict) -> dict:
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
            "folder": folder_from_path(clean),
            "uploadedBy": None,
            "uploadedByName": "—",
            "uploadedAt": last_modified,
            "metadata": {},
            "bucketOnly": True,
            "isDir": True,
        }
    mime = guess_mime(name)
    return {
        "id": f"bucket:{bucket_id}:{name}",
        "bucket_id": bucket_id,
        "name": name,
        "originalName": name.rsplit("/", 1)[-1],
        "type": mime,
        "size": obj.get("size", 0),
        "url": obj.get("url"),
        "thumbnail": obj.get("url") if mime.startswith("image/") else None,
        "folder": folder_from_path(name),
        "uploadedBy": None,
        "uploadedByName": "—",
        "uploadedAt": last_modified,
        "metadata": {},
        "bucketOnly": True,
        "isDir": False,
    }


def listar_media(
    db: Session,
    bucket: MediaBucket,
    folder: str | None,
    type_filter: str | None,
    search: str | None,
    recursive: bool,
) -> list[dict]:
    client = AcervoClient.for_bucket(bucket)
    prefix = ""
    if folder and folder != "/":
        prefix = folder.lstrip("/").rstrip("/") + "/"
    bucket_objects = client.list_objects(prefix=prefix, recursive=recursive)

    hidden_prefixes = ("reportes/",) if bucket.acervo_bucket == "mariachi" and not prefix else ()
    if hidden_prefixes:
        bucket_objects = [
            obj for obj in bucket_objects
            if not any(obj["name"].startswith(p) for p in hidden_prefixes)
        ]

    for obj in bucket_objects:
        if not obj.get("is_dir") and not obj["name"].endswith("/"):
            obj["url"] = client.get_file_url(obj["name"])

    local_items = db.query(Media).filter(Media.bucket_id == bucket.id).all()
    local_by_name = {item.name: item for item in local_items}

    results: list[dict] = []
    seen_names: set[str] = set()
    for obj in bucket_objects:
        name = obj["name"]
        seen_names.add(name)
        local = local_by_name.get(name)
        if local is not None:
            entry = serialize_media(local)
            entry["url"] = obj.get("url") or entry["url"]
            entry["size"] = obj.get("size", entry["size"])
            results.append(entry)
        else:
            results.append(serialize_bucket_only(bucket.id, obj))

    if recursive:
        for item in local_items:
            if item.name not in seen_names:
                entry = serialize_media(item)
                entry["orphan"] = True
                results.append(entry)

    if type_filter:
        results = [r for r in results if (r.get("type") or "").startswith(type_filter)]
    if search:
        s = search.lower()
        results = [
            r for r in results
            if s in (r.get("name") or "").lower()
            or s in (r.get("originalName") or "").lower()
        ]

    return results


def ensure_folder_exists(db: Session, clean_folder: str) -> str | None:
    if not clean_folder:
        return None
    folder_path = f"{clean_folder}/"
    existing = db.query(MediaFolder).filter(MediaFolder.path == folder_path).first()
    if not existing:
        new_folder = MediaFolder(
            name=clean_folder.rsplit("/", 1)[-1],
            path=folder_path,
            parent=None,
        )
        db.add(new_folder)
        db.flush()
    return folder_path
