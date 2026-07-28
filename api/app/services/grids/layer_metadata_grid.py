from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.services.bulk_ingest_parser import parse_bool, parse_date_iso, parse_number_with_symbol
from app.services.grid_batch import (
    GridField,
    GridSpec,
    GridTable,
    json_list_item_field,
    json_slot_field,
)

NUMERALIA_SLOTS = 8

METADATA_TABLE = GridTable(
    key='metadata',
    qualified_name='mapalab.layer_metadata',
    primary_key='layer_key',
    columns=(
        'layer_key',
        'workspace',
        'layer_name_db',
        'layer_name_usuario',
        'descripcion',
        'fuentes',
        'metodologia',
        'metadato',
        'frecuencia',
        'fecha_ultima',
        'tipo_mapa',
        'tipo_mapa_enlace',
        'texto_leyenda',
        'tarjeta_punto_poligono',
        'link_final_capa',
        'downloadable',
    ),
    jsonb_columns=('fuentes', 'metodologia', 'metadato'),
    audit_user_column='updated_by',
    audit_timestamp_column='updated_at',
    allow_insert=False,
)

STATS_TABLE = GridTable(
    key='stats',
    qualified_name='mapalab.layer_stats',
    primary_key='layer_key',
    columns=('layer_key', 'stats_config', 'values', 'pie_numeralia'),
    jsonb_columns=('stats_config', 'values'),
    audit_user_column='updated_by',
    audit_timestamp_column='updated_at',
    allow_insert=True,
)

HISTORY_TABLE = 'mapalab.grid_cell_history'


def _column_field(
    key: str,
    column: str,
    max_length: int | None = None,
    coerce: Any = None,
    table: str = 'metadata',
) -> GridField:
    return GridField(
        key=key,
        table=table,
        columns=(column,),
        read=lambda row, c=column: row.get(c),
        write=lambda row, value, c=column: row.__setitem__(c, value),
        coerce=coerce,
        max_length=max_length,
    )


def _numeralia_value(value: Any) -> Any:
    number, _symbol = parse_number_with_symbol(value)
    return number


def _build_fields() -> dict[str, GridField]:
    fields: list[GridField] = [
        _column_field('layer_name_usuario', 'layer_name_usuario', max_length=300),
        _column_field('layer_name_db', 'layer_name_db', max_length=200),
        _column_field('descripcion', 'descripcion'),
        _column_field('frecuencia', 'frecuencia', max_length=200),
        _column_field('fecha_ultima', 'fecha_ultima', max_length=200, coerce=parse_date_iso),
        _column_field('tipo_mapa', 'tipo_mapa', max_length=100),
        _column_field('tipo_mapa_enlace', 'tipo_mapa_enlace', max_length=500),
        _column_field('texto_leyenda', 'texto_leyenda'),
        _column_field('tarjeta_punto_poligono', 'tarjeta_punto_poligono', max_length=50),
        _column_field('link_final_capa', 'link_final_capa', max_length=500),
        _column_field('downloadable', 'downloadable', coerce=parse_bool),
        _column_field('pie_numeralia', 'pie_numeralia', max_length=500, table='stats'),
    ]

    for json_key, column, item_key, max_length in (
        ('fuentes_corto', 'fuentes', 'corto', 300),
        ('fuentes_largo', 'fuentes', 'largo', 2000),
        ('fuentes_enlace', 'fuentes', 'enlace', 500),
        ('metodologia_texto', 'metodologia', 'texto', 2000),
        ('metodologia_archivo_enlace', 'metodologia', 'archivo_enlace', 500),
    ):
        read, write = json_list_item_field(column, 0, item_key)
        fields.append(
            GridField(
                key=json_key,
                table='metadata',
                columns=(column,),
                read=read,
                write=write,
                max_length=max_length,
            )
        )

    for slot in range(1, NUMERALIA_SLOTS + 1):
        prefix = f'numeralia_{slot:02d}'
        for suffix, value_key, coerce, max_length in (
            ('nombre', 'nombre', None, 300),
            ('valor', 'valor', _numeralia_value, 100),
            ('simbolo', 'simbolo', None, 30),
        ):
            read, write = json_slot_field('values', 'posicion', slot, value_key)
            fields.append(
                GridField(
                    key=f'{prefix}_{suffix}',
                    table='stats',
                    columns=('values',),
                    read=read,
                    write=write,
                    coerce=coerce,
                    max_length=max_length,
                )
            )

    return {item.key: item for item in fields}


