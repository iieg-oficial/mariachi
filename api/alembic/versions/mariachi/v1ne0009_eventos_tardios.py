"""marcar los eventos que llegaron por conciliacion y no por el sync

Revision ID: v1ne0009
Revises: m3rg30002
"""
import sqlalchemy as sa

from alembic import op

revision = "v1ne0009"
down_revision = "m3rg30002"
branch_labels = None
depends_on = None

SCHEMA = "vine"


def upgrade() -> None:
    op.add_column(
        "eventos",
        sa.Column("tardio", sa.Boolean(), nullable=False, server_default=sa.false()),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_vine_eventos_tardio",
        "eventos",
        ["tardio"],
        schema=SCHEMA,
        postgresql_where=sa.text("tardio"),
    )


def downgrade() -> None:
    op.drop_index("ix_vine_eventos_tardio", table_name="eventos", schema=SCHEMA)
    op.drop_column("eventos", "tardio", schema=SCHEMA)
