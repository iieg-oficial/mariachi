"""catalogo de areas y extension telefonica en la ficha

Revision ID: v1ne0008
Revises: v1ne0007
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0008"
down_revision = "v1ne0007"
branch_labels = None
depends_on = None

SCHEMA = "vine"

# Las once adscripciones reales del instituto, escritas bien una sola vez. El
# departamento del biometrico trae las mismas con capitalizacion inconsistente
# (`DIRECCION DE GOBERNANZA...` junto a `Dirección Jurídica`), sufijo `(Bajas)` y
# mezcladas con vinculos que no son areas.
SEMILLA = [
    ("direccion_general", "Dirección General", 1),
    ("integracion_operativa", "Dirección de Integración Operativa y Planeación", 2),
    ("sistema_informacion", "Dirección del Sistema de Información", 3),
    ("estadistica", "Dirección de Estadística y Análisis Estratégico", 4),
    ("geoespacial", "Dirección de Información Geoespacial", 5),
    ("ia_computo", "Dirección de Inteligencia Artificial y Cómputo de Alto Rendimiento", 6),
    ("gobernanza", "Dirección de Gobernanza y Datos Abiertos", 7),
    ("juridica", "Dirección Jurídica", 8),
    ("administrativa", "Dirección Administrativa", 9),
    ("organo_control", "Órgano Interno de Control", 10),
    ("caseta", "Caseta de vigilancia", 90),
]


def upgrade() -> None:
    op.add_column(
        "personas_ficha", sa.Column("extension", sa.String(60)), schema=SCHEMA
    )

    tabla = sa.table(
        "catalogos",
        sa.column("tipo", sa.String),
        sa.column("clave", sa.String),
        sa.column("nombre", sa.String),
        sa.column("orden", sa.Integer),
        schema=SCHEMA,
    )
    op.bulk_insert(
        tabla,
        [
            {"tipo": "area", "clave": clave, "nombre": nombre, "orden": orden}
            for clave, nombre, orden in SEMILLA
        ],
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM {SCHEMA}.catalogos WHERE tipo = 'area'")
    op.drop_column("personas_ficha", "extension", schema=SCHEMA)
