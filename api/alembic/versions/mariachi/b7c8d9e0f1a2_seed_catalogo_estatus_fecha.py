"""seed catalogo estatus_fecha

Revision ID: b7c8d9e0f1a2
Revises: d4e5f6a7b8c9
Create Date: 2026-07-20 10:00:00.000000

Siembra el catalogo del sistema `estatus_fecha`, que alimenta la fecha
abierta de los campos `date_range` (ej. "10/02/1992 a NO DETERMINADO").
Es idempotente: si la clave ya existe no la duplica ni toca sus opciones,
para no revertir ediciones hechas desde el admin.

El downgrade solo borra el catalogo si ningun envio lo dejo con opciones
distintas a las sembradas.
"""
import sqlalchemy as sa
from alembic import op


revision = 'b7c8d9e0f1a2'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None

SCHEMA = "sieej"
CLAVE = "estatus_fecha"
LABEL = "Estatus de fecha"
OPCIONES = [
    "NO DETERMINADO",
    "EN PROCESO",
    "VIGENTE",
    "SIN FECHA DE TÉRMINO",
    "PENDIENTE",
]


def upgrade() -> None:
    conn = op.get_bind()
    existente = conn.execute(
        sa.text(f"SELECT id FROM {SCHEMA}.catalogo WHERE clave = :clave"),
        {"clave": CLAVE},
    ).scalar()
    if existente is not None:
        return

    catalogo_id = conn.execute(
        sa.text(
            f"INSERT INTO {SCHEMA}.catalogo (clave, label) "
            "VALUES (:clave, :label) RETURNING id"
        ),
        {"clave": CLAVE, "label": LABEL},
    ).scalar_one()

    for value in OPCIONES:
        conn.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.catalogo_opcion (catalogo_id, value) "
                "VALUES (:catalogo_id, :value)"
            ),
            {"catalogo_id": catalogo_id, "value": value},
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(f"DELETE FROM {SCHEMA}.catalogo WHERE clave = :clave"),
        {"clave": CLAVE},
    )
