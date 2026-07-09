"""Validador de la estructura JSONB de una definicion de formulario.

Se ejecuta al crear/editar un formulario. Garantiza que:
  - El root tiene `version` y `steps` no vacios.
  - Cada step es de tipo `form`, `repeater` o `summary`.
  - Cada field tiene tipo conocido y no mezcla `options` con `catalog`.
  - Los `showWhen.field` apuntan a un field existente (no necesariamente
    en el mismo step; puede referenciar steps anteriores).
  - `maxSizeMB` no excede el cap absoluto de 100 MB.
  - `name` de fields y `id` de steps son unicos por scope.

Lanza `DefinicionInvalidaError` con mensaje descriptivo en el primer error.
"""
from __future__ import annotations

import re
from typing import Any

FIELD_TYPES = {
    "text",
    "textarea",
    "number",
    "email",
    "tel",
    "date",
    "select",
    "select_multiple",
    "radio",
    "checkbox",
    "file",
    "info",
}
STEP_TYPES = {"form", "repeater", "summary"}
FILE_MAX_SIZE_MB_HARD_CAP = 100

ValidationRule = dict[str, Any]


class DefinicionInvalidaError(ValueError):
    """Error semantico en la definicion del formulario."""


def validar_definicion(definicion: Any) -> None:
    if not isinstance(definicion, dict):
        raise DefinicionInvalidaError("La definicion debe ser un objeto.")

    version = definicion.get("version")
    if not isinstance(version, int) or version < 1:
        raise DefinicionInvalidaError("`version` debe ser un entero >= 1.")

    steps = definicion.get("steps")
    if not isinstance(steps, list) or not steps:
        raise DefinicionInvalidaError("`steps` debe ser una lista no vacia.")

    seen_step_ids: set[str] = set()
    field_paths: set[str] = set()

    for idx, step in enumerate(steps):
        _validar_step(step, idx, seen_step_ids, field_paths)

    _validar_show_when_refs(steps, field_paths)


