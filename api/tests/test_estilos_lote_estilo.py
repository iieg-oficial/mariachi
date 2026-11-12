from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.models.borrador import Borrador
from app.services import borrador_service, estilos_lote, estilos_lote_estilo
from app.services.estilos_lote_tabla import TablaInvalidaError, interpretar_fila, leer_tabla

FIXTURES = Path(__file__).resolve().parent / 'fixtures' / 'slds'
XML = '<StyledLayerDescriptor><NamedLayer><Name>homicidio</Name></NamedLayer></StyledLayerDescriptor>'


def _fila(paleta: str, colores: str = '') -> dict[str, str]:
    return {
        'capa': 'Homicidio', 'nombre_capa_geoserver': 'seguridad:homicidio', 'campo': 'tasa',
        'paleta': paleta, 'tipo': 'secuencial unitono', 'severidad': 'Sensible', 'cortes_rangos': '[0, 1, 2]',
        'colores': colores,
    }


def test_la_paleta_dice_tipo_clases_y_severidades():
    paletas = {
        'S_ROJO_7_CRITICA': {'tipo': 'secuencial', 'colors': ['#111111', '#222222']},
        'D_9_S_A_5_SENSIBLE_S_B_5_COMPARATIVA': {'tipo': 'divergente', 'colors': ['#111111', '#222222']},
    }
    secuencial = interpretar_fila(2, _fila('S_ROJO_7_CRITICA'), paletas)
    assert (secuencial.tipo, secuencial.numero_clases, secuencial.severidad, secuencial.severidad_2) == (
        'secuencial', 2, 'Crítico', '',
    )
    divergente = interpretar_fila(2, _fila('D_9_S_A_5_SENSIBLE_S_B_5_COMPARATIVA'), paletas)
    assert (divergente.severidad, divergente.severidad_2) == ('Sensible', 'Comparativa')
    propia = interpretar_fila(2, _fila('', '#111111 #222222'), paletas)
    assert (propia.tipo, propia.severidad) == ('personalizada', 'Sensible')
    assert list(propia.fila_tabla())[:11] == list(estilos_lote.COLUMNAS_TABLA)[:11]


def test_tabla_de_estilo_publicado():
    cliente = MagicMock()
    cliente.get_sld.return_value = (FIXTURES / 'pobreza_extrema.sld').read_text(encoding='utf-8')
    fila = leer_tabla(estilos_lote_estilo.tabla_de_estilo('bienestar', 'pobreza_extrema', cliente))[0]
    assert fila['nombre_estilo'] == 'pobreza_extrema'
    assert fila['nombre_capa_geoserver'].startswith('bienestar:')
    assert fila['colores'].count('#') == fila['cortes_rangos'].count(',')


def test_tabla_de_estilo_que_no_es_coropletico():
    cliente = MagicMock()
    cliente.get_sld.return_value = XML
    with pytest.raises(TablaInvalidaError, match='XML'):
        estilos_lote_estilo.tabla_de_estilo('seguridad', 'homicidio', cliente)


def test_guardar_xml_crea_y_actualiza_el_borrador(db_session, admin_user):
    primero = estilos_lote_estilo.guardar_xml(db_session, 'seguridad', 'homicidio', 'homicidio', XML, admin_user)
    segundo = estilos_lote_estilo.guardar_xml(
        db_session, 'seguridad', 'homicidio', 'homicidio', XML.replace('homicidio', 'otro'), admin_user,
    )
    assert primero.id == segundo.id
    assert segundo.data['shape'] == 'xml'
    assert segundo.data['default_style'] is False
    assert estilos_lote.borradores_sin_publicar(db_session)[0].id == segundo.id
    with pytest.raises(TablaInvalidaError):
        estilos_lote.tabla_de_borradores([segundo.id], db_session, MagicMock())


def test_guardar_xml_invalido(db_session, admin_user):
    with pytest.raises(TablaInvalidaError, match='XML no es válido'):
        estilos_lote_estilo.guardar_xml(db_session, 'seguridad', 'homicidio', 'homicidio', '<roto', admin_user)


def test_aprobar_xml_sube_el_texto_tal_cual():
    borrador = Borrador(
        resource_type='sld', resource_id='seguridad:homicidio', usuario_id=1, estado='pendiente_revision',
        data={'shape': 'xml', 'xml': XML, 'layer_name': 'homicidio', 'default_style': False},
    )
    dataengine = MagicMock()
    dataengine.query.return_value.filter.return_value.first.return_value = MagicMock(
        geoserver_workspace='seguridad_y_proteccion',
    )
    with patch.object(borrador_service, 'GeoServerClient') as cliente, \
            patch.object(borrador_service, 'notify_tree_changed'):
        cliente.return_value.put_sld.return_value = 'sha'
        borrador_service.apply_borrador(None, dataengine, borrador, 'admin@example.com')
    cliente.return_value.put_sld.assert_called_once_with('seguridad_y_proteccion', 'homicidio', XML)
    cliente.return_value.set_layer_default_style.assert_not_called()
