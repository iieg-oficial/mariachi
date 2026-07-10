import io
import re
import unicodedata
import zipfile
from collections.abc import Iterator
from typing import Callable

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE
from app.core.bucket_policies import get_hidden_prefixes
from app.models.acervo import AcervoFile, AcervoFolder
from app.models.acervo_bucket import AcervoBucket
from app.models.project import UserProject
from app.models.user import Usuario
from app.services import acervo_thumbnails
from app.services.acervo import AcervoClient

ZIP_MAX_BYTES = 500 * 1024 * 1024  # 500 MB
_ZIP_CHUNK = 64 * 1024

FOLDER_PLACEHOLDER = ".keep"

_SAFE_NAME_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def split_ext(filename: str) -> tuple[str, str]:
    if "." in filename:
        base, ext = filename.rsplit(".", 1)
        return base, f".{ext}"
    return filename, ""


def sanitize_filename(filename: str) -> str:
    raw = (filename or "").rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    base, ext = split_ext(raw)
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii")
    base = _SAFE_NAME_RE.sub("-", base).strip("-._").lower()
    if not base:
        base = "archivo"
    ext = unicodedata.normalize("NFKD", ext).encode("ascii", "ignore").decode("ascii")
    ext = _SAFE_NAME_RE.sub("", ext).lower()
    return f"{base}{ext}" if ext else base


def resolve_upload_name(
    db: Session,
    bucket_id: int,
    folder_path: str,
    clean_folder: str,
    *,
    original_name: str,
    key_basename: str,
    on_conflict: str,
) -> tuple[str, str]:
    """Resuelve el `original_name` y el object key definitivos de una subida.

    Si ya existe un archivo con el mismo `original_name` o el mismo object key en
    la carpeta, se aplica `on_conflict`: 'reject' lanza 409; 'rename' agrega un
    sufijo consecutivo (`nombre-2.ext`) hasta encontrar uno libre.
    """
    base_o, ext_o = split_ext(original_name)
    base_k, ext_k = split_ext(key_basename)
    n = 1
    while True:
        cand_original = original_name if n == 1 else f"{base_o}-{n}{ext_o}"
        cand_key_name = key_basename if n == 1 else f"{base_k}-{n}{ext_k}"
        cand_key = f"{clean_folder}/{cand_key_name}" if clean_folder else cand_key_name
        exists = (
            db.query(AcervoFile)
            .filter(
                AcervoFile.bucket_id == bucket_id,
                AcervoFile.folder == folder_path,
                or_(
                    AcervoFile.original_name == cand_original,
                    AcervoFile.name == cand_key,
                ),
            )
            .first()
        )
        if not exists:
            return cand_original, cand_key
        if on_conflict != "rename":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe '{original_name}' en esta carpeta",
            )
        n += 1


def normalize_folder_path(parent: str | None, name: str) -> tuple[str, str, str | None]:
    name_clean = name.strip().strip("/")
    parent_clean = (parent or "").strip().strip("/")
    if parent_clean:
        return f"{parent_clean}/{name_clean}/", name_clean, f"{parent_clean}/"
    return f"{name_clean}/", name_clean, None


def folder_marker_key(path: str) -> str:
    return f"{path}{FOLDER_PLACEHOLDER}"


def is_folder_marker(name: str) -> bool:
    return name == FOLDER_PLACEHOLDER or name.endswith(f"/{FOLDER_PLACEHOLDER}")


class _ZipStreamBuffer(io.RawIOBase):
    """Buffer write-only que acumula bytes y permite flushearlos en chunks."""

    def __init__(self) -> None:
        self._buf = bytearray()

    def writable(self) -> bool:
        return True

    def write(self, b) -> int:
        self._buf += b
        return len(b)

    def flush_bytes(self) -> bytes:
        data = bytes(self._buf)
        self._buf.clear()
        return data


def stream_zip(
    entries: Iterator[tuple[str, Callable[[], object]]],
) -> Iterator[bytes]:
    """Genera un ZIP streaming. `entries` produce (arcname, stream_factory).

    `stream_factory()` debe retornar un file-like con `.read(size)`; se cierra
    al terminar cada archivo. Idoneo para servir archivos grandes sin cargar
    todo el ZIP a memoria.
    """
    buf = _ZipStreamBuffer()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as zf:
        for arcname, factory in entries:
            with zf.open(arcname, mode="w", force_zip64=True) as entry:
                stream = factory()
                try:
                    while True:
                        chunk = stream.read(_ZIP_CHUNK)
                        if not chunk:
                            break
                        entry.write(chunk)
                        flushed = buf.flush_bytes()
                        if flushed:
                            yield flushed
                finally:
                    for closer in ("close", "release_conn"):
                        try:
                            getattr(stream, closer, lambda: None)()
                        except Exception:
                            pass
            flushed = buf.flush_bytes()
            if flushed:
                yield flushed
    final = buf.flush_bytes()
    if final:
        yield final

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


