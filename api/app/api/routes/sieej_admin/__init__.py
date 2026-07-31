from fastapi import APIRouter, Depends

from app.api.deps import require_project_access
from app.api.routes.sieej_admin import catalogos, formularios, grupos, stats

router = APIRouter(
    prefix="/sieej",
    tags=["sieej-admin"],
    dependencies=[Depends(require_project_access("sieej"))],
)

router.include_router(stats.router)
router.include_router(formularios.router)
router.include_router(grupos.router)
router.include_router(catalogos.router)
