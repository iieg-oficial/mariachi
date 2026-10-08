import asyncio
import base64
import json
import time
from urllib.parse import parse_qs, urlparse, urlsplit

import pytest
from fastapi import HTTPException

from app.api.routes.auth import TX_COOKIE_NAME, resolve_user
from app.core.settings import get_settings
from app.models.user import Usuario
from tests.conftest import ADMIN_PREFIX

CALLBACK_PATH = urlsplit(get_settings().minerva_redirect_uri).path


def test_healthcheck(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.fixture
def origenes(monkeypatch):
    from app.api.routes import auth

    monkeypatch.setattr(
        auth.settings, "cors_origins", ["https://testserver", "https://10.0.0.7:8443"]
    )


def test_login_redirige_a_minerva_con_pkce(client, origenes):
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/login", follow_redirects=False
    )
    assert response.status_code == 302

    query = parse_qs(urlparse(response.headers["location"]).query)
    assert query["response_type"] == ["code"]
    assert query["code_challenge_method"] == ["S256"]
    assert query["code_challenge"]
    assert query["state"]
    assert query["redirect_uri"] == [f"https://testserver{CALLBACK_PATH}"]

    assert TX_COOKIE_NAME in {c.name for c in response.cookies.jar}
    assert "code_verifier" not in query


def test_login_conserva_el_host_por_el_que_se_entro(client, origenes):
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/login",
        headers={"host": "10.0.0.7:8443"},
        follow_redirects=False,
    )
    assert response.status_code == 302

    query = parse_qs(urlparse(response.headers["location"]).query)
    assert query["redirect_uri"] == [f"https://10.0.0.7:8443{CALLBACK_PATH}"]


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


def test_resolve_user_no_sobrescribe_un_sub_distinto(db_session):
    previo = Usuario(
        username="ana",
        email="ana@iieg.gob.mx",
        name="Ana",
        hashed_password="!minerva",
        role="editora",
        minerva_sub="sub-original",
    )
    db_session.add(previo)
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        resolve_user(db_session, {"sub": "sub-intruso", "email": "ANA@iieg.gob.mx"})
    assert exc.value.status_code == 409
    db_session.refresh(previo)
    assert previo.minerva_sub == "sub-original"


def test_login_con_host_no_permitido_usa_el_origen_configurado(client, origenes):
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/login",
        headers={"host": "evil.example"},
        follow_redirects=False,
    )
    query = parse_qs(urlparse(response.headers["location"]).query)
    origen = urlsplit(get_settings().minerva_post_login_url)
    assert query["redirect_uri"] == [f"{origen.scheme}://{origen.netloc}{CALLBACK_PATH}"]


def test_callback_rechaza_una_cookie_de_transaccion_sin_firma(client):
    datos = {"state": "s1", "verifier": "v", "nonce": "n", "public_base": "https://evil.example"}
    crudo = base64.urlsafe_b64encode(json.dumps(datos).encode()).decode()
    client.cookies.set(TX_COOKIE_NAME, crudo, path=f"{ADMIN_PREFIX}/autenticacion")
    response = client.get(
        f"{ADMIN_PREFIX}/autenticacion/callback",
        params={"code": "abc", "state": "s1"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert response.headers["location"].endswith("/login?auth_error=invalid_state")
    assert "evil.example" not in response.headers["location"]


def _firmar_id_token(claims: dict) -> tuple[str, dict]:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from jose import jwk, jwt

    llave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    privada = llave.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    publica = llave.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    publica_jwk = {**jwk.construct(publica, "RS256").to_dict(), "kid": "k1"}
    token = jwt.encode(claims, privada, algorithm="RS256", headers={"kid": "k1"})
    return token, {"keys": [publica_jwk]}


@pytest.mark.parametrize(("nonce_token", "valido"), [("n-1", True), ("otro", False)])
def test_validar_id_token_compara_el_nonce(monkeypatch, nonce_token, valido):
    from app.core import oidc

    ajustes = get_settings()
    claims = {
        "sub": "u1",
        "aud": ajustes.minerva_client_id,
        "iss": oidc.minerva_settings.expected_issuer or oidc.minerva_settings.issuer_url,
        "exp": int(time.time()) + 60,
        "iat": int(time.time()),
        "nonce": nonce_token,
    }
    token, jwks = _firmar_id_token(claims)

    async def jwks_falso(kid=None):
        return jwks

    monkeypatch.setattr(oidc, "_get_jwks", jwks_falso)
    if valido:
        assert asyncio.run(oidc.validar_id_token(token, "n-1"))["sub"] == "u1"
    else:
        with pytest.raises(oidc.IdTokenInvalidoError):
            asyncio.run(oidc.validar_id_token(token, "n-1"))


def test_validar_id_token_exige_token(monkeypatch):
    from app.core import oidc

    with pytest.raises(oidc.IdTokenInvalidoError):
        asyncio.run(oidc.validar_id_token(None, "n-1"))
