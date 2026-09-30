import hashlib
import hmac
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.settings import get_settings
from app.models.roadmap import RoadmapHito
from app.models.roadmap_extra import RoadmapCiclo, RoadmapProceso
from app.schemas.roadmap import RoadmapCicloSalida, RoadmapHitoSalida, RoadmapProcesoSalida

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class RoadmapLectura(BaseModel):
    hitos: List[RoadmapHitoSalida]
    ciclos: List[RoadmapCicloSalida]
    procesos: List[RoadmapProcesoSalida]


def verificar_clave(x_api_key: str = Header(default="")) -> None:
    esperado = (get_settings().roadmap_api_key_sha256 or "").strip().lower()
    recibido = hashlib.sha256(x_api_key.encode()).hexdigest()
    if not esperado or not x_api_key or not hmac.compare_digest(recibido, esperado):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")


@router.get("", response_model=RoadmapLectura, dependencies=[Depends(verificar_clave)])
def leer(db: Session = Depends(get_db)) -> RoadmapLectura:
    return RoadmapLectura(
        hitos=db.query(RoadmapHito).order_by(RoadmapHito.fecha_eje, RoadmapHito.orden).all(),
        ciclos=db.query(RoadmapCiclo).order_by(RoadmapCiclo.orden).all(),
        procesos=db.query(RoadmapProceso).order_by(RoadmapProceso.orden).all(),
    )
