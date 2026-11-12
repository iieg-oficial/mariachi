from app.schemas.layer import LayerCreate
from app.services.layer_lote import validar_lote


def _capa(id_: str, parent: str | None = 'ortofotos', tipo: str = 'category') -> LayerCreate:
    return LayerCreate(id=id_, parent_id=parent, label=id_, node_type=tipo)


def test_lote_valido_contra_padre_existente():
    capas = [_capa('ortofotos-acatic'), _capa('ortofotos-ameca')]
    assert validar_lote(capas, {'ortofotos'}, set()) == []


def test_padre_creado_en_el_mismo_lote():
    capas = [_capa('ortofotos', parent=None, tipo='tema'), _capa('ortofotos-acatic')]
    assert validar_lote(capas, set(), set()) == []


def test_padre_inexistente_marca_la_fila():
    errores = validar_lote([_capa('a'), _capa('b', parent='ortofotox')], {'ortofotos'}, set())
    assert [e['fila'] for e in errores] == [1]


def test_padre_definido_despues_no_cuenta():
    capas = [_capa('ortofotos-acatic'), _capa('ortofotos', parent=None, tipo='tema')]
    errores = validar_lote(capas, set(), set())
    assert [e['fila'] for e in errores] == [0]


def test_ids_repetidos_existentes_y_en_papelera():
    capas = [_capa('a'), _capa('a'), _capa('viva'), _capa('borrada')]
    errores = validar_lote(capas, {'ortofotos', 'viva'}, {'borrada'})
    assert [e['fila'] for e in errores] == [1, 2, 3]


def test_tema_sin_padre_y_resto_con_padre():
    errores = validar_lote(
        [_capa('t', parent='ortofotos', tipo='tema'), _capa('c', parent=None)],
        {'ortofotos'},
        set(),
    )
    assert [e['detail'] for e in errores] == ['Un tema no lleva padre', 'Falta el padre']
