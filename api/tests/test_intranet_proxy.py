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
        ("PUT", "/intranet/personas/1/presencia"),
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
        "/intranet/archivos/gallery/" + "a" * 32,
        "/intranet/archivos/gallery/" + "a" * 32 + ".html",
        "/intranet/archivos/gallery/" + "a" * 32 + ".svg",
        "/intranet/archivos/gallery/" + "a" * 32 + ".PNG",
        "/intranet/archivos/documents/" + "a" * 32 + ".js",
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


@pytest.mark.parametrize(
    "extension",
    [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "csv",
    ],
)
def test_archivos_acepta_las_extensiones_de_intranet(monkeypatch, extension):
    cliente, _, peticiones = _cliente(monkeypatch, VISTA, _ok)
    assert cliente.get(f"/intranet/archivos/documents/{'b' * 32}.{extension}").status_code == 200
    assert len(peticiones) == 1


def test_personas_lista_los_usuarios_de_intranet(monkeypatch):
    persona = {
        "id": 3,
        "nombre_completo": "Ana Pérez",
        "email": "ana@iieg.gob.mx",
        "oculto_en_presencia": False,
        "created_at": "2026-09-01T10:00:00",
    }
    cliente, _, peticiones = _cliente(
        monkeypatch, VISTA, lambda r: httpx.Response(200, json=[persona])
    )
    respuesta = cliente.get("/intranet/personas")
    assert respuesta.json() == [persona]
    assert str(peticiones[0].url) == "http://intranet.prueba/api/usuarios/"
    assert peticiones[0].headers["x-api-key"] == "clave-de-servicio"


def test_presencia_reenvia_el_cambio(monkeypatch):
    cliente, csrf, peticiones = _cliente(
        monkeypatch,
        GESTION,
        lambda r: httpx.Response(200, json={"id": 3, "oculto_en_presencia": True}),
    )
    respuesta = cliente.put("/intranet/personas/3/presencia", headers=csrf, json={"oculto": True})
    assert respuesta.status_code == 200
    enviada = peticiones[0]
    assert enviada.method == "PUT"
    assert str(enviada.url) == "http://intranet.prueba/api/usuarios/3/presencia"
    assert enviada.content == b'{"oculto":true}'


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("POST", "/intranet/personas"),
        ("PUT", "/intranet/personas/3"),
        ("DELETE", "/intranet/personas/3"),
        ("PUT", "/intranet/personas/abc/presencia"),
    ],
)
def test_personas_solo_expone_lista_y_presencia(monkeypatch, metodo, ruta):
    cliente, csrf, peticiones = _cliente(monkeypatch, GESTION, _ok)
    respuesta = cliente.request(metodo, ruta, headers=csrf, json={})
    assert respuesta.status_code in (404, 405, 422)
    assert peticiones == []


def test_reenvia_el_nombre_y_el_avatar_de_quien_sube(monkeypatch):
    cliente, csrf, peticiones = _cliente(monkeypatch, GESTION, _ok)
    cliente.app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=7,
        username="editora",
        minerva_sub="sub-7",
        name="Ana López",
        avatar_url="https://acervo.test/ana.jpg",
        permissions=GESTION,
    )
    cliente.post(
        "/intranet/galeria",
        headers=csrf,
        files={"file": ("a.png", b"x", "image/png")},
        data={"title": "t"},
    )
    assert peticiones[-1].headers["X-Actor-Nombre"] == "Ana%20L%C3%B3pez"
    assert peticiones[-1].headers["X-Actor-Avatar"] == "https://acervo.test/ana.jpg"


def test_las_imagenes_de_la_galeria_viven_en_la_carpeta_de_su_autor(monkeypatch):
    cliente, _, peticiones = _cliente(
        monkeypatch, VISTA, lambda request: httpx.Response(200, content=b"png")
    )
    ruta = f"gallery/{'c' * 16}/{'a' * 32}.png"
    assert cliente.get(f"/intranet/archivos/{ruta}").status_code == 200
    assert peticiones[-1].url.path == f"/static/uploads/{ruta}"
    assert cliente.get(f"/intranet/archivos/gallery/{'c' * 15}/{'a' * 32}.png").status_code == 404


def test_carpetas_y_edicion_de_documentos_pasan_a_la_intranet(monkeypatch):
    cliente, csrf, peticiones = _cliente(monkeypatch, GESTION, _ok)
    assert cliente.get("/intranet/carpetas").status_code == 200
    assert str(peticiones[-1].url) == "http://intranet.prueba/api/carpetas/"
    editado = cliente.put("/intranet/documentos/3", headers=csrf, data={"title": "t"})
    assert editado.status_code == 200
    assert peticiones[-1].method == "PUT"
    assert str(peticiones[-1].url) == "http://intranet.prueba/api/documentos/3"


def test_las_solicitudes_de_cuenta_se_leen_de_la_intranet(monkeypatch):
    cliente, _, peticiones = _cliente(monkeypatch, VISTA, _ok)
    assert cliente.get("/intranet/solicitudes").status_code == 200
    assert str(peticiones[0].url) == "http://intranet.prueba/api/solicitudes-cuenta/"
