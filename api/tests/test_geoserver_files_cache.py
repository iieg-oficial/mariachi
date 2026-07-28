import pytest

from app.services.geoserver_client import GeoServerClient
from tests.conftest import ADMIN_PREFIX

CONTENIDO = b"<svg xmlns='http://www.w3.org/2000/svg'/>"


@pytest.fixture
def geoserver_stub(monkeypatch):
    monkeypatch.setattr(GeoServerClient, "__init__", lambda self, *a, **kw: None)
    monkeypatch.setattr(
        GeoServerClient,
        "get_style_file_bytes",
        lambda self, name, workspace=None: (CONTENIDO, "image/svg+xml"),
    )


def test_descarga_no_se_marca_inmutable(admin_session, geoserver_stub):
    client = admin_session["client"]
    res = client.get(f"{ADMIN_PREFIX}/geoserver/files/icono.svg")

    assert res.status_code == 200
    cache = res.headers["cache-control"]
    assert "immutable" not in cache
    assert "must-revalidate" in cache
    assert res.headers["etag"]


def test_descarga_responde_304_si_el_etag_coincide(admin_session, geoserver_stub):
    client = admin_session["client"]
    primera = client.get(f"{ADMIN_PREFIX}/geoserver/files/icono.svg")
    etag = primera.headers["etag"]

    segunda = client.get(
        f"{ADMIN_PREFIX}/geoserver/files/icono.svg",
        headers={"If-None-Match": etag},
    )

    assert segunda.status_code == 304
    assert segunda.content == b""
    assert segunda.headers["etag"] == etag


def test_etag_distinto_vuelve_a_mandar_el_archivo(admin_session, geoserver_stub):
    client = admin_session["client"]
    res = client.get(
        f"{ADMIN_PREFIX}/geoserver/files/icono.svg",
        headers={"If-None-Match": '"otro-hash"'},
    )

    assert res.status_code == 200
    assert res.content == CONTENIDO
