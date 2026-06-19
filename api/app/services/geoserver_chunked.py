import json
import logging
import uuid

from redis import Redis

from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SESSION_TTL = 7200

CHUNK_SIZE = 25 * 1024 * 1024
MAX_TOTAL_BYTES = 200 * 1024 * 1024

_PREFIX = "geoserver:chunked"


def _redis_text() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def _redis_bytes() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=False)


def create_session(data: dict) -> str:
    session_id = str(uuid.uuid4())
    r = _redis_text()
    r.setex(f"{_PREFIX}:{session_id}", SESSION_TTL, json.dumps(data))
    logger.info(
        "action=geoserver.chunked.init session_id=%s name=%s workspace=%s",
        session_id, data.get('name'), data.get('workspace'),
    )
    return session_id


def get_session(session_id: str) -> dict | None:
    r = _redis_text()
    raw = r.get(f"{_PREFIX}:{session_id}")
    return json.loads(raw) if raw else None


def store_part(session_id: str, part_number: int, data: bytes) -> None:
    r = _redis_bytes()
    r.setex(f"{_PREFIX}:{session_id}:part:{part_number}", SESSION_TTL, data)


def missing_parts(session_id: str, total_chunks: int) -> list[int]:
    r = _redis_bytes()
    return [
        n for n in range(1, total_chunks + 1)
        if not r.exists(f"{_PREFIX}:{session_id}:part:{n}")
    ]


def iter_parts(session_id: str, total_chunks: int):
    r = _redis_bytes()
    for n in range(1, total_chunks + 1):
        data = r.get(f"{_PREFIX}:{session_id}:part:{n}")
        if data is None:
            raise KeyError(n)
        yield data


def delete_session(session_id: str, total_chunks: int = 0) -> None:
    r = _redis_text()
    keys = [f"{_PREFIX}:{session_id}"]
    keys.extend(f"{_PREFIX}:{session_id}:part:{n}" for n in range(1, total_chunks + 1))
    r.delete(*keys)
