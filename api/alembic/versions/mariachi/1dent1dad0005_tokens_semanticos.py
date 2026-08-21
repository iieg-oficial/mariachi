"""colores semanticos de la marca iieg

Revision ID: 1dent1dad0005
Revises: s1eej0001
Create Date: 2026-08-21

"""
import json

import sqlalchemy as sa
from alembic import op

revision = '1dent1dad0005'
down_revision = 's1eej0001'
branch_labels = None
depends_on = None

SCHEMA = 'identidad'

COLORES = [
    ('color.success', '#1F7A4D', 'Estado correcto. Sobre blanco da 5.32:1 y sobre su superficie 4.56:1, cumple AA'),
    ('color.success-soft', '#E3F1E9', 'Superficie de avisos y barras en estado correcto'),
    ('color.warning', '#9E5200', 'Advertencia y estado degradado. Sobre blanco da 5.74:1, cumple AA. Comparte valor con accent-deep'),
    ('color.warning-soft', '#FFE9CC', 'Superficie de advertencias. Comparte valor con accent-soft'),
    ('color.danger', '#B3261E', 'Error y estado caido. Sobre blanco da 6.54:1 y sobre su superficie 5.38:1, cumple AA'),
    ('color.danger-soft', '#FBE4E2', 'Superficie de errores y barras en estado caido'),
    ('color.info', '#2e4372', 'Informacion neutra. Sobre blanco da 9.71:1. Comparte valor con secondary'),
    ('color.info-soft', '#EAEFFA', 'Superficie informativa. Comparte valor con surface-field'),
]

ORDEN_BASE = 120


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
