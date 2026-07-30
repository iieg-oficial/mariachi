import secrets
from datetime import timedelta

import bcrypt
from jose import JWTError, jwt

from .settings import get_settings
from .time import utcnow

settings = get_settings()

BCRYPT_MAX_BYTES = 72


def _a_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_a_bytes(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_a_bytes(password), bcrypt.gensalt()).decode("utf-8")


def crear_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    issued = utcnow()
    if expires_delta:
        expire = issued + expires_delta
    else:
        expire = issued + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire, "iat": issued})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decodificar_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


def crear_csrf_token(username: str) -> str:
    data = {
        "sub": username,
        "type": "csrf",
        "random": secrets.token_urlsafe(32),
        "exp": utcnow() + timedelta(minutes=settings.csrf_token_expire_minutes),
    }
    return jwt.encode(data, settings.csrf_secret_key, algorithm=settings.algorithm)


def verificar_csrf_token(token: str, username: str) -> bool:
    try:
        payload = jwt.decode(token, settings.csrf_secret_key, algorithms=[settings.algorithm])
        return payload.get("sub") == username and payload.get("type") == "csrf"
    except JWTError:
        return False
