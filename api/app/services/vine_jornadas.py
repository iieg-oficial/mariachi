from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.services.vine_asistencia import DIAS_DETALLE, catalogo_horarios, desglose, elegir_horario
from app.services.vine_perfiles import festivos
from app.services.vine_stats import consultar, parametros

SEGMENTOS = ("antes", "dentro", "despues", "afuera", "sin_marca")

_MARCAS = """
    SELECT pin, event_time, direccion FROM vine.eventos
    WHERE evento = ANY(:eventos) AND event_time >= :desde AND direccion IS NOT NULL
    ORDER BY pin, event_time
"""

_FICHAS = """
    SELECT f.pin, c.clave, c.nombre, c.entrada, c.salida
    FROM vine.personas_ficha f
    JOIN vine.catalogos c ON c.tipo = 'horario' AND c.clave = f.horario
"""


def _promedio(filas: list[dict[str, Any]], clave: str) -> int:
    return round(sum(f[clave] for f in filas) / len(filas)) if filas else 0


def jornadas_instituto(db: Session, dias: int = DIAS_DETALLE) -> list[dict[str, Any]]:
    params = parametros(dias - 1)
    marcas: dict[str, dict[date, list[tuple[datetime, str]]]] = defaultdict(lambda: defaultdict(list))
    for fila in consultar(db, _MARCAS, params):
        marcas[fila["pin"]][fila["event_time"].date()].append((fila["event_time"], fila["direccion"]))

    fichas = {f["pin"]: f for f in consultar(db, _FICHAS, {})}
    catalogo = catalogo_horarios(db)
    por_dia: dict[date, list[dict[str, Any]]] = defaultdict(list)
    for pin, dias_pin in marcas.items():
        primeras = [next((t for t, d in m if d == "entrada"), None) for m in dias_pin.values()]
        horario = elegir_horario(fichas.get(pin), catalogo, [t for t in primeras if t])
        for dia, lista in dias_pin.items():
            fila = desglose(dia, lista, horario)
            if fila["cerro"] and not fila["visita"]:
                fila["con_horario"] = horario.get("entrada") is not None
                por_dia[dia].append(fila)

    inhabiles = set(festivos(params["desde"], params["hoy"]))
    salida: list[dict[str, Any]] = []
    dia = params["desde"]
    while dia <= params["hoy"]:
        filas = por_dia.get(dia, [])
        if dia.isoweekday() >= 6:
            dia += timedelta(days=1)
            continue
        if filas:
            con_horario = [f for f in filas if f["con_horario"]]
            fila = {s: _promedio(filas, s) for s in SEGMENTOS}
            fila.update(
                dia=dia.isoformat(), estado="asistio", cerro=True, personas=len(filas),
                tarde=_promedio(con_horario, "tarde"),
                retardos=sum(1 for f in con_horario if f["retardo"]),
                en_curso=dia == params["hoy"],
            )
            salida.append(fila)
        elif dia in inhabiles:
            salida.append({"dia": dia.isoformat(), "estado": "inhabil"})
        else:
            salida.append({"dia": dia.isoformat(), "estado": "sin_registro"})
        dia += timedelta(days=1)
    return salida


def con_inhabiles(meses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not meses:
        return meses
    hoy = parametros(0)["hoy"]
    inicio = date.fromisoformat(f"{meses[0]['mes']}-01")
    inhabiles = set(festivos(inicio, hoy))
    conteo: dict[str, dict[str, int]] = defaultdict(lambda: {"habiles": 0, "inhabiles": 0})
    dia = inicio
    while dia <= hoy:
        if dia.isoweekday() < 6:
            clave = "inhabiles" if dia in inhabiles else "habiles"
            conteo[dia.strftime("%Y-%m")][clave] += 1
        dia += timedelta(days=1)
    for fila in meses:
        fila.update(conteo[fila["mes"]])
    return meses
