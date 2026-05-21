"""add mapalab_mcp_stats_* materialized views

Revision ID: c0d1e2f3a4b6
Revises: b9c0d1e2f3a5
Create Date: 2026-05-21 14:00:00.000000

"""
from alembic import op


revision = 'c0d1e2f3a4b6'
down_revision = 'b9c0d1e2f3a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_overview AS
    SELECT
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days') AS calls_30d,
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '7 days') AS calls_7d,
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '1 day') AS calls_1d,
        (SELECT COUNT(*) FROM mapalab_mcp_events
            WHERE timestamp >= NOW() - INTERVAL '30 days'
              AND status = 'error') AS errors_30d,
        (SELECT COUNT(DISTINCT session_hash) FROM mapalab_mcp_events
            WHERE timestamp >= NOW() - INTERVAL '30 days'
              AND session_hash IS NOT NULL) AS sessions_30d,
        (SELECT COUNT(DISTINCT client_name) FROM mapalab_mcp_events
            WHERE timestamp >= NOW() - INTERVAL '30 days'
              AND client_name IS NOT NULL) AS clients_30d,
        (SELECT COALESCE(AVG(duration_ms)::int, 0) FROM mapalab_mcp_events
            WHERE timestamp >= NOW() - INTERVAL '30 days'
              AND method = 'tools/call'
              AND duration_ms IS NOT NULL) AS avg_tool_duration_ms,
        (SELECT COUNT(*) FROM mapalab_mcp_events
            WHERE timestamp >= NOW() - INTERVAL '30 days'
              AND method = 'tools/call') AS tool_calls_30d
    WITH NO DATA;
    """)

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_tools AS
    SELECT
        tool,
        COUNT(*) AS uses,
        COUNT(*) FILTER (WHERE status = 'error') AS errors,
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL) AS unique_sessions,
        COALESCE(AVG(duration_ms)::int, 0) AS avg_duration_ms,
        COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::int, 0) AS p95_duration_ms,
        MAX(timestamp) AS last_seen
    FROM mapalab_mcp_events
    WHERE tool IS NOT NULL
      AND timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY tool
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_mcp_stats_tools_tool ON mapalab_mcp_stats_tools (tool);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_daily AS
    SELECT
        dia,
        COUNT(*) AS calls,
        COUNT(*) FILTER (WHERE method = 'tools/call') AS tool_calls,
        COUNT(*) FILTER (WHERE status = 'error') AS errors,
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL) AS unique_sessions,
        COALESCE(AVG(duration_ms)::int, 0) AS avg_duration_ms
    FROM mapalab_mcp_events
    WHERE dia >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY dia
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_mcp_stats_daily_dia ON mapalab_mcp_stats_daily (dia);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_clients AS
    SELECT
        COALESCE(client_name, 'unknown') AS client_name,
        COALESCE(client_version, '') AS client_version,
        COUNT(*) AS calls,
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL) AS unique_sessions,
        MAX(timestamp) AS last_seen
    FROM mapalab_mcp_events
    WHERE timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY COALESCE(client_name, 'unknown'), COALESCE(client_version, '')
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_mcp_stats_clients_name_v ON mapalab_mcp_stats_clients (client_name, client_version);")

    op.execute("REFRESH MATERIALIZED VIEW mapalab_mcp_stats_overview;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_mcp_stats_tools;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_mcp_stats_daily;")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_mcp_stats_clients;")


def downgrade() -> None:
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_mcp_stats_clients;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_mcp_stats_daily;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_mcp_stats_tools;')
    op.execute('DROP MATERIALIZED VIEW IF EXISTS mapalab_mcp_stats_overview;')
