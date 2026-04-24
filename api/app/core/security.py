import secrets
from datetime import timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from .settings import get_settings
from .time import utcnow

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def crear_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = utcnow() + expires_delta
    else:
        expire = utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
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
