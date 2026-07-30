from tests.conftest import ADMIN_PREFIX


def test_healthcheck(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_success(client, admin_user):
    response = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": "admin_test", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "csrf_token" in data
    assert data["user"]["username"] == "admin_test"
    assert data["user"]["role"] == "tetlamamakani"


def test_login_sets_cookie(client, admin_user):
    response = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": "admin_test", "password": "testpass123"},
    )
    assert response.status_code == 200
    cookie_names = [c.name for c in response.cookies.jar]
    assert any("token" in name.lower() or "session" in name.lower() for name in cookie_names)


def test_login_invalid_credentials(client, admin_user):
    response = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": "admin_test", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Credenciales inválidas" in response.json()["detail"]


def test_login_missing_fields(client):
    response = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": "admin_test"},
    )
    assert response.status_code == 422


def test_get_current_user(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/perfil")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert data["role"] == "tetlamamakani"


def test_get_current_user_no_cookie(client):
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/perfil")
    assert response.status_code == 401


def test_get_current_user_invalid_cookie(client, admin_user):
    client.cookies.set("access_token", "invalid_token")
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/perfil")
    assert response.status_code == 401


def test_verify_token_valid(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/verificar")
    assert response.status_code == 200
    assert response.json()["valid"] is True


def test_verify_token_invalid(client, admin_user):
    client.cookies.set("access_token", "invalid_token")
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/verificar")
    assert response.status_code == 401


def test_logout(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/autenticacion/cerrar-sesion",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert "exitosamente" in response.json()["message"]


HASH_GENERADO_POR_PASSLIB = "$2b$12$QvUQsE2nmgzu1LPzM6wpLeRpWXtKDcXE/jIchrCr28V5brHiRWzK2"


def test_verifica_hashes_heredados_de_passlib():
    from app.core.security import hash_password, verify_password

    assert verify_password("secreta123", HASH_GENERADO_POR_PASSLIB)
    assert not verify_password("incorrecta", HASH_GENERADO_POR_PASSLIB)
    assert verify_password("secreta123", hash_password("secreta123"))


def test_password_mayor_a_72_bytes_se_trunca_como_passlib():
    from app.core.security import hash_password, verify_password

    larga = "A" * 100
    hashed = hash_password(larga)
    assert verify_password(larga, hashed)
    assert verify_password("A" * 72, hashed)


def test_hash_invalido_no_revienta():
    from app.core.security import verify_password

    assert not verify_password("x", "no-es-un-hash")
