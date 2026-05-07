"""workflow granular en reportes + reporte_actividad

Revision ID: d2e3f4a5b6c8
Revises: c1d2e3f4a5b7
Create Date: 2026-05-07 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'd2e3f4a5b6c8'
down_revision = 'c1d2e3f4a5b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('reportes', sa.Column('severidad', sa.String(length=10), nullable=True))
    op.add_column('reportes', sa.Column('prioridad', sa.String(length=4), nullable=True))
    op.add_column('reportes', sa.Column('duplicado_de', sa.Integer(), nullable=True))
    op.add_column('reportes', sa.Column('bloqueado_por', sa.Text(), nullable=True))
    op.add_column('reportes', sa.Column('sla_at', sa.DateTime(), nullable=True))

    op.create_index('ix_reportes_severidad', 'reportes', ['severidad'])
    op.create_index('ix_reportes_prioridad', 'reportes', ['prioridad'])
    op.create_index('ix_reportes_duplicado_de', 'reportes', ['duplicado_de'])
    op.create_foreign_key(
        'fk_reportes_duplicado_de_reportes',
        'reportes',
        'reportes',
        ['duplicado_de'],
        ['id'],
    )

    op.create_table(
        'reporte_actividad',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reporte_id', sa.Integer(), nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('accion', sa.String(length=50), nullable=False),
        sa.Column(
            'detalle',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column('nota', sa.Text(), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['reporte_id'], ['reportes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_id'], ['usuarios.id']),
    )
    op.create_index('ix_reporte_actividad_reporte_id', 'reporte_actividad', ['reporte_id'])
    op.create_index('ix_reporte_actividad_accion', 'reporte_actividad', ['accion'])
    op.create_index('ix_reporte_actividad_creado_en', 'reporte_actividad', ['creado_en'])


def downgrade() -> None:
    op.drop_index('ix_reporte_actividad_creado_en', table_name='reporte_actividad')
    op.drop_index('ix_reporte_actividad_accion', table_name='reporte_actividad')
    op.drop_index('ix_reporte_actividad_reporte_id', table_name='reporte_actividad')
    op.drop_table('reporte_actividad')

    op.drop_constraint('fk_reportes_duplicado_de_reportes', 'reportes', type_='foreignkey')
    op.drop_index('ix_reportes_duplicado_de', table_name='reportes')
    op.drop_index('ix_reportes_prioridad', table_name='reportes')
    op.drop_index('ix_reportes_severidad', table_name='reportes')
    op.drop_column('reportes', 'sla_at')
    op.drop_column('reportes', 'bloqueado_por')
    op.drop_column('reportes', 'duplicado_de')
    op.drop_column('reportes', 'prioridad')
    op.drop_column('reportes', 'severidad')
