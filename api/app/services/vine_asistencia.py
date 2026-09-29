from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from statistics import median
from typing import Any

from sqlalchemy.orm import Session

from app.services.vine_incidencias import claves_por_efecto, tipos
from app.services.vine_perfiles import TOLERANCIA_MINUTOS, festivos
from app.services.vine_stats import (
    DIAS_SEMANA,
    JORNADA_MAX_HORAS,
    JORNADAS,
    consultar,
    parametros,
)

DIAS_DETALLE = 60

_RESUMEN = f"""
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

_MARCAS = """
    SELECT event_time, direccion FROM vine.eventos
    WHERE pin = :pin AND evento = ANY(:eventos) AND event_time >= :desde
      AND direccion IS NOT NULL
    ORDER BY event_time
"""

_HORARIO_FICHA = """
    SELECT c.clave, c.nombre, c.entrada, c.salida
    FROM vine.personas_ficha f
    JOIN vine.catalogos c ON c.tipo = 'horario' AND c.clave = f.horario
    WHERE f.pin = :pin
"""

_HORARIOS = "SELECT clave, nombre, entrada, salida FROM vine.catalogos WHERE tipo = 'horario'"

_INCIDENCIAS = """
    SELECT desde, hasta, tipo FROM vine.incidencias
    WHERE pin = :pin AND hasta >= :desde AND desde <= :hoy
