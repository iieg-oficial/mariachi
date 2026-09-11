"""eventos lite: modo, animacion, estilo del boton y aviso inicial

Revision ID: 3v3ntl1t30001
Revises: c1f2e3d4a5b6
Create Date: 2026-09-10 18:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "3v3ntl1t30001"
down_revision = "c1f2e3d4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("eventos", sa.Column("modo", sa.String(length=20), nullable=False, server_default="completo"))
    op.add_column("eventos", sa.Column("animacion", sa.String(length=30), nullable=False, server_default="pelota"))
    op.add_column("eventos", sa.Column("boton_estilo", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("eventos", sa.Column("aviso_inicial", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("eventos", "aviso_inicial")
    op.drop_column("eventos", "boton_estilo")
    op.drop_column("eventos", "animacion")
    op.drop_column("eventos", "modo")
