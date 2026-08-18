from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.vine_stats import consultar

CAMPOS = (
    "nombre",
    "apellidos",
    "email",
    "telefono",
    "departamento",
    "vinculo",
    "puesto",
    "horario",
    "cumpleanos",
    "fecha_ingreso",
    "foto_url",
    "tarjeta",
    "activo",
    "notas",
)


def biometrico(db: Session, pin: str) -> dict[str, Any] | None:
    sql = """
        SELECT pin, nombre, apellidos, email, departamento, puesto, sincronizado_at
        FROM vine.personas WHERE pin = :pin
    """
    filas = consultar(db, sql, {"pin": pin})
    return filas[0] if filas else None


def ficha(db: Session, pin: str) -> dict[str, Any] | None:
    sql = "SELECT * FROM vine.personas_ficha WHERE pin = :pin"
    filas = consultar(db, sql, {"pin": pin})
    return filas[0] if filas else None


def guardar(db: Session, pin: str, cambios: dict[str, Any], autor: str | None) -> dict[str, Any]:
    campos = {k: v for k, v in cambios.items() if k in CAMPOS}
    columnas = ", ".join(campos)
    valores = ", ".join(f":{k}" for k in campos)
    actualiza = ", ".join(f"{k} = excluded.{k}" for k in campos)

    sql = f"""
        INSERT INTO vine.personas_ficha (pin, {columnas}, actualizado_at, actualizado_por)
        VALUES (:pin, {valores}, now() AT TIME ZONE 'utc', :autor)
        ON CONFLICT (pin) DO UPDATE SET
            {actualiza},
            actualizado_at = excluded.actualizado_at,
            actualizado_por = excluded.actualizado_por
        RETURNING *
    """ if campos else """
        INSERT INTO vine.personas_ficha (pin, actualizado_at, actualizado_por)
        VALUES (:pin, now() AT TIME ZONE 'utc', :autor)
        ON CONFLICT (pin) DO UPDATE SET
            actualizado_at = excluded.actualizado_at,
            actualizado_por = excluded.actualizado_por
        RETURNING *
    """

    fila = db.execute(text(sql), {"pin": pin, "autor": autor, **campos}).mappings().first()
    db.commit()
    return dict(fila) if fila else {}


def limpiar(db: Session, pin: str, campo: str) -> None:
    if campo not in CAMPOS:
        raise ValueError(f"campo no editable: {campo}")
    db.execute(
        text(f"UPDATE vine.personas_ficha SET {campo} = NULL WHERE pin = :pin"),
        {"pin": pin},
    )
    db.commit()
