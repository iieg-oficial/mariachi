"""Genera el PDF de un envio con WeasyPrint, reproduciendo el diseno del
PDF de SIEEJ (logos, fuentes Garet, colores institucionales).
"""
from __future__ import annotations

import base64
import re
from datetime import date
from functools import lru_cache
from html import escape
from pathlib import Path
from typing import Any

from weasyprint import HTML

from app.services.sieej.export_format import (
    format_value,
    repeater_item_label,
)

_ASSETS = Path(__file__).resolve().parents[2] / "assets" / "pdf"

_MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


@lru_cache(maxsize=1)
def _fonts_css() -> str:
    def face(filename: str, weight: int) -> str:
        uri = (_ASSETS / "fonts" / filename).as_uri()
        return (
            "@font-face{font-family:'Garet';"
            f"src:url('{uri}');font-weight:{weight};font-style:normal;}}"
        )

    return (
        face("Garet-Regular.otf", 400)
        + face("Garet-Medium.otf", 500)
        + face("Garet-Bold.otf", 700)
    )


@lru_cache(maxsize=8)
def _logo_data_uri(name: str) -> str:
    data = (_ASSETS / name).read_bytes()
    return "data:image/png;base64," + base64.b64encode(data).decode()


_STYLE = """
    @page { size: A4; margin: 30px; }
    * { box-sizing: border-box; }
    body { font-family: 'Garet', sans-serif; color: #191919; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .header img { height: 36px; }
    h1 { font-size: 18px; font-weight: 700; color: #191919; margin: 8px 0; }
    .desc { font-size: 10px; font-weight: 400; color: #7C7C7C; margin-bottom: 6px; }
    h2 { font-size: 14px; font-weight: 700; color: #5C2472; margin: 14px 0 4px; }
    h3 { font-size: 12px; font-weight: 700; color: #191919; margin: 8px 0 4px; }
    .row { display: flex; margin-bottom: 6px; padding: 0 8px; }
    .l { flex: 1; font-size: 9px; font-weight: 400; color: #191919; }
    .v { flex: 2; font-size: 10px; font-weight: 500; color: #5C2472; }
    .v.empty { color: #8E8E8E; }
    .item { padding: 0 4px; }
    .item.sep { border-top: 1px solid #E2E2E2; padding-top: 6px; margin-top: 8px; }
    .repeater { break-inside: avoid; }
"""

_STYLE_LEVANTAMIENTO = """
    @page {
        size: A4;
        margin: 95pt 30pt 75pt 30pt;
        @top-left { content: element(headerLeft); }
        @top-right { content: element(headerRight); }
        @bottom-left { content: element(footerLeft); }
        @bottom-center {
            content: "Página " counter(page) " de " counter(pages);
            font-family: 'Garet';
            font-size: 7pt;
            font-weight: 700;
            color: #465055;
            margin-bottom: 5pt;
        }
        @bottom-right { content: element(footerRight); }
    }
    * { box-sizing: border-box; }
    body { font-family: 'Garet', sans-serif; color: #191919; margin: 0; padding: 0; }
    .lev-hdr-l { position: running(headerLeft); padding-top: 30pt; padding-left: 30pt; }
    .lev-hdr-r { position: running(headerRight); padding-top: 30pt; padding-right: 30pt; text-align: right; }
    .lev-ftr-l { position: running(footerLeft); padding-left: 30pt; padding-bottom: 30pt; }
    .lev-ftr-r { position: running(footerRight); padding-right: 30pt; padding-bottom: 30pt; }

    h1 { font-size: 18pt; font-weight: 700; color: #191919; margin: 5pt 20pt; text-align: left; }
    .section { margin: 5pt 10pt; padding: 5pt 10pt; font-size: 10pt; font-weight: 400; color: #191919; }
    h2 { font-size: 16pt; font-weight: 700; color: #5C2472; margin-bottom: 8pt; }
    h3 { font-size: 14pt; font-weight: 700; color: #191919; margin: 6pt 0; }
    h4 { font-size: 12pt; font-weight: 500; color: #191919; margin-top: 6pt; margin-bottom: 4pt; }
    .field-label { font-size: 10pt; font-weight: 400; color: #191919; margin-bottom: 2pt; }
    .value { font-size: 11pt; font-weight: 500; color: #5C2472; }
    .no-value { font-size: 11pt; font-weight: 500; color: #8E8E8E; }
    .row { display: flex; margin-bottom: 10pt; }
    .col { flex: 1; padding-right: 10pt; }
    .col-last { flex: 1; }
    .repeater-item { break-inside: avoid; }
"""


