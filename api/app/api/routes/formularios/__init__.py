from fastapi import APIRouter, Depends

from app.api.deps import require_project_access
from app.api.routes.formularios import catalogos, dinamicos

router = APIRouter(
    prefix="/formularios",
    tags=["sieej-formularios"],
    dependencies=[Depends(require_project_access("sieej"))],
)

router.include_router(catalogos.router)
router.include_router(dinamicos.router)
