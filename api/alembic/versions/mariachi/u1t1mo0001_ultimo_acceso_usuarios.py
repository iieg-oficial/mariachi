"""add ultimo_acceso to usuarios

Revision ID: u1t1mo0001
Revises: s1eej0001
Create Date: 2026-08-21

"""
import sqlalchemy as sa

from alembic import op

revision = 'u1t1mo0001'
down_revision = 's1eej0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'usuarios',
        sa.Column('ultimo_acceso', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('usuarios', 'ultimo_acceso')
