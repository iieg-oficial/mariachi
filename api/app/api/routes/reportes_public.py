import json
import logging
import uuid
from datetime import datetime
from io import BytesIO

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_ip
from app.models.acervo_bucket import AcervoBucket
from app.models.reporte import Reporte
from app.models.reporte_tipo import ReporteTipo
from app.models.source_app import SourceApp
from app.schemas.form_schema import validate_respuestas
from app.schemas.reporte import ReporteCreate, ReporteCreateResponse
from app.schemas.reporte_tipo import ReporteTipoResponse
from app.services import tipo_archivo
from app.services.acervo import AcervoClient
from app.services.colibri_fanout import despachar_reporte
from app.services.colibri_grupos import asignar_grupo
from app.services.colibri_keys import (
    PRIVATE_PREFIX,
    PUBLIC_PREFIX,
    match_origin,
    verify_api_key,
)
from app.services.pii_scrubber import (
    scrub_respuestas,
    scrub_source_context,
    scrub_text,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["reportes públicos"])

_REPORTES_BUCKET = "mariachi"
_ALLOWED_MIME = {"image/png", "image/jpeg"}
_MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024
_EXT_BY_MIME = {"image/png": "png", "image/jpeg": "jpg"}


def _resolve_source_app(
    db: Session, request: Request, source_app_slug: str
) -> SourceApp:
    plain_key = request.headers.get("X-Colibri-Key")
    if not plain_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta la API key",
        )

    if not (plain_key.startswith(PUBLIC_PREFIX) or plain_key.startswith(PRIVATE_PREFIX)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key con formato inválido",
        )

    prefix_len = len(PUBLIC_PREFIX) if plain_key.startswith(PUBLIC_PREFIX) else len(PRIVATE_PREFIX)
    visible_prefix = plain_key[: prefix_len + 4]

    candidates = (
        db.query(SourceApp)
        .filter(SourceApp.api_key_prefix == visible_prefix)
        .all()
    )
    matched: SourceApp | None = None
    for candidate in candidates:
        if candidate.api_key_hash and verify_api_key(plain_key, candidate.api_key_hash):
            matched = candidate
            break

    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida",
        )
    if not matched.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Source app desactivado",
        )
    if matched.slug != source_app_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La API key no corresponde al source_app '{source_app_slug}'",
        )

    origin = request.headers.get("origin")
    if plain_key.startswith(PRIVATE_PREFIX) and origin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las llaves privadas no se aceptan desde el navegador",
        )
    if plain_key.startswith(PUBLIC_PREFIX):
        patterns = matched.dominios_permitidos or []
        if not match_origin(origin, patterns):
            logger.warning(
                "reportes.cors_blocked source_app=%s origin=%s patterns=%s",
                matched.slug,
                origin,
                patterns,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Origen no autorizado para este source app",
            )

    return matched


def _resolve_reportes_bucket(db: Session) -> AcervoBucket | None:
    return (
        db.query(AcervoBucket)
        .filter(
            AcervoBucket.acervo_bucket == _REPORTES_BUCKET,
            AcervoBucket.is_active.is_(True),
        )
        .first()
    )


def _build_object_path(mime: str) -> str:
    now = datetime.utcnow()
    ext = _EXT_BY_MIME.get(mime, "png")
    return f"reportes/{now.year:04d}/{now.month:02d}/{uuid.uuid4().hex}.{ext}"


async def _upload_screenshot(
    bucket: AcervoBucket, screenshot: UploadFile
) -> str:
    data = await screenshot.read(_MAX_SCREENSHOT_BYTES + 1)
    if len(data) > _MAX_SCREENSHOT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="La captura supera el tamaño máximo permitido (2 MB).",
        )
    mime = tipo_archivo.detectar_mime(data[:tipo_archivo.CABECERA_BYTES])
    if mime not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato de captura no soportado. Solo PNG o JPEG.",
        )

    object_path = _build_object_path(mime)
    client = AcervoClient.for_bucket(bucket)
    client.client.put_object(
        client.bucket_name,
        object_path,
        BytesIO(data),
        len(data),
        content_type=mime,
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
    background_tasks: BackgroundTasks,
    tipo: str = Form(...),
    mensaje: str = Form(...),
    source_app: str = Form(...),
    email_contacto: str | None = Form(default=None),
    source_route: str | None = Form(default=None),
    source_context: str | None = Form(default=None),
    respuestas: str | None = Form(default=None),
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
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=exc.errors(),
        )

    tipo_row = (
        db.query(ReporteTipo)
        .filter(ReporteTipo.slug == payload.tipo, ReporteTipo.activo.is_(True))
        .first()
    )
    if tipo_row is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Tipo de reporte '{payload.tipo}' no válido o inactivo",
        )

    respuestas_validadas: dict | None = None
    if tipo_row.form_schema:
        try:
            raw_respuestas = json.loads(respuestas) if respuestas else {}
            if not isinstance(raw_respuestas, dict):
                raw_respuestas = {}
        except json.JSONDecodeError:
            raw_respuestas = {}
        try:
            respuestas_validadas = validate_respuestas(raw_respuestas, tipo_row.form_schema)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            )
    elif respuestas:
        logger.warning(
            "reportes.respuestas_sin_schema tipo=%s: respuestas descartadas (tipo sin form_schema)",
            payload.tipo,
        )

    matched_source_app = _resolve_source_app(db, request, payload.source_app)
    tipos_permitidos = matched_source_app.tipos_permitidos
    if tipos_permitidos and payload.tipo not in tipos_permitidos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El tipo '{payload.tipo}' no está permitido para este source app",
        )
    per_app_limiter = rate_limit_ip(
        max_requests=matched_source_app.rate_limit_per_hour,
        window_seconds=3600,
        scope=f'reportes:{matched_source_app.slug}',
    )
    await per_app_limiter(request)

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

    disable_pii = bool(matched_source_app.disable_pii)
    extra_scrubbers = matched_source_app.scrubbers or None

    scrubbed_context = scrub_source_context(
        payload.source_context,
        disable_pii=disable_pii,
        extra_scrubbers=extra_scrubbers,
    )
    scrubbed_route = scrub_text(payload.source_route, extra_scrubbers=extra_scrubbers)
    scrubbed_respuestas = scrub_respuestas(
        respuestas_validadas, extra_scrubbers=extra_scrubbers
    )
    final_email = None if disable_pii else payload.email_contacto

    reporte = Reporte(
        tipo=payload.tipo,
        tipo_id=tipo_row.id,
        mensaje=scrub_text(payload.mensaje, extra_scrubbers=extra_scrubbers),
        email_contacto=final_email,
        source_app=payload.source_app,
        source_app_id=matched_source_app.id,
        source_route=scrubbed_route,
        source_context=scrubbed_context,
        respuestas=scrubbed_respuestas,
        screenshot_bucket_id=screenshot_bucket_id,
        screenshot_object_path=screenshot_object_path,
    )
    db.add(reporte)
    db.commit()
    db.refresh(reporte)

    asignar_grupo(db, reporte)
    background_tasks.add_task(despachar_reporte, reporte.id)

    return ReporteCreateResponse(id=reporte.id)


@router.get("/tipos", response_model=list[ReporteTipoResponse])
async def listar_tipos_publicos(response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=300"
    return (
        db.query(ReporteTipo)
        .filter(ReporteTipo.activo.is_(True))
        .order_by(ReporteTipo.orden.asc(), ReporteTipo.id.asc())
        .all()
    )
