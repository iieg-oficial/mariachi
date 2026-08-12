from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

EVENTO_VERIFICACION = "Apertura con verificación normal"

_JORNADAS = """
    SELECT pin,
           event_time::date AS dia,
           min(event_time) FILTER (WHERE direccion = 'entrada') AS entrada,
           max(event_time) FILTER (WHERE direccion = 'salida') AS salida
    FROM vine.eventos
    WHERE evento = :evento AND event_time >= :desde
    GROUP BY 1, 2
"""

_HORAS = "extract(epoch FROM salida - entrada) / 3600"

DIAS_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
}


def _desde(dias: int) -> date:
    return date.today() - timedelta(days=dias)


def _params(dias: int, **extra: Any) -> dict[str, Any]:
    return {"evento": EVENTO_VERIFICACION, "desde": _desde(dias), **extra}


def _filas(db: Session, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(text(sql), params).mappings().all()]


def panorama(db: Session, dias: int = 30) -> dict[str, Any]:
    sql = f"""
        WITH jornadas AS ({_JORNADAS}),
        completas AS (
            SELECT *, {_HORAS} AS horas FROM jornadas
            WHERE entrada IS NOT NULL AND salida IS NOT NULL AND salida > entrada
        )
        SELECT
            (SELECT round(avg(horas)::numeric, 2) FROM completas) AS jornada_promedio,
            (SELECT round(max(horas)::numeric, 2) FROM completas) AS jornada_mas_larga,
            (SELECT count(*) FROM completas) AS jornadas_completas,
            (SELECT count(DISTINCT pin) FROM jornadas WHERE dia = current_date) AS activas_hoy,
            (SELECT round(avg(personas)::numeric, 1) FROM (
                SELECT dia, count(DISTINCT pin) AS personas FROM jornadas
                WHERE extract(isodow FROM dia) < 6 GROUP BY dia) t) AS promedio_diario,
            (SELECT count(*) FROM vine.personas) AS personas_registradas,
            (SELECT count(DISTINCT pin) FROM jornadas) AS personas_activas
    """
    filas = _filas(db, sql, _params(dias))
    resumen = filas[0] if filas else {}
    resumen["dias"] = dias
    return resumen


def ritmo_horario(db: Session, dias: int = 30) -> list[dict[str, Any]]:
    sql = """
        SELECT extract(hour FROM event_time)::int AS hora,
               count(*) FILTER (WHERE direccion = 'entrada') AS entradas,
               count(*) FILTER (WHERE direccion = 'salida') AS salidas
        FROM vine.eventos
        WHERE evento = :evento AND event_time >= :desde
        GROUP BY 1 ORDER BY 1
    """
    return _filas(db, sql, _params(dias))


def ritmo_semanal(db: Session, dias: int = 365) -> list[dict[str, Any]]:
    sql = """
        SELECT extract(isodow FROM dia)::int AS dia_semana,
               count(*) AS asistencias,
               round(avg(personas)::numeric, 1) AS personas_promedio
        FROM (
            SELECT event_time::date AS dia, count(DISTINCT pin) AS personas
            FROM vine.eventos
            WHERE evento = :evento AND event_time >= :desde
            GROUP BY 1
        ) t GROUP BY 1 ORDER BY 1
    """
    filas = _filas(db, sql, _params(dias))
    for fila in filas:
        fila["nombre"] = DIAS_SEMANA.get(fila["dia_semana"], "")
    return filas


def tendencia_mensual(db: Session, meses: int = 36) -> list[dict[str, Any]]:
    sql = """
        SELECT to_char(date_trunc('month', event_time), 'YYYY-MM') AS mes,
               count(DISTINCT (pin, event_time::date)) AS asistencias,
               count(DISTINCT pin) AS personas
        FROM vine.eventos
        WHERE evento = :evento AND event_time >= :desde
        GROUP BY 1 ORDER BY 1
    """
    return _filas(db, sql, _params(meses * 31))


def uso_por_punto(db: Session, dias: int = 30) -> list[dict[str, Any]]:
    sql = """
        SELECT coalesce(punto, 'sin punto') AS punto,
               count(*) FILTER (WHERE direccion = 'entrada') AS entradas,
               count(*) FILTER (WHERE direccion = 'salida') AS salidas,
               count(*) AS total
        FROM vine.eventos
        WHERE evento = :evento AND event_time >= :desde
        GROUP BY 1 ORDER BY 4 DESC
    """
    return _filas(db, sql, _params(dias))


