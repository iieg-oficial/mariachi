from __future__ import annotations

import io
from unittest.mock import MagicMock, patch

import httpx
import openpyxl
import pytest

from app.models.borrador import Borrador
from app.services import estilos_lote
from app.services.estilos_lote_archivo import leer_archivo
from app.services.estilos_lote_tabla import (
    TablaInvalidaError,
    interpretar_fila,
    leer_colores,
    leer_cortes,
)

PALETAS = {'S_ROJO_3': {'name': 'S_ROJO_3', 'tipo': 'secuencial', 'colors': ['#111111', '#222222', '#333333']}}


def _fila(**cambios: str) -> dict[str, str]:
    base = {
        'capa': 'Homicidio',
        'nombre_capa_geoserver': 'seguridad:homicidio',
        'campo': 'tasa',
        'unidades': '',
        'paleta': 'S_ROJO_3',
        'orientacion_favorable': 'Superior',
        'cortes_rangos': '[0, 1, 2, 3]',
    }
    return {**base, **cambios}


@pytest.mark.parametrize('texto, esperado', [
    ('[y menos, -30, 0, y más]', [None, -30, 0, None]),
    ('menos de, 10 %, $20, más de', [None, 10, 20, None]),
    ('"0", 1 000, 2.5, sin límite', [0, 1000, 2.5, None]),
    ('−5, 0, 5', [-5, 0, 5]),
])
def test_cortes_aceptan_palabras_e_ignoran_simbolos(texto, esperado):
    assert leer_cortes(texto) == esperado


def test_corte_con_palabra_desconocida():
    fila = interpretar_fila(2, _fila(cortes_rangos='0, diez, 20'), PALETAS)
    assert fila.errores == ['No entiendo el corte «diez»']


def test_colores_propios_reemplazan_la_paleta_sin_invertir():
    fila = interpretar_fila(2, _fila(paleta='', colores='#aaaaaa bbbbbb;#CCCCCC'), PALETAS)
    assert fila.errores == []
    assert fila.colores == ['#AAAAAA', '#BBBBBB', '#CCCCCC']


@pytest.mark.parametrize('colores, error', [
    ('#aaaaaa #bbbbbb', 'Hay 2 colores y 3 clases'),
    ('#aaaaaa #zzzzzz #cccccc', 'El color «#zzzzzz» no es válido'),
])
def test_colores_propios_invalidos(colores, error):
    assert interpretar_fila(2, _fila(colores=colores), PALETAS).errores == [error]


def test_sin_paleta_ni_colores():
    assert interpretar_fila(2, _fila(paleta=''), PALETAS).errores == ['Faltan los colores']


def test_nombre_de_estilo_explicito():
    fila = interpretar_fila(2, _fila(nombre_estilo='homicidio_mujeres'), PALETAS)
    assert fila.style_name == 'homicidio_mujeres'
    assert fila.resource_id.endswith(':homicidio_mujeres')
    assert interpretar_fila(2, _fila(nombre_estilo='con acento á'), PALETAS).errores


def test_leer_colores_vacio():
    assert leer_colores('') == []


def _excel(filas: list[list]) -> bytes:
    libro = openpyxl.Workbook()
    hoja = libro.active
    for fila in filas:
        hoja.append(fila)
    salida = io.BytesIO()
    libro.save(salida)
    return salida.getvalue()


def test_leer_excel():
    contenido = _excel([
        ['capa', 'campo', 'cortes_rangos'],
        ['Tasa, total', 'tasa', '[0, 0, 1.5, null]'],
        [None, None, None],
        ['Otra', 'valor', 3.0],
    ])
    assert leer_archivo('tabla.XLSX', contenido) == (
        'capa,campo,cortes_rangos\n"Tasa, total",tasa,"[0, 0, 1.5, null]"\nOtra,valor,3\n'
    )


def test_leer_csv_en_latin1():
    assert leer_archivo('t.csv', 'capa\nPoblación'.encode('cp1252')) == 'capa\nPoblación'


@pytest.mark.parametrize('nombre, contenido, error', [
    ('t.xlsx', b'no es zip', 'No se pudo abrir el Excel'),
    ('t.pdf', b'x', 'Sube un Excel'),
])
def test_leer_archivo_invalido(nombre, contenido, error):
    with pytest.raises(TablaInvalidaError, match=error):
        leer_archivo(nombre, contenido)


def test_cache_evita_volver_a_preguntar(monkeypatch):
    monkeypatch.setattr(estilos_lote, '_cache', {})
    llamadas = MagicMock(return_value=['campos'])
    assert estilos_lote._consultar_con_cache(('a',), llamadas) == ['campos']
    assert estilos_lote._consultar_con_cache(('a',), llamadas) == ['campos']
    assert llamadas.call_count == 1


def _borrador(db, usuario, estado: str, origen: str | None, resource_id: str) -> Borrador:
    data = {'shape': 'choropleth'} | ({'origen': origen} if origen else {})
    borrador = Borrador(
        resource_type='sld', resource_id=resource_id, usuario_id=usuario.id, data=data, estado=estado,
    )
    db.add(borrador)
    return borrador


def test_sin_publicar_e_historial_solo_del_lote(db_session, admin_user):
    _borrador(db_session, admin_user, 'pendiente_revision', 'lote', 's:a')
    _borrador(db_session, admin_user, 'pendiente_revision', None, 's:b')
    _borrador(db_session, admin_user, 'aprobado', 'lote', 's:c')
    _borrador(db_session, admin_user, 'aprobado', None, 's:d')
    db_session.commit()
    assert [b.resource_id for b in estilos_lote.borradores_sin_publicar(db_session)] == ['s:a']
    assert [b.resource_id for b in estilos_lote.historial(db_session)] == ['s:c']


def test_ruta_leer_archivo(admin_session):
    r = admin_session['client'].post(
        '/api/mariachi/geoserver/estilos-lote/leer-archivo',
        files={'archivo': ('tabla.xlsx', _excel([['capa'], ['A']]), 'application/octet-stream')},
        headers={'X-CSRF-Token': admin_session['csrf']},
    )
    assert r.status_code == 200
    assert r.json() == {'texto': 'capa\nA\n'}


def test_ruta_sin_publicar(admin_session):
    r = admin_session['client'].get('/api/mariachi/geoserver/estilos-lote/sin-publicar')
    assert r.status_code == 200
    assert r.json() == []


def test_vista_previa_lenta_responde_504(admin_session):
    workspace = MagicMock(geoserver_workspace='ws')
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = workspace
    from app.core.database import get_dataengine_db
    from app.main import app
    app.dependency_overrides[get_dataengine_db] = lambda: db
    try:
        with patch.object(estilos_lote, 'vista_previa', side_effect=httpx.ReadTimeout('lento')):
            r = admin_session['client'].post(
                '/api/mariachi/geoserver/estilos-lote/vista-previa',
                json={'alias': 'ws', 'layer_name': 'capa'},
                headers={'X-CSRF-Token': admin_session['csrf']},
            )
    finally:
        app.dependency_overrides.pop(get_dataengine_db, None)
    assert r.status_code == 504
