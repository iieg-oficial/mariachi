"""Compatibilidad de definiciones legadas de formularios.

Cada vez que el contrato de la definicion se endurece (tipos que se
absorben, campos que pasan a ser obligatorios, rangos que se acotan), los
formularios que ya viven en produccion quedan fuera del contrato nuevo y
dejan de renderear, de validar o de poder guardarse desde el admin.

`normalizar_definicion` traduce cualquier definicion historica al contrato
vigente. Es idempotente y solo relaja: nunca inventa campos ni endurece
reglas. Se aplica en lectura (schema del respondent, snapshot del envio) y
en escritura (crear/actualizar desde el admin), de modo que un deploy no
depende de que la migracion de datos haya corrido.

Al agregar una regla nueva al validador, agrega aqui su equivalente de
compatibilidad y una definicion de ejemplo en `tests/fixtures/sieej/legacy/`.
"""
from __future__ import annotations

import re
from copy import deepcopy
from typing import Any

from app.services.sieej.definicion_validator import (
    COLSPAN_UNITS,
    FIELD_TYPES,
    FILE_MAX_SIZE_MB_HARD_CAP,
    GRID_COLUMNS,
    STEP_TYPES,
)

BUCKET_POR_DEFECTO = "sieej"
TIPO_POR_DEFECTO = "text"
TIPO_STEP_POR_DEFECTO = "form"

TIPOS_ABSORBIDOS: dict[str, dict[str, str]] = {
    "tel": {
        "pattern": r"^\d{10}$",
        "patternMessage": "Ingresa un teléfono de 10 dígitos",
    },
    "email": {
        "pattern": r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        "patternMessage": "Ingresa un correo electrónico válido",
    },
}

_TIPOS_CON_OPCIONES = {"select", "select_multiple", "radio", "checkbox"}


def normalizar_definicion(definicion: Any) -> dict[str, Any]:
    """Devuelve una copia de `definicion` que cumple el contrato vigente."""
    if not isinstance(definicion, dict):
        return {"version": 1, "steps": []}

    resultado = deepcopy(definicion)

    version = resultado.get("version")
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        resultado["version"] = 1

    steps_origen = resultado.get("steps")
    if not isinstance(steps_origen, list):
        steps_origen = []

    steps: list[dict[str, Any]] = []
    ids_vistos: set[str] = set()
    for idx, step in enumerate(steps_origen):
        normalizado = _normalizar_step(step, idx, ids_vistos)
        if normalizado is not None:
            steps.append(normalizado)

    resultado["steps"] = steps
    return resultado


def requiere_normalizacion(definicion: Any) -> bool:
    return normalizar_definicion(definicion) != definicion


def _normalizar_step(
    step: Any,
    idx: int,
    ids_vistos: set[str],
) -> dict[str, Any] | None:
    if not isinstance(step, dict):
        return None

    step_id = step.get("id")
    if not isinstance(step_id, str) or not step_id.strip():
        step_id = f"paso_{idx + 1}"
    if step_id in ids_vistos:
        sufijo = 2
        while f"{step_id}_{sufijo}" in ids_vistos:
            sufijo += 1
        step_id = f"{step_id}_{sufijo}"
    ids_vistos.add(step_id)
    step["id"] = step_id

    if step.get("type") not in STEP_TYPES:
        step["type"] = TIPO_STEP_POR_DEFECTO
    step_type = step["type"]

    titulo = step.get("title")
    if not isinstance(titulo, str) or not titulo.strip():
        step["title"] = f"Paso {idx + 1}"

    _normalizar_incomplete_notice(step)

    if step_type == "summary":
        return step

    if step_type == "repeater":
        _normalizar_limites_repeater(step)
        _normalizar_tabs(step)

    tabs = step.get("tabs") if step_type == "repeater" else None
    tab_ids = {t["id"] for t in tabs} if isinstance(tabs, list) else set()
    primera_tab = tabs[0]["id"] if isinstance(tabs, list) and tabs else None

    fields_origen = step.get("fields")
    if not isinstance(fields_origen, list):
        fields_origen = []

    fields: list[dict[str, Any]] = []
    names_vistos: set[str] = set()
    for field in fields_origen:
        normalizado = _normalizar_field(field, tab_ids, primera_tab, names_vistos)
        if normalizado is not None:
            fields.append(normalizado)

    if not fields:
        return None

    _depurar_show_when(fields, names_vistos)
    step["fields"] = fields
    return step


def _normalizar_incomplete_notice(step: dict[str, Any]) -> None:
    notice = step.get("incompleteNotice")
    if notice is None:
        return
    if not isinstance(notice, dict):
        step.pop("incompleteNotice", None)
        return
    for key in ("title", "message"):
        if key in notice and (
            not isinstance(notice[key], str) or not notice[key].strip()
        ):
            notice.pop(key)
    if not notice:
        step.pop("incompleteNotice", None)


