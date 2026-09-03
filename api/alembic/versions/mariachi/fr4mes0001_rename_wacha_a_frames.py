"""frames: renombra el schema wacha y su indice

Revision ID: fr4mes0001
Revises: m3l0001
Create Date: 2026-09-02

"""

from alembic import op

revision = "fr4mes0001"
down_revision = "m3l0001"
branch_labels = None
depends_on = None


INDICES = (
    ("ix_wacha_camaras_nombre", "ix_frames_camaras_nombre"),
)


def upgrade() -> None:
    op.execute("ALTER SCHEMA wacha RENAME TO frames")
    for viejo, nuevo in INDICES:
        op.execute(f"ALTER INDEX frames.{viejo} RENAME TO {nuevo}")


def downgrade() -> None:
    for viejo, nuevo in INDICES:
        op.execute(f"ALTER INDEX frames.{nuevo} RENAME TO {viejo}")
    op.execute("ALTER SCHEMA frames RENAME TO wacha")
