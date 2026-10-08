import hashlib
import json
import logging
import secrets
import uuid

from app.core import minerva_session
from app.core.cache import redis_client
from app.core.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_TOK_KEY = "rt:tok:{}"
_FAM_KEY = "rt:fam:{}"
_USER_KEY = "rt:user:{}"
_FAM_SID_KEY = "rt:famsid:{}"


class RefreshError(Exception):
    """El refresh token es inválido: ausente, expirado o revocado."""


def _ttl_seconds() -> int:
    return settings.refresh_token_expire_minutes * 60


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _store(username: str, family: str, sid: str) -> str:
    raw = secrets.token_urlsafe(32)
    token_hash = _hash(raw)
    ttl = _ttl_seconds()
    payload = json.dumps({"u": username, "f": family, "s": sid, "used": False})
    pipe = redis_client.pipeline()
    pipe.setex(_TOK_KEY.format(token_hash), ttl, payload)
    pipe.sadd(_FAM_KEY.format(family), token_hash)
    pipe.expire(_FAM_KEY.format(family), ttl)
    pipe.sadd(_USER_KEY.format(username), family)
    pipe.expire(_USER_KEY.format(username), ttl)
    pipe.setex(_FAM_SID_KEY.format(family), ttl, sid)
    pipe.execute()
    return raw


def issue(username: str, sid: str) -> str | None:
    try:
        return _store(username, uuid.uuid4().hex, sid)
    except Exception as exc:
        logger.warning("refresh issue error user=%s: %s", username, exc)
        return None


def rotate(raw: str) -> tuple[str, str, str]:
    try:
        token_hash = _hash(raw)
        rec_raw = redis_client.get(_TOK_KEY.format(token_hash))
        if rec_raw is None:
            raise RefreshError("refresh token inválido o expirado")
        rec = json.loads(rec_raw)
        if rec.get("used"):
            revoke_family(rec["f"])
            raise RefreshError("refresh token ya utilizado; la sesión fue revocada por seguridad")
        ttl = redis_client.ttl(_TOK_KEY.format(token_hash))
        rec["used"] = True
        redis_client.setex(
            _TOK_KEY.format(token_hash),
            ttl if ttl and ttl > 0 else _ttl_seconds(),
            json.dumps(rec),
        )
        sid = rec["s"]
        new_raw = _store(rec["u"], rec["f"], sid)
        return new_raw, rec["u"], sid
    except RefreshError:
        raise
    except Exception as exc:
        logger.warning("refresh rotate error: %s", exc)
        raise RefreshError("no se pudo renovar la sesión") from exc


def revoke(raw: str) -> None:
    try:
        rec_raw = redis_client.get(_TOK_KEY.format(_hash(raw)))
        if rec_raw is None:
            return
        revoke_family(json.loads(rec_raw)["f"])
    except Exception as exc:
        logger.warning("refresh revoke error: %s", exc)


def revoke_family(family: str) -> None:
    try:
        fam_key = _FAM_KEY.format(family)
        sid_key = _FAM_SID_KEY.format(family)
        sid = redis_client.get(sid_key)
        hashes = redis_client.smembers(fam_key)
        pipe = redis_client.pipeline()
        for token_hash in hashes:
            pipe.delete(_TOK_KEY.format(token_hash))
        pipe.delete(fam_key)
        pipe.delete(sid_key)
        pipe.execute()
        if sid:
            minerva_session.drop(sid)
    except Exception as exc:
        logger.warning("refresh revoke_family error family=%s: %s", family, exc)


def revoke_user(username: str) -> None:
    try:
        user_key = _USER_KEY.format(username)
        for family in redis_client.smembers(user_key):
            revoke_family(family)
        redis_client.delete(user_key)
    except Exception as exc:
        logger.warning("refresh revoke_user error user=%s: %s", username, exc)
