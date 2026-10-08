from tests.conftest import ADMIN_PREFIX, login_as


def test_sin_permiso_de_portal_no_se_leen_las_paginas(client, editora_user):
    login_as(client, editora_user, set())
    assert client.get(f"{ADMIN_PREFIX}/paginas").status_code == 403


def test_con_portal_view_se_leen_las_paginas(client, editora_user):
    login_as(client, editora_user, {"mariachi.portal.view"})
    assert client.get(f"{ADMIN_PREFIX}/paginas").status_code == 200


def test_portal_view_no_alcanza_para_escribir(client, editora_user):
    csrf = login_as(client, editora_user, {"mariachi.portal.view"})
    response = client.put(
        f"{ADMIN_PREFIX}/paginas/1",
        json={"title": "Test", "sections": []},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 403
    assert "mariachi.portal.update" in response.json()["detail"]


def test_con_portal_update_se_puede_escribir(client, editora_user):
    csrf = login_as(
        client, editora_user, {"mariachi.portal.view", "mariachi.portal.update"}
    )
    response = client.put(
        f"{ADMIN_PREFIX}/paginas/1",
        json={"title": "Test", "sections": []},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code != 403
