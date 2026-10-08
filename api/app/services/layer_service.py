from __future__ import annotations

from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.layer import InitialLayerOrder, Layer, Workspace
from app.schemas.layer import LayerBadge, LayerCreate, LayerNotice, LayerUpdate
from app.services.geoserver_client import GeoServerClient, GeoServerError

INFOBOX_TEMPLATES = {
    'municipio', 'punto', 'punto_municipio',
    'punto_ubicacion', 'punto_completo', 'custom',
}

MUNICIPIO_STYLE = {'color': '#FF8300', 'bg': '#FFF2E5'}
CARACTERISTICA_STYLE = {'color': '#7B61FF', 'bg': '#F3F0FF'}


def resolve_infobox(template: str | None, params: dict | None) -> dict | None:
    if not template or template == 'custom':
        return params

    if template not in INFOBOX_TEMPLATES:
        raise ValueError(f"infobox_template invalido: '{template}'")

    params = params or {}

    if template == 'municipio':
        return {
            'headerField': params.get('title', 'nombre'),
            'labelGroups': [
                {'fields': [params.get('municipio', 'nombre')], **MUNICIPIO_STYLE},
                {'fields': ['fecha']},
            ],
            'text': [{'label': params['text']}] if params.get('text') else None,
            'cards': params.get('stats') or [],
            'cardsColumns': params.get('columns', 1),
        }

    if template == 'punto':
        return {
            'headerField': params.get('title', 'nombre'),
            'labelGroups': [
                {'fields': [params.get('caracteristica', 'tipo')], **CARACTERISTICA_STYLE},
            ],
        }

    if template == 'punto_municipio':
        return {
            'headerField': params.get('title', 'nombre'),
            'labelGroups': [
                {'fields': [params.get('municipio', 'municipio')], **MUNICIPIO_STYLE},
                {'fields': [params.get('caracteristica', 'tipo')], **CARACTERISTICA_STYLE},
            ],
        }

    if template == 'punto_ubicacion':
        return {
            'headerField': params.get('title', 'nombre'),
            'labelGroups': [
                {'fields': [params.get('municipio', 'municipio')], **MUNICIPIO_STYLE},
                *[
                    {'fields': [f], **CARACTERISTICA_STYLE}
                    for f in (params.get('caracteristicas') or [])
                ],
            ],
            'list': params.get('list') or [],
            'iconText': params.get('iconTexts') or [],
        }

    if template == 'punto_completo':
        return {
            'headerField': params.get('title', 'nombre'),
            'labelGroups': [
                {'fields': [params.get('municipio', 'municipio')], **MUNICIPIO_STYLE},
                *[
                    {'fields': [f], **CARACTERISTICA_STYLE}
                    for f in (params.get('caracteristicas') or [])
                ],
            ],
            'list': params.get('list') or [],
            'iconText': params.get('iconTexts') or [],
            'stats': params.get('stats') or [],
            'text': [{'label': params['text']}] if params.get('text') else None,
        }

    return params


def validate_layer_against_geoserver(
    session: Session,
    workspace_alias: str | None,
    geoserver_layer: str | None,
    client: GeoServerClient | None = None,
) -> None:
    if not workspace_alias or not geoserver_layer:
        return

    workspace = session.query(Workspace).filter(Workspace.alias == workspace_alias).first()
    if workspace is None:
        raise ValueError(f"Workspace '{workspace_alias}' no existe en tabla workspaces")

    client = client or GeoServerClient()
    if not client.layer_exists(workspace.geoserver_workspace, geoserver_layer):
        raise GeoServerError(
            f"La capa '{workspace.geoserver_workspace}:{geoserver_layer}' no existe en GeoServer"
        )


def resolve_geometry_type(
    session: Session,
    workspace_alias: str | None,
    geoserver_layer: str | None,
    client: GeoServerClient | None = None,
) -> str | None:
    if not workspace_alias or not geoserver_layer:
        return None

    workspace = session.query(Workspace).filter(Workspace.alias == workspace_alias).first()
    if workspace is None:
        return None

    client = client or GeoServerClient()
    try:
        return client.geometry_type(workspace.geoserver_workspace, geoserver_layer)
    except Exception:
        return None


def _normalize_notice(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict) and not value.get('enabled'):
        return None
    if isinstance(value, LayerNotice):
        if not value.enabled:
            return None
        return value.model_dump(by_alias=True, exclude_none=True)
    return LayerNotice.model_validate(value).model_dump(by_alias=True, exclude_none=True)


