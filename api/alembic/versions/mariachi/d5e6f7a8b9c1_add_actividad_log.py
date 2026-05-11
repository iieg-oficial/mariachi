"""add actividad_log para US #148 (auditoria de accesos)

Revision ID: d5e6f7a8b9c1
Revises: d4e5f6a7b8c0
Create Date: 2026-05-08 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'd5e6f7a8b9c1'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'actividad_log',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('actor_role', sa.String(length=32), nullable=True),
        sa.Column('action', sa.String(length=128), nullable=False),
        sa.Column('resource_type', sa.String(length=64), nullable=True),
        sa.Column('resource_id', sa.String(length=128), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['actor_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_actividad_log_created_at', 'actividad_log', [sa.text('created_at DESC')])
    op.create_index('ix_actividad_log_actor', 'actividad_log', ['actor_id', sa.text('created_at DESC')])
    op.create_index('ix_actividad_log_action', 'actividad_log', ['action', sa.text('created_at DESC')])


def downgrade() -> None:
    op.drop_index('ix_actividad_log_action', table_name='actividad_log')
    op.drop_index('ix_actividad_log_actor', table_name='actividad_log')
    op.drop_index('ix_actividad_log_created_at', table_name='actividad_log')
    op.drop_table('actividad_log')
