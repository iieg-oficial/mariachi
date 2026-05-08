"""add password_changed_at to usuarios

Revision ID: d3e4f5a6b7c9
Revises: d2e3f4a5b6c8
Create Date: 2026-05-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd3e4f5a6b7c9'
down_revision = 'd2e3f4a5b6c8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'usuarios',
        sa.Column(
            'password_changed_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.execute("UPDATE usuarios SET password_changed_at = created_at WHERE password_changed_at IS NULL")
    op.alter_column('usuarios', 'password_changed_at', nullable=False)


def downgrade() -> None:
    op.drop_column('usuarios', 'password_changed_at')
