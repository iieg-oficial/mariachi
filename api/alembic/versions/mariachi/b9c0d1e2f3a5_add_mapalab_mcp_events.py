"""add mapalab_mcp_events (telemetría MCP)

Revision ID: b9c0d1e2f3a5
Revises: a8b9c0d1e2f7
Create Date: 2026-05-21 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b9c0d1e2f3a5'
down_revision = 'a8b9c0d1e2f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mapalab_mcp_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('dia', sa.Date(), nullable=False),
        sa.Column('method', sa.String(length=40), nullable=False),
        sa.Column('tool', sa.String(length=80), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_code', sa.Integer(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('bytes_out', sa.Integer(), nullable=True),
        sa.Column('session_hash', sa.String(length=64), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('client_name', sa.String(length=80), nullable=True),
        sa.Column('client_version', sa.String(length=40), nullable=True),
    )
    op.create_index('ix_mapalab_mcp_events_ts', 'mapalab_mcp_events', ['timestamp'])
    op.create_index('ix_mapalab_mcp_events_tool_ts', 'mapalab_mcp_events', ['tool', 'timestamp'])
    op.create_index('ix_mapalab_mcp_events_dia', 'mapalab_mcp_events', ['dia'])
    op.create_index('ix_mapalab_mcp_events_method_ts', 'mapalab_mcp_events', ['method', 'timestamp'])


def downgrade() -> None:
    op.drop_index('ix_mapalab_mcp_events_method_ts', table_name='mapalab_mcp_events')
    op.drop_index('ix_mapalab_mcp_events_dia', table_name='mapalab_mcp_events')
    op.drop_index('ix_mapalab_mcp_events_tool_ts', table_name='mapalab_mcp_events')
    op.drop_index('ix_mapalab_mcp_events_ts', table_name='mapalab_mcp_events')
    op.drop_table('mapalab_mcp_events')
