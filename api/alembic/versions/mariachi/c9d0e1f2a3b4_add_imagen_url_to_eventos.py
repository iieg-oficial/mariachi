"""add imagen_url to eventos (banner para sider expandido)

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-04-26 14:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


revision = 'c9d0e1f2a3b4'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('eventos', sa.Column('imagen_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('eventos', 'imagen_url')