def _field_html(field: dict[str, Any], value: Any) -> str:
    if field.get("type") == "info":
        return ""
    label = escape(str(field.get("label") or field.get("name") or ""))
    formatted = format_value(field, value)
    if formatted is None:
        value_html = "<span class='v empty'>Sin informacion</span>"
    else:
        value_html = f"<span class='v'>{escape(str(formatted))}</span>"
    return f"<div class='row'><span class='l'>{label}</span>{value_html}</div>"


def _step_html(step: dict[str, Any], step_data: Any) -> str:
    title = escape(str(step.get("title") or ""))
    fields = step.get("fields", [])

    if step.get("type") == "repeater":
        items = step_data if isinstance(step_data, list) else []
        body = ""
        if not items:
            body = "<div class='v empty'>Sin elementos.</div>"
        else:
            for idx, item in enumerate(items):
                item = item if isinstance(item, dict) else {}
                sep = "" if idx == 0 else " sep"
                head = f"{idx + 1}. {escape(repeater_item_label(item, idx))}"
                rows = "".join(_field_html(f, item.get(f.get("name"))) for f in fields)
                body += f"<div class='item{sep}'><h3>{head}</h3>{rows}</div>"
        return f"<div class='repeater'><h2>{title}</h2>{body}</div>"

    data = step_data if isinstance(step_data, dict) else {}
    rows = "".join(_field_html(f, data.get(f.get("name"))) for f in fields)
    return f"<div><h2>{title}</h2>{rows}</div>"


def _build_html(definicion: dict[str, Any], datos: dict[str, Any]) -> str:
    nombre = escape(str(definicion.get("nombre") or "Formulario"))
    desc = definicion.get("descripcion")
    desc_html = f"<div class='desc'>{escape(str(desc))}</div>" if desc else ""

    steps_html = ""
    for step in definicion.get("steps", []):
        if step.get("type") == "summary":
            continue
        steps_html += _step_html(step, datos.get(step.get("id")))

    header = (
        "<div class='header'>"
        f"<img src='{_logo_data_uri('iieg.png')}'/>"
        f"<img src='{_logo_data_uri('sieej.png')}'/>"
        f"<img src='{_logo_data_uri('jal.png')}'/>"
        "</div>"
    )

    return (
        "<html><head><meta charset='utf-8'><style>"
        f"{_fonts_css()}{_STYLE}"
        "</style></head><body>"
        f"{header}<h1>{nombre}</h1>{desc_html}{steps_html}"
        "</body></html>"
    )


def _lev_extract_filename(file_path: Any) -> str:
    if isinstance(file_path, dict):
        return str(file_path.get("name", ""))
    if not isinstance(file_path, str):
        return ""
    name = file_path.rsplit("/", 1)[-1]
    return re.sub(r"\d{14}(?=\.\w+$)", "", name)


