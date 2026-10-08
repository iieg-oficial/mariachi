from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.intranet_cliente import verificar_clave_intranet
from app.models.roadmap import RoadmapHito
from app.models.roadmap_extra import RoadmapCiclo, RoadmapProceso
from app.schemas.roadmap import RoadmapCicloSalida, RoadmapHitoSalida, RoadmapProcesoSalida

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class RoadmapLectura(BaseModel):
    hitos: List[RoadmapHitoSalida]
    ciclos: List[RoadmapCicloSalida]
    procesos: List[RoadmapProcesoSalida]


@router.get("", response_model=RoadmapLectura, dependencies=[Depends(verificar_clave_intranet)])
def leer(db: Session = Depends(get_db)) -> RoadmapLectura:
    return RoadmapLectura(
        hitos=db.query(RoadmapHito).order_by(RoadmapHito.fecha_eje, RoadmapHito.orden).all(),
        ciclos=db.query(RoadmapCiclo).order_by(RoadmapCiclo.orden).all(),
        procesos=db.query(RoadmapProceso).order_by(RoadmapProceso.orden).all(),
    )