FIELDS = _build_fields()


def _numeralia_columns_meta() -> list[dict]:
    columns: list[dict] = []
    for slot in range(1, NUMERALIA_SLOTS + 1):
        prefix = f'numeralia_{slot:02d}'
        group = f'Numeralia {slot:02d}'
        columns.extend([
            {'key': f'{prefix}_nombre', 'title': f'N{slot:02d} nombre', 'type': 'text', 'group': group, 'width': 180},
            {'key': f'{prefix}_valor', 'title': f'N{slot:02d} valor', 'type': 'text', 'group': group, 'width': 120},
            {'key': f'{prefix}_simbolo', 'title': f'N{slot:02d} símbolo', 'type': 'text', 'group': group, 'width': 90},
        ])
    return columns


COLUMNS_META: list[dict] = [
    {'key': 'layer_key', 'title': 'Capa (GeoServer)', 'type': 'text', 'group': 'Identidad', 'width': 260, 'editable': False, 'sticky': True},
    {'key': 'layer_name_usuario', 'title': 'Nombre para el usuario', 'type': 'text', 'group': 'Identidad', 'width': 260},
    {'key': 'layer_name_db', 'title': 'Nombre en BD', 'type': 'text', 'group': 'Identidad', 'width': 200},
    {'key': 'descripcion', 'title': 'Descripción', 'type': 'textarea', 'group': 'Identidad', 'width': 320},
    {'key': 'frecuencia', 'title': 'Frecuencia', 'type': 'select', 'optionsKey': 'frecuencia', 'group': 'Actualización', 'width': 180},
    {'key': 'fecha_ultima', 'title': 'Última actualización', 'type': 'text', 'group': 'Actualización', 'width': 160},
    {'key': 'downloadable', 'title': 'Descargable', 'type': 'bool', 'group': 'Actualización', 'width': 110},
    {'key': 'fuentes_corto', 'title': 'Fuente (corto)', 'type': 'text', 'group': 'Fuentes', 'width': 160},
    {'key': 'fuentes_largo', 'title': 'Fuente (cita larga)', 'type': 'textarea', 'group': 'Fuentes', 'width': 320},
    {'key': 'fuentes_enlace', 'title': 'Fuente (enlace)', 'type': 'link', 'group': 'Fuentes', 'width': 240},
    {'key': 'metodologia_texto', 'title': 'Metodología', 'type': 'textarea', 'group': 'Metodología', 'width': 320},
    {'key': 'metodologia_archivo_enlace', 'title': 'Metodología (enlace)', 'type': 'link', 'group': 'Metodología', 'width': 240},
    {'key': 'tipo_mapa', 'title': 'Tipo de mapa', 'type': 'select', 'optionsKey': 'tipoMapa', 'group': 'Cartografía', 'width': 140},
    {'key': 'tipo_mapa_enlace', 'title': 'Tipo de mapa (enlace)', 'type': 'link', 'group': 'Cartografía', 'width': 240},
    {'key': 'texto_leyenda', 'title': 'Texto de leyenda', 'type': 'textarea', 'group': 'Cartografía', 'width': 320},
    {'key': 'tarjeta_punto_poligono', 'title': 'Geometría de tarjeta', 'type': 'text', 'group': 'Cartografía', 'width': 160},
    {'key': 'link_final_capa', 'title': 'Enlace al visor', 'type': 'link', 'group': 'Cartografía', 'width': 240},
    *_numeralia_columns_meta(),
    {'key': 'pie_numeralia', 'title': 'Pie de numeralia', 'type': 'textarea', 'group': 'Numeralia', 'width': 280},
]

