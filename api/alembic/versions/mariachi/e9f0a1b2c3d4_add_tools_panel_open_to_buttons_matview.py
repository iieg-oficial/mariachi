"""add tools_panel_open to mapalab_stats_buttons matview

Revision ID: e9f0a1b2c3d4
Revises: d8e7f6a5b4c3
Create Date: 2026-05-18

Regenera la matview mapalab_stats_buttons para incluir el evento
tools_panel_open (apertura del panel de mediciones desde el sider).
Sin esto el evento llega a mapalab_events pero no aparece en el
dashboard de "Uso de botones".
"""
from alembic import op


revision = "e9f0a1b2c3d4"
down_revision = "d8e7f6a5b4c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_buttons;")
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
        'geolocate','map_export','periodicity_advanced','tools_panel_open'
    )
      AND ts >= NOW() - INTERVAL '30 days'
    GROUP BY event_name
    WITH NO DATA;
    """)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_buttons_event ON mapalab_stats_buttons (event_name);")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_buttons;")


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_buttons;")
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
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_buttons;")
