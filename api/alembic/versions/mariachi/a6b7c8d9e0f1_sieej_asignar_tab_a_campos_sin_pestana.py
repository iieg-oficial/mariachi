"""sieej: cada campo de un repeater con pestanas pertenece a una pestana

Los campos sin `tab` se mostraban repetidos en todas las pestanas del item.
Ahora cada campo pertenece a exactamente una: los que no la tenian se asignan
a la primera. El downgrade no restituye (no hay forma de saber cuales estaban
sin `tab`), pero tampoco pierde datos: el campo sigue existiendo.

Revision ID: a6b7c8d9e0f1
Revises: a5b6c7d8e9f1
Create Date: 2026-07-24

"""

import json

import sqlalchemy as sa
from alembic import op

revision = "a6b7c8d9e0f1"
down_revision = "a5b6c7d8e9f1"
branch_labels = None
depends_on = None

_TABLES = [
    ("sieej.formulario", "definicion", "json"),
    ("sieej.envio_formulario", "definicion_snapshot", "json"),
    ("sieej.formulario_version", "definicion", "jsonb"),
]


def _as_dict(value):
    return json.loads(value) if isinstance(value, str) else value


def _asignar_pestana(definicion) -> bool:
    if not isinstance(definicion, dict):
        return False
    changed = False
    for step in definicion.get("steps") or []:
        if not isinstance(step, dict) or step.get("type") != "repeater":
            continue
        tabs = step.get("tabs")
        if not isinstance(tabs, list) or not tabs:
            continue
        tab_ids = {t.get("id") for t in tabs if isinstance(t, dict)}
        primera = tabs[0].get("id") if isinstance(tabs[0], dict) else None
        if not primera:
            continue
        for field in step.get("fields") or []:
            if isinstance(field, dict) and field.get("tab") not in tab_ids:
                field["tab"] = primera
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
            if _asignar_pestana(definicion):
                bind.execute(
                    sa.text(
                        f"UPDATE {tabla} SET {columna} = CAST(:defn AS {cast}) "
                        "WHERE id = :id"
                    ),
                    {"defn": json.dumps(definicion, ensure_ascii=False), "id": fila["id"]},
                )


def downgrade() -> None:
    pass
