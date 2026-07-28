import json
import logging
import shutil
import time
import uuid
from pathlib import Path

from redis import Redis

from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SESSION_TTL = 7200

CHUNK_SIZE = 25 * 1024 * 1024
READ_BLOCK_SIZE = 8 * 1024 * 1024
STALE_DIR_SECONDS = SESSION_TTL * 2

_PREFIX = "geoserver:chunked"


def max_total_bytes() -> int:
    return max(0, settings.geoserver_upload_max_bytes)


def _redis_text() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def _staging_root() -> Path:
    root = Path(settings.geoserver_upload_staging_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _session_dir(session_id: str) -> Path:
    return _staging_root() / session_id


def _part_path(session_id: str, part_number: int) -> Path:
    return _session_dir(session_id) / f"{part_number}.part"


def create_session(data: dict) -> str:
    session_id = str(uuid.uuid4())
    r = _redis_text()
    r.setex(f"{_PREFIX}:{session_id}", SESSION_TTL, json.dumps(data))
    _session_dir(session_id).mkdir(parents=True, exist_ok=True)
    cleanup_stale_dirs()
    logger.info(
        "action=geoserver.chunked.init session_id=%s name=%s workspace=%s total_size=%s",
        session_id, data.get('name'), data.get('workspace'), data.get('total_size'),
    )
    return session_id


def get_session(session_id: str) -> dict | None:
    r = _redis_text()
    raw = r.get(f"{_PREFIX}:{session_id}")
    return json.loads(raw) if raw else None


def touch_session(session_id: str) -> None:
    _redis_text().expire(f"{_PREFIX}:{session_id}", SESSION_TTL)


def store_part(session_id: str, part_number: int, data: bytes) -> None:
    path = _part_path(session_id, part_number)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.part.tmp')
    tmp.write_bytes(data)
    tmp.replace(path)


def stored_bytes(session_id: str) -> int:
    directory = _session_dir(session_id)
    if not directory.is_dir():
        return 0
    return sum(p.stat().st_size for p in directory.glob('*.part'))


def missing_parts(session_id: str, total_chunks: int) -> list[int]:
    return [
        n for n in range(1, total_chunks + 1)
        if not _part_path(session_id, n).is_file()
    ]


def iter_parts(session_id: str, total_chunks: int):
    for n in range(1, total_chunks + 1):
        path = _part_path(session_id, n)
        if not path.is_file():
            raise KeyError(n)
        with path.open('rb') as fh:
            while True:
                block = fh.read(READ_BLOCK_SIZE)
                if not block:
                    break
                yield block


def delete_session(session_id: str, total_chunks: int = 0) -> None:
    _redis_text().delete(f"{_PREFIX}:{session_id}")
    shutil.rmtree(_session_dir(session_id), ignore_errors=True)


def cleanup_stale_dirs() -> int:
    root = _staging_root()
    cutoff = time.time() - STALE_DIR_SECONDS
    removed = 0
    r = _redis_text()
    for directory in root.iterdir():
        if not directory.is_dir():
            continue
        try:
            if directory.stat().st_mtime > cutoff:
                continue
            if r.exists(f"{_PREFIX}:{directory.name}"):
                continue
            shutil.rmtree(directory, ignore_errors=True)
            removed += 1
        except OSError:
            continue
    if removed:
        logger.info("action=geoserver.chunked.cleanup removed=%s", removed)
    return removed
