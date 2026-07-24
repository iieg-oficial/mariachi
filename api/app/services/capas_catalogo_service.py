from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.capas_catalogo import CapaCatalogo, InstitucionCatalogo
from app.models.layer import Layer, Workspace
from app.schemas.capas_catalogo import (
    CapaCatalogoBulkUpdate,
    CapaCatalogoCreate,
    CapaCatalogoUpdate,
    InstitucionCatalogoCreate,
    InstitucionCatalogoUpdate,
)
from app.services import slug_service
from app.services.geoserver_client import GeoServerClient
from app.services.layer_service import validate_layer_against_geoserver


def _slug_taken(
    session: Session,
    slug: str,
    exclude_id: int | None = None,
    exclude_institucion_id: int | None = None,
) -> bool:
    capas = session.query(CapaCatalogo).filter(
        CapaCatalogo.slug == slug,
        CapaCatalogo.deleted_at.is_(None),
    )
    if exclude_id is not None:
        capas = capas.filter(CapaCatalogo.id != exclude_id)
    if session.query(capas.exists()).scalar():
        return True

    instituciones = session.query(InstitucionCatalogo).filter(
        InstitucionCatalogo.slug == slug,
        InstitucionCatalogo.deleted_at.is_(None),
    )
    if exclude_institucion_id is not None:
        instituciones = instituciones.filter(
            InstitucionCatalogo.id != exclude_institucion_id
        )
    return session.query(instituciones.exists()).scalar()


def _resolve_slug_collision(session: Session, base: str, exclude_id: int | None = None) -> str:
    if not _slug_taken(session, base, exclude_id):
        return base
    counter = 2
    while _slug_taken(session, f"{base}-{counter}", exclude_id):
        counter += 1
    return f"{base}-{counter}"


def get_all_tags(session: Session) -> list[str]:
    tags: set[str] = set()
    catalogo_rows = (
        session.query(CapaCatalogo.search_tags)
        .filter(CapaCatalogo.deleted_at.is_(None), CapaCatalogo.search_tags.isnot(None))
        .all()
    )
    layer_rows = (
        session.query(Layer.search_tags)
        .filter(Layer.deleted_at.is_(None), Layer.search_tags.isnot(None))
        .all()
    )
    for (arr,) in [*catalogo_rows, *layer_rows]:
        tags.update(t for t in (arr or []) if t and t.strip())
    return sorted(tags)


def get_instituciones(session: Session) -> list[InstitucionCatalogo]:
    return (
        session.query(InstitucionCatalogo)
        .filter(InstitucionCatalogo.deleted_at.is_(None))
        .order_by(InstitucionCatalogo.orden, InstitucionCatalogo.nombre)
        .all()
    )


def get_institucion(session: Session, institucion_id: int) -> InstitucionCatalogo | None:
    return (
        session.query(InstitucionCatalogo)
        .filter(
            InstitucionCatalogo.id == institucion_id,
            InstitucionCatalogo.deleted_at.is_(None),
        )
        .first()
    )


def _siguiente_orden_institucion(session: Session) -> int:
    actual = (
        session.query(func.max(InstitucionCatalogo.orden))
        .filter(InstitucionCatalogo.deleted_at.is_(None))
        .scalar()
    )
    return (actual + 1) if actual is not None else 0


def create_institucion(
    session: Session, data: InstitucionCatalogoCreate, updated_by: str | None
) -> InstitucionCatalogo:
    nombre = data.nombre.strip()
    provided_slug = (data.slug or '').strip()
    if provided_slug:
        if _slug_taken(session, provided_slug):
            raise ValueError(
                f"El slug '{provided_slug}' ya lo usa otra capa o institucion del catalogo."
            )
        slug = provided_slug
    else:
        base = slug_service.slugify(nombre)
        if not base:
            raise ValueError('No se pudo derivar un slug; especifica uno manualmente.')
        slug = _resolve_slug_collision(session, base)

    institucion = InstitucionCatalogo(
        slug=slug,
        nombre=nombre,
        logo_url=data.logo_url,
        orden=_siguiente_orden_institucion(session),
        updated_by=updated_by,
    )
    session.add(institucion)
    session.flush()
    return institucion


def update_institucion(
    session: Session,
    institucion: InstitucionCatalogo,
    data: InstitucionCatalogoUpdate,
    updated_by: str | None,
) -> InstitucionCatalogo:
    payload = data.model_dump(exclude_unset=True, by_alias=False)

    if 'slug' in payload and payload['slug'] != institucion.slug:
        if _slug_taken(session, payload['slug'], exclude_institucion_id=institucion.id):
            raise ValueError(
                f"El slug '{payload['slug']}' ya lo usa otra capa o institucion del catalogo."
            )

    for key, value in payload.items():
        setattr(institucion, key, value)
    institucion.updated_by = updated_by
    session.flush()
    return institucion


