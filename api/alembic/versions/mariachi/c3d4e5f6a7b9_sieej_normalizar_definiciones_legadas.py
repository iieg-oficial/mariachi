"""sieej: normalizar definiciones legadas al contrato vigente

Aplica `app.services.sieej.compat.normalizar_definicion` a las tres tablas
que guardan definiciones. Sustituye el patron de escribir una migracion de
datos por cada endurecimiento del contrato: las reglas viven en `compat` y
esta migracion solo las materializa en BD.

Es idempotente y no destructiva (solo relaja). Sin ella el sistema sigue
funcionando -- la normalizacion tambien corre en lectura y escritura --,
pero deja la BD alineada para que un guardado desde el admin no genere un
diff espurio contra la definicion legada.

Revision ID: c3d4e5f6a7b9
Revises: b8c9d0e1f2a4
Create Date: 2026-07-27

"""

import json

import sqlalchemy as sa
from alembic import op

from app.services.sieej.compat import normalizar_definicion

revision = "c3d4e5f6a7b9"
down_revision = "b8c9d0e1f2a4"
branch_labels = None
depends_on = None

_TABLES = [
    ("sieej.formulario", "definicion", "json"),
    ("sieej.envio_formulario", "definicion_snapshot", "json"),
    ("sieej.formulario_version", "definicion", "jsonb"),
]


def _as_dict(value):
    return json.loads(value) if isinstance(value, str) else value


def upgrade() -> None:
    bind = op.get_bind()
    for tabla, columna, cast in _TABLES:
        filas = (
            bind.execute(sa.text(f"SELECT id, {columna} AS defn FROM {tabla}"))
            .mappings()
            .all()
        )
        for fila in filas:
            actual = _as_dict(fila["defn"])
            if not isinstance(actual, dict):
                continue
            normalizada = normalizar_definicion(actual)
            if normalizada == actual:
                continue
            bind.execute(
                sa.text(
                    f"UPDATE {tabla} SET {columna} = CAST(:defn AS {cast}) "
                    "WHERE id = :id"
                ),
                {
                    "defn": json.dumps(normalizada, ensure_ascii=False),
                    "id": fila["id"],
                },
            )


def downgrade() -> None:
    pass
