"""variantes del acento de la marca iieg

Revision ID: 1dent1dad0003
Revises: m1nerva0001
Create Date: 2026-08-10

"""
import json

import sqlalchemy as sa
from alembic import op

revision = '1dent1dad0003'
down_revision = 'm1nerva0001'
branch_labels = None
depends_on = None

SCHEMA = 'identidad'

VARIANTES = [
    ('color.accent-deep', '#9E5200', 'Naranja oscuro, valido en los dos sentidos: como texto sobre accent-soft da 4.86:1 y como fondo con blanco encima 5.74:1. El acento base (#FF8300) da 2.47:1 y no sirve para ninguno de los dos'),
    ('color.accent-soft', '#FFE9CC', 'Naranja claro para fondos sutiles (hover, resaltados). Con el texto principal encima da 7.00:1'),
]

ORDEN_BASE = 105


def upgrade() -> None:
    conn = op.get_bind()
    marca_id = conn.execute(
        sa.text(f'SELECT id FROM {SCHEMA}.marcas WHERE codigo = :codigo'),
        {'codigo': 'iieg'},
    ).scalar()

    if marca_id is None:
        return

    for indice, (clave, valor, descripcion) in enumerate(VARIANTES):
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
            'claves': [clave for clave, _, _ in VARIANTES],
            'codigo': 'iieg',
        },
    )
