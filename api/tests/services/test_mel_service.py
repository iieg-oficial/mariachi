from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.services.mel_service import (
    nombre_css,
    render_design_md,
    render_fonts_css,
    render_theme_css,
    render_tokens_css,
    render_tokens_json,
    valor_css,
)


def token(clave, valor, grupo="color", tipo="color", descripcion=None):
    return SimpleNamespace(
        clave=clave, valor=valor, grupo=grupo, tipo=tipo, descripcion=descripcion
    )


@pytest.mark.parametrize(
    "clave,esperado",
    [
        ("color.primary", "--color-primary"),
        ("color.viz.seq.1", "--color-viz-seq-1"),
        ("font.family.sans", "--font-sans"),
        ("font.size.2xl", "--text-2xl"),
        ("font.weight.bold", "--font-weight-bold"),
        ("leading.tight", "--leading-tight"),
        ("space.4", "--spacing-4"),
        ("radius.md", "--radius-md"),
        ("shadow.lg", "--shadow-lg"),
        ("breakpoint.md", "--breakpoint-md"),
    ],
)
def test_nombre_css_sigue_los_namespaces_de_tailwind_v4(clave, esperado):
    assert nombre_css(clave) == esperado


def test_nombre_css_ignora_claves_fuera_de_los_namespaces():
    assert nombre_css("marca.personalidad") is None


def test_valor_css_une_las_familias_tipograficas():
    assert valor_css(["Garet", "system-ui", "sans-serif"]) == "Garet, system-ui, sans-serif"
    assert valor_css("#465055") == "#465055"
    assert valor_css(1.25) == "1.25"


def test_theme_css_declara_las_variables_dentro_del_bloque():
    css = render_theme_css([token("color.primary", "#465055")])
    assert "@theme {" in css
    assert "  --color-primary: #465055;" in css
    assert css.rstrip().endswith("}")


def test_tokens_css_usa_root_en_lugar_de_theme():
    css = render_tokens_css([token("color.primary", "#465055")])
    assert ":root {" in css
    assert "@theme" not in css


def test_los_tokens_sin_namespace_no_ensucian_el_css():
    css = render_theme_css(
        [token("color.primary", "#465055"), token("marca.tono", "serio")]
    )
    assert "marca" not in css


def test_fonts_css_arma_un_font_face_por_peso():
    fuente = SimpleNamespace(
        familia="Garet",
        formato="opentype",
        base_url="https://acervo.example/tipografia/",
        faces=[{"file": "garet-book.otf", "weight": 400}, {"file": "garet-bold.otf", "weight": 700}],
    )
    css = render_fonts_css([fuente])
    assert css.count("@font-face") == 2
    assert 'src: url("https://acervo.example/tipografia/garet-book.otf") format("opentype")' in css
    assert "font-weight: 700;" in css
    assert "font-display: swap;" in css


def test_fonts_css_tolera_una_familia_sin_archivos():
    fuente = SimpleNamespace(familia="Nexa", formato="opentype", base_url=None, faces=[])
    assert "@font-face" not in render_fonts_css([fuente])


def test_tokens_json_reconstruye_el_arbol_dtcg():
    salida = render_tokens_json(
        [
            token("color.primary", "#465055", descripcion="Gris institucional"),
            token("color.viz.seq.1", "#E3EEF6", grupo="dataviz"),
            token("space.4", "1rem", grupo="espaciado", tipo="dimension"),
        ]
    )
    assert set(salida) == {"color.tokens.json", "dataviz.tokens.json", "space.tokens.json"}

    color = json.loads(salida["color.tokens.json"])
    assert color["color"]["primary"] == {
        "$type": "color",
        "$value": "#465055",
        "$description": "Gris institucional",
    }

    viz = json.loads(salida["dataviz.tokens.json"])
    assert viz["color"]["viz"]["seq"]["1"]["$value"] == "#E3EEF6"


def test_tokens_json_omite_la_descripcion_cuando_no_hay():
    salida = render_tokens_json([token("color.bg", "#FFFFFF")])
    assert "$description" not in json.loads(salida["color.tokens.json"])["color"]["bg"]


def test_design_md_solo_documenta_lo_que_esta_definido():
    marca = SimpleNamespace(codigo="jalisco", nombre="Gobierno de Jalisco")
    md = render_design_md(
        marca,
        {"brand.personality": "Institucional y cercano", "copy.tone": "Formal"},
        [token("color.primary", "#465055", descripcion="Gris institucional")],
    )
    assert "## Principios de marca" in md
    assert "- **Personalidad:** Institucional y cercano" in md
    assert "## Redacción" in md
    assert "## Logotipo" not in md
    assert "TODO" not in md
    assert "| `--color-primary` | `#465055` | Gris institucional |" in md


def test_design_md_siempre_incluye_las_reglas_fijas():
    marca = SimpleNamespace(codigo="iieg", nombre="IIEG")
    md = render_design_md(marca, {}, [])
    assert "## Reglas fijas" in md
    assert "WCAG 2.1 AA" in md
    assert "solo con color" in md
    assert "configuración" in md
