"""mapalab rollup_themes: temas mas vistos desde theme_change

Revision ID: a0f1e2d3c4b5
Revises: f8b9c0d1e2f3
Create Date: 2026-06-04 18:00:00.000000

"""
from alembic import op


revision = 'a0f1e2d3c4b5'
down_revision = 'f8b9c0d1e2f3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE mapalab_rollup_themes (
        dia date NOT NULL,
        theme_id text NOT NULL,
        views integer NOT NULL DEFAULT 0,
        unique_sessions integer NOT NULL DEFAULT 0,
        last_seen timestamptz,
        PRIMARY KEY (dia, theme_id)
    );
    """)

    op.execute("""
    INSERT INTO mapalab_rollup_themes
        (dia, theme_id, views, unique_sessions, last_seen)
    SELECT
        DATE(ts), props->>'theme',
        COUNT(*), COUNT(DISTINCT session_id), MAX(ts)
    FROM mapalab_events
    WHERE event_name = 'theme_change'
      AND props->>'theme' IS NOT NULL
    GROUP BY DATE(ts), props->>'theme';
    """)

    op.execute("DELETE FROM mapalab_rollup_buttons WHERE event_name = 'theme_change';")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS mapalab_rollup_themes;")
