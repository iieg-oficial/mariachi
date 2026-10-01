from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.intranet_cliente import verificar_clave_intranet
from app.core.database import get_db
from app.services.vine_directorio import directorio

router = APIRouter(prefix="/intranet/directorio", tags=["intranet"])


@router.get("", dependencies=[Depends(verificar_clave_intranet)])
def leer(db: Session = Depends(get_db)) -> dict[str, list[dict[str, Any]]]:
    return {"personas": directorio(db)}
