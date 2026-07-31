from app.models.project import Project, UserProject
from tests.conftest import ADMIN_PREFIX


def _seed_sieej(db_session):
    project = Project(slug="sieej", name="SIEEJ", is_active=True)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def test_niega_editora_sin_membresia(editora_session, db_session):
    _seed_sieej(db_session)
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/sieej/grupos")
    assert response.status_code == 403


def test_permite_editora_con_membresia(editora_session, db_session):
    project = _seed_sieej(db_session)
    db_session.add(
        UserProject(
            user_id=editora_session["user"].id,
            project_id=project.id,
            project_role="editor",
        )
    )
    db_session.commit()
    response = editora_session["client"].get(f"{ADMIN_PREFIX}/sieej/grupos")
    assert response.status_code == 200


def test_permite_admin_sin_membresia(admin_session, db_session):
    _seed_sieej(db_session)
    response = admin_session["client"].get(f"{ADMIN_PREFIX}/sieej/grupos")
    assert response.status_code == 200


def test_niega_externo(externo_session, db_session):
    _seed_sieej(db_session)
    response = externo_session["client"].get(f"{ADMIN_PREFIX}/sieej/grupos")
    assert response.status_code == 403
