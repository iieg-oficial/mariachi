from __future__ import annotations

import pytest

from app.services.contraste_service import (
    evaluar,
    incumplimientos,
    luminancia,
    parse_hex,
    ratio,
)


@pytest.mark.parametrize(
    "color,esperado",
    [
        ("#FFFFFF", (255, 255, 255)),
        ("#000", (0, 0, 0)),
        ("465055", (70, 80, 85)),
        ("#ff8300", (255, 131, 0)),
    ],
)
def test_parse_hex_acepta_las_formas_usuales(color, esperado):
    assert parse_hex(color) == esperado


@pytest.mark.parametrize("color", ["", "#12", "#12345", "no-es-color", "#GGGGGG"])
def test_parse_hex_rechaza_lo_que_no_es_color(color):
    assert parse_hex(color) is None


def test_luminancia_en_los_extremos():
    assert luminancia("#000000") == pytest.approx(0.0)
    assert luminancia("#FFFFFF") == pytest.approx(1.0)


def test_ratio_maximo_entre_blanco_y_negro():
    assert ratio("#000000", "#FFFFFF") == pytest.approx(21.0, abs=0.01)


def test_ratio_es_simetrico():
    assert ratio("#465055", "#FFFFFF") == pytest.approx(ratio("#FFFFFF", "#465055"))


def test_ratio_de_un_color_consigo_mismo_es_uno():
    assert ratio("#FF8300", "#FF8300") == pytest.approx(1.0)


def test_el_gris_institucional_de_jalisco_cumple_aa_sobre_blanco():
    hallazgos = evaluar({"color.text": "#465055", "color.bg": "#FFFFFF"})
    assert len(hallazgos) == 1
    assert hallazgos[0]["cumple_aa"] is True
    assert hallazgos[0]["ratio"] > 4.5


def test_el_naranja_institucional_no_cumple_aa_como_texto_sobre_blanco():
    fallos = incumplimientos({"color.text": "#FF8300", "color.bg": "#FFFFFF"})
    assert len(fallos) == 1
    assert fallos[0]["cumple_aa"] is False
    assert fallos[0]["cumple_aa_texto_grande"] is False


def test_solo_evalua_los_pares_que_estan_definidos():
    assert evaluar({"color.text": "#000000"}) == []
    assert evaluar({}) == []


def test_ignora_valores_que_no_son_color():
    assert evaluar({"color.text": "rebeccapurple", "color.bg": "#FFFFFF"}) == []
