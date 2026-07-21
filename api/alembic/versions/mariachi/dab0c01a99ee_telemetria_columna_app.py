"""telemetria: columna discriminadora `app` (multi-plataforma)

Revision ID: dab0c01a99ee
Revises: c0ffee1de2a3
Create Date: 2026-07-21 11:00:00.000000

Agrega la dimension de plataforma `app` a la telemetria del schema `huachicol`,
para poder distinguir mapalab de futuras plataformas en las MISMAS tablas
(patron discriminador, estandar de product analytics). `source` queda como
sub-canal dentro de cada app (visor, mcp, ...). Todo lo existente se marca como
`app='mapalab'` (backfill via DEFAULT). `app` entra al grano (PK) de cada rollup.
Aditivo: no se pierde ni reescribe informacion.
"""
from alembic import op

revision = "dab0c01a99ee"
down_revision = "c0ffee1de2a3"
branch_labels = None
depends_on = None

_BASE_TABLES = ("events", "sessions", "mcp_events")

# rollup -> (nombre PK actual, columnas del grano nuevo con app)
_ROLLUPS = {
    "rollup_daily": ("mapalab_rollup_daily_pkey", "dia, app, source"),
    "rollup_layers": ("mapalab_rollup_layers_pkey", "dia, app, layer_id"),
    "rollup_buttons": ("mapalab_rollup_buttons_pkey", "dia, app, event_name"),
    "rollup_tools": ("mapalab_rollup_tools_pkey", "dia, app, event_name, tool"),
    "rollup_eventos": ("mapalab_rollup_eventos_pkey", "dia, app, evento_id"),
    "rollup_themes": ("mapalab_rollup_themes_pkey", "dia, app, theme_id"),
    "mcp_rollup_daily": ("mapalab_mcp_rollup_daily_pkey", "dia, app"),
    "mcp_rollup_tools": ("mapalab_mcp_rollup_tools_pkey", "dia, app, tool"),
    "mcp_rollup_clients": (
        "mapalab_mcp_rollup_clients_pkey",
        "dia, app, client_name, client_version",
    ),
}

# grano original (para el downgrade)
_ROLLUPS_OLD_PK = {
    "rollup_daily": "dia, source",
    "rollup_layers": "dia, layer_id",
    "rollup_buttons": "dia, event_name",
    "rollup_tools": "dia, event_name, tool",
    "rollup_eventos": "dia, evento_id",
    "rollup_themes": "dia, theme_id",
    "mcp_rollup_daily": "dia",
    "mcp_rollup_tools": "dia, tool",
    "mcp_rollup_clients": "dia, client_name, client_version",
}


def upgrade() -> None:
    for table in _BASE_TABLES:
        op.execute(
            f"ALTER TABLE huachicol.{table} ADD COLUMN app text NOT NULL DEFAULT 'mapalab'"
        )
    op.execute("CREATE INDEX ix_events_app_ts ON huachicol.events (app, ts DESC)")

    for table, (old_pk, new_grain) in _ROLLUPS.items():
        op.execute(
            f"ALTER TABLE huachicol.{table} ADD COLUMN app text NOT NULL DEFAULT 'mapalab'"
        )
        op.execute(f"ALTER TABLE huachicol.{table} DROP CONSTRAINT {old_pk}")
        op.execute(f"ALTER TABLE huachicol.{table} ADD PRIMARY KEY ({new_grain})")


def downgrade() -> None:
    for table, old_grain in _ROLLUPS_OLD_PK.items():
        op.execute(f"ALTER TABLE huachicol.{table} DROP CONSTRAINT {table}_pkey")
        op.execute(f"ALTER TABLE huachicol.{table} ADD PRIMARY KEY ({old_grain})")
        op.execute(f"ALTER TABLE huachicol.{table} DROP COLUMN app")

    op.execute("DROP INDEX IF EXISTS huachicol.ix_events_app_ts")
    for table in _BASE_TABLES:
        op.execute(f"ALTER TABLE huachicol.{table} DROP COLUMN app")
