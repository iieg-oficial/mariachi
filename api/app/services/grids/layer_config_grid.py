from __future__ import annotations

import threading
import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.services.bulk_ingest_parser import parse_bool
from app.services.geoserver_client import GeoServerClient
from app.services.grid_batch import (
    GridBatchError,
    GridField,
    GridSpec,
    GridTable,
    normalize_blank,
)
from app.services.mapalab_notifier import notify_tree_changed

NODE_TYPES = ('tema', 'category', 'label', 'group', 'leaf')
IMAGE_FORMATS = ('image/png', 'image/png8', 'image/jpeg')
ANTIALIAS_VALUES = ('full', 'text', 'none')
MUNICIPIO_FIELD_TYPES = ('clave', 'nombre')

LAYERS_TABLE = GridTable(
    key='layers',
    qualified_name='mapalab.layers',
    primary_key='id',
    columns=(
        'id',
        'label',
        'slug',
        'node_type',
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
    ),
    jsonb_columns=('default_date',),
    array_columns=('search_tags',),
    audit_user_column='updated_by',
    audit_timestamp_column='updated_at',
    allow_insert=False,
)

HISTORY_TABLE = 'mapalab.grid_cell_history'

_REQUIRED_KEYS = frozenset({'label', 'node_type', 'sort_order', 'image_format', 'antialias'})

_LAYERS_CACHE_TTL_SECONDS = 60.0
_layers_cache: dict[str, tuple[float, frozenset[str]]] = {}
_layers_cache_lock = threading.Lock()


def _choice(values: tuple[str, ...]) -> Any:
    def coerce(value: Any) -> Any:
        text_value = str(value).strip()
        if text_value not in values:
            raise GridBatchError(f"'{text_value}' no es un valor valido: {', '.join(values)}")
        return text_value

    return coerce


def _coerce_sort_order(value: Any) -> Any:
    try:
        return int(str(value).strip())
    except ValueError:
        raise GridBatchError('El orden debe ser un numero entero') from None


def _coerce_slug(value: Any) -> Any:
    text_value = str(value).strip().lower()
    if len(text_value) > 60:
        raise GridBatchError('El nombre en URL no puede pasar de 60 caracteres')
    if not all(c.isdigit() or (c.isascii() and c.islower()) or c == '-' for c in text_value):
        raise GridBatchError('El nombre en URL solo admite minusculas, numeros y guiones')
    return text_value


def _plain_field(
    key: str,
    column: str,
    max_length: int | None = None,
    coerce: Any = None,
) -> GridField:
    return GridField(
        key=key,
        table='layers',
        columns=(column,),
        read=lambda row, c=column: row.get(c),
        write=lambda row, value, c=column: row.__setitem__(c, value),
        coerce=coerce,
        max_length=max_length,
    )


def _bool_field(key: str, column: str) -> GridField:
    return GridField(
        key=key,
        table='layers',
        columns=(column,),
        read=lambda row, c=column: row.get(c),
        write=lambda row, value, c=column: row.__setitem__(c, bool(value)),
        coerce=parse_bool,
    )


def _text_not_null_field(key: str, column: str, max_length: int | None = None) -> GridField:
    return GridField(
        key=key,
        table='layers',
        columns=(column,),
        read=lambda row, c=column: row.get(c),
        write=lambda row, value, c=column: row.__setitem__(c, value if value is not None else ''),
        max_length=max_length,
    )


def _read_default_date(row: dict) -> Any:
    raw = row.get('default_date')
    if raw is None:
        return None
    if isinstance(raw, dict):
        year = raw.get('year')
        return str(year) if year is not None else None
    return str(raw)


def _write_default_date(row: dict, value: Any) -> None:
    if value is None:
        row['default_date'] = None
        return
    text_value = str(value).strip()
    row['default_date'] = 'latest' if text_value == 'latest' else {'year': int(text_value)}


def _coerce_default_date(value: Any) -> Any:
    text_value = str(value).strip().lower()
    if text_value == 'latest':
        return 'latest'
    if not (text_value.isdigit() and len(text_value) == 4):
        raise GridBatchError("La fecha por defecto debe ser un anio de 4 digitos o 'latest'")
    return text_value


def _read_search_tags(row: dict) -> Any:
    raw = row.get('search_tags')
    if not raw:
        return None
    return ', '.join(raw)


