"""sieej: registrar quien fue el ultimo en editar el formulario

Alimenta el 409 de edicion concurrente: cuando dos personas editan el mismo
formulario, el que llega tarde necesita saber quien guardo antes, no solo
cuando.

Revision ID: b7c8d9e0f1a3
Revises: a6b7c8d9e0f1
Create Date: 2026-07-24

"""

import sqlalchemy as sa
from alembic import op

revision = "b7c8d9e0f1a3"
down_revision = "a6b7c8d9e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "formulario",
        sa.Column("actualizado_por_id", sa.Integer(), nullable=True),
        schema="sieej",
    )
    op.create_foreign_key(
        "fk_formulario_actualizado_por",
        "formulario",
        "usuarios",
        ["actualizado_por_id"],
        ["id"],
        source_schema="sieej",
        referent_schema="public",
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_formulario_actualizado_por",
        "formulario",
        schema="sieej",
        type_="foreignkey",
    )
    op.drop_column("formulario", "actualizado_por_id", schema="sieej")
