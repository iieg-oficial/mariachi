import logging
import secrets
import time

from app.core.cache import redis_client, set_cache

logger = logging.getLogger(__name__)

_TTL_SEGUNDOS = 60 * 60 * 24 * 30
_LLAVE_VERSION = "sieej_documentacion:version"
_PREFIJO_PAYLOAD = "sieej_documentacion:payload"


def _nuevo_token() -> str:
    return f"{int(time.time())}-{secrets.token_hex(4)}"


def version_actual() -> str:
    try:
        valor = redis_client.get(_LLAVE_VERSION)
    except Exception as exc:
        logger.warning("No se pudo leer la versión de caché de documentación: %s", exc)
        return _nuevo_token()
    if valor:
        return valor
    token = _nuevo_token()
    try:
        set_cache(_LLAVE_VERSION, token, expire=_TTL_SEGUNDOS)
    except Exception:
        pass
    return token


def invalidar() -> None:
    try:
        set_cache(_LLAVE_VERSION, _nuevo_token(), expire=_TTL_SEGUNDOS)
    except Exception as exc:
        logger.warning("No se pudo invalidar la caché de documentación: %s", exc)


def leer(alcance: str) -> tuple[str, str | None]:
    version = version_actual()
    try:
        return version, redis_client.get(f"{_PREFIJO_PAYLOAD}:{alcance}:{version}")
    except Exception as exc:
        logger.warning("No se pudo leer la caché %s: %s", alcance, exc)
        return version, None


def guardar(alcance: str, version: str, payload: str) -> None:
    try:
        redis_client.setex(f"{_PREFIJO_PAYLOAD}:{alcance}:{version}", _TTL_SEGUNDOS, payload)
    except Exception as exc:
        logger.warning("No se pudo cachear %s: %s", alcance, exc)
