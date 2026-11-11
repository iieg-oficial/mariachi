from __future__ import annotations

import json
from urllib.parse import parse_qs

import httpx
import pytest

from app.services import geoserver_client
from app.services.geoserver_client import GeoServerClient, GeoServerError

REAL_CLIENT = httpx.Client


def _cliente(monkeypatch, handler) -> tuple[GeoServerClient, list[httpx.Request]]:
    pedidos: list[httpx.Request] = []

    def registrar(request: httpx.Request) -> httpx.Response:
        pedidos.append(request)
        return handler(request)

    transport = httpx.MockTransport(registrar)
    monkeypatch.setattr(geoserver_client.httpx, 'Client', lambda **kw: REAL_CLIENT(transport=transport, **kw))
    return GeoServerClient(base_url='http://gs/sextante', user='admin', password='x'), pedidos


def test_set_layer_default_style_pone_estilo_del_workspace(monkeypatch):
    cliente, pedidos = _cliente(monkeypatch, lambda r: httpx.Response(200))
    cliente.set_layer_default_style('seguridad', 'homicidio', 'homicidio')
    pedido = pedidos[0]
    assert pedido.method == 'PUT'
    assert str(pedido.url) == 'http://gs/sextante/rest/workspaces/seguridad/layers/homicidio.json'
    assert json.loads(pedido.content) == {
        'layer': {'defaultStyle': {'name': 'homicidio', 'workspace': 'seguridad'}},
    }


def test_set_layer_default_style_falla_con_error_de_geoserver(monkeypatch):
    cliente, _ = _cliente(monkeypatch, lambda r: httpx.Response(404))
    with pytest.raises(GeoServerError, match='estilo por defecto'):
        cliente.set_layer_default_style('seguridad', 'homicidio', 'homicidio')


def test_render_map_manda_el_sld_por_post(monkeypatch):
    cliente, pedidos = _cliente(
        monkeypatch, lambda r: httpx.Response(200, content=b'png', headers={'content-type': 'image/png'}),
    )
    assert cliente.render_map('seguridad', 'homicidio', '<sld/>', 300) == b'png'
    pedido = pedidos[0]
    assert pedido.method == 'POST'
    assert str(pedido.url) == 'http://gs/sextante/seguridad/wms/reflect'
    campos = parse_qs(pedido.content.decode())
    assert campos['LAYERS'] == ['seguridad:homicidio']
    assert campos['SLD_BODY'] == ['<sld/>']
    assert campos['WIDTH'] == ['300']


def test_render_map_sin_sld_usa_el_estilo_publicado(monkeypatch):
    cliente, pedidos = _cliente(
        monkeypatch, lambda r: httpx.Response(200, content=b'png', headers={'content-type': 'image/png'}),
    )
    cliente.render_map('seguridad', 'homicidio')
    assert 'SLD_BODY' not in parse_qs(pedidos[0].content.decode())


def test_render_map_rechaza_respuesta_que_no_es_imagen(monkeypatch):
    cliente, _ = _cliente(
        monkeypatch, lambda r: httpx.Response(200, text='<ServiceException/>', headers={'content-type': 'text/xml'}),
    )
    with pytest.raises(GeoServerError, match='No se pudo pintar'):
        cliente.render_map('seguridad', 'homicidio', '<sld/>')
