import json
import logging
import secrets

from app.core.cache import redis_client
from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_SESS_KEY = "minerva:sess:{}"


class MinervaSessionError(Exception):
    pass


def new_sid() -> str:
    return secrets.token_urlsafe(32)


def _ttl_seconds() -> int:
    return settings.refresh_cookie_max_age


def store(sid: str, access_token: str, refresh_token: str | None, expires_at: float) -> None:
    payload = json.dumps(
        {"access_token": access_token, "refresh_token": refresh_token, "expires_at": expires_at}
    )
    redis_client.setex(_SESS_KEY.format(sid), _ttl_seconds(), payload)


def load(sid: str) -> dict:
    try:
        raw = redis_client.get(_SESS_KEY.format(sid))
    except Exception as exc:
        logger.warning("minerva session load error sid=%s: %s", sid, exc)
        raise MinervaSessionError("no se pudo leer la sesión de minerva") from exc
    if raw is None:
        raise MinervaSessionError("sesión de minerva expirada o inexistente")
    return json.loads(raw)


def drop(sid: str) -> None:
    try:
        redis_client.delete(_SESS_KEY.format(sid))
    except Exception as exc:
        logger.warning("minerva session drop error sid=%s: %s", sid, exc)
