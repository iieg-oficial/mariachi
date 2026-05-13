"""add mapalab_api_keys_accesos (auditoría detallada)

Revision ID: a7b8c9d0e1f2
Revises: d3e4f5a6b7ca
Create Date: 2026-05-13 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'a9b0c1d2e3f4'
down_revision = 'd3e4f5a6b7ca'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mapalab_api_keys_accesos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('dia', sa.Date(), nullable=False),
        sa.Column('endpoint', sa.String(length=20), nullable=False),
        sa.Column('resultado', sa.String(length=20), nullable=False),
        sa.Column('motivo', sa.String(length=120), nullable=True),
        sa.Column('origin', sa.String(length=255), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column(
            'layers',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column('request_id', sa.String(length=40), nullable=True),
        sa.Column('clasificacion', sa.String(length=20), nullable=True),
        sa.Column('sla_estado', sa.String(length=20), nullable=True),
        sa.Column('linaje_ref', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(
            ['api_key_id'],
            ['mapalab_api_keys.id'],
            name='fk_mapalab_api_keys_accesos_key',
            ondelete='CASCADE',
        ),
    )
    op.create_index('ix_mapalab_api_keys_accesos_timestamp', 'mapalab_api_keys_accesos', ['timestamp'])
    op.create_index('ix_mapalab_api_keys_accesos_resultado', 'mapalab_api_keys_accesos', ['resultado'])
    op.create_index('ix_mapalab_api_keys_accesos_key_ts', 'mapalab_api_keys_accesos', ['api_key_id', 'timestamp'])
    op.create_index('ix_mapalab_api_keys_accesos_dia', 'mapalab_api_keys_accesos', ['dia'])
    op.create_index('ix_mapalab_api_keys_accesos_origin', 'mapalab_api_keys_accesos', ['origin'])


def downgrade() -> None:
    op.drop_index('ix_mapalab_api_keys_accesos_origin', table_name='mapalab_api_keys_accesos')
    op.drop_index('ix_mapalab_api_keys_accesos_dia', table_name='mapalab_api_keys_accesos')
    op.drop_index('ix_mapalab_api_keys_accesos_key_ts', table_name='mapalab_api_keys_accesos')
    op.drop_index('ix_mapalab_api_keys_accesos_resultado', table_name='mapalab_api_keys_accesos')
    op.drop_index('ix_mapalab_api_keys_accesos_timestamp', table_name='mapalab_api_keys_accesos')
    op.drop_table('mapalab_api_keys_accesos')