def _write_search_tags(row: dict, value: Any) -> None:
    if value is None:
        row['search_tags'] = None
        return
    tags = [tag.strip().lower() for tag in str(value).split(',')]
    row['search_tags'] = [tag for tag in tags if tag] or None


FIELDS: dict[str, GridField] = {
    item.key: item
    for item in (
        _plain_field('label', 'label', max_length=255),
        _plain_field('slug', 'slug', max_length=60, coerce=_coerce_slug),
        _plain_field('node_type', 'node_type', coerce=_choice(NODE_TYPES)),
        _plain_field('sort_order', 'sort_order', coerce=_coerce_sort_order),
        _bool_field('hidden_in_menu', 'hidden_in_menu'),
        _bool_field('disabled', 'disabled'),
        _plain_field('geoserver_layer', 'geoserver_layer', max_length=200),
        _text_not_null_field('styles', 'styles', max_length=200),
        _text_not_null_field('cql_filter', 'cql_filter'),
        _plain_field('wms_group', 'wms_group', max_length=100),
        _bool_field('tiled', 'tiled'),
        _plain_field('image_format', 'image_format', coerce=_choice(IMAGE_FORMATS)),
        _plain_field('antialias', 'antialias', coerce=_choice(ANTIALIAS_VALUES)),
        _bool_field('wfs_available', 'wfs_available'),
        _bool_field('downloadable', 'downloadable'),
        _bool_field('time_enabled', 'time_enabled'),
        GridField(
            key='default_date',
            table='layers',
            columns=('default_date',),
            read=_read_default_date,
            write=_write_default_date,
            coerce=_coerce_default_date,
        ),
        _plain_field('time_style_pattern', 'time_style_pattern', max_length=200),
        _bool_field('hide_periodicity', 'hide_periodicity'),
        GridField(
            key='search_tags',
            table='layers',
            columns=('search_tags',),
            read=_read_search_tags,
            write=_write_search_tags,
        ),
        _bool_field('has_municipio', 'has_municipio'),
        _plain_field('municipio_field', 'municipio_field', max_length=100),
        _plain_field(
            'municipio_field_type',
            'municipio_field_type',
            coerce=_choice(MUNICIPIO_FIELD_TYPES),
        ),
        _plain_field('icon_url', 'icon_url'),
        _plain_field('highlight_color', 'highlight_color', max_length=20),
        _plain_field('highlight_shape', 'highlight_shape', max_length=20),
    )
}

