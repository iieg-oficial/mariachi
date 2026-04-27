from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException, status

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 8.0


def _backend_url() -> str:
    settings = get_settings()
    if not settings.mapalab_backend_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='MAPALAB_BACKEND_URL no configurado',
        )
    return settings.mapalab_backend_url.rstrip('/')


def _internal_token() -> str:
    settings = get_settings()
    if not settings.mapalab_internal_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='MAPALAB_INTERNAL_TOKEN no configurado en mariachi-api',
        )
    return settings.mapalab_internal_token


def create_share(envelope: dict) -> dict:
    url = f"{_backend_url()}/shares"
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as c:
            r = c.post(url, json=envelope)
            if r.status_code >= 400:
                raise HTTPException(status_code=r.status_code, detail=f"mapalab /shares fallo: {r.text}")
            return r.json()
    except httpx.RequestError as exc:
        logger.error('mapalab /shares request error: %s', exc)
        raise HTTPException(status_code=502, detail='mapalab-backend inalcanzable') from exc


def pin_permanent(share_id: str) -> dict:
    url = f"{_backend_url()}/shares/{share_id}/pin-permanent"
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as c:
            r = c.post(url, headers={'X-Internal-Token': _internal_token()})
            if r.status_code >= 400:
                raise HTTPException(status_code=r.status_code, detail=f"mapalab pin-permanent fallo: {r.text}")
            return r.json()
    except httpx.RequestError as exc:
        logger.error('mapalab pin-permanent request error: %s', exc)
        raise HTTPException(status_code=502, detail='mapalab-backend inalcanzable') from exc


def unpin_permanent(share_id: str) -> None:
    url = f"{_backend_url()}/shares/{share_id}/pin"
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as c:
            r = c.delete(url, headers={'X-Internal-Token': _internal_token()})
            if r.status_code == 404:
                return
            if r.status_code >= 400:
                raise HTTPException(status_code=r.status_code, detail=f"mapalab unpin fallo: {r.text}")
    except httpx.RequestError as exc:
        logger.error('mapalab unpin request error: %s', exc)
        raise HTTPException(status_code=502, detail='mapalab-backend inalcanzable') from exc
