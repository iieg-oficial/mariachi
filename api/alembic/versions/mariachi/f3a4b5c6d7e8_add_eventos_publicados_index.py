"""add partial index para eventos publicados visibles

Revision ID: f3a4b5c6d7e8
Revises: e1f2a3b4c5d6
Create Date: 2026-05-07 10:00:00.000000

"""
from alembic import op

revision = 'f3a4b5c6d7e8'
down_revision = 'e1f2a3b4c5d6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_eventos_publicados_visibles "
        "ON eventos (orden ASC, id ASC) "
        "WHERE estado = 'published' AND activo = true"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_eventos_publicados_visibles")
