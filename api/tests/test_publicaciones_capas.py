from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from app.models.publicacion_capa import PublicacionCapa
from app.services import publicaciones_capas as publicaciones


def test_campos_de_normaliza_camel_case_y_descarta_la_accion():
    campos = publicaciones.campos_de('layer', {'cqlFilter': "a=1", 'hiddenInMenu': True, 'action': 'delete'})
    assert set(campos) == {'cql_filter', 'hidden_in_menu'}


def test_cambios_solo_lista_lo_que_cambio():
    assert publicaciones.cambios({'a': 1, 'b': 2}, {'a': 1, 'b': 3, 'c': 4}) == ['b', 'c']


def test_registrar_ignora_una_publicacion_sin_cambios(db_session):
    assert publicaciones.registrar(db_session, 'layer', 'rios', {'label': 'A'}, {'label': 'A'}, 'Ana') is None


def test_registrar_guarda_solo_los_campos_que_cambiaron(db_session):
    pub = publicaciones.registrar(
        db_session, 'layer', 'rios', {'label': 'A', 'styles': 's'}, {'label': 'B', 'styles': 's'}, 'Ana',
    )
    assert pub.antes == {'label': 'A'}
    assert pub.despues == {'label': 'B'}
    assert pub.origen == 'editor'


def test_ultimas_devuelve_la_mas_reciente_de_cada_recurso(db_session):
    base = datetime(2026, 9, 29, 10, 0)
    for i, (tipo, recurso) in enumerate([('layer', 'rios'), ('layer', 'rios'), ('layer_metadata', 'agua:rios')]):
        db_session.add(PublicacionCapa(
            resource_type=tipo, resource_id=recurso, antes={'x': i}, despues={'x': i + 1},
            usuario='Ana', origen='editor', creado_en=base + timedelta(minutes=i),
        ))
    db_session.commit()
    halladas = publicaciones.ultimas(db_session, [('layer', 'rios'), ('layer_metadata', 'agua:rios'), ('layer_stats', 'agua:rios')])
    assert [(p.resource_type, p.antes) for p in halladas] == [('layer_metadata', {'x': 2}), ('layer', {'x': 1})]


def _pub(**kw):
    datos = {'id': 1, 'despues': {'label': 'B'}, 'deshecha_en': None}
    datos.update(kw)
    return PublicacionCapa(**datos)


def test_deshacer_rechaza_una_que_no_es_la_ultima():
    with pytest.raises(HTTPException) as err:
        publicaciones.validar_deshacer(_pub(id=1), _pub(id=2), {'label': 'B'})
    assert err.value.status_code == 409
    assert 'sólo se deshace la última' in err.value.detail


def test_deshacer_rechaza_si_el_campo_cambio_por_otra_via():
    with pytest.raises(HTTPException) as err:
        publicaciones.validar_deshacer(_pub(), _pub(), {'label': 'C'})
    assert 'por otra vía' in err.value.detail


def test_deshacer_rechaza_una_ya_deshecha():
    with pytest.raises(HTTPException) as err:
        publicaciones.validar_deshacer(_pub(deshecha_en=datetime(2026, 9, 29)), _pub(), {'label': 'B'})
    assert 'ya se deshizo' in err.value.detail


def test_deshacer_acepta_la_ultima_intacta():
    publicaciones.validar_deshacer(_pub(), _pub(), {'label': 'B'})
