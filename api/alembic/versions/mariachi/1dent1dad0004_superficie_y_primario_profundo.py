"""superficie de campos y primario profundo de la marca iieg

Revision ID: 1dent1dad0004
Revises: 1dent1dad0003
Create Date: 2026-08-10

"""
import json

import sqlalchemy as sa
from alembic import op

revision = '1dent1dad0004'
down_revision = '1dent1dad0003'
branch_labels = None
depends_on = None

SCHEMA = 'identidad'

COLORES = [
    ('color.primary-deep', '#703088', 'Morado profundo para elementos adosados al primario (boton de un campo de busqueda, estados presionados). Con texto blanco da 8.51:1, cumple AA'),
    ('color.surface-field', '#EAEFFA', 'Superficie de campos de captura y busqueda. Con el primario encima da 9.34:1 y con el texto oscuro 15.26:1'),
]

ORDEN_BASE = 110


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