"""


def _minutos(inicio: datetime, fin: datetime) -> float:
    return max(0.0, (fin - inicio).total_seconds() / 60)


def _traslape(inicio: datetime, fin: datetime, desde: datetime, hasta: datetime) -> float:
    return _minutos(max(inicio, desde), min(fin, hasta))


def _hhmm(momento: datetime | time | None) -> str | None:
    return momento.strftime("%H:%M") if momento else None


def _horario(db: Session, pin: str, entradas: list[datetime]) -> dict[str, Any]:
    ficha = consultar(db, _HORARIO_FICHA, {"pin": pin})
    if ficha:
        return ficha[0]
    catalogo = {h["clave"]: h for h in consultar(db, _HORARIOS, {})}
    clave = "otro"
    if entradas:
        mediana = median(e.hour * 60 + e.minute for e in entradas)
        if 360 <= mediana < 510:
            clave = "8-16"
        elif 510 <= mediana < 630:
            clave = "9-17"
    return catalogo.get(clave, {"clave": clave, "nombre": clave, "entrada": None, "salida": None})


def _desglose(dia: date, marcas: list[tuple[datetime, str]], horario: dict[str, Any]) -> dict[str, Any]:
    entradas = [t for t, d in marcas if d == "entrada"]
    fila: dict[str, Any] = {
        "dia": dia.isoformat(), "estado": "asistio", "entrada": None, "salida": None,
        "horas": None, "antes": 0, "dentro": 0, "despues": 0, "afuera": 0, "sin_marca": 0,
        "retardo": False, "cerro": False,
    }
    if not entradas:
        fila["estado"] = "sin_entrada"
        return fila
    inicio = entradas[0]
    fila["entrada"] = _hhmm(inicio)
    oficial = None
    if horario.get("entrada") and horario.get("salida"):
        oficial = (datetime.combine(dia, horario["entrada"]), datetime.combine(dia, horario["salida"]))
        fila["retardo"] = inicio > oficial[0] + timedelta(minutes=TOLERANCIA_MINUTOS)
    fin = max((t for t, d in marcas if d == "salida" and t > inicio), default=None)
    if fin is None or _minutos(inicio, fin) > JORNADA_MAX_HORAS * 60:
        return fila

    fila.update(salida=_hhmm(fin), horas=round(_minutos(inicio, fin) / 60, 2), cerro=True)
    tramo = [(t, d) for t, d in marcas if inicio <= t <= fin]
    minutos: dict[str, float] = defaultdict(float)
    for (t0, d0), (t1, d1) in zip(tramo, tramo[1:]):
        if d0 == "entrada" and d1 == "salida":
            if oficial:
                minutos["antes"] += _traslape(t0, t1, datetime.min, oficial[0])
                minutos["dentro"] += _traslape(t0, t1, oficial[0], oficial[1])
                minutos["despues"] += _traslape(t0, t1, oficial[1], datetime.max)
            else:
                minutos["dentro"] += _minutos(t0, t1)
        elif d0 == "salida" and d1 == "entrada":
            minutos["afuera"] += _minutos(t0, t1)
        else:
            minutos["sin_marca"] += _minutos(t0, t1)
    fila.update({k: round(v) for k, v in minutos.items()})
    return fila


def _estado_sin_marcas(dia: date, inhabiles: set[date], incidencia: dict[str, Any] | None) -> str | None:
    if dia in inhabiles:
        return "inhabil"
    if incidencia:
        return "incidencia"
    if dia.isoweekday() < 6:
        return "sin_registro"
    return None


def _incidencias_por_dia(db: Session, params: dict[str, Any]) -> dict[date, dict[str, Any]]:
    catalogo = tipos(db)
    por_dia: dict[date, dict[str, Any]] = {}
    for inc in consultar(db, _INCIDENCIAS, params):
        info = catalogo.get(inc["tipo"], {})
        dia = max(inc["desde"], params["desde"])
        while dia <= min(inc["hasta"], params["hoy"]):
            por_dia[dia] = {
                "tipo": inc["tipo"],
                "nombre": info.get("nombre", inc["tipo"]),
                "efecto": info.get("efecto", "descuenta"),
            }
            dia += timedelta(days=1)
    return por_dia


def _por_dia_semana(
    dias: list[dict[str, Any]], params: dict[str, Any], inhabiles: set[date], incidencias: dict[date, dict[str, Any]]
) -> list[dict[str, Any]]:
    habiles: dict[int, int] = defaultdict(int)
    dia = params["desde"]
    while dia <= params["hoy"]:
        justificado = incidencias.get(dia, {}).get("efecto") == "descuenta"
        if dia.isoweekday() < 6 and dia not in inhabiles and not justificado:
            habiles[dia.isoweekday()] += 1
        dia += timedelta(days=1)

    grupos: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for fila in dias:
        if fila["estado"] == "asistio":
            grupos[date.fromisoformat(fila["dia"]).isoweekday()].append(fila)

    salida = []
    for numero in sorted(set(habiles) | set(grupos)):
        filas = grupos.get(numero, [])
        cerradas = [f for f in filas if f["cerro"]]
        entradas = [int(f["entrada"][:2]) * 60 + int(f["entrada"][3:]) for f in filas]
        salidas = [int(f["salida"][:2]) * 60 + int(f["salida"][3:]) for f in cerradas]
        salida.append({
            "dia_semana": numero,
            "nombre": DIAS_SEMANA.get(numero, ""),
            "dias": len(filas),
            "habiles": habiles.get(numero, 0),
            "entrada_mediana": _desde_minutos(median(entradas)) if entradas else None,
            "salida_mediana": _desde_minutos(median(salidas)) if salidas else None,
            "afuera_promedio": round(sum(f["afuera"] for f in cerradas) / len(cerradas)) if cerradas else None,
            "retardos": sum(1 for f in filas if f["retardo"]),
            "sin_cerrar": len(filas) - len(cerradas),
        })
    return salida


def _desde_minutos(minutos: float) -> str:
    total = round(minutos)
    return f"{total // 60:02d}:{total % 60:02d}"


def asistencia_persona(db: Session, pin: str, dias: int = 90) -> dict[str, Any]:
    params = parametros(dias, pin=pin)
    params["festivos"] = festivos(params["desde"], params["hoy"])
    params["descuentan"] = claves_por_efecto(db, "descuenta")
    filas = consultar(db, _RESUMEN, params)
    resumen = filas[0] if filas else {}

    marcas: dict[date, list[tuple[datetime, str]]] = defaultdict(list)
    for fila in consultar(db, _MARCAS, params):
        marcas[fila["event_time"].date()].append((fila["event_time"], fila["direccion"]))

    primeras = [next((t for t, d in m if d == "entrada"), None) for m in marcas.values()]
    horario = _horario(db, pin, [t for t in primeras if t])
    inhabiles = set(params["festivos"])
    incidencias = _incidencias_por_dia(db, params)

    todos: list[dict[str, Any]] = []
    dia = params["desde"]
    while dia <= params["hoy"]:
        if dia in marcas:
            fila = _desglose(dia, marcas[dia], horario)
        else:
            estado = _estado_sin_marcas(dia, inhabiles, incidencias.get(dia))
            fila = {"dia": dia.isoformat(), "estado": estado} if estado else None
        if fila:
            fila["incidencia"] = incidencias.get(dia)
            todos.append(fila)
        dia += timedelta(days=1)

    inicio_detalle = (params["hoy"] - timedelta(days=DIAS_DETALLE - 1)).isoformat()
    resumen["dias_detalle"] = [f for f in todos if f["dia"] >= inicio_detalle]
    resumen["por_dia_semana"] = _por_dia_semana(todos, params, inhabiles, incidencias)
    resumen["horario"] = {
        "clave": horario["clave"],
        "nombre": horario["nombre"],
        "entrada": _hhmm(horario.get("entrada")),
        "salida": _hhmm(horario.get("salida")),
        "tolerancia": TOLERANCIA_MINUTOS,
    }
    return resumen
