import httpx
from fastapi import APIRouter, Depends, Query
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
    mapalab_backend = (settings.mapalab_backend_url or "").rstrip("/")
    sieej = (settings.sieej_url or "").rstrip("/")
    geoserver = (settings.geoserver_url or "").rstrip("/")
    acervo_scheme = "https" if settings.acervo_use_ssl else "http"
    resolved = (
        template.replace("{mapalab_backend_url}", mapalab_backend)
                .replace("{sieej_url}", sieej)
                .replace("{geoserver_url}", geoserver)
                .replace("{acervo_scheme}", acervo_scheme)
                .replace("{acervo_endpoint}", settings.acervo_endpoint or "")
    )
    if not resolved or "{" in resolved or resolved in {"://", "://"}:
        return None
    return resolved


def _probe_ontoy(url: str) -> tuple[str | None, bool]:
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS) as c:
            r = c.get(url)
            r.raise_for_status()
            return r.json().get("version"), True
    except Exception:
        return None, False


def _probe_http_health(url: str) -> tuple[str | None, bool]:
    try:
        with httpx.Client(timeout=_TIMEOUT_SECONDS, follow_redirects=True) as c:
            r = c.get(url, headers={"Host": "localhost"})
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


@router.get("/plataformas")
async def listar_plataformas(_: Usuario = Depends(get_current_user)):
    settings = get_settings()
    results = []

    for plat in PLATFORMS:
        slug, label, url = plat["slug"], plat["label"], plat["url"]
        probe = plat["probe"]
        static_version = plat.get("static_version")

        if probe == "self":
            v_probe, ok = get_app_version(), True
        elif probe == "none":
            v_probe, ok = None, True
        elif probe == "dataengine":
            v_probe, ok = _probe_dataengine(get_dataengine_db)
        else:
            resolved = _resolve_template(plat.get("probe_url_template"), settings)
            if not resolved:
                v_probe, ok = None, False
            elif probe == "ontoy":
                v_probe, ok = _probe_ontoy(resolved)
            else:
                v_probe, ok = _probe_http_health(resolved)

        version = static_version or v_probe
        results.append({
            "slug": slug,
            "label": label,
            "url": url,
            "version": version,
            "healthy": ok,
        })

    return results


@router.get("/notas-version")
async def listar_notas_version(
    limit: int = Query(default=5, ge=1, le=20),
    _: Usuario = Depends(get_current_user),
):
    return parse_changelog(limit=limit)
