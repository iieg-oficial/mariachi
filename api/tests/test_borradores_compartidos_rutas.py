from tests.conftest import ADMIN_PREFIX, PERMISOS_EDITORA, TODOS_LOS_PERMISOS, login_as

BASE = f"{ADMIN_PREFIX}/borradores"


def _como(client, user, permisos):
    return {"X-CSRF-Token": login_as(client, user, permisos)}


def test_dos_personas_editan_el_mismo_borrador_de_capa(client, admin_user, editora_user):
    h_admin = _como(client, admin_user, TODOS_LOS_PERMISOS)
    r = client.put(f"{BASE}/layer/rios", json={"data": {"label": "Ríos"}}, headers=h_admin)
    assert r.status_code == 200, r.text
    assert r.json()["version"] == 1

    h_editora = _como(client, editora_user, PERMISOS_EDITORA)
    visto = client.get(f"{BASE}/layer/rios").json()
    assert visto["data"] == {"label": "Ríos"}

    r = client.put(
        f"{BASE}/layer/rios",
        json={"data": {"cql_filter": "tipo='rio'"}, "base_version": visto["version"]},
        headers=h_editora,
    )
    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["data"] == {"label": "Ríos", "cql_filter": "tipo='rio'"}
    assert cuerpo["autores"]["label"]["usuario"] == "admin_test"
    assert cuerpo["autores"]["cql_filter"]["usuario"] == "editora_test"

    capas = client.get(f"{BASE}/capas").json()
    assert len([b for b in capas if b["resource_id"] == "rios"]) == 1


def test_el_segundo_en_guardar_el_mismo_campo_recibe_409(client, admin_user, editora_user):
    h_admin = _como(client, admin_user, TODOS_LOS_PERMISOS)
    client.put(f"{BASE}/layer/rios", json={"data": {"label": "A"}}, headers=h_admin)
    client.put(f"{BASE}/layer/rios", json={"data": {"label": "B"}, "base_version": 1}, headers=h_admin)

    h_editora = _como(client, editora_user, PERMISOS_EDITORA)
    r = client.put(f"{BASE}/layer/rios", json={"data": {"label": "C"}, "base_version": 1}, headers=h_editora)
    assert r.status_code == 409
    assert "Admin Test" in r.json()["detail"]


def test_quitar_todos_los_campos_borra_el_borrador(client, admin_user):
    h = _como(client, admin_user, TODOS_LOS_PERMISOS)
    creado = client.put(f"{BASE}/layer_stats/salud:clinicas", json={"data": {"ttl_minutes": 30}}, headers=h).json()
    r = client.post(f"{BASE}/por-id/{creado['id']}/quitar-campos", json={"campos": ["ttl_minutes"]}, headers=h)
    assert r.status_code == 200
    assert r.json() is None
    assert client.get(f"{BASE}/layer_stats/salud:clinicas").json() is None


def test_quitar_algunos_campos_conserva_los_demas(client, admin_user):
    h = _como(client, admin_user, TODOS_LOS_PERMISOS)
    creado = client.put(
        f"{BASE}/layer/rios", json={"data": {"label": "A", "styles": "azul"}}, headers=h,
    ).json()
    r = client.post(f"{BASE}/por-id/{creado['id']}/quitar-campos", json={"campos": ["label"]}, headers=h)
    assert r.json()["data"] == {"styles": "azul"}


def test_los_demas_tipos_siguen_siendo_por_persona(client, admin_user, editora_user):
    h_admin = _como(client, admin_user, TODOS_LOS_PERMISOS)
    client.put(f"{BASE}/home_section/hero", json={"data": {"titulo": "del admin"}}, headers=h_admin)

    _como(client, editora_user, PERMISOS_EDITORA)
    assert client.get(f"{BASE}/home_section/hero").json() is None


def test_no_se_pide_archivar_con_cambios_pendientes(client, admin_user):
    h = _como(client, admin_user, TODOS_LOS_PERMISOS)
    client.put(f"{BASE}/layer/rios", json={"data": {"label": "A"}}, headers=h)
    r = client.post(f"{BASE}/layer/rios/solicitar-eliminacion", headers=h)
    assert r.status_code in (404, 409)
