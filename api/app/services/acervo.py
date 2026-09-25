import io
import logging
import os
import re
import unicodedata
from urllib.parse import quote

import urllib3
from fastapi import UploadFile
from minio import Minio
from minio.commonconfig import CopySource
from minio.datatypes import Part
from minio.error import S3Error

from app.core.acervo_url import to_absolute
from app.core.settings import get_settings
from app.models.acervo_bucket import AcervoBucket
from app.services import tipo_archivo

logger = logging.getLogger(__name__)
settings = get_settings()


_UNSAFE_HEADER_CHARS = re.compile(r'[\r\n"\\]')
MAX_REWRITE_BYTES = 100 * 1024 * 1024


class ObjectTooLargeError(Exception):
    pass


def build_content_disposition(download_name: str, disposition: str = "inline") -> str:
    clean = _UNSAFE_HEADER_CHARS.sub("", download_name).strip()[:200]
    if not clean:
        raise ValueError("download_name vacio tras sanear")
    ascii_name = (
        unicodedata.normalize("NFKD", clean).encode("ascii", "ignore").decode("ascii").strip()
    )
    header = f'{disposition}; filename="{ascii_name or "archivo"}"'
    if ascii_name != clean:
        header = f"{header}; filename*=UTF-8''{quote(clean, safe='')}"
    return header


def download_metadata(
    download_name: str | None,
    content_type: str | None = None,
    object_name: str = "archivo",
) -> dict[str, str] | None:
    if tipo_archivo.es_activo(content_type):
        nombre = download_name or object_name.rsplit("/", 1)[-1] or "archivo"
        return {"Content-Disposition": build_content_disposition(nombre, "attachment")}
    if not download_name:
        return None
    return {"Content-Disposition": build_content_disposition(download_name)}


def resolve_bucket_credentials(access_key_ref: str | None) -> tuple[str, str]:
    if not access_key_ref:
        raise RuntimeError(
            "media_bucket sin access_key_ref. Cada bucket debe declarar el prefijo "
            "de sus credenciales (e.g. ACERVO_MARIACHI)."
        )
    ak = os.getenv(f"{access_key_ref}_ACCESS_KEY")
    sk = os.getenv(f"{access_key_ref}_SECRET_KEY")
    if not ak or not sk:
        raise RuntimeError(
            f"Faltan {access_key_ref}_ACCESS_KEY/{access_key_ref}_SECRET_KEY en el "
            f"entorno. Mariachi ya no hace fallback a las credenciales root del almacenamiento; "
            f"cada bucket activo debe tener sus propias credenciales por bucket."
        )
    return ak, sk


