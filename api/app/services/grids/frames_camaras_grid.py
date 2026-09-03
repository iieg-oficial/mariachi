from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.services.grid_batch import GridField, GridSpec, GridTable

CAMARAS_TABLE = GridTable(
    key='camaras',
    qualified_name='frames.camaras',
    primary_key='nombre',
    columns=(
        'nombre',
        'etiqueta',
        'ubicacion',
        'rtsp_url',
        'habilitada',
        'grabacion_habilitada',
        'retencion_dias',
        'deteccion_habilitada',
        'orden',
    ),
    audit_timestamp_column='updated_at',
)


def _campo(key: str, editable: bool = True, max_length: int | None = None) -> GridField:
    def leer(estado: dict) -> Any:
        return (estado or {}).get(key)

    def escribir(estado: dict, valor: Any) -> None:
        estado[key] = valor

    return GridField(
        key=key,
        table='camaras',
        columns=(key,),
        read=leer,
        write=escribir,
        editable=editable,
        max_length=max_length,
    )


FIELDS: dict[str, GridField] = {
    'nombre': _campo('nombre', editable=False, max_length=20),
    'etiqueta': _campo('etiqueta', max_length=200),
    'ubicacion': _campo('ubicacion'),
    'rtsp_url': _campo('rtsp_url'),
    'habilitada': _campo('habilitada'),
    'grabacion_habilitada': _campo('grabacion_habilitada'),
    'retencion_dias': _campo('retencion_dias'),
    'deteccion_habilitada': _campo('deteccion_habilitada'),
    'orden': _campo('orden'),
}

COLUMNS_META: list[dict] = [
    {'key': 'nombre', 'title': 'Nombre interno', 'type': 'text', 'group': 'Identidad', 'width': 160, 'editable': False, 'sticky': True},
    {'key': 'etiqueta', 'title': 'Nombre visible', 'type': 'text', 'group': 'Identidad', 'width': 220},
    {'key': 'ubicacion', 'title': 'Ubicación', 'type': 'textarea', 'group': 'Identidad', 'width': 280},
    {'key': 'rtsp_url', 'title': 'URL RTSP', 'type': 'text', 'group': 'Conexión', 'width': 420},
    {'key': 'habilitada', 'title': 'Habilitada', 'type': 'bool', 'group': 'Operación', 'width': 110},
    {'key': 'grabacion_habilitada', 'title': 'Grabar', 'type': 'bool', 'group': 'Operación', 'width': 100},
    {'key': 'retencion_dias', 'title': 'Días de retención', 'type': 'number', 'group': 'Operación', 'width': 140},
    {'key': 'deteccion_habilitada', 'title': 'Detección', 'type': 'bool', 'group': 'Operación', 'width': 110},
    {'key': 'orden', 'title': 'Orden', 'type': 'number', 'group': 'Operación', 'width': 90},
]

_SELECT_SQL = """
    SELECT nombre, etiqueta, ubicacion, rtsp_url, habilitada, grabacion_habilitada,
           retencion_dias, deteccion_habilitada, orden
    FROM frames.camaras
    ORDER BY orden, nombre
"""


def fetch_rows(conn: Connection, **_: Any) -> list[dict]:
    filas = conn.execute(text(_SELECT_SQL)).mappings().all()
    return [dict(fila) for fila in filas]


def load_states(conn: Connection, nombre: str) -> dict[str, dict]:
    fila = conn.execute(
        text(
            'SELECT ' + ', '.join(CAMARAS_TABLE.columns)
            + ' FROM frames.camaras WHERE nombre = :key'
        ),
        {'key': nombre},
    ).mappings().first()
    return {'camaras': dict(fila) if fila else None}


def _guard(
    conn: Connection,
    states: dict[str, dict],
    grid_field: GridField,
    value: Any,
) -> str | None:
    if grid_field.key == 'rtsp_url' and value and not str(value).startswith('rtsp://'):
        return 'La URL debe empezar con rtsp://'
    if grid_field.key == 'retencion_dias' and value is not None:
        try:
            dias = int(value)
        except (TypeError, ValueError):
            return 'Los días de retención deben ser un número'
        if dias < 1 or dias > 365:
            return 'Los días de retención van de 1 a 365'
    return None


SPEC = GridSpec(
    key='frames-camaras',
    database='mariachi',
    row_key_field='nombre',
    tables={'camaras': CAMARAS_TABLE},
    fields=FIELDS,
    fetch_rows=fetch_rows,
    presence_scope='grid-frames-camaras',
    permission='mariachi.sistema.manage',
    columns_meta=COLUMNS_META,
    guard=_guard,
)
