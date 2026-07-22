from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.capas_catalogo import CapaCatalogo
from app.models.layer import Layer, Workspace
from app.schemas.capas_catalogo import CapaCatalogoCreate, CapaCatalogoUpdate
from app.services import slug_service
from app.services.geoserver_client import GeoServerClient
from app.services.layer_service import validate_layer_against_geoserver


def _slug_taken(session: Session, slug: str, exclude_id: int | None = None) -> bool:
    query = session.query(CapaCatalogo).filter(
        CapaCatalogo.slug == slug,
        CapaCatalogo.deleted_at.is_(None),
    )
    if exclude_id is not None:
        query = query.filter(CapaCatalogo.id != exclude_id)
    return session.query(query.exists()).scalar()


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


def get_capas(session: Session) -> list[CapaCatalogo]:
    return (
        session.query(CapaCatalogo)
        .filter(CapaCatalogo.deleted_at.is_(None))
        .order_by(CapaCatalogo.nombre)
        .all()
    )


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

    nombre = (data.nombre or '').strip() or data.geoserver_layer

    provided_slug = (data.slug or '').strip()
    if provided_slug:
        if _slug_taken(session, provided_slug):
            raise ValueError(f"Slug '{provided_slug}' ya esta tomado por otra capa del catalogo.")
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

    if "slug" in payload and payload["slug"] != capa.slug:
        if _slug_taken(session, payload["slug"], exclude_id=capa.id):
            raise ValueError(
                f"Slug '{payload['slug']}' ya esta tomado por otra capa del catalogo."
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
) -> dict:
    workspace = session.query(Workspace).filter(Workspace.alias == workspace_alias).first()
    if workspace is None:
        raise ValueError(f"Workspace '{workspace_alias}' no existe en tabla workspaces")

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
                updated_by=updated_by,
            )
        )
        existing.add(layer)
        created += 1

    session.flush()
    return {"created": created, "skipped": skipped}


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
