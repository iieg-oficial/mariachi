import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import get_current_user
from app.api.metrics import SENALES_ABUSO, UMBRAL_ABUSO, VENTANA_SEGUNDOS, check_abuso
from app.api.rate_limit import TOPES, rate_limit
from app.models.user import Usuario
from app.services import incidentes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidentes", tags=["incidentes"])

_lectura = rate_limit(max_requests=30, window_seconds=60.0, scope="incidentes_read")


@router.get("")
async def listar_incidentes(
    response: Response,
    minutos: int = Query(60, ge=1, le=incidentes.VENTANA_MAX_MINUTOS),
    current_user: Usuario = Depends(get_current_user),
    _rl: Usuario = Depends(_lectura),
) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store"
    logger.info("action=incidentes.view user_id=%s minutos=%s", current_user.id, minutos)
    abuso = check_abuso()
    return {
        **incidentes.resumen(minutos),
        "en_alerta": sum(int(abuso.get(senal, 0)) for senal in SENALES_ABUSO),
        "estado_alerta": abuso["status"],
        "umbral": UMBRAL_ABUSO,
        "ventana_alerta_minutos": VENTANA_SEGUNDOS // 60,
        "topes": sorted(TOPES.values(), key=lambda t: (t["tipo"], t["scope"])),
    }
