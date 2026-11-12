from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.models.borrador import Borrador
from app.services import estilos_lote
from app.services.estilos_lote_tabla import TablaInvalidaError, leer_tabla

CABECERA = 'capa,nombre_capa_geoserver,campo,unidades,paleta,orientacion_favorable,cortes_rangos,nombre_estilo'
FILA = 'Homicidio,seguridad_y_proteccion:homicidio,tasa,tasa,S_PRUEBA,Inferior,"[0, 1, 2, 3]",{estilo}'
PALETAS = [{'name': 'S_PRUEBA', 'tipo': 'secuencial', 'colors': ['#111111', '#222222', '#333333']}]


def _dataengine() -> MagicMock:
    db = MagicMock()
    db.query.return_value.all.return_value = [
        MagicMock(alias='seguridad', geoserver_workspace='seguridad_y_proteccion'),
    ]
    return db


def _cliente() -> MagicMock:
    cliente = MagicMock()
    cliente.list_fields.return_value = [{'name': 'tasa', 'type': 'number'}]
    cliente.style_exists.return_value = True
    return cliente


def _tabla(*estilos: str) -> str:
    return '\n'.join([CABECERA, *(FILA.format(estilo=e) for e in estilos)])


@pytest.fixture(autouse=True)
def _paletas():
    with patch.object(estilos_lote, 'load_palettes', return_value=PALETAS):
        yield


def test_solo_es_predeterminado_el_estilo_con_nombre_de_la_capa():
    filas = estilos_lote.revisar(_tabla('homicidio_mujeres', '', ''), _dataengine(), _cliente())
    assert [f.style_name for f in filas] == ['homicidio_mujeres', 'homicidio', 'homicidio_tasa']
    assert [f.predeterminado for f in filas] == [False, True, False]


def test_editar_conserva_el_nombre_calculado(db_session, admin_user):
    estilos_lote.crear_borradores(_tabla('', ''), db_session, _dataengine(), admin_user, _cliente())
    ids = [b.id for b in db_session.query(Borrador).order_by(Borrador.id)]
    filas = leer_tabla(estilos_lote.tabla_de_borradores(ids, db_session, _dataengine()))
    assert [f['nombre_estilo'] for f in filas] == ['homicidio', 'homicidio_tasa']
    assert filas[0]['paleta'] == 'S_PRUEBA'
    revisadas = estilos_lote.revisar(estilos_lote.tabla_de_borradores(ids[1:], db_session, _dataengine()),
                                     _dataengine(), _cliente())
    assert revisadas[0].style_name == 'homicidio_tasa'
    assert revisadas[0].predeterminado is False


def test_editar_borrador_viejo_sin_tabla(db_session, admin_user):
    borrador = Borrador(
        resource_type='sld', resource_id='seguridad:homicidio_tasa', usuario_id=admin_user.id,
        estado='pendiente_revision',
        data={
            'origen': 'lote', 'layer_name': 'homicidio', 'style_title': 'Homicidio', 'attribute': 'tasa',
            'style_abstract': 'Unidades: tasa', 'cortes': [None, 0.0, 2.5, None],
            'colors': ['#111111', '#222222', '#333333'],
        },
    )
    db_session.add(borrador)
    db_session.commit()
    fila = leer_tabla(estilos_lote.tabla_de_borradores([borrador.id], db_session, _dataengine()))[0]
    assert fila['nombre_capa_geoserver'] == 'seguridad_y_proteccion:homicidio'
    assert fila['cortes_rangos'] == '[null, 0, 2.5, null]'
    assert fila['colores'] == '#111111 #222222 #333333'
    assert fila['unidades'] == 'tasa'
    assert fila['nombre_estilo'] == 'homicidio_tasa'


def test_editar_sin_borradores_activos(db_session):
    with pytest.raises(TablaInvalidaError):
        estilos_lote.tabla_de_borradores([999], db_session, _dataengine())


def test_guardar_edicion_quita_el_borrador_reemplazado(db_session, admin_user):
    estilos_lote.crear_borradores(_tabla(''), db_session, _dataengine(), admin_user, _cliente())
    viejo = db_session.query(Borrador).one()
    nuevos = estilos_lote.crear_borradores(
        _tabla('homicidio_nuevo'), db_session, _dataengine(), admin_user, _cliente(), [viejo.id],
    )
    assert [b.resource_id for b in db_session.query(Borrador)] == ['seguridad:homicidio_nuevo']
    assert nuevos[0].data['tabla']['nombre_estilo'] == 'homicidio_nuevo'


def test_guardar_edicion_mismo_estilo_actualiza(db_session, admin_user):
    estilos_lote.crear_borradores(_tabla(''), db_session, _dataengine(), admin_user, _cliente())
    viejo = db_session.query(Borrador).one()
    estilos_lote.crear_borradores(_tabla('homicidio'), db_session, _dataengine(), admin_user, _cliente(), [viejo.id])
    assert [b.id for b in db_session.query(Borrador)] == [viejo.id]


def test_ruta_editar_sin_borradores(admin_session):
    from app.core.database import get_dataengine_db
    from app.main import app
    app.dependency_overrides[get_dataengine_db] = _dataengine
    try:
        r = admin_session['client'].post(
            '/api/mariachi/geoserver/estilos-lote/editar',
            json={'ids': [12345]},
            headers={'X-CSRF-Token': admin_session['csrf']},
        )
    finally:
        app.dependency_overrides.pop(get_dataengine_db, None)
    assert r.status_code == 422
    assert r.json()['detail']['mensaje'] == 'No hay borradores sin publicar para editar'
