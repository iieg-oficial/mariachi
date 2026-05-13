from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 4.0


def _internal_client() -> Optional[httpx.Client]:
    settings = get_settings()
    if not settings.mapalab_backend_url or not settings.mapalab_internal_token:
        return None
    return httpx.Client(
        base_url=settings.mapalab_backend_url.rstrip("/"),
        timeout=_TIMEOUT_SECONDS,
        headers={"X-Internal-Token": settings.mapalab_internal_token},
    )


def notify_invalidate_cache(key_prefix: str) -> bool:
    """Avisa a mapalab-backend que invalide su cache local para el prefijo dado.

    Best-effort: si falla la red, log y sigue (la cache TTL expira por sí sola).
    """
    client = _internal_client()
    if client is None:
        logger.info("mapalab_embed_webhook.skip reason=no_config prefix=%s", key_prefix)
        return False
    try:
        with client as c:
            response = c.post("/embed/cache/invalidate", params={"key_prefix": key_prefix})
        if response.status_code >= 400:
            logger.warning(
                "mapalab_embed_webhook.bad_status status=%s prefix=%s body=%s",
                response.status_code,
                key_prefix,
                response.text[:200],
            )
            return False
        return True
    except httpx.RequestError as exc:
        logger.warning("mapalab_embed_webhook.error prefix=%s error=%s", key_prefix, exc)
        return False


def fetch_share_meta(share_id: str) -> Optional[dict]:
    """Lee metadatos del share desde mapalab-backend. None si 404 o si falla."""
    client = _internal_client()
    if client is None:
        return None
    try:
        with client as c:
            response = c.get(f"/shares/{share_id}")
        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            logger.warning(
                "mapalab_share_fetch.bad_status status=%s share_id=%s",
                response.status_code,
                share_id,
            )
            return None
        return response.json()
    except httpx.RequestError as exc:
        logger.warning("mapalab_share_fetch.error share_id=%s error=%s", share_id, exc)
        return None


def create_share(envelope: dict) -> Optional[dict]:
    """Crea un share en mapalab-backend con el envelope dado. Devuelve {id, kind, ...} o None."""
    client = _internal_client()
    if client is None:
        logger.warning("mapalab_share_create.skip reason=no_config")
        return None
    try:
        with client as c:
            response = c.post("/shares", json=envelope)
        if response.status_code >= 400:
            logger.warning(
                "mapalab_share_create.bad_status status=%s body=%s",
                response.status_code,
                response.text[:200],
            )
            return None
        return response.json()
    except httpx.RequestError as exc:
        logger.warning("mapalab_share_create.error error=%s", exc)
        return None


def pin_share_permanent(share_id: str) -> bool:
    """Marca un share como permanente en mapalab-backend."""
    client = _internal_client()
    if client is None:
        logger.warning("mapalab_share_pin.skip reason=no_config share_id=%s", share_id)
        return False
    try:
        with client as c:
            response = c.post(f"/shares/{share_id}/pin-permanent")
        if response.status_code >= 400:
            logger.warning(
                "mapalab_share_pin.bad_status status=%s share_id=%s body=%s",
                response.status_code,
                share_id,
                response.text[:200],
            )
            return False
        return True
    except httpx.RequestError as exc:
        logger.warning("mapalab_share_pin.error share_id=%s error=%s", share_id, exc)
        return False


def unpin_share(share_id: str) -> bool:
    """Quita el pin de un share en mapalab-backend."""
    client = _internal_client()
    if client is None:
        return False
    try:
        with client as c:
            response = c.delete(f"/shares/{share_id}/pin")
        if response.status_code >= 400 and response.status_code != 404:
            logger.warning(
                "mapalab_share_unpin.bad_status status=%s share_id=%s",
                response.status_code,
                share_id,
            )
            return False
        return True
    except httpx.RequestError as exc:
        logger.warning("mapalab_share_unpin.error share_id=%s error=%s", share_id, exc)
        return False
