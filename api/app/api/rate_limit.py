from __future__ import annotations

import logging
import time

from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_user
from app.api.metrics import COUNTER_RATE_LIMIT_HITS, incr
from app.models.user import Usuario

logger = logging.getLogger(__name__)

_buckets: dict[str, list[float]] = {}
_MAX_BUCKET_SIZE = 10000


def _cleanup_old_entries(max_age_seconds: float = 60.0) -> None:
    if len(_buckets) < _MAX_BUCKET_SIZE:
        return
    now = time.monotonic()
    for key in list(_buckets.keys()):
        _buckets[key] = [t for t in _buckets[key] if now - t < max_age_seconds]
        if not _buckets[key]:
            del _buckets[key]


def rate_limit(max_requests: int, window_seconds: float):
    async def _limiter(current_user: Usuario = Depends(get_current_user)):
        _cleanup_old_entries()
        key = f'user:{current_user.id}'
        now = time.monotonic()
        bucket = _buckets.setdefault(key, [])
        bucket[:] = [t for t in bucket if now - t < window_seconds]
        if len(bucket) >= max_requests:
            retry = int(window_seconds - (now - bucket[0])) + 1
            incr(COUNTER_RATE_LIMIT_HITS)
            logger.warning('rate_limit hit: user=%s', current_user.username)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f'Demasiadas solicitudes. Intenta de nuevo en {retry}s.',
                headers={'Retry-After': str(retry)},
            )
        bucket.append(now)
        return current_user

    return _limiter
