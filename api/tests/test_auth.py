from urllib.parse import parse_qs, urlparse

from app.api.routes.auth import TX_COOKIE_NAME, resolve_user
from app.models.user import Usuario
from tests.conftest import ADMIN_PREFIX


def test_healthcheck(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_redirige_a_minerva_con_pkce(client):
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/login", follow_redirects=False
    )
    assert response.status_code == 302

    query = parse_qs(urlparse(response.headers["location"]).query)
    assert query["response_type"] == ["code"]
    assert query["code_challenge_method"] == ["S256"]
    assert query["code_challenge"]
    assert query["state"]
    assert query["redirect_uri"] == [
        "http://mariachi.test/api/mariachi/autenticacion/callback"
    ]

    assert TX_COOKIE_NAME in {c.name for c in response.cookies.jar}
    assert "code_verifier" not in query


def test_callback_sin_rol_en_la_app_lleva_al_login_con_el_error(client):
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/callback",
        params={"error": "access_denied", "state": "loquesea"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"].endswith("/login?auth_error=access_denied")


def test_callback_con_state_que_no_coincide_vuelve_al_login(client):
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/callback",
        params={"code": "abc", "state": "no-es-el-mio"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"].endswith("/login?auth_error=invalid_state")


def test_resolve_user_reconcilia_por_correo_ignorando_mayusculas(db_session):
    previo = Usuario(
        username="ana",
        email="Ana.Perez@iieg.gob.mx",
        name="Ana Perez",
        hashed_password="!minerva",
        role="editora",
    )
    db_session.add(previo)
    db_session.commit()
    id_original = previo.id

    resuelto = resolve_user(
        db_session,
        {"sub": "sub-de-minerva", "email": "ana.perez@iieg.gob.mx", "name": "Ana Pérez"},
    )

    assert resuelto.id == id_original
    assert resuelto.minerva_sub == "sub-de-minerva"
    assert db_session.query(Usuario).count() == 1


def test_resolve_user_da_de_alta_a_quien_no_existia(db_session):
    resuelto = resolve_user(
        db_session,
        {"sub": "sub-nuevo", "email": "nuevo@iieg.gob.mx", "name": "Persona Nueva"},
    )

    assert resuelto.id is not None
    assert resuelto.minerva_sub == "sub-nuevo"
    assert resuelto.email == "nuevo@iieg.gob.mx"
    assert resuelto.username == "nuevo"


def test_resolve_user_no_repite_username_ocupado(db_session):
    db_session.add(
        Usuario(
            username="nuevo",
            email="otro@iieg.gob.mx",
            name="Otro",
            hashed_password="!minerva",
            role="editora",
        )
    )
    db_session.commit()

    resuelto = resolve_user(
        db_session, {"sub": "sub-2", "email": "nuevo@iieg.gob.mx", "name": "Nuevo"}
    )
    assert resuelto.username != "nuevo"


def test_resolve_user_encuentra_por_sub_aunque_cambie_el_correo(db_session):
    previo = Usuario(
        username="luis",
        email="luis@iieg.gob.mx",
        name="Luis",
        hashed_password="!minerva",
        role="editora",
        minerva_sub="sub-luis",
    )
    db_session.add(previo)
    db_session.commit()

    resuelto = resolve_user(
        db_session,
        {"sub": "sub-luis", "email": "luis.nuevo@iieg.gob.mx", "name": "Luis"},
    )
    assert resuelto.id == previo.id
    assert resuelto.email == "luis.nuevo@iieg.gob.mx"


def test_get_current_user(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/perfil")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert "mariachi.usuarios.view" in data["permissions"]


def test_perfil_informa_la_vigencia_de_la_sesion(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/autenticacion/perfil")
    assert response.status_code == 200
    assert response.json()["session_expires_in"] > 0


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
    assert "logout_url" in response.json()
