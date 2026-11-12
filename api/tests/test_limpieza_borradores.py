from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.routes.borradores import _guardar_compartido
from app.schemas.borrador import BorradorUpsert
from app.services.limpieza_borradores import campos_sin_cambio


def test_quita_los_campos_de_metadatos_iguales_a_lo_publicado():
    row = SimpleNamespace(descripcion='Tasa municipal', frecuencia='Anual', fuentes=[])
    data = {
        'descripcion': 'Tasa municipal',
        'frecuencia': 'Mensual',
        'fuentes': [{'corto': '', 'largo': '', 'enlace': '', 'enlace_label': ''}],
    }
    assert sorted(campos_sin_cambio('layer_metadata', data, row)) == ['descripcion', 'fuentes']


def test_un_vacio_y_un_none_cuentan_como_iguales():
    row = SimpleNamespace(texto_leyenda=None)
    assert campos_sin_cambio('layer_metadata', {'texto_leyenda': ''}, row) == ['texto_leyenda']


def test_sin_fila_publicada_no_quita_nada():
    assert campos_sin_cambio('layer_metadata', {'descripcion': 'x'}, None) == []


def test_ignora_la_accion_y_las_llaves():
    row = SimpleNamespace(layer_key='ws:capa')
    assert campos_sin_cambio('layer_metadata', {'action': 'delete', 'layer_key': 'ws:capa'}, row) == []


def test_un_borrador_en_revision_no_se_edita():
    borrador = SimpleNamespace(estado='pendiente_revision', data={'label': 'Ríos'}, autores={}, version=2)
    usuario = SimpleNamespace(username='beto', name='Beto', id=2)
    with pytest.raises(HTTPException) as exc:
        _guardar_compartido(None, borrador, 'layer', 'rios', BorradorUpsert(data={'label': 'Otro'}), usuario)
    assert exc.value.status_code == 409
    assert borrador.data == {'label': 'Ríos'}
