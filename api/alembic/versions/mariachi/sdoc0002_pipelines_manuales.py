"""sieej_documentacion: pipelines agregados a mano

Revision ID: sdoc0002
Revises: mktl0001
Create Date: 2026-10-05

"""

import sqlalchemy as sa

from alembic import op

revision = "sdoc0002"
down_revision = "mktl0001"
branch_labels = None
depends_on = None

SCHEMA = "sieej_documentacion"


def upgrade() -> None:
    op.add_column(
        "pipelines",
        sa.Column("manual", sa.Boolean(), nullable=False, server_default=sa.false()),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("pipelines", "manual", schema=SCHEMA)
