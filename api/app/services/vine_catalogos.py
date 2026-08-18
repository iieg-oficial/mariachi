from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.vine_stats import consultar

TIPOS = ("horario", "vinculo", "tarjeta", "incidencia")

CAMPOS = ("clave", "nombre", "color", "efecto", "entrada", "salida", "orden", "activo", "notas")


def listar(db: Session, tipo: str | None = None, solo_activos: bool = False) -> list[dict[str, Any]]:
    filtros = ["1 = 1"]
    params: dict[str, Any] = {}
    if tipo:
        filtros.append("tipo = :tipo")
        params["tipo"] = tipo
    if solo_activos:
        filtros.append("activo")

    sql = f"""
        SELECT id, tipo, clave, nombre, color, efecto,
               to_char(entrada, 'HH24:MI') AS entrada,
               to_char(salida, 'HH24:MI') AS salida,
               orden, activo, notas
        FROM vine.catalogos
        WHERE {" AND ".join(filtros)}
        ORDER BY tipo, orden, nombre
    """
    return consultar(db, sql, params)


def crear(db: Session, tipo: str, datos: dict[str, Any]) -> dict[str, Any]:
    if tipo not in TIPOS:
        raise ValueError(f"tipo de catalogo desconocido: {tipo}")
    campos = {k: v for k, v in datos.items() if k in CAMPOS and v is not None}
    if not campos.get("clave") or not campos.get("nombre"):
        raise ValueError("clave y nombre son obligatorios")

    columnas = ", ".join(campos)
    valores = ", ".join(f":{k}" for k in campos)
    fila = db.execute(
        text(f"INSERT INTO vine.catalogos (tipo, {columnas}) VALUES (:tipo, {valores}) RETURNING id"),
        {"tipo": tipo, **campos},
    ).mappings().first()
    db.commit()
    return listar_uno(db, fila["id"]) if fila else {}


def actualizar(db: Session, catalogo_id: int, datos: dict[str, Any]) -> dict[str, Any] | None:
    campos = {k: v for k, v in datos.items() if k in CAMPOS}
    if not campos:
        return listar_uno(db, catalogo_id)

    asignaciones = ", ".join(f"{k} = :{k}" for k in campos)
    resultado = db.execute(
        text(f"UPDATE vine.catalogos SET {asignaciones} WHERE id = :id"),
        {"id": catalogo_id, **campos},
    )
    db.commit()
    return listar_uno(db, catalogo_id) if resultado.rowcount else None


def listar_uno(db: Session, catalogo_id: int) -> dict[str, Any] | None:
    filas = consultar(
        db,
        """
        SELECT id, tipo, clave, nombre, color, efecto,
               to_char(entrada, 'HH24:MI') AS entrada,
               to_char(salida, 'HH24:MI') AS salida,
               orden, activo, notas
        FROM vine.catalogos WHERE id = :id
        """,
        {"id": catalogo_id},
    )
    return filas[0] if filas else None


def borrar(db: Session, catalogo_id: int) -> bool:
    resultado = db.execute(text("DELETE FROM vine.catalogos WHERE id = :id"), {"id": catalogo_id})
    db.commit()
    return resultado.rowcount > 0
