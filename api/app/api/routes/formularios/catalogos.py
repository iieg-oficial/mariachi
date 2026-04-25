from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.sieej import (
    CatalogoCalidadDatos,
    CatalogoCategoriaDatos,
    CatalogoEjesEstrategicos,
    CatalogoHerramientasGestion,
    CatalogoObjetivoUso,
    CatalogoPeriodicidad,
    CatalogoUnidadAdmin,
    CatalogoUsuariosDatos,
)
from app.schemas.sieej.catalogos import CatalogoItem, CatalogosResponse

router = APIRouter()


@router.get("/catalogos", response_model=CatalogosResponse)
async def get_catalogos(db: Session = Depends(get_db)):
    def _list(model):
        return [CatalogoItem.model_validate(row) for row in db.query(model).order_by(model.id).all()]

    return CatalogosResponse(
        unidades_admin=_list(CatalogoUnidadAdmin),
        categoria_datos=_list(CatalogoCategoriaDatos),
        herramientas_gestion=_list(CatalogoHerramientasGestion),
        calidad_datos=_list(CatalogoCalidadDatos),
        periodicidad=_list(CatalogoPeriodicidad),
        objetivo_uso=_list(CatalogoObjetivoUso),
        usuarios_datos=_list(CatalogoUsuariosDatos),
        ejes_estrategicos=_list(CatalogoEjesEstrategicos),
    )
