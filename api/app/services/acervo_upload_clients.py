from __future__ import annotations

import hmac
from dataclasses import dataclass

from fastapi import HTTPException, status

from app.core.settings import get_settings

DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024

DEFAULT_ALLOWED_MIME: frozenset[str] = frozenset({
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/xml",
    "application/geo+json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
})


@dataclass(frozen=True)
class UploadPolicy:
    client: str
    allowed_buckets: frozenset[str]
    allowed_prefix: str | None = None
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES
    allowed_mime: frozenset[str] | None = None

    def allows_bucket(self, bucket_name: str) -> bool:
        return bucket_name in self.allowed_buckets

    def allows_mime(self, mime: str | None) -> bool:
        if not self.allowed_mime:
            return True
        return (mime or "") in self.allowed_mime


def resolve_upload_client(token: str | None) -> UploadPolicy:
    """Resuelve el token de una plataforma a su politica de subida.

    Seam de escalabilidad: hoy valida el token unico del entorno y devuelve una
    politica fija (bucket `portal`). Cuando exista el registro
    `acervo_upload_clients`, esta funcion pasara a buscar por prefijo/hash sin
    tocar el endpoint que la consume.
    """
    settings = get_settings()
    expected = settings.acervo_internal_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ACERVO_INTERNAL_TOKEN no configurado en mariachi-api",
        )
    if not token or not hmac.compare_digest(token.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token interno invalido",
        )
    return UploadPolicy(
        client="portal",
        allowed_buckets=frozenset({"portal"}),
        allowed_prefix=None,
        allowed_mime=DEFAULT_ALLOWED_MIME,
    )
