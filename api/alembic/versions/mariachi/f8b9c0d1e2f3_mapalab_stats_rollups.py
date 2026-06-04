"""mapalab stats: rollups diarios persistentes (historial permanente)

Revision ID: f8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-06-04 12:00:00.000000

Reemplaza las vistas materializadas de ventana fija (30d/7d/1d/90d) por
tablas de rollup diario PERSISTENTES que nunca se purgan. Esto permite
consultar cualquier rango histórico con granularidad día/mes/año sin
depender de los eventos crudos (que sí se purgan por retención).

El job `rollup_stats` recomputa los últimos días en cada corrida; el
backfill inicial agrega todo lo que exista hoy en las tablas crudas.

unique_sessions y similares son aproximaciones al agregar varios días
(una sesión a caballo entre dos días se cuenta en ambos), aceptable para
analítica pre-agregada anónima.
"""
from alembic import op


revision = "f8b9c0d1e2f3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


_VISOR_BUTTON_NAMES = (
    "'sider_lock','logo_click','contribute_click','share_map','info_open',"
    "'report_submitted','layer_download','opacity_change','legends_toggle',"
    "'infobox_action','home_action','theme_change','layer_reorder','basemap_change',"
    "'geolocate','map_export','periodicity_advanced'"
)

_DROP_VIEWS = (
    "mapalab_stats_overview",
    "mapalab_stats_layers",
    "mapalab_stats_buttons",
    "mapalab_stats_tools",
    "mapalab_stats_daily",
    "mapalab_stats_eventos",
    "mapalab_mcp_stats_overview",
    "mapalab_mcp_stats_tools",
    "mapalab_mcp_stats_daily",
    "mapalab_mcp_stats_clients",
)


