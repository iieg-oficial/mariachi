from app.core.eventos import EventoEstado
from app.models.evento import Evento
from app.models.project import Project
from tests.conftest import ADMIN_PREFIX


def _seed_mapalab(db_session):
    project = Project(slug="mapalab", name="MapaLab", is_active=True)
    db_session.add(project)
    db_session.commit()


def _create(client, csrf, titulo="Evento"):
    return client.post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": titulo},
        headers={"X-CSRF-Token": csrf},
    ).json()


def test_crear_inicia_en_draft(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create(admin_session["client"], admin_session["csrf"])
    assert evento["estado"] == EventoEstado.DRAFT.value
    assert evento.get("publishedAt") is None


def test_publicar_cambia_estado_y_setea_published_at(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create(admin_session["client"], admin_session["csrf"])
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos/{evento['id']}/publicar",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["estado"] == EventoEstado.PUBLISHED.value
    assert body["publishedAt"] is not None


def test_despublicar_vuelve_a_draft(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create(admin_session["client"], admin_session["csrf"])
    csrf = admin_session["csrf"]
    admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos/{evento['id']}/publicar",
        headers={"X-CSRF-Token": csrf},
    )
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos/{evento['id']}/despublicar",
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    assert response.json()["estado"] == EventoEstado.DRAFT.value


def test_eliminar_remueve_evento(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create(admin_session["client"], admin_session["csrf"])
    response = admin_session["client"].delete(
        f"{ADMIN_PREFIX}/eventos/{evento['id']}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert db_session.query(Evento).filter(Evento.id == evento["id"]).first() is None


def test_eliminar_404_si_no_existe(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].delete(
        f"{ADMIN_PREFIX}/eventos/9999",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 404


def test_publicar_404_si_no_existe(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos/9999/publicar",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 404


def test_preview_devuelve_published_response(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create(admin_session["client"], admin_session["csrf"])
    response = admin_session["client"].get(f"{ADMIN_PREFIX}/eventos/{evento['id']}/preview")
    assert response.status_code == 200
    body = response.json()
    assert "estado" not in body
    assert "activo" not in body
    assert "createdAt" not in body
    assert body["slug"] == evento["slug"]


def test_listar_ordena_por_orden_y_id(admin_session, db_session):
    _seed_mapalab(db_session)
    csrf = admin_session["csrf"]
    headers = {"X-CSRF-Token": csrf}
    a = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos", json={"titulo": "A", "orden": 5}, headers=headers,
    ).json()
    b = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos", json={"titulo": "B", "orden": 1}, headers=headers,
    ).json()
    response = admin_session["client"].get(f"{ADMIN_PREFIX}/eventos")
    items = response.json()
    assert items[0]["id"] == b["id"]
    assert items[1]["id"] == a["id"]
