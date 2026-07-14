"""Clasifica un cambio de definicion de formulario como `menor` o `rompe`.

Un cambio `menor` no puede perder ni invalidar datos ya capturados ni
cambiar que campos son obligatorios, por lo que es seguro propagarlo a los
envios en proceso. Un cambio que `rompe` altera la estructura (elimina
campos, agrega obligatorios, endurece validacion, etc.) y por eso congela
a quien ya empezo hasta que decida actualizar.

`diff_definiciones` devuelve la lista de cambios visibles para el
respondent (para el banner y los distintivos de "que cambio").
"""
from __future__ import annotations

from typing import Any

_CAMPOS_SIGNIFICATIVOS = (
    "label",
    "type",
    "required",
    "options",
    "catalog",
    "validation",
    "placeholder",
    "tooltip",
    "showWhen",
)


def _index_fields(definicion: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for step in definicion.get("steps", []) or []:
        step_id = step.get("id")
        for field in step.get("fields", []) or []:
            if field.get("type") == "info":
                continue
            out[f"{step_id}.{field.get('name')}"] = {
                "step_id": step_id,
                "field": field,
            }
    return out


def _index_steps(definicion: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        s.get("id"): s
        for s in definicion.get("steps", []) or []
        if s.get("id")
    }


def _option_values(field: dict[str, Any]) -> set[Any]:
    return {
        o.get("value")
        for o in (field.get("options") or [])
        if isinstance(o, dict)
    }


def _validacion_mas_estricta(old: dict[str, Any], new: dict[str, Any]) -> bool:
    ov = old.get("validation") or {}
    nv = new.get("validation") or {}
    if nv.get("pattern") and nv.get("pattern") != ov.get("pattern"):
        return True
    for key in ("min", "minLength"):
        if key in nv and (key not in ov or nv[key] > ov[key]):
            return True
    for key in ("max", "maxLength"):
        if key in nv and (key not in ov or nv[key] < ov[key]):
            return True
    return False


def _campo_rompe(old: dict[str, Any], new: dict[str, Any]) -> bool:
    if old.get("type") != new.get("type"):
        return True
    if bool(new.get("required")) and not bool(old.get("required")):
        return True
    if new.get("catalog") != old.get("catalog"):
        return True
    if _option_values(old) - _option_values(new):
        return True
    if _validacion_mas_estricta(old, new):
        return True
    return False


def _campo_modificado(old: dict[str, Any], new: dict[str, Any]) -> bool:
    return any(old.get(k) != new.get(k) for k in _CAMPOS_SIGNIFICATIVOS)


def es_rompe(old: dict[str, Any], new: dict[str, Any]) -> bool:
    fields_old, fields_new = _index_fields(old), _index_fields(new)
    steps_old, steps_new = _index_steps(old), _index_steps(new)

    if set(steps_old) - set(steps_new):
        return True
    for step_id in set(steps_old) & set(steps_new):
        if steps_old[step_id].get("type") != steps_new[step_id].get("type"):
            return True

    if set(fields_old) - set(fields_new):
        return True
    for path in set(fields_new) - set(fields_old):
        if bool(fields_new[path]["field"].get("required")):
            return True
    for path in set(fields_old) & set(fields_new):
        if _campo_rompe(fields_old[path]["field"], fields_new[path]["field"]):
            return True
    return False


def clasificar_cambio(old: dict[str, Any], new: dict[str, Any]) -> str:
    return "rompe" if es_rompe(old, new) else "menor"


def diff_definiciones(old: dict[str, Any], new: dict[str, Any]) -> list[dict[str, Any]]:
    fields_old, fields_new = _index_fields(old), _index_fields(new)
    steps_old, steps_new = _index_steps(old), _index_steps(new)
    cambios: list[dict[str, Any]] = []

    for step_id in steps_new:
        if step_id not in steps_old:
            cambios.append({"step_id": step_id, "field_name": None, "tipo": "nuevo"})
    for step_id in steps_old:
        if step_id not in steps_new:
            cambios.append({"step_id": step_id, "field_name": None, "tipo": "eliminado"})

    for path, info in fields_new.items():
        if path not in fields_old:
            cambios.append({
                "step_id": info["step_id"],
                "field_name": info["field"].get("name"),
                "tipo": "nuevo",
            })
    for path, info in fields_old.items():
        if path not in fields_new:
            cambios.append({
                "step_id": info["step_id"],
                "field_name": info["field"].get("name"),
                "tipo": "eliminado",
            })
        elif _campo_modificado(info["field"], fields_new[path]["field"]):
            cambios.append({
                "step_id": info["step_id"],
                "field_name": info["field"].get("name"),
                "tipo": "modificado",
            })

    return cambios
