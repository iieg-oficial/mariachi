"""generic sieej catalogos

Revision ID: d4e5f6a7b8c9
Revises: b3c4d5e6f7a8
Create Date: 2026-07-17 12:00:00.000000

Convierte los 8 catalogos fijos (una tabla fisica por catalogo) en el
par generico `sieej.catalogo` + `sieej.catalogo_opcion`, para poder
crear/renombrar/eliminar catalogos desde el admin. Copia claves, labels
y opciones existentes y elimina las tablas `catalogo_*` legacy.

El downgrade recrea las 8 tablas legacy y restaura sus opciones; los
catalogos creados despues de esta migration (claves fuera de las 8
conocidas) se pierden en el downgrade.
"""
import sqlalchemy as sa
from alembic import op


revision = 'd4e5f6a7b8c9'
down_revision = 'b3c4d5e6f7a8'
branch_labels = None
depends_on = None

SCHEMA = "sieej"

LEGACY_CATALOGS = [
    ("unidades_admin", "Unidades administrativas", "catalogo_unidad_admin"),
    ("categoria_datos", "Categoría de datos", "catalogo_categoria_datos"),
    ("herramientas_gestion", "Herramientas de gestión", "catalogo_herramientas_gestion"),
    ("calidad_datos", "Calidad de datos", "catalogo_calidad_datos"),
    ("periodicidad", "Periodicidad", "catalogo_periodicidad"),
    ("objetivo_uso", "Objetivo de uso", "catalogo_objetivo_uso"),
    ("usuarios_datos", "Usuarios de los datos", "catalogo_usuarios_datos"),
    ("ejes_estrategicos", "Ejes estratégicos", "catalogo_ejes_estrategicos"),
]


def upgrade() -> None:
    op.create_table(
        "catalogo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clave", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("clave", name="uq_catalogo_clave"),
        schema=SCHEMA,
    )
    op.create_index("ix_sieej_catalogo_clave", "catalogo", ["clave"], schema=SCHEMA)

    op.create_table(
        "catalogo_opcion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "catalogo_id",
            sa.Integer(),
            sa.ForeignKey(f"{SCHEMA}.catalogo.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("value", sa.String(), nullable=False),
        sa.UniqueConstraint("catalogo_id", "value", name="uq_catalogo_opcion_value"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_sieej_catalogo_opcion_catalogo_id",
        "catalogo_opcion",
        ["catalogo_id"],
        schema=SCHEMA,
    )

    conn = op.get_bind()
    for clave, label, legacy_table in LEGACY_CATALOGS:
        result = conn.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.catalogo (clave, label) "
                "VALUES (:clave, :label) RETURNING id"
            ),
            {"clave": clave, "label": label},
        )
        catalogo_id = result.scalar_one()
        conn.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.catalogo_opcion (catalogo_id, value) "
                f"SELECT :catalogo_id, value FROM {SCHEMA}.{legacy_table} ORDER BY id"
            ),
            {"catalogo_id": catalogo_id},
        )

    for _clave, _label, legacy_table in LEGACY_CATALOGS:
        op.drop_table(legacy_table, schema=SCHEMA)


def downgrade() -> None:
    conn = op.get_bind()
    for clave, _label, legacy_table in LEGACY_CATALOGS:
        op.create_table(
            legacy_table,
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("value", sa.String(), unique=True, index=True, nullable=False),
            schema=SCHEMA,
        )
        conn.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.{legacy_table} (value) "
                f"SELECT o.value FROM {SCHEMA}.catalogo_opcion o "
                f"JOIN {SCHEMA}.catalogo c ON c.id = o.catalogo_id "
                "WHERE c.clave = :clave ORDER BY o.id"
            ),
            {"clave": clave},
        )

    op.drop_index(
        "ix_sieej_catalogo_opcion_catalogo_id",
        table_name="catalogo_opcion",
        schema=SCHEMA,
    )
    op.drop_table("catalogo_opcion", schema=SCHEMA)
    op.drop_index("ix_sieej_catalogo_clave", table_name="catalogo", schema=SCHEMA)
    op.drop_table("catalogo", schema=SCHEMA)
