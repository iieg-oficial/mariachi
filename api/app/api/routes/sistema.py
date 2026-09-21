import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.core.settings import get_settings
from app.models.user import Usuario
from app.services.changelog_parser import parse_changelog
from app.services.colibri_keys import PUBLIC_PREFIX

router = APIRouter(prefix="/sistema", tags=["sistema"])

_TIMEOUT_SECONDS = 2.0


async def _proxy_monitor(path: str) -> dict | list:
    settings = get_settings()
    base = (settings.huachicol_monitor_url or "").rstrip("/")
    if not base:
        raise HTTPException(status_code=503, detail="monitor no configurado")
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.get(f"{base}{path}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail="monitor respondió con error")
    except Exception:
        raise HTTPException(status_code=502, detail="monitor no alcanzable")


@router.get("/monitor/status")
async def monitor_status(_: Usuario = Depends(get_current_user)):
    return await _proxy_monitor("/api/status")


@router.get("/monitor/nodos")
async def monitor_nodos(
    eventos: int = Query(default=20, ge=0, le=100),
    _: Usuario = Depends(get_current_user),
):
    return await _proxy_monitor(f"/api/nodos?eventos={eventos}")


@router.get("/monitor/nodos/{nodo}/historial")
async def monitor_nodo_historial(
    nodo: str,
    horas: int = Query(default=24, ge=1, le=168),
    _: Usuario = Depends(get_current_user),
):
    return await _proxy_monitor(f"/api/nodos/{nodo}/historial?horas={horas}")


@router.get("/monitor/status/{slug}")
async def monitor_status_detalle(
    slug: str,
    limit: int = Query(default=100, ge=1, le=500),
    _: Usuario = Depends(get_current_user),
):
    return await _proxy_monitor(f"/api/status/{slug}?limit={limit}")


@router.get("/monitor/events")
async def monitor_events(
    limit: int = Query(default=50, ge=1, le=200),
    _: Usuario = Depends(get_current_user),
):
    return await _proxy_monitor(f"/api/events?limit={limit}")


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
