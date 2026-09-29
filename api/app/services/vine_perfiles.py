from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.services.vine_incidencias import claves_por_efecto
from app.services.vine_stats import DIAS_SEMANA, JORNADAS, consultar, parametros


def _lunes_numero(anio: int, mes: int, cual: int) -> date:
    primero = date(anio, mes, 1)
    primer_lunes = primero + timedelta(days=(7 - primero.weekday()) % 7)
    return primer_lunes + timedelta(weeks=cual - 1)


def festivos_de_ley(anio: int) -> list[date]:
    """Descansos obligatorios del articulo 74 de la LFT.

    No incluye los que cada institucion agrega por su cuenta (Semana Santa,
    12 de diciembre, periodo vacacional): esos van en `FESTIVOS_INSTITUTO`.
    """
    return [
        date(anio, 1, 1),
        _lunes_numero(anio, 2, 1),
        _lunes_numero(anio, 3, 3),
        date(anio, 5, 1),
        date(anio, 9, 16),
        _lunes_numero(anio, 11, 3),
        date(anio, 12, 25),
    ]


FESTIVOS_INSTITUTO: list[date] = [
    date(2026, 1, 2),
    date(2026, 1, 5),
    date(2026, 1, 6),
    date(2026, 4, 2),
    date(2026, 4, 3),
    date(2026, 5, 5),
    date(2026, 6, 11),
    date(2026, 6, 18),
    date(2026, 6, 23),
    date(2026, 6, 26),
]


def festivos(desde: date, hasta: date) -> list[date]:
    dias: list[date] = []
    for anio in range(desde.year, hasta.year + 1):
        dias.extend(festivos_de_ley(anio))
    dias.extend(FESTIVOS_INSTITUTO)
    return sorted({d for d in dias if desde <= d <= hasta})


HORARIOS = (
    {"clave": "8-16", "nombre": "8 a 4", "entrada": 8, "salida": 16},
    {"clave": "9-17", "nombre": "9 a 5", "entrada": 9, "salida": 17},
    {"clave": "otro", "nombre": "Otro", "entrada": None, "salida": None},
)

TOLERANCIA_MINUTOS = 15
JORNADA_ESPERADA = 8

_ASIGNA_HORARIO = """
    CASE
        WHEN m >= TIME '06:00' AND m < TIME '08:30' THEN '8-16'
        WHEN m >= TIME '08:30' AND m < TIME '10:30' THEN '9-17'
        ELSE 'otro'
    END
"""

DEPTO = "coalesce(f.departamento, p.departamento)"

ES_BAJA = f"""(
    CASE WHEN f.activo IS NOT NULL THEN NOT f.activo
         ELSE ({DEPTO} ILIKE '%%(Bajas)%%' OR {DEPTO} = 'Bajas') END
)"""

VINCULO = f"""
    coalesce(f.vinculo, CASE
        WHEN {DEPTO} IS NULL THEN 'Sin asignar'
        WHEN {DEPTO} ILIKE '%%(Bajas)%%' OR {DEPTO} = 'Bajas' THEN 'Baja'
        WHEN {DEPTO} ILIKE 'Direcci%%' OR {DEPTO} ILIKE 'Dir de%%'
             OR {DEPTO} ILIKE 'Organo%%' THEN 'Plantilla'
        WHEN {DEPTO} ILIKE '%%Prácticas%%' THEN 'Prácticas profesionales'
        WHEN {DEPTO} ILIKE '%%Servicio Social%%' THEN 'Servicio social'
        WHEN {DEPTO} ILIKE '%%Delfín%%' THEN 'Delfín'
        WHEN {DEPTO} ILIKE '%%Asimilados%%' THEN 'Asimilados a salarios'
        WHEN {DEPTO} ILIKE '%%PET%%' THEN 'Empleo temporal'
        ELSE {DEPTO}
    END)
"""


