"""Lectura y escritura de un valor dentro de `envio.datos` por su path.

Los paths del contrato son `step.field` y, en repeaters, `step[idx].field`.
Modulo hoja a proposito: no conoce definiciones ni historial, solo la forma de
`datos`.
"""
from __future__ import annotations

from typing import Any


def parse_field_path(field_path: str) -> tuple[str, int | None, str] | None:
    """Devuelve (step_id, idx_o_None, field_name) o None si invalido.

    - `general.razon_social` -> ('general', None, 'razon_social')
    - `bases_datos[0].diccionario` -> ('bases_datos', 0, 'diccionario')
    """
    partes = field_path.split(".")
    if len(partes) != 2:
        return None
    step_part, field_name = partes
    if "[" in step_part:
        try:
            step_id, rest = step_part.split("[", 1)
            idx = int(rest.rstrip("]"))
        except ValueError:
            return None
        return step_id, idx, field_name
    return step_part, None, field_name


def scope_de_path(
    datos: dict[str, Any], field_path: str, *, crear: bool = False
) -> dict[str, Any] | None:
    """Devuelve el dict que contiene el campo del path, o None.

    En un repeater es el item del indice, que debe existir: la escritura por
    campo corrige respuestas, no da de alta items nuevos.
    """
    parsed = parse_field_path(field_path)
    if parsed is None:
        return None
    step_id, idx, _ = parsed
    if idx is None:
        step_data = datos.setdefault(step_id, {}) if crear else datos.get(step_id)
        return step_data if isinstance(step_data, dict) else None
    step_list = datos.get(step_id)
    if not isinstance(step_list, list) or idx >= len(step_list):
        return None
    item = step_list[idx]
    return item if isinstance(item, dict) else None


def get_valor_en_datos(datos: dict[str, Any], field_path: str) -> Any:
    scope = scope_de_path(datos, field_path)
    if scope is None:
        return None
    return scope.get(parse_field_path(field_path)[2])


def set_valor_en_datos(
    datos: dict[str, Any], field_path: str, valor: Any
) -> dict[str, Any]:
    """Escribe el valor de un path. Crea el dict del step si no existe; en
    repeaters exige que el item ya exista. Devuelve el mismo dict."""
    scope = scope_de_path(datos, field_path, crear=True)
    if scope is None:
        return datos
    scope[parse_field_path(field_path)[2]] = valor
    return datos
