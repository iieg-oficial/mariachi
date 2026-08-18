from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session

EVENTO_VERIFICACION = "Apertura con verificación normal"
EVENTO_SUPERUSUARIO = "Apertura de puerta de superusuario"

# Los dos son marcaje real de una persona. Quien tiene perfil de superusuario en
# el biometrico NUNCA genera el evento normal, asi que filtrar solo por el primero
# deja fuera a esas personas por completo: 6 personas y 4,915 eventos al 2026-08.
EVENTOS_ASISTENCIA = [EVENTO_VERIFICACION, EVENTO_SUPERUSUARIO]

MEDIO_HUELLA = "Solo Huella"
MEDIO_TARJETA = "Solo Tarjeta"
MEDIO_SUPERUSUARIO = "Superusuario"

# Medios cuyo registro cierra la jornada de forma confiable: sobre estos se mide
# la jornada tipica. La tarjeta queda fuera porque deja 1 de cada 6 sin salida.
MEDIOS_CONFIABLES = [MEDIO_HUELLA, MEDIO_SUPERUSUARIO]

ZONA = ZoneInfo("America/Mexico_City")

JORNADA_MAX_HORAS = 16
COBERTURA_MINIMA = 0.6
UMBRAL_INCOMPLETO = 40

JORNADAS = """
    SELECT pin,
           event_time::date AS dia,
           min(event_time) FILTER (WHERE direccion = 'entrada') AS entrada,
           max(event_time) FILTER (WHERE direccion = 'salida') AS salida,
           (array_agg(
                CASE WHEN evento = :superusuario THEN :medio_super ELSE verificacion END
                ORDER BY event_time
            ) FILTER (WHERE direccion = 'entrada'))[1] AS medio
    FROM vine.eventos
    WHERE evento = ANY(:eventos) AND event_time >= :desde
    GROUP BY 1, 2
"""

_HORAS = "extract(epoch FROM salida - entrada) / 3600"

_COMPLETAS = f"""
    SELECT pin, dia, entrada, salida, medio, {_HORAS} AS horas
    FROM jornadas
    WHERE entrada IS NOT NULL AND salida IS NOT NULL AND salida > entrada
      AND {_HORAS} <= :max_horas
"""

DIAS_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
}


def _hoy() -> date:
    return datetime.now(ZONA).date()


def _desde(dias: int) -> date:
    return _hoy() - timedelta(days=dias)


def parametros(dias: int, **extra: Any) -> dict[str, Any]:
    return {
        "eventos": EVENTOS_ASISTENCIA,
        "desde": _desde(dias),
        "hoy": _hoy(),
        "max_horas": JORNADA_MAX_HORAS,
        "superusuario": EVENTO_SUPERUSUARIO,
        "medio_super": MEDIO_SUPERUSUARIO,
        **extra,
    }