class AcervoClient:
    _cache: dict[str, "AcervoClient"] = {}

    def __init__(
        self,
        bucket_name: str,
        access_key: str,
        secret_key: str,
        is_public: bool = True,
        bucket_id: int | None = None,
    ):
        http_client = None
        if settings.acervo_use_ssl and not settings.acervo_verify_ssl:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            http_client = urllib3.PoolManager(
                cert_reqs="CERT_NONE",
                retries=urllib3.Retry(total=3, backoff_factor=0.5),
            )

        self.client = Minio(
            settings.acervo_endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=settings.acervo_use_ssl,
            http_client=http_client,
        )
        self.bucket_name = bucket_name
        self.is_public = is_public
        self.bucket_id = bucket_id
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as exc:
            logger.warning(
                "acervo.ensure_bucket_exists bucket=%s code=%s message=%s",
                self.bucket_name,
                exc.code,
                exc.message,
            )

    @classmethod
    def for_bucket(cls, bucket: AcervoBucket) -> "AcervoClient":
        key = f"{bucket.acervo_bucket}:{bucket.access_key_ref}"
        if key not in cls._cache:
            ak, sk = resolve_bucket_credentials(bucket.access_key_ref)
            cls._cache[key] = cls(
                bucket.acervo_bucket,
                ak,
                sk,
                is_public=bool(bucket.is_public),
                bucket_id=bucket.id,
            )
        return cls._cache[key]

    @classmethod
    def invalidate_cache(cls, bucket_name: str | None = None) -> None:
        if bucket_name is None:
            cls._cache.clear()
            return
        for key in [k for k in cls._cache if k.startswith(f"{bucket_name}:")]:
            del cls._cache[key]

    async def upload_file(
        self,
        file: UploadFile,
        object_name: str,
        download_name: str | None = None,
        content_type: str | None = None,
    ) -> str:
        content_type = content_type or tipo_archivo.detectar_mime_upload(file)
        try:
            stream = file.file
            stream.seek(0, os.SEEK_END)
            size = stream.tell()
            stream.seek(0)
            self.client.put_object(
                self.bucket_name,
                object_name,
                stream,
                size,
                content_type=content_type,
                metadata=download_metadata(download_name, content_type, object_name),
            )
            return self.get_file_url(object_name)
        except S3Error as e:
            raise Exception(f"Error uploading file: {str(e)}")

    def copy_file(self, source_name: str, dest_name: str) -> None:
        self.client.copy_object(
            self.bucket_name,
            dest_name,
            CopySource(self.bucket_name, source_name),
        )

    def set_download_name(self, object_name: str, download_name: str | None) -> None:
        stat = self.client.stat_object(self.bucket_name, object_name)
        size = stat.size or 0
        if size > MAX_REWRITE_BYTES:
            raise ObjectTooLargeError(
                f"El archivo pesa {size / 1024 / 1024:.0f} MB y el nombre de descarga solo "
                f"puede cambiarse en archivos de hasta {MAX_REWRITE_BYTES // 1024 // 1024} MB."
            )
        metadata: dict[str, str] = {
            key: value
            for key, value in (stat.metadata or {}).items()
            if key.lower().startswith("x-amz-meta-")
        }
        disposicion = download_metadata(download_name, stat.content_type, object_name)
        if disposicion:
            metadata.update(disposicion)
        response = self.client.get_object(self.bucket_name, object_name)
        try:
            self.client.put_object(
                self.bucket_name,
                object_name,
                response,
                size,
                content_type=stat.content_type or "application/octet-stream",
                metadata=metadata or None,
            )
        finally:
            response.close()
            response.release_conn()

    def put_bytes(
        self,
        object_name: str,
        data: bytes,
        content_type: str,
        download_name: str | None = None,
    ) -> None:
        self.client.put_object(
            self.bucket_name,
            object_name,
            io.BytesIO(data),
            len(data),
            content_type=content_type,
            metadata=download_metadata(download_name, content_type, object_name),
        )

    def put_empty_object(self, object_name: str) -> None:
        self.client.put_object(
            self.bucket_name,
            object_name,
            io.BytesIO(b""),
            0,
            content_type="application/x-empty",
        )

    def delete_file(self, object_name: str) -> bool:
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error:
            logger.exception("acervo.delete_file bucket=%s object=%s", self.bucket_name, object_name)
            return False

    def delete_prefix(self, prefix: str) -> int:
        if not prefix:
            return 0
        deleted = 0
        dir_entries: set[str] = set()
        for obj in self.client.list_objects(self.bucket_name, prefix=prefix, recursive=True):
            name = obj.object_name
            try:
                self.client.remove_object(self.bucket_name, name)
                deleted += 1
            except S3Error:
                logger.exception(
                    "acervo.delete_prefix bucket=%s object=%s",
                    self.bucket_name,
                    name,
                )
            parent = f"{name.rsplit('/', 1)[0]}/" if "/" in name else ""
            while len(parent) > len(prefix):
                dir_entries.add(parent)
                parent = f"{parent[:-1].rsplit('/', 1)[0]}/" if "/" in parent[:-1] else ""
        # SeaweedFS mantiene los directorios como entradas del filer; si no se
        # borran explicitamente, el listado los sigue mostrando hasta que el
        # cleanup asincrono los recoja (minutos despues).
        for entry in sorted(dir_entries, reverse=True):
            self.delete_file(entry)
        self.delete_file(prefix)
        return deleted

    def list_objects(
        self,
        prefix: str = "",
        recursive: bool = True,
        limit: int | None = None,
    ) -> list[dict]:
        """Lista objetos del bucket. `limit` corta la iteración al alcanzarlo,
        para acotar el costo en prefijos con muchísimos objetos.
        """
        results = []
        for obj in self.client.list_objects(self.bucket_name, prefix=prefix, recursive=recursive):
            name = obj.object_name
            is_dir = name.endswith("/")
            results.append({
                "name": name,
                "size": obj.size or 0,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                "etag": obj.etag,
                "is_dir": is_dir,
            })
            if limit is not None and len(results) >= limit:
                break
        return results

    def get_file_url(self, object_name: str) -> str:
        if not self.is_public:
            if self.bucket_id is None:
                raise RuntimeError(
                    f"AcervoClient para bucket privado '{self.bucket_name}' sin bucket_id"
                )
            return f"{settings.admin_prefix}/acervo/proxy/{self.bucket_id}/{object_name.lstrip('/')}"
        return to_absolute(f"{self.bucket_name}/{object_name}")

    def get_object_stream(self, object_name: str):
        return self.client.get_object(self.bucket_name, object_name)

    def stat_object(self, object_name: str):
        return self.client.stat_object(self.bucket_name, object_name)

    def init_multipart_upload(self, object_name: str, content_type: str | None = None) -> str:
        headers = dict(download_metadata(None, content_type, object_name) or {})
        if content_type:
            headers['Content-Type'] = content_type
        return self.client._create_multipart_upload(
            self.bucket_name, object_name, headers,
        )

    def upload_part(self, object_name: str, upload_id: str, part_number: int, data: bytes) -> str:
        return self.client._upload_part(
            self.bucket_name, object_name, data, None, upload_id, part_number,
        )

    def complete_multipart_upload(self, object_name: str, upload_id: str, parts: list[dict]) -> str:
        part_objects = [Part(part_number=p['part_number'], etag=p['etag']) for p in parts]
        result = self.client._complete_multipart_upload(
            self.bucket_name, object_name, upload_id, part_objects,
        )
        return result.object_name

    def abort_multipart_upload(self, object_name: str, upload_id: str) -> None:
        self.client._abort_multipart_upload(self.bucket_name, object_name, upload_id)