def delete_institucion(
    session: Session, institucion: InstitucionCatalogo, deleted_by: str | None
) -> None:
    session.query(CapaCatalogo).filter(
        CapaCatalogo.institucion_id == institucion.id
    ).update({CapaCatalogo.institucion_id: None}, synchronize_session=False)
    institucion.deleted_at = datetime.now(timezone.utc)
    institucion.updated_by = deleted_by
    session.flush()


def reorder_instituciones(session: Session, ids: list[int]) -> list[InstitucionCatalogo]:
    instituciones = (
        session.query(InstitucionCatalogo)
        .filter(
            InstitucionCatalogo.id.in_(ids),
            InstitucionCatalogo.deleted_at.is_(None),
        )
        .all()
    )
    por_id = {institucion.id: institucion for institucion in instituciones}
    posicion = {institucion_id: i for i, institucion_id in enumerate(ids)}
    for institucion in instituciones:
        institucion.orden = posicion[institucion.id]
    session.flush()
    return [por_id[institucion_id] for institucion_id in ids if institucion_id in por_id]


def _validate_institucion(session: Session, institucion_id: int | None) -> None:
    if institucion_id is None:
        return
    if get_institucion(session, institucion_id) is None:
        raise ValueError(f"La institucion '{institucion_id}' no existe")


def get_capas(session: Session) -> list[CapaCatalogo]:
    return (
        session.query(CapaCatalogo)
        .filter(CapaCatalogo.deleted_at.is_(None))
        .order_by(CapaCatalogo.orden, CapaCatalogo.nombre)
        .all()
    )


def _siguiente_orden(session: Session) -> int:
    actual = (
        session.query(func.max(CapaCatalogo.orden))
        .filter(CapaCatalogo.deleted_at.is_(None))
        .scalar()
    )
    return (actual + 1) if actual is not None else 0


def reorder_capas(session: Session, ids: list[int]) -> list[CapaCatalogo]:
    capas = (
        session.query(CapaCatalogo)
        .filter(CapaCatalogo.id.in_(ids), CapaCatalogo.deleted_at.is_(None))
        .all()
    )
    por_id = {capa.id: capa for capa in capas}
    posicion = {capa_id: i for i, capa_id in enumerate(ids)}
    for capa in capas:
        capa.orden = posicion[capa.id]
    session.flush()
    return [por_id[capa_id] for capa_id in ids if capa_id in por_id]


def get_capa(session: Session, capa_id: int) -> CapaCatalogo | None:
    return (
        session.query(CapaCatalogo)
        .filter(CapaCatalogo.id == capa_id, CapaCatalogo.deleted_at.is_(None))
        .first()
    )


def create_capa(
    session: Session, data: CapaCatalogoCreate, updated_by: str | None
) -> CapaCatalogo:
    validate_layer_against_geoserver(session, data.workspace_alias, data.geoserver_layer)
    _validate_institucion(session, data.institucion_id)

    nombre = (data.nombre or '').strip() or data.geoserver_layer

    provided_slug = (data.slug or '').strip()
    if provided_slug:
        if _slug_taken(session, provided_slug):
            raise ValueError(
                f"El slug '{provided_slug}' ya lo usa otra capa o institucion del catalogo."
            )
        slug = provided_slug
    else:
        base = slug_service.slugify(data.geoserver_layer) or slug_service.slugify(nombre)
        if not base:
            raise ValueError('No se pudo derivar un slug; especifica uno manualmente.')
        slug = _resolve_slug_collision(session, base)

    capa = CapaCatalogo(
        slug=slug,
        nombre=nombre,
        workspace_alias=data.workspace_alias,
        geoserver_layer=data.geoserver_layer,
        search_tags=data.search_tags,
        enabled=data.enabled,
        institucion_id=data.institucion_id,
        orden=_siguiente_orden(session),
        updated_by=updated_by,
    )
    session.add(capa)
    session.flush()
    return capa


