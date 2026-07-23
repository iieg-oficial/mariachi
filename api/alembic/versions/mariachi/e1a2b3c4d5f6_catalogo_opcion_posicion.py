"""posicion en catalogo_opcion

Agrega la columna `posicion` a `sieej.catalogo_opcion` para poder ordenar
manualmente (drag & drop desde el admin) las opciones de cada catalogo. El
orden se refleja en los selects/checkbox de los formularios publicos. Inicializa
`posicion` respetando el orden actual (por id) dentro de cada catalogo.

Revision ID: e1a2b3c4d5f6
Revises: dab0act1v1dad
Create Date: 2026-07-23 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op


revision = "e1a2b3c4d5f6"
down_revision = "dab0act1v1dad"
branch_labels = None
depends_on = None

SCHEMA = "sieej"


def upgrade() -> None:
    op.add_column(
        "catalogo_opcion",
        sa.Column("posicion", sa.Integer(), nullable=False, server_default="0"),
        schema=SCHEMA,
    )
    op.execute(
        f"""
        UPDATE {SCHEMA}.catalogo_opcion AS o
        SET posicion = sub.rn
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY catalogo_id ORDER BY id
                   ) - 1 AS rn
            FROM {SCHEMA}.catalogo_opcion
        ) AS sub
        WHERE o.id = sub.id
        """
    )
    op.create_index(
        "ix_sieej_catalogo_opcion_posicion",
        "catalogo_opcion",
        ["catalogo_id", "posicion"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_sieej_catalogo_opcion_posicion",
        table_name="catalogo_opcion",
        schema=SCHEMA,
    )
    op.drop_column("catalogo_opcion", "posicion", schema=SCHEMA)
