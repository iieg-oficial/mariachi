import base64
import hashlib
import secrets
import time
from datetime import timedelta
from typing import Any

import httpx
from jose import JWTError, jwt

from app.core.settings import get_settings
from app.core.time import utcnow
from minerva_sdk.config import settings as minerva_settings
from minerva_sdk.fastapi import _get_jwks

settings = get_settings()

_DISCOVERY_TTL = 3600
_discovery_cache: dict[str, Any] = {"exp": 0.0, "doc": None}


async def _discover() -> dict[str, Any]:
    now = time.time()
    doc = _discovery_cache["doc"]
    if doc is not None and float(_discovery_cache["exp"]) > now:
        return doc

    target = settings.minerva_issuer_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{target}/.well-known/openid-configuration")
            resp.raise_for_status()
        doc = resp.json()
    except httpx.HTTPError:
        doc = {
            "authorization_endpoint": f"{target}/auth/authorize",
            "token_endpoint": f"{target}/auth/token",
            "revocation_endpoint": f"{target}/auth/revoke",
        }

    issuer_in_doc = (doc.get("issuer") or "").rstrip("/")
    if issuer_in_doc and issuer_in_doc != target:
        for key, value in list(doc.items()):
            if isinstance(value, str) and value.startswith(issuer_in_doc):
                doc[key] = target + value[len(issuer_in_doc):]

    _discovery_cache["doc"] = doc
    _discovery_cache["exp"] = now + _DISCOVERY_TTL
    return doc


def generate_state() -> str:
    return secrets.token_urlsafe(32)


def generate_nonce() -> str:
    return secrets.token_urlsafe(16)


def generate_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


async def build_authorize_url(
    state: str, code_challenge: str, nonce: str, prompt: str = "", redirect_uri: str = ""
) -> str:
    doc = await _discover()
    endpoint = doc["authorization_endpoint"]
    issuer = settings.minerva_issuer_url.rstrip("/")
    if settings.minerva_public_base != issuer:
        endpoint = endpoint.replace(issuer, settings.minerva_public_base, 1)
    query = httpx.QueryParams(
        {
            "response_type": "code",
            "client_id": settings.minerva_client_id,
            "redirect_uri": redirect_uri or settings.minerva_redirect_uri,
            "scope": settings.minerva_scopes,
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            # OIDC Core 3.1.2.1: obliga a minerva a re-autenticar aunque su sesion
            # siga viva. Sin esto, volver de un logout entra solo con la cuenta
            # anterior, porque el logout del panel es "suave" a proposito.
            **({"prompt": prompt} if prompt else {}),
        }
    )
    return f"{endpoint}?{query}"


async def exchange_code(code: str, code_verifier: str, redirect_uri: str = "") -> dict[str, Any]:
    doc = await _discover()
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri or settings.minerva_redirect_uri,
        "client_id": settings.minerva_client_id,
        "client_secret": settings.minerva_client_secret,
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(doc["token_endpoint"], data=data)
        resp.raise_for_status()
    return resp.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    doc = await _discover()
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.minerva_client_id,
        "client_secret": settings.minerva_client_secret,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(doc["token_endpoint"], data=data)
        resp.raise_for_status()
    return resp.json()


async def revoke_refresh_token(refresh_token: str) -> None:
    doc = await _discover()
    endpoint = doc.get("revocation_endpoint")
    if not endpoint:
        return
    data = {
        "token": refresh_token,
        "client_id": settings.minerva_client_id,
        "client_secret": settings.minerva_client_secret,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(endpoint, data=data)
    except httpx.HTTPError:
        pass


class IdTokenInvalidoError(Exception):
    pass


async def validar_id_token(id_token: str | None, nonce: str) -> dict[str, Any]:
    if not id_token or not nonce:
        raise IdTokenInvalidoError("sin id_token o sin nonce en la transaccion")
    try:
        header = jwt.get_unverified_header(id_token)
        jwks = await _get_jwks(kid=header.get("kid"))
        claims = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            audience=settings.minerva_client_id,
            options={"verify_at_hash": False},
        )
    except (JWTError, httpx.HTTPError) as exc:
        raise IdTokenInvalidoError(str(exc)) from exc
    esperado = (minerva_settings.expected_issuer or minerva_settings.issuer_url).rstrip("/")
    if str(claims.get("iss", "")).rstrip("/") != esperado:
        raise IdTokenInvalidoError("iss inesperado")
    if not secrets.compare_digest(str(claims.get("nonce", "")), nonce):
        raise IdTokenInvalidoError("nonce no coincide")
    return claims


def access_expiry(expires_in: int | None) -> float:
    seconds = expires_in if isinstance(expires_in, int) and expires_in > 0 else 900
    return (utcnow() + timedelta(seconds=seconds)).timestamp()


def logout_url(redirect_uri: str) -> str:
    """URL del panel de minerva que cierra la cuenta activa.

    El panel hace un `soft_logout`: conserva las cuentas del navegador y no revoca
    el jti, asi que por si sola NO basta para cambiar de cuenta. Quien vuelva a
    entrar debe pasar por `/login?forzar=1`, que agrega `prompt=login`.
    """
    query = httpx.QueryParams({"redirect_uri": redirect_uri})
    return f"{settings.minerva_logout_base}/logout?{query}"