def ranking_horas(db: Session, dias: int = 30, limite: int = 10) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({_JORNADAS}),
        completas AS (
            SELECT pin, dia, {_HORAS} AS horas FROM jornadas
            WHERE entrada IS NOT NULL AND salida IS NOT NULL AND salida > entrada
        )
        SELECT c.pin,
               trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')) AS nombre,
               p.departamento,
               round(sum(c.horas)::numeric, 1) AS horas_totales,
               round(avg(c.horas)::numeric, 2) AS horas_promedio,
               count(*) AS dias
        FROM completas c
        LEFT JOIN vine.personas p ON p.pin = c.pin
        GROUP BY 1, 2, 3 ORDER BY horas_totales DESC LIMIT :limite
    """
    return _filas(db, sql, _params(dias, limite=limite))


def madrugadores(db: Session, dias: int = 30, limite: int = 10) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({_JORNADAS})
        SELECT j.pin,
               trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')) AS nombre,
               to_char(
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI'
               ) AS entrada_mediana,
               count(*) AS dias
        FROM jornadas j
        LEFT JOIN vine.personas p ON p.pin = j.pin
        WHERE entrada IS NOT NULL
        GROUP BY 1, 2 HAVING count(*) >= 5
        ORDER BY percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time) LIMIT :limite
    """
    return _filas(db, sql, _params(dias, limite=limite))


def rachas(db: Session, dias: int = 90, limite: int = 10) -> list[dict[str, Any]]:
    sql = """
        WITH habiles AS (
            SELECT d::date AS dia, row_number() OVER (ORDER BY d) AS n
            FROM generate_series(CAST(:desde AS date), current_date, interval '1 day') d
            WHERE extract(isodow FROM d) < 6
        ),
        asistencias AS (
            SELECT DISTINCT pin, event_time::date AS dia
            FROM vine.eventos
            WHERE evento = :evento AND event_time >= :desde
        ),
        grupos AS (
            SELECT a.pin, h.n - row_number() OVER (PARTITION BY a.pin ORDER BY h.n) AS bloque
            FROM asistencias a JOIN habiles h ON h.dia = a.dia
        )
        SELECT g.pin,
               trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')) AS nombre,
               count(*) AS racha
        FROM grupos g
        LEFT JOIN vine.personas p ON p.pin = g.pin
        GROUP BY g.pin, g.bloque, p.nombre, p.apellidos
        ORDER BY racha DESC LIMIT :limite
    """
    return _filas(db, sql, _params(dias, limite=limite))


def calidad(db: Session, dias: int = 30) -> dict[str, Any]:
    sql = f"""
        WITH jornadas AS ({_JORNADAS})
        SELECT count(*) AS persona_dias,
               count(*) FILTER (WHERE salida IS NULL) AS sin_salida,
               count(*) FILTER (WHERE entrada IS NULL) AS sin_entrada,
               count(*) FILTER (WHERE entrada IS NOT NULL AND salida IS NOT NULL) AS completas,
               (SELECT count(*) FROM vine.personas p
                WHERE NOT EXISTS (SELECT 1 FROM vine.eventos e WHERE e.pin = p.pin)) AS nunca_registran
        FROM jornadas
    """
    filas = _filas(db, sql, _params(dias))
    resumen = filas[0] if filas else {}
    total = resumen.get("persona_dias") or 0
    incompletas = (resumen.get("sin_salida") or 0) + (resumen.get("sin_entrada") or 0)
    resumen["porcentaje_incompletas"] = round(incompletas * 100 / total, 1) if total else 0.0
    return resumen


def sincronizacion(db: Session) -> dict[str, Any]:
    sql = """
        SELECT count(*) AS eventos,
               max(id) AS ultimo_id,
               max(event_time) AS ultimo_evento,
               max(sincronizado_at) AS ultima_sincronizacion
        FROM vine.eventos
    """
    filas = _filas(db, sql, {})
    return filas[0] if filas else {}