COLUMNS_META: list[dict] = [
    {'key': 'id', 'title': 'ID de la capa', 'type': 'text', 'group': 'Identidad', 'width': 240, 'editable': False, 'sticky': True},
    {'key': 'ruta', 'title': 'Ubicacion en el arbol', 'type': 'text', 'group': 'Identidad', 'width': 300, 'editable': False},
    {'key': 'label', 'title': 'Nombre', 'type': 'text', 'group': 'Identidad', 'width': 260},
    {'key': 'slug', 'title': 'Nombre en URL', 'type': 'text', 'group': 'Identidad', 'width': 200},
    {'key': 'node_type', 'title': 'Tipo de nodo', 'type': 'select', 'optionsKey': 'nodeType', 'group': 'Identidad', 'width': 140},
    {'key': 'sort_order', 'title': 'Orden', 'type': 'text', 'group': 'Identidad', 'width': 90},
    {'key': 'hidden_in_menu', 'title': 'Oculta en menu', 'type': 'bool', 'group': 'Identidad', 'width': 120},
    {'key': 'disabled', 'title': 'Deshabilitada', 'type': 'bool', 'group': 'Identidad', 'width': 120},
    {'key': 'search_tags', 'title': 'Etiquetas de busqueda', 'type': 'textarea', 'group': 'Identidad', 'width': 260},
    {'key': 'workspace_alias', 'title': 'Workspace', 'type': 'text', 'group': 'Servicios', 'width': 140, 'editable': False},
    {'key': 'geoserver_workspace', 'title': 'Workspace en GeoServer', 'type': 'text', 'group': 'Servicios', 'width': 180, 'editable': False},
    {'key': 'geoserver_layer', 'title': 'Capa de GeoServer', 'type': 'text', 'group': 'Servicios', 'width': 240},
    {'key': 'styles', 'title': 'Estilo SLD', 'type': 'text', 'group': 'Servicios', 'width': 200},
    {'key': 'cql_filter', 'title': 'Filtro CQL', 'type': 'textarea', 'group': 'Servicios', 'width': 300},
    {'key': 'wms_group', 'title': 'Grupo WMS', 'type': 'text', 'group': 'Servicios', 'width': 160},
    {'key': 'tiled', 'title': 'Tiles (cache)', 'type': 'bool', 'group': 'Servicios', 'width': 110},
    {'key': 'image_format', 'title': 'Formato de imagen', 'type': 'select', 'optionsKey': 'imageFormat', 'group': 'Servicios', 'width': 150},
    {'key': 'antialias', 'title': 'Suavizado', 'type': 'select', 'optionsKey': 'antialias', 'group': 'Servicios', 'width': 130},
    {'key': 'wfs_available', 'title': 'WFS disponible', 'type': 'bool', 'group': 'Servicios', 'width': 120},
    {'key': 'downloadable', 'title': 'Descargable', 'type': 'bool', 'group': 'Servicios', 'width': 110},
    {'key': 'time_enabled', 'title': 'Soporte temporal', 'type': 'bool', 'group': 'Temporalidad', 'width': 130},
    {'key': 'default_date', 'title': 'Fecha por defecto', 'type': 'text', 'group': 'Temporalidad', 'width': 140},
    {'key': 'time_style_pattern', 'title': 'Patron de estilo temporal', 'type': 'text', 'group': 'Temporalidad', 'width': 200},
    {'key': 'hide_periodicity', 'title': 'Ocultar periodicidad', 'type': 'bool', 'group': 'Temporalidad', 'width': 140},
    {'key': 'has_municipio', 'title': 'Filtro por municipio', 'type': 'bool', 'group': 'Busqueda', 'width': 140},
    {'key': 'municipio_field', 'title': 'Campo de municipio', 'type': 'text', 'group': 'Busqueda', 'width': 170},
    {'key': 'municipio_field_type', 'title': 'Tipo de campo', 'type': 'select', 'optionsKey': 'municipioFieldType', 'group': 'Busqueda', 'width': 130},
    {'key': 'icon_url', 'title': 'Icono', 'type': 'link', 'group': 'Apariencia', 'width': 240},
    {'key': 'highlight_color', 'title': 'Color de resaltado', 'type': 'text', 'group': 'Apariencia', 'width': 150},
    {'key': 'highlight_shape', 'title': 'Forma de resaltado', 'type': 'text', 'group': 'Apariencia', 'width': 150},
    {'key': 'infobox_resumen', 'title': 'Tarjeta', 'type': 'text', 'group': 'Apariencia', 'width': 130, 'editable': False},
    {'key': 'notice_resumen', 'title': 'Aviso', 'type': 'text', 'group': 'Apariencia', 'width': 110, 'editable': False},
    {'key': 'badge_resumen', 'title': 'Badge', 'type': 'text', 'group': 'Apariencia', 'width': 110, 'editable': False},
]

_SELECT_SQL = """
    WITH RECURSIVE arbol AS (
        SELECT id, parent_id, ''::text AS ruta_padre, label::text AS ruta
        FROM mapalab.layers
        WHERE parent_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT hijo.id, hijo.parent_id, padre.ruta, padre.ruta || ' > ' || hijo.label
        FROM mapalab.layers hijo
        JOIN arbol padre ON hijo.parent_id = padre.id
        WHERE hijo.deleted_at IS NULL
    )
    SELECT l.id, l.label, l.slug, l.node_type, l.sort_order, l.hidden_in_menu, l.disabled,
           l.workspace_alias, l.geoserver_layer, l.styles, l.cql_filter, l.wms_group,
           l.tiled, l.image_format, l.antialias, l.wfs_available, l.downloadable,
           l.time_enabled, l.default_date, l.time_style_pattern, l.hide_periodicity,
           l.search_tags, l.has_municipio, l.municipio_field, l.municipio_field_type,
           l.icon_url, l.highlight_color, l.highlight_shape,
           l.infobox_config, l.notice, l.badge, l.updated_at, l.updated_by,
           w.geoserver_workspace, a.ruta_padre, a.ruta
    FROM mapalab.layers l
    LEFT JOIN arbol a ON a.id = l.id
    LEFT JOIN mapalab.workspaces w ON w.alias = l.workspace_alias
    WHERE l.deleted_at IS NULL {extra}
    ORDER BY a.ruta NULLS LAST, l.id
"""