def _validar_show_when_refs(steps: list, field_paths: set[str]) -> None:
    for step in steps:
        if not isinstance(step, dict):
            continue
        step_id = step.get("id", "?")
        for field in step.get("fields", []) or []:
            if not isinstance(field, dict):
                continue
            show_when = field.get("showWhen")
            if not isinstance(show_when, dict):
                continue
            target = show_when.get("field")
            if not isinstance(target, str) or not target:
                continue
            if "." not in target:
                target = f"{step_id}.{target}"
            if target not in field_paths:
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{field.get('name', '?')}`: "
                    f"`showWhen.field` apunta a `{target}` que no existe en el formulario."
                )


def _validar_step(
    step: Any,
    idx: int,
    seen_step_ids: set[str],
    field_paths: set[str],
) -> None:
    if not isinstance(step, dict):
        raise DefinicionInvalidaError(f"Step {idx} debe ser un objeto.")

    step_id = step.get("id")
    if not isinstance(step_id, str) or not step_id:
        raise DefinicionInvalidaError(f"Step {idx}: `id` requerido (string).")
    if step_id in seen_step_ids:
        raise DefinicionInvalidaError(f"Step `{step_id}` esta duplicado.")
    seen_step_ids.add(step_id)

    step_type = step.get("type")
    if step_type not in STEP_TYPES:
        raise DefinicionInvalidaError(
            f"Step `{step_id}`: `type` debe ser uno de {sorted(STEP_TYPES)}."
        )

    if not isinstance(step.get("title"), str) or not step["title"]:
        raise DefinicionInvalidaError(f"Step `{step_id}`: `title` requerido.")

    _validar_incomplete_notice(step, step_id)

    if step_type == "summary":
        return

    if step_type == "repeater":
        min_items = step.get("minItems")
        max_items = step.get("maxItems")
        if min_items is not None and (not isinstance(min_items, int) or min_items < 0):
            raise DefinicionInvalidaError(f"Step `{step_id}`: `minItems` invalido.")
        if max_items is not None and (
            not isinstance(max_items, int) or max_items < 1
        ):
            raise DefinicionInvalidaError(f"Step `{step_id}`: `maxItems` invalido.")
        if (
            isinstance(min_items, int)
            and isinstance(max_items, int)
            and min_items > max_items
        ):
            raise DefinicionInvalidaError(
                f"Step `{step_id}`: `minItems` ({min_items}) > `maxItems` ({max_items})."
            )
        tabs = step.get("tabs")
        if tabs is not None:
            if not isinstance(tabs, list) or not tabs:
                raise DefinicionInvalidaError(
                    f"Step `{step_id}`: `tabs` debe ser lista no vacia."
                )
            tab_ids: set[str] = set()
            for tab in tabs:
                if not isinstance(tab, dict):
                    raise DefinicionInvalidaError(
                        f"Step `{step_id}`: tabs deben ser objetos."
                    )
                tab_id = tab.get("id")
                if not isinstance(tab_id, str) or not tab_id:
                    raise DefinicionInvalidaError(
                        f"Step `{step_id}`: tab sin `id`."
                    )
                if tab_id in tab_ids:
                    raise DefinicionInvalidaError(
                        f"Step `{step_id}`: tab `{tab_id}` duplicado."
                    )
                tab_ids.add(tab_id)

    fields = step.get("fields")
    if not isinstance(fields, list) or not fields:
        raise DefinicionInvalidaError(
            f"Step `{step_id}`: `fields` debe ser lista no vacia."
        )

    field_names: set[str] = set()
    for field_idx, field in enumerate(fields):
        _validar_field(field, step_id, step_type, step.get("tabs"), field_idx, field_names)
        field_paths.add(f"{step_id}.{field['name']}")


def _validar_incomplete_notice(step: dict[str, Any], step_id: str) -> None:
    notice = step.get("incompleteNotice")
    if notice is None:
        return
    if not isinstance(notice, dict):
        raise DefinicionInvalidaError(
            f"Step `{step_id}`: `incompleteNotice` debe ser objeto."
        )
    for key in ("title", "message"):
        if key in notice and (
            not isinstance(notice[key], str) or not notice[key]
        ):
            raise DefinicionInvalidaError(
                f"Step `{step_id}`: `incompleteNotice.{key}` debe ser string no vacio."
            )


def _validar_field(
    field: Any,
    step_id: str,
    step_type: str,
    step_tabs: Any,
    field_idx: int,
    field_names: set[str],
) -> None:
    if not isinstance(field, dict):
        raise DefinicionInvalidaError(
            f"Step `{step_id}`: field {field_idx} debe ser objeto."
        )

    name = field.get("name")
    if not isinstance(name, str) or not name:
        raise DefinicionInvalidaError(
            f"Step `{step_id}`: field {field_idx} sin `name`."
        )
    if name in field_names:
        raise DefinicionInvalidaError(
            f"Step `{step_id}`: field `{name}` duplicado."
        )
    field_names.add(name)

    field_type = field.get("type")
    if field_type not in FIELD_TYPES:
        raise DefinicionInvalidaError(
            f"Step `{step_id}` field `{name}`: type debe ser uno de {sorted(FIELD_TYPES)}."
        )

    if field_type == "info":
        return

    label = field.get("label")
    if not isinstance(label, str) or not label:
        raise DefinicionInvalidaError(
            f"Step `{step_id}` field `{name}`: `label` requerido."
        )

    if field_type in {"select", "select_multiple", "radio", "checkbox"}:
        has_options = isinstance(field.get("options"), list) and field["options"]
        has_catalog = isinstance(field.get("catalog"), str) and field["catalog"]
        if has_options and has_catalog:
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: no puede mezclar `options` y `catalog`."
            )
        if not has_options and not has_catalog and field_type != "checkbox":
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: requiere `options` o `catalog`."
            )
        if has_options:
            for opt_idx, opt in enumerate(field["options"]):
                if not isinstance(opt, dict):
                    raise DefinicionInvalidaError(
                        f"Step `{step_id}` field `{name}`: option {opt_idx} debe ser objeto."
                    )
                if not isinstance(opt.get("value"), str):
                    raise DefinicionInvalidaError(
                        f"Step `{step_id}` field `{name}`: option {opt_idx} sin `value`."
                    )
                if not isinstance(opt.get("label"), str):
                    raise DefinicionInvalidaError(
                        f"Step `{step_id}` field `{name}`: option {opt_idx} sin `label`."
                    )

    if field_type == "file":
        max_size = field.get("maxSizeMB")
        if max_size is not None:
            if not isinstance(max_size, int) or max_size < 1:
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{name}`: `maxSizeMB` invalido."
                )
            if max_size > FILE_MAX_SIZE_MB_HARD_CAP:
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{name}`: `maxSizeMB` excede el cap "
                    f"de {FILE_MAX_SIZE_MB_HARD_CAP} MB."
                )
        accept = field.get("accept")
        if accept is not None and (
            not isinstance(accept, list)
            or not all(isinstance(a, str) for a in accept)
        ):
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `accept` debe ser lista de strings."
            )
        bucket = field.get("bucket")
        if not isinstance(bucket, str) or not bucket:
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `bucket` requerido para tipo `file`."
            )

    if field_type == "number":
        validation = field.get("validation") or {}
        for key in ("min", "max"):
            if key in validation and not isinstance(validation[key], (int, float)):
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{name}`: `validation.{key}` debe ser numerico."
                )

    if field_type in {"text", "textarea", "email", "tel"}:
        validation = field.get("validation") or {}
        for key in ("minLength", "maxLength"):
            if key in validation and (
                not isinstance(validation[key], int) or validation[key] < 0
            ):
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{name}`: `validation.{key}` debe ser entero >= 0."
                )
        if "pattern" in validation:
            pattern = validation["pattern"]
            if not isinstance(pattern, str) or not pattern:
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{name}`: `validation.pattern` debe ser string no vacio."
                )
            try:
                re.compile(pattern)
            except re.error:
                raise DefinicionInvalidaError(
                    f"Step `{step_id}` field `{name}`: `validation.pattern` no es una expresion regular valida."
                )
        if "patternMessage" in validation and (
            not isinstance(validation["patternMessage"], str)
            or not validation["patternMessage"]
        ):
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `validation.patternMessage` debe ser string no vacio."
            )

    if step_type == "repeater" and isinstance(step_tabs, list) and step_tabs:
        tab_ref = field.get("tab")
        valid_tab_ids = {t.get("id") for t in step_tabs if isinstance(t, dict)}
        if tab_ref is not None and tab_ref not in valid_tab_ids:
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `tab` `{tab_ref}` no existe en el step."
            )

    show_when = field.get("showWhen")
    if show_when is not None:
        if not isinstance(show_when, dict):
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `showWhen` debe ser objeto."
            )
        if not isinstance(show_when.get("field"), str):
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `showWhen.field` requerido."
            )
        if "equals" not in show_when:
            raise DefinicionInvalidaError(
                f"Step `{step_id}` field `{name}`: `showWhen.equals` requerido."
            )


