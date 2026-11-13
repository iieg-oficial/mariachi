from tests.conftest import ADMIN_PREFIX, login_as

BASE = f"{ADMIN_PREFIX}/borradores"

EDICION_PORTAL = {"mariachi.portal.view", "mariachi.portal.update"}
PUBLICACION_PORTAL = EDICION_PORTAL | {"mariachi.portal.publish"}
EDICION_MAPALAB = {"mariachi.mapalab.view", "mariachi.mapalab.update"}


def _como(client, user, permisos):
    return {"X-CSRF-Token": login_as(client, user, permisos)}


def _pagina_en_revision(client, user):
    h = _como(client, user, EDICION_PORTAL)
    r = client.put(f"{BASE}/pagina/7", json={"data": {"title": "Nueva"}}, headers=h)
    assert r.status_code == 200, r.text
    assert client.post(f"{BASE}/pagina/7/solicitar-revision", headers=h).status_code == 200
    return r.json()["id"]


def test_portal_sin_mapalab_guarda_su_borrador(client, editora_user):
    _pagina_en_revision(client, editora_user)


def test_solo_consulta_no_guarda_borradores(client, editora_user):
    h = _como(client, editora_user, {"mariachi.mapalab.view"})
    r = client.put(f"{BASE}/layer/rios", json={"data": {"label": "x"}}, headers=h)
    assert r.status_code == 403
    assert "mariachi.mapalab.update" in r.json()["detail"]


def test_edicion_de_portal_no_aprueba_ni_descarta(client, editora_user):
    borrador_id = _pagina_en_revision(client, editora_user)
    h = _como(client, editora_user, EDICION_PORTAL)
    assert client.get(f"{BASE}/por-id/{borrador_id}").status_code == 403
    assert client.delete(f"{BASE}/por-id/{borrador_id}", headers=h).status_code == 403
    assert client.get(f"{BASE}/pendientes").status_code == 403


def test_publicacion_de_portal_revisa_sin_permisos_de_mapalab(client, editora_user, admin_user):
    borrador_id = _pagina_en_revision(client, editora_user)
    h = _como(client, admin_user, PUBLICACION_PORTAL)
    pendientes = client.get(f"{BASE}/pendientes")
    assert pendientes.status_code == 200
    assert [b["id"] for b in pendientes.json()] == [borrador_id]
    assert client.get(f"{BASE}/por-id/{borrador_id}").status_code == 200
    r = client.post(f"{BASE}/por-id/{borrador_id}/rechazar", json={"comentario": "no"}, headers=h)
    assert r.status_code == 200
    assert client.delete(f"{BASE}/por-id/{borrador_id}", headers=h).status_code == 200


def test_pendientes_solo_trae_lo_que_cada_quien_aprueba(client, editora_user, admin_user):
    _pagina_en_revision(client, editora_user)
    h = _como(client, editora_user, EDICION_MAPALAB)
    client.put(f"{BASE}/layer/rios", json={"data": {"label": "x"}}, headers=h)
    client.post(f"{BASE}/layer/rios/solicitar-revision", headers=h)

    _como(client, admin_user, {"mariachi.mapalab.view", "mariachi.mapalab.manage"})
    tipos = {b["resource_type"] for b in client.get(f"{BASE}/pendientes").json()}
    assert tipos == {"layer"}


def test_edicion_de_mapalab_no_aprueba_capas(client, editora_user):
    h = _como(client, editora_user, EDICION_MAPALAB)
    r = client.put(f"{BASE}/layer/rios", json={"data": {"label": "x"}}, headers=h)
    borrador_id = r.json()["id"]
    client.post(f"{BASE}/layer/rios/solicitar-revision", headers=h)
    assert client.post(f"{BASE}/por-id/{borrador_id}/aprobar", headers=h).status_code == 403
