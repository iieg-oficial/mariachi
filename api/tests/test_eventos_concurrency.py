
from app.models.project import Project
from tests.conftest import ADMIN_PREFIX


def _seed_mapalab(db_session):
    project = Project(slug="mapalab", name="MapaLab", is_active=True)
    db_session.add(project)
    db_session.commit()


def _create_evento(client, csrf, titulo="Evento"):
    response = client.post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": titulo},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 201
    return response.json()


def test_patch_sin_expected_updated_at_actualiza(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create_evento(admin_session["client"], admin_session["csrf"])
    response = admin_session["client"].patch(
        f"{ADMIN_PREFIX}/eventos/{evento['id']}",
        json={"titulo": "Nuevo titulo"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert response.json()["titulo"] == "Nuevo titulo"


def test_patch_con_expected_updated_at_correcto(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _create_evento(admin_session["client"], admin_session["csrf"])
    response = admin_session["client"].patch(
        f"{ADMIN_PREFIX}/eventos/{evento['id']}",
        json={
            "titulo": "Nuevo",
            "expectedUpdatedAt": evento["updatedAt"],
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200


def test_patch_con_expected_updated_at_obsoleto_409(admin_session, db_session):
    _seed_mapalab(db_session)
    evento_data = _create_evento(admin_session["client"], admin_session["csrf"])
    obsoleto = "2020-01-01T00:00:00"
    response = admin_session["client"].patch(
        f"{ADMIN_PREFIX}/eventos/{evento_data['id']}",
        json={"titulo": "X", "expectedUpdatedAt": obsoleto},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409


def test_patch_404_si_no_existe(admin_session, db_session):
    _seed_mapalab(db_session)
    response = admin_session["client"].patch(
        f"{ADMIN_PREFIX}/eventos/9999",
        json={"titulo": "X"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 404


def test_patch_actualiza_updated_at(admin_session, db_session):
    _seed_mapalab(db_session)
    evento_inicial = _create_evento(admin_session["client"], admin_session["csrf"])
    response = admin_session["client"].patch(
        f"{ADMIN_PREFIX}/eventos/{evento_inicial['id']}",
        json={"titulo": "Renombrado"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.json()["updatedAt"] != evento_inicial["updatedAt"]
