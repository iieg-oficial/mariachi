from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

LOTE = 5000

_engine = None

_PERSONAS = """
    SELECT p.pin, coalesce(p.name, '') AS nombre, p.last_name AS apellidos,
           nullif(p.email, '') AS email, d.name AS departamento, po.name AS puesto,
           p.hire_date::date AS fecha_ingreso, p.birthday::date AS cumpleanos,
           nullif(trim(p.mobile_phone), '') AS telefono,
           p.create_time::date AS alta_sistema
    FROM pers_person p
    LEFT JOIN pers_department d ON d.id = p.dept_id
    LEFT JOIN pers_position po ON po.id = p.position_id
    WHERE p.pin IS NOT NULL AND p.pin <> ''
"""

_COLUMNAS_EVENTO = """
    SELECT id, pin, event_time,
           CASE WHEN reader_name ILIKE '%%entrada%%' THEN 'entrada'
                WHEN reader_name ILIKE '%%salida%%' THEN 'salida' END AS direccion,
           event_point_name AS punto, reader_name AS lector, event_name AS evento,
           verify_mode_name AS verificacion, dev_alias AS dispositivo
    FROM acc_transaction
    WHERE pin IS NOT NULL AND pin <> ''
"""

_EVENTOS = _COLUMNAS_EVENTO + " AND id > :desde_id ORDER BY id LIMIT :lote"

_EVENTOS_POR_ID = _COLUMNAS_EVENTO + " AND id = ANY(:ids)"

_IDS_ORIGEN = "SELECT id FROM acc_transaction WHERE pin IS NOT NULL AND pin <> '' AND id <= :hasta"

_INSERTAR_EVENTO = """
    INSERT INTO vine.eventos
        (id, pin, event_time, direccion, punto, lector, evento, verificacion,
         dispositivo, tardio, sincronizado_at)
    VALUES (:id, :pin, :event_time, :direccion, :punto, :lector, :evento,
            :verificacion, :dispositivo, :tardio, now() AT TIME ZONE 'utc')
    ON CONFLICT (id) DO NOTHING
"""


class VineSyncError(RuntimeError):
    pass


def _biometrico():
    global _engine
    if _engine is None:
        if not settings.vine_biometrico_url:
            raise VineSyncError("VINE_BIOMETRICO_URL no esta configurado")
        _engine = create_engine(
            settings.vine_biometrico_url,
            pool_pre_ping=True,
            pool_size=2,
            max_overflow=2,
            isolation_level="AUTOCOMMIT",
            connect_args={"connect_timeout": settings.vine_biometrico_timeout},
        )
    return _engine


def _sincronizar_personas(origen, db: Session) -> int:
    filas = origen.execute(text(_PERSONAS)).mappings().all()
    for fila in filas:
        db.execute(
            text("""
                INSERT INTO vine.personas (
                    pin, nombre, apellidos, email, departamento, puesto,
                    fecha_ingreso, cumpleanos, telefono, alta_sistema, sincronizado_at
                )
                VALUES (
                    :pin, :nombre, :apellidos, :email, :departamento, :puesto,
                    :fecha_ingreso, :cumpleanos, :telefono, :alta_sistema,
                    now() AT TIME ZONE 'utc'
                )
                ON CONFLICT (pin) DO UPDATE SET
                    nombre = excluded.nombre, apellidos = excluded.apellidos,
                    email = excluded.email, departamento = excluded.departamento,
                    puesto = excluded.puesto, fecha_ingreso = excluded.fecha_ingreso,
                    cumpleanos = excluded.cumpleanos, telefono = excluded.telefono,
                    alta_sistema = excluded.alta_sistema,
                    sincronizado_at = excluded.sincronizado_at
            """),
            dict(fila),
        )
    db.commit()
    return len(filas)


def _sincronizar_eventos(origen, db: Session, desde_id: int) -> tuple[int, int]:
    copiados = 0
    ultimo = desde_id
    while True:
        filas = origen.execute(
            text(_EVENTOS), {"desde_id": ultimo, "lote": LOTE}
        ).mappings().all()
        if not filas:
            break
        for fila in filas:
            db.execute(text(_INSERTAR_EVENTO), {**fila, "tardio": False})
        db.commit()
        copiados += len(filas)
        ultimo = filas[-1]["id"]
        if len(filas) < LOTE:
            break
    return copiados, ultimo


def sincronizar(db: Session) -> dict[str, Any]:
    engine = _biometrico()
    desde_id = db.execute(text("SELECT coalesce(max(id), 0) FROM vine.eventos")).scalar() or 0
    try:
        with engine.connect() as origen:
            personas = _sincronizar_personas(origen, db)
            eventos, ultimo_id = _sincronizar_eventos(origen, db, desde_id)
    except VineSyncError:
        raise
    except Exception as exc:
        logger.error("vine: fallo la sincronizacion con el biometrico: %s", exc)
        raise VineSyncError("no se pudo leer el biometrico") from exc

    return {
        "personas": personas,
        "eventos_nuevos": eventos,
        "desde_id": desde_id,
        "ultimo_id": ultimo_id,
    }


def conciliar(db: Session) -> dict[str, Any]:
    engine = _biometrico()
    hasta = db.execute(text("SELECT coalesce(max(id), 0) FROM vine.eventos")).scalar() or 0
    locales = set(db.execute(text("SELECT id FROM vine.eventos")).scalars())
    try:
        with engine.connect() as origen:
            en_origen = origen.execute(text(_IDS_ORIGEN), {"hasta": hasta}).scalars().all()
            faltantes = sorted(set(en_origen) - locales)
            for inicio in range(0, len(faltantes), LOTE):
                filas = origen.execute(
                    text(_EVENTOS_POR_ID), {"ids": faltantes[inicio:inicio + LOTE]}
                ).mappings().all()
                for fila in filas:
                    db.execute(text(_INSERTAR_EVENTO), {**fila, "tardio": True})
                db.commit()
    except VineSyncError:
        raise
    except Exception as exc:
        logger.error("vine: fallo la conciliacion con el biometrico: %s", exc)
        raise VineSyncError("no se pudo conciliar con el biometrico") from exc

    if faltantes:
        logger.warning("vine: %s eventos tardios, ids %s", len(faltantes), faltantes[:50])
    return {
        "revisados": len(en_origen),
        "hasta_id": hasta,
        "tardios": len(faltantes),
        "ids": faltantes[:50],
    }
