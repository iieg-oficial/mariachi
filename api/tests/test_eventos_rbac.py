from app.core.eventos import EventoEstado
from app.models.evento import Evento
from app.models.project import Project, UserProject
from tests.conftest import ADMIN_PREFIX


def _seed_mapalab(db_session):
    project = Project(slug="mapalab", name="MapaLab", is_active=True)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def _seed_evento(db_session, *, slug="evento-x", estado=EventoEstado.DRAFT.value, activo=True):
    evento = Evento(slug=slug, titulo="Evento X", estado=estado, activo=activo, capas=[])
    db_session.add(evento)
    db_session.commit()
    db_session.refresh(evento)
    return evento


def _grant(db_session, project, user, role):
    db_session.add(UserProject(user_id=user.id, project_id=project.id, project_role=role))
    db_session.commit()


def test_sin_membership_403_listar(editora_session, db_session):
    _seed_mapalab(db_session)
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 403


def test_admin_lista_drafts_y_published(admin_session, db_session):
    _seed_mapalab(db_session)
    _seed_evento(db_session, slug="d", estado=EventoEstado.DRAFT.value)
    _seed_evento(db_session, slug="p", estado=EventoEstado.PUBLISHED.value)
    response = admin_session["client"].get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 200
    slugs = {e["slug"] for e in response.json()}
    assert slugs == {"d", "p"}


def test_viewer_solo_ve_published_en_listar(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "viewer")
    _seed_evento(db_session, slug="d", estado=EventoEstado.DRAFT.value)
    _seed_evento(db_session, slug="p", estado=EventoEstado.PUBLISHED.value)
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 200
    slugs = {e["slug"] for e in response.json()}
    assert slugs == {"p"}


def test_editor_lista_drafts_y_published(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "editor")
    _seed_evento(db_session, slug="d", estado=EventoEstado.DRAFT.value)
    _seed_evento(db_session, slug="p", estado=EventoEstado.PUBLISHED.value)
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_viewer_404_al_obtener_draft(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "viewer")
    evento = _seed_evento(db_session, estado=EventoEstado.DRAFT.value)
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/eventos/{evento.id}")
    assert response.status_code == 404


def test_viewer_puede_obtener_published(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "viewer")
    evento = _seed_evento(db_session, estado=EventoEstado.PUBLISHED.value)
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/eventos/{evento.id}")
    assert response.status_code == 200


def test_viewer_no_puede_crear(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "viewer")
    response = editora_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T"},
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403
    assert "editor" in response.json()["detail"].lower()


def test_editor_puede_crear(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "editor")
    response = editora_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "Mi evento"},
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["titulo"] == "Mi evento"
    assert body["estado"] == EventoEstado.DRAFT.value


def test_admin_puede_crear_sin_membership(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "Admin evento"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201


def test_writes_sin_csrf_403(editora_session, db_session, editora_user):
    project = _seed_mapalab(db_session)
    _grant(db_session, project, editora_user, "editor")
    response = editora_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "T"},
    )
    assert response.status_code == 403


def test_proyecto_mapalab_inexistente_404(editora_session, db_session):
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/eventos")
    assert response.status_code == 404
