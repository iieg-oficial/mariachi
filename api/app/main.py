from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import metrics as metrics_module
from app.api.deps import require_staff
from app.api.routes import (
    auth,
    borradores,
    eventos,
    formularios,
    geoserver,
    home,
    layer_metadata,
    layers,
    mapalab_shares,
    media,
    media_buckets,
    menu,
    pages,
    preview,
    projects,
    public,
    sieej_admin,
    users,
)
from app.core.settings import get_settings

settings = get_settings()

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=f"mariachi-api@{settings.version}",
        traces_sample_rate=settings.sentry_traces_sample_rate,
    )


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

    app.include_router(auth.router, prefix=settings.admin_prefix)
    app.include_router(formularios.router, prefix=settings.admin_prefix)

    staff_dep = [Depends(require_staff)]
    app.include_router(users.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(projects.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(media_buckets.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(pages.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(menu.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(media.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(borradores.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(layers.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(layer_metadata.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(geoserver.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(preview.admin_router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(sieej_admin.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(eventos.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(home.router, prefix=settings.admin_prefix, dependencies=staff_dep)
    app.include_router(mapalab_shares.router, prefix=settings.admin_prefix, dependencies=staff_dep)

    app.include_router(preview.public_router, prefix=settings.web_prefix)
    app.include_router(public.router, prefix=settings.web_prefix)
    app.include_router(public.mapalab_router, prefix=settings.mapalab_public_prefix)
    app.include_router(metrics_module.router)

    @app.get("/", tags=["health"])
    async def healthcheck():
        return {
            "status": "ok",
            "project": settings.project_name,
            "version": settings.version,
        }

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
