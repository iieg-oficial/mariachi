"""Rellena la ficha de vine con la plantilla y el directorio telefonico de RH.

Lee las hojas PLANTILLA y DIRECTORIO TELEFONICO del xlsx, cruza cada fila con el
personal del biometrico por nombre y solo llena los campos que estan vacios en la
ficha y en el biometrico. RFC, CURP, edad y sexo no se guardan: del CURP solo sale
la fecha de nacimiento para el cumpleaños. Sin --aplicar no escribe nada.

    python scripts/importar_plantilla_vine.py /tmp/plantilla.xlsx
    python scripts/importar_plantilla_vine.py /tmp/plantilla.xlsx --aplicar
    python scripts/importar_plantilla_vine.py /tmp/plantilla.xlsx --remuneraciones /tmp/remu.xlsx

Con --remuneraciones cruza puesto y direccion contra la plantilla de remuneraciones
para saber si la plaza es de base o de confianza, y asigna vinculo y horario.
"""
import argparse
import re
import sys
import unicodedata
from datetime import date, datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

sys.path.append(str(Path(__file__).parent.parent))

import openpyxl
from sqlalchemy import text

from app.core.database import SessionLocal
from app.services import vine_ficha

AUTOR = "importacion plantilla RH"

POR_CATEGORIA = {"BASE": ("Base", "8-16"), "CONF": ("Confianza", "9-17")}

_PERSONAS = """
    SELECT p.pin, p.nombre, p.apellidos, p.departamento, p.puesto, p.fecha_ingreso, p.cumpleanos,
           f.nombre AS f_nombre, f.apellidos AS f_apellidos, f.extension, f.puesto AS f_puesto,
           f.fecha_ingreso AS f_fecha_ingreso, f.cumpleanos AS f_cumpleanos,
           f.vinculo AS f_vinculo, f.horario AS f_horario,
           (p.departamento ILIKE '%%(Bajas)%%' OR p.departamento = 'Bajas') AS baja
    FROM vine.personas p LEFT JOIN vine.personas_ficha f USING (pin)
"""


def normalizar(valor: Any) -> str:
    plano = unicodedata.normalize("NFD", str(valor or "")).encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", re.sub(r"[^A-Z ]", " ", plano)).strip()


def parecido(a: str, b: str) -> bool:
    return a == b or (min(len(a), len(b)) >= 4 and SequenceMatcher(None, a, b).ratio() >= 0.85)


def contiene(tokens: list[str], buscado: str) -> bool:
    return any(parecido(t, buscado) for t in tokens)


def cruzar(nombres: str, ap1: str, ap2: str, personas: list[dict[str, Any]]) -> dict[str, Any] | None:
    dados = normalizar(nombres).split()
    ap1, ap2 = normalizar(ap1), normalizar(ap2)
    candidatos = []
    for p in personas:
        tokens = normalizar(f"{p['nombre']} {p['apellidos'] or ''}").split()
        if not ap1:
            if dados and all(contiene(tokens, t) for t in dados):
                candidatos.append((0, p))
            continue
        if contiene(tokens, ap1) and any(contiene(tokens, t) for t in dados):
            puntos = (2 if ap2 and contiene(tokens, ap2) else 0) + (1 if not p["baja"] else 0)
            candidatos.append((puntos, p))
    if not candidatos:
        return None
    candidatos.sort(key=lambda c: c[0], reverse=True)
    if len(candidatos) > 1 and candidatos[0][0] == candidatos[1][0]:
        return {"ambiguo": [c[1]["pin"] for c in candidatos if c[0] == candidatos[0][0]]}
    return candidatos[0][1]


def completar(actual: str | None, completo: str) -> str | None:
    propios = (actual or "").split()
    salida = []
    for token in completo.split():
        igual = next((t for t in propios if parecido(normalizar(t), normalizar(token))), None)
        salida.append(igual or token.capitalize())
    nuevo = " ".join(salida)
    return nuevo if len(nuevo.split()) > len(propios) else None


def nacimiento(curp: Any) -> date | None:
    m = re.match(r"^[A-Z]{4}(\d{2})(\d{2})(\d{2})[HM]", str(curp or "").upper())
    if not m:
        return None
    anio, mes, dia = (int(g) for g in m.groups())
    siglo = 2000 if anio <= date.today().year % 100 else 1900
    try:
        return date(siglo + anio, mes, dia)
    except ValueError:
        return None


def filas(hoja: Any) -> list[tuple]:
    return [r for r in hoja.iter_rows(values_only=True) if any(c is not None for c in r)][1:]