def _lev_format_text(value: Any, label: str) -> str:
    if isinstance(value, bool):
        return escape("Si" if value else "No")
    if value == "true":
        return escape("Si")
    if value == "false":
        return escape("No")

    if not value and label and (
        label.startswith("Descripcion") or label.startswith("Descripción")
    ):
        words = label.split(" ")
        second_word = words[1] if len(words) > 1 else ""
        if second_word == "del":
            parts = label.split(" del ")
        else:
            parts = label.split(" de ")
        suffix = parts[1].strip() if len(parts) > 1 else ""
        return f'<span class="no-value">Sin {escape(suffix)}</span>'

    if isinstance(value, str) and value.strip():
        display = value
    elif isinstance(value, (int, float)):
        display = value
    elif isinstance(value, dict):
        display = value.get("value")
    else:
        display = None

    if display is not None and display != "":
        return escape(str(display))
    return '<span class="no-value">Sin datos</span>'


def _lev_field(label: str, value: Any) -> str:
    return (
        f'<div class="field-label">{escape(label)}</div>'
        f'<div class="value">{_lev_format_text(value, label)}</div>'
    )


def _lev_col(label: str, value: Any) -> str:
    return f'<div class="col">{_lev_field(label, value)}</div>'


def _lev_col_last(label: str, value: Any) -> str:
    return f'<div class="col-last">{_lev_field(label, value)}</div>'


def _lev_empty_col() -> str:
    return '<div class="col-last"></div>'


def _lev_adapt_item(item: Any) -> Any:
    if not isinstance(item, dict):
        return item
    result: dict[str, Any] = {}
    for k, v in item.items():
        if v == "true":
            result[k] = True
        elif v == "false":
            result[k] = False
        elif isinstance(v, list):
            result[k] = v
        elif isinstance(v, dict) and "url_publica" in v:
            result[k] = v["url_publica"]
        else:
            result[k] = v
    return result


def _lev_fecha_hoy() -> str:
    hoy = date.today()
    return f"{hoy.day} de {_MESES_ES[hoy.month - 1]} de {hoy.year}"


