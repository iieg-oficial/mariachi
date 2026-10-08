"""mel: muted, surface y bordes de la marca iieg, tomados de lo que ya usa mapalab

Revision ID: m3lnt0001
Revises: pubc0001
Create Date: 2026-09-30

"""

import json

import sqlalchemy as sa

from alembic import op

revision = "m3lnt0001"
down_revision = "pubc0001"
branch_labels = None
depends_on = None

SCHEMA = "mel"
MARCA = "iieg"
ORDEN_BASE = 150

NEUTROS = (
    (
        "color.muted",
        "#6E7477",
        "Texto secundario. 4.74:1 sobre blanco y 4.58:1 sobre surface, cumple AA. "
        "Sobre surface-field da 4.12:1: ahi usar text",
    ),
    (
        "color.surface",
        "#F9FBFF",
        "Fondo de tarjetas y secciones, apenas separado del blanco de pagina",
    ),
    (
        "color.border",
        "#EAEFFA",
        "Borde decorativo de tarjetas. 1.15:1 sobre blanco: no sirve para delimitar un control",
    ),
    (
        "color.border-strong",
        "#8894AE",
        "Borde de campos de formulario y controles. 3.05:1 sobre blanco, cumple el 3:1 de WCAG 1.4.11",
    ),
)


def upgrade() -> None:
    conn = op.get_bind()
    marca = conn.execute(
        sa.text(f"SELECT id FROM {SCHEMA}.marcas WHERE codigo = :codigo"), {"codigo": MARCA}
    ).fetchone()
    if marca is None:
        return
    for indice, (clave, valor, descripcion) in enumerate(NEUTROS):
        conn.execute(
            sa.text(
                f"INSERT INTO {SCHEMA}.tokens "
                "(marca_id, grupo, clave, tipo, valor, descripcion, orden) "
                "VALUES (:marca_id, 'color', :clave, 'color', CAST(:valor AS jsonb), :descripcion, :orden) "
                "ON CONFLICT ON CONSTRAINT uq_mel_token DO NOTHING"
            ),
            {
                "marca_id": marca[0],
                "clave": clave,
                "valor": json.dumps(valor),
                "descripcion": descripcion,
                "orden": ORDEN_BASE + indice,
            },
        )


def downgrade() -> None:
    conn = op.get_bind()
    for clave, valor, _ in NEUTROS:
        conn.execute(
            sa.text(
                f"DELETE FROM {SCHEMA}.tokens t USING {SCHEMA}.marcas m "
                "WHERE t.marca_id = m.id AND m.codigo = :codigo AND t.grupo = 'color' "
                "AND t.clave = :clave AND t.valor = CAST(:valor AS jsonb)"
            ),
            {"codigo": MARCA, "clave": clave, "valor": json.dumps(valor)},
        )
