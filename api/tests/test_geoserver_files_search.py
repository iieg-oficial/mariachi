import pytest

from app.services.geoserver_client import GeoServerClient
from tests.conftest import ADMIN_PREFIX

ARCHIVOS = {
    None: [{"name": "iconos/flecha.svg", "content_type": "image/svg+xml"}],
    "__rasters__": [{"name": "ortofoto/flecha.properties", "content_type": "text/plain"}],
}


@pytest.fixture
def consultados(monkeypatch):
    vistos: list[str | None] = []

    def listar(self, workspace=None):
        vistos.append(workspace)
        return ARCHIVOS.get(workspace, [])

    monkeypatch.setattr(GeoServerClient, "__init__", lambda self, *a, **kw: None)
    monkeypatch.setattr(GeoServerClient, "list_all_style_files", listar)
    return vistos


def test_sin_workspace_busca_en_todos_los_ambitos(admin_session, consultados):
    client = admin_session["client"]
    res = client.get(f"{ADMIN_PREFIX}/geoserver/files/search", params={"q": "flecha"})

    assert res.status_code == 200
    assert len(res.json()["results"]) == 2
    assert {None, "__rasters__"} <= set(consultados)


def test_workspace_vacio_busca_solo_en_styles(admin_session, consultados):
    client = admin_session["client"]
    res = client.get(f"{ADMIN_PREFIX}/geoserver/files/search", params={"q": "flecha", "workspace": ""})

    assert res.status_code == 200
    assert [r["name"] for r in res.json()["results"]] == ["iconos/flecha.svg"]
    assert consultados == [None]


def test_workspace_rasters_busca_solo_ahi(admin_session, consultados):
    client = admin_session["client"]
    res = client.get(
        f"{ADMIN_PREFIX}/geoserver/files/search",
        params={"q": "flecha", "workspace": "__rasters__"},
    )

    assert res.status_code == 200
    assert [r["name"] for r in res.json()["results"]] == ["ortofoto/flecha.properties"]
    assert consultados == ["__rasters__"]


def test_workspace_invalido_responde_400(admin_session, consultados):
    client = admin_session["client"]
    res = client.get(
        f"{ADMIN_PREFIX}/geoserver/files/search",
        params={"q": "flecha", "workspace": "../otro"},
    )

    assert res.status_code == 400
    assert consultados == []
