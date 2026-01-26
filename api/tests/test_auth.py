import pytest


def test_healthcheck(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_success(client, admin_user):
    response = client.post(
        "/api/cms/auth/login",
        json={"username": "admin_test", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin_test"


def test_login_invalid_credentials(client, admin_user):
    response = client.post(
        "/api/cms/auth/login",
        json={"username": "admin_test", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Credenciales inválidas" in response.json()["detail"]


def test_login_missing_fields(client):
    response = client.post(
        "/api/cms/auth/login",
        json={"username": "admin_test"},
    )
    assert response.status_code == 422


def test_get_current_user(client, admin_user, admin_token):
    response = client.get(
        "/api/cms/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert data["role"] == "tetlamamakani"


def test_get_current_user_no_token(client):
    response = client.get("/api/cms/auth/me")
    assert response.status_code == 401


def test_get_current_user_invalid_token(client):
    response = client.get(
        "/api/cms/auth/me",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401


def test_verify_token_valid(client, admin_token):
    response = client.get(
        "/api/cms/auth/verify",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["valid"] is True


def test_verify_token_invalid(client):
    response = client.get(
        "/api/cms/auth/verify",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401


def test_logout(client, admin_token):
    response = client.post(
        "/api/cms/auth/logout",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert "exitosamente" in response.json()["message"]
