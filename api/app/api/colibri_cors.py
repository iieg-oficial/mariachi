import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.database import SessionLocal
from app.core.settings import get_settings
from app.models.source_app import SourceApp
from app.services.colibri_keys import match_origin

logger = logging.getLogger(__name__)

settings = get_settings()
_PUBLIC_REPORTES_PREFIX = f"{settings.public_prefix}/reportes"

_CACHE_TTL_SECONDS = 60.0
_cache: dict = {"at": 0.0, "patterns": []}


def _allowed_patterns() -> list[str]:
    """Patrones de dominios permitidos de todos los source apps activos.

    Cacheado en proceso por TTL corto: el preflight se dispara seguido y no
    vale la pena pegarle a la BD en cada request. Ante error de BD, devuelve
    el ultimo valor conocido (stale) en lugar de romper CORS.
    """
    now = time.monotonic()
    if _cache["patterns"] and now - _cache["at"] < _CACHE_TTL_SECONDS:
        return _cache["patterns"]

    db = SessionLocal()
    try:
        rows = (
            db.query(SourceApp.dominios_permitidos)
            .filter(SourceApp.activo.is_(True))
            .all()
        )
    except Exception:
        logger.exception("colibri_cors.load_patterns")
        return _cache["patterns"]
    finally:
        db.close()

    patterns: list[str] = []
    for (dominios,) in rows:
        if dominios:
            patterns.extend(dominios)
    _cache["at"] = now
    _cache["patterns"] = patterns
    return patterns


def _cors_headers(origin: str) -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Colibri-Key",
        "Access-Control-Expose-Headers": "Retry-After",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    }


class ColibriPublicCORSMiddleware(BaseHTTPMiddleware):
    """CORS dinamico para el endpoint publico de reportes.

    El `CORSMiddleware` global solo permite los origenes fijos del entorno. Los
    huespedes embebibles se registran en `source_apps.dominios_permitidos` y su
    origen puede ser cualquiera. Este middleware valida el `Origin` contra esa
    lista (via `match_origin`, soporta wildcards) y emite los headers CORS,
    incluyendo la respuesta al preflight `OPTIONS`. Debe montarse como el
    middleware mas externo para interceptar el preflight antes que el CORS
    global lo rechace.
    """

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        if not origin or not request.url.path.startswith(_PUBLIC_REPORTES_PREFIX):
            return await call_next(request)

        allowed = match_origin(origin, _allowed_patterns())

        is_preflight = (
            request.method == "OPTIONS"
            and request.headers.get("access-control-request-method") is not None
        )
        if is_preflight:
            if allowed:
                return Response(status_code=200, headers=_cors_headers(origin))
            return await call_next(request)

        response = await call_next(request)
        if allowed:
            for key, value in _cors_headers(origin).items():
                response.headers[key] = value
        return response
