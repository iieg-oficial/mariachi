from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.api.routes.formularios import catalogos, dinamicos

router = APIRouter(
    prefix="/formularios",
    tags=["sieej-formularios"],
    dependencies=[Depends(require_permission("mariachi.sieej_formularios.view"))],
)

router.include_router(catalogos.router)
router.include_router(dinamicos.router)
