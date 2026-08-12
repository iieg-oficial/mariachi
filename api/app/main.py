from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import metrics as metrics_module
from app.api.colibri_cors import ColibriPublicCORSMiddleware
from app.api.deps import require_any_permission, require_panel_access, require_permission
from app.api.routes import (
    acervo,
    acervo_buckets,
    acervo_internal,
    actividad,
    auth,
    borradores,
    bulk_ingest,
    capas_catalogo,
    colibri_direcciones,
    colibri_routes,
    colibri_source_apps,
    colibri_stats,
    colibri_tipos,
    eventos,
    formularios,
    geoserver,
    grid,
    home,
    identidad,
    layer_metadata,
    layers,
    mapalab_api_keys,
    mapalab_api_keys_internal,
    mapalab_events_public,
    mapalab_infobox,
    mapalab_infobox_public,
    mapalab_mcp_internal,
    mapalab_shares,
    mapalab_stats,
    menu,
    pages,
    preview,
    projects,
    public,
    reportes,
    reportes_public,
    sieej_admin,
    sistema,
    symbols,
    users,
    vine,
    wacha,
)
from app.core.settings import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        lifespan=lifespan,
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=settings.openapi_url,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Se agrega despues del CORS global para quedar como middleware mas externo:
    # intercepta el preflight de los huespedes embebibles (dominios_permitidos)
    # antes de que el CORS global lo rechace por no estar en la lista fija.
    app.add_middleware(ColibriPublicCORSMiddleware)

    app.include_router(auth.router, prefix=settings.admin_prefix)
    app.include_router(formularios.router, prefix=settings.admin_prefix)

    panel = [Depends(require_panel_access())]
    mapalab_view = [Depends(require_permission("mariachi.mapalab.view"))]
    portal_view = [Depends(require_permission("mariachi.portal.view"))]
    acervo_view = [Depends(require_permission("mariachi.acervo.view"))]
    sistema_manage = [Depends(require_permission("mariachi.sistema.manage"))]
    colibri_view = [
        Depends(
            require_any_permission(
                "mariachi.colibri_reportes.view", "mariachi.colibri_config.manage"
            )
        )
    ]

    app.include_router(
        users.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.usuarios.view"))],
    )
    app.include_router(
        actividad.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.actividad.view"))],
    )
    app.include_router(projects.router, prefix=settings.admin_prefix, dependencies=sistema_manage)
    app.include_router(acervo_buckets.router, prefix=settings.admin_prefix, dependencies=acervo_view)
    app.include_router(pages.router, prefix=settings.admin_prefix, dependencies=portal_view)
    app.include_router(menu.router, prefix=settings.admin_prefix, dependencies=portal_view)
    app.include_router(acervo.router, prefix=settings.admin_prefix, dependencies=acervo_view)
    app.include_router(borradores.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(sistema.router, prefix=settings.admin_prefix, dependencies=panel)
    app.include_router(layers.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(capas_catalogo.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(bulk_ingest.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(layer_metadata.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(grid.router, prefix=settings.admin_prefix, dependencies=panel)
    app.include_router(
        identidad.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.identidad.view"))],
    )
    app.include_router(symbols.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(
        geoserver.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.geoserver.view"))],
    )
    app.include_router(preview.admin_router, prefix=settings.admin_prefix, dependencies=portal_view)
    app.include_router(
        sieej_admin.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.sieej_admin.view"))],
    )
    app.include_router(eventos.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(home.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(
        mapalab_shares.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.mapalab.update"))],
    )
    app.include_router(
        mapalab_api_keys.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.mapalab_llaves.manage"))],
    )
    app.include_router(mapalab_api_keys_internal.router, prefix=settings.admin_prefix)
    app.include_router(mapalab_mcp_internal.router, prefix=settings.admin_prefix)
    app.include_router(mapalab_api_keys_internal.router, prefix=settings.admin_prefix_legacy)
    app.include_router(mapalab_mcp_internal.router, prefix=settings.admin_prefix_legacy)
    app.include_router(mapalab_stats.router, prefix=settings.admin_prefix, dependencies=mapalab_view)
    app.include_router(
        reportes.router,
        prefix=settings.admin_prefix,
        dependencies=[Depends(require_permission("mariachi.colibri_reportes.view"))],
    )
    app.include_router(colibri_tipos.router, prefix=settings.admin_prefix, dependencies=colibri_view)
    app.include_router(colibri_direcciones.router, prefix=settings.admin_prefix, dependencies=colibri_view)
    app.include_router(colibri_source_apps.router, prefix=settings.admin_prefix, dependencies=colibri_view)
    app.include_router(colibri_stats.router, prefix=settings.admin_prefix, dependencies=colibri_view)
    app.include_router(colibri_routes.router, prefix=settings.admin_prefix, dependencies=colibri_view)

    app.include_router(preview.public_router, prefix=settings.web_prefix)
    app.include_router(public.router, prefix=settings.web_prefix)
    app.include_router(public.mapalab_router, prefix=settings.mapalab_public_prefix)
    app.include_router(acervo.public_router)
    app.include_router(acervo_internal.router)
    app.include_router(symbols.mapalab_router, prefix=settings.mapalab_public_prefix)
    app.include_router(reportes_public.router, prefix=settings.public_prefix)
    app.include_router(mapalab_events_public.router, prefix=settings.public_prefix)
    app.include_router(mapalab_infobox_public.router, prefix=settings.public_prefix)
    app.include_router(mapalab_infobox.router, prefix=settings.admin_prefix, dependencies=mapalab_view)

    if settings.wacha_enabled:
        app.include_router(
            wacha.router,
            prefix=settings.admin_prefix,
            dependencies=[Depends(require_permission("mariachi.wacha.view"))],
        )

    if settings.vine_enabled:
        app.include_router(
            vine.router,
            prefix=settings.admin_prefix,
            dependencies=[Depends(require_permission("mariachi.vine.view"))],
        )

    @app.get("/", tags=["health"])
    async def healthcheck():
        return {
            "status": "ok",
            "project": settings.project_name,
            "version": settings.version,
        }

    @app.get("/ontoy", tags=["health"])
    async def ontoy():
        import os
        from datetime import datetime, timezone
        from pathlib import Path

        from fastapi.responses import JSONResponse
        from sqlalchemy import text

        from app.core.cache import redis_client
        from app.core.database import SessionLocal
        from app.core.version import get_app_version

        checks = {}
        try:
            db = SessionLocal()
            try:
                db.execute(text("SELECT 1"))
            finally:
                db.close()
            checks["db"] = {"status": "ok"}
        except Exception as exc:
            checks["db"] = {"status": "down", "detail": str(exc)[:120]}

        try:
            redis_client.ping()
            checks["redis"] = {"status": "ok"}
        except Exception as exc:
            checks["redis"] = {"status": "degraded", "detail": str(exc)[:120]}

        checks["abuso"] = metrics_module.check_abuso()
        checks["mapalab_notify"] = metrics_module.check_mapalab_notify()

        severity = {"ok": 0, "degraded": 1, "down": 2}
        status = max(
            (c["status"] for c in checks.values()),
            key=lambda s: severity.get(s, 0),
            default="ok",
        )

        try:
            pyproject = Path(__file__).resolve().parent.parent / "pyproject.toml"
            mtime = os.path.getmtime(pyproject)
            deployed_at = datetime.fromtimestamp(mtime, tz=timezone.utc) \
                .isoformat(timespec="seconds").replace("+00:00", "Z")
        except OSError:
            deployed_at = None

        payload = {
            "slug": "mariachi-api",
            "label": "Mariachi API",
            "version": get_app_version(),
            "deployed_at": deployed_at,
            "status": status,
            "checks": checks,
        }
        return JSONResponse(payload, status_code=503 if status == "down" else 200)

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