def _normalize_badge(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict) and not value.get('enabled'):
        return None
    if isinstance(value, LayerBadge):
        if not value.enabled:
            return None
        return value.model_dump(by_alias=True, exclude_none=True)
    return LayerBadge.model_validate(value).model_dump(by_alias=True, exclude_none=True)


def _payload_to_row(payload: dict[str, Any], updated_by: str | None) -> dict[str, Any]:
    row = {k: v for k, v in payload.items() if v is not None}

    if 'infobox_template' in row or 'infobox_params' in row:
        resolved = resolve_infobox(row.get('infobox_template'), row.get('infobox_params'))
        row['infobox_config'] = resolved

    if 'notice' in row:
        row['notice'] = _normalize_notice(row['notice'])

    if 'badge' in row:
        row['badge'] = _normalize_badge(row['badge'])

    row['updated_by'] = updated_by
    return row


def _validate_slug_unique(session: Session, slug: str | None, exclude_layer_id: str | None) -> None:
    if not slug:
        return
    from app.services import slug_service
    if not slug_service.is_valid_slug(slug):
        raise ValueError(
            f"Slug invalido: '{slug}'. Solo minusculas, numeros y guiones; max 60 chars."
        )
    if slug_service.slug_taken(session, slug, exclude_layer_id=exclude_layer_id):
        raise ValueError(
            f"Slug '{slug}' ya esta tomado por otra capa o por un alias existente."
        )


def create_layer(
    session: Session,
    data: LayerCreate,
    updated_by: str | None,
    skip_geoserver_validation: bool = False,
) -> Layer:
    payload = data.model_dump(exclude_unset=False, by_alias=False)

    if not skip_geoserver_validation:
        validate_layer_against_geoserver(
            session,
            payload.get('workspace_alias'),
            payload.get('geoserver_layer'),
        )

    _validate_slug_unique(session, payload.get('slug'), exclude_layer_id=None)

    if not payload.get('geometry_type'):
        payload['geometry_type'] = resolve_geometry_type(
            session,
            payload.get('workspace_alias'),
            payload.get('geoserver_layer'),
        )

    row = _payload_to_row(payload, updated_by)

    layer = Layer(**row)
    session.add(layer)
    session.flush()
    return layer


AUTO_PARENT_ID = 'eventos-auto'
AUTO_PARENT_LABEL = 'Eventos (auto-creado)'


def _ensure_auto_parent(session: Session, updated_by: str | None) -> Layer:
    parent = session.query(Layer).filter(Layer.id == AUTO_PARENT_ID).first()
    if parent:
        if parent.deleted_at is not None:
            parent.deleted_at = None
            parent.updated_by = updated_by
            session.flush()
        return parent
    parent = Layer(
        id=AUTO_PARENT_ID,
        parent_id=None,
        label=AUTO_PARENT_LABEL,
        sort_order=9999,
        node_type='tema',
        hidden_in_menu=True,
        disabled=False,
        styles='',
        cql_filter='',
        updated_by=updated_by,
    )
    session.add(parent)
    session.flush()
    return parent


def _slugify_id_segment(value: str) -> str:
    return ''.join(
        ch if ch.isalnum() or ch == '-' else '-'
        for ch in value.lower().replace('_', '-')
    ).strip('-')


