import hashlib
import re

_QUERY_RE = re.compile(r"\?.*$")
_NUMERIC_PATH_RE = re.compile(r"/\d+")


def _normalize_route(route: str | None) -> str:
    if not route:
        return ""
    cleaned = _QUERY_RE.sub("", route)
    return _NUMERIC_PATH_RE.sub("/:id", cleaned).lower()


def compute_fingerprint(
    *,
    tipo: str,
    source_app: str,
    source_route: str | None,
    mensaje: str,
) -> str:
    """Hash determinista para agrupar reportes equivalentes.

    Considera (tipo + source_app + ruta_normalizada + primeros 200 chars del mensaje).
    Las queries y los path params numéricos se quitan/normalizan para que distintos
    IDs en la misma ruta no generen grupos separados.
    """
    parts = [
        (tipo or "").strip().lower(),
        (source_app or "").strip().lower(),
        _normalize_route(source_route),
        (mensaje or "").strip()[:200].lower(),
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
