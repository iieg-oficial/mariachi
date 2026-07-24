"""sieej: quitar campos info con label vacio (espaciadores)

Los campos `type: info` con label vacio se usaban como espaciadores del grid
(reservaban una celda). Con el grid en orden estricto + `layout.newRow` ya no
hacen falta, y el validador ahora exige label no vacio para `info`, asi que esas
definiciones quedarian invalidas al reeditarse. Esta migracion las limpia
quitando esos campos de `definicion`, `definicion_snapshot` y
`formulario_version`. No pierde datos: los campos `info` nunca capturan valores.

El downgrade no restituye (no se guarda lo removido), pero es inocuo.

Revision ID: b8c9d0e1f2a4
Revises: b7c8d9e0f1a3
Create Date: 2026-07-24

"""

import json

import sqlalchemy as sa
from alembic import op

revision = "b8c9d0e1f2a4"
down_revision = "b7c8d9e0f1a3"
branch_labels = None
depends_on = None

_TABLES = [
    ("sieej.formulario", "definicion", "json"),
    ("sieej.envio_formulario", "definicion_snapshot", "json"),
    ("sieej.formulario_version", "definicion", "jsonb"),
]


def _as_dict(value):
    return json.loads(value) if isinstance(value, str) else value


def _es_espaciador(field) -> bool:
    return (
        isinstance(field, dict)
        and field.get("type") == "info"
        and not (field.get("label") or "").strip()
    )


def _quitar_espaciadores(definicion) -> bool:
    if not isinstance(definicion, dict):
        return False
    changed = False
    for step in definicion.get("steps") or []:
        if not isinstance(step, dict):
            continue
        fields = step.get("fields")
        if not isinstance(fields, list):
            continue
        limpios = [f for f in fields if not _es_espaciador(f)]
        if len(limpios) != len(fields):
            step["fields"] = limpios
            changed = True
    return changed


def upgrade() -> None:
    bind = op.get_bind()
    for tabla, columna, cast in _TABLES:
        filas = bind.execute(
            sa.text(f"SELECT id, {columna} AS defn FROM {tabla}")
        ).mappings().all()
        for fila in filas:
            definicion = _as_dict(fila["defn"])
            if _quitar_espaciadores(definicion):
                bind.execute(
                    sa.text(
                        f"UPDATE {tabla} SET {columna} = CAST(:defn AS {cast}) "
                        "WHERE id = :id"
                    ),
                    {"defn": json.dumps(definicion, ensure_ascii=False), "id": fila["id"]},
                )


def downgrade() -> None:
    pass
