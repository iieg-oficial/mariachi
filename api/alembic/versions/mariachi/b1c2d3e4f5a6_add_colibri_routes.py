"""add colibri_routes

Revision ID: b1c2d3e4f5a6
Revises: a2b3c4d5e6f8
Create Date: 2026-05-07 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'b1c2d3e4f5a6'
down_revision = 'a2b3c4d5e6f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'colibri_routes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('source_app_id', sa.Integer(), nullable=True),
        sa.Column('tipo_id', sa.Integer(), nullable=True),
        sa.Column('destino', sa.String(length=40), nullable=False),
        sa.Column(
            'config',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            'filtros',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['source_app_id'], ['source_apps.id']),
        sa.ForeignKeyConstraint(['tipo_id'], ['reporte_tipos.id']),
    )
    op.create_index('ix_colibri_routes_source_app_id', 'colibri_routes', ['source_app_id'])
    op.create_index('ix_colibri_routes_tipo_id', 'colibri_routes', ['tipo_id'])
    op.create_index('ix_colibri_routes_destino', 'colibri_routes', ['destino'])
    op.create_index('ix_colibri_routes_activo', 'colibri_routes', ['activo'])
    op.create_index('ix_colibri_routes_orden', 'colibri_routes', ['orden'])


def downgrade() -> None:
    op.drop_index('ix_colibri_routes_orden', table_name='colibri_routes')
    op.drop_index('ix_colibri_routes_activo', table_name='colibri_routes')
    op.drop_index('ix_colibri_routes_destino', table_name='colibri_routes')
    op.drop_index('ix_colibri_routes_tipo_id', table_name='colibri_routes')
    op.drop_index('ix_colibri_routes_source_app_id', table_name='colibri_routes')
    op.drop_table('colibri_routes')
