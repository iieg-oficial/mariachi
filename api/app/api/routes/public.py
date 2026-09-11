import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.settings import get_settings
from app.core.time import utcnow
from app.models.evento import Evento
from app.models.home_section import HomeSection
from app.models.menu_item import MenuItem
from app.models.page import Page
from app.schemas.evento import EventoPublicResponse
from app.schemas.home_section import SECTION_SCHEMAS, HomePublicResponse
from app.schemas.menu_item import MenuItemTree
from app.schemas.page import PageResponse
from app.services.mapalab_public_cache import (
    get_cached_eventos,
    get_cached_home,
    get_versions,
    schedule_eventos_expiry,
    store_cached_eventos,
    store_cached_home,
)
from app.services.menu_tree import build_menu_tree

logger = logging.getLogger(__name__)

router = APIRouter(tags=["portal público"])
mapalab_router = APIRouter(tags=["mapalab público"])


def _json_response(payload_json: str) -> Response:
    return Response(content=payload_json, media_type='application/json')


@router.get("/elementos-menu/arbol", response_model=list[MenuItemTree])
async def obtener_arbol_menu(db: Session = Depends(get_db)):
    items = db.query(MenuItem).all()
    return build_menu_tree(items)


@router.get("/paginas/{slug:path}", response_model=PageResponse)
async def obtener_pagina_por_slug(slug: str, db: Session = Depends(get_db)):
    pagina = db.query(Page).filter(Page.slug == slug).first()

    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    return pagina


@mapalab_router.get("/cache-version")
async def cache_version():
    return get_versions()


def proximo_cambio_de_eventos(db: Session, ahora: datetime) -> datetime | None:
    vigentes = (Evento.estado == 'published', Evento.activo.is_(True))
    inicio = db.query(func.min(Evento.fecha_inicio)).filter(*vigentes, Evento.fecha_inicio > ahora).scalar()
    fin = db.query(func.min(Evento.fecha_fin)).filter(*vigentes, Evento.fecha_fin > ahora).scalar()
    candidatos = [d for d in (inicio, fin) if d is not None]
    return min(candidatos) if candidatos else None


@mapalab_router.get("/eventos", response_model=list[EventoPublicResponse])
async def eventos_visibles(db: Session = Depends(get_db)):
    version, cached = get_cached_eventos()
    if cached is not None:
        return _json_response(cached)

    ahora = utcnow()
    eventos = (
        db.query(Evento)
        .filter(
            Evento.estado == 'published',
            Evento.activo.is_(True),
            or_(Evento.fecha_inicio.is_(None), Evento.fecha_inicio <= ahora),
            or_(Evento.fecha_fin.is_(None), Evento.fecha_fin >= ahora),
        )
        .order_by(Evento.orden.asc(), Evento.id.asc())
        .all()
    )
    serialized = []
    for e in eventos:
        try:
            serialized.append(
                EventoPublicResponse.model_validate(e).model_dump(by_alias=True, mode='json')
            )
        except Exception as exc:
            logger.warning('Evento %s omitido del listado público: %s', getattr(e, 'id', '?'), exc)
    payload_json = json.dumps(serialized, default=str)
    store_cached_eventos(version, payload_json)
    proximo = proximo_cambio_de_eventos(db, ahora)
    if proximo is not None:
        schedule_eventos_expiry(proximo)
    return _json_response(payload_json)


@mapalab_router.get("/home", response_model=HomePublicResponse)
async def home_publicado(db: Session = Depends(get_db)):
    version, cached = get_cached_home()
    if cached is not None:
        return _json_response(cached)

    field = "payload_draft" if get_settings().environment != "production" else "payload_published"
    secciones = {s.key: getattr(s, field) for s in db.query(HomeSection).all()}
    sanitized = {}
    for key, schema_cls in SECTION_SCHEMAS.items():
        raw = secciones.get(key) or {}
        try:
            sanitized[key] = schema_cls.model_validate(raw)
        except Exception:
            sanitized[key] = schema_cls()
    response = HomePublicResponse(**sanitized)
    payload_json = response.model_dump_json(by_alias=True)
    store_cached_home(version, payload_json)
    return _json_response(payload_json)
