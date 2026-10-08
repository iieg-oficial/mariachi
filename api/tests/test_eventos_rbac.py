from app.core.eventos import EventoEstado
from app.models.evento import Evento
from tests.conftest import ADMIN_PREFIX, login_as

SOLO_LECTURA = {"mariachi.mapalab.view"}
EDICION = {"mariachi.mapalab.view", "mariachi.mapalab.update"}


def _seed_evento(db_session, *, slug="evento-x", estado=EventoEstado.DRAFT.value, activo=True):
    evento = Evento(slug=slug, titulo="Evento X", estado=estado, activo=activo, capas=[])
    db_session.add(evento)
    db_session.commit()
    db_session.refresh(evento)
    return evento


def test_sin_permiso_de_mapalab_403_al_listar(client, editora_user):
    login_as(client, editora_user, set())
    assert client.get(f"{ADMIN_PREFIX}/eventos").status_code == 403


def test_con_edicion_se_listan_borradores_y_publicados(client, editora_user, db_session):
    login_as(client, editora_user, EDICION)
    _seed_evento(db_session, slug="d", estado=EventoEstado.DRAFT.value)
    _seed_evento(db_session, slug="p", estado=EventoEstado.PUBLISHED.value)
    response = client.get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 200
    assert {e["slug"] for e in response.json()} == {"d", "p"}


def test_solo_lectura_ve_unicamente_lo_publicado(client, editora_user, db_session):
    login_as(client, editora_user, SOLO_LECTURA)
    _seed_evento(db_session, slug="d", estado=EventoEstado.DRAFT.value)
    _seed_evento(db_session, slug="p", estado=EventoEstado.PUBLISHED.value)
    response = client.get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 200
    assert {e["slug"] for e in response.json()} == {"p"}


def test_solo_lectura_recibe_404_en_un_borrador(client, editora_user, db_session):
    login_as(client, editora_user, SOLO_LECTURA)
    evento = _seed_evento(db_session, estado=EventoEstado.DRAFT.value)
    assert client.get(f"{ADMIN_PREFIX}/eventos/{evento.id}").status_code == 404


def test_solo_lectura_si_puede_abrir_lo_publicado(client, editora_user, db_session):
    login_as(client, editora_user, SOLO_LECTURA)
    evento = _seed_evento(db_session, estado=EventoEstado.PUBLISHED.value)
    assert client.get(f"{ADMIN_PREFIX}/eventos/{evento.id}").status_code == 200


def test_solo_lectura_no_puede_crear(client, editora_user):
    csrf = login_as(client, editora_user, SOLO_LECTURA)
    response = client.post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 403
    assert "mariachi.mapalab.update" in response.json()["detail"]


def test_con_edicion_se_puede_crear(client, editora_user):
    csrf = login_as(client, editora_user, EDICION)
    response = client.post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "Mi evento"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["titulo"] == "Mi evento"
    assert body["estado"] == EventoEstado.DRAFT.value


def test_escribir_sin_csrf_403(client, editora_user):
    login_as(client, editora_user, EDICION)
    response = client.post(f"{ADMIN_PREFIX}/eventos", json={"titulo": "T"})
    assert response.status_code == 403


def test_presencia_put_sin_csrf_403(client, editora_user, db_session):
    login_as(client, editora_user, EDICION)
    evento = _seed_evento(db_session)
    assert client.put(f"{ADMIN_PREFIX}/eventos/{evento.id}/presencia").status_code == 403


def test_presencia_put_con_csrf_ok(client, editora_user, db_session):
    csrf = login_as(client, editora_user, EDICION)
    evento = _seed_evento(db_session)
    response = client.put(
        f"{ADMIN_PREFIX}/eventos/{evento.id}/presencia",
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