def _normalizar_limites_repeater(step: dict[str, Any]) -> None:
    min_items = step.get("minItems")
    max_items = step.get("maxItems")
    if min_items is not None and (
        isinstance(min_items, bool) or not isinstance(min_items, int) or min_items < 0
    ):
        step.pop("minItems", None)
        min_items = None
    if max_items is not None and (
        isinstance(max_items, bool) or not isinstance(max_items, int) or max_items < 1
    ):
        step.pop("maxItems", None)
        max_items = None
    if (
        isinstance(min_items, int)
        and isinstance(max_items, int)
        and min_items > max_items
    ):
        step["maxItems"] = min_items


def _normalizar_tabs(step: dict[str, Any]) -> None:
    tabs = step.get("tabs")
    if tabs is None:
        return
    if not isinstance(tabs, list):
        step.pop("tabs", None)
        return

    limpias: list[dict[str, Any]] = []
    ids: set[str] = set()
    for idx, tab in enumerate(tabs):
        if not isinstance(tab, dict):
            continue
        tab_id = tab.get("id")
        if not isinstance(tab_id, str) or not tab_id.strip() or tab_id in ids:
            continue
        ids.add(tab_id)
        titulo = tab.get("title")
        if not isinstance(titulo, str) or not titulo.strip():
            tab["title"] = f"Pestaña {idx + 1}"
        limpias.append(tab)

    if limpias:
        step["tabs"] = limpias
    else:
        step.pop("tabs", None)


def _normalizar_field(
    field: Any,
    tab_ids: set[str],
    primera_tab: str | None,
    names_vistos: set[str],
) -> dict[str, Any] | None:
    if not isinstance(field, dict):
        return None

    name = field.get("name")
    if not isinstance(name, str) or not name.strip() or name in names_vistos:
        return None
    names_vistos.add(name)

    tipo = _normalizar_tipo(field)

    label = field.get("label")
    if not isinstance(label, str) or not label.strip():
        if tipo == "info":
            names_vistos.discard(name)
            return None
        field["label"] = name

    _normalizar_layout(field)

    if tipo == "info":
        return field

    if tipo in _TIPOS_CON_OPCIONES:
        tipo = _normalizar_opciones(field, tipo)

    if tipo in {"text", "textarea"}:
        _normalizar_validation_texto(field)
    elif tipo == "number":
        _normalizar_validation_numero(field)
    elif tipo == "file":
        _normalizar_file(field)
    elif tipo == "date_range":
        _normalizar_date_range(field)

    if primera_tab is not None and field.get("tab") not in tab_ids:
        field["tab"] = primera_tab
    elif primera_tab is None:
        field.pop("tab", None)

    _normalizar_show_when(field)
    return field


def _normalizar_tipo(field: dict[str, Any]) -> str:
    tipo = field.get("type")
    preset = TIPOS_ABSORBIDOS.get(tipo) if isinstance(tipo, str) else None
    if preset is not None:
        field["type"] = "text"
        validation = field.get("validation")
        validation = dict(validation) if isinstance(validation, dict) else {}
        if not validation.get("pattern"):
            validation["pattern"] = preset["pattern"]
            validation.setdefault("patternMessage", preset["patternMessage"])
        field["validation"] = validation
        return "text"
    if tipo not in FIELD_TYPES:
        field["type"] = TIPO_POR_DEFECTO
        return TIPO_POR_DEFECTO
    return tipo


def _normalizar_layout(field: dict[str, Any]) -> None:
    layout = field.get("layout")
    if layout is None:
        return
    if not isinstance(layout, dict):
        field.pop("layout", None)
        return

    col_span = layout.get("colSpan")
    if col_span is not None:
        if isinstance(col_span, bool) or not isinstance(col_span, int):
            layout.pop("colSpan", None)
        else:
            layout["colSpan"] = min(max(col_span, 1), 3)

    if "newRow" in layout and not isinstance(layout["newRow"], bool):
        layout.pop("newRow", None)

    if "alone" in layout and not isinstance(layout["alone"], bool):
        layout.pop("alone", None)

    col = layout.get("col")
    if col is not None:
        if isinstance(col, bool) or not isinstance(col, int):
            layout.pop("col", None)
        else:
            units = COLSPAN_UNITS.get(layout.get("colSpan", 1), GRID_COLUMNS)
            layout["col"] = min(max(col, 1), GRID_COLUMNS + 1 - units)

    if layout.get("col") == 1:
        layout["newRow"] = True

    if not layout:
        field.pop("layout", None)


