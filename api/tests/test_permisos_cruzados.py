import pytest

from tests.conftest import ADMIN_PREFIX, login_as

EDICION_MAPALAB = {"mariachi.mapalab.view", "mariachi.mapalab.update"}


def test_mapalab_lee_paletas_de_geoserver_sin_rol_de_geoserver(client, editora_user):
    login_as(client, editora_user, {"mariachi.mapalab.view"})
    assert client.get(f"{ADMIN_PREFIX}/geoserver/palettes").status_code == 200


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("post", "/geoserver/workspaces/register"),
        ("get", "/geoserver/db-schemas"),
        ("get", "/geoserver/files"),
        ("get", "/geoserver/fonts"),
        ("post", "/geoserver/fonts/reload"),
        ("delete", "/geoserver/files/x.svg"),
    ],
)
def test_mapalab_no_administra_ni_explora_geoserver(client, editora_user, metodo, ruta):
    csrf = login_as(client, editora_user, EDICION_MAPALAB)
    r = client.request(metodo.upper(), f"{ADMIN_PREFIX}{ruta}", json={}, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 403


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("post", "/geoserver/fonts/reload"),
        ("delete", "/geoserver/files/x.svg"),
        ("post", "/geoserver/workspaces/register"),
    ],
)
def test_consulta_de_geoserver_no_escribe(client, editora_user, metodo, ruta):
    csrf = login_as(client, editora_user, {"mariachi.geoserver.view"})
    r = client.request(metodo.upper(), f"{ADMIN_PREFIX}{ruta}", json={}, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 403
    assert "mariachi.geoserver.manage" in r.json()["detail"]


def test_sin_geoserver_ni_mapalab_no_entra(client, editora_user):
    login_as(client, editora_user, {"mariachi.portal.view"})
    assert client.get(f"{ADMIN_PREFIX}/geoserver/palettes").status_code == 403


def test_grid_de_configuracion_pide_manage_para_escribir(client, editora_user):
    csrf = login_as(client, editora_user, EDICION_MAPALAB)
    r = client.patch(
        f"{ADMIN_PREFIX}/grid/layer-config/cells",
        json={"changes": []},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 403
    assert "mariachi.mapalab.manage" in r.json()["detail"]


def test_grid_de_configuracion_con_manage_escribe(client, editora_user):
    csrf = login_as(client, editora_user, EDICION_MAPALAB | {"mariachi.mapalab.manage"})
    r = client.patch(
        f"{ADMIN_PREFIX}/grid/layer-config/cells",
        json={"changes": []},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200


def test_grid_de_metadatos_sigue_con_update(client, editora_user):
    csrf = login_as(client, editora_user, EDICION_MAPALAB)
    r = client.patch(
        f"{ADMIN_PREFIX}/grid/layer-metadata/cells",
        json={"changes": []},
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 200
