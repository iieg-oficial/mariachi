"""add minerva_sub to usuarios

Revision ID: m1nerva0001
Revises: 1dent1dad0002
Create Date: 2026-08-10

"""
import sqlalchemy as sa

from alembic import op

revision = 'm1nerva0001'
down_revision = '1dent1dad0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('minerva_sub', sa.String(length=255), nullable=True))
    op.create_index('ix_usuarios_minerva_sub', 'usuarios', ['minerva_sub'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_usuarios_minerva_sub', table_name='usuarios')
    op.drop_column('usuarios', 'minerva_sub')
