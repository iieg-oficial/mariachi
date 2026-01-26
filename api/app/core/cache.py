import json
from typing import Any

import redis

from .settings import get_settings

settings = get_settings()

redis_client = redis.from_url(settings.redis_url, decode_responses=True)


def get_cache(key: str) -> Any | None:
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception:
        return None


def set_cache(key: str, value: Any, expire: int = 300) -> bool:
    try:
        redis_client.setex(key, expire, json.dumps(value))
        return True
    except Exception:
        return False


def delete_cache(key: str) -> bool:
    try:
        redis_client.delete(key)
        return True
    except Exception:
        return False


def clear_pattern(pattern: str) -> bool:
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
        return True
    except Exception:
        return False