def consultar(db: Session, sql: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    return [dict(row) for row in db.execute(text(sql), params).mappings().all()]


def panorama(db: Session, dias: int = 30) -> dict[str, Any]:
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        completas AS ({_COMPLETAS})
        SELECT
            (SELECT round(
                percentile_cont(0.5) WITHIN GROUP (ORDER BY horas)::numeric, 2
             ) FROM completas WHERE medio = ANY(:confiables)) AS jornada_mediana,
            (SELECT count(*) FROM completas WHERE medio = ANY(:confiables)) AS jornadas_huella,
            (SELECT count(DISTINCT pin) FROM completas WHERE medio = ANY(:confiables)) AS personas_huella,
            (SELECT round(avg(horas)::numeric, 2) FROM completas) AS jornada_promedio,
            (SELECT round(max(horas)::numeric, 2) FROM completas WHERE medio = ANY(:confiables)) AS jornada_mas_larga,
            (SELECT count(*) FROM completas) AS jornadas_completas,
            (SELECT count(DISTINCT pin) FROM jornadas WHERE dia = :hoy) AS activas_hoy,
            (SELECT round(avg(personas)::numeric, 1) FROM (
                SELECT dia, count(DISTINCT pin) AS personas FROM jornadas
                WHERE extract(isodow FROM dia) < 6 GROUP BY dia) t) AS promedio_diario,
            (SELECT count(*) FROM vine.personas p WHERE NOT (p.departamento ILIKE '%%(Bajas)%%' OR p.departamento = 'Bajas')) AS personas_registradas,
            (SELECT count(DISTINCT pin) FROM jornadas) AS personas_activas,
            (SELECT round(
                100.0 * (SELECT count(*) FROM completas)
                      / nullif(count(*) FILTER (WHERE entrada IS NOT NULL), 0), 1
             ) FROM jornadas) AS cobertura
    """
    filas = consultar(db, sql, parametros(dias, confiables=MEDIOS_CONFIABLES))
    resumen = filas[0] if filas else {}
    resumen["dias"] = dias
    return resumen


def comparativa_medios(db: Session, dias: int = 30) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        completas AS ({_COMPLETAS})
        SELECT j.medio,
               count(DISTINCT j.pin) AS personas,
               count(*) AS dias,
               count(*) FILTER (WHERE j.salida IS NULL) AS sin_salida,
               round(100.0 * count(*) FILTER (WHERE j.salida IS NOT NULL) / count(*), 1) AS cobertura,
               (SELECT round(
                    percentile_cont(0.5) WITHIN GROUP (ORDER BY c.horas)::numeric, 2
                ) FROM completas c WHERE c.medio = j.medio) AS jornada_mediana
        FROM jornadas j
        WHERE j.entrada IS NOT NULL AND j.medio IS NOT NULL
        GROUP BY 1 ORDER BY 3 DESC
    """
    return consultar(db, sql, parametros(dias))


def ritmo_horario(db: Session, dias: int = 30) -> list[dict[str, Any]]:
    sql = """
        SELECT extract(hour FROM event_time)::int AS hora,
               count(*) FILTER (WHERE direccion = 'entrada') AS entradas,
               count(*) FILTER (WHERE direccion = 'salida') AS salidas
        FROM vine.eventos
        WHERE evento = ANY(:eventos) AND event_time >= :desde
        GROUP BY 1 ORDER BY 1
    """
    return consultar(db, sql, parametros(dias))


def ritmo_semanal(db: Session, dias: int = 365) -> list[dict[str, Any]]:
    sql = """
        SELECT extract(isodow FROM dia)::int AS dia_semana,
               count(*) AS asistencias,
               round(avg(personas)::numeric, 1) AS personas_promedio
        FROM (
            SELECT event_time::date AS dia, count(DISTINCT pin) AS personas
            FROM vine.eventos
            WHERE evento = ANY(:eventos) AND event_time >= :desde
            GROUP BY 1
        ) t GROUP BY 1 ORDER BY 1
    """
    filas = consultar(db, sql, parametros(dias))
    for fila in filas:
        fila["nombre"] = DIAS_SEMANA.get(fila["dia_semana"], "")
    return filas


def tendencia_mensual(db: Session, meses: int = 36) -> list[dict[str, Any]]:
    sql = """
        SELECT to_char(date_trunc('month', event_time), 'YYYY-MM') AS mes,
               count(DISTINCT (pin, event_time::date)) AS asistencias,
               count(DISTINCT pin) AS personas
        FROM vine.eventos
        WHERE evento = ANY(:eventos) AND event_time >= :desde
        GROUP BY 1 ORDER BY 1
    """
    return consultar(db, sql, parametros(meses * 31))


def uso_por_punto(db: Session, dias: int = 30) -> list[dict[str, Any]]:
    sql = """
        SELECT coalesce(punto, 'sin punto') AS punto,
               count(*) FILTER (WHERE direccion = 'entrada') AS entradas,
               count(*) FILTER (WHERE direccion = 'salida') AS salidas,
               count(*) AS total
        FROM vine.eventos
        WHERE evento = ANY(:eventos) AND event_time >= :desde
        GROUP BY 1 ORDER BY 4 DESC
    """
    return consultar(db, sql, parametros(dias))


def ranking_horas(db: Session, dias: int = 30, limite: int = 10) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        completas AS ({_COMPLETAS}),
        base AS (
            SELECT j.pin,
                   count(*) AS dias_asistidos,
                   count(c.dia) AS dias,
                   coalesce(sum(c.horas), 0) AS horas,
                   mode() WITHIN GROUP (ORDER BY j.medio) AS medio
            FROM jornadas j
            LEFT JOIN completas c ON c.pin = j.pin AND c.dia = j.dia
            WHERE j.entrada IS NOT NULL
            GROUP BY 1
        )
        SELECT b.pin,
               trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')) AS nombre,
               p.departamento,
               round(b.horas::numeric, 1) AS horas_totales,
               round((b.horas / b.dias)::numeric, 2) AS horas_promedio,
               b.dias,
               b.dias_asistidos,
               b.medio,
               round(100.0 * b.dias / b.dias_asistidos)::int AS cobertura
        FROM base b
        LEFT JOIN vine.personas p ON p.pin = b.pin
        WHERE b.dias > 0 AND b.dias >= :cobertura_minima * b.dias_asistidos
        ORDER BY horas_totales DESC LIMIT :limite
    """
    return consultar(db, sql, parametros(dias, limite=limite, cobertura_minima=COBERTURA_MINIMA))


def registro_incompleto(db: Session, dias: int = 30, limite: int = 10) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({JORNADAS})
        SELECT j.pin,
               trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, '')) AS nombre,
               p.departamento,
               count(*) AS dias_asistidos,
               count(*) FILTER (WHERE j.salida IS NULL) AS sin_salida,
               mode() WITHIN GROUP (ORDER BY j.medio) AS medio,
               round(100.0 * count(*) FILTER (WHERE j.salida IS NULL) / count(*))::int AS porcentaje
        FROM jornadas j
        LEFT JOIN vine.personas p ON p.pin = j.pin
        WHERE j.entrada IS NOT NULL
        GROUP BY 1, 2, 3
        HAVING count(*) >= 5
           AND 100 * count(*) FILTER (WHERE j.salida IS NULL) >= :umbral * count(*)
        ORDER BY porcentaje DESC, sin_salida DESC LIMIT :limite
    """
    return consultar(db, sql, parametros(dias, limite=limite, umbral=UMBRAL_INCOMPLETO))


def madrugadores(db: Session, dias: int = 30, limite: int = 10) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({JORNADAS})
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
    return consultar(db, sql, parametros(dias, limite=limite))


def rachas(db: Session, dias: int = 90, limite: int = 10) -> list[dict[str, Any]]:
    sql = """
        WITH habiles AS (
            SELECT d::date AS dia, row_number() OVER (ORDER BY d) AS n
            FROM generate_series(CAST(:desde AS date), CAST(:hoy AS date), interval '1 day') d
            WHERE extract(isodow FROM d) < 6
        ),
        asistencias AS (
            SELECT DISTINCT pin, event_time::date AS dia
            FROM vine.eventos
            WHERE evento = ANY(:eventos) AND event_time >= :desde
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
    return consultar(db, sql, parametros(dias, limite=limite))


def calidad(db: Session, dias: int = 30) -> dict[str, Any]:
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        por_persona AS (
            SELECT pin, count(*) AS dias,
                   count(*) FILTER (WHERE salida IS NULL) AS sin_salida
            FROM jornadas WHERE entrada IS NOT NULL GROUP BY 1
        )
        SELECT count(*) AS persona_dias,
               count(*) FILTER (WHERE salida IS NULL) AS sin_salida,
               count(*) FILTER (WHERE entrada IS NULL) AS sin_entrada,
               count(*) FILTER (WHERE entrada IS NOT NULL AND salida IS NOT NULL) AS completas,
               count(*) FILTER (
                   WHERE entrada IS NOT NULL AND salida IS NOT NULL
                     AND ({_HORAS} > :max_horas OR salida <= entrada)
               ) AS jornadas_descartadas,
               (SELECT count(*) FROM vine.personas p
                 WHERE NOT (p.departamento ILIKE '%%(Bajas)%%' OR p.departamento = 'Bajas')
                   AND NOT EXISTS (SELECT 1 FROM vine.eventos e WHERE e.pin = p.pin)) AS nunca_registran,
               (SELECT count(*) FROM por_persona
                 WHERE dias >= 5 AND 100 * sin_salida >= :umbral * dias) AS personas_incompletas,
               (SELECT coalesce(sum(sin_salida), 0) FROM por_persona
                 WHERE dias >= 5 AND 100 * sin_salida >= :umbral * dias) AS sin_salida_concentrado
        FROM jornadas
    """
    filas = consultar(db, sql, parametros(dias, umbral=UMBRAL_INCOMPLETO))
    resumen = filas[0] if filas else {}
    total = resumen.get("persona_dias") or 0
    incompletas = (resumen.get("sin_salida") or 0) + (resumen.get("sin_entrada") or 0)
    resumen["porcentaje_incompletas"] = round(incompletas * 100 / total, 1) if total else 0.0
    sin_salida = resumen.get("sin_salida") or 0
    concentrado = resumen.get("sin_salida_concentrado") or 0
    resumen["porcentaje_concentrado"] = (
        round(concentrado * 100 / sin_salida, 1) if sin_salida else 0.0
    )
    return resumen


def sincronizacion(db: Session) -> dict[str, Any]:
    sql = """
        SELECT count(*) AS eventos,
               max(id) AS ultimo_id,
               max(event_time) AS ultimo_evento,
               max(sincronizado_at) AS ultima_sincronizacion
        FROM vine.eventos
    """
    filas = consultar(db, sql, {})
    return filas[0] if filas else {}
