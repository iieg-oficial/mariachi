"""add eliminado_en (soft-delete) to sieej.envio_formulario

Revision ID: d4e5f6a7b8c0
Revises: d3e4f5a6b7c9
Create Date: 2026-05-08 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c0'
down_revision = 'd3e4f5a6b7c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'envio_formulario',
        sa.Column('eliminado_en', sa.DateTime(timezone=True), nullable=True),
        schema='sieej',
    )
    op.create_index(
        'ix_envio_formulario_eliminado_en',
        'envio_formulario',
        ['eliminado_en'],
        schema='sieej',
        postgresql_where=sa.text('eliminado_en IS NULL'),
    )


def downgrade() -> None:
    op.drop_index(
        'ix_envio_formulario_eliminado_en',
        table_name='envio_formulario',
        schema='sieej',
    )
    op.drop_column('envio_formulario', 'eliminado_en', schema='sieej')
