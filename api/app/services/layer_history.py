from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.layer import Layer

logger = logging.getLogger(__name__)

HISTORY_TABLE = 'mapalab.grid_cell_history'
RESOURCE = 'layer-config'
SOURCE = 'formulario'

TRACKED_COLUMNS: tuple[str, ...] = (
    'label',
    'slug',
    'node_type',
    'parent_id',
    'sort_order',
    'hidden_in_menu',
    'disabled',
    'workspace_alias',
    'geoserver_layer',
    'styles',
    'cql_filter',
    'wms_group',
    'tiled',
    'image_format',
    'antialias',
    'wfs_available',
    'geometry_type',
    'downloadable',
    'time_enabled',
    'default_date',
    'time_style_pattern',
    'hide_periodicity',
    'search_tags',
    'has_municipio',
    'municipio_field',
    'municipio_field_type',
    'icon_url',
    'highlight_color',
    'highlight_shape',
)


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (list, tuple)):
        return ', '.join(str(v) for v in value)
    if isinstance(value, dict):
        return str(value)
    return str(value)


def snapshot(layer: Layer) -> dict[str, Any]:
    return {column: getattr(layer, column, None) for column in TRACKED_COLUMNS}


def record_changes(
    db: Session,
    layer_id: str,
    before: dict[str, Any],
    after: dict[str, Any],
    changed_by: str | None,
) -> None:
    entries = [
        {
            'resource': RESOURCE,
            'row_key': layer_id,
            'column_key': column,
            'from_value': _as_text(before.get(column)),
            'to_value': _as_text(after.get(column)),
            'changed_by': changed_by,
            'source': SOURCE,
        }
        for column in TRACKED_COLUMNS
        if before.get(column) != after.get(column)
    ]
    if not entries:
        return

    try:
        db.execute(
            text(
                f'INSERT INTO {HISTORY_TABLE} '
                '(resource, row_key, column_key, from_value, to_value, changed_by, source) '
                'VALUES (:resource, :row_key, :column_key, :from_value, :to_value, :changed_by, :source)'
            ),
            entries,
        )
    except Exception:
        logger.warning(
            'no se pudo registrar el historial de la capa %s; el cambio si se guardo',
            layer_id,
            exc_info=True,
        )