def resolve_bucket_or_403(bucket_id: int, current_user: Usuario, db: Session) -> AcervoBucket:
    bucket = (
        db.query(AcervoBucket)
        .filter(AcervoBucket.id == bucket_id, AcervoBucket.is_active.is_(True))
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


def thumbnail_for(
    bucket_name: str | None,
    object_name: str,
    content_type: str | None,
    url: str | None,
    is_public: bool = False,
) -> str | None:
    """Deriva la URL de miniatura según el tipo (no usa el valor persistido):

    - raster (PNG/JPEG/GIF/WebP) en bucket público → endpoint on-the-fly que
      devuelve WebP escalado (ruta pública, sin auth: /acervo/thumb/...)
    - SVG → la propia URL (vectorial, no se rasteriza)
    - bucket privado o resto → sin miniatura
    """
    ctype = (content_type or "").lower()
    if ctype == "image/svg+xml":
        return url
    if is_public and bucket_name is not None and acervo_thumbnails.is_raster_image(ctype):
        return (
            f"/acervo/thumb/{bucket_name}/{object_name}"
            f"?w={acervo_thumbnails.DEFAULT_WIDTH}"
        )
    return None


def serialize_acervo_file(item: AcervoFile) -> dict:
    return {
        "id": str(item.id),
        "bucket_id": item.bucket_id,
        "name": item.name,
        "originalName": item.original_name,
        "type": item.type,
        "size": item.size,
        "url": item.url,
        "thumbnail": thumbnail_for(
            item.bucket.acervo_bucket if item.bucket else None,
            item.name,
            item.type,
            item.url,
            is_public=bool(item.bucket.is_public) if item.bucket else False,
        ),
        "folder": item.folder,
        "uploadedBy": str(item.uploaded_by),
        "uploadedByName": item.uploaded_by_user.name if item.uploaded_by_user else "Unknown",
        "uploadedAt": item.uploaded_at.isoformat(),
        "metadata": item.metadata_json or {},
    }


def serialize_bucket_only(bucket_id: int, bucket_name: str | None, obj: dict, is_public: bool = False) -> dict:
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
        "thumbnail": thumbnail_for(bucket_name, name, mime, obj.get("url"), is_public=is_public),
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
    bucket: AcervoBucket,
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

    bucket_objects = [obj for obj in bucket_objects if not is_folder_marker(obj["name"])]

    hidden_prefixes = get_hidden_prefixes(bucket.acervo_bucket) if not prefix else ()
    if hidden_prefixes:
        bucket_objects = [
            obj for obj in bucket_objects
            if not any(obj["name"].startswith(p) for p in hidden_prefixes)
        ]

    for obj in bucket_objects:
        if not obj.get("is_dir") and not obj["name"].endswith("/"):
            obj["url"] = client.get_file_url(obj["name"])

    local_items = db.query(AcervoFile).filter(AcervoFile.bucket_id == bucket.id).all()
    local_by_name = {item.name: item for item in local_items}

    results: list[dict] = []
    seen_names: set[str] = set()
    for obj in bucket_objects:
        name = obj["name"]
        seen_names.add(name)
        local = local_by_name.get(name)
        if local is not None:
            entry = serialize_acervo_file(local)
            entry["url"] = obj.get("url") or entry["url"]
            entry["size"] = obj.get("size", entry["size"])
            results.append(entry)
        else:
            results.append(serialize_bucket_only(bucket.id, bucket.acervo_bucket, obj, is_public=bool(bucket.is_public)))

    if recursive:
        for item in local_items:
            if item.name not in seen_names:
                entry = serialize_acervo_file(item)
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


def serialize_folder(folder: AcervoFolder) -> dict:
    return {
        "id": str(folder.id),
        "bucket_id": folder.bucket_id,
        "name": folder.name,
        "path": folder.path,
        "parent": folder.parent,
    }


def ensure_folder_exists(db: Session, bucket_id: int, clean_folder: str) -> str:
    if not clean_folder:
        return "/"
    folder_path = f"{clean_folder}/"
    existing = (
        db.query(AcervoFolder)
        .filter(
            AcervoFolder.bucket_id == bucket_id,
            AcervoFolder.path == folder_path,
        )
        .first()
    )
    if not existing:
        new_folder = AcervoFolder(
            bucket_id=bucket_id,
            name=clean_folder.rsplit("/", 1)[-1],
            path=folder_path,
            parent=None,
        )
        # Varias subidas concurrentes a una carpeta nueva pueden intentar crear
        # la misma fila (uq_acervo_folders_bucket_path). Se aisla el INSERT en un
        # savepoint: si otra request ya la creo, se ignora la colision sin
        # abortar la transaccion de la subida en curso.
        try:
            with db.begin_nested():
                db.add(new_folder)
                db.flush()
        except IntegrityError:
            pass
    return folder_path
