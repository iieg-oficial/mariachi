from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.core.database import get_dataengine_db
from app.core.time import utcnow
from app.models.mapalab_infobox_propuesta import ESTADOS, MapalabInfoboxPropuesta
from app.models.user import Usuario
from app.schemas._camel import CamelCaseOutput
from app.services import mapalab_infobox_service as service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mapalab/infobox-propuestas", tags=["mapalab infobox"])

_require_admin = require_permission("mariachi.mapalab_propuestas.approve")


class PropuestaRow(CamelCaseOutput):
    id: int
    capa_slug: str
    config: dict
    config_vigente: dict | None = None
    comentario: str | None = None
    email: str | None = None
    estado: str
    comentario_revision: str | None = None
    revisado_por: str | None = None
    creado_en: str


class RechazarIn(BaseModel):
    comentario: str = Field(..., min_length=3, max_length=1000)


def _serialize(propuesta: MapalabInfoboxPropuesta, vigente: dict | None = None) -> PropuestaRow:
    return PropuestaRow(
        id=propuesta.id,
        capa_slug=propuesta.capa_slug,
        config=propuesta.config,
        config_vigente=vigente,
        comentario=propuesta.comentario,
        email=propuesta.email,
        estado=propuesta.estado,
        comentario_revision=propuesta.comentario_revision,
        revisado_por=propuesta.revisado_por,
        creado_en=propuesta.creado_en.isoformat() if propuesta.creado_en else '',
    )


def _get(db: Session, propuesta_id: int) -> MapalabInfoboxPropuesta:
    propuesta = (
        db.query(MapalabInfoboxPropuesta)
        .filter(MapalabInfoboxPropuesta.id == propuesta_id)
        .first()
    )
    if propuesta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Propuesta no encontrada")
    return propuesta


@router.get("", response_model=list[PropuestaRow])
def listar(
    estado: str = Query(default="pendiente"),
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _user: Usuario = Depends(_require_admin),
):
    if estado not in ESTADOS and estado != "todas":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado inválido")

    query = db.query(MapalabInfoboxPropuesta)
    if estado != "todas":
        query = query.filter(MapalabInfoboxPropuesta.estado == estado)
    propuestas = query.order_by(MapalabInfoboxPropuesta.creado_en.desc()).limit(200).all()

    vigentes: dict[str, dict | None] = {}
    for propuesta in propuestas:
        if propuesta.capa_slug in vigentes:
            continue
        try:
            capa = service.get_capa_habilitada(dataengine_db, propuesta.capa_slug)
            vigentes[propuesta.capa_slug] = capa.infobox_config
        except service.PropuestaError:
            vigentes[propuesta.capa_slug] = None

    return [_serialize(p, vigentes.get(p.capa_slug)) for p in propuestas]


@router.post("/{propuesta_id}/aprobar")
def aprobar(
    propuesta_id: int,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    propuesta = _get(db, propuesta_id)
    if propuesta.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se aprueban propuestas pendientes (actual: {propuesta.estado})",
        )

    try:
        service.aplicar_propuesta(dataengine_db, propuesta)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    propuesta.estado = "aprobada"
    propuesta.revisado_por = current_user.email
    propuesta.revisado_en = utcnow()
    db.commit()

    service.invalidar_cache_catalogo()
    logger.info("infobox.propuesta.aprobada id=%s capa=%s", propuesta.id, propuesta.capa_slug)
    return {"ok": True}


@router.post("/{propuesta_id}/rechazar")
def rechazar(
    propuesta_id: int,
    payload: RechazarIn,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    propuesta = _get(db, propuesta_id)
    if propuesta.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se rechazan propuestas pendientes (actual: {propuesta.estado})",
        )

    propuesta.estado = "rechazada"
    propuesta.comentario_revision = payload.comentario
    propuesta.revisado_por = current_user.email
    propuesta.revisado_en = utcnow()
    db.commit()

    logger.info("infobox.propuesta.rechazada id=%s", propuesta.id)
    return {"ok": True}
