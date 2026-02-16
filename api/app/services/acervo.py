from io import BytesIO

from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.settings import get_settings

settings = get_settings()


class AcervoService:
    def __init__(self):
        self.client = Minio(
            settings.acervo_endpoint,
            access_key=settings.acervo_access_key,
            secret_key=settings.acervo_secret_key,
            secure=settings.acervo_use_ssl,
        )
        self.bucket_name = settings.acervo_bucket_name
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

            url = f"http://{settings.acervo_public_endpoint}/{self.bucket_name}/{object_name}"
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
        return f"http://{settings.acervo_public_endpoint}/{self.bucket_name}/{object_name}"


_acervo_service: AcervoService | None = None


def get_acervo_service() -> AcervoService:
    global _acervo_service
    if _acervo_service is None:
        _acervo_service = AcervoService()
    return _acervo_service
