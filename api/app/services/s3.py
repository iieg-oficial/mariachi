from io import BytesIO

from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.settings import get_settings

settings = get_settings()


class S3Service:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_use_ssl,
        )
        self.bucket_name = settings.minio_bucket_name
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error:
            pass

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

            # Usar endpoint público para URLs accesibles desde el navegador
            url = f"http://{settings.minio_public_endpoint}/{self.bucket_name}/{object_name}"
            return url
        except S3Error as e:
            raise Exception(f"Error uploading file: {str(e)}")

    def delete_file(self, object_name: str) -> bool:
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False

    def get_file_url(self, object_name: str) -> str:
        # Usar endpoint público para URLs accesibles desde el navegador
        return f"http://{settings.minio_public_endpoint}/{self.bucket_name}/{object_name}"


_s3_service: S3Service | None = None


def get_s3_service() -> S3Service:
    global _s3_service
    if _s3_service is None:
        _s3_service = S3Service()
    return _s3_service
