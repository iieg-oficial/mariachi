from fastapi import APIRouter

from app.api.routes.sieej_admin import catalogos, formularios, grupos, stats

router = APIRouter(prefix="/sieej", tags=["sieej-admin"])

router.include_router(stats.router)
router.include_router(formularios.router)
router.include_router(grupos.router)
router.include_router(catalogos.router)
