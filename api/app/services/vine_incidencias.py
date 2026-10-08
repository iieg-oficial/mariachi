from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.vine_stats import consultar

_SQL_TIPOS = """
    SELECT clave, nombre, coalesce(efecto, 'descuenta') AS efecto
    FROM vine.catalogos WHERE tipo = 'incidencia' AND activo ORDER BY orden, nombre
"""

# Respaldo si el catalogo quedara vacio: sin esto el calculo de dias habiles
# dejaria de descontar nada y la asistencia se leeria como faltas.
EFECTO_POR_OMISION = "descuenta"


def tipos(db: Session) -> dict[str, dict[str, str]]:
    return {f["clave"]: f for f in consultar(db, _SQL_TIPOS, {})}


def claves_por_efecto(db: Session, efecto: str) -> list[str]:
    return [k for k, v in tipos(db).items() if v["efecto"] == efecto]


def listar(db: Session, pin: str) -> list[dict[str, Any]]:
    sql = """
        SELECT id, pin, desde, hasta, tipo, nota, creado_at, creado_por,
               (hasta - desde + 1) AS dias
        FROM vine.incidencias WHERE pin = :pin ORDER BY desde DESC
    """
    filas = consultar(db, sql, {"pin": pin})
    catalogo = tipos(db)
    for fila in filas:
        info = catalogo.get(fila["tipo"], {})
        fila["nombre_tipo"] = info.get("nombre", fila["tipo"])
        fila["efecto"] = info.get("efecto", EFECTO_POR_OMISION)
    return filas


def crear(
    db: Session,
    pin: str,
    desde: date,
    hasta: date,
    tipo: str,
    nota: str | None,
    autor: str | None,
) -> dict[str, Any]:
    if tipo not in tipos(db):
        raise ValueError(f"tipo de incidencia desconocido: {tipo}")
    if hasta < desde:
        raise ValueError("la fecha final no puede ser anterior a la inicial")

    fila = db.execute(
        text("""
            INSERT INTO vine.incidencias (pin, desde, hasta, tipo, nota, creado_at, creado_por)
            VALUES (:pin, :desde, :hasta, :tipo, :nota, now() AT TIME ZONE 'utc', :autor)
            RETURNING id, pin, desde, hasta, tipo, nota, creado_at, creado_por
        """),
        {"pin": pin, "desde": desde, "hasta": hasta, "tipo": tipo, "nota": nota, "autor": autor},
    ).mappings().first()
    db.commit()
    return dict(fila) if fila else {}


def crear_masiva(
    db: Session,
    pins: list[str],
    desde: date,
    hasta: date,
    tipo: str,
    nota: str | None,
    autor: str | None,
) -> int:
    if tipo not in tipos(db):
        raise ValueError(f"tipo de incidencia desconocido: {tipo}")
    if hasta < desde:
        raise ValueError("la fecha final no puede ser anterior a la inicial")
    if not pins:
        return 0

    db.execute(
        text("""
            INSERT INTO vine.incidencias (pin, desde, hasta, tipo, nota, creado_at, creado_por)
            SELECT p.pin, :desde, :hasta, :tipo, :nota, now() AT TIME ZONE 'utc', :autor
            FROM vine.personas p WHERE p.pin = ANY(:pins)
        """),
        {"pins": pins, "desde": desde, "hasta": hasta, "tipo": tipo, "nota": nota, "autor": autor},
    )
    db.commit()
    return len(pins)


def listado(
    db: Session,
    desde: date | None = None,
    hasta: date | None = None,
    tipo: str | None = None,
) -> list[dict[str, Any]]:
    filtros = ["1 = 1"]
    params: dict[str, Any] = {}
    if desde:
        filtros.append("i.hasta >= :desde")
        params["desde"] = desde
    if hasta:
        filtros.append("i.desde <= :hasta")
        params["hasta"] = hasta
    if tipo:
        filtros.append("i.tipo = :tipo")
        params["tipo"] = tipo

    sql = f"""
        SELECT i.id, i.pin, i.desde, i.hasta, i.tipo, i.nota, i.creado_at, i.creado_por,
               (i.hasta - i.desde + 1) AS dias,
               coalesce(
                   nullif(trim(coalesce(f.nombre, '') || ' ' || coalesce(f.apellidos, '')), ''),
                   trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, ''))
               ) AS nombre,
               coalesce(f.departamento, p.departamento) AS departamento
        FROM vine.incidencias i
        JOIN vine.personas p ON p.pin = i.pin
        LEFT JOIN vine.personas_ficha f ON f.pin = i.pin
        WHERE {" AND ".join(filtros)}
        ORDER BY i.desde DESC, nombre
    """
    filas = consultar(db, sql, params)
    catalogo = tipos(db)
    for fila in filas:
        info = catalogo.get(fila["tipo"], {})
        fila["nombre_tipo"] = info.get("nombre", fila["tipo"])
        fila["efecto"] = info.get("efecto", EFECTO_POR_OMISION)
    return filas


def borrar(db: Session, incidencia_id: int) -> bool:
    resultado = db.execute(
        text("DELETE FROM vine.incidencias WHERE id = :id"), {"id": incidencia_id}
    )
    db.commit()
    return resultado.rowcount > 0
