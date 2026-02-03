from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, fonts, history, icons, layouts, media, menu, pages, public, search, styles, users
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

    app.include_router(auth.router, prefix=settings.admin_prefix)
    app.include_router(users.router, prefix=settings.admin_prefix)
    app.include_router(pages.router, prefix=settings.admin_prefix)
    app.include_router(menu.router, prefix=settings.admin_prefix)
    app.include_router(media.router, prefix=settings.admin_prefix)
    app.include_router(fonts.router, prefix=settings.admin_prefix)
    app.include_router(layouts.router, prefix=settings.admin_prefix)
    app.include_router(history.router, prefix=settings.admin_prefix)
    app.include_router(search.router, prefix=settings.admin_prefix)
    app.include_router(icons.router, prefix=settings.admin_prefix)
    app.include_router(styles.router, prefix=settings.admin_prefix)

    app.include_router(public.router, prefix=settings.web_prefix)

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

