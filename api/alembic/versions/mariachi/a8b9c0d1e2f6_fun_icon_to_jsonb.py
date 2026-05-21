"""change fun_icon from VARCHAR to JSONB

Revision ID: a8b9c0d1e2f6
Revises: a8b9c0d1e2f5
Create Date: 2026-05-21 09:50:00.000000

Reemplaza fun_icon (slug string) por fun_icon (snapshot del simbolo
seleccionado del catalogo MapaLab → Simbolos). El snapshot contiene
{symbolId, kind, value, imageUrl} para que el visor pueda renderizar
sin tener que cruzar a la DB de DataEngine donde viven los simbolos.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "a8b9c0d1e2f6"
down_revision = "a8b9c0d1e2f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("eventos", "fun_icon")
    op.add_column(
        "eventos",
        sa.Column(
            "fun_icon",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("eventos", "fun_icon")
    op.add_column(
        "eventos",
        sa.Column("fun_icon", sa.String(length=32), nullable=True),
    )
