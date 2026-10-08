from datetime import date

from fastapi import APIRouter, Depends, Query

from app.api.intranet_cliente import verificar_clave_intranet
from app.services.vine_perfiles import festivos_con_motivo

router = APIRouter(prefix="/intranet/inhabiles", tags=["intranet"])


@router.get("", dependencies=[Depends(verificar_clave_intranet)])
def leer(anio: int = Query(ge=2020, le=2100)) -> dict[str, list[dict[str, str]]]:
    dias = festivos_con_motivo(date(anio, 1, 1), date(anio, 12, 31))
    return {"dias": [{"fecha": dia.isoformat(), "motivo": motivo} for dia, motivo in dias]}
