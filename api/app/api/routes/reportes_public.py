import json
import logging
import uuid
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from minio.error import S3Error
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_ip
from app.models.media_bucket import MediaBucket
from app.models.reporte import Reporte
from app.schemas.reporte import ReporteCreate, ReporteCreateResponse
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["reportes públicos"])

_REPORTES_BUCKET = "mariachi"
_ALLOWED_MIME = {"image/png", "image/jpeg"}
_MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024
_EXT_BY_MIME = {"image/png": "png", "image/jpeg": "jpg"}


def _resolve_reportes_bucket(db: Session) -> MediaBucket | None:
    return (
        db.query(MediaBucket)
        .filter(
            MediaBucket.acervo_bucket == _REPORTES_BUCKET,
            MediaBucket.is_active.is_(True),
        )
        .first()
    )


def _build_object_path(mime: str) -> str:
    now = datetime.utcnow()
    ext = _EXT_BY_MIME.get(mime, "png")
    return f"reportes/{now.year:04d}/{now.month:02d}/{uuid.uuid4().hex}.{ext}"


async def _upload_screenshot(
    bucket: MediaBucket, screenshot: UploadFile
) -> str:
    data = await screenshot.read()
    if len(data) > _MAX_SCREENSHOT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La captura supera el tamaño máximo permitido (2 MB).",
        )
    if screenshot.content_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato de captura no soportado. Solo PNG o JPEG.",
        )

    object_path = _build_object_path(screenshot.content_type)
    client = AcervoClient.for_bucket(bucket)
    try:
        client.client.put_object(
            client.bucket_name,
            object_path,
            BytesIO(data),
            len(data),
            content_type=screenshot.content_type,
        )
    except S3Error:
        logger.exception("reportes.upload.s3 bucket=%s path=%s", bucket.acervo_bucket, object_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo guardar la captura.",
        )
    return object_path


@router.post(
    "",
    response_model=ReporteCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_ip(max_requests=5, window_seconds=600, scope='reportes'))],
)
async def crear_reporte(
    request: Request,
    tipo: str = Form(...),
    mensaje: str = Form(...),
    source_app: str = Form(...),
    email_contacto: str | None = Form(default=None),
    source_route: str | None = Form(default=None),
    source_context: str | None = Form(default=None),
    website: str | None = Form(default=None),
    screenshot: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    if website:
        logger.info("reportes.honeypot ip=%s", request.client.host if request.client else 'unknown')
        return ReporteCreateResponse(id=0)

    try:
        context_dict = json.loads(source_context) if source_context else {}
        if not isinstance(context_dict, dict):
            context_dict = {}
    except json.JSONDecodeError:
        context_dict = {}

    try:
        payload = ReporteCreate(
            tipo=tipo,
            mensaje=mensaje,
            email_contacto=email_contacto or None,
            source_app=source_app,
            source_route=source_route,
            source_context=context_dict,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        )

    screenshot_bucket_id: int | None = None
    screenshot_object_path: str | None = None
    if screenshot is not None and screenshot.filename:
        bucket = _resolve_reportes_bucket(db)
        if bucket is None:
            logger.warning("reportes.bucket_missing acervo_bucket=%s", _REPORTES_BUCKET)
        else:
            try:
                screenshot_object_path = await _upload_screenshot(bucket, screenshot)
                screenshot_bucket_id = bucket.id
            except HTTPException:
                raise
            except Exception:
                logger.exception(
                    "reportes.screenshot_upload_failed bucket=%s",
                    bucket.acervo_bucket,
                )
                screenshot_object_path = None
                screenshot_bucket_id = None

    reporte = Reporte(
        tipo=payload.tipo,
        mensaje=payload.mensaje,
        email_contacto=payload.email_contacto,
        source_app=payload.source_app,
        source_route=payload.source_route,
        source_context=payload.source_context,
        screenshot_bucket_id=screenshot_bucket_id,
        screenshot_object_path=screenshot_object_path,
    )
    db.add(reporte)
    db.commit()
    db.refresh(reporte)

    try:
        from app.services.discord_notifier import notify_new_reporte
        notify_new_reporte(reporte)
    except Exception:
        logger.exception("reportes.discord_notify reporte_id=%s", reporte.id)

    return ReporteCreateResponse(id=reporte.id)
