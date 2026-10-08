from tests.conftest import ADMIN_PREFIX, PERMISOS_REPORTAR, login_as


def test_niega_sin_el_permiso_de_panel(client, editora_user):
    login_as(client, editora_user, {"mariachi.sieej_formularios.view"})
    assert client.get(f"{ADMIN_PREFIX}/sieej/grupos").status_code == 403


def test_permite_al_rol_de_consulta(client, editora_user):
    login_as(
        client,
        editora_user,
        {"mariachi.sieej_admin.view", "mariachi.sieej_formularios.view"},
    )
    assert client.get(f"{ADMIN_PREFIX}/sieej/grupos").status_code == 200


def test_permite_admin(admin_session):
    response = admin_session["client"].get(f"{ADMIN_PREFIX}/sieej/grupos")
    assert response.status_code == 200


def test_niega_al_rol_de_reportar(client, externo_user):
    login_as(client, externo_user, PERMISOS_REPORTAR)
    assert client.get(f"{ADMIN_PREFIX}/sieej/grupos").status_code == 403