def categorias(archivo: str | None) -> dict[tuple[str, str], str]:
    if not archivo:
        return {}
    hoja = openpyxl.load_workbook(archivo, read_only=True, data_only=True).worksheets[0]
    vistas: dict[tuple[str, str], set[str]] = {}
    for fila in hoja.iter_rows(values_only=True):
        if len(fila) > 8 and isinstance(fila[1], (int, float)) and fila[5] in POR_CATEGORIA:
            vistas.setdefault((normalizar(fila[6]), normalizar(fila[8])), set()).add(fila[5])
    return {clave: next(iter(cats)) for clave, cats in vistas.items() if len(cats) == 1}


def cambios_de(
    p: dict[str, Any], fila_plantilla: tuple | None, fila_directorio: tuple | None, categoria: str | None = None
) -> dict[str, Any]:
    cambios: dict[str, Any] = {}
    if categoria:
        vinculo, horario = POR_CATEGORIA[categoria]
        if not p["f_vinculo"]:
            cambios["vinculo"] = vinculo
        if not p["f_horario"]:
            cambios["horario"] = horario
    fuente = fila_plantilla or fila_directorio
    if fila_plantilla:
        _, nombres, ap1, ap2, _, curp, _, _, ingreso, puesto, *_ = fila_plantilla
    else:
        nombres, ap1, ap2, *_ = fila_directorio
        curp = ingreso = puesto = None
    if fila_directorio and fila_directorio[4] and not p["extension"]:
        cambios["extension"] = str(int(fila_directorio[4]))
    if puesto and not (p["f_puesto"] or p["puesto"]):
        cambios["puesto"] = str(puesto).strip().capitalize()
    if isinstance(ingreso, datetime) and not (p["f_fecha_ingreso"] or p["fecha_ingreso"]):
        cambios["fecha_ingreso"] = ingreso.date()
    cumple = nacimiento(curp)
    if cumple and not (p["f_cumpleanos"] or p["cumpleanos"]):
        cambios["cumpleanos"] = cumple
    if fuente and not p["f_nombre"]:
        nombre = completar(p["nombre"], normalizar(nombres))
        if nombre:
            cambios["nombre"] = nombre
    if fuente and ap1 and not p["f_apellidos"]:
        apellidos = completar(p["apellidos"], normalizar(f"{ap1} {ap2 or ''}"))
        if apellidos:
            cambios["apellidos"] = apellidos
    return cambios


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("archivo")
    parser.add_argument("--aplicar", action="store_true")
    parser.add_argument("--remuneraciones")
    args = parser.parse_args()

    libro = openpyxl.load_workbook(args.archivo, read_only=True, data_only=True)
    por_plaza = categorias(args.remuneraciones)
    db = SessionLocal()
    try:
        personas = [dict(r) for r in db.execute(text(_PERSONAS)).mappings().all()]
        por_pin: dict[str, dict[str, Any]] = {}
        sin_cruce: list[str] = []
        for hoja, lado in (("PLANTILLA", "plantilla"), ("DIRECTORIO TELEFONICO", "directorio")):
            for fila in filas(libro[hoja]):
                nombres, ap1, ap2 = (fila[1], fila[2], fila[3]) if lado == "plantilla" else fila[:3]
                if not normalizar(nombres):
                    continue
                p = cruzar(nombres, ap1, ap2, personas)
                etiqueta = f"{lado}: {normalizar(nombres)} {normalizar(ap1)} {normalizar(ap2)}".strip()
                if not p:
                    sin_cruce.append(etiqueta)
                elif "ambiguo" in p:
                    sin_cruce.append(f"{etiqueta} (ambiguo: {', '.join(p['ambiguo'])})")
                else:
                    por_pin.setdefault(p["pin"], {"persona": p})[lado] = fila

        total = 0
        for pin, datos in sorted(por_pin.items()):
            plaza = datos.get("plantilla")
            categoria = por_plaza.get((normalizar(plaza[9]), normalizar(plaza[10]))) if plaza else None
            if plaza and args.remuneraciones and not categoria:
                sin_cruce.append(f"sin categoria: {normalizar(plaza[1])} {normalizar(plaza[2])} ({normalizar(plaza[9])})")
            cambios = cambios_de(datos["persona"], plaza, datos.get("directorio"), categoria)
            if not cambios:
                continue
            total += 1
            print(f"[{pin}] {datos['persona']['nombre']} {datos['persona']['apellidos'] or ''}: "
                  + ", ".join(f"{k}={v}" for k, v in cambios.items()), flush=True)
            if args.aplicar:
                vine_ficha.guardar(db, pin, cambios, AUTOR)
        print(f"\npersonas cruzadas={len(por_pin)} con cambios={total} "
              f"{'aplicados' if args.aplicar else '(simulacion, sin escribir)'}", flush=True)
        if sin_cruce:
            print("sin cruce:", *sin_cruce, sep="\n  ", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
