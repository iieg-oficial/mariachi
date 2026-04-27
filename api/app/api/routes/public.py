from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.time import utcnow
from app.models.evento import Evento
from app.models.home_section import HomeSection
from app.models.menu_item import MenuItem
from app.models.page import Page
from app.schemas.evento import EventoPublicResponse
from app.schemas.home_section import SECTION_SCHEMAS, HomePublicResponse
from app.schemas.menu_item import MenuItemResponse, MenuItemTree
from app.schemas.page import PageResponse
from app.services.mapalab_public_cache import get_versions

router = APIRouter(tags=["portal público"])
mapalab_router = APIRouter(tags=["mapalab público"])


def construir_arbol_menu(items: list[MenuItem]) -> list[MenuItemTree]:
    item_map = {}
    root_items = []

    items_visibles = sorted(
        [item for item in items if item.visible],
        key=lambda x: x.order
    )

    for item in items_visibles:
        item_dict = MenuItemResponse.model_validate(item).model_dump()
        item_map[item.id] = MenuItemTree(**item_dict, children=[])

    for item in items_visibles:
        tree_item = item_map[item.id]
        if item.parent_id and item.parent_id in item_map:
            item_map[item.parent_id].children.append(tree_item)
        else:
            root_items.append(tree_item)

    return root_items


@router.get("/elementos-menu/arbol", response_model=list[MenuItemTree])
async def obtener_arbol_menu(db: Session = Depends(get_db)):
    items = db.query(MenuItem).all()
    return construir_arbol_menu(items)


@router.get("/paginas/{slug:path}", response_model=PageResponse)
async def obtener_pagina_por_slug(slug: str, db: Session = Depends(get_db)):
    pagina = db.query(Page).filter(Page.slug == slug).first()

    if not pagina:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    return pagina


@mapalab_router.get("/cache-version")
async def cache_version():
    return get_versions()


@mapalab_router.get("/eventos", response_model=list[EventoPublicResponse])
async def eventos_visibles(db: Session = Depends(get_db)):
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
    return eventos


@mapalab_router.get("/home", response_model=HomePublicResponse)
async def home_publicado(db: Session = Depends(get_db)):
    secciones = {s.key: s.payload_published for s in db.query(HomeSection).all()}
    sanitized = {}
    for key, schema_cls in SECTION_SCHEMAS.items():
        raw = secciones.get(key) or {}
        try:
            sanitized[key] = schema_cls.model_validate(raw)
        except Exception:
            sanitized[key] = schema_cls()
    return HomePublicResponse(**sanitized)
