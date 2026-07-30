from __future__ import annotations

import logging
from typing import Any

from app.core.cache import redis_client

logger = logging.getLogger(__name__)

VENTANA_SEGUNDOS = 900
UMBRAL_ABUSO = 30
UMBRAL_NOTIFY_FALLIDO = 3

SENAL_LOGIN_FALLIDO = 'login_failed'
SENAL_LOGIN_BLOQUEADO = 'login_locked'
SENAL_RATE_LIMIT = 'rate_limit_hits'
SENAL_NOTIFY_FALLIDO = 'tree_notify_failed'

SENALES_ABUSO = (SENAL_LOGIN_FALLIDO, SENAL_LOGIN_BLOQUEADO, SENAL_RATE_LIMIT)


def _clave(senal: str) -> str:
    return f'mariachi:senal:{senal}'


def registrar(senal: str, cantidad: int = 1) -> None:
    try:
        clave = _clave(senal)
        pipe = redis_client.pipeline()
        pipe.incr(clave, cantidad)
        pipe.expire(clave, VENTANA_SEGUNDOS, nx=True)
        pipe.execute()
    except Exception as exc:
        logger.warning('senal %s no registrada: %s', senal, exc)


def _leer(senal: str) -> int:
    try:
        return int(redis_client.get(_clave(senal)) or 0)
    except Exception:
        return 0


def check_abuso() -> dict[str, Any]:
    valores = {senal: _leer(senal) for senal in SENALES_ABUSO}
    total = sum(valores.values())
    return {
        'status': 'degraded' if total >= UMBRAL_ABUSO else 'ok',
        'ventana_minutos': VENTANA_SEGUNDOS // 60,
        **valores,
    }


def check_mapalab_notify() -> dict[str, Any]:
    fallos = _leer(SENAL_NOTIFY_FALLIDO)
    return {
        'status': 'degraded' if fallos >= UMBRAL_NOTIFY_FALLIDO else 'ok',
        'ventana_minutos': VENTANA_SEGUNDOS // 60,
        'fallos': fallos,
    }
