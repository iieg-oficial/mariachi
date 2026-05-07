"""add reporte_grupos + reportes.grupo_id

Revision ID: c1d2e3f4a5b7
Revises: b1c2d3e4f5a6
Create Date: 2026-05-07 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c1d2e3f4a5b7'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'reporte_grupos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('fingerprint', sa.String(length=64), nullable=False),
        sa.Column('primer_reporte_id', sa.Integer(), nullable=True),
        sa.Column('ultimo_reporte_id', sa.Integer(), nullable=True),
        sa.Column('count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('primer_visto', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('ultimo_visto', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_reporte_grupos_fingerprint', 'reporte_grupos', ['fingerprint'], unique=True)
    op.create_index('ix_reporte_grupos_count', 'reporte_grupos', ['count'])

    op.add_column('reportes', sa.Column('grupo_id', sa.Integer(), nullable=True))
    op.create_index('ix_reportes_grupo_id', 'reportes', ['grupo_id'])
    op.create_foreign_key(
        'fk_reportes_grupo_id_reporte_grupos',
        'reportes',
        'reporte_grupos',
        ['grupo_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_reportes_grupo_id_reporte_grupos', 'reportes', type_='foreignkey')
    op.drop_index('ix_reportes_grupo_id', table_name='reportes')
    op.drop_column('reportes', 'grupo_id')

    op.drop_index('ix_reporte_grupos_count', table_name='reporte_grupos')
    op.drop_index('ix_reporte_grupos_fingerprint', table_name='reporte_grupos')
    op.drop_table('reporte_grupos')
