from __future__ import annotations

import logging
import secrets
import threading
import time

from app.core.cache import get_cache, set_cache

logger = logging.getLogger(__name__)

_DEBOUNCE_WINDOW_SECONDS = 5.0
_KEY_EVENTOS = 'mapalab:public_cache_version:eventos'
_KEY_HOME = 'mapalab:public_cache_version:home'
_TTL_DAYS = 60 * 60 * 24 * 30

_lock = threading.Lock()
_pending_eventos: threading.Timer | None = None
_pending_home: threading.Timer | None = None


def _new_token() -> str:
    return f"{int(time.time())}-{secrets.token_hex(4)}"


def _bump(redis_key: str) -> None:
    try:
        set_cache(redis_key, _new_token(), expire=_TTL_DAYS)
    except Exception as exc:
        logger.warning('No se pudo actualizar cache version %s: %s', redis_key, exc)


def get_versions() -> dict[str, str]:
    eventos = get_cache(_KEY_EVENTOS)
    home = get_cache(_KEY_HOME)
    if not eventos:
        eventos = _new_token()
        set_cache(_KEY_EVENTOS, eventos, expire=_TTL_DAYS)
    if not home:
        home = _new_token()
        set_cache(_KEY_HOME, home, expire=_TTL_DAYS)
    return {'eventos': eventos, 'home': home}


def _schedule(scope: str) -> None:
    global _pending_eventos, _pending_home
    redis_key = _KEY_EVENTOS if scope == 'eventos' else _KEY_HOME

    def fire() -> None:
        global _pending_eventos, _pending_home
        with _lock:
            if scope == 'eventos':
                _pending_eventos = None
            else:
                _pending_home = None
        _bump(redis_key)

    with _lock:
        existing = _pending_eventos if scope == 'eventos' else _pending_home
        if existing is not None:
            return
        timer = threading.Timer(_DEBOUNCE_WINDOW_SECONDS, fire)
        timer.daemon = True
        if scope == 'eventos':
            _pending_eventos = timer
        else:
            _pending_home = timer
        timer.start()


def notify_eventos_changed() -> None:
    _schedule('eventos')


def notify_home_changed() -> None:
    _schedule('home')