def _normalizar_opciones(field: dict[str, Any], tipo: str) -> str:
    catalog = field.get("catalog")
    catalog = catalog if isinstance(catalog, str) and catalog.strip() else None

    opciones: list[dict[str, Any]] = []
    for opt in field.get("options") or []:
        if not isinstance(opt, dict) or "value" not in opt:
            continue
        valor = opt["value"]
        if isinstance(valor, bool) or valor is None:
            valor = str(valor).lower() if isinstance(valor, bool) else ""
        opt["value"] = str(valor)
        etiqueta = opt.get("label")
        opt["label"] = str(etiqueta) if etiqueta not in (None, "") else opt["value"]
        opciones.append(opt)

    if catalog:
        field["catalog"] = catalog
        field.pop("options", None)
        return tipo

    if opciones:
        field["options"] = opciones
        field.pop("catalog", None)
        return tipo

    field.pop("options", None)
    field.pop("catalog", None)
    if tipo == "checkbox":
        return tipo
    field["type"] = TIPO_POR_DEFECTO
    return TIPO_POR_DEFECTO


def _normalizar_validation_texto(field: dict[str, Any]) -> None:
    validation = field.get("validation")
    if validation is None:
        return
    if not isinstance(validation, dict):
        field.pop("validation", None)
        return

    for key in ("minLength", "maxLength"):
        if key in validation and (
            isinstance(validation[key], bool)
            or not isinstance(validation[key], int)
            or validation[key] < 0
        ):
            validation.pop(key)

    minimo = validation.get("minLength")
    maximo = validation.get("maxLength")
    if isinstance(minimo, int) and isinstance(maximo, int) and minimo > maximo:
        validation["maxLength"] = minimo

    if "pattern" in validation:
        pattern = validation["pattern"]
        valido = isinstance(pattern, str) and bool(pattern)
        if valido:
            try:
                re.compile(pattern)
            except re.error:
                valido = False
        if not valido:
            validation.pop("pattern", None)
            validation.pop("patternMessage", None)

    if "patternMessage" in validation and (
        "pattern" not in validation
        or not isinstance(validation["patternMessage"], str)
        or not validation["patternMessage"].strip()
    ):
        validation.pop("patternMessage", None)

    if not validation:
        field.pop("validation", None)


def _normalizar_validation_numero(field: dict[str, Any]) -> None:
    validation = field.get("validation")
    if validation is None:
        return
    if not isinstance(validation, dict):
        field.pop("validation", None)
        return
    for key in ("min", "max"):
        if key in validation and (
            isinstance(validation[key], bool)
            or not isinstance(validation[key], (int, float))
        ):
            validation.pop(key)
    if not validation:
        field.pop("validation", None)


def _normalizar_file(field: dict[str, Any]) -> None:
    bucket = field.get("bucket")
    if not isinstance(bucket, str) or not bucket.strip():
        field["bucket"] = BUCKET_POR_DEFECTO

    accept = field.get("accept")
    if accept is not None:
        if isinstance(accept, list):
            limpio = [a for a in accept if isinstance(a, str) and a.strip()]
            if limpio:
                field["accept"] = limpio
            else:
                field.pop("accept", None)
        else:
            field.pop("accept", None)

    max_size = field.get("maxSizeMB")
    if max_size is not None:
        if isinstance(max_size, bool) or not isinstance(max_size, int) or max_size < 1:
            field.pop("maxSizeMB", None)
        elif max_size > FILE_MAX_SIZE_MB_HARD_CAP:
            field["maxSizeMB"] = FILE_MAX_SIZE_MB_HARD_CAP


def _normalizar_date_range(field: dict[str, Any]) -> None:
    for key in ("openStart", "openEnd"):
        if key in field and not isinstance(field[key], bool):
            field.pop(key)

    catalog = field.get("openCatalog")
    if catalog is not None and (not isinstance(catalog, str) or not catalog.strip()):
        field.pop("openCatalog", None)
        catalog = None
    if catalog and not field.get("openStart") and not field.get("openEnd"):
        field.pop("openCatalog", None)


def _normalizar_show_when(field: dict[str, Any]) -> None:
    show_when = field.get("showWhen")
    if show_when is None:
        return
    if not isinstance(show_when, dict):
        field.pop("showWhen", None)
        return

    target = show_when.get("field")
    if not isinstance(target, str) or not target or "." in target:
        field.pop("showWhen", None)
        return
    if "equals" not in show_when:
        field.pop("showWhen", None)
        return
    equals = show_when["equals"]
    if isinstance(equals, list) and not equals:
        field.pop("showWhen", None)


def _depurar_show_when(fields: list[dict[str, Any]], names: set[str]) -> None:
    for field in fields:
        show_when = field.get("showWhen")
        if isinstance(show_when, dict) and show_when.get("field") not in names:
            field.pop("showWhen", None)
