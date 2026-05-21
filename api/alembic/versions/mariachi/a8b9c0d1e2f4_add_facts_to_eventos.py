"""add facts JSONB column to eventos

Revision ID: a8b9c0d1e2f4
Revises: e9f0a1b2c3d4
Create Date: 2026-05-21 09:30:00.000000

Agrega `facts` (array de strings) al evento del visor de Mapalab.
Cada evento puede listar datos curiosos para mostrar como toast cuando
el usuario presiona el boton ludico del submenu del evento.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "a8b9c0d1e2f4"
down_revision = "e9f0a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "eventos",
        sa.Column(
            "facts",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("eventos", "facts")
