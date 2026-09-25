import pytest

from tests.conftest import ADMIN_PREFIX, login_as

CONSULTA_SIEEJ = {
    "mariachi.sieej_admin.view",
    "mariachi.sieej_formularios.view",
    "mariachi.sieej_envios.view",
}


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("post", "/sieej/formularios"),
        ("put", "/sieej/formularios/1"),
        ("post", "/sieej/formularios/1/publicar"),
        ("delete", "/sieej/formularios/1"),
        ("put", "/sieej/formularios/1/asignaciones"),
        ("get", "/sieej/formularios/1/exportar-envios"),
        ("get", "/sieej/formularios/1/notificaciones/exportar"),
        ("post", "/sieej/formularios/1/envios/1/reabrir"),
        ("delete", "/sieej/formularios/1/envios/1?confirmacion=x"),
        ("post", "/sieej/sieej/periodos/tick"),
        ("post", "/sieej/grupos"),
        ("put", "/sieej/grupos/1/usuarios"),
        ("delete", "/sieej/grupos/1"),
        ("post", "/sieej/catalogos"),
        ("delete", "/sieej/catalogos/municipios"),
    ],
)
def test_el_rol_de_consulta_de_sieej_no_escribe(client, editora_user, metodo, ruta):
    csrf = login_as(client, editora_user, CONSULTA_SIEEJ)
    respuesta = client.request(
        metodo.upper(), f"{ADMIN_PREFIX}{ruta}", json={}, headers={"X-CSRF-Token": csrf}
    )
    assert respuesta.status_code == 403
    assert "Requiere permiso" in respuesta.json()["detail"]


def test_el_rol_de_consulta_de_sieej_si_lee(client, editora_user):
    login_as(client, editora_user, CONSULTA_SIEEJ)
    assert client.get(f"{ADMIN_PREFIX}/sieej/formularios").status_code == 200
    assert client.get(f"{ADMIN_PREFIX}/sieej/grupos").status_code == 200


@pytest.mark.parametrize(
    ("metodo", "ruta", "permisos"),
    [
        ("put", "/formularios/demo/envio", {"mariachi.sieej_formularios.view", "mariachi.sieej_envios.view"}),
        ("post", "/formularios/demo/envio/sync", {"mariachi.sieej_formularios.view"}),
        ("post", "/formularios/demo/envio/upload", {"mariachi.sieej_formularios.view"}),
        ("delete", "/formularios/mis-envios/1", {"mariachi.sieej_formularios.view", "mariachi.sieej_envios.update"}),
        ("put", "/formularios/mis-envios/1/actualizar-campos", {"mariachi.sieej_formularios.view"}),
    ],
)
def test_capturar_envios_pide_el_permiso_de_la_accion(client, externo_user, metodo, ruta, permisos):
    csrf = login_as(client, externo_user, permisos)
    respuesta = client.request(
        metodo.upper(), f"{ADMIN_PREFIX}{ruta}", json={}, headers={"X-CSRF-Token": csrf}
    )
    assert respuesta.status_code == 403


@pytest.mark.parametrize("ruta", ["/mel/iieg/tokens/1", "/mel/iieg/campos", "/identidad/iieg/campos"])
def test_mel_view_no_edita(client, editora_user, ruta):
    csrf = login_as(client, editora_user, {"mariachi.mel.view"})
    respuesta = client.put(f"{ADMIN_PREFIX}{ruta}", json={}, headers={"X-CSRF-Token": csrf})
    assert respuesta.status_code == 403


@pytest.mark.parametrize(
    "ruta",
    [
        "/sistema/monitor/status",
        "/sistema/monitor/nodos",
        "/sistema/monitor/nodos/s1/historial",
        "/sistema/monitor/status/mariachi-api",
        "/sistema/monitor/events",
    ],
)
def test_el_monitor_exige_sistema_manage(client, editora_user, ruta):
    login_as(client, editora_user, {"mariachi.mapalab.view"})
    assert client.get(f"{ADMIN_PREFIX}{ruta}").status_code == 403


@pytest.mark.parametrize("nodo", ["..%2F..%2Fadmin", "s1%3Fx%3D1", "a b"])
def test_el_monitor_valida_el_nodo(client, admin_user, nodo):
    login_as(client, admin_user, {"mariachi.sistema.manage"})
    respuesta = client.get(f"{ADMIN_PREFIX}/sistema/monitor/nodos/{nodo}/historial")
    assert respuesta.status_code in {404, 422}
