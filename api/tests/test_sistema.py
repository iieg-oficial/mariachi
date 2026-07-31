from tests.conftest import ADMIN_PREFIX


def test_colibri_config_requires_auth(client):
    response = client.get(f"{ADMIN_PREFIX}/sistema/colibri-config")
    assert response.status_code == 401


def test_colibri_config_niega_a_externo(externo_session):
    client = externo_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/sistema/colibri-config")
    assert response.status_code == 403


def test_colibri_config_permite_a_editora(editora_session):
    client = editora_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/sistema/colibri-config")
    assert response.status_code == 200
    assert response.json()["source_app"] == "mariachi"


def test_notas_version_niega_a_externo(externo_session):
    client = externo_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/sistema/notas-version")
    assert response.status_code == 403