def por_vinculo(db: Session, dias: int = 30) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({JORNADAS})
        SELECT {VINCULO} AS vinculo,
               count(DISTINCT j.pin) AS personas,
               count(*) AS dias,
               count(*) FILTER (WHERE j.salida IS NULL) AS sin_salida,
               count(DISTINCT j.pin) FILTER (WHERE j.medio = 'Solo Huella') AS con_huella,
               round(100.0 * count(*) FILTER (WHERE j.salida IS NOT NULL) / count(*), 1) AS cobertura
        FROM jornadas j
        LEFT JOIN vine.personas p ON p.pin = j.pin
        LEFT JOIN vine.personas_ficha f ON f.pin = j.pin
        WHERE j.entrada IS NOT NULL
        GROUP BY 1 ORDER BY 3 DESC
    """
    return consultar(db, sql, parametros(dias))


def personal(db: Session, dias: int = 90, incluir_bajas: bool = False) -> list[dict[str, Any]]:
    filtro_bajas = "" if incluir_bajas else f"WHERE NOT {ES_BAJA}"
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        con_entrada AS (
            SELECT pin, dia, entrada, salida FROM jornadas WHERE entrada IS NOT NULL
        ),
        habitual AS (
            SELECT pin,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time) AS m,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY salida::time)
                       FILTER (WHERE salida IS NOT NULL) AS s
            FROM con_entrada GROUP BY 1
        ),
        habiles AS (
            SELECT count(*) AS total FROM generate_series(
                CAST(:desde AS date), CAST(:hoy AS date), interval '1 day') d
            WHERE extract(isodow FROM d) < 6 AND d::date <> ALL(:festivos)
        ),
        dias_incidencia AS (
            SELECT i.pin, d::date AS dia, i.tipo
            FROM vine.incidencias i,
                 generate_series(greatest(i.desde, CAST(:desde AS date)),
                                 least(i.hasta, CAST(:hoy AS date)),
                                 interval '1 day') d
            WHERE extract(isodow FROM d) < 6 AND d::date <> ALL(:festivos)
        ),
        justificados AS (
            SELECT pin,
                   count(DISTINCT dia) FILTER (WHERE tipo = ANY(:descuentan)) AS descontados,
                   count(DISTINCT dia) FILTER (
                       WHERE tipo = ANY(:presentes)
                         AND NOT EXISTS (SELECT 1 FROM con_entrada c
                                          WHERE c.pin = dias_incidencia.pin AND c.dia = dias_incidencia.dia)
                   ) AS presentes
            FROM dias_incidencia GROUP BY 1
        ),
        agg AS (
            SELECT c.pin,
                   count(*) AS dias,
                   count(*) FILTER (WHERE c.salida IS NOT NULL) AS medibles,
                   min(c.dia) AS primer_dia,
                   max(c.dia) AS ultimo_dia,
                   sum(extract(epoch FROM c.salida - c.entrada) / 3600)
                       FILTER (WHERE c.salida > c.entrada) AS horas
            FROM con_entrada c GROUP BY 1
        ),
        medios AS (
            SELECT pin, mode() WITHIN GROUP (ORDER BY medio) AS medio
            FROM jornadas WHERE medio IS NOT NULL GROUP BY 1
        )
        SELECT p.pin,
               coalesce(
                   nullif(trim(coalesce(f.nombre, '') || ' ' || coalesce(f.apellidos, '')), ''),
                   trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellidos, ''))
               ) AS nombre,
               coalesce(f.email, p.email) AS email,
               coalesce(f.telefono, p.telefono) AS telefono,
               f.extension,
               {DEPTO} AS departamento,
               coalesce(f.puesto, p.puesto) AS puesto,
               f.foto_url,
               coalesce(f.cumpleanos, p.cumpleanos) AS cumpleanos,
               coalesce(f.fecha_ingreso, p.fecha_ingreso) AS fecha_ingreso,
               p.alta_sistema,
               f.notas,
               (f.pin IS NOT NULL) AS editada,
               {ES_BAJA} AS baja,
               {VINCULO} AS vinculo,
               m.medio,
               coalesce(f.horario,
                        CASE WHEN h.m IS NULL THEN NULL ELSE {_ASIGNA_HORARIO} END) AS horario,
               to_char(h.m, 'HH24:MI') AS entrada_habitual,
               to_char(h.s, 'HH24:MI') AS salida_habitual,
               coalesce(a.dias, 0) AS dias,
               coalesce(a.medibles, 0) AS medibles,
               greatest(0, (SELECT total FROM habiles) - coalesce(x.descontados, 0)) AS habiles,
               coalesce(x.descontados, 0) AS dias_justificados,
               coalesce(a.dias, 0) + coalesce(x.presentes, 0) AS asistidos,
               least(100, round(100.0 * (coalesce(a.dias, 0) + coalesce(x.presentes, 0))
                     / nullif(greatest(0, (SELECT total FROM habiles)
                                          - coalesce(x.descontados, 0)), 0))::int) AS asistencia,
               CASE WHEN coalesce(a.dias, 0) = 0 THEN NULL
                    ELSE round(100.0 * a.medibles / a.dias)::int END AS cobertura,
               round(a.horas::numeric, 1) AS horas,
               a.primer_dia,
               a.ultimo_dia
        FROM vine.personas p
        LEFT JOIN vine.personas_ficha f ON f.pin = p.pin
        LEFT JOIN agg a ON a.pin = p.pin
        LEFT JOIN habitual h ON h.pin = p.pin
        LEFT JOIN medios m ON m.pin = p.pin
        LEFT JOIN justificados x ON x.pin = p.pin
        {filtro_bajas}
        ORDER BY coalesce(a.dias, 0) DESC, nombre
    """
    params = parametros(dias)
    params["festivos"] = festivos(params["desde"], params["hoy"])
    params["descuentan"] = claves_por_efecto(db, "descuenta")
    params["presentes"] = claves_por_efecto(db, "presente")
    return consultar(db, sql, params)


