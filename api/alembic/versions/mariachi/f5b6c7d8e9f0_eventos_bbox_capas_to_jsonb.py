"""eventos.bbox y capas: JSON -> JSONB

Revision ID: f5b6c7d8e9f0
Revises: f3a4b5c6d7e8
Create Date: 2026-05-07 11:00:00.000000

"""
from alembic import op


revision = 'f5b6c7d8e9f0'
down_revision = 'f3a4b5c6d7e8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE eventos ALTER COLUMN bbox TYPE jsonb USING bbox::jsonb")
    op.execute("ALTER TABLE eventos ALTER COLUMN capas TYPE jsonb USING capas::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE eventos ALTER COLUMN capas TYPE json USING capas::json")
    op.execute("ALTER TABLE eventos ALTER COLUMN bbox TYPE json USING bbox::json")
