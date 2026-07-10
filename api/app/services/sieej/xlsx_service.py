"""Exporta los envios de un formulario a un libro de Excel (openpyxl).

Hoja principal `Envios`: una fila por envio, columnas de metadatos +
un campo por cada campo de los pasos tipo `form`. Cada paso `repeater`
genera una hoja aparte con una fila por item.
"""
from __future__ import annotations

from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Font

from app.services.sieej.export_format import format_value

ESTADO_LABEL = {
    "en_proceso": "En proceso",
    "enviado": "Enviado",
    "expirado": "Expirado",
}


def _cell(field: dict[str, Any], value: Any) -> str:
    return format_value(field, value) or ""


def _form_fields(definiciones: list[dict[str, Any]]) -> list[tuple[dict, dict]]:
    seen: dict[tuple, tuple[dict, dict]] = {}
    order: list[tuple] = []
    for definicion in definiciones:
        for step in (definicion or {}).get("steps", []):
            if step.get("type") in ("summary", "repeater"):
                continue
            for field in step.get("fields", []):
                if field.get("type") == "info":
                    continue
                key = (step.get("id"), field.get("name"))
                if key not in seen:
                    seen[key] = (step, field)
                    order.append(key)
    return [seen[k] for k in order]


def _repeater_steps(definiciones: list[dict[str, Any]]) -> list[tuple[dict, list[dict]]]:
    steps: dict[Any, dict] = {}
    order: list[Any] = []
    fields: dict[Any, tuple[dict, list]] = {}
    for definicion in definiciones:
        for step in (definicion or {}).get("steps", []):
            if step.get("type") != "repeater":
                continue
            sid = step.get("id")
            if sid not in steps:
                steps[sid] = step
                order.append(sid)
                fields[sid] = ({}, [])
            fmap, forder = fields[sid]
            for field in step.get("fields", []):
                if field.get("type") == "info":
                    continue
                fname = field.get("name")
                if fname not in fmap:
                    fmap[fname] = field
                    forder.append(fname)
    return [(steps[sid], [fields[sid][0][n] for n in fields[sid][1]]) for sid in order]


def _unique_sheet_title(wb: Workbook, base: str) -> str:
    title = (base or "Datos")[:31]
    candidate = title
    i = 1
    while candidate in wb.sheetnames:
        suffix = f" ({i})"
        candidate = title[: 31 - len(suffix)] + suffix
        i += 1
    return candidate


def _bold_header(ws) -> None:
    for cell in ws[1]:
        cell.font = Font(bold=True)


def build_envios_xlsx(envios: list[dict[str, Any]]) -> bytes:
    definiciones = [e.get("definicion") or {} for e in envios]
    wb = Workbook()
    ws = wb.active
    ws.title = "Envios"

    form_fields = _form_fields(definiciones)
    meta = ["ID", "Usuario", "Email", "Estado", "Enviado"]
    ws.append(meta + [f.get("label") or f.get("name") for _, f in form_fields])
    _bold_header(ws)

    for envio in envios:
        datos = envio.get("datos") or {}
        row = [
            envio.get("id"),
            envio.get("usuario_nombre") or "",
            envio.get("usuario_email") or "",
            ESTADO_LABEL.get(envio.get("estado"), envio.get("estado") or ""),
            envio.get("enviado_en") or "",
        ]
        for step, field in form_fields:
            raw = datos.get(step.get("id"))
            step_data = raw if isinstance(raw, dict) else {}
            row.append(_cell(field, step_data.get(field.get("name"))))
        ws.append(row)

    for step, fields in _repeater_steps(definiciones):
        rs = wb.create_sheet(_unique_sheet_title(wb, step.get("title") or step.get("id")))
        rs.append(["Envio ID", "Usuario", "#"] + [f.get("label") or f.get("name") for f in fields])
        _bold_header(rs)
        for envio in envios:
            items = (envio.get("datos") or {}).get(step.get("id"))
            if not isinstance(items, list):
                continue
            for i, item in enumerate(items):
                item = item if isinstance(item, dict) else {}
                rs.append(
                    [envio.get("id"), envio.get("usuario_nombre") or "", i + 1]
                    + [_cell(f, item.get(f.get("name"))) for f in fields]
                )

    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()
