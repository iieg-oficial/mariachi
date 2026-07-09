"""Formateo de valores de un envio para exportacion (PDF/Excel).

Reusa el mismo criterio que el PDF de SIEEJ (`genericPdf`): resuelve
etiquetas de opciones inline, checkbox como Si/No, multiples unidos por
coma y archivos por su nombre original. Los valores de catalogo ya se
guardan legibles, asi que no requieren tabla de catalogos.
"""
from __future__ import annotations

from typing import Any


def resolve_options(field: dict[str, Any]) -> dict[str, str]:
    options = field.get("options")
    if isinstance(options, list) and options:
        return {
            str(o.get("value")): str(o.get("label", o.get("value")))
            for o in options
            if isinstance(o, dict) and "value" in o
        }
    return {}


def format_value(field: dict[str, Any], value: Any) -> str | None:
    if value is None or value == "":
        return None
    field_type = field.get("type")
    if field_type == "checkbox":
        return "Sí" if value else "No"
    if field_type in ("radio", "select"):
        return resolve_options(field).get(str(value), str(value))
    if field_type == "select_multiple":
        if not isinstance(value, list):
            return None
        opts = resolve_options(field)
        return ", ".join(opts.get(str(v), str(v)) for v in value)
    if field_type == "file":
        if isinstance(value, dict):
            return value.get("filename_original") or value.get("url_publica")
        return str(value)
    return str(value)


def repeater_item_label(item: dict[str, Any], idx: int) -> str:
    if isinstance(item, dict):
        label = item.get("nombre_bd") or item.get("nombres")
        if label:
            return str(label)
    return f"Item {idx + 1}"
