"""add_estado_borrador

Revision ID: b5c6d7e8f9a0
Revises: f3a8b2c1d9e7
Create Date: 2026-02-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b5c6d7e8f9a0'
down_revision = 'f3a8b2c1d9e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('borradores', sa.Column('estado', sa.String(), nullable=False, server_default='en_progreso'))
    op.add_column('borradores', sa.Column('comentario_rechazo', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('borradores', 'comentario_rechazo')
    op.drop_column('borradores', 'estado')
