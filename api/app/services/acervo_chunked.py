import json
import logging
import uuid

from redis import Redis

from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SESSION_TTL = 7200

CHUNK_SIZE = 50 * 1024 * 1024


def _redis():
    return Redis.from_url(settings.redis_url, decode_responses=True)


def create_session(data: dict) -> str:
    session_id = str(uuid.uuid4())
    data['chunk_size'] = CHUNK_SIZE
    data['parts'] = data.get('parts', [])
    r = _redis()
    r.setex(f"acervo:chunked:{session_id}", SESSION_TTL, json.dumps(data))
    logger.info("action=acervo.chunked.init session_id=%s bucket=%s name=%s",
                session_id, data.get('bucket_name'), data.get('original_name'))
    return session_id


def get_session(session_id: str) -> dict | None:
    r = _redis()
    raw = r.get(f"acervo:chunked:{session_id}")
    return json.loads(raw) if raw else None


def update_session(session_id: str, data: dict):
    r = _redis()
    r.setex(f"acervo:chunked:{session_id}", SESSION_TTL, json.dumps(data))


def delete_session(session_id: str):
    r = _redis()
    r.delete(f"acervo:chunked:{session_id}")
