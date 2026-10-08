from fastapi import APIRouter, Depends

from app.api.intranet_cliente import verificar_clave_intranet
from app.services import huachicol_monitor

router = APIRouter(prefix="/intranet/estado", tags=["intranet"])

CAMPOS = ("slug", "status", "latency_ms", "last_checked")


@router.get("", dependencies=[Depends(verificar_clave_intranet)])
async def leer() -> dict[str, list[dict]]:
    datos = await huachicol_monitor.consultar("/api/status")
    filas = datos.get("services", []) if isinstance(datos, dict) else []
    return {
        "services": [
            {campo: fila.get(campo) for campo in CAMPOS} for fila in filas if isinstance(fila, dict)
        ]
    }
