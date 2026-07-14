"""add_cambios_pendientes_envio_sieej

Revision ID: a0b1c2d3e4f5
Revises: f9c0d1e2f3a4
Create Date: 2026-07-13 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'a0b1c2d3e4f5'
down_revision = 'f9c0d1e2f3a4'
branch_labels = None
depends_on = None

SCHEMA = "sieej"


def upgrade() -> None:
    op.add_column(
        "envio_formulario",
        sa.Column("cambios_pendientes", postgresql.JSONB(), nullable=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("envio_formulario", "cambios_pendientes", schema=SCHEMA)
