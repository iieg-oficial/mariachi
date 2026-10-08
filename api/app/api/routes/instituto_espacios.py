from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_permission, verify_csrf
from app.api.intranet_cliente import verificar_clave_intranet
from app.core.database import get_dataengine_db
from app.models.user import Usuario
from app.schemas.instituto_espacio import EspacioUpdate
from app.services import instituto_espacios

router = APIRouter(prefix="/intranet/espacios", tags=["intranet"])
lectura_router = APIRouter(prefix="/intranet/espacios", tags=["intranet"])

_gestionar = require_permission("mariachi.intranet.manage")


def _actor(usuario: Usuario) -> str:
    return getattr(usuario, "name", None) or usuario.username


@router.get("")
def listar(db: Session = Depends(get_dataengine_db)) -> dict[str, list[dict[str, Any]]]:
    return {"espacios": instituto_espacios.listar(db), "pisos": instituto_espacios.pisos(db)}


@router.put("/{fid}")
def editar(
    fid: int,
    datos: EspacioUpdate,
    db: Session = Depends(get_dataengine_db),
    usuario: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_gestionar),
) -> dict[str, Any]:
    return instituto_espacios.editar(db, fid, datos.model_dump(exclude_unset=True), _actor(usuario))


@router.get("/{fid}/historial")
def historial(fid: int, db: Session = Depends(get_dataengine_db)) -> list[dict[str, Any]]:
    return instituto_espacios.historial(db, fid)


@router.post("/{fid}/historial/{historial_id}/restaurar")
def restaurar(
    fid: int,
    historial_id: int,
    db: Session = Depends(get_dataengine_db),
    usuario: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_gestionar),
) -> dict[str, Any]:
    return instituto_espacios.restaurar(db, fid, historial_id, _actor(usuario))


@lectura_router.get("", dependencies=[Depends(verificar_clave_intranet)])
def plano(db: Session = Depends(get_dataengine_db)) -> dict[str, list[dict[str, Any]]]:
    return instituto_espacios.plano(db)
