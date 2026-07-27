import pytest
from pydantic import ValidationError

from app.schemas.mapalab_infobox import (
    InfoboxPropuestaConfig,
    validate_fields_exist,
)


def _valida(payload: dict) -> InfoboxPropuestaConfig:
    return InfoboxPropuestaConfig.model_validate(payload)


def test_config_minima_valida_y_se_reconstruye():
    cfg = _valida({
        'headerField': 'nombre',
        'list': [{'field': 'municipio', 'label': 'Municipio'}],
        'cards': [{'field': 'pob', 'label': 'Poblacion', 'decimals': 0}],
        'blockOrder': ['cards', 'list'],
    })
    assert cfg.to_config() == {
        'headerField': 'nombre',
        'list': [{'field': 'municipio', 'label': 'Municipio'}],
        'cards': [{'field': 'pob', 'label': 'Poblacion', 'decimals': 0}],
        'blockOrder': ['cards', 'list'],
    }


@pytest.mark.parametrize('href', [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.example',
])
def test_href_con_esquema_peligroso_se_rechaza(href):
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'list': [{'field': 'a', 'label': 'A', 'href': href}]})


@pytest.mark.parametrize('href', ['https://iieg.jalisco.gob.mx/x', '/mapa?layers=a', 'mailto:x@y.mx'])
def test_href_permitido_sobrevive(href):
    cfg = _valida({'headerField': 'n', 'list': [{'field': 'a', 'label': 'A', 'href': href}]})
    assert cfg.to_config()['list'][0]['href'] == href


@pytest.mark.parametrize('payload', [
    {'headerField': 'n', 'onClick': 'x'},
    {'headerField': 'n', 'iconText': [{'action': 'report'}]},
    {'headerField': 'n', 'headerTransform': 'loQueSea'},
    {'headerField': 'n', 'labelGroups': [{'color': 'red'}]},
    {'headerField': 'n', 'cardsColumns': 2},
    {'headerField': 'n', 'list': [{'field': 'a', 'label': 'A', 'extra': {'x': 1}}]},
])
def test_claves_fuera_de_la_allowlist_se_rechazan(payload):
    with pytest.raises(ValidationError):
        _valida(payload)


def test_config_que_no_muestra_nada_se_rechaza():
    with pytest.raises(ValidationError):
        _valida({})


def test_topes_de_tamano():
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'list': [{'field': 'a', 'label': 'X' * 200}]})
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'list': [{'field': f'f{i}', 'label': 'L'} for i in range(30)]})


def test_block_order_solo_acepta_bloques_conocidos():
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'blockOrder': ['evil']})
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'blockOrder': ['list', 'list']})


def test_block_order_no_puede_referenciar_texto_inexistente():
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'blockOrder': ['text:t9']})


def test_campos_se_validan_contra_las_columnas_reales():
    cfg = _valida({'headerField': 'nombre', 'list': [{'field': 'inventado', 'label': 'X'}]})
    with pytest.raises(ValueError, match='inventado'):
        validate_fields_exist(cfg, {'nombre', 'municipio'})
    validate_fields_exist(cfg, {'nombre', 'inventado'})


def test_sin_columnas_conocidas_no_bloquea():
    cfg = _valida({'headerField': 'nombre'})
    validate_fields_exist(cfg, set())
