"""decoracion tematica de los eventos del visor

Revision ID: mu3rt0s0001
Revises: sdoc0002
Create Date: 2026-10-08 18:00:00.000000
"""
import sqlalchemy as sa

from alembic import op

revision = "mu3rt0s0001"
down_revision = "sdoc0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("eventos", sa.Column("decoracion", sa.String(length=30), nullable=False, server_default="ninguna"))


def downgrade() -> None:
    op.drop_column("eventos", "decoracion")
