from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.api.routes.layers._deps import require_mapalab_manage, write_rate_limit
from app.core.database import get_dataengine_db
from app.models.user import Usuario
from app.schemas.layer import LayerCreate
from app.services.layer_lote import crear_lote
from app.services.mapalab_notifier import notify_tree_changed

router = APIRouter(prefix='/layers')


class LoteRequest(BaseModel):
    capas: list[LayerCreate] = Field(..., min_length=1, max_length=500)


class LoteResponse(BaseModel):
    creadas: int


@router.post('/lote', response_model=LoteResponse, status_code=201)
async def crear_capas_en_lote(
    payload: LoteRequest,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
):
    try:
        errores = crear_lote(db, payload.capas, current_user.email)
        if errores:
            db.rollback()
            raise HTTPException(status_code=422, detail={'errores': errores})
        db.commit()
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise
    notify_tree_changed()
    return {'creadas': len(payload.capas)}