def definicion_to_validation_rules(
    definicion: dict[str, Any],
) -> list[ValidationRule]:
    """Aplana la definicion a reglas de validacion (consumido por
    `GET /formularios/:slug/schema`).

    Cada regla tiene `field_path`, `rule` y los argumentos relevantes.
    El frontend usa esto para mostrar mensajes inline antes del PUT.
    """
    rules: list[ValidationRule] = []
    for step in definicion.get("steps", []):
        if step.get("type") == "summary":
            continue
        for field in step.get("fields", []):
            if field.get("type") == "info":
                continue
            field_path = f"{step['id']}.{field['name']}"
            base = {"field_path": field_path}

            if field.get("required"):
                show_when = field.get("showWhen")
                if show_when:
                    rules.append(
                        {
                            **base,
                            "rule": "required_when",
                            "field": show_when["field"],
                            "equals": show_when["equals"],
                        }
                    )
                else:
                    rules.append({**base, "rule": "required"})

            validation = field.get("validation") or {}
            for key in ("minLength", "maxLength", "pattern", "min", "max"):
                if key in validation:
                    rule = {**base, "rule": key, "value": validation[key]}
                    if key == "pattern" and "patternMessage" in validation:
                        rule["message"] = validation["patternMessage"]
                    rules.append(rule)

            if field.get("type") == "file":
                if "maxSizeMB" in field:
                    rules.append(
                        {**base, "rule": "maxSizeMB", "value": field["maxSizeMB"]}
                    )
                if "accept" in field:
                    rules.append(
                        {**base, "rule": "accept", "value": field["accept"]}
                    )

    return rules
