"""add mapalab_events + mapalab_sessions

Revision ID: c9d8e7f6a5b4
Revises: a9b0c1d2e3f4
Create Date: 2026-05-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'c9d8e7f6a5b4'
down_revision = 'a9b0c1d2e3f4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mapalab_events',
        sa.Column('id', sa.BigInteger(), primary_key=True),
        sa.Column('ts', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('event_name', sa.String(length=50), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='visor'),
        sa.Column('api_key_id', sa.Integer(), nullable=True),
        sa.Column('layer_id', sa.String(length=120), nullable=True),
        sa.Column('props', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('ua_family', sa.String(length=40), nullable=True),
        sa.Column('referrer', sa.String(length=500), nullable=True),
        sa.Column('pathname', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(
            ['api_key_id'],
            ['mapalab_api_keys.id'],
            name='fk_mapalab_events_api_key',
            ondelete='SET NULL',
        ),
    )
    op.create_index('ix_mapalab_events_ts', 'mapalab_events', [sa.text('ts DESC')])
    op.create_index('ix_mapalab_events_name_ts', 'mapalab_events', ['event_name', sa.text('ts DESC')])
    op.create_index('ix_mapalab_events_session', 'mapalab_events', ['session_id'])
    op.create_index(
        'ix_mapalab_events_layer',
        'mapalab_events',
        ['layer_id'],
        postgresql_where=sa.text('layer_id IS NOT NULL'),
    )
    op.create_index('ix_mapalab_events_source', 'mapalab_events', ['source'])
    op.create_index(
        'ix_mapalab_events_props_gin',
        'mapalab_events',
        ['props'],
        postgresql_using='gin',
    )

    op.create_table(
        'mapalab_sessions',
        sa.Column('session_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='visor'),
        sa.Column('api_key_id', sa.Integer(), nullable=True),
        sa.Column('events_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duration_sec', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('layers_activated', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('used_swipe', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('used_drawing', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('used_measurement', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('downloaded', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('shared', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('reported', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('ua_family', sa.String(length=40), nullable=True),
        sa.Column('referrer', sa.String(length=500), nullable=True),
        sa.Column('entry_pathname', sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(
            ['api_key_id'],
            ['mapalab_api_keys.id'],
            name='fk_mapalab_sessions_api_key',
            ondelete='SET NULL',
        ),
    )
    op.create_index('ix_mapalab_sessions_started_at', 'mapalab_sessions', [sa.text('started_at DESC')])
    op.create_index('ix_mapalab_sessions_source', 'mapalab_sessions', ['source'])
    op.create_index('ix_mapalab_sessions_last_seen', 'mapalab_sessions', [sa.text('last_seen_at DESC')])

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_layers AS
    SELECT
        layer_id,
        COUNT(*) FILTER (WHERE event_name = 'layer_toggle' AND (props->>'action') = 'activar') AS activations,
        COUNT(*) FILTER (WHERE event_name = 'layer_download') AS downloads,
        COUNT(*) FILTER (WHERE event_name = 'feature_click') AS feature_clicks,
        COUNT(*) FILTER (WHERE event_name = 'layer_detail_open') AS detail_opens,
        COUNT(*) FILTER (WHERE event_name = 'opacity_change') AS opacity_changes,
        COUNT(DISTINCT session_id) AS unique_sessions,
        MAX(ts) AS last_seen
    FROM mapalab_events
    WHERE layer_id IS NOT NULL
      AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY layer_id
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_layers_layer_id ON mapalab_stats_layers (layer_id);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_buttons AS
    SELECT
        event_name,
        COUNT(*) AS clicks,
        COUNT(DISTINCT session_id) AS unique_sessions
    FROM mapalab_events
    WHERE event_name IN (
        'sider_lock','logo_click','contribute_click','share_map','info_open',
        'report_submitted','layer_download','opacity_change','legends_toggle',
        'infobox_action','home_action','theme_change','layer_reorder','basemap_change',
        'geolocate','map_export','periodicity_advanced'
    )
      AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY event_name
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_buttons_event ON mapalab_stats_buttons (event_name);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_tools AS
    SELECT
        event_name,
        COALESCE(props->>'tool', 'unknown') AS tool,
        COUNT(*) AS uses,
        COUNT(DISTINCT session_id) AS unique_sessions
    FROM mapalab_events
    WHERE event_name IN ('drawing_tool_use','measurement_tool_use')
      AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY event_name, COALESCE(props->>'tool', 'unknown')
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_tools_event_tool ON mapalab_stats_tools (event_name, tool);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_daily AS
    SELECT
        DATE(started_at) AS dia,
        source,
        COUNT(*) AS sessions,
        SUM(events_count) AS events,
        SUM(CASE WHEN used_swipe THEN 1 ELSE 0 END) AS sessions_swipe,
        SUM(CASE WHEN used_drawing THEN 1 ELSE 0 END) AS sessions_drawing,
        SUM(CASE WHEN used_measurement THEN 1 ELSE 0 END) AS sessions_measurement,
        SUM(CASE WHEN downloaded THEN 1 ELSE 0 END) AS sessions_downloaded,
        SUM(CASE WHEN shared THEN 1 ELSE 0 END) AS sessions_shared,
        SUM(CASE WHEN reported THEN 1 ELSE 0 END) AS sessions_reported,
        AVG(duration_sec)::int AS avg_duration_sec
    FROM mapalab_sessions
    WHERE started_at >= NOW() - INTERVAL '90 days'
    GROUP BY DATE(started_at), source
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_daily_dia_source ON mapalab_stats_daily (dia, source);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_overview AS
    SELECT
        (SELECT COUNT(*) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '30 days') AS sessions_30d,
        (SELECT COUNT(*) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '7 days') AS sessions_7d,
        (SELECT COUNT(*) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '1 day') AS sessions_1d,
        (SELECT COUNT(*) FROM mapalab_events WHERE ts >= NOW() - INTERVAL '30 days') AS events_30d,
        (SELECT COALESCE(AVG(duration_sec)::int, 0) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '30 days') AS avg_duration_sec,
        (SELECT COUNT(*) FILTER (WHERE used_swipe) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '30 days') AS swipe_sessions_30d,
        (SELECT COUNT(*) FILTER (WHERE used_drawing) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '30 days') AS drawing_sessions_30d,
        (SELECT COUNT(*) FILTER (WHERE downloaded) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '30 days') AS download_sessions_30d,
        (SELECT COUNT(*) FILTER (WHERE shared) FROM mapalab_sessions WHERE started_at >= NOW() - INTERVAL '30 days') AS share_sessions_30d
    WITH NO DATA;
    """)

    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_overview;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_layers;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_buttons;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_tools;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_daily;")


def downgrade() -> None:
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_overview;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_daily;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_tools;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_buttons;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_layers;')

    op.drop_index('ix_mapalab_sessions_last_seen', table_name='mapalab_sessions')
    op.drop_index('ix_mapalab_sessions_source', table_name='mapalab_sessions')
    op.drop_index('ix_mapalab_sessions_started_at', table_name='mapalab_sessions')
    op.drop_table('mapalab_sessions')

    op.drop_index('ix_mapalab_events_props_gin', table_name='mapalab_events')
    op.drop_index('ix_mapalab_events_source', table_name='mapalab_events')
    op.drop_index('ix_mapalab_events_layer', table_name='mapalab_events')
    op.drop_index('ix_mapalab_events_session', table_name='mapalab_events')
    op.drop_index('ix_mapalab_events_name_ts', table_name='mapalab_events')
    op.drop_index('ix_mapalab_events_ts', table_name='mapalab_events')
    op.drop_table('mapalab_events')
