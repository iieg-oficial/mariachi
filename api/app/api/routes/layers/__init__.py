from fastapi import APIRouter, Depends

from app.api.deps import require_project_access
from app.api.routes.layers import aliases, crud, highlight, slugs

router = APIRouter(
    tags=['layers'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

router.include_router(slugs.router)
router.include_router(aliases.router)
router.include_router(highlight.router)
router.include_router(crud.router)
