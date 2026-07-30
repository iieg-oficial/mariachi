"""mapalab: elimina ip_hash de la telemetria de eventos y sesiones

La sal del hash era la fecha del dia, publica y predecible, por lo que el
hash no anonimizaba la IP. La columna no se consultaba en ninguna vista ni
consulta de estadisticas.

Revision ID: c1f2e3d4a5b6
Revises: 1dent1dad0001
Create Date: 2026-07-30 00:00:00.000000

"""

from alembic import op

revision = 'c1f2e3d4a5b6'
down_revision = '1dent1dad0001'
branch_labels = None
depends_on = None

SCHEMA = 'huachicol'
TABLAS = ('events', 'sessions')


def upgrade() -> None:
    for tabla in TABLAS:
        op.execute(f'ALTER TABLE {SCHEMA}.{tabla} DROP COLUMN IF EXISTS ip_hash')


def downgrade() -> None:
    for tabla in TABLAS:
        op.execute(
            f'ALTER TABLE {SCHEMA}.{tabla} ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64)'
        )
