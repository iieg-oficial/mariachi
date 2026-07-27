from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_ip
from app.core.database import get_dataengine_db
from app.schemas._camel import CamelCaseInput
from app.schemas.mapalab_infobox import InfoboxPropuestaConfig
from app.services import mapalab_infobox_service as service
from app.services.mapalab_telemetry import hash_ip

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mapalab/catalogo", tags=["mapalab catalogo"])


class PropuestaIn(CamelCaseInput):
    capa_slug: str = Field(..., min_length=1, max_length=100)
    config: InfoboxPropuestaConfig
    comentario: str | None = Field(default=None, max_length=1000)
    email: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)


class PropuestaOut(BaseModel):
    ok: bool
    id: int | None = None


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else None


@router.post(
    "/infobox-propuestas",
    response_model=PropuestaOut,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[
        Depends(rate_limit_ip(max_requests=3, window_seconds=3600, scope="infobox_propuestas"))
    ],
    summary="Propuesta ciudadana de tarjeta de información",
)
async def crear_propuesta(
    request: Request,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body JSON inválido")

    try:
        payload = PropuestaIn.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())

    if payload.website:
        logger.info("infobox.propuesta.honeypot ip=%s", _client_ip(request))
        return PropuestaOut(ok=True)

    try:
        propuesta = service.crear_propuesta(
            db,
            dataengine_db,
            capa_slug=payload.capa_slug,
            config=payload.config,
            comentario=payload.comentario,
            email=payload.email,
            ip_hash=hash_ip(_client_ip(request)),
        )
    except service.PropuestaError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    logger.info(
        "infobox.propuesta.creada id=%s capa=%s", propuesta.id, propuesta.capa_slug
    )
    return PropuestaOut(ok=True, id=propuesta.id)
