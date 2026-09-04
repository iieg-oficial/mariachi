"""mel: siembra los breakpoints, que nunca existieron como tokens

Revision ID: m3lbp0001
Revises: fr4mes0001
Create Date: 2026-09-04

"""

import json

import sqlalchemy as sa

from alembic import op

revision = "m3lbp0001"
down_revision = "fr4mes0001"
branch_labels = None
depends_on = None

SCHEMA = "mel"
ORDEN_BASE = 900

BREAKPOINTS = (
    ("breakpoint.sm", "640px", "Movil. Debajo de este ancho el contenido va en una sola columna"),
    ("breakpoint.md", "768px", "Tableta. Es el ancho donde el panel lateral se colapsa"),
    ("breakpoint.lg", "1024px", "Laptop. A partir de aqui caben dos columnas de contenido"),
    ("breakpoint.xl", "1280px", "Escritorio. Ancho maximo de la caja de contenido"),
)


def upgrade() -> None:
    conn = op.get_bind()
    marcas = conn.execute(sa.text(f"SELECT id FROM {SCHEMA}.marcas")).fetchall()
    for (marca_id,) in marcas:
        for indice, (clave, valor, descripcion) in enumerate(BREAKPOINTS):
            conn.execute(
                sa.text(
                    f"INSERT INTO {SCHEMA}.tokens "
                    "(marca_id, grupo, clave, tipo, valor, descripcion, orden) "
                    "VALUES (:marca_id, :grupo, :clave, :tipo, CAST(:valor AS jsonb), :descripcion, :orden) "
                    "ON CONFLICT ON CONSTRAINT uq_mel_token DO NOTHING"
                ),
                {
                    "marca_id": marca_id,
                    "grupo": "breakpoint",
                    "clave": clave,
                    "tipo": "dimension",
                    "valor": json.dumps(valor),
                    "descripcion": descripcion,
                    "orden": ORDEN_BASE + indice,
                },
            )


def downgrade() -> None:
    claves = [clave for clave, _, _ in BREAKPOINTS]
    op.get_bind().execute(
        sa.text(f"DELETE FROM {SCHEMA}.tokens WHERE grupo = 'breakpoint' AND clave = ANY(:claves)"),
        {"claves": claves},
    )
