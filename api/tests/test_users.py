import pytest


def test_listar_usuarios(client, admin_user, admin_token):
    response = client.get(
        "/api/cms/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


def test_obtener_usuario(client, admin_user, admin_token):
    response = client.get(
        f"/api/cms/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert "hashed_password" not in data


def test_obtener_usuario_no_existente(client, admin_token):
    response = client.get(
        "/api/cms/users/99999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_crear_usuario_admin(client, admin_token):
    response = client.post(
        "/api/cms/users",
        headers={"Authorization": f"Bearer {admin_token}"},
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


def test_crear_usuario_sin_permisos(client, editora_token):
    response = client.post(
        "/api/cms/users",
        headers={"Authorization": f"Bearer {editora_token}"},
        json={
            "username": "nuevo_usuario",
            "email": "nuevo@test.com",
            "name": "Nuevo Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 403


def test_crear_usuario_duplicado(client, admin_user, admin_token):
    response = client.post(
        "/api/cms/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": "admin_test",
            "email": "otro@test.com",
            "name": "Otro Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 409


def test_actualizar_usuario_propio(client, editora_user, editora_token):
    response = client.put(
        f"/api/cms/users/{editora_user.id}",
        headers={"Authorization": f"Bearer {editora_token}"},
        json={"name": "Nombre Actualizado"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Nombre Actualizado"


def test_actualizar_usuario_otro_sin_permisos(client, admin_user, editora_token):
    response = client.put(
        f"/api/cms/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {editora_token}"},
        json={"name": "Intento Cambio"},
    )
    assert response.status_code == 403


def test_eliminar_usuario_admin(client, db_session, admin_token):
    from app.models.user import Usuario
    from app.core.security import hash_password

    usuario_eliminar = Usuario(
        username="eliminar_test",
        email="eliminar@test.com",
        name="Usuario a Eliminar",
        hashed_password=hash_password("test123"),
        role="diseñadora",
    )
    db_session.add(usuario_eliminar)
    db_session.commit()
    db_session.refresh(usuario_eliminar)

    response = client.delete(
        f"/api/cms/users/{usuario_eliminar.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200


def test_eliminar_usuario_propio(client, admin_user, admin_token):
    response = client.delete(
        f"/api/cms/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
