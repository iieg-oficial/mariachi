from __future__ import annotations

import logging
import threading
import time

import httpx

from app.api.metrics import COUNTER_TREE_NOTIFY, incr
from app.core.settings import get_settings


logger = logging.getLogger(__name__)

_DEBOUNCE_WINDOW_SECONDS = 5.0
_lock = threading.Lock()
_last_call_at = 0.0
_pending_timer: threading.Timer | None = None


def _do_notify() -> None:
    global _pending_timer, _last_call_at
    with _lock:
        _pending_timer = None
        _last_call_at = time.monotonic()

    settings = get_settings()
    if not settings.mapalab_backend_url:
        return

    incr(COUNTER_TREE_NOTIFY)
    url = settings.mapalab_backend_url.rstrip('/') + '/layers/refresh-cache'
    try:
        with httpx.Client(timeout=5.0) as c:
            r = c.post(url)
            r.raise_for_status()
    except Exception as exc:
        logger.warning('mapalab refresh-cache fallo (%s): %s', url, exc)


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
