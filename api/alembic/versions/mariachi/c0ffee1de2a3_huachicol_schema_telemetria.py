"""huachicol: schema propio para telemetria (mover tablas de mapalab)

Revision ID: c0ffee1de2a3
Revises: c1a2b3c4d5e6
Create Date: 2026-07-21 10:00:00.000000

Crea el schema `huachicol` y mueve ahi las 12 tablas de telemetria de mapalab
(eventos, sesiones, mcp y rollups), renombrandolas sin el prefijo de app. Los
datos se preservan: ALTER TABLE ... SET SCHEMA y RENAME son metadata-only, no
reescriben filas. Las FK a public.mapalab_api_keys quedan cross-schema (validas
en Postgres). Los indices y secuencias siguen a su tabla automaticamente.
"""
from alembic import op

revision = "c0ffee1de2a3"
down_revision = "c1a2b3c4d5e6"
branch_labels = None
depends_on = None

_TABLES = {
    "mapalab_events": "events",
    "mapalab_sessions": "sessions",
    "mapalab_mcp_events": "mcp_events",
    "mapalab_rollup_buttons": "rollup_buttons",
    "mapalab_rollup_daily": "rollup_daily",
    "mapalab_rollup_eventos": "rollup_eventos",
    "mapalab_rollup_layers": "rollup_layers",
    "mapalab_rollup_themes": "rollup_themes",
    "mapalab_rollup_tools": "rollup_tools",
    "mapalab_mcp_rollup_clients": "mcp_rollup_clients",
    "mapalab_mcp_rollup_daily": "mcp_rollup_daily",
    "mapalab_mcp_rollup_tools": "mcp_rollup_tools",
}


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS huachicol")
    for old, new in _TABLES.items():
        op.execute(f"ALTER TABLE public.{old} SET SCHEMA huachicol")
        op.execute(f"ALTER TABLE huachicol.{old} RENAME TO {new}")


def downgrade() -> None:
    for old, new in _TABLES.items():
        op.execute(f"ALTER TABLE huachicol.{new} RENAME TO {old}")
        op.execute(f"ALTER TABLE huachicol.{old} SET SCHEMA public")
    op.execute("DROP SCHEMA IF EXISTS huachicol")
