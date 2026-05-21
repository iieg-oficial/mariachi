"""add basemap_id column to eventos

Revision ID: a8b9c0d1e2f7
Revises: a8b9c0d1e2f6
Create Date: 2026-05-21 10:00:00.000000

Agrega `basemap_id` (key del basemap a forzar cuando el evento abre).
Si esta NULL, el visor respeta el basemap activo del usuario. Valores
validos hoy: voyager, position, sin_mapalab. Se valida en aplicacion
para no requerir migracion al sumar/quitar basemaps en mapalab.
"""
from alembic import op
import sqlalchemy as sa


revision = "a8b9c0d1e2f7"
down_revision = "a8b9c0d1e2f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "eventos",
        sa.Column("basemap_id", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("eventos", "basemap_id")
