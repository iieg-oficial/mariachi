"""source_apps: agregar disable_pii, privacy_url, scrubbers

Revision ID: a1b2c3d4e5f7
Revises: f2a3b4c5d6e7
Create Date: 2026-05-07 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'a1b2c3d4e5f7'
down_revision = 'f2a3b4c5d6e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'source_apps',
        sa.Column('disable_pii', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'source_apps',
        sa.Column('privacy_url', sa.String(length=500), nullable=True),
    )
    op.add_column(
        'source_apps',
        sa.Column(
            'scrubbers',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('source_apps', 'scrubbers')
    op.drop_column('source_apps', 'privacy_url')
    op.drop_column('source_apps', 'disable_pii')