_SELECT_SQL = """
    SELECT m.layer_key, m.workspace, m.layer_name_db, m.layer_name_usuario, m.descripcion,
           m.fuentes, m.metodologia, m.metadato, m.frecuencia, m.fecha_ultima, m.tipo_mapa,
           m.tipo_mapa_enlace, m.texto_leyenda, m.tarjeta_punto_poligono, m.link_final_capa,
           m.downloadable, m.updated_at, m.updated_by,
           s.values AS stats_values, s.pie_numeralia, s.stats_config
    FROM mapalab.layer_metadata m
    LEFT JOIN mapalab.layer_stats s ON s.layer_key = m.layer_key
    {where}
    ORDER BY m.layer_key
"""


def _has_dynamic_stats(stats_config: Any) -> bool:
    if not isinstance(stats_config, list):
        return False
    return any(
        isinstance(item, dict) and item.get('operation') not in (None, 'static')
        for item in stats_config
    )


def fetch_rows(
    conn: Connection,
    workspace: str | None = None,
    search: str | None = None,
) -> list[dict]:
    clauses: list[str] = []
    params: dict[str, Any] = {}
    if workspace:
        clauses.append('m.workspace = :workspace')
        params['workspace'] = workspace
    if search:
        clauses.append(
            '(m.layer_key ILIKE :search OR m.layer_name_usuario ILIKE :search'
            ' OR m.descripcion ILIKE :search)'
        )
        params['search'] = f'%{search}%'
    where = f'WHERE {" AND ".join(clauses)}' if clauses else ''

    records = conn.execute(text(_SELECT_SQL.format(where=where)), params).mappings().all()

    rows: list[dict] = []
    for record in records:
        metadata_state = dict(record)
        stats_state = {
            'values': record['stats_values'],
            'pie_numeralia': record['pie_numeralia'],
            'stats_config': record['stats_config'],
        }
        row: dict[str, Any] = {
            'layer_key': record['layer_key'],
            'workspace': record['workspace'],
            'updated_at': record['updated_at'].isoformat() if record['updated_at'] else None,
            'updated_by': record['updated_by'],
            'has_dynamic_stats': _has_dynamic_stats(record['stats_config']),
            'metadato_count': len(record['metadato']) if isinstance(record['metadato'], list) else 0,
        }
        for key, grid_field in FIELDS.items():
            state = stats_state if grid_field.table == 'stats' else metadata_state
            row[key] = grid_field.read(state)
        rows.append(row)
    return rows


def _guard(states: dict[str, dict], grid_field: GridField) -> str | None:
    if grid_field.table != 'stats' or grid_field.columns != ('values',):
        return None
    if _has_dynamic_stats((states.get('stats') or {}).get('stats_config')):
        return (
            'La numeralia de esta capa se calcula desde la base de datos; '
            'editala en la pestaña Metadatos de la capa'
        )
    return None


SPEC = GridSpec(
    key='layer-metadata',
    database='dataengine',
    row_key_field='layer_key',
    tables={'metadata': METADATA_TABLE, 'stats': STATS_TABLE},
    fields=FIELDS,
    fetch_rows=fetch_rows,
    presence_scope='grid-layer-metadata',
    project_slug='mapalab',
    min_role='editor',
    columns_meta=COLUMNS_META,
    guard=_guard,
    history_table=HISTORY_TABLE,
)


def load_states(conn: Connection, layer_key: str) -> dict[str, dict]:
    metadata = conn.execute(
        text(
            'SELECT ' + ', '.join(METADATA_TABLE.columns)
            + ' FROM mapalab.layer_metadata WHERE layer_key = :key'
        ),
        {'key': layer_key},
    ).mappings().first()
    stats = conn.execute(
        text(
            'SELECT ' + ', '.join(STATS_TABLE.columns)
            + ' FROM mapalab.layer_stats WHERE layer_key = :key'
        ),
        {'key': layer_key},
    ).mappings().first()
    return {
        'metadata': dict(metadata) if metadata else None,
        'stats': dict(stats) if stats else None,
    }
