from fastapi import APIRouter

from app.api.routes.layers import aliases, crud, highlight, slugs

router = APIRouter(tags=['layers'])

router.include_router(slugs.router)
router.include_router(aliases.router)
router.include_router(highlight.router)
router.include_router(crud.router)
