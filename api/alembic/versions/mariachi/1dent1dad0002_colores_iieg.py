"""colores de la marca iieg

Revision ID: 1dent1dad0002
Revises: c1f2e3d4a5b6
Create Date: 2026-08-10

"""
import json

import sqlalchemy as sa
from alembic import op

revision = '1dent1dad0002'
down_revision = 'c1f2e3d4a5b6'
branch_labels = None
depends_on = None

SCHEMA = 'identidad'

COLORES = [
    ('color.primary', '#5C2472', 'Morado institucional del IIEG — identidad de MapaLab, botones primarios y seleccion. 10.77:1 sobre blanco, cumple AA'),
    ('color.secondary', '#2e4372', 'Azul de numeralia — datos, encabezados de tabla y graficos. 9.71:1 sobre blanco, cumple AA'),
    ('color.accent', '#FF8300', 'Naranja institucional — resaltados y estados activos. 2.47:1 sobre blanco: NO cumple AA como texto, usar solo como fondo o acento grafico'),
    ('color.text', '#465055', 'Texto principal (grafito). 8.27:1 sobre blanco, cumple AA'),
    ('color.bg', '#FFFFFF', 'Fondo de pagina'),
]

ORDEN_BASE = 100


def upgrade() -> None:
    conn = op.get_bind()
    marca_id = conn.execute(
        sa.text(f'SELECT id FROM {SCHEMA}.marcas WHERE codigo = :codigo'),
        {'codigo': 'iieg'},
    ).scalar()

    if marca_id is None:
        return

    for indice, (clave, valor, descripcion) in enumerate(COLORES):
        conn.execute(
            sa.text(
                f'INSERT INTO {SCHEMA}.tokens '
                '(marca_id, grupo, clave, tipo, valor, descripcion, orden) '
                'VALUES (:marca_id, :grupo, :clave, :tipo, CAST(:valor AS jsonb), :descripcion, :orden) '
                'ON CONFLICT ON CONSTRAINT uq_identidad_token DO NOTHING'
            ),
            {
                'marca_id': marca_id,
                'grupo': 'color',
                'clave': clave,
                'tipo': 'color',
                'valor': json.dumps(valor),
                'descripcion': descripcion,
                'orden': ORDEN_BASE + indice,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            f'DELETE FROM {SCHEMA}.tokens WHERE grupo = :grupo AND clave = ANY(:claves) '
            f'AND marca_id = (SELECT id FROM {SCHEMA}.marcas WHERE codigo = :codigo)'
        ),
        {
            'grupo': 'color',
            'claves': [clave for clave, _, _ in COLORES],
            'codigo': 'iieg',
        },
    )
