"""add fun_icon column to eventos

Revision ID: a8b9c0d1e2f5
Revises: a8b9c0d1e2f4
Create Date: 2026-05-21 09:35:00.000000

Agrega `fun_icon` (slug del icono ludico) al evento. Por defecto NULL,
el visor cae a 'soccer'. Valores soportados hoy: soccer, star, party,
book, bulb. Se valida en la app (no en DB) para no requerir migracion
cuando se sumen nuevos iconos.
"""
from alembic import op
import sqlalchemy as sa


revision = "a8b9c0d1e2f5"
down_revision = "a8b9c0d1e2f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "eventos",
        sa.Column("fun_icon", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("eventos", "fun_icon")
