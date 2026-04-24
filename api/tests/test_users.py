from app.core.security import hash_password
from app.models.user import Usuario
from tests.conftest import ADMIN_PREFIX


def test_listar_usuarios(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/usuarios")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


def test_obtener_usuario(admin_session):
    client = admin_session["client"]
    admin_id = admin_session["user"].id
    response = client.get(f"{ADMIN_PREFIX}/usuarios/{admin_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert "hashed_password" not in data


def test_obtener_usuario_no_existente(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/usuarios/99999")
    assert response.status_code == 404


def test_crear_usuario_admin(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": admin_session["csrf"]},
        json={
            "username": "nuevo_usuario",
            "email": "nuevo@test.com",
            "name": "Nuevo Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "nuevo_usuario"
    assert "hashed_password" not in data


def test_crear_usuario_sin_permisos(editora_session):
    client = editora_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={
            "username": "nuevo_usuario",
            "email": "nuevo@test.com",
            "name": "Nuevo Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 403


def test_crear_usuario_duplicado(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": admin_session["csrf"]},
        json={
            "username": "admin_test",
            "email": "otro@test.com",
            "name": "Otro Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 409


def test_actualizar_usuario_propio(editora_session):
    client = editora_session["client"]
    editora_id = editora_session["user"].id
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{editora_id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"name": "Nombre Actualizado"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Nombre Actualizado"


def test_actualizar_usuario_otro_sin_permisos(editora_session, admin_user):
    client = editora_session["client"]
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{admin_user.id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"name": "Intento Cambio"},
    )
    assert response.status_code == 403


def test_eliminar_usuario_admin(admin_session, db_session):
    usuario_eliminar = Usuario(
        username="eliminar_test",
        email="eliminar@test.com",
        name="Usuario a Eliminar",
        hashed_password=hash_password("test123"),
        role="editora",
    )
    db_session.add(usuario_eliminar)
    db_session.commit()
    db_session.refresh(usuario_eliminar)

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{usuario_eliminar.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200


def test_eliminar_usuario_propio(admin_session):
    client = admin_session["client"]
    admin_id = admin_session["user"].id
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{admin_id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 400
