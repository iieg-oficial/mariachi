from __future__ import annotations

import logging
import threading
import time

import httpx

from app.api.metrics import COUNTER_TREE_NOTIFY_FAILED, incr
from app.core.settings import get_settings

logger = logging.getLogger(__name__)

_DEBOUNCE_WINDOW_SECONDS = 5.0
_MAX_ATTEMPTS = 3
_BACKOFF_BASE_SECONDS = 0.5
_lock = threading.Lock()
_last_call_at = 0.0
_pending_timer: threading.Timer | None = None


def _post_con_reintentos(path: str, stale_msg: str, contar: bool = True) -> None:
    settings = get_settings()
    if not settings.mapalab_backend_url:
        return

    url = settings.mapalab_backend_url.rstrip('/') + path
    headers = {}
    if settings.mapalab_internal_token:
        headers['X-Internal-Token'] = settings.mapalab_internal_token

    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            with httpx.Client(timeout=5.0) as c:
                r = c.post(url, headers=headers)
                r.raise_for_status()
            return
        except Exception as exc:
            if attempt < _MAX_ATTEMPTS:
                delay = _BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
                logger.warning(
                    'mapalab %s intento %d/%d fallo (%s): %s; reintenta en %.1fs',
                    path, attempt, _MAX_ATTEMPTS, url, exc, delay,
                )
                time.sleep(delay)
            else:
                if contar:
                    incr(COUNTER_TREE_NOTIFY_FAILED)
                logger.error(
                    'mapalab %s fallo tras %d intentos (%s): %s - %s',
                    path, _MAX_ATTEMPTS, url, exc, stale_msg,
                )


def _do_notify() -> None:
    global _pending_timer, _last_call_at
    with _lock:
        _pending_timer = None
        _last_call_at = time.monotonic()

    _post_con_reintentos(
        '/layers/refresh-cache',
        'tree queda stale hasta cron 04:00 UTC',
    )


def notify_catalogo_changed() -> None:
    threading.Thread(
        target=_post_con_reintentos,
        args=('/catalogo/invalidate-cache', 'el catalogo queda stale hasta 5 min (TTL)'),
        kwargs={'contar': False},
        daemon=True,
    ).start()


def notify_tree_changed() -> None:
    global _pending_timer
    with _lock:
        if _pending_timer is not None:
            return
        elapsed = time.monotonic() - _last_call_at
        delay = max(0.1, _DEBOUNCE_WINDOW_SECONDS - elapsed)
        _pending_timer = threading.Timer(delay, _do_notify)
        _pending_timer.daemon = True
        _pending_timer.start()
