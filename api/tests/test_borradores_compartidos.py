from app.services.borradores_compartidos import (
    combinar,
    describir_conflicto,
    es_compartido,
    quitar_campos,
)


def test_solo_los_tres_tipos_de_capa_se_comparten():
    assert es_compartido('layer')
    assert es_compartido('layer_metadata')
    assert es_compartido('layer_stats')
    assert not es_compartido('sld')
    assert not es_compartido('home_section')


def test_un_borrador_nuevo_nace_en_version_1_con_autor_por_campo():
    r = combinar(None, None, 0, {'label': 'Ríos'}, [], 'ana', 'Ana')
    assert r.data == {'label': 'Ríos'}
    assert r.version == 1
    assert r.autores['label'] == {'usuario': 'ana', 'nombre': 'Ana', 'version': 1}
    assert r.conflictos == []


def test_dos_personas_suman_campos_sin_pisarse():
    r1 = combinar(None, None, 0, {'label': 'Ríos'}, [], 'ana', 'Ana')
    r2 = combinar(r1.data, r1.autores, r1.version, {'cql_filter': "tipo='rio'"}, [], 'beto', 'Beto', version_base=1)
    assert r2.data == {'label': 'Ríos', 'cql_filter': "tipo='rio'"}
    assert r2.autores['label']['usuario'] == 'ana'
    assert r2.autores['cql_filter']['usuario'] == 'beto'
    assert r2.version == 2


def test_choca_si_otro_cambio_el_mismo_campo_despues_de_lo_que_yo_vi():
    r1 = combinar(None, None, 0, {'label': 'Ríos'}, [], 'ana', 'Ana')
    r2 = combinar(r1.data, r1.autores, r1.version, {'label': 'Ríos de Jalisco'}, [], 'ana', 'Ana', version_base=1)
    r3 = combinar(r2.data, r2.autores, r2.version, {'label': 'Ríos y arroyos'}, [], 'beto', 'Beto', version_base=1)
    assert r3.conflictos == [{'campo': 'label', 'usuario': 'ana', 'nombre': 'Ana'}]
    assert r3.data == r2.data
    assert r3.version == r2.version


def test_mis_propios_cambios_nunca_chocan_aunque_la_version_vaya_adelante():
    r1 = combinar(None, None, 0, {'label': 'A'}, [], 'ana', 'Ana')
    r2 = combinar(r1.data, r1.autores, r1.version, {'label': 'B'}, [], 'ana', 'Ana', version_base=1)
    r3 = combinar(r2.data, r2.autores, r2.version, {'label': 'C'}, [], 'ana', 'Ana', version_base=1)
    assert r3.conflictos == []
    assert r3.data == {'label': 'C'}


def test_sin_version_base_no_se_revisan_choques():
    r1 = combinar(None, None, 0, {'label': 'A'}, [], 'ana', 'Ana')
    r2 = combinar(r1.data, r1.autores, r1.version, {'label': 'B'}, [], 'beto', 'Beto')
    assert r2.conflictos == []
    assert r2.data == {'label': 'B'}


def test_quitar_un_campo_lo_saca_del_borrador_y_de_sus_autores():
    r1 = combinar(None, None, 0, {'label': 'A', 'styles': 'x'}, [], 'ana', 'Ana')
    r2 = combinar(r1.data, r1.autores, r1.version, {}, ['styles'], 'ana', 'Ana', version_base=1)
    assert r2.data == {'label': 'A'}
    assert 'styles' not in r2.autores


def test_quitar_tambien_revisa_choques():
    r1 = combinar(None, None, 0, {'styles': 'x'}, [], 'ana', 'Ana')
    r2 = combinar(r1.data, r1.autores, r1.version, {}, ['styles'], 'beto', 'Beto', version_base=0)
    assert r2.conflictos and r2.conflictos[0]['campo'] == 'styles'


def test_quitar_campos_tras_publicar_conserva_los_demas():
    data, autores = quitar_campos(
        {'label': 'A', 'styles': 'x'},
        {'label': {'usuario': 'ana'}, 'styles': {'usuario': 'beto'}},
        ['label'],
    )
    assert data == {'styles': 'x'}
    assert autores == {'styles': {'usuario': 'beto'}}


def test_el_mensaje_de_choque_dice_quien_y_que():
    texto = describir_conflicto([{'campo': 'label', 'usuario': 'ana', 'nombre': 'Ana'}])
    assert texto.startswith('Ana cambió label')
