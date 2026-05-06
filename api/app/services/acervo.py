import logging
import os

import urllib3
from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.acervo_url import to_absolute
from app.core.settings import get_settings
from app.models.media_bucket import MediaBucket

logger = logging.getLogger(__name__)
settings = get_settings()


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
            f"entorno. Mariachi ya no hace fallback a las credenciales root de MinIO; "
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
    def for_bucket(cls, bucket: MediaBucket) -> "AcervoClient":
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

    async def upload_file(self, file: UploadFile, object_name: str) -> str:
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
                content_type=file.content_type,
            )
            return self.get_file_url(object_name)
        except S3Error as e:
            raise Exception(f"Error uploading file: {str(e)}")

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
        for obj in self.client.list_objects(self.bucket_name, prefix=prefix, recursive=True):
            try:
                self.client.remove_object(self.bucket_name, obj.object_name)
                deleted += 1
            except S3Error:
                logger.exception(
                    "acervo.delete_prefix bucket=%s object=%s",
                    self.bucket_name,
                    obj.object_name,
                )
        return deleted

    def list_objects(self, prefix: str = "", recursive: bool = True) -> list[dict]:
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
        return results

    def get_file_url(self, object_name: str) -> str:
        if not self.is_public:
            if self.bucket_id is None:
                raise RuntimeError(
                    f"AcervoClient para bucket privado '{self.bucket_name}' sin bucket_id"
                )
            return f"/api/administrador/multimedia/proxy/{self.bucket_id}/{object_name.lstrip('/')}"
        return to_absolute(f"{self.bucket_name}/{object_name}")

    def get_object_stream(self, object_name: str):
        return self.client.get_object(self.bucket_name, object_name)

    def stat_object(self, object_name: str):
        return self.client.stat_object(self.bucket_name, object_name)