def _infobox_resumen(config: Any) -> str | None:
    if not config:
        return None
    blocks = config.get('blocks') if isinstance(config, dict) else None
    if isinstance(blocks, list):
        return f'{len(blocks)} bloque(s)'
    return 'configurada'


def _flag_resumen(value: Any, label: str) -> str | None:
    if not value:
        return None
    if isinstance(value, dict) and value.get('enabled') is False:
        return None
    return label


def fetch_rows(
    conn: Connection,
    workspace: str | None = None,
    search: str | None = None,
) -> list[dict]:
    clauses: list[str] = []
    params: dict[str, Any] = {}
    if workspace:
        clauses.append('l.workspace_alias = :workspace')
        params['workspace'] = workspace
    if search:
        clauses.append(
            '(l.id ILIKE :search OR l.label ILIKE :search OR l.slug ILIKE :search'
            ' OR l.geoserver_layer ILIKE :search)'
        )
        params['search'] = f'%{search}%'
    extra = f'AND {" AND ".join(clauses)}' if clauses else ''

    records = conn.execute(text(_SELECT_SQL.format(extra=extra)), params).mappings().all()

    rows: list[dict] = []
    for record in records:
        state = dict(record)
        row: dict[str, Any] = {
            'id': record['id'],
            'ruta': record['ruta_padre'] or '—',
            'workspace_alias': record['workspace_alias'],
            'geoserver_workspace': record['geoserver_workspace'],
            'infobox_resumen': _infobox_resumen(record['infobox_config']),
            'notice_resumen': _flag_resumen(record['notice'], 'con aviso'),
            'badge_resumen': _flag_resumen(record['badge'], 'con badge'),
            'updated_at': record['updated_at'].isoformat() if record['updated_at'] else None,
            'updated_by': record['updated_by'],
        }
        for key, grid_field in FIELDS.items():
            row[key] = grid_field.read(state)
        rows.append(row)
    return rows


def _known_layers(geoserver_workspace: str) -> frozenset[str] | None:
    now = time.monotonic()
    with _layers_cache_lock:
        cached = _layers_cache.get(geoserver_workspace)
        if cached and now - cached[0] < _LAYERS_CACHE_TTL_SECONDS:
            return cached[1]

    try:
        names = frozenset(GeoServerClient().list_layers(geoserver_workspace))
    except Exception:
        return None

    with _layers_cache_lock:
        _layers_cache[geoserver_workspace] = (now, names)
    return names


def _is_layer_group(geoserver_workspace: str, name: str) -> bool:
    try:
        return GeoServerClient().is_layer_group(geoserver_workspace, name)
    except Exception:
        return False


def _guard(
    conn: Connection,
    states: dict[str, dict],
    grid_field: GridField,
    value: Any,
) -> str | None:
    proposed = normalize_blank(value)

    if proposed is None and grid_field.key in _REQUIRED_KEYS:
        return f"'{grid_field.key}' no puede quedar vacio"

    if grid_field.key != 'geoserver_layer' or proposed is None:
        return None

    alias = (states.get('layers') or {}).get('workspace_alias')
    if not alias:
        return 'Asigna primero un workspace a la capa desde el editor del arbol'

    workspace = conn.execute(
        text('SELECT geoserver_workspace FROM mapalab.workspaces WHERE alias = :alias'),
        {'alias': alias},
    ).mappings().first()
    if workspace is None:
        return f"El workspace '{alias}' no existe en la tabla workspaces"

    geoserver_workspace = workspace['geoserver_workspace']
    known = _known_layers(geoserver_workspace)
    if known is None or str(proposed) in known:
        return None

    if _is_layer_group(geoserver_workspace, str(proposed)):
        return None

    return f"'{proposed}' no existe en el workspace '{geoserver_workspace}' de GeoServer"


SPEC = GridSpec(
    key='layer-config',
    database='dataengine',
    row_key_field='id',
    tables={'layers': LAYERS_TABLE},
    fields=FIELDS,
    fetch_rows=fetch_rows,
    presence_scope='grid-layer-config',
    project_slug='mapalab',
    min_role='editor',
    columns_meta=COLUMNS_META,
    guard=_guard,
    history_table=HISTORY_TABLE,
    on_commit=notify_tree_changed,
)
