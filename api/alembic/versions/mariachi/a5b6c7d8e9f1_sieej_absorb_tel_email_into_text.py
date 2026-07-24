"""sieej: absorber tel/email en text + validation.pattern

Revision ID: a5b6c7d8e9f1
Revises: f9a0b1c2d3e4
Create Date: 2026-07-23

"""

import json

import sqlalchemy as sa
from alembic import op

revision = "a5b6c7d8e9f1"
down_revision = "f9a0b1c2d3e4"
branch_labels = None
depends_on = None

_PRESETS = {
    "tel": {
        "pattern": r"^\d{10}$",
        "patternMessage": "Ingresa un teléfono de 10 dígitos",
    },
    "email": {
        "pattern": r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        "patternMessage": "Ingresa un correo electrónico válido",
    },
}

_TABLES = [
    ("sieej.formulario", "definicion", "json"),
    ("sieej.envio_formulario", "definicion_snapshot", "json"),
    ("sieej.formulario_version", "definicion", "jsonb"),
]


def _as_dict(value):
    return json.loads(value) if isinstance(value, str) else value


def _absorber(field):
    if not isinstance(field, dict) or field.get("type") not in _PRESETS:
        return False
    preset = _PRESETS[field["type"]]
    field["type"] = "text"
    validation = field.get("validation")
    if not isinstance(validation, dict):
        validation = {}
    if not validation.get("pattern"):
        validation["pattern"] = preset["pattern"]
        validation.setdefault("patternMessage", preset["patternMessage"])
    field["validation"] = validation
    return True


def _restaurar(field):
    if not isinstance(field, dict) or field.get("type") != "text":
        return False
    validation = field.get("validation") or {}
    for tipo, preset in _PRESETS.items():
        if validation.get("pattern") == preset["pattern"]:
            field["type"] = tipo
            validation.pop("pattern", None)
            if validation.get("patternMessage") == preset["patternMessage"]:
                validation.pop("patternMessage", None)
            if validation:
                field["validation"] = validation
            else:
                field.pop("validation", None)
            return True
    return False


def _recorrer(definicion, transform):
    if not isinstance(definicion, dict):
        return False
    changed = False
    for step in definicion.get("steps") or []:
        if not isinstance(step, dict):
            continue
        for field in step.get("fields") or []:
            if transform(field):
                changed = True
    return changed


def _procesar(transform):
    bind = op.get_bind()
    for tabla, columna, cast in _TABLES:
        filas = bind.execute(
            sa.text(f"SELECT id, {columna} AS defn FROM {tabla}")
        ).mappings().all()
        for fila in filas:
            definicion = _as_dict(fila["defn"])
            if _recorrer(definicion, transform):
                bind.execute(
                    sa.text(
                        f"UPDATE {tabla} SET {columna} = CAST(:defn AS {cast}) "
                        "WHERE id = :id"
                    ),
                    {"defn": json.dumps(definicion, ensure_ascii=False), "id": fila["id"]},
                )


def upgrade() -> None:
    _procesar(_absorber)


def downgrade() -> None:
    _procesar(_restaurar)
