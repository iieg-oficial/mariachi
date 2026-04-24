import os
from io import BytesIO
from typing import Optional

import urllib3
from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.settings import get_settings
from app.models.media_bucket import MediaBucket

settings = get_settings()


def resolve_bucket_credentials(access_key_ref: Optional[str]) -> tuple[str, str]:
    if access_key_ref:
        ak = os.getenv(f"{access_key_ref}_ACCESS_KEY")
        sk = os.getenv(f"{access_key_ref}_SECRET_KEY")
        if ak and sk:
            return ak, sk
    return settings.acervo_access_key, settings.acervo_secret_key


class AcervoClient:
    _cache: dict[str, "AcervoClient"] = {}

    def __init__(self, bucket_name: str, access_key: str, secret_key: str):
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
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error:
            pass

    @classmethod
    def for_bucket(cls, bucket: MediaBucket) -> "AcervoClient":
        key = f"{bucket.acervo_bucket}:{bucket.access_key_ref}"
        if key not in cls._cache:
            ak, sk = resolve_bucket_credentials(bucket.access_key_ref)
            cls._cache[key] = cls(bucket.acervo_bucket, ak, sk)
        return cls._cache[key]

    async def upload_file(self, file: UploadFile, object_name: str) -> str:
        try:
            file_data = await file.read()
            file_size = len(file_data)

            self.client.put_object(
                self.bucket_name,
                object_name,
                BytesIO(file_data),
                file_size,
                content_type=file.content_type,
            )

            scheme = "https" if settings.acervo_use_ssl else "http"
            url = f"{scheme}://{settings.acervo_public_endpoint}/{self.bucket_name}/{object_name}"
            return url
        except S3Error as e:
            raise Exception(f"Error uploading file: {str(e)}")

    def delete_file(self, object_name: str) -> bool:
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False

    def list_objects(self, prefix: str = "", recursive: bool = True) -> list[dict]:
        results = []
        for obj in self.client.list_objects(self.bucket_name, prefix=prefix, recursive=recursive):
            results.append({
                "name": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                "etag": obj.etag,
            })
        return results

    def get_file_url(self, object_name: str) -> str:
        scheme = "https" if settings.acervo_use_ssl else "http"
        return f"{scheme}://{settings.acervo_public_endpoint}/{self.bucket_name}/{object_name}"


_legacy_service: AcervoClient | None = None


def get_acervo_service() -> AcervoClient:
    global _legacy_service
    if _legacy_service is None:
        _legacy_service = AcervoClient(
            settings.acervo_bucket_name,
            settings.acervo_access_key,
            settings.acervo_secret_key,
        )
    return _legacy_service
