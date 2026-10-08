"""tipos de incidencia como catalogo

Revision ID: v1ne0005
Revises: v1ne0004
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0005"
down_revision = "v1ne0004"
branch_labels = None
depends_on = None

SCHEMA = "vine"

SEMILLA = [
    ("vacaciones", "Vacaciones", "blue", "descuenta", 1),
    ("economico", "Día económico", "cyan", "descuenta", 2),
    ("permiso", "Permiso", "gold", "descuenta", 3),
    ("incapacidad", "Incapacidad", "volcano", "descuenta", 4),
    ("cumpleanos", "Cumpleaños", "magenta", "descuenta", 5),
    ("falta", "Falta justificada", "default", "descuenta", 6),
    ("comision", "Comisión", "green", "presente", 7),
    ("capacitacion", "Capacitación", "green", "presente", 8),
]


def upgrade() -> None:
    op.add_column("catalogos", sa.Column("efecto", sa.String(20)), schema=SCHEMA)

    tabla = sa.table(
        "catalogos",
        sa.column("tipo", sa.String),
        sa.column("clave", sa.String),
        sa.column("nombre", sa.String),
        sa.column("color", sa.String),
        sa.column("efecto", sa.String),
        sa.column("orden", sa.Integer),
        schema=SCHEMA,
    )
    op.bulk_insert(
        tabla,
        [
            {
                "tipo": "incidencia",
                "clave": clave,
                "nombre": nombre,
                "color": color,
                "efecto": efecto,
                "orden": orden,
            }
            for clave, nombre, color, efecto, orden in SEMILLA
        ],
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM {SCHEMA}.catalogos WHERE tipo = 'incidencia'")
    op.drop_column("catalogos", "efecto", schema=SCHEMA)