def _build_levantamiento_html(
    definicion: dict[str, Any], datos: dict[str, Any]
) -> str:
    nombre = escape(str(definicion.get("nombre") or "Formulario"))

    general = _lev_adapt_item(datos.get("general") or {})
    enlaces_list = datos.get("enlaces")
    enlaces = (
        [_lev_adapt_item(x) for x in enlaces_list]
        if isinstance(enlaces_list, list)
        else []
    )
    bases_list = datos.get("bases_datos")
    bases = (
        [_lev_adapt_item(x) for x in bases_list]
        if isinstance(bases_list, list)
        else []
    )

    fecha = _lev_fecha_hoy()
    sieej_src = _logo_data_uri("sieej.png")
    iieg_src = _logo_data_uri("iieg.png")
    jal_src = _logo_data_uri("jal.png")

    header_html = (
        f'<div class="lev-hdr-l">'
        f'<img src="{sieej_src}" style="width:192pt;height:41pt;" />'
        f"</div>"
        f'<div class="lev-hdr-r">'
        f'<span style="font-size:7pt;font-weight:700;color:#465055;">{fecha}</span>'
        f"</div>"
    )

    footer_html = (
        f'<div class="lev-ftr-l">'
        f'<img src="{iieg_src}" style="width:130pt;height:40pt;" />'
        f"</div>"
        f'<div class="lev-ftr-r">'
        f'<img src="{jal_src}" style="width:113pt;height:38pt;" />'
        f"</div>"
    )

    general_section = (
        '<div class="section">'
        "<h2>Información General</h2>"
        '<div class="row">'
        + _lev_col(
            "Nombre del ente de Gobierno",
            general.get("nombre_ente_gobierno"),
        )
        + _lev_col_last("Unidad administrativa", general.get("unidad_admin"))
        + "</div>"
        '<div class="row">'
        + _lev_col(
            "¿Dentro de tu dependencia cuentan con un área responsable en manejo y generación de los datos?",
            general.get("hay_responsable"),
        )
        + _lev_col_last(
            "Descripción del área responsable",
            general.get("descripcion_hay_responsable"),
        )
        + "</div>"
        "<h4>Desafíos y oportunidades</h4>"
        '<div class="row">'
        + _lev_col_last(
            "Desafíos y oportunidades",
            general.get("desafios_oportunidades"),
        )
        + "</div>"
        "</div>"
    )

    enlaces_html = "<h2>Información de Enlaces</h2>"
    if enlaces:
        for i, enlace in enumerate(enlaces):
            if i == 0:
                h3_text = "Enlace Institucional"
            else:
                prefix = f"{i}.- " if len(enlaces) > 1 else ""
                h3_text = f"{prefix}Enlace Técnico"

            enlaces_html += (
                f'<div class="repeater-item" style="margin-bottom:15pt;">'
                f"<h3>{escape(h3_text)}</h3>"
                '<div class="row">'
                + _lev_col("Nombre", enlace.get("nombres"))
                + _lev_col("Primer apellido", enlace.get("apellido1"))
                + _lev_col_last("Segundo apellido", enlace.get("apellido2"))
                + "</div>"
                '<div class="row">'
                + _lev_col("Correo electrónico", enlace.get("email"))
                + _lev_col("Teléfono", enlace.get("telefono"))
                + _lev_col_last("Extensión", enlace.get("extension"))
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "Dirección o Área adscrita",
                    enlace.get("direccion"),
                )
                + _lev_col("Puesto", enlace.get("puesto"))
                + _lev_empty_col()
                + "</div>"
                "<h4>Jefe directo</h4>"
                '<div class="row">'
                + _lev_col("Nombre", enlace.get("nombres_jefe"))
                + _lev_col(
                    "Primer apellido", enlace.get("apellido1_jefe")
                )
                + _lev_col_last(
                    "Segundo apellido", enlace.get("apellido2_jefe")
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "Correo electrónico", enlace.get("email_jefe")
                )
                + _lev_col("Puesto", enlace.get("puesto_jefe"))
                + _lev_empty_col()
                + "</div>"
                "</div>"
            )
    else:
        enlaces_html += (
            "<div>No hay información de enlaces disponible.</div>"
        )

    bases_html = "<h2>Información de Bases de Datos</h2>"
    if bases:
        for i, bd in enumerate(bases):
            nombre_bd = escape(str(bd.get("nombre_bd") or ""))

            ruta_diccionario = bd.get("ruta_diccionario")
            diccionario_name = _lev_extract_filename(ruta_diccionario)

            bases_html += (
                f'<div class="repeater-item" style="margin-bottom:15pt;">'
                f"<h3>{i + 1}.- {nombre_bd}</h3>"
                '<div class="row">'
                + _lev_col_last(
                    "Descripción breve de la base de datos",
                    bd.get("descripcion_bd"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "Categoría de los datos",
                    bd.get("categoria_datos"),
                )
                + _lev_col_last(
                    "Herramienta utilizada para la gestión",
                    bd.get("herramientas_gestion"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿Cómo se asegura la calidad de los datos?",
                    bd.get("calidad_datos"),
                )
                + _lev_col_last(
                    "¿De dónde provienen las bases de datos que utilizan?",
                    bd.get("proveedores_bd"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿Existen procesos de limpieza y validación de esta base de datos?",
                    bd.get("limpieza_validacion"),
                )
                + _lev_col_last(
                    "Descripción de limpieza y validación",
                    bd.get("desc_limpieza_validacion"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "Frecuencia de actualización",
                    bd.get("periodicidad"),
                )
                + _lev_col_last(
                    "Descripción de frecuencia de actualización",
                    bd.get("desc_periodicidad"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿La base de datos cuenta con un diccionario?",
                    bd.get("tiene_diccionario"),
                )
                + _lev_col_last(
                    "Nombre de diccionario agregado",
                    diccionario_name,
                )
                + "</div>"
                "<h4>Uso y aplicación de datos</h4>"
                '<div class="row">'
                + _lev_col(
                    "Objetivos del uso de la base de datos",
                    bd.get("objetivo_uso"),
                )
                + _lev_col_last(
                    "Usuarios de los datos",
                    bd.get("usuarios_datos"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col_last(
                    "En caso de ser proveedores externos, menciona la empresa",
                    bd.get("quienes_son"),
                )
                + "</div>"
                "<h4>Historial y evolución de la base de datos</h4>"
                '<div class="row">'
                + _lev_col(
                    "¿Existen registros históricos de las bases de datos?",
                    bd.get("historicos"),
                )
                + _lev_col_last(
                    "Descripción de históricos",
                    bd.get("desc_historicos"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿Hubo migración o actualización de la base de datos con respecto a las versiones anteriores?",
                    bd.get("migracion_actualizacion"),
                )
                + _lev_col_last(
                    "Descripción de migración y actualización",
                    bd.get("desc_migracion_actualizacion"),
                )
                + "</div>"
                "<h4>Seguridad y Protección de los Datos</h4>"
                '<div class="row">'
                + _lev_col(
                    "¿Qué medidas de seguridad se han implementado para la protección y manejo de las bases de datos?",
                    bd.get("medidas_seguridad"),
                )
                + _lev_col_last(
                    "Descripción de medidas de seguridad",
                    bd.get("desc_medidas_seguridad"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿Dispone de normativas internas para el manejo y protección de las bases de datos?",
                    bd.get("normativas_proteccion"),
                )
                + _lev_col_last(
                    "Descripción de normativas de protección",
                    bd.get("desc_normativas_proteccion"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿Cuenta con una política o plan de contingencia para la seguridad de las bases de datos en caso de fallos o incidencias?",
                    bd.get("plan_contingencia"),
                )
                + _lev_col_last(
                    "Descripción del plan de contingencia",
                    bd.get("desc_plan_contingencia"),
                )
                + "</div>"
                "<h4>Interoperabilidad</h4>"
                '<div class="row">'
                + _lev_col(
                    "¿Se cuenta con interoperabilidad con otras bases de datos de otros entes de gobierno (municipales, estatales o federales)?",
                    bd.get("interoperatividad"),
                )
                + _lev_col_last(
                    "Descripción de interoperatividad",
                    bd.get("desc_interoperatividad"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "¿Existen plataformas destinadas para la difusión de información con la ciudadanía?",
                    bd.get("plataforma_difusion"),
                )
                + _lev_col_last(
                    "Descripción del nombre",
                    bd.get("nombre_plataforma_difusion"),
                )
                + "</div>"
                '<div class="row">'
                + _lev_col(
                    "Descripción del URL",
                    bd.get("url_plataforma_difusion"),
                )
                + _lev_empty_col()
                + "</div>"
                "</div>"
            )
    else:
        bases_html += (
            "<div>No hay información de bases de datos disponible.</div>"
        )

    return (
        "<html><head><meta charset='utf-8'><style>"
        f"{_fonts_css()}{_STYLE_LEVANTAMIENTO}"
        "</style></head><body>"
        f"{header_html}{footer_html}"
        f"<h1>{nombre}</h1>"
        f"{general_section}"
        '<div class="section">'
        f"{enlaces_html}"
        "</div>"
        '<div class="section">'
        f"{bases_html}"
        "</div>"
        "</body></html>"
    )


def _get_pdf_template(definicion: dict[str, Any]) -> str | None:
    for step in definicion.get("steps", []):
        if step.get("type") == "summary":
            return step.get("pdfTemplate")
    return None


def render_envio_pdf(
    definicion: dict[str, Any], datos: dict[str, Any]
) -> bytes:
    definicion = definicion or {}
    datos = datos or {}

    template = _get_pdf_template(definicion)
    if template == "sieej-levantamiento":
        html = _build_levantamiento_html(definicion, datos)
    else:
        html = _build_html(definicion, datos)

    return HTML(string=html).write_pdf()