def find_or_create_auto_leaf(
    session: Session,
    workspace_alias: str,
    geoserver_layer: str,
    label: str,
    updated_by: str | None,
) -> tuple[Layer, bool]:
    parent = _ensure_auto_parent(session, updated_by)

    existing = (
        session.query(Layer)
        .filter(
            Layer.workspace_alias == workspace_alias,
            Layer.geoserver_layer == geoserver_layer,
            Layer.node_type == 'leaf',
            Layer.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        return existing, False

    soft_deleted = (
        session.query(Layer)
        .filter(
            Layer.workspace_alias == workspace_alias,
            Layer.geoserver_layer == geoserver_layer,
            Layer.node_type == 'leaf',
            Layer.deleted_at.is_not(None),
        )
        .order_by(Layer.deleted_at.desc())
        .first()
    )
    if soft_deleted is not None:
        soft_deleted.deleted_at = None
        soft_deleted.parent_id = parent.id
        soft_deleted.updated_by = updated_by
        if label:
            soft_deleted.label = label
        session.flush()
        return soft_deleted, True

    validate_layer_against_geoserver(session, workspace_alias, geoserver_layer)

    base_id = f'auto-{_slugify_id_segment(workspace_alias)}-{_slugify_id_segment(geoserver_layer)}'
    base_id = base_id[:100]
    candidate = base_id
    suffix = 2
    while session.query(Layer.id).filter(Layer.id == candidate).first():
        tail = f'-{suffix}'
        candidate = base_id[: 100 - len(tail)] + tail
        suffix += 1

    leaf = Layer(
        id=candidate,
        parent_id=parent.id,
        label=label,
        sort_order=9999,
        node_type='leaf',
        hidden_in_menu=False,
        disabled=False,
        workspace_alias=workspace_alias,
        geoserver_layer=geoserver_layer,
        styles='',
        cql_filter='',
        wfs_available=True,
        downloadable=True,
        updated_by=updated_by,
    )
    session.add(leaf)
    session.flush()
    return leaf, True


def _collect_descendant_ids(session: Session, root_id: str) -> set[str]:
    from sqlalchemy import text

    sql = (
        "WITH RECURSIVE subtree AS ("
        "  SELECT id FROM mapalab.layers WHERE id = :root "
        "  UNION ALL "
        "  SELECT l.id FROM mapalab.layers l JOIN subtree s ON l.parent_id = s.id"
        ") SELECT id FROM subtree"
    )
    return {row[0] for row in session.execute(text(sql), {'root': root_id}).fetchall()}


def _apply_parent_change(session: Session, layer: Layer, new_parent_id: str | None, payload: dict) -> None:
    from sqlalchemy import func

    if new_parent_id == layer.id:
        raise ValueError('Una capa no puede ser su propio padre')
    if new_parent_id is not None:
        parent = session.query(Layer).filter(Layer.id == new_parent_id).first()
        if parent is None or parent.deleted_at is not None:
            raise ValueError(f"El destino '{new_parent_id}' no existe")
        if new_parent_id in _collect_descendant_ids(session, layer.id):
            raise ValueError('No puedes mover una capa dentro de sí misma o de una de sus subcapas')
    max_order = (
        session.query(func.max(Layer.sort_order))
        .filter(Layer.parent_id == new_parent_id, Layer.id != layer.id)
        .scalar()
    )
    payload['sort_order'] = (max_order + 1) if max_order is not None else 0


def update_layer(
    session: Session,
    layer: Layer,
    data: LayerUpdate,
    updated_by: str | None,
    skip_geoserver_validation: bool = False,
) -> Layer:
    payload = data.model_dump(exclude_unset=True, by_alias=False)

    if 'parent_id' in payload and payload['parent_id'] != layer.parent_id:
        _apply_parent_change(session, layer, payload['parent_id'], payload)

    new_workspace = payload.get('workspace_alias', layer.workspace_alias)
    new_geoserver_layer = payload.get('geoserver_layer', layer.geoserver_layer)

    if not skip_geoserver_validation and (
        'workspace_alias' in payload or 'geoserver_layer' in payload
    ):
        validate_layer_against_geoserver(session, new_workspace, new_geoserver_layer)

    if 'slug' in payload:
        _validate_slug_unique(session, payload.get('slug'), exclude_layer_id=layer.id)

    if 'infobox_template' in payload or 'infobox_params' in payload:
        template = payload.get('infobox_template', layer.infobox_template)
        params = payload.get('infobox_params', layer.infobox_params)
        payload['infobox_config'] = resolve_infobox(template, params)

    if 'notice' in payload:
        payload['notice'] = _normalize_notice(payload['notice'])

    if 'badge' in payload:
        payload['badge'] = _normalize_badge(payload['badge'])

    for key, value in payload.items():
        setattr(layer, key, value)
    layer.updated_by = updated_by
    session.flush()
    return layer


def soft_delete_layer(session: Session, layer: Layer, deleted_by: str | None) -> None:
    """Marca la capa como eliminada sin borrar la fila. Reversible vía restore."""
    if layer.deleted_at is not None:
        return
    layer.deleted_at = utcnow()
    layer.deleted_by = deleted_by
    layer.updated_by = deleted_by
    session.flush()


def soft_delete_subtree(session: Session, layer: Layer, deleted_by: str | None) -> list[str]:
    """Archiva la capa junto con toda su descendencia viva.

    Devuelve los ids archivados. Restaurar es capa por capa: `restore_layer`
    exige que el padre no esté en papelera, así que el orden es de arriba abajo.
    """
    ids = _collect_descendant_ids(session, layer.id)
    descendientes = (
        session.query(Layer)
        .filter(Layer.id.in_(ids), Layer.deleted_at.is_(None))
        .all()
    )
    for nodo in descendientes:
        soft_delete_layer(session, nodo, deleted_by)
    return [nodo.id for nodo in descendientes]


def _flatten_evento_capa_refs(capas_json: Any) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if not isinstance(capas_json, list):
        return out
    for c in capas_json:
        if not isinstance(c, dict):
            continue
        tipo = c.get('tipo')
        if tipo == 'categoria':
            out.extend(_flatten_evento_capa_refs(c.get('capas') or []))
        elif tipo == 'capa':
            ws = c.get('workspace')
            gl = c.get('layer')
            if ws and gl:
                out.append((ws, gl))
    return out


def _flatten_evento_capa_aliases(capas_json: Any) -> list[tuple[str, str, str | None]]:
    out: list[tuple[str, str, str | None]] = []
    if not isinstance(capas_json, list):
        return out
    for c in capas_json:
        if not isinstance(c, dict):
            continue
        tipo = c.get('tipo')
        if tipo == 'categoria':
            out.extend(_flatten_evento_capa_aliases(c.get('capas') or []))
        elif tipo == 'capa':
            ws = c.get('workspace')
            gl = c.get('layer')
            if ws and gl:
                out.append((ws, gl, c.get('alias')))
    return out


def sync_auto_leaf_labels(
    dataengine_session: Session,
    capas_json: Any,
    updated_by: str | None,
) -> int:
    updated = 0
    for ws, gl, alias in _flatten_evento_capa_aliases(capas_json):
        if not alias:
            continue
        layer = (
            dataengine_session.query(Layer)
            .filter(
                Layer.workspace_alias == ws,
                Layer.geoserver_layer == gl,
                Layer.parent_id == AUTO_PARENT_ID,
                Layer.deleted_at.is_(None),
            )
            .first()
        )
        if layer is not None and layer.label != alias:
            layer.label = alias
            layer.updated_by = updated_by
            updated += 1
    if updated:
        dataengine_session.flush()
    return updated


def find_orphan_auto_leaves(
    mariachi_session: Session,
    dataengine_session: Session,
    evento: Any,
) -> list[Layer]:
    """Capas auto-leaf bajo `eventos-auto` que solo este evento referencia.

    Una capa es huérfana si:
      - Vive bajo `parent_id=eventos-auto` (creada via auto-leaf, no catálogo).
      - Está activa (`deleted_at IS NULL`).
      - El par `(workspace, layer)` aparece en `evento.capas` y en NINGÚN otro
        evento de mariachi DB.
    """
    from app.models.evento import Evento

    this_pairs = set(_flatten_evento_capa_refs(evento.capas))
    if not this_pairs:
        return []

    other_rows = mariachi_session.query(Evento.capas).filter(Evento.id != evento.id).all()
    other_pairs: set[tuple[str, str]] = set()
    for (capas_json,) in other_rows:
        other_pairs.update(_flatten_evento_capa_refs(capas_json))

    candidate_pairs = this_pairs - other_pairs
    if not candidate_pairs:
        return []

    orphans: list[Layer] = []
    for ws, gl in candidate_pairs:
        layer = (
            dataengine_session.query(Layer)
            .filter(
                Layer.workspace_alias == ws,
                Layer.geoserver_layer == gl,
                Layer.parent_id == AUTO_PARENT_ID,
                Layer.deleted_at.is_(None),
            )
            .first()
        )
        if layer is not None:
            orphans.append(layer)
    return orphans


def restore_layer(session: Session, layer: Layer, restored_by: str | None) -> None:
    """Restaura una capa previamente eliminada (deleted_at=None)."""
    if layer.deleted_at is None:
        return
    layer.deleted_at = None
    layer.deleted_by = None
    layer.updated_by = restored_by
    session.flush()


def purge_layer(session: Session, layer: Layer) -> None:
    """Hard delete real. Solo permitido sobre capas ya en papelera."""
    if layer.deleted_at is None:
        raise ValueError("Solo se pueden purgar capas que ya están en papelera (deleted_at != NULL)")
    children_count = (
        session.query(Layer).filter(Layer.parent_id == layer.id).count()
    )
    if children_count:
        raise ValueError(
            f"La capa tiene {children_count} hijo(s) (incluyendo papelera). "
            "Purga o mueve los hijos primero."
        )
    session.delete(layer)
    session.flush()


def list_deleted_layers(session: Session) -> list[Layer]:
    return (
        session.query(Layer)
        .filter(Layer.deleted_at.is_not(None))
        .order_by(Layer.deleted_at.desc())
        .all()
    )


def count_alive_children(session: Session, layer_id: str) -> int:
    return (
        session.query(Layer)
        .filter(Layer.parent_id == layer_id, Layer.deleted_at.is_(None))
        .count()
    )


def is_in_initial_order(session: Session, layer_id: str) -> bool:
    return (
        session.query(InitialLayerOrder.layer_id)
        .filter(InitialLayerOrder.layer_id == layer_id)
        .first()
        is not None
    )


# Compat: nombres viejos siguen apuntando al nuevo comportamiento.
def delete_layer(session: Session, layer: Layer, deleted_by: str | None = None) -> None:
    soft_delete_layer(session, layer, deleted_by)


def reorder_children(session: Session, parent_id: str | None, ordered_ids: list[str]) -> int:
    updated = 0
    for sort_order, layer_id in enumerate(ordered_ids):
        layer = session.query(Layer).filter(Layer.id == layer_id).first()
        if layer and layer.parent_id == parent_id:
            layer.sort_order = sort_order
            updated += 1
    session.flush()
    return updated


def set_initial_order(session: Session, ordered_ids: list[str]) -> None:
    valid_ids = {
        row[0] for row in session.query(Layer.id).filter(Layer.id.in_(ordered_ids)).all()
    }
    missing = set(ordered_ids) - valid_ids
    if missing:
        raise ValueError(f"Capas inexistentes en initial-order: {sorted(missing)}")

    session.execute(delete(InitialLayerOrder))
    for sort_order, layer_id in enumerate(ordered_ids):
        session.add(InitialLayerOrder(layer_id=layer_id, sort_order=sort_order))
    session.flush()


def list_initial_order(session: Session) -> list[dict]:
    rows = (
        session.query(
            InitialLayerOrder.layer_id,
            InitialLayerOrder.sort_order,
            Layer.label,
            Layer.node_type,
            Layer.parent_id,
        )
        .join(Layer, Layer.id == InitialLayerOrder.layer_id)
        .order_by(InitialLayerOrder.sort_order)
        .all()
    )
    return [
        {
            "layer_id": r.layer_id,
            "sort_order": r.sort_order,
            "label": r.label,
            "node_type": r.node_type,
            "parent_id": r.parent_id,
        }
        for r in rows
    ]


def duplicate_layer(session: Session, layer: Layer, new_id_suffix: str = '_copy') -> Layer:
    new_id = f'{layer.id}{new_id_suffix}'
    existing = session.query(Layer).filter(Layer.id == new_id).first()
    if existing:
        raise ValueError(f"Ya existe una capa con id '{new_id}'")

    data = {
        c.name: getattr(layer, c.name)
        for c in Layer.__table__.columns
        if c.name not in ('created_at', 'updated_at')
    }
    data['id'] = new_id
    data['updated_by'] = 'duplicate'
    data['slug'] = None
    new_layer = Layer(**data)
    session.add(new_layer)
    session.flush()
    return new_layer


def get_highlight_stats(session: Session) -> dict:
    from sqlalchemy import case, func
    leaves = session.query(Layer).filter(
        Layer.node_type == 'leaf',
        Layer.deleted_at.is_(None),
    )
    total = leaves.count()
    rows_color = (
        session.query(
            case(
                (Layer.highlight_color.is_(None), 'default'),
                else_=Layer.highlight_color,
            ).label('bucket'),
            func.count().label('n'),
        )
        .filter(Layer.node_type == 'leaf', Layer.deleted_at.is_(None))
        .group_by('bucket')
        .all()
    )
    rows_shape = (
        session.query(
            case(
                (Layer.highlight_shape.is_(None), 'default'),
                else_=Layer.highlight_shape,
            ).label('bucket'),
            func.count().label('n'),
        )
        .filter(Layer.node_type == 'leaf', Layer.deleted_at.is_(None))
        .group_by('bucket')
        .all()
    )
    by_color = {bucket: n for bucket, n in rows_color}
    by_shape = {bucket: n for bucket, n in rows_shape}
    fully_default = (
        session.query(func.count())
        .filter(
            Layer.node_type == 'leaf',
            Layer.deleted_at.is_(None),
            Layer.highlight_color.is_(None),
            Layer.highlight_shape.is_(None),
        )
        .scalar()
        or 0
    )
    with_color_override = (
        session.query(func.count())
        .filter(
            Layer.node_type == 'leaf',
            Layer.deleted_at.is_(None),
            Layer.highlight_color.isnot(None),
        )
        .scalar()
        or 0
    )
    with_shape_override = (
        session.query(func.count())
        .filter(
            Layer.node_type == 'leaf',
            Layer.deleted_at.is_(None),
            Layer.highlight_shape.isnot(None),
        )
        .scalar()
        or 0
    )
    with_custom_hex = (
        session.query(func.count())
        .filter(
            Layer.node_type == 'leaf',
            Layer.deleted_at.is_(None),
            Layer.highlight_color.like('#%'),
        )
        .scalar()
        or 0
    )
    return {
        'total_leaves': total,
        'by_color': by_color,
        'by_shape': by_shape,
        'fully_default': fully_default,
        'with_color_override': with_color_override,
        'with_shape_override': with_shape_override,
        'with_custom_hex': with_custom_hex,
    }


def _collect_descendant_leaves(session: Session, root_ids: list[str]) -> list[str]:
    if not root_ids:
        return []
    sql = (
        "WITH RECURSIVE subtree AS ("
        "  SELECT id, node_type, parent_id FROM mapalab.layers WHERE id = ANY(:roots) "
        "  UNION ALL "
        "  SELECT l.id, l.node_type, l.parent_id FROM mapalab.layers l "
        "  JOIN subtree s ON l.parent_id = s.id "
        ") "
        "SELECT id FROM subtree WHERE node_type = 'leaf'"
    )
    from sqlalchemy import text
    rows = session.execute(text(sql), {'roots': root_ids}).fetchall()
    return [r[0] for r in rows]


def _highlight_target_leaves(session: Session, apply_to: str, theme_ids: list[str] | None):
    q = session.query(Layer).filter(
        Layer.node_type == 'leaf',
        Layer.deleted_at.is_(None),
    )
    if theme_ids:
        scoped_ids = _collect_descendant_leaves(session, theme_ids)
        if not scoped_ids:
            return []
        q = q.filter(Layer.id.in_(scoped_ids))
    if apply_to == 'defaults':
        q = q.filter(Layer.highlight_color.is_(None), Layer.highlight_shape.is_(None))
    return q.all()


def bulk_apply_highlight(
    session: Session,
    color: str | None,
    shape: str | None,
    apply_to: str,
    theme_ids: list[str] | None,
    dry_run: bool,
    updated_by: str | None,
) -> dict:
    targets = _highlight_target_leaves(session, apply_to, theme_ids)
    snapshot = [
        {'layer_id': t.id, 'color': t.highlight_color, 'shape': t.highlight_shape}
        for t in targets
    ]
    if dry_run:
        return {'affected': len(targets), 'snapshot': snapshot}
    for t in targets:
        if color is not None or apply_to == 'all':
            t.highlight_color = color
        if shape is not None or apply_to == 'all':
            t.highlight_shape = shape
        t.updated_by = updated_by
    session.flush()
    return {'affected': len(targets), 'snapshot': snapshot}


def restore_highlight_snapshot(
    session: Session,
    snapshot: list[dict],
    updated_by: str | None,
) -> int:
    if not snapshot:
        return 0
    ids = [s['layer_id'] for s in snapshot]
    layers_by_id = {
        row.id: row
        for row in session.query(Layer)
        .filter(Layer.id.in_(ids), Layer.deleted_at.is_(None))
        .all()
    }
    affected = 0
    for s in snapshot:
        layer = layers_by_id.get(s['layer_id'])
        if not layer:
            continue
        layer.highlight_color = s.get('color')
        layer.highlight_shape = s.get('shape')
        layer.updated_by = updated_by
        affected += 1
    session.flush()
    return affected


def reset_highlight(
    session: Session,
    theme_ids: list[str] | None,
    dry_run: bool,
    updated_by: str | None,
) -> dict:
    return bulk_apply_highlight(
        session, color=None, shape=None, apply_to='all',
        theme_ids=theme_ids, dry_run=dry_run, updated_by=updated_by,
    )
