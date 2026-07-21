import asyncio

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_dataengine_db
from app.core.platforms_config import PLATFORMS
from app.core.settings import get_settings
from app.core.version import get_app_version
from app.models.user import Usuario
from app.services.changelog_parser import parse_changelog

router = APIRouter(prefix="/sistema", tags=["sistema"])

_TIMEOUT_SECONDS = 2.0


def _resolve_template(template: str | None, settings) -> str | None:
    if not template:
        return None
    placeholders = {
        "mapalab_backend_url": (settings.mapalab_backend_url or "").rstrip("/"),
        "dataengine_ontoy_url": (settings.dataengine_ontoy_url or "").rstrip("/"),
        "acervo_ontoy_url": (settings.acervo_ontoy_url or "").rstrip("/"),
        "geoserver_ontoy_url": (settings.geoserver_ontoy_url or "").rstrip("/"),
        "gateway_hub_ontoy_url": (settings.gateway_hub_ontoy_url or "").rstrip("/"),
        "huachicol_ontoy_url": (settings.huachicol_ontoy_url or "").rstrip("/"),
        "sieej_ontoy_url": (settings.sieej_ontoy_url or "").rstrip("/"),
        "sieej_url": (settings.sieej_url or "").rstrip("/"),
        "acervo_scheme": "https" if settings.acervo_use_ssl else "http",
        "acervo_endpoint": settings.acervo_endpoint or "",
    }
    resolved = template
    for k, v in placeholders.items():
        resolved = resolved.replace(f"{{{k}}}", v)
    if not resolved or "{" in resolved or resolved in {"://", "://"}:
        return None
    return resolved


async def _probe_ontoy(client: httpx.AsyncClient, url: str) -> tuple[str | None, bool]:
    try:
        r = await client.get(url)
        r.raise_for_status()
        return r.json().get("version"), True
    except Exception:
        return None, False


async def _probe_http_health(client: httpx.AsyncClient, url: str) -> tuple[str | None, bool]:
    try:
        r = await client.get(url, headers={"Host": "localhost"}, follow_redirects=True)
        r.raise_for_status()
        return None, True
    except Exception:
        return None, False


def _probe_dataengine(db_factory) -> tuple[str | None, bool]:
    try:
        db: Session = next(db_factory())
        try:
            row = db.execute(text("SELECT version()")).first()
            if not row or not row[0]:
                return None, True
            full = str(row[0])
            parts = full.split()
            short = parts[1] if len(parts) > 1 else full
            return short, True
        finally:
            db.close()
    except Exception:
        return None, False


async def _probe_plataforma(plat, settings, client: httpx.AsyncClient) -> tuple[str | None, bool]:
    probe = plat["probe"]
    if probe == "self":
        return get_app_version(), True
    if probe == "none":
        return None, True
    if probe == "dataengine":
        return await asyncio.to_thread(_probe_dataengine, get_dataengine_db)
    resolved = _resolve_template(plat.get("probe_url_template"), settings)
    if not resolved:
        return None, False
    if probe == "ontoy":
        return await _probe_ontoy(client, resolved)
    return await _probe_http_health(client, resolved)


async def _fetch_monitor(client: httpx.AsyncClient, settings) -> dict[str, dict]:
    base = (settings.huachicol_monitor_url or "").rstrip("/")
    if not base:
        return {}
    try:
        response = await client.get(f"{base}/api/status")
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return {}

    services = payload.get("services") or []
    return {s["slug"]: s for s in services if isinstance(s, dict) and s.get("slug")}


@router.get("/plataformas")
async def listar_plataformas(_: Usuario = Depends(get_current_user)):
    settings = get_settings()

    async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
        probes, monitor = await asyncio.gather(
            asyncio.gather(
                *(_probe_plataforma(plat, settings, client) for plat in PLATFORMS)
            ),
            _fetch_monitor(client, settings),
        )

    results = []
    for plat, (v_probe, ok) in zip(PLATFORMS, probes):
        version = plat.get("static_version") or v_probe
        entry = {
            "slug": plat["slug"],
            "label": plat["label"],
            "url": plat["url"],
            "repo": plat.get("repo"),
            "taiga": plat.get("taiga"),
            "version": version,
            "healthy": ok,
        }

        observed = monitor.get(plat["slug"])
        if observed:
            entry.update({
                "status": observed.get("status"),
                "since": observed.get("since"),
                "since_human": observed.get("since_human"),
                "deployed_at": observed.get("deployed_at"),
                "uptime_24h": observed.get("uptime_24h"),
                "containers": observed.get("container_summary"),
                "detail": observed.get("detail"),
                "monitored": True,
            })
            if not entry["version"]:
                entry["version"] = observed.get("version")
        else:
            entry["monitored"] = False

        results.append(entry)

    return results


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
    settings = get_settings()
    return {
        "source_app": "mariachi",
        "api_key": settings.colibri_api_key_mariachi,
    }


@router.get("/notas-version")
async def listar_notas_version(
    limit: int = Query(default=5, ge=1, le=20),
    _: Usuario = Depends(get_current_user),
):
    return parse_changelog(limit=limit)
