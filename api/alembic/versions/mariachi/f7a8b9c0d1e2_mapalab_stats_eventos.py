"""mapalab_stats_eventos + excluir auto-activaciones de evento en stats_layers

Revision ID: f7a8b9c0d1e2
Revises: d5e6f7a8b9ca
Create Date: 2026-06-03 20:00:00.000000

"""
from alembic import op


revision = 'f7a8b9c0d1e2'
down_revision = 'd5e6f7a8b9ca'
branch_labels = None
depends_on = None


_LAYERS_VIEW_WITH_EXCLUSION = """
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
WHERE layer_id IS NOT NULL
  AND ts >= NOW() - INTERVAL '30 days'
GROUP BY layer_id
WITH NO DATA;
"""

_LAYERS_VIEW_ORIGINAL = """
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
"""

_EVENTOS_VIEW = """
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
GROUP BY (props->>'evento_id')
WITH NO DATA;
"""


def upgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_layers;")
    op.execute(_LAYERS_VIEW_WITH_EXCLUSION)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_layers_layer_id ON mapalab_stats_layers (layer_id);")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_layers;")

    op.execute(_EVENTOS_VIEW)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_eventos_evento_id ON mapalab_stats_eventos (evento_id);")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_eventos;")


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_eventos;")

    op.execute("DROP MATERIALIZED VIEW IF EXISTS mapalab_stats_layers;")
    op.execute(_LAYERS_VIEW_ORIGINAL)
    op.execute("CREATE UNIQUE INDEX ix_mapalab_stats_layers_layer_id ON mapalab_stats_layers (layer_id);")
    op.execute("REFRESH MATERIALIZED VIEW mapalab_stats_layers;")
