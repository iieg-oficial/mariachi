from fastapi import HTTPException, status

from app.api.deps import require_project_access, require_role
from app.api.rate_limit import rate_limit
from app.services.geoserver_client import GeoServerError

require_admin = require_role(['tetlamamakani'])
require_project_editor = require_project_access('mapalab', min_role='editor')
write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0)


def map_domain_errors(exc: Exception) -> HTTPException:
    if isinstance(exc, GeoServerError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail='Error interno del modulo de capas',
    )
