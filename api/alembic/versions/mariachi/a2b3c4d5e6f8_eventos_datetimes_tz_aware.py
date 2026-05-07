"""eventos: DateTime sin TZ -> DateTime con TZ

Revision ID: a2b3c4d5e6f8
Revises: a1b2c3d4e5f7
Create Date: 2026-05-07 17:00:00.000000

Las columnas datetime de eventos (created_at, updated_at, published_at,
fecha_inicio, fecha_fin) eran timestamp sin timezone, lo que provocaba
ambiguedad al comparar con utcnow() (timezone aware) o al deserializar
ISO strings con offset desde el frontend. Migracion a `timestamp with
time zone`. Los valores existentes se interpretan como UTC.
"""
from alembic import op


revision = 'a2b3c4d5e6f8'
down_revision = 'a1b2c3d4e5f7'
branch_labels = None
depends_on = None


COLUMNS = ('created_at', 'updated_at', 'published_at', 'fecha_inicio', 'fecha_fin')


def upgrade() -> None:
    for col in COLUMNS:
        op.execute(
            f"ALTER TABLE eventos ALTER COLUMN {col} "
            f"TYPE timestamp with time zone USING {col} AT TIME ZONE 'UTC'"
        )


def downgrade() -> None:
    for col in COLUMNS:
        op.execute(
            f"ALTER TABLE eventos ALTER COLUMN {col} "
            f"TYPE timestamp without time zone USING {col} AT TIME ZONE 'UTC'"
        )
