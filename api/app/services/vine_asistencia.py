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
VISITA_MAX_MINUTOS = 60

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
           count(*) FILTER (WHERE extract(isodow FROM dia) < 6 AND dia <> ALL(:festivos)
                            AND NOT EXISTS (SELECT 1 FROM vine.incidencias i
                                            WHERE i.pin = :pin AND i.tipo = ANY(:descuentan)
                                              AND dia BETWEEN i.desde AND i.hasta)) AS dias_habiles,
           count(*) FILTER (WHERE salida IS NOT NULL) AS medibles,
           (SELECT total FROM habiles) - (SELECT dias FROM justificados) AS habiles,
           (SELECT dias FROM justificados) AS justificados,
           to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI') AS entrada_mediana,
           to_char(percentile_cont(0.5) WITHIN GROUP (ORDER BY salida::time)
                   FILTER (WHERE salida IS NOT NULL), 'HH24:MI') AS salida_mediana,
           to_char(percentile_cont(0.25) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI') AS entrada_p25,
           to_char(percentile_cont(0.75) WITHIN GROUP (ORDER BY entrada::time), 'HH24:MI') AS entrada_p75,
           to_char(percentile_cont(0.25) WITHIN GROUP (ORDER BY salida::time)
                   FILTER (WHERE salida IS NOT NULL), 'HH24:MI') AS salida_p25,
           to_char(percentile_cont(0.75) WITHIN GROUP (ORDER BY salida::time)
                   FILTER (WHERE salida IS NOT NULL), 'HH24:MI') AS salida_p75,
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


def _del_dia(momento: datetime) -> int:
    return round(momento.hour * 60 + momento.minute + momento.second / 60)


def _partir(t0: datetime, t1: datetime, oficial: tuple[datetime, datetime] | None) -> list[tuple[str, datetime, datetime]]:
    if not oficial:
        return [("dentro", t0, t1)]
    cortes = (("antes", datetime.min, oficial[0]), ("dentro", oficial[0], oficial[1]), ("despues", oficial[1], datetime.max))
    return [(tipo, max(t0, a), min(t1, b)) for tipo, a, b in cortes if max(t0, a) < min(t1, b)]


def _compactar(tramos: list[tuple[str, int, int]]) -> list[tuple[str, int, int]]:
    juntos: list[tuple[str, int, int]] = []
    for tipo, desde, hasta in tramos:
        if hasta <= desde:
            continue
        if juntos and juntos[-1][0] == tipo and juntos[-1][2] >= desde:
            juntos[-1] = (tipo, juntos[-1][1], hasta)
        else:
            juntos.append((tipo, desde, hasta))
    return juntos


def _hhmm(momento: datetime | time | None) -> str | None:
    return momento.strftime("%H:%M") if momento else None


def elegir_horario(
    ficha: dict[str, Any] | None, catalogo: dict[str, dict[str, Any]], entradas: list[datetime]
) -> dict[str, Any]:
    if ficha:
        return ficha
    clave = "otro"
    if entradas:
        mediana = median(e.hour * 60 + e.minute for e in entradas)
        if 360 <= mediana < 510:
            clave = "8-16"
        elif 510 <= mediana < 630:
            clave = "9-17"
    return catalogo.get(clave, {"clave": clave, "nombre": clave, "entrada": None, "salida": None})


def catalogo_horarios(db: Session) -> dict[str, dict[str, Any]]:
    return {h["clave"]: h for h in consultar(db, _HORARIOS, {})}


def horario_de(db: Session, pin: str, entradas: list[datetime]) -> dict[str, Any]:
    ficha = consultar(db, _HORARIO_FICHA, {"pin": pin})
    return elegir_horario(ficha[0] if ficha else None, catalogo_horarios(db), entradas)


def desglose(
    dia: date, marcas: list[tuple[datetime, str]], horario: dict[str, Any], obligado: bool = True
) -> dict[str, Any]:
    entradas = [t for t, d in marcas if d == "entrada"]
    fila: dict[str, Any] = {
        "dia": dia.isoformat(), "estado": "asistio", "entrada": None, "salida": None,
        "horas": None, "antes": 0, "dentro": 0, "despues": 0, "afuera": 0, "sin_marca": 0,
        "retardo": False, "cerro": False, "visita": False, "reentrada": None,
        "hasta_al_menos": None, "minimo": 0, "tarde": 0, "tramos": [],
    }
    if not entradas:
        fila["estado"] = "sin_entrada"
        return fila
    inicio = entradas[0]
    fila["entrada"] = _hhmm(inicio)
    oficial = None
    if horario.get("entrada") and horario.get("salida"):
        oficial = (datetime.combine(dia, horario["entrada"]), datetime.combine(dia, horario["salida"]))
    if oficial and obligado:
        fila["retardo"] = inicio > oficial[0] + timedelta(minutes=TOLERANCIA_MINUTOS)
        fila["tarde"] = round(_minutos(oficial[0], inicio))
        if inicio > oficial[0]:
            fila["tramos"].append(("tarde", _del_dia(oficial[0]), _del_dia(inicio)))
    fin = max((t for t, d in marcas if d == "salida" and t > inicio), default=None)
    ultima = marcas[-1][0]
    abierta = fin is None or entradas[-1] > fin
    if abierta and ultima > inicio and _minutos(inicio, ultima) <= JORNADA_MAX_HORAS * 60:
        fila.update(hasta_al_menos=_hhmm(ultima), minimo=round(_minutos(inicio, ultima)))
        fila["tramos"].append(("minimo", _del_dia(inicio), _del_dia(ultima)))
    if fin is not None and entradas[-1] > fin:
        fila["reentrada"] = _hhmm(entradas[-1])
        return fila
    if fin is None or _minutos(inicio, fin) > JORNADA_MAX_HORAS * 60:
        return fila

    fila.update(salida=_hhmm(fin), horas=round(_minutos(inicio, fin) / 60, 2), cerro=True)
    tramo = [(t, d) for t, d in marcas if inicio <= t <= fin]
    minutos: dict[str, float] = defaultdict(float)
    for (t0, d0), (t1, d1) in zip(tramo, tramo[1:]):
        if d0 == "entrada" and d1 == "salida":
            partes = _partir(t0, t1, oficial)
        elif d0 == "salida" and d1 == "entrada":
            partes = [("afuera", t0, t1)]
        else:
            partes = [("sin_marca", t0, t1)]
        for tipo, a, b in partes:
            minutos[tipo] += _minutos(a, b)
            if b > a:
                fila["tramos"].append((tipo, _del_dia(a), _del_dia(b)))
    fila.update({k: round(v) for k, v in minutos.items()})
    fila["visita"] = _minutos(inicio, fin) < VISITA_MAX_MINUTOS
    if fila["visita"]:
        fila.update(retardo=False, tarde=0)
        fila["tramos"] = [t for t in fila["tramos"] if t[0] != "tarde"]
    fila["tramos"] = _compactar(fila["tramos"])
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
        jornadas = [f for f in filas if not f["visita"]]
        cerradas = [f for f in jornadas if f["cerro"]]
        entradas = [int(f["entrada"][:2]) * 60 + int(f["entrada"][3:]) for f in jornadas]
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
            "tarde_promedio": round(sum(f["tarde"] for f in jornadas) / len(jornadas)) if jornadas else None,
            "sin_cerrar": len(jornadas) - len(cerradas),
            "visitas": len(filas) - len(jornadas),
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
    horario = horario_de(db, pin, [t for t in primeras if t])
    inhabiles = set(params["festivos"])
    incidencias = _incidencias_por_dia(db, params)

    todos: list[dict[str, Any]] = []
    dia = params["desde"]
    while dia <= params["hoy"]:
        if dia in marcas:
            obligado = (
                dia.isoweekday() < 6 and dia not in inhabiles
                and incidencias.get(dia, {}).get("efecto") != "descuenta"
            )
            fila = desglose(dia, marcas[dia], horario, obligado)
            fila.update(sin_obligacion=not obligado, inhabil=dia in inhabiles)
            if dia == params["hoy"]:
                fila.update(en_curso=True, visita=False)
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
