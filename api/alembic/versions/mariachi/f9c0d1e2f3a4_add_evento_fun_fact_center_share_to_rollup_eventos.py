"""agrega fun_facts, centers, shares a mapalab_rollup_eventos

Revision ID: f9c0d1e2f3a4
Revises: f8b9c0d1e2f3
Create Date: 2026-06-09 12:00:00.000000
"""
from alembic import op


revision = "f9c0d1e2f3a4"
down_revision = "f8b9c0d1e2f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE mapalab_rollup_eventos ADD COLUMN fun_facts integer NOT NULL DEFAULT 0;")
    op.execute("ALTER TABLE mapalab_rollup_eventos ADD COLUMN centers integer NOT NULL DEFAULT 0;")
    op.execute("ALTER TABLE mapalab_rollup_eventos ADD COLUMN shares integer NOT NULL DEFAULT 0;")

    op.execute("""
    UPDATE mapalab_rollup_eventos SET
        fun_facts = sub.fun_facts,
        centers = sub.centers,
        shares = sub.shares
    FROM (
        SELECT
            dia, evento_id,
            COUNT(*) FILTER (WHERE event_name = 'evento_fun_fact') AS fun_facts,
            COUNT(*) FILTER (WHERE event_name = 'evento_center') AS centers,
            COUNT(*) FILTER (WHERE event_name = 'evento_share') AS shares
        FROM mapalab_events
        WHERE event_name IN ('evento_fun_fact', 'evento_center', 'evento_share')
          AND (props->>'evento_id') IS NOT NULL
        GROUP BY dia, (props->>'evento_id')
    ) sub
    WHERE mapalab_rollup_eventos.dia = sub.dia
      AND mapalab_rollup_eventos.evento_id = sub.evento_id;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE mapalab_rollup_eventos DROP COLUMN shares;")
    op.execute("ALTER TABLE mapalab_rollup_eventos DROP COLUMN centers;")
    op.execute("ALTER TABLE mapalab_rollup_eventos DROP COLUMN fun_facts;")