def apego_horario(db: Session, dias: int = 90) -> list[dict[str, Any]]:
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        con_entrada AS (
            SELECT pin, dia, entrada, salida FROM jornadas WHERE entrada IS NOT NULL
        ),
        habitual AS (
            SELECT pin, percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time) AS m
            FROM con_entrada GROUP BY 1
        ),
        asignadas AS (
            SELECT c.*, {_ASIGNA_HORARIO} AS horario
            FROM con_entrada c JOIN habitual h ON h.pin = c.pin
        )
        SELECT horario,
               count(DISTINCT pin) AS personas,
               count(*) AS dias,
               CASE WHEN horario = 'otro' THEN NULL ELSE round(100.0 * count(*) FILTER (
                   WHERE entrada::time <= make_time(
                       CASE WHEN horario = '8-16' THEN 8 ELSE 9 END, :tolerancia, 0)
               ) / count(*), 1) END AS puntualidad,
               to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI') AS entrada_mediana,
               to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY salida::time)
                       FILTER (WHERE salida IS NOT NULL), 'HH24:MI') AS salida_mediana
        FROM asignadas GROUP BY 1 ORDER BY 1
    """
    filas = consultar(db, sql, parametros(dias, tolerancia=TOLERANCIA_MINUTOS))
    etiquetas = {h["clave"]: h for h in HORARIOS}
    for fila in filas:
        horario = etiquetas.get(fila["horario"], {})
        fila["nombre"] = horario.get("nombre", fila["horario"])
        entrada = horario.get("entrada")
        salida = horario.get("salida")
        fila["entrada_oficial"] = f"{entrada:02d}:00" if entrada else None
        fila["salida_oficial"] = f"{salida:02d}:00" if salida else None
    return filas


def asistencia_persona(db: Session, pin: str, dias: int = 90) -> dict[str, Any]:
    sql = f"""
        WITH jornadas AS ({JORNADAS}),
        mias AS (
            SELECT dia, entrada, salida, medio,
                   extract(epoch FROM salida - entrada) / 3600 AS horas
            FROM jornadas WHERE pin = :pin AND entrada IS NOT NULL
        ),
        habiles AS (
            SELECT count(*) AS total FROM generate_series(
                CAST(:desde AS date), CAST(:hoy AS date), interval '1 day') d
            WHERE extract(isodow FROM d) < 6 AND d::date <> ALL(:festivos)
        ),
        justificados AS (
            SELECT count(DISTINCT d::date) AS dias
            FROM vine.incidencias i,
                 generate_series(greatest(i.desde, CAST(:desde AS date)),
                                 least(i.hasta, CAST(:hoy AS date)),
                                 interval '1 day') d
            WHERE i.pin = :pin AND i.tipo = ANY(:descuentan)
              AND extract(isodow FROM d) < 6 AND d::date <> ALL(:festivos)
        )
        SELECT count(*) AS dias,
               count(*) FILTER (WHERE salida IS NOT NULL) AS medibles,
               (SELECT total FROM habiles) - (SELECT dias FROM justificados) AS habiles,
               (SELECT dias FROM justificados) AS justificados,
               to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI') AS entrada_mediana,
               to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY salida::time)
                       FILTER (WHERE salida IS NOT NULL), 'HH24:MI') AS salida_mediana,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY horas)
                     FILTER (WHERE salida IS NOT NULL)::numeric, 2) AS jornada_mediana,
               round(sum(horas) FILTER (WHERE salida IS NOT NULL)::numeric, 1) AS horas
        FROM mias
    """
    params = parametros(dias, pin=pin)
    params["festivos"] = festivos(params["desde"], params["hoy"])
    params["descuentan"] = claves_por_efecto(db, "descuenta")
    filas = consultar(db, sql, params)
    resumen = filas[0] if filas else {}

    sql_dias = f"""
        WITH jornadas AS ({JORNADAS})
        SELECT dia,
               to_char(entrada, 'HH24:MI') AS entrada,
               to_char(salida, 'HH24:MI') AS salida,
               round((extract(epoch FROM salida - entrada) / 3600)::numeric, 2) AS horas
        FROM jornadas WHERE pin = :pin AND entrada IS NOT NULL
        ORDER BY dia DESC LIMIT 60
    """
    resumen["dias_detalle"] = list(reversed(consultar(db, sql_dias, params)))

    sql_semana = f"""
        WITH jornadas AS ({JORNADAS})
        SELECT extract(isodow FROM dia)::int AS dia_semana,
               count(*) AS dias,
               to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI') AS entrada_mediana
        FROM jornadas WHERE pin = :pin AND entrada IS NOT NULL
        GROUP BY 1 ORDER BY 1
    """
    semana = consultar(db, sql_semana, params)
    for fila in semana:
        fila["nombre"] = DIAS_SEMANA.get(fila["dia_semana"], "")
    resumen["por_dia_semana"] = semana
    return resumen
