from __future__ import annotations

import logging
import time
import uuid

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.api.metrics import SENAL_RATE_LIMIT, registrar
from app.core.cache import redis_client
from app.models.user import Usuario
from app.services.incidentes import huella_ip, plantilla_de_ruta, registrar_incidente

logger = logging.getLogger(__name__)

_KEY_PREFIX = 'rate_limit'

TOPES: dict[str, dict[str, int | str]] = {}


def _anotar_tope(tipo: str, scope: str, max_requests: int, window_seconds: float) -> None:
    TOPES[f'{tipo}:{scope}'] = {
        'tipo': tipo, 'scope': scope, 'limite': max_requests, 'ventana_s': int(window_seconds),
    }


def _client_ip(request: Request) -> str:
    real_ip = request.headers.get('x-real-ip')
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else 'unknown'


def _consumir(key: str, max_requests: int, window_seconds: float) -> tuple[int, int | None]:
    now = time.time()
    member = f'{now}:{uuid.uuid4().hex}'
    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(key, '-inf', now - window_seconds)
    pipe.zadd(key, {member: now})
    pipe.zcard(key)
    pipe.pexpire(key, int(window_seconds * 1000) + 1000)
    _, _, count, _ = pipe.execute()
    if count <= max_requests:
        return count, None
    try:
        redis_client.zrem(key, member)
        oldest = redis_client.zrange(key, 0, 0, withscores=True)
        retry = int(window_seconds - (now - oldest[0][1])) + 1 if oldest else int(window_seconds)
    except Exception:
        retry = int(window_seconds)
    return count, max(retry, 1)


def _rechazar(retry: int) -> HTTPException:
    registrar(SENAL_RATE_LIMIT)
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f'Demasiadas solicitudes. Intenta de nuevo en {retry}s.',
        headers={'Retry-After': str(retry)},
    )


def rate_limit(max_requests: int, window_seconds: float, scope: str | None = None):
    _anotar_tope('usuario', scope or 'general', max_requests, window_seconds)

    async def _limiter(request: Request, current_user: Usuario = Depends(get_current_user)):
        scope_suffix = f':{scope}' if scope else ''
        key = f'{_KEY_PREFIX}:user:{current_user.id}{scope_suffix}'
        try:
            count, retry = _consumir(key, max_requests, window_seconds)
        except Exception as exc:
            logger.warning('rate_limit redis error user=%s: %s', current_user.username, exc)
            return current_user
        if retry is None:
            return current_user
        ruta = plantilla_de_ruta(request)
        logger.warning(
            'rate_limit hit: user=%s scope=%s %s %s count=%s',
            current_user.username, scope or 'general', request.method, ruta, count,
        )
        registrar_incidente(
            tipo='usuario', scope=scope or 'general', actor=current_user.username,
            metodo=request.method, ruta=ruta, golpes=count,
            limite=max_requests, ventana_s=int(window_seconds),
        )
        raise _rechazar(retry)

    return _limiter


def rate_limit_ip(max_requests: int, window_seconds: float, scope: str = 'public'):
    _anotar_tope('ip', scope, max_requests, window_seconds)

    async def _limiter(request: Request):
        ip = _client_ip(request)
        key = f'{_KEY_PREFIX}:ip:{scope}:{ip}'
        try:
            count, retry = _consumir(key, max_requests, window_seconds)
        except Exception as exc:
            logger.warning('rate_limit_ip redis error ip=%s scope=%s: %s', huella_ip(ip), scope, exc)
            return ip
        if retry is None:
            return ip
        ruta = plantilla_de_ruta(request)
        huella = huella_ip(ip)
        logger.warning(
            'rate_limit_ip hit: ip=%s scope=%s %s %s count=%s', huella, scope, request.method, ruta, count,
        )
        registrar_incidente(
            tipo='ip', scope=scope, actor=huella,
            metodo=request.method, ruta=ruta, golpes=count,
            limite=max_requests, ventana_s=int(window_seconds),
        )
        raise _rechazar(retry)

    return _limiter
