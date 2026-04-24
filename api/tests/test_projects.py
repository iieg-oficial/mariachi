from app.models.project import Project, UserProject
from tests.conftest import ADMIN_PREFIX


def _seed_projects(db_session):
    portal = Project(slug="portal", name="Portal", is_active=True)
    mapalab = Project(slug="mapalab", name="Mapalab", is_active=True)
    inactivo = Project(slug="inactivo", name="Inactivo", is_active=False)
    db_session.add_all([portal, mapalab, inactivo])
    db_session.commit()
    db_session.refresh(portal)
    db_session.refresh(mapalab)
    return portal, mapalab


def test_list_projects_requires_auth(client):
    response = client.get(f"{ADMIN_PREFIX}/projects")
    assert response.status_code == 401


def test_list_projects_returns_active_only(admin_session, db_session):
    _seed_projects(db_session)
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/projects")
    assert response.status_code == 200
    slugs = [p["slug"] for p in response.json()]
    assert "portal" in slugs
    assert "mapalab" in slugs
    assert "inactivo" not in slugs


def test_create_project_admin_ok(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/projects",
        json={"slug": "nuevo", "name": "Nuevo proyecto"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "nuevo"
    assert body["name"] == "Nuevo proyecto"
    assert body["is_active"] is True


def test_create_project_editora_forbidden(editora_session):
    client = editora_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/projects",
        json={"slug": "nuevo", "name": "Nuevo proyecto"},
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


def test_create_project_duplicate_slug_conflict(admin_session, db_session):
    _seed_projects(db_session)
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/projects",
        json={"slug": "portal", "name": "Otro"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409


def test_update_project_admin_ok(admin_session, db_session):
    portal, _ = _seed_projects(db_session)
    client = admin_session["client"]
    response = client.patch(
        f"{ADMIN_PREFIX}/projects/{portal.id}",
        json={"name": "Portal renombrado"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Portal renombrado"


def test_update_project_editora_forbidden(editora_session, db_session):
    portal, _ = _seed_projects(db_session)
    client = editora_session["client"]
    response = client.patch(
        f"{ADMIN_PREFIX}/projects/{portal.id}",
        json={"name": "Hack"},
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


def test_set_user_projects_replaces_memberships(admin_session, db_session, editora_user):
    portal, mapalab = _seed_projects(db_session)
    db_session.add(
        UserProject(user_id=editora_user.id, project_id=portal.id, project_role="editor")
    )
    db_session.commit()

    client = admin_session["client"]
    response = client.put(
        f"{ADMIN_PREFIX}/projects/users/{editora_user.id}",
        json=[
            {"project_slug": "mapalab", "project_role": "viewer"},
        ],
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["slug"] == "mapalab"
    assert body[0]["project_role"] == "viewer"

    rows = (
        db_session.query(UserProject)
        .filter(UserProject.user_id == editora_user.id)
        .all()
    )
    assert len(rows) == 1
    assert rows[0].project_id == mapalab.id


def test_set_user_projects_editora_forbidden(editora_session, db_session, editora_user):
    _seed_projects(db_session)
    client = editora_session["client"]
    response = client.put(
        f"{ADMIN_PREFIX}/projects/users/{editora_user.id}",
        json=[],
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403
