"""refresh mapalab_stats materialized views

Revision ID: d8e7f6a5b4c3
Revises: c9d8e7f6a5b4
Create Date: 2026-05-13

Poblar inicialmente las mat views de mapalab_stats creadas por c9d8e7f6a5b4
con WITH NO DATA. Sin este primer REFRESH, cualquier SELECT contra ellas
lanza ObjectNotInPrerequisiteState ("has not been populated") y los
endpoints de /mapalab-stats devuelven 500.

Idempotente: REFRESH es seguro de correr aunque la vista ya tenga datos.
"""
from alembic import op


revision = "d8e7f6a5b4c3"
down_revision = "c9d8e7f6a5b4"
branch_labels = None
depends_on = None


VIEWS = (
    "mapalab_stats_overview",
    "mapalab_stats_layers",
    "mapalab_stats_buttons",
    "mapalab_stats_tools",
    "mapalab_stats_daily",
)


def upgrade() -> None:
    for view in VIEWS:
        op.execute(f"REFRESH MATERIALIZED VIEW {view}")


def downgrade() -> None:
    pass
