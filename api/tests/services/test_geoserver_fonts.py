from __future__ import annotations

import pytest

from app.api.routes.geoserver import _font_key, _sld_href


@pytest.mark.parametrize(
    "archivo,familia",
    [
        ("Roboto-Regular.ttf", "Roboto"),
        ("Roboto-BoldItalic.ttf", "Roboto"),
        ("open_sans_semibold.otf", "Open Sans"),
        ("MonserratLight.ttf", "MonserratLight"),
        ("iieg-titulos.ttf", "IIEG Titulos"),
    ],
)
def test_font_key_empareja_archivo_con_familia(archivo, familia):
    assert _font_key(archivo) == _font_key(familia)


def test_font_key_no_confunde_familias_distintas():
    assert _font_key("Roboto-Bold.ttf") != _font_key("Roboto Slab")
    assert _font_key("Lato-Regular.ttf") != _font_key("Latino")


def test_font_key_ignora_ruta_y_extension():
    assert _font_key("fuentes/subcarpeta/Roboto-Regular.ttf") == _font_key("Roboto")


def test_sld_href_global_es_la_ruta_tal_cual():
    assert _sld_href("iconos/escuela.svg", None) == "iconos/escuela.svg"
    assert _sld_href("escuela.svg", None) == "escuela.svg"


def test_sld_href_en_workspace_dentro_de_styles_no_sube_nivel():
    assert _sld_href("styles/escuela.svg", "general") == "escuela.svg"
    assert _sld_href("styles/iconos/escuela.svg", "general") == "iconos/escuela.svg"


def test_sld_href_en_workspace_fuera_de_styles_sube_un_nivel():
    assert _sld_href("escuela.svg", "general") == "../escuela.svg"
    assert _sld_href("simbolos/escuela.svg", "general") == "../simbolos/escuela.svg"
