from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db, require_role, verify_csrf
from app.core.database import get_dataengine_db
from app.core.time import utcnow
from app.models.borrador import Borrador
from app.models.user import Usuario
from app.schemas.borrador import BorradorResponse, BorradorUpsert, RechazarIn
from app.services import borrador_service

router = APIRouter(prefix="/borradores", tags=["borradores"])

_require_admin = require_role(['tetlamamakani'])


@router.get("/pendientes", response_model=list[BorradorResponse])
async def obtener_pendientes(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_admin),
):
    return (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.estado == 'pendiente_revision')
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )


@router.get("/mios", response_model=list[BorradorResponse])
async def obtener_mis_borradores(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.usuario_id == current_user.id)
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )


@router.get("/por-id/{borrador_id}", response_model=BorradorResponse)
async def obtener_borrador_por_id(
    borrador_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.id == borrador_id)
        .first()
    )
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    return borrador


@router.post("/por-id/{borrador_id}/aprobar")
async def aprobar_borrador(
    borrador_id: int,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    if borrador.estado != 'pendiente_revision':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se aprueban borradores en estado 'pendiente_revision' (actual: {borrador.estado})",
        )

    result = borrador_service.apply_borrador(db, dataengine_db, borrador, current_user.email)

    borrador.estado = 'aprobado'
    borrador.actualizado_en = utcnow()
    db.commit()

    return {'ok': True, **result}


@router.post("/por-id/{borrador_id}/rechazar")
async def rechazar_borrador(
    borrador_id: int,
    body: RechazarIn,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")

    borrador.estado = 'rechazado'
    borrador.comentario_rechazo = body.comentario
    borrador.actualizado_en = utcnow()
    db.commit()
    return {"ok": True}


@router.delete("/por-id/{borrador_id}")
async def eliminar_borrador_por_id(
    borrador_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
):
    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")

    db.delete(borrador)
    db.commit()
    return {"message": "Borrador eliminado"}


@router.get("/{resource_type}/{resource_id}", response_model=BorradorResponse)
async def obtener_borrador(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    borrador = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(
            Borrador.resource_type == resource_type,
            Borrador.resource_id == resource_id,
            Borrador.usuario_id == current_user.id,
        )
        .first()
    )
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    return borrador


@router.put("/{resource_type}/{resource_id}", response_model=BorradorResponse)
async def guardar_borrador(
    resource_type: str,
    resource_id: str,
    borrador_in: BorradorUpsert,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    borrador = (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(
            Borrador.resource_type == resource_type,
            Borrador.resource_id == resource_id,
            Borrador.usuario_id == current_user.id,
        )
        .first()
    )

    if borrador:
        borrador.data = borrador_in.data
        borrador.estado = 'en_progreso'
        borrador.comentario_rechazo = None
        borrador.actualizado_en = utcnow()
    else:
        borrador = Borrador(
            resource_type=resource_type,
            resource_id=resource_id,
            usuario_id=current_user.id,
            data=borrador_in.data,
            estado='en_progreso',
        )
        db.add(borrador)

    db.commit()
    db.refresh(borrador)
    return borrador


@router.post("/{resource_type}/{resource_id}/solicitar-revision")
async def solicitar_revision(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    borrador = db.query(Borrador).filter(
        Borrador.resource_type == resource_type,
        Borrador.resource_id == resource_id,
        Borrador.usuario_id == current_user.id,
    ).first()

    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guarda un borrador primero")

    borrador.estado = 'pendiente_revision'
    borrador.comentario_rechazo = None
    borrador.actualizado_en = utcnow()
    db.commit()
    return {"ok": True}


@router.delete("/{resource_type}/{resource_id}")
async def eliminar_borrador(
    resource_type: str,
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    borrador = db.query(Borrador).filter(
        Borrador.resource_type == resource_type,
        Borrador.resource_id == resource_id,
        Borrador.usuario_id == current_user.id,
    ).first()

    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")

    db.delete(borrador)
    db.commit()
    return {"message": "Borrador eliminado"}
