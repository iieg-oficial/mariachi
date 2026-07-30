import hashlib
import secrets
from urllib.parse import urlparse

from app.core.security import hash_password, verify_password

PUBLIC_PREFIX = "mk_pub_"
PRIVATE_PREFIX = "mk_priv_"


def generate_api_key(visibility: str = "public") -> tuple[str, str, str]:
    """Genera una API key para mapalab. Devuelve (plain_key, prefix, hash).

    plain_key se devuelve UNA SOLA VEZ al cliente; nunca se persiste en claro.
    prefix son los primeros 12 chars (incluyendo mk_pub_/mk_priv_) para identificar
    visualmente la key sin revelar su valor completo.
    hash es lo que se guarda en BD.
    """
    if visibility not in {"public", "private"}:
        raise ValueError("visibility debe ser 'public' o 'private'")
    prefix_token = PUBLIC_PREFIX if visibility == "public" else PRIVATE_PREFIX
    secret = secrets.token_urlsafe(32)
    plain_key = f"{prefix_token}{secret}"
    visible_prefix = plain_key[: len(prefix_token) + 4]
    return plain_key, visible_prefix, _hash_key(plain_key)


def _hash_key(plain_key: str) -> str:
    digest = hashlib.sha256(plain_key.encode("utf-8")).hexdigest()
    return hash_password(digest)


def verify_api_key(plain_key: str, hashed: str) -> bool:
    if not plain_key or not hashed:
        return False
    digest = hashlib.sha256(plain_key.encode("utf-8")).hexdigest()
    return verify_password(digest, hashed)


def visibility_from_key(plain_key: str) -> str | None:
    if plain_key.startswith(PUBLIC_PREFIX):
        return "public"
    if plain_key.startswith(PRIVATE_PREFIX):
        return "private"
    return None


def visible_prefix_from_key(plain_key: str) -> str | None:
    if plain_key.startswith(PUBLIC_PREFIX):
        return plain_key[: len(PUBLIC_PREFIX) + 4]
    if plain_key.startswith(PRIVATE_PREFIX):
        return plain_key[: len(PRIVATE_PREFIX) + 4]
    return None


def match_origin(origin: str | None, patterns: list[str]) -> bool:
    """Devuelve True si origin matchea algún patrón.

    Patrones soportados:
      - "*"                  → cualquier origin (no recomendado en producción)
      - "https://exacto.com" → match exacto (case insensitive)
      - "exacto.com"         → match por host exacto (cualquier scheme)
      - "*.iieg.gob.mx"      → cualquier subdominio de iieg.gob.mx (cualquier scheme)
    """
    if not patterns:
        return False
    if "*" in patterns:
        return True
    if not origin:
        return False
    origin_lower = origin.lower().rstrip("/")
    try:
        origin_host = urlparse(origin_lower).hostname or ""
    except Exception:
        origin_host = ""
    for raw in patterns:
        pattern = raw.lower().strip().rstrip("/")
        if not pattern:
            continue
        if pattern == origin_lower:
            return True
        if pattern.startswith("*."):
            host_suffix = pattern[2:]
            if origin_host == host_suffix or origin_host.endswith("." + host_suffix):
                return True
            continue
        if "://" not in pattern and origin_host == pattern:
            return True
    return False


def match_ip(ip: str | None, allowlist: list[str]) -> bool:
    """Match simple por IP exacta. Si la lista está vacía, no aplica restricción.

    Para CIDR ranges se puede extender con `ipaddress.ip_network`.
    """
    if not allowlist:
        return True
    if not ip:
        return False
    return ip in allowlist


def match_layer(layer_id: str, allowlist: list[str]) -> bool:
    """Devuelve True si layer_id está permitido. Allowlist vacía = todas permitidas."""
    if not allowlist:
        return True
    return layer_id in allowlist
