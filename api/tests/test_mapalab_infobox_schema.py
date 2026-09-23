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


def test_fila_compuesta_sobrevive_la_ida_y_la_vuelta():
    cfg = _valida({
        'list': [{
            'compose': ['calle', {'field': 'numero_ext', 'prefix': '#'}, 'colonia'],
            'sep': ', ',
            'label': 'Direccion',
        }],
    })
    assert cfg.to_config()['list'][0] == {
        'compose': [
            {'field': 'calle'},
            {'field': 'numero_ext', 'prefix': '#'},
            {'field': 'colonia'},
        ],
        'sep': ', ',
        'label': 'Direccion',
    }


def test_una_fila_lleva_campo_o_compose_pero_no_los_dos():
    with pytest.raises(ValidationError):
        _valida({'list': [{'field': 'a', 'compose': ['b'], 'label': 'A'}]})
    with pytest.raises(ValidationError):
        _valida({'list': [{'label': 'A'}]})


def test_sep_sin_compose_se_rechaza():
    with pytest.raises(ValidationError):
        _valida({'list': [{'field': 'a', 'sep': ', ', 'label': 'A'}]})


def test_compose_vacio_o_desbordado_se_rechaza():
    with pytest.raises(ValidationError):
        _valida({'list': [{'compose': [], 'label': 'A'}]})
    with pytest.raises(ValidationError):
        _valida({'list': [{'compose': [f'f{i}' for i in range(20)], 'label': 'A'}]})


def test_la_suma_solo_va_en_cifras_combinadas():
    cfg = _valida({'cards': [{'compose': ['hombres', 'mujeres'], 'op': 'sum', 'label': 'Total'}]})
    assert cfg.to_config()['cards'][0]['op'] == 'sum'
    with pytest.raises(ValidationError):
        _valida({'cards': [{'field': 'pob', 'op': 'sum', 'label': 'Total'}]})
    with pytest.raises(ValidationError):
        _valida({'cards': [{'compose': ['a', 'b'], 'op': 'sum', 'sep': ' + ', 'label': 'Total'}]})


def test_el_titulo_acepta_campos_combinados():
    cfg = _valida({'headerField': {'compose': ['nombre', 'apellido'], 'sep': ' '}})
    assert cfg.to_config()['headerField'] == {
        'compose': [{'field': 'nombre'}, {'field': 'apellido'}],
        'sep': ' ',
    }


def test_las_partes_de_un_compose_se_validan_contra_las_columnas_reales():
    cfg = _valida({
        'headerField': {'compose': ['nombre', 'alias']},
        'list': [{'compose': ['calle', 'inventado'], 'label': 'Direccion'}],
        'cards': [{'compose': ['hombres', 'mujeres'], 'op': 'sum', 'label': 'Total'}],
    })
    assert cfg.referenced_fields() == {
        'nombre', 'alias', 'calle', 'inventado', 'hombres', 'mujeres',
    }
    with pytest.raises(ValueError, match='inventado'):
        validate_fields_exist(cfg, {'nombre', 'alias', 'calle', 'hombres', 'mujeres'})


def test_afijos_y_separador_tienen_tope():
    with pytest.raises(ValidationError):
        _valida({'list': [{'compose': [{'field': 'a', 'prefix': 'x' * 40}], 'label': 'A'}]})
    with pytest.raises(ValidationError):
        _valida({'list': [{'compose': ['a'], 'sep': 'x' * 40, 'label': 'A'}]})

def test_formato_anio_se_conserva_en_lista_y_texto():
    cfg = _valida({
        'list': [{'field': 'fecha', 'label': 'Año', 'formato': 'anio'}],
        'text': [{'id': 't1', 'items': [{'field': 'fecha', 'formato': 'anio'}]}],
    })
    config = cfg.to_config()
    assert config['list'] == [{'field': 'fecha', 'label': 'Año', 'formato': 'anio'}]
    assert config['text'][0]['items'] == [{'field': 'fecha', 'formato': 'anio'}]


@pytest.mark.parametrize('formato', ['mes', 'ANIO', ''])
def test_formato_desconocido_se_rechaza(formato):
    with pytest.raises(ValidationError):
        _valida({'headerField': 'n', 'list': [{'field': 'f', 'label': 'F', 'formato': formato}]})


def test_titulo_fijo_no_se_valida_como_campo():
    cfg = _valida({
        'headerField': 'Áreas Naturales Protegidas',
        'list': [{'field': 'nombre', 'label': 'Nombre'}],
    })
    validate_fields_exist(cfg, {'nombre', 'tipo'})


def test_campo_inexistente_en_filas_sigue_rechazandose_con_titulo_fijo():
    cfg = _valida({
        'headerField': 'Titulo fijo',
        'list': [{'field': 'fantasma', 'label': 'X'}],
    })
    with pytest.raises(ValueError, match='fantasma'):
        validate_fields_exist(cfg, {'nombre'})


def test_raw_y_split_se_conservan():
    cfg = _valida({
        'list': [{'field': 'clave', 'label': 'Clave', 'raw': True, 'split': True}],
        'cards': [{'field': 'cve', 'label': 'CVE', 'raw': True}],
    })
    assert cfg.to_config() == {
        'list': [{'field': 'clave', 'label': 'Clave', 'raw': True, 'split': True}],
        'cards': [{'field': 'cve', 'label': 'CVE', 'raw': True}],
    }


def test_parrafo_de_texto_fijo_y_largo_es_valido():
    cfg = _valida({'text': [{'id': 't0', 'items': [{'label': 'x' * 160}]}]})
    assert cfg.to_config()['text'][0]['items'][0] == {'label': 'x' * 160}


def test_parrafo_vacio_se_rechaza():
    with pytest.raises(ValidationError):
        _valida({'text': [{'id': 't0', 'items': [{}]}]})


@pytest.mark.parametrize('texto', [
    'Visita https://premios.example',
    'www.ofertas.com',
    'Escribe a estafa@correo.com',
    'Llama al 33 1234 5678',
    'Más info en mipagina.mx',
])
def test_texto_libre_no_admite_contacto(texto):
    with pytest.raises(ValidationError):
        _valida({'headerField': texto})
    with pytest.raises(ValidationError):
        _valida({'list': [{'field': 'a', 'label': texto}]})
    with pytest.raises(ValidationError):
        _valida({'text': [{'id': 't0', 'items': [{'label': texto}]}]})


@pytest.mark.parametrize('texto', [
    'Censo 2020-2025',
    'Área (ha)',
    'Población total 2020',
    'Áreas Naturales Protegidas',
    'Clave INEGI 14039',
])
def test_texto_libre_comun_se_acepta(texto):
    _valida({'headerField': texto, 'list': [{'field': 'a', 'label': texto}]})


def test_afijos_de_campos_combinados_tambien_se_revisan():
    with pytest.raises(ValidationError):
        _valida({'list': [{'compose': [{'field': 'a', 'prefix': 'www.x.com '}], 'label': 'A'}]})
