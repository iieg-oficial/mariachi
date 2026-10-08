from fastapi import HTTPException, status

from app.api.deps import require_permission
from app.api.rate_limit import rate_limit
from app.services.geoserver_client import GeoServerError

require_mapalab_edit = require_permission('mariachi.mapalab.update')
require_mapalab_manage = require_permission('mariachi.mapalab.manage')
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
