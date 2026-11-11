from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.models.borrador import Borrador
from app.services import borrador_service, estilos_lote
from app.services.geoserver_client import GeoServerError

CABECERA = 'capa,nombre_capa_geoserver,campo,unidades,paleta,orientacion_favorable,cortes_rangos'
FILA_OK = 'Homicidio,seguridad_y_proteccion:homicidio,tasa,tasa,S_PRUEBA,Inferior,"[0, 0, 1, 3]"'
PALETAS = [{'name': 'S_PRUEBA', 'tipo': 'secuencial', 'colors': ['#111111', '#222222', '#333333']}]


def _dataengine(*workspaces: tuple[str, str]) -> MagicMock:
    db = MagicMock()
    db.query.return_value.all.return_value = [
        MagicMock(alias=alias, geoserver_workspace=ws) for alias, ws in workspaces
    ]
    return db


def _cliente(campos: list[dict] | None = None, existe: bool = True) -> MagicMock:
    cliente = MagicMock()
    cliente.list_fields.return_value = campos if campos is not None else [{'name': 'tasa', 'type': 'number'}]
    cliente.style_exists.return_value = existe
    return cliente


@pytest.fixture(autouse=True)
def _paletas():
    with patch.object(estilos_lote, 'load_palettes', return_value=PALETAS):
        yield


def test_revisar_resuelve_alias_y_reemplazo():
    filas = estilos_lote.revisar(
        f'{CABECERA}\n{FILA_OK}', _dataengine(('seguridad', 'seguridad_y_proteccion')), _cliente(),
    )
    assert len(filas) == 1
    fila = filas[0]
    assert fila.errores == []
    assert fila.fila == 2
    assert fila.alias == 'seguridad'
    assert fila.reemplaza is True
    assert fila.labels == ['0', '0 a 1', '1 a 3']


@pytest.mark.parametrize('dataengine, cliente, error', [
    (_dataengine(), _cliente(), 'no está conectado al catálogo'),
    (_dataengine(('s', 'seguridad_y_proteccion')), _cliente(campos=[]), 'no tiene el campo'),
    (_dataengine(('s', 'seguridad_y_proteccion')), _cliente(campos=[{'name': 'tasa', 'type': 'string'}]), 'no es numérico'),
])
def test_revisar_marca_errores_de_geoserver(dataengine, cliente, error):
    fila = estilos_lote.revisar(f'{CABECERA}\n{FILA_OK}', dataengine, cliente)[0]
    assert any(error in e for e in fila.errores), fila.errores


def test_revisar_capa_inexistente():
    cliente = _cliente()
    cliente.list_fields.side_effect = GeoServerError('404')
    fila = estilos_lote.revisar(f'{CABECERA}\n{FILA_OK}', _dataengine(('s', 'seguridad_y_proteccion')), cliente)[0]
    assert fila.errores == ['La capa no existe en GeoServer']


def test_revisar_capa_repetida():
    filas = estilos_lote.revisar(
        f'{CABECERA}\n{FILA_OK}\n{FILA_OK}', _dataengine(('s', 'seguridad_y_proteccion')), _cliente(),
    )
    assert filas[0].errores == []
    assert filas[1].errores == ['La capa ya viene en la fila 2']


def test_crear_borradores_rechaza_lote_con_errores():
    with pytest.raises(estilos_lote.LoteConErroresError) as exc:
        estilos_lote.crear_borradores(f'{CABECERA}\n{FILA_OK}', MagicMock(), _dataengine(), MagicMock(), _cliente())
    assert exc.value.filas[0].errores


def test_crear_borradores_guarda_uno_por_estilo(db_session, admin_user):
    borradores = estilos_lote.crear_borradores(
        f'{CABECERA}\n{FILA_OK}', db_session, _dataengine(('seguridad', 'seguridad_y_proteccion')),
        admin_user, _cliente(),
    )
    assert len(borradores) == 1
    guardado = db_session.query(Borrador).one()
    assert guardado.resource_type == 'sld'
    assert guardado.resource_id == 'seguridad:homicidio'
    assert guardado.data['cortes'] == [0, 0, 1, 3]
    assert guardado.data['default_style'] is True
    assert guardado.estado == 'pendiente_revision'
    estilos_lote.crear_borradores(
        f'{CABECERA}\n{FILA_OK}', db_session, _dataengine(('seguridad', 'seguridad_y_proteccion')),
        admin_user, _cliente(),
    )
    assert db_session.query(Borrador).count() == 1


