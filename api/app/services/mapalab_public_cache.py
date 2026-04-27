from __future__ import annotations

import logging
import secrets
import time

from app.core.cache import redis_client, set_cache

logger = logging.getLogger(__name__)

_DEBOUNCE_WINDOW_SECONDS = 5
_TTL_DAYS = 60 * 60 * 24 * 30

_KEY_EVENTOS = 'mapalab:public_cache_version:eventos'
_KEY_HOME = 'mapalab:public_cache_version:home'
_LOCK_PREFIX = 'mapalab:debounce_lock'


def _new_token() -> str:
    return f"{int(time.time())}-{secrets.token_hex(4)}"


def _bump(redis_key: str) -> None:
    try:
        set_cache(redis_key, _new_token(), expire=_TTL_DAYS)
    except Exception as exc:
        logger.warning('No se pudo actualizar cache version %s: %s', redis_key, exc)


def get_versions() -> dict[str, str]:
    eventos = redis_client.get(_KEY_EVENTOS)
    home = redis_client.get(_KEY_HOME)
    if not eventos:
        eventos = _new_token()
        set_cache(_KEY_EVENTOS, eventos, expire=_TTL_DAYS)
    if not home:
        home = _new_token()
        set_cache(_KEY_HOME, home, expire=_TTL_DAYS)
    return {'eventos': eventos, 'home': home}


def _dedup_bump(scope: str, redis_key: str) -> None:
    lock_key = f"{_LOCK_PREFIX}:{scope}"
    try:
        acquired = redis_client.set(lock_key, '1', nx=True, ex=_DEBOUNCE_WINDOW_SECONDS)
    except Exception as exc:
        logger.warning('No se pudo obtener lock de debounce %s: %s', lock_key, exc)
        _bump(redis_key)
        return
    if acquired:
        _bump(redis_key)


def notify_eventos_changed() -> None:
    _dedup_bump('eventos', _KEY_EVENTOS)


def notify_home_changed() -> None:
    _dedup_bump('home', _KEY_HOME)
