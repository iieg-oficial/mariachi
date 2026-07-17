from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.sieej.catalogos import CatalogoItem
from app.services.sieej.catalogos_service import CatalogosService

router = APIRouter()


@router.get("/catalogos", response_model=dict[str, list[CatalogoItem]])
async def get_catalogos(db: Session = Depends(get_db)):
    return CatalogosService(db).bundle()
