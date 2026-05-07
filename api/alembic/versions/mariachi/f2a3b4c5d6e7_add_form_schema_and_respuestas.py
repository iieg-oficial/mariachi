"""add reporte_tipos.form_schema + reportes.respuestas

Revision ID: f2a3b4c5d6e7
Revises: f5b6c7d8e9f0
Create Date: 2026-05-07 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'f2a3b4c5d6e7'
down_revision = 'f5b6c7d8e9f0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'reporte_tipos',
        sa.Column(
            'form_schema',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        'reportes',
        sa.Column(
            'respuestas',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('reportes', 'respuestas')
    op.drop_column('reporte_tipos', 'form_schema')
