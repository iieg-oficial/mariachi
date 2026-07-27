from __future__ import annotations

import logging

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.capas_catalogo import CapaCatalogo
from app.models.layer import Workspace
from app.models.mapalab_infobox_propuesta import MapalabInfoboxPropuesta
from app.schemas.mapalab_infobox import InfoboxPropuestaConfig, validate_fields_exist
from app.services.geoserver_client import GeoServerClient, GeoServerError
from app.services.mapalab_notifier import notify_catalogo_changed

logger = logging.getLogger(__name__)

MAX_PENDIENTES_POR_CAPA = 10


class PropuestaError(ValueError):
    pass


def get_capa_habilitada(dataengine_db: Session, slug: str) -> CapaCatalogo:
    capa = (
        dataengine_db.query(CapaCatalogo)
        .filter(
            CapaCatalogo.slug == slug,
            CapaCatalogo.enabled.is_(True),
            CapaCatalogo.deleted_at.is_(None),
        )
        .first()
    )
    if capa is None:
        raise PropuestaError(f"No existe capa de catálogo '{slug}'")
    return capa


def resolve_available_fields(dataengine_db: Session, capa: CapaCatalogo) -> set[str]:
    ws = (
        dataengine_db.query(Workspace)
        .filter(Workspace.alias == capa.workspace_alias)
        .first()
    )
    if ws is None:
        return set()
    try:
        fields = GeoServerClient().list_fields(ws.geoserver_workspace, capa.geoserver_layer)
    except (GeoServerError, httpx.HTTPError) as exc:
        logger.warning(
            "infobox.propuesta.campos_no_resueltos capa=%s error=%s", capa.slug, exc
        )
        return set()
    return {f["name"] for f in fields if f.get("name")}


def count_pendientes(db: Session, slug: str) -> int:
    return (
        db.query(func.count(MapalabInfoboxPropuesta.id))
        .filter(
            MapalabInfoboxPropuesta.capa_slug == slug,
            MapalabInfoboxPropuesta.estado == "pendiente",
        )
        .scalar()
        or 0
    )


def crear_propuesta(
    db: Session,
    dataengine_db: Session,
    *,
    capa_slug: str,
    config: InfoboxPropuestaConfig,
    comentario: str | None,
    email: str | None,
    ip_hash: str | None,
) -> MapalabInfoboxPropuesta:
    capa = get_capa_habilitada(dataengine_db, capa_slug)

    available = resolve_available_fields(dataengine_db, capa)
    try:
        validate_fields_exist(config, available)
    except ValueError as exc:
        raise PropuestaError(str(exc)) from exc

    if count_pendientes(db, capa_slug) >= MAX_PENDIENTES_POR_CAPA:
        raise PropuestaError(
            "Esta capa ya tiene varias propuestas esperando revisión. Intenta más tarde."
        )

    propuesta = MapalabInfoboxPropuesta(
        capa_slug=capa_slug,
        config=config.to_config(),
        comentario=comentario or None,
        email=email or None,
        ip_hash=ip_hash,
    )
    db.add(propuesta)
    db.commit()
    db.refresh(propuesta)
    return propuesta


def aplicar_propuesta(
    dataengine_db: Session, propuesta: MapalabInfoboxPropuesta
) -> None:
    capa = get_capa_habilitada(dataengine_db, propuesta.capa_slug)
    revalidada = InfoboxPropuestaConfig.model_validate(propuesta.config)
    validate_fields_exist(revalidada, resolve_available_fields(dataengine_db, capa))
    capa.infobox_config = revalidada.to_config()
    dataengine_db.commit()


def invalidar_cache_catalogo() -> None:
    notify_catalogo_changed()
