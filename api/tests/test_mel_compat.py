"""El alias /identidad y el permiso viejo siguen vivos hasta la fase 3.

El modulo Identidad se renombro a MEL el 2026-09-02. El deploy del codigo no
puede depender de que el manifiesto ya este importado en minerva, asi que el
gate acepta el permiso nuevo o el viejo y la ruta vieja sigue respondiendo.
Estas pruebas son lo que tiene que ponerse rojo cuando se retire el compat:
si la fase 3 se lleva algo de mas, se ve aqui y no en produccion.
"""
from tests.conftest import ADMIN_PREFIX, login_as

RUTA_NUEVA = f"{ADMIN_PREFIX}/mel/marcas"
RUTA_VIEJA = f"{ADMIN_PREFIX}/identidad/marcas"

PERMISO_NUEVO = {"mariachi.mel.view"}
PERMISO_VIEJO = {"mariachi.identidad.view"}


def test_la_ruta_nueva_responde(admin_session):
    res = admin_session["client"].get(RUTA_NUEVA)

    assert res.status_code == 200
    assert res.json() == []


def test_el_alias_viejo_sigue_respondiendo(admin_session):
    res = admin_session["client"].get(RUTA_VIEJA)

    assert res.status_code == 200
    assert res.json() == []


def test_el_permiso_nuevo_abre_el_modulo(client, admin_user):
    login_as(client, admin_user, PERMISO_NUEVO)

    assert client.get(RUTA_NUEVA).status_code == 200


def test_el_permiso_viejo_todavia_abre_el_modulo(client, admin_user):
    login_as(client, admin_user, PERMISO_VIEJO)

    assert client.get(RUTA_NUEVA).status_code == 200
    assert client.get(RUTA_VIEJA).status_code == 200


def test_sin_ninguno_de_los_dos_permisos_se_niega(client, admin_user):
    login_as(client, admin_user, {"mariachi.mapalab.view"})

    assert client.get(RUTA_NUEVA).status_code == 403
    assert client.get(RUTA_VIEJA).status_code == 403
