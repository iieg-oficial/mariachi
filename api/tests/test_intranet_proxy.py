from types import SimpleNamespace

import httpx
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, require_permission
from app.api.routes import intranet
from app.core.security import crear_csrf_token
from app.services import intranet_client

VISTA = {"mariachi.intranet.view"}
GESTION = {"mariachi.intranet.view", "mariachi.intranet.manage"}


def _cliente(monkeypatch, permisos, responder):
    usuario = SimpleNamespace(id=7, username="editora", minerva_sub="sub-7", permissions=permisos)
    peticiones: list[httpx.Request] = []

    def transporte(request: httpx.Request) -> httpx.Response:
        peticiones.append(request)
        return responder(request)

    original = httpx.Client
    monkeypatch.setattr(
        intranet_client.httpx,
        "Client",
        lambda **kwargs: original(transport=httpx.MockTransport(transporte)),
    )
    monkeypatch.setattr(
        intranet_client,
        "get_settings",
        lambda: SimpleNamespace(
            intranet_api_url="http://intranet.prueba/",
            intranet_api_key="clave-de-servicio",
            intranet_timeout=5,
        ),
    )
    app = FastAPI()
    app.include_router(
        intranet.router, dependencies=[Depends(require_permission("mariachi.intranet.view"))]
    )

    async def usuario_actual():
        return usuario

    app.dependency_overrides[get_current_user] = usuario_actual
    csrf = {"X-CSRF-Token": crear_csrf_token(usuario.username)}
    return TestClient(app), csrf, peticiones


def _ok(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json=[{"id": 1}])


def test_listar_reenvia_con_la_clave_y_el_sub_del_usuario(monkeypatch):
    cliente, _, peticiones = _cliente(monkeypatch, VISTA, _ok)
    respuesta = cliente.get("/intranet/carrusel")
    assert respuesta.json() == [{"id": 1}]
    enviada = peticiones[0]
    assert str(enviada.url) == "http://intranet.prueba/api/carousel/todos"
    assert enviada.headers["x-api-key"] == "clave-de-servicio"
    assert enviada.headers["x-actor-sub"] == "sub-7"


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("POST", "/intranet/enlaces"),
        ("PUT", "/intranet/enlaces/1"),
        ("DELETE", "/intranet/enlaces/1"),
        ("PUT", "/intranet/carrusel/1/revisar"),
    ],
)
def test_solo_vista_no_administra(monkeypatch, metodo, ruta):
    cliente, csrf, peticiones = _cliente(monkeypatch, VISTA, _ok)
    respuesta = cliente.request(metodo, ruta, json={}, headers=csrf)
    assert respuesta.status_code == 403
    assert "mariachi.intranet.manage" in respuesta.json()["detail"]
    assert peticiones == []


def test_mutacion_sin_csrf_no_sale_de_mariachi(monkeypatch):
    cliente, _, peticiones = _cliente(monkeypatch, GESTION, _ok)
    assert cliente.post("/intranet/enlaces", json={}).status_code == 403
    assert peticiones == []


def test_alta_conserva_cuerpo_y_tipo_de_contenido(monkeypatch):
    cliente, csrf, peticiones = _cliente(
        monkeypatch, GESTION, lambda r: httpx.Response(201, json={"id": 9})
    )
    respuesta = cliente.post(
        "/intranet/galeria",
        headers=csrf,
        data={"title": "Fachada"},
        files={"file": ("f.png", b"\x89PNG", "image/png")},
    )
    assert respuesta.status_code == 201
    enviada = peticiones[0]
    assert str(enviada.url) == "http://intranet.prueba/api/galeria/"
    assert enviada.headers["content-type"].startswith("multipart/form-data; boundary=")
    assert b"\x89PNG" in enviada.content


def test_los_errores_de_validacion_de_intranet_llegan_tal_cual(monkeypatch):
    cliente, csrf, _ = _cliente(
        monkeypatch, GESTION, lambda r: httpx.Response(422, json={"detail": "URL inválida"})
    )
    respuesta = cliente.post("/intranet/sitios", headers=csrf, json={})
    assert respuesta.status_code == 422
    assert respuesta.json()["detail"] == "URL inválida"


@pytest.mark.parametrize("codigo", [401, 403])
def test_clave_rechazada_no_se_confunde_con_la_sesion_de_mariachi(monkeypatch, codigo):
    cliente, _, _ = _cliente(monkeypatch, VISTA, lambda r: httpx.Response(codigo, json={}))
    respuesta = cliente.get("/intranet/galeria")
    assert respuesta.status_code == 502
    assert "clave" in respuesta.json()["detail"]


def test_intranet_caida_es_502_sin_detalle_interno(monkeypatch):
    def caida(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused 10.0.0.9:80")

    cliente, _, _ = _cliente(monkeypatch, VISTA, caida)
    respuesta = cliente.get("/intranet/galeria")
    assert respuesta.status_code == 502
    assert "10.0.0.9" not in respuesta.text


def test_recurso_desconocido_y_edicion_no_soportada(monkeypatch):
    cliente, csrf, peticiones = _cliente(monkeypatch, GESTION, _ok)
    assert cliente.get("/intranet/usuarios").status_code == 404
    assert cliente.put("/intranet/galeria/1", headers=csrf, json={}).status_code == 405
    assert peticiones == []


@pytest.mark.parametrize(
    "ruta",
    [
        "/intranet/archivos/otra/" + "a" * 32 + ".png",
        "/intranet/archivos/gallery/..%2F..%2Fetc%2Fpasswd",
        "/intranet/archivos/gallery/no-es-un-nombre-generado.png",
    ],
)
def test_archivos_solo_sirve_nombres_generados_por_intranet(monkeypatch, ruta):
    cliente, _, peticiones = _cliente(monkeypatch, VISTA, _ok)
    assert cliente.get(ruta).status_code == 404
    assert peticiones == []


def test_archivo_valido_se_sirve_con_su_tipo(monkeypatch):
    cliente, _, peticiones = _cliente(
        monkeypatch,
        VISTA,
        lambda r: httpx.Response(200, content=b"\x89PNG", headers={"content-type": "image/png"}),
    )
    nombre = "a" * 32 + ".png"
    respuesta = cliente.get(f"/intranet/archivos/gallery/{nombre}")
    assert respuesta.headers["content-type"] == "image/png"
    assert str(peticiones[0].url) == f"http://intranet.prueba/static/uploads/gallery/{nombre}"
