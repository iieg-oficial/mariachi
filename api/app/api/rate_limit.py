from __future__ import annotations

import logging
import time
import uuid

from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_user
from app.api.metrics import COUNTER_RATE_LIMIT_HITS, incr
from app.core.cache import redis_client
from app.models.user import Usuario

logger = logging.getLogger(__name__)

_KEY_PREFIX = 'rate_limit'


def rate_limit(max_requests: int, window_seconds: float):
    async def _limiter(current_user: Usuario = Depends(get_current_user)):
        key = f'{_KEY_PREFIX}:user:{current_user.id}'
        now = time.time()
        window_ms = int(window_seconds * 1000)
        cutoff = now - window_seconds

        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, '-inf', cutoff)
        pipe.zadd(key, {f'{now}:{uuid.uuid4().hex}': now})
        pipe.zcard(key)
        pipe.pexpire(key, window_ms + 1000)
        try:
            _, _, count, _ = pipe.execute()
        except Exception as exc:
            logger.warning('rate_limit redis error user=%s: %s', current_user.username, exc)
            return current_user

        if count > max_requests:
            try:
                oldest = redis_client.zrange(key, 0, 0, withscores=True)
                retry = int(window_seconds - (now - oldest[0][1])) + 1 if oldest else int(window_seconds)
            except Exception:
                retry = int(window_seconds)
            incr(COUNTER_RATE_LIMIT_HITS)
            logger.warning('rate_limit hit: user=%s count=%s', current_user.username, count)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f'Demasiadas solicitudes. Intenta de nuevo en {retry}s.',
                headers={'Retry-After': str(retry)},
            )
        return current_user

    return _limiter
