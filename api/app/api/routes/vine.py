from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.models.user import Usuario
from app.schemas.vine import PersonasResponse, ResumenResponse, RitmoResponse
from app.services import vine_stats
from app.services.vine_sync import VineSyncError, sincronizar

router = APIRouter(prefix="/vine", tags=["vine"])

PERMISO_PERSONAS = "mariachi.vine_personas.view"


@router.get("/estadisticas/resumen", response_model=ResumenResponse)
async def resumen(
    dias: int = Query(30, ge=1, le=1095),
    db: Session = Depends(get_db),
):
    return {
        "panorama": vine_stats.panorama(db, dias),
        "calidad": vine_stats.calidad(db, dias),
        "sincronizacion": vine_stats.sincronizacion(db),
    }


@router.get("/estadisticas/ritmo", response_model=RitmoResponse)
async def ritmo(
    dias: int = Query(30, ge=1, le=1095),
    meses: int = Query(36, ge=1, le=120),
    db: Session = Depends(get_db),
):
    return {
        "horario": vine_stats.ritmo_horario(db, dias),
        "semanal": vine_stats.ritmo_semanal(db, min(dias * 12, 1095)),
        "tendencia": vine_stats.tendencia_mensual(db, meses),
        "puntos": vine_stats.uso_por_punto(db, dias),
    }


@router.get(
    "/estadisticas/personas",
    response_model=PersonasResponse,
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def personas(
    dias: int = Query(30, ge=1, le=1095),
    limite: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return {
        "horas": vine_stats.ranking_horas(db, dias, limite),
        "madrugadores": vine_stats.madrugadores(db, dias, limite),
        "rachas": vine_stats.rachas(db, max(dias, 90), limite),
    }


@router.post("/sincronizar")
async def sincronizar_biometrico(
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
):
    try:
        return sincronizar(db)
    except VineSyncError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
