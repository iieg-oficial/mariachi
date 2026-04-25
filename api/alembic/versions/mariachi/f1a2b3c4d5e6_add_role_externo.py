"""add role 'externo' to user_roles enum

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-04-25 10:00:00.000000
"""
from alembic import op


revision = 'f1a2b3c4d5e6'
down_revision = 'e7f8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_roles ADD VALUE IF NOT EXISTS 'externo'")


def downgrade() -> None:
    pass
