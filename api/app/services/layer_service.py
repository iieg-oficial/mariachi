from __future__ import annotations

from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.layer import InitialLayerOrder, Layer, Workspace
from app.schemas.layer import LayerCreate, LayerUpdate
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


def _payload_to_row(payload: dict[str, Any], updated_by: str | None) -> dict[str, Any]:
    row = {k: v for k, v in payload.items() if v is not None}

    if 'infobox_template' in row or 'infobox_params' in row:
        resolved = resolve_infobox(row.get('infobox_template'), row.get('infobox_params'))
        row['infobox_config'] = resolved

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

    row = _payload_to_row(payload, updated_by)

    layer = Layer(**row)
    session.add(layer)
    session.flush()
    return layer


def update_layer(
    session: Session,
    layer: Layer,
    data: LayerUpdate,
    updated_by: str | None,
    skip_geoserver_validation: bool = False,
) -> Layer:
    payload = data.model_dump(exclude_unset=True, by_alias=False)

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

    for key, value in payload.items():
        setattr(layer, key, value)
    layer.updated_by = updated_by
    session.flush()
    return layer


def delete_layer(session: Session, layer: Layer) -> None:
    session.delete(layer)
    session.flush()


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
