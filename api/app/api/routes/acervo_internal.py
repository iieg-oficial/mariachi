from __future__ import annotations

import logging
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.metrics import COUNTER_MEDIA_UPLOADS, incr
from app.api.rate_limit import _client_ip, rate_limit_ip
from app.models.acervo_bucket import AcervoBucket
from app.services import acervo_file_service
from app.services.acervo import AcervoClient
from app.services.acervo_upload_clients import UploadPolicy, resolve_upload_client
from app.services.actividad_service import registrar_actividad

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/internal/acervo", tags=["acervo-internal"])


def _require_upload_client(
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> UploadPolicy:
    return resolve_upload_client(x_internal_token)


def _resolve_active_bucket(db: Session, bucket_name: str) -> AcervoBucket:
    bucket = (
        db.query(AcervoBucket)
        .filter(
            AcervoBucket.acervo_bucket == bucket_name,
            AcervoBucket.is_active.is_(True),
        )
        .first()
    )
    if bucket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bucket no encontrado")
    return bucket


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_ip(max_requests=60, window_seconds=60, scope="acervo_internal"))],
)
async def subir_archivo_interno(
    request: Request,
    file: UploadFile = File(...),
    bucket_name: str = Form(...),
    folder: str = Form("/"),
    alt: str = Form(""),
    use_uuid: bool = Form(False),
    on_conflict: str = Form("rename"),
    db: Session = Depends(get_db),
    policy: UploadPolicy = Depends(_require_upload_client),
):
    bucket_name = (bucket_name or "").strip()
    if not policy.allows_bucket(bucket_name):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El cliente '{policy.client}' no puede subir al bucket '{bucket_name}'",
        )

    bucket = _resolve_active_bucket(db, bucket_name)

    content_type = file.content_type or acervo_file_service.guess_mime(file.filename or "")
    if not policy.allows_mime(content_type):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no permitido: {content_type}",
        )

    size = file.size or 0
    if size and size > policy.max_file_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"El archivo supera el tamano maximo ({policy.max_file_bytes // (1024 * 1024)} MB)",
        )

    clean_folder = (folder or "").strip().strip("/")
    if policy.allowed_prefix:
        pref = policy.allowed_prefix.strip("/")
        if clean_folder != pref and not clean_folder.startswith(f"{pref}/"):
            clean_folder = pref if not clean_folder else f"{pref}/{clean_folder}"

    folder_path = acervo_file_service.ensure_folder_exists(db, bucket.id, clean_folder)

    file_extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else ""
    if use_uuid:
        key_basename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        desired_original = file.filename or key_basename
    else:
        key_basename = acervo_file_service.sanitize_filename(file.filename or "")
        desired_original = key_basename

    final_original, object_key = acervo_file_service.resolve_upload_name(
        db,
        bucket.id,
        folder_path,
        clean_folder,
        original_name=desired_original,
        key_basename=key_basename,
        on_conflict=on_conflict,
    )

    ip = _client_ip(request)
    try:
        url = await AcervoClient.for_bucket(bucket).upload_file(file, object_key)
        thumbnail_url = acervo_file_service.thumbnail_for(
            bucket.acervo_bucket,
            object_key,
            content_type,
            url,
            is_public=bool(bucket.is_public),
        )
        registrar_actividad(
            db,
            actor=None,
            action="acervo.file.upload_internal",
            resource_type="acervo.file",
            resource_id=None,
            metadata={
                "cliente": policy.client,
                "bucket": bucket.acervo_bucket,
                "carpeta": folder_path,
                "nombre": final_original,
                "alt": alt or None,
            },
            ip=ip,
        )
        db.commit()
        incr(COUNTER_MEDIA_UPLOADS)
        logger.info(
            "action=acervo.upload_internal client=%s bucket=%s size=%s name=%s",
            policy.client, bucket.acervo_bucket, size, final_original,
        )
        return {
            "name": object_key,
            "originalName": final_original,
            "url": url,
            "thumbnailUrl": thumbnail_url,
            "bucket": bucket.acervo_bucket,
            "bucketId": bucket.id,
            "folder": folder_path,
            "size": size,
            "type": content_type,
        }
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception(
            "action=acervo.upload_internal.error client=%s bucket=%s",
            policy.client, bucket_name,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al subir archivo",
        )