def update_capa(
    session: Session, capa: CapaCatalogo, data: CapaCatalogoUpdate, updated_by: str | None
) -> CapaCatalogo:
    payload = data.model_dump(exclude_unset=True, by_alias=False)

    new_workspace = payload.get("workspace_alias", capa.workspace_alias)
    new_layer = payload.get("geoserver_layer", capa.geoserver_layer)
    if "workspace_alias" in payload or "geoserver_layer" in payload:
        validate_layer_against_geoserver(session, new_workspace, new_layer)

    if "institucion_id" in payload:
        _validate_institucion(session, payload["institucion_id"])

    if "slug" in payload and payload["slug"] != capa.slug:
        if _slug_taken(session, payload["slug"], exclude_id=capa.id):
            raise ValueError(
                f"El slug '{payload['slug']}' ya lo usa otra capa o institucion del catalogo."
            )

    for key, value in payload.items():
        setattr(capa, key, value)
    capa.updated_by = updated_by
    session.flush()
    return capa


def delete_capa(session: Session, capa: CapaCatalogo, deleted_by: str | None) -> None:
    capa.deleted_at = datetime.now(timezone.utc)
    capa.updated_by = deleted_by
    session.flush()


def bulk_create_capas(
    session: Session,
    workspace_alias: str,
    geoserver_layers: list[str],
    search_tags: list[str] | None,
    updated_by: str | None,
    institucion_id: int | None = None,
) -> dict:
    workspace = session.query(Workspace).filter(Workspace.alias == workspace_alias).first()
    if workspace is None:
        raise ValueError(f"Workspace '{workspace_alias}' no existe en tabla workspaces")

    _validate_institucion(session, institucion_id)

    try:
        caps = GeoServerClient().get_layers_with_titles(workspace.geoserver_workspace)
    except Exception:
        caps = []
    title_map = {c["name"]: c.get("title") for c in caps}

    existing = {
        row[0]
        for row in session.query(CapaCatalogo.geoserver_layer)
        .filter(
            CapaCatalogo.workspace_alias == workspace_alias,
            CapaCatalogo.deleted_at.is_(None),
        )
        .all()
    }

    used_slugs: set[str] = set()

    def _pick_slug(base: str) -> str:
        candidate = base
        counter = 2
        while candidate in used_slugs or _slug_taken(session, candidate):
            candidate = f"{base}-{counter}"
            counter += 1
        used_slugs.add(candidate)
        return candidate

    created = 0
    skipped = 0
    orden = _siguiente_orden(session)
    for layer in geoserver_layers:
        if not layer or layer in existing:
            skipped += 1
            continue
        nombre = (title_map.get(layer) or layer).strip()
        base = slug_service.slugify(layer) or slug_service.slugify(nombre)
        if not base:
            skipped += 1
            continue
        session.add(
            CapaCatalogo(
                slug=_pick_slug(base),
                nombre=nombre,
                workspace_alias=workspace_alias,
                geoserver_layer=layer,
                search_tags=search_tags,
                enabled=True,
                institucion_id=institucion_id,
                orden=orden,
                updated_by=updated_by,
            )
        )
        orden += 1
        existing.add(layer)
        created += 1

    session.flush()
    return {"created": created, "skipped": skipped}


def bulk_update_capas(
    session: Session, data: CapaCatalogoBulkUpdate, updated_by: str | None
) -> dict:
    campos = data.model_dump(exclude_unset=True, by_alias=False)
    if "institucion_id" in campos:
        _validate_institucion(session, campos["institucion_id"])

    rows = (
        session.query(CapaCatalogo)
        .filter(CapaCatalogo.id.in_(data.ids), CapaCatalogo.deleted_at.is_(None))
        .all()
    )

    for capa in rows:
        if "institucion_id" in campos:
            capa.institucion_id = campos["institucion_id"]
        if "enabled" in campos and campos["enabled"] is not None:
            capa.enabled = campos["enabled"]
        if "search_tags" in campos and campos["search_tags"] is not None:
            nuevas = [t.strip() for t in campos["search_tags"] if t and t.strip()]
            if data.tags_mode == "replace":
                capa.search_tags = nuevas
            else:
                actuales = list(capa.search_tags or [])
                capa.search_tags = actuales + [t for t in nuevas if t not in actuales]
        capa.updated_by = updated_by

    session.flush()
    return {"updated": len(rows)}


def bulk_delete_capas(session: Session, ids: list[int], deleted_by: str | None) -> dict:
    rows = (
        session.query(CapaCatalogo)
        .filter(CapaCatalogo.id.in_(ids), CapaCatalogo.deleted_at.is_(None))
        .all()
    )
    now = datetime.now(timezone.utc)
    for capa in rows:
        capa.deleted_at = now
        capa.updated_by = deleted_by
    session.flush()
    return {"deleted": len(rows)}