def test_aplicar_borrador_de_lote_fija_estilo_por_defecto(db_session, admin_user):
    estilos_lote.crear_borradores(
        f'{CABECERA}\n{FILA_OK}', db_session, _dataengine(('seguridad', 'seguridad_y_proteccion')),
        admin_user, _cliente(),
    )
    borrador = db_session.query(Borrador).one()
    ws_db = MagicMock()
    ws_db.query.return_value.filter.return_value.first.return_value = MagicMock(
        alias='seguridad', geoserver_workspace='seguridad_y_proteccion',
    )
    with patch.object(borrador_service, 'GeoServerClient') as cliente, \
            patch.object(borrador_service, 'notify_tree_changed'):
        cliente.return_value.put_sld.return_value = 'hash'
        borrador_service.apply_borrador(None, ws_db, borrador, 'admin@example.com')
    xml = cliente.return_value.put_sld.call_args.args[2]
    assert 'PropertyIsEqualTo' in xml
    cliente.return_value.set_layer_default_style.assert_called_once_with(
        'seguridad_y_proteccion', 'homicidio', 'homicidio',
    )


def test_ruta_revisar(admin_session):
    with patch.object(estilos_lote, 'GeoServerClient', return_value=_cliente()):
        r = admin_session['client'].post(
            '/api/mariachi/geoserver/estilos-lote/revisar',
            json={'texto': 'capa,campo\nA,b'},
            headers={'X-CSRF-Token': admin_session['csrf']},
        )
    assert r.status_code == 422
    assert 'Faltan columnas' in r.json()['detail']['mensaje']


def test_ruta_pide_permiso_de_geoserver(editora_session):
    r = editora_session['client'].post(
        '/api/mariachi/geoserver/estilos-lote/revisar',
        json={'texto': f'{CABECERA}\n{FILA_OK}'},
        headers={'X-CSRF-Token': editora_session['csrf']},
    )
    assert r.status_code == 403


def test_vista_previa_manda_el_sld_generado():
    cliente = MagicMock()
    cliente.render_map.return_value = b'png'
    fila = {
        'layer_name': 'homicidio', 'nombre': 'Homicidio', 'attribute': 'tasa',
        'cortes': [0, 0, 1], 'labels': ['0', '0 a 1'], 'colores': ['#111111', '#222222'],
    }
    assert estilos_lote.vista_previa('ws', 'homicidio', fila, 300, cliente) == b'png'
    ws, capa, sld, ancho = cliente.render_map.call_args.args
    assert (ws, capa, ancho) == ('ws', 'homicidio', 300)
    assert '<sld:Name>homicidio</sld:Name>' in sld
    estilos_lote.vista_previa('ws', 'homicidio', None, 300, cliente)
    assert cliente.render_map.call_args.args[2] is None


def test_primera_clase_abierta_solo_lleva_tope():
    cliente = MagicMock()
    cliente.render_map.return_value = b'png'
    fila = {
        'layer_name': 'brecha', 'nombre': 'Brecha', 'attribute': 'valor',
        'cortes': [None, -30, 30, None], 'labels': ['< -30', '-30 a 30', '> 30'],
        'colores': ['#111111', '#222222', '#333333'],
    }
    estilos_lote.vista_previa('ws', 'brecha', fila, 300, cliente)
    reglas = cliente.render_map.call_args.args[2].split('<sld:Rule>')[1:]
    assert 'PropertyIsLessThan>' in reglas[0]
    assert 'GreaterThan' not in reglas[0]
    assert 'PropertyIsGreaterThanOrEqualTo' in reglas[2]
    assert 'LessThan' not in reglas[2]
