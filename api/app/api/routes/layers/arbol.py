import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Response, status

from app.core.settings import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/layers')


@router.get('/arbol')
def arbol_completo(response: Response) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.mapalab_backend_url:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail='MapaLab no está configurado')
    headers = {'X-Internal-Token': settings.mapalab_internal_token} if settings.mapalab_internal_token else {}
    url = settings.mapalab_backend_url.rstrip('/') + '/layers/tree/completo'
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning('mapalab /layers/tree/completo fallo: %s', exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='No se pudo obtener el árbol de MapaLab') from exc
    response.headers['Cache-Control'] = 'private, no-store'
    return resp.json()
