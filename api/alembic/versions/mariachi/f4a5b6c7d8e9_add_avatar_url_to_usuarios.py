"""add avatar_url to usuarios

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-04-28 14:30:00.000000

"""
import sqlalchemy as sa

from alembic import op

revision = 'f4a5b6c7d8e9'
down_revision = 'e3f4a5b6c7d8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('avatar_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('usuarios', 'avatar_url')
