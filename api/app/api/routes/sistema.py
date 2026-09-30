from fastapi import APIRouter, Depends, Path, Query

from app.api.deps import get_current_user, require_permission
from app.core.settings import get_settings
from app.models.user import Usuario
from app.services import huachicol_monitor
from app.services.changelog_parser import parse_changelog
from app.services.colibri_keys import PUBLIC_PREFIX

router = APIRouter(prefix="/sistema", tags=["sistema"])

_NODO_PATRON = r"^[A-Za-z0-9_-]+$"
_gestionar = [Depends(require_permission("mariachi.sistema.manage"))]


@router.get("/monitor/status", dependencies=_gestionar)
async def monitor_status(_: Usuario = Depends(get_current_user)):
    return await huachicol_monitor.consultar("/api/status")


@router.get("/monitor/nodos", dependencies=_gestionar)
async def monitor_nodos(
    eventos: int = Query(default=20, ge=0, le=100),
    _: Usuario = Depends(get_current_user),
):
    return await huachicol_monitor.consultar(f"/api/nodos?eventos={eventos}")


@router.get("/monitor/nodos/{nodo}/historial", dependencies=_gestionar)
async def monitor_nodo_historial(
    nodo: str = Path(pattern=_NODO_PATRON, max_length=64),
    horas: int = Query(default=24, ge=1, le=168),
    _: Usuario = Depends(get_current_user),
):
    return await huachicol_monitor.consultar(f"/api/nodos/{nodo}/historial?horas={horas}")


@router.get("/monitor/status/{slug}", dependencies=_gestionar)
async def monitor_status_detalle(
    slug: str = Path(pattern=_NODO_PATRON, max_length=64),
    limit: int = Query(default=100, ge=1, le=500),
    _: Usuario = Depends(get_current_user),
):
    return await huachicol_monitor.consultar(f"/api/status/{slug}?limit={limit}")


@router.get("/monitor/events", dependencies=_gestionar)
async def monitor_events(
    limit: int = Query(default=50, ge=1, le=200),
    _: Usuario = Depends(get_current_user),
):
    return await huachicol_monitor.consultar(f"/api/events?limit={limit}")


@router.get("/colibri-config")
async def colibri_config(_: Usuario = Depends(get_current_user)):
    api_key = get_settings().colibri_api_key_mariachi or ""
    return {
        "source_app": "mariachi",
        "api_key": api_key if api_key.startswith(PUBLIC_PREFIX) else "",
    }


@router.get("/notas-version")
async def listar_notas_version(
    limit: int = Query(default=5, ge=1, le=20),
    _: Usuario = Depends(get_current_user),
):
    return parse_changelog(limit=limit)
