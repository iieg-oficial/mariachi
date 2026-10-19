import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_TIMEOUT = 10
_ESTADOS_PROPAGADOS = {400, 403, 404, 409, 422}


def _headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "X-Client-Id": settings.minerva_client_id,
        "X-Client-Secret": settings.minerva_client_secret,
    }


def _url(path: str) -> str:
    return f"{settings.minerva_issuer_url.rstrip('/')}/delegated{path}"


def _detalle(resp: httpx.Response) -> str:
    try:
        detail = resp.json().get("detail")
    except ValueError:
        detail = None
    return detail if isinstance(detail, str) else "minerva rechazó la operación"


async def _llamar(
    method: str,
    path: str,
    access_token: str,
    json: dict | None = None,
    params: dict | None = None,
) -> Any:
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.request(
                method, _url(path), headers=_headers(access_token), json=json, params=params
            )
    except httpx.HTTPError as exc:
        logger.warning("minerva delegated %s %s sin respuesta: %s", method, path, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo contactar a minerva",
        ) from exc
    if resp.is_success:
        return resp.json() if resp.content else None
    logger.info("minerva delegated %s %s -> %s", method, path, resp.status_code)
    if resp.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="minerva no aceptó las credenciales de mariachi",
        )
    if resp.status_code in _ESTADOS_PROPAGADOS:
        raise HTTPException(status_code=resp.status_code, detail=_detalle(resp))
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="minerva respondió con un error",
    )


async def listar_roles(access_token: str) -> list[dict]:
    return await _llamar("GET", "/roles", access_token)


async def listar_personas(access_token: str) -> list[dict]:
    return await _llamar("GET", "/users", access_token)


async def buscar_por_correo(access_token: str, email: str) -> dict | None:
    encontrados = await _llamar("GET", "/users", access_token, params={"email": email})
    return encontrados[0] if encontrados else None


async def dar_de_alta(
    access_token: str, email: str, nombre: str, role_ids: list[str]
) -> dict:
    return await _llamar(
        "POST",
        "/users",
        access_token,
        json={"email": email, "full_name": nombre, "role_ids": role_ids},
    )


async def fijar_roles(access_token: str, persona_id: str, role_ids: list[str]) -> dict:
    return await _llamar(
        "PUT", f"/users/{persona_id}/roles", access_token, json={"role_ids": role_ids}
    )


async def emitir_enlace(access_token: str, persona_id: str) -> dict:
    return await _llamar("POST", f"/users/{persona_id}/credential-link", access_token)


async def retirar_acceso(access_token: str, persona_id: str) -> None:
    try:
        await fijar_roles(access_token, persona_id, [])
    except HTTPException as exc:
        if exc.status_code != status.HTTP_404_NOT_FOUND:
            raise
