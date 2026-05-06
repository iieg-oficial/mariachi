"""Validador de los datos de un envio contra el snapshot de la
definicion. Se ejecuta al hacer PUT del envio (especialmente si
`enviar=True` para verificar que estan completos).

Errores se acumulan en una lista (no aborta al primer fallo) para que
el cliente los muestre todos a la vez.
"""
from __future__ import annotations

import re
from typing import Any

from app.services.sieej.definicion_validator import FIELD_TYPES


class DatosInvalidosError(ValueError):
    def __init__(self, errores: list[dict[str, str]]):
        self.errores = errores
        super().__init__(f"{len(errores)} error(es) de validacion")


def validar_datos(
    definicion: dict[str, Any],
    datos: dict[str, Any],
    *,
    estricto: bool = True,
) -> None:
    """Valida `datos` contra la `definicion`.

    Si `estricto=True`, exige campos required (al enviar).
    Si `estricto=False`, solo valida tipos/formatos (al guardar borrador).
    """
    errores: list[dict[str, str]] = []

    for step in definicion.get("steps", []):
        if step.get("type") == "summary":
            continue
        if step.get("type") == "repeater":
            _validar_repeater(step, datos, estricto, errores)
        else:
            _validar_form_step(step, datos, estricto, errores)

    if errores:
        raise DatosInvalidosError(errores)


def _validar_form_step(
    step: dict[str, Any],
    datos: dict[str, Any],
    estricto: bool,
    errores: list[dict[str, str]],
) -> None:
    step_id = step["id"]
    step_data = datos.get(step_id) or {}
    if not isinstance(step_data, dict):
        errores.append({"path": step_id, "msg": "debe ser objeto"})
        return

    for field in step.get("fields", []):
        if field.get("type") == "info":
            continue
        if not _evaluar_show_when(field, step_data):
            continue
        _validar_field_value(field, step_id, step_data, estricto, errores)


def _validar_repeater(
    step: dict[str, Any],
    datos: dict[str, Any],
    estricto: bool,
    errores: list[dict[str, str]],
) -> None:
    step_id = step["id"]
    items = datos.get(step_id) or []
    if not isinstance(items, list):
        errores.append({"path": step_id, "msg": "repeater debe ser lista"})
        return

    min_items = step.get("minItems")
    max_items = step.get("maxItems")
    if estricto and isinstance(min_items, int) and len(items) < min_items:
        errores.append(
            {"path": step_id, "msg": f"requiere al menos {min_items} item(s)"}
        )
    if isinstance(max_items, int) and len(items) > max_items:
        errores.append(
            {"path": step_id, "msg": f"excede el maximo de {max_items} item(s)"}
        )

    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            errores.append({"path": f"{step_id}[{idx}]", "msg": "debe ser objeto"})
            continue
        for field in step.get("fields", []):
            if field.get("type") == "info":
                continue
            if not _evaluar_show_when(field, item):
                continue
            _validar_field_value(
                field,
                f"{step_id}[{idx}]",
                item,
                estricto,
                errores,
            )


def _evaluar_show_when(field: dict[str, Any], scope: dict[str, Any]) -> bool:
    show_when = field.get("showWhen")
    if not show_when:
        return True
    target = show_when.get("field")
    expected = show_when.get("equals")
    actual = scope.get(target)
    if isinstance(actual, bool):
        actual = "true" if actual else "false"
    return str(actual) == str(expected)


def _validar_field_value(
    field: dict[str, Any],
    parent_path: str,
    scope: dict[str, Any],
    estricto: bool,
    errores: list[dict[str, str]],
) -> None:
    name = field["name"]
    field_type = field["type"]
    if field_type not in FIELD_TYPES:
        errores.append({"path": f"{parent_path}.{name}", "msg": "tipo desconocido"})
        return

    value = scope.get(name)
    is_blank = value is None or (isinstance(value, str) and not value.strip())

    if estricto and field.get("required") and is_blank:
        errores.append({"path": f"{parent_path}.{name}", "msg": "requerido"})
        return
    if is_blank:
        return

    path = f"{parent_path}.{name}"

    if field_type in {"text", "textarea", "email", "tel"}:
        if not isinstance(value, str):
            errores.append({"path": path, "msg": "debe ser texto"})
            return
        validation = field.get("validation") or {}
        if "minLength" in validation and len(value) < validation["minLength"]:
            errores.append(
                {"path": path, "msg": f"longitud minima {validation['minLength']}"}
            )
        if "maxLength" in validation and len(value) > validation["maxLength"]:
            errores.append(
                {"path": path, "msg": f"longitud maxima {validation['maxLength']}"}
            )
        if "pattern" in validation:
            try:
                if not re.match(validation["pattern"], value):
                    errores.append({"path": path, "msg": "formato invalido"})
            except re.error:
                errores.append({"path": path, "msg": "patron invalido en definicion"})
        if field_type == "email" and not re.match(
            r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value
        ):
            errores.append({"path": path, "msg": "email invalido"})
        if field_type == "tel" and not re.match(r"^[0-9+\-\s()]{7,20}$", value):
            errores.append({"path": path, "msg": "telefono invalido"})

    elif field_type == "number":
        if not isinstance(value, (int, float)):
            errores.append({"path": path, "msg": "debe ser numerico"})
            return
        validation = field.get("validation") or {}
        if "min" in validation and value < validation["min"]:
            errores.append({"path": path, "msg": f"minimo {validation['min']}"})
        if "max" in validation and value > validation["max"]:
            errores.append({"path": path, "msg": f"maximo {validation['max']}"})

    elif field_type == "date":
        if not isinstance(value, str) or not re.match(
            r"^\d{4}-\d{2}-\d{2}", value
        ):
            errores.append({"path": path, "msg": "fecha invalida (YYYY-MM-DD)"})

    elif field_type in {"select", "radio"}:
        valid = _valid_option_values(field)
        if valid is not None and value not in valid:
            errores.append({"path": path, "msg": "valor fuera de opciones"})

    elif field_type == "select_multiple":
        if not isinstance(value, list):
            errores.append({"path": path, "msg": "debe ser lista"})
            return
        valid = _valid_option_values(field)
        if valid is not None:
            for v in value:
                if v not in valid:
                    errores.append(
                        {"path": path, "msg": f"valor `{v}` fuera de opciones"}
                    )

    elif field_type == "checkbox":
        if not isinstance(value, bool):
            errores.append({"path": path, "msg": "debe ser booleano"})

    elif field_type == "file":
        if not isinstance(value, dict):
            errores.append({"path": path, "msg": "file debe ser objeto"})
            return
        if not isinstance(value.get("url_publica"), str):
            errores.append({"path": path, "msg": "file sin `url_publica`"})


def _valid_option_values(field: dict[str, Any]) -> set[str] | None:
    """Devuelve el set de valores validos del field, o None si depende
    de un catalogo (validacion contra catalogo se hace en el caller con
    acceso a CatalogContext / DB).
    """
    options = field.get("options")
    if isinstance(options, list) and options:
        return {opt["value"] for opt in options if isinstance(opt, dict) and "value" in opt}
    return None
