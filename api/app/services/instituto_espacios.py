import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

TIPOS = ("oficina", "trabajo", "sala", "recepcion", "comedor", "circulacion", "exterior", "servicio")
EDITABLES = ("nombre", "tipo", "piso_id", "incluir", "orden")
TOLERANCIA_PLANO = 0.12

_LISTA = text(
    """
    SELECT e.fid, e.nombre, e.tipo, e.piso_id, p.nombre AS piso, e.incluir, e.aproximado, e.orden,
           round(ST_Area(e.geom)::numeric, 1) AS area_m2, e.actualizado_en, e.actualizado_por
    FROM instituto.espacios e JOIN instituto.pisos p ON p.id = e.piso_id
    ORDER BY p.orden, e.orden, e.fid
    """
)

_PISOS = text("SELECT id, nombre, orden FROM instituto.pisos ORDER BY orden, id")

_PLANO = text(
    """
    WITH girados AS (
        SELECT e.fid, e.nombre, e.tipo, e.piso_id, e.orden,
               ST_Rotate(ST_SimplifyPreserveTopology(e.geom, :tolerancia),
                         radians(-p.giro_grados), p.centro_x, p.centro_y) AS g
        FROM instituto.espacios e JOIN instituto.pisos p ON p.id = e.piso_id
        WHERE e.incluir
    ),
    marcos AS (
        SELECT piso_id, ST_XMin(ST_Extent(g)) AS x0, ST_YMax(ST_Extent(g)) AS y1,
               ST_XMax(ST_Extent(g)) - ST_XMin(ST_Extent(g)) AS ancho,
               ST_YMax(ST_Extent(g)) - ST_YMin(ST_Extent(g)) AS alto
        FROM girados GROUP BY piso_id
    )
    SELECT p.id AS piso_id, p.nombre AS piso, round(m.ancho::numeric, 1) AS ancho,
           round(m.alto::numeric, 1) AS alto, g.fid, g.nombre, g.tipo,
           ST_AsSVG(ST_Translate(g.g, -m.x0, -m.y1), 0, 1) AS d,
           round((ST_X(ST_PointOnSurface(g.g)) - m.x0)::numeric, 1) AS x,
           round((m.y1 - ST_Y(ST_PointOnSurface(g.g)))::numeric, 1) AS y
    FROM girados g JOIN marcos m ON m.piso_id = g.piso_id JOIN instituto.pisos p ON p.id = g.piso_id
    ORDER BY p.orden, p.id, g.orden, g.fid
    """
)

_HISTORIAL = text(
    """
    SELECT id, accion, antes - 'geom' AS antes, despues - 'geom' AS despues,
           (antes->>'geom') IS DISTINCT FROM (despues->>'geom') AS cambio_trazo, quien, origen, cuando
    FROM instituto.espacios_historial WHERE espacio_fid = :fid ORDER BY cuando DESC, id DESC
    """
)


def _no_encontrado(que: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{que} no encontrado")


def _firmar(db: Session, actor: str) -> None:
    db.execute(text("SELECT set_config('instituto.actor', :actor, true)"), {"actor": actor})
    db.execute(text("SELECT set_config('instituto.origen', 'mariachi', true)"))


def listar(db: Session) -> list[dict[str, Any]]:
    return [dict(fila) for fila in db.execute(_LISTA).mappings()]


def pisos(db: Session) -> list[dict[str, Any]]:
    return [dict(fila) for fila in db.execute(_PISOS).mappings()]


def plano(db: Session) -> dict[str, list[dict[str, Any]]]:
    por_piso: dict[int, dict[str, Any]] = {}
    for fila in db.execute(_PLANO, {"tolerancia": TOLERANCIA_PLANO}).mappings():
        piso = por_piso.setdefault(
            fila["piso_id"],
            {
                "id": fila["piso_id"],
                "nombre": fila["piso"],
                "ancho": float(fila["ancho"]),
                "alto": float(fila["alto"]),
                "espacios": [],
            },
        )
        piso["espacios"].append(
            {
                "id": fila["fid"],
                "nombre": fila["nombre"],
                "tipo": fila["tipo"],
                "d": fila["d"],
                "x": float(fila["x"]),
                "y": float(fila["y"]),
            }
        )
    return {"pisos": list(por_piso.values())}


def editar(db: Session, fid: int, cambios: dict[str, Any], actor: str) -> dict[str, Any]:
    campos = {campo: valor for campo, valor in cambios.items() if campo in EDITABLES}
    if not campos:
        return obtener(db, fid)
    asignaciones = ", ".join(f"{campo} = :{campo}" for campo in campos)
    _firmar(db, actor)
    resultado = db.execute(
        text(f"UPDATE instituto.espacios SET {asignaciones} WHERE fid = :fid"), {**campos, "fid": fid}
    )
    if resultado.rowcount == 0:
        db.rollback()
        raise _no_encontrado("Espacio")
    db.commit()
    return obtener(db, fid)


def obtener(db: Session, fid: int) -> dict[str, Any]:
    for fila in listar(db):
        if fila["fid"] == fid:
            return fila
    raise _no_encontrado("Espacio")


def historial(db: Session, fid: int) -> list[dict[str, Any]]:
    return [dict(fila) for fila in db.execute(_HISTORIAL, {"fid": fid}).mappings()]


def restaurar(db: Session, fid: int, historial_id: int, actor: str) -> dict[str, Any]:
    version = db.execute(
        text(
            "SELECT antes, despues FROM instituto.espacios_historial "
            "WHERE id = :id AND espacio_fid = :fid"
        ),
        {"id": historial_id, "fid": fid},
    ).first()
    if version is None or version.despues is None:
        raise _no_encontrado("Versión")
    _firmar(db, actor)
    resultado = db.execute(
        text(
            """
            UPDATE instituto.espacios e SET
                nombre = v.nombre, tipo = v.tipo, piso_id = v.piso_id, incluir = v.incluir,
                aproximado = v.aproximado, orden = v.orden, geom = v.geom
            FROM jsonb_populate_record(NULL::instituto.espacios, CAST(:fila AS jsonb)) v
            WHERE e.fid = :fid
            """
        ),
        {"fila": _json(version.despues), "fid": fid},
    )
    if resultado.rowcount == 0:
        db.rollback()
        raise _no_encontrado("Espacio")
    db.commit()
    return obtener(db, fid)


def _json(valor: Any) -> str:
    return valor if isinstance(valor, str) else json.dumps(valor)
