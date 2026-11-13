from types import SimpleNamespace

import pytest

from app.api import cambios_middleware
from app.api.routes.cambios import puede_ver
from app.core.security import crear_access_token
from app.core.settings import get_settings
from app.models.project import Project
from app.services import presence
from tests.conftest import ADMIN_PREFIX


@pytest.fixture
def publicados(monkeypatch):
    eventos: list[dict] = []
    monkeypatch.setattr(cambios_middleware, "publicar", eventos.append)
    monkeypatch.setattr(presence, "publicar", eventos.append)
    return eventos


def test_escritura_exitosa_publica_cambio_con_permisos(admin_session, db_session, publicados):
    db_session.add(Project(slug="mapalab", name="MapaLab", is_active=True))
    db_session.commit()
    username = admin_session["user"].username
    admin_session["client"].cookies.set(
        get_settings().cookie_name, crear_access_token({"sub": username, "sid": "s"})
    )
    respuesta = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "Fiestas patrias"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert respuesta.status_code == 201
    cambio = next(e for e in publicados if e["tipo"] == "cambio")
    assert cambio["recurso"] == "eventos"
    assert cambio["metodo"] == "POST"
    assert cambio["autor"] == username
    assert ["mariachi.mapalab.view"] in cambio["permisos"]


def test_escritura_rechazada_no_publica(admin_session, publicados):
    respuesta = admin_session["client"].post(f"{ADMIN_PREFIX}/eventos", json={"titulo": "x"})
    assert respuesta.status_code == 403
    assert publicados == []


def test_presencia_avisa_sin_datos_y_no_como_cambio(admin_session, publicados):
    respuesta = admin_session["client"].put(
        f"{ADMIN_PREFIX}/borradores/layer/capa-1/presencia",
        params={"campo": "label"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert respuesta.status_code == 200
    assert publicados == [{"tipo": "presencia", "scope": "capa", "id": "capa-1"}]


def test_presencia_rechaza_campo_con_caracteres_raros(admin_session, publicados):
    respuesta = admin_session["client"].put(
        f"{ADMIN_PREFIX}/borradores/layer/capa-1/presencia",
        params={"campo": "a{b}"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert respuesta.status_code == 422


def test_puede_ver_exige_un_permiso_de_cada_grupo():
    usuario = SimpleNamespace(permissions={"mariachi.mapalab.view"})
    assert puede_ver(usuario, {"permisos": []})
    assert puede_ver(usuario, {"permisos": [["mariachi.mapalab.view", "otro"]]})
    assert not puede_ver(usuario, {"permisos": [["mariachi.mapalab.view"], ["mariachi.vine.view"]]})
