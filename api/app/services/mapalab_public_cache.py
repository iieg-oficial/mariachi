from __future__ import annotations

import logging
import secrets
import time
from datetime import UTC, datetime

from app.core.cache import redis_client, set_cache

logger = logging.getLogger(__name__)

_TTL_SECONDS = 60 * 60 * 24 * 30

_KEY_EVENTOS = 'mapalab:public_cache_version:eventos'
_KEY_HOME = 'mapalab:public_cache_version:home'
_PAYLOAD_PREFIX = 'mapalab:public_cache:payload:v2'


def _new_token() -> str:
    return f"{int(time.time())}-{secrets.token_hex(4)}"


def _bump(redis_key: str) -> None:
    try:
        set_cache(redis_key, _new_token(), expire=_TTL_SECONDS)
    except Exception as exc:
        logger.warning('No se pudo actualizar cache version %s: %s', redis_key, exc)


def _current_version(redis_key: str) -> str:
    try:
        value = redis_client.get(redis_key)
    except Exception as exc:
        logger.warning('No se pudo leer cache version %s: %s', redis_key, exc)
        return _new_token()
    if value:
        return value
    token = _new_token()
    try:
        set_cache(redis_key, token, expire=_TTL_SECONDS)
    except Exception:
        pass
    return token


def _payload_key(scope: str, version: str) -> str:
    return f'{_PAYLOAD_PREFIX}:{scope}:{version}'


def _get_cached_payload(scope: str, redis_key: str) -> tuple[str, str | None]:
    version = _current_version(redis_key)
    try:
        payload = redis_client.get(_payload_key(scope, version))
    except Exception as exc:
        logger.warning('No se pudo leer payload %s: %s', scope, exc)
        return version, None
    return version, payload


def _store_payload(scope: str, version: str, payload_json: str) -> None:
    try:
        redis_client.setex(_payload_key(scope, version), _TTL_SECONDS, payload_json)
    except Exception as exc:
        logger.warning('No se pudo cachear payload %s: %s', scope, exc)


def get_versions() -> dict[str, str]:
    return {
        'eventos': _current_version(_KEY_EVENTOS),
        'home': _current_version(_KEY_HOME),
    }


def get_cached_eventos() -> tuple[str, str | None]:
    return _get_cached_payload('eventos', _KEY_EVENTOS)


def store_cached_eventos(version: str, payload_json: str) -> None:
    _store_payload('eventos', version, payload_json)


def schedule_eventos_expiry(when: datetime) -> None:
    try:
        instante = when if when.tzinfo else when.replace(tzinfo=UTC)
        redis_client.expireat(_KEY_EVENTOS, int(instante.timestamp()) + 1)
    except Exception as exc:
        logger.warning('No se pudo programar el vencimiento de %s: %s', _KEY_EVENTOS, exc)


def get_cached_home() -> tuple[str, str | None]:
    return _get_cached_payload('home', _KEY_HOME)


def store_cached_home(version: str, payload_json: str) -> None:
    _store_payload('home', version, payload_json)


def notify_eventos_changed() -> None:
    _bump(_KEY_EVENTOS)


def notify_home_changed() -> None:
    _bump(_KEY_HOME)
