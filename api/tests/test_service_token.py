import httpx
import pytest

from app.core import service_token
from app.core.service_token import ServiceTokenAuth, ServiceTokenError, ServiceTokenProvider


def _minerva(respuestas: list[httpx.Response], pedidos: list[httpx.Request]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        pedidos.append(request)
        return respuestas.pop(0)

    return httpx.MockTransport(handler)


def _token(valor: str, expira: int = 900) -> httpx.Response:
    return httpx.Response(200, json={"access_token": valor, "token_type": "bearer", "expires_in": expira})


def _provider(transport: httpx.MockTransport) -> ServiceTokenProvider:
    return ServiceTokenProvider("http://minerva:3000/", "cid", "secreto", "sextante", transport=transport)


def test_pide_el_token_con_client_credentials_y_audience():
    pedidos: list[httpx.Request] = []
    provider = _provider(_minerva([_token("t1")], pedidos))
    assert provider.token() == "t1"
    cuerpo = dict(httpx.QueryParams(pedidos[0].content.decode()))
    assert str(pedidos[0].url) == "http://minerva:3000/auth/token"
    assert cuerpo == {"grant_type": "client_credentials", "client_id": "cid", "client_secret": "secreto", "audience": "sextante"}


def test_reusa_el_token_mientras_no_vence():
    pedidos: list[httpx.Request] = []
    provider = _provider(_minerva([_token("t1")], pedidos))
    assert provider.token() == "t1"
    assert provider.token() == "t1"
    assert len(pedidos) == 1


def test_renueva_antes_de_que_venza(monkeypatch):
    pedidos: list[httpx.Request] = []
    provider = _provider(_minerva([_token("t1", 900), _token("t2", 900)], pedidos))
    reloj = [1000.0]
    monkeypatch.setattr(service_token.time, "monotonic", lambda: reloj[0])
    assert provider.token() == "t1"
    reloj[0] += 900 - service_token.RENEW_MARGIN_SECONDS
    assert provider.token() == "t2"


def test_un_rechazo_de_minerva_da_error_claro():
    provider = _provider(
        _minerva([httpx.Response(400, json={"error": "invalid_target", "error_description": "sin roles"})], [])
    )
    with pytest.raises(ServiceTokenError, match="sin roles"):
        provider.token()


def test_la_auth_pone_el_bearer_y_reintenta_una_vez_con_401():
    provider = _provider(_minerva([_token("viejo"), _token("nuevo")], []))
    vistos: list[str] = []

    def geoserver(request: httpx.Request) -> httpx.Response:
        vistos.append(request.headers["Authorization"])
        return httpx.Response(401 if len(vistos) == 1 else 200, json={})

    with httpx.Client(auth=ServiceTokenAuth(provider), transport=httpx.MockTransport(geoserver)) as client:
        r = client.get("http://sextante:8080/sextante/rest/workspaces.json")
    assert r.status_code == 200
    assert vistos == ["Bearer viejo", "Bearer nuevo"]
