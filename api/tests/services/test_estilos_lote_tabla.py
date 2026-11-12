from __future__ import annotations

import pytest

from app.services.estilos_lote_tabla import (
    TablaInvalidaError,
    formato_numero,
    generar_labels,
    interpretar_fila,
    leer_cortes,
    leer_tabla,
    validar_cortes,
)

CABECERA = 'capa,nombre_capa_geoserver,campo,unidades,paleta,orientacion_favorable,cortes_rangos'

PALETAS = {
    'S_ROJO_5': {'name': 'S_ROJO_5', 'tipo': 'secuencial', 'colors': ['#1', '#2', '#3', '#4', '#5']},
    'S_ROJO_7': {'name': 'S_ROJO_7', 'tipo': 'secuencial', 'colors': ['#1', '#2', '#3', '#4', '#5', '#6', '#7']},
    'D_5': {'name': 'D_5', 'tipo': 'divergente', 'colors': ['#a', '#b', '#c', '#d', '#e']},
}


def _fila(**cambios: str) -> dict[str, str]:
    base = {
        'capa': 'Homicidio doloso (tasa)',
        'nombre_capa_geoserver': 'seguridad:homicidio',
        'campo': 'tasa',
        'unidades': 'por 100 mil',
        'paleta': 'S_ROJO_5',
        'orientacion_favorable': 'Inferior',
        'cortes_rangos': '[0, 0, 1, 3, 6, null]',
    }
    return {**base, **cambios}


def test_leer_tabla_con_comas_y_comillas():
    texto = f'{CABECERA}\nTasa,ws:capa,valor,%,S_ROJO_5,Inferior,"[0, 1, 2, 3, 4, 5]"\n'
    filas = leer_tabla(texto)
    assert filas == [{
        'capa': 'Tasa', 'nombre_capa_geoserver': 'ws:capa', 'campo': 'valor', 'unidades': '%',
        'paleta': 'S_ROJO_5', 'orientacion_favorable': 'Inferior', 'cortes_rangos': '[0, 1, 2, 3, 4, 5]',
    }]


def test_leer_tabla_pegada_de_excel_con_tabuladores_y_bom():
    texto = '﻿' + CABECERA.replace(',', '\t') + '\nTasa\tws:capa\tvalor\t%\tS_ROJO_5\t\t0, 1, 2, 3, 4, 5\n\n'
    filas = leer_tabla(texto)
    assert len(filas) == 1
    assert filas[0]['cortes_rangos'] == '0, 1, 2, 3, 4, 5'


@pytest.mark.parametrize('texto, mensaje', [
    ('', 'vacía'),
    ('capa,campo\nA,b', 'Faltan columnas'),
    (CABECERA + '\n', 'no tiene filas'),
])
def test_leer_tabla_invalida(texto: str, mensaje: str):
    with pytest.raises(TablaInvalidaError, match=mensaje):
        leer_tabla(texto)


def test_leer_cortes():
    assert leer_cortes('[0,0, 1, 2.5, null]') == [0, 0, 1, 2.5, None]
    assert leer_cortes('0, 10, y más') == [0, 10, None]
    with pytest.raises(ValueError):
        leer_cortes('0, uno, 2')


@pytest.mark.parametrize('cortes, error', [
    ([0, 1, 2], None),
    ([0, 0, 1, 2], None),
    ([0, 1, None], None),
    ([0, 1], 'Faltan cortes'),
    ([None, 1, 2], None),
    ([0, None, 2], 'principio o al final'),
    ([None, None, 2], 'principio o al final'),
    ([0, 2, 1], 'menor a mayor'),
    ([0, 1, 1, 2], 'menor a mayor'),
    ([0, 0, 0, 2], 'Solo el primer corte'),
])
def test_validar_cortes(cortes, error):
    errores = validar_cortes(cortes)
    if error is None:
        assert errores == []
    else:
        assert error in errores[0]


def test_formato_numero_con_espacios_de_miles():
    assert formato_numero(1000000) == '1 000 000'
    assert formato_numero(2500.0) == '2 500'
    assert formato_numero(3.5) == '3.5'
    assert formato_numero(-1250.25) == '-1 250.25'


def test_labels_con_cero_aparte_y_ultima_abierta():
    assert generar_labels([0, 0, 1, 3, None], 'tasa') == ['0', '0 a 1', '1 a 3', '> 3']


def test_labels_con_primera_abierta():
    assert generar_labels([None, -30, 0, 30, None], '%') == ['< -30 %', '-30 a 0 %', '0 a 30 %', '> 30 %']


def test_labels_en_porcentaje():
    assert generar_labels([0, 30, 100], '%') == ['0 a 30 %', '30 a 100 %']


def test_interpretar_fila_valida():
    fila = interpretar_fila(2, _fila(), PALETAS)
    assert fila.errores == []
    assert fila.workspace == 'seguridad'
    assert fila.layer_name == 'homicidio'
    assert fila.cortes == [0, 0, 1, 3, 6, None]
    assert fila.labels == ['0', '0 a 1', '1 a 3', '3 a 6', '> 6']
    assert fila.colores == ['#1', '#2', '#3', '#4', '#5']


def test_superior_invierte_los_colores():
    fila = interpretar_fila(2, _fila(orientacion_favorable='Superior'), PALETAS)
    assert fila.colores == ['#5', '#4', '#3', '#2', '#1']


def test_paleta_mas_larga_se_recorta_como_el_pipeline():
    fila = interpretar_fila(2, _fila(paleta='S_ROJO_7'), PALETAS)
    assert fila.colores == ['#1', '#2', '#3', '#4', '#5']


@pytest.mark.parametrize('cambios, error', [
    ({'paleta': 'NO_EXISTE'}, 'no existe'),
    ({'cortes_rangos': '[0, 1, 2, 3, 4, 5, 6]'}, 'La paleta tiene 5 colores y hay 6 clases'),
    ({'nombre_capa_geoserver': 'sin_workspace'}, 'workspace:capa'),
    ({'campo': ''}, 'Falta el campo'),
    ({'cortes_rangos': '0, a, 2'}, 'No entiendo el corte «a»'),
])
def test_interpretar_fila_con_errores(cambios, error):
    fila = interpretar_fila(2, _fila(**cambios), PALETAS)
    assert any(error in e for e in fila.errores), fila.errores


@pytest.mark.parametrize('paleta', ['D_5', 'S_ROJO_5'])
def test_central_no_bloquea_ninguna_paleta(paleta):
    fila = interpretar_fila(2, _fila(orientacion_favorable='Central', paleta=paleta), PALETAS)
    assert fila.errores == []


def test_borrador_data_lleva_estilo_por_defecto():
    fila = interpretar_fila(2, _fila(), PALETAS)
    fila.alias = 'seguridad'
    data = fila.borrador_data()
    assert fila.resource_id == 'seguridad:homicidio'
    assert data['shape'] == 'choropleth'
    assert data['default_style'] is True
    assert data['style_abstract'] == 'Unidades: por 100 mil'
    assert data['null_style']['enabled'] is True
