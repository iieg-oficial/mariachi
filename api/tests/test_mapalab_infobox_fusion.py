from app.services.mapalab_infobox_fusion import (
    fusionar_config,
    hrefs_nuevos,
    orden_base,
)


def test_la_fusion_conserva_lo_que_el_editor_no_toca():
    base = {
        'headerField': 'Titulo viejo',
        'list': [{'field': 'a', 'label': 'A'}],
        'text': [{'id': 't0', 'items': [{'field': 'desc'}]}],
        'labelGroups': [{'fields': ['municipio'], 'color': '#FF8300'}],
        'cardsColumns': 2,
        'blockOrder': ['labelGroups', 'list', 'text:t0'],
    }
    propuesta = {
        'headerField': 'nombre',
        'cards': [{'field': 'pob', 'label': 'Población'}],
        'text': [{'id': 't0', 'items': [{'field': 'desc'}]}],
        'blockOrder': ['cards', 'text:t0'],
    }
    assert fusionar_config(base, propuesta) == {
        'headerField': 'nombre',
        'cards': [{'field': 'pob', 'label': 'Población'}],
        'text': [{'id': 't0', 'items': [{'field': 'desc'}]}],
        'labelGroups': [{'fields': ['municipio'], 'color': '#FF8300'}],
        'cardsColumns': 2,
        'blockOrder': ['labelGroups', 'cards', 'text:t0'],
    }


def test_quitar_todo_el_texto_si_se_respeta():
    base = {'list': [{'field': 'a', 'label': 'A'}], 'text': [{'label': 'Nota'}]}
    fusion = fusionar_config(base, {'list': [{'field': 'a', 'label': 'A'}], 'blockOrder': ['list']})
    assert 'text' not in fusion
    assert fusion['blockOrder'] == ['list']


def test_sin_blockorder_el_orden_base_sigue_el_del_visor():
    base = {
        'cards': [{'field': 'c', 'label': 'C'}],
        'iconText': [{'icon': 'ubicacion', 'field': 'dir'}],
        'list': [{'field': 'a', 'label': 'A'}],
        'text': [{'label': 'Nota'}],
    }
    assert orden_base(base) == ['list', 'iconText', 'text:t0', 'cards']


def test_los_bloques_fijos_quedan_en_su_lugar_al_reordenar():
    base = {
        'list': [{'field': 'a', 'label': 'A'}],
        'iconText': [{'icon': 'ubicacion', 'field': 'dir'}],
        'cards': [{'field': 'c', 'label': 'C'}],
    }
    propuesta = {
        'cards': [{'field': 'c', 'label': 'C'}],
        'list': [{'field': 'a', 'label': 'A'}],
        'blockOrder': ['cards', 'list'],
    }
    assert fusionar_config(base, propuesta)['blockOrder'] == ['cards', 'iconText', 'list']


def test_sin_base_la_fusion_es_la_propuesta():
    propuesta = {'list': [{'field': 'a', 'label': 'A'}], 'blockOrder': ['list']}
    assert fusionar_config(None, propuesta) == propuesta


def test_solo_se_conservan_los_links_que_ya_existian():
    base = {
        'list': [{'field': 'a', 'label': 'A', 'href': 'https://iieg.gob.mx/{a}'}],
        'text': [{'id': 't0', 'items': [{'label': 'Más', 'href': '/mapa'}]}],
    }
    igual = {'list': [{'field': 'a', 'label': 'Otra', 'href': 'https://iieg.gob.mx/{a}'}]}
    assert hrefs_nuevos(base, igual) == set()
    nuevo = {'text': [{'id': 't0', 'items': [{'label': 'Premio', 'href': 'https://estafa.example'}]}]}
    assert hrefs_nuevos(base, nuevo) == {'https://estafa.example'}
    assert hrefs_nuevos(None, igual) == {'https://iieg.gob.mx/{a}'}
