import asyncio
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from app.services import huachicol_monitor


def _con_respuesta(monkeypatch, manejador) -> None:
    monkeypatch.setattr(
        huachicol_monitor,
        "get_settings",
        lambda: SimpleNamespace(huachicol_monitor_url="http://huachicol:8000"),
    )
    original = httpx.AsyncClient

    def cliente(**kwargs) -> httpx.AsyncClient:
        return original(transport=httpx.MockTransport(manejador), **kwargs)

    monkeypatch.setattr(huachicol_monitor.httpx, "AsyncClient", cliente)


def test_respuesta_correcta_devuelve_el_json(monkeypatch):
    _con_respuesta(monkeypatch, lambda request: httpx.Response(200, json={"ok": True}))
    assert asyncio.run(huachicol_monitor.consultar("/api/status")) == {"ok": True}


@pytest.mark.parametrize("codigo", [301, 302, 400, 401, 403, 404, 500, 503])
def test_cualquier_error_de_huachicol_sale_como_502(monkeypatch, codigo):
    _con_respuesta(
        monkeypatch,
        lambda request: httpx.Response(codigo, headers={"Location": "http://otro/"}),
    )
    with pytest.raises(HTTPException) as error:
        asyncio.run(huachicol_monitor.consultar("/api/status"))
    assert error.value.status_code == 502
    assert isinstance(error.value.__cause__, httpx.HTTPStatusError)


def test_sin_conexion_sale_como_502(monkeypatch):
    def caido(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin ruta", request=request)

    _con_respuesta(monkeypatch, caido)
    with pytest.raises(HTTPException) as error:
        asyncio.run(huachicol_monitor.consultar("/api/status"))
    assert error.value.status_code == 502
    assert isinstance(error.value.__cause__, httpx.ConnectError)


def test_sin_url_configurada_es_503(monkeypatch):
    monkeypatch.setattr(
        huachicol_monitor, "get_settings", lambda: SimpleNamespace(huachicol_monitor_url="")
    )
    with pytest.raises(HTTPException) as error:
        asyncio.run(huachicol_monitor.consultar("/api/status"))
    assert error.value.status_code == 503