def upgrade() -> None:
    # ---- tablas de rollup (visor) ----
    op.execute("""
    CREATE TABLE mapalab_rollup_daily (
        dia date NOT NULL,
        source text NOT NULL,
        sessions integer NOT NULL DEFAULT 0,
        events bigint NOT NULL DEFAULT 0,
        dur_sum bigint NOT NULL DEFAULT 0,
        swipe integer NOT NULL DEFAULT 0,
        drawing integer NOT NULL DEFAULT 0,
        measurement integer NOT NULL DEFAULT 0,
        downloaded integer NOT NULL DEFAULT 0,
        shared integer NOT NULL DEFAULT 0,
        reported integer NOT NULL DEFAULT 0,
        PRIMARY KEY (dia, source)
    );
    """)

    op.execute("""
    CREATE TABLE mapalab_rollup_layers (
        dia date NOT NULL,
        layer_id text NOT NULL,
        activations integer NOT NULL DEFAULT 0,
        downloads integer NOT NULL DEFAULT 0,
        feature_clicks integer NOT NULL DEFAULT 0,
        detail_opens integer NOT NULL DEFAULT 0,
        opacity_changes integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        last_seen timestamptz,
        PRIMARY KEY (dia, layer_id)
    );
    """)

    op.execute("""
    CREATE TABLE mapalab_rollup_buttons (
        dia date NOT NULL,
        event_name text NOT NULL,
        clicks integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        PRIMARY KEY (dia, event_name)
    );
    """)

    op.execute("""
    CREATE TABLE mapalab_rollup_tools (
        dia date NOT NULL,
        event_name text NOT NULL,
        tool text NOT NULL,
        uses integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        PRIMARY KEY (dia, event_name, tool)
    );
    """)

    op.execute("""
    CREATE TABLE mapalab_rollup_eventos (
        dia date NOT NULL,
        evento_id text NOT NULL,
        titulo text,
        opens integer NOT NULL DEFAULT 0,
        closes integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        last_seen timestamptz,
        PRIMARY KEY (dia, evento_id)
    );
    """)

    # ---- tablas de rollup (MCP) ----
    op.execute("""
    CREATE TABLE mapalab_mcp_rollup_daily (
        dia date NOT NULL,
        calls integer NOT NULL DEFAULT 0,
        tool_calls integer NOT NULL DEFAULT 0,
        errors integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        dur_sum bigint NOT NULL DEFAULT 0,
        dur_count integer NOT NULL DEFAULT 0,
        tool_dur_sum bigint NOT NULL DEFAULT 0,
        tool_dur_count integer NOT NULL DEFAULT 0,
        PRIMARY KEY (dia)
    );
    """)

    op.execute("""
    CREATE TABLE mapalab_mcp_rollup_tools (
        dia date NOT NULL,
        tool text NOT NULL,
        uses integer NOT NULL DEFAULT 0,
        errors integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        dur_sum bigint NOT NULL DEFAULT 0,
        dur_count integer NOT NULL DEFAULT 0,
        last_seen timestamptz,
        PRIMARY KEY (dia, tool)
    );
    """)

    op.execute("""
    CREATE TABLE mapalab_mcp_rollup_clients (
        dia date NOT NULL,
        client_name text NOT NULL,
        client_version text NOT NULL DEFAULT '',
        calls integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        last_seen timestamptz,
        PRIMARY KEY (dia, client_name, client_version)
    );
    """)

    # ---- backfill desde crudos (todo lo disponible) ----
    op.execute("""
    INSERT INTO mapalab_rollup_daily
        (dia, source, sessions, events, dur_sum, swipe, drawing, measurement,
         downloaded, shared, reported)
    SELECT
        DATE(started_at), source,
        COUNT(*),
        COALESCE(SUM(events_count), 0),
        COALESCE(SUM(duration_sec), 0),
        SUM(CASE WHEN used_swipe THEN 1 ELSE 0 END),
        SUM(CASE WHEN used_drawing THEN 1 ELSE 0 END),
        SUM(CASE WHEN used_measurement THEN 1 ELSE 0 END),
        SUM(CASE WHEN downloaded THEN 1 ELSE 0 END),
        SUM(CASE WHEN shared THEN 1 ELSE 0 END),
        SUM(CASE WHEN reported THEN 1 ELSE 0 END)
    FROM mapalab_sessions
    GROUP BY DATE(started_at), source;
    """)

    op.execute("""
    INSERT INTO mapalab_rollup_layers
        (dia, layer_id, activations, downloads, feature_clicks, detail_opens,
         opacity_changes, unique_sessions, last_seen)
    SELECT
        DATE(ts), layer_id,
        COUNT(*) FILTER (
            WHERE event_name = 'layer_toggle'
              AND (props->>'action') = 'activar'
              AND (props->>'source') IS DISTINCT FROM 'evento_open'
        ),
        COUNT(*) FILTER (WHERE event_name = 'layer_download'),
        COUNT(*) FILTER (WHERE event_name = 'feature_click'),
        COUNT(*) FILTER (WHERE event_name = 'layer_detail_open'),
        COUNT(*) FILTER (WHERE event_name = 'opacity_change'),
        COUNT(DISTINCT session_id),
        MAX(ts)
    FROM mapalab_events
    WHERE layer_id IS NOT NULL
    GROUP BY DATE(ts), layer_id;
    """)

    op.execute(f"""
    INSERT INTO mapalab_rollup_buttons (dia, event_name, clicks, unique_sessions)
    SELECT DATE(ts), event_name, COUNT(*), COUNT(DISTINCT session_id)
    FROM mapalab_events
    WHERE event_name IN ({_VISOR_BUTTON_NAMES})
    GROUP BY DATE(ts), event_name;
    """)

    op.execute("""
    INSERT INTO mapalab_rollup_tools (dia, event_name, tool, uses, unique_sessions)
    SELECT DATE(ts), event_name, COALESCE(props->>'tool', 'unknown'),
           COUNT(*), COUNT(DISTINCT session_id)
    FROM mapalab_events
    WHERE event_name IN ('drawing_tool_use', 'measurement_tool_use')
    GROUP BY DATE(ts), event_name, COALESCE(props->>'tool', 'unknown');
    """)

    op.execute("""
    INSERT INTO mapalab_rollup_eventos
        (dia, evento_id, titulo, opens, closes, unique_sessions, last_seen)
    SELECT
        DATE(ts), (props->>'evento_id'), MAX(props->>'titulo'),
        COUNT(*) FILTER (WHERE event_name = 'evento_open'),
        COUNT(*) FILTER (WHERE event_name = 'evento_close'),
        COUNT(DISTINCT session_id), MAX(ts)
    FROM mapalab_events
    WHERE event_name IN ('evento_open', 'evento_close')
      AND (props->>'evento_id') IS NOT NULL
    GROUP BY DATE(ts), (props->>'evento_id');
    """)

    op.execute("""
    INSERT INTO mapalab_mcp_rollup_daily
        (dia, calls, tool_calls, errors, unique_sessions, dur_sum, dur_count,
         tool_dur_sum, tool_dur_count)
    SELECT
        dia,
        COUNT(*),
        COUNT(*) FILTER (WHERE method = 'tools/call'),
        COUNT(*) FILTER (WHERE status = 'error'),
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL),
        COALESCE(SUM(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0),
        COUNT(*) FILTER (WHERE duration_ms IS NOT NULL),
        COALESCE(SUM(duration_ms) FILTER (WHERE method = 'tools/call' AND duration_ms IS NOT NULL), 0),
        COUNT(*) FILTER (WHERE method = 'tools/call' AND duration_ms IS NOT NULL)
    FROM mapalab_mcp_events
    GROUP BY dia;
    """)

    op.execute("""
    INSERT INTO mapalab_mcp_rollup_tools
        (dia, tool, uses, errors, unique_sessions, dur_sum, dur_count, last_seen)
    SELECT
        dia, tool,
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'error'),
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL),
        COALESCE(SUM(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0),
        COUNT(*) FILTER (WHERE duration_ms IS NOT NULL),
        MAX(timestamp)
    FROM mapalab_mcp_events
    WHERE tool IS NOT NULL
    GROUP BY dia, tool;
    """)

    op.execute("""
    INSERT INTO mapalab_mcp_rollup_clients
        (dia, client_name, client_version, calls, unique_sessions, last_seen)
    SELECT
        dia, COALESCE(client_name, 'unknown'), COALESCE(client_version, ''),
        COUNT(*),
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL),
        MAX(timestamp)
    FROM mapalab_mcp_events
    GROUP BY dia, COALESCE(client_name, 'unknown'), COALESCE(client_version, '');
    """)

    # ---- eliminar matviews de ventana fija ----
    for view in _DROP_VIEWS:
        op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {view};")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS mapalab_mcp_rollup_clients;")
    op.execute("DROP TABLE IF EXISTS mapalab_mcp_rollup_tools;")
    op.execute("DROP TABLE IF EXISTS mapalab_mcp_rollup_daily;")
    op.execute("DROP TABLE IF EXISTS mapalab_rollup_eventos;")
    op.execute("DROP TABLE IF EXISTS mapalab_rollup_tools;")
    op.execute("DROP TABLE IF EXISTS mapalab_rollup_buttons;")
    op.execute("DROP TABLE IF EXISTS mapalab_rollup_layers;")
    op.execute("DROP TABLE IF EXISTS mapalab_rollup_daily;")

    # recrear matviews de ventana fija (estado previo)
    op.execute(f"""
    CREATE MATERIALIZED VIEW mapalab_stats_layers AS
    SELECT
        layer_id,
        COUNT(*) FILTER (
            WHERE event_name = 'layer_toggle'
              AND (props->>'action') = 'activar'
              AND (props->>'source') IS DISTINCT FROM 'evento_open'
        ) AS activations,
        COUNT(*) FILTER (WHERE event_name = 'layer_download') AS downloads,
        COUNT(*) FILTER (WHERE event_name = 'feature_click') AS feature_clicks,
        COUNT(*) FILTER (WHERE event_name = 'layer_detail_open') AS detail_opens,
        COUNT(*) FILTER (WHERE event_name = 'opacity_change') AS opacity_changes,
        COUNT(DISTINCT session_id) AS unique_sessions,
        MAX(ts) AS last_seen
    FROM mapalab_events
    WHERE layer_id IS NOT NULL AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY layer_id WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_layers_layer_id ON mapalab_stats_layers (layer_id);")

    op.execute(f"""
    CREATE MATERIALIZED VIEW mapalab_stats_buttons AS
    SELECT event_name, COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS unique_sessions
    FROM mapalab_events
    WHERE event_name IN ({_VISOR_BUTTON_NAMES}) AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY event_name WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_buttons_event ON mapalab_stats_buttons (event_name);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_tools AS
    SELECT event_name, COALESCE(props->>'tool', 'unknown') AS tool,
           COUNT(*) AS uses, COUNT(DISTINCT session_id) AS unique_sessions
    FROM mapalab_events
    WHERE event_name IN ('drawing_tool_use','measurement_tool_use') AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY event_name, COALESCE(props->>'tool', 'unknown') WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_tools_event_tool ON mapalab_stats_tools (event_name, tool);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_daily AS
    SELECT
        DATE(started_at) AS dia, source,
        COUNT(*) AS sessions, SUM(events_count) AS events,
        SUM(CASE WHEN used_swipe THEN 1 ELSE 0 END) AS sessions_swipe,
        SUM(CASE WHEN used_drawing THEN 1 ELSE 0 END) AS sessions_drawing,
        SUM(CASE WHEN used_measurement THEN 1 ELSE 0 END) AS sessions_measurement,
        SUM(CASE WHEN downloaded THEN 1 ELSE 0 END) AS sessions_downloaded,
        SUM(CASE WHEN shared THEN 1 ELSE 0 END) AS sessions_shared,
        SUM(CASE WHEN reported THEN 1 ELSE 0 END) AS sessions_reported,
        AVG(duration_sec)::int AS avg_duration_sec
    FROM mapalab_sessions
    WHERE started_at >= NOW() - INTERVAL '90 days'
    GROUP BY DATE(started_at), source WITH NO DATA;
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

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_stats_eventos AS
    SELECT
        (props->>'evento_id') AS evento_id,
        MAX(props->>'titulo') AS titulo,
        COUNT(*) FILTER (WHERE event_name = 'evento_open') AS opens,
        COUNT(*) FILTER (WHERE event_name = 'evento_close') AS closes,
        COUNT(DISTINCT session_id) AS unique_sessions,
        MAX(ts) AS last_seen
    FROM mapalab_events
    WHERE event_name IN ('evento_open', 'evento_close')
      AND (props->>'evento_id') IS NOT NULL
      AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY (props->>'evento_id') WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_eventos_evento_id ON mapalab_stats_eventos (evento_id);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_overview AS
    SELECT
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days') AS calls_30d,
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '7 days') AS calls_7d,
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '1 day') AS calls_1d,
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days' AND status = 'error') AS errors_30d,
        (SELECT COUNT(DISTINCT session_hash) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days' AND session_hash IS NOT NULL) AS sessions_30d,
        (SELECT COUNT(DISTINCT client_name) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days' AND client_name IS NOT NULL) AS clients_30d,
        (SELECT COALESCE(AVG(duration_ms)::int, 0) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days' AND method = 'tools/call' AND duration_ms IS NOT NULL) AS avg_tool_duration_ms,
        (SELECT COUNT(*) FROM mapalab_mcp_events WHERE timestamp >= NOW() - INTERVAL '30 days' AND method = 'tools/call') AS tool_calls_30d
    WITH NO DATA;
    """)

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_tools AS
    SELECT
        tool, COUNT(*) AS uses,
        COUNT(*) FILTER (WHERE status = 'error') AS errors,
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL) AS unique_sessions,
        COALESCE(AVG(duration_ms)::int, 0) AS avg_duration_ms,
        COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::int, 0) AS p95_duration_ms,
        MAX(timestamp) AS last_seen
    FROM mapalab_mcp_events
    WHERE tool IS NOT NULL AND timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY tool WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_mcp_stats_tools_tool ON mapalab_mcp_stats_tools (tool);")

    op.execute("""
    CREATE MATERIALIZED VIEW mapalab_mcp_stats_daily AS
    SELECT
        dia, COUNT(*) AS calls,
        COUNT(*) FILTER (WHERE method = 'tools/call') AS tool_calls,
        COUNT(*) FILTER (WHERE status = 'error') AS errors,
        COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL) AS unique_sessions,
        COALESCE(AVG(duration_ms)::int, 0) AS avg_duration_ms
    FROM mapalab_mcp_events
    WHERE dia >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY dia WITH NO DATA;
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
    GROUP BY COALESCE(client_name, 'unknown'), COALESCE(client_version, '') WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_mcp_stats_clients_name_v ON mapalab_mcp_stats_clients (client_name, client_version);")

    for view in (
        "mapalab_stats_overview", "mapalab_stats_layers", "mapalab_stats_buttons",
        "mapalab_stats_tools", "mapalab_stats_daily", "mapalab_stats_eventos",
        "mapalab_mcp_stats_overview", "mapalab_mcp_stats_tools",
        "mapalab_mcp_stats_daily", "mapalab_mcp_stats_clients",
    ):
        op.execute(f"REFRESH MATERIALIZED VIEW {view};")
