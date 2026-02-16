from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_csrf
from app.models.draft import Draft
from app.models.publication_request import PublicationRequest
from app.models.user import Usuario
from app.schemas.publication_request import (
    PublicationRequestCreate,
    PublicationRequestReject,
    PublicationRequestResponse,
)
from app.services.history import registrar_accion
from app.services.notification import notificar_admins, NOTIFICATION_TYPES

router = APIRouter(prefix="/solicitudes-publicacion", tags=["solicitudes de publicación"])


def is_admin(user: Usuario) -> bool:
    return user.role == "tetlamamakani"


@router.get("", response_model=list[PublicationRequestResponse])
async def listar_solicitudes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver solicitudes"
        )

    requests = db.query(PublicationRequest).filter(
        PublicationRequest.status == "pending"
    ).order_by(PublicationRequest.created_at.desc()).all()

    result = []
    for req in requests:
        data = PublicationRequestResponse.model_validate(req)
        data.user_name = req.user.name if req.user else None
        data.reviewer_name = req.reviewer.name if req.reviewer else None
        result.append(data)

    return result


@router.post("", response_model=PublicationRequestResponse, status_code=status.HTTP_201_CREATED)
async def crear_solicitud(
    request_in: PublicationRequestCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    draft = db.query(Draft).filter(Draft.id == request_in.draft_id).first()
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrador no encontrado"
        )

    existing = db.query(PublicationRequest).filter(
        PublicationRequest.draft_id == request_in.draft_id,
        PublicationRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una solicitud pendiente para este borrador"
        )

    nueva_solicitud = PublicationRequest(
        user_id=current_user.id,
        resource_type=request_in.resource_type,
        draft_id=request_in.draft_id,
        status="pending"
    )
    db.add(nueva_solicitud)
    db.commit()
    db.refresh(nueva_solicitud)

    registrar_accion(
        db,
        user_id=current_user.id,
        action="solicitar_publicacion",
        resource=request_in.resource_type,
        resource_id=str(nueva_solicitud.id),
        description=f"{current_user.name} solicitó publicar cambios en {request_in.resource_type}",
    )

    notificar_admins(
        db,
        type=NOTIFICATION_TYPES.get("PUBLICATION_REQUESTED", "publication_requested"),
        title="Nueva solicitud de publicación",
        message=f"{current_user.name} solicita aprobar cambios en {request_in.resource_type}",
        link="/solicitudes-publicacion"
    )

    return nueva_solicitud


@router.post("/{request_id}/aprobar", response_model=PublicationRequestResponse)
async def aprobar_solicitud(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden aprobar solicitudes"
        )

    solicitud = db.query(PublicationRequest).filter(
        PublicationRequest.id == request_id
    ).first()

    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )

    if solicitud.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta solicitud ya fue procesada"
        )

    solicitud.status = "approved"
    solicitud.reviewed_by = current_user.id
    solicitud.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(solicitud)

    registrar_accion(
        db,
        user_id=current_user.id,
        action="aprobar_publicacion",
        resource=solicitud.resource_type,
        resource_id=str(solicitud.id),
        description=f"{current_user.name} aprobó la solicitud de publicación #{solicitud.id}",
    )

    return solicitud


@router.post("/{request_id}/rechazar", response_model=PublicationRequestResponse)
async def rechazar_solicitud(
    request_id: int,
    reject_data: PublicationRequestReject,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden rechazar solicitudes"
        )

    solicitud = db.query(PublicationRequest).filter(
        PublicationRequest.id == request_id
    ).first()

    if not solicitud:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )

    if solicitud.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta solicitud ya fue procesada"
        )

    solicitud.status = "rejected"
    solicitud.rejection_reason = reject_data.reason
    solicitud.reviewed_by = current_user.id
    solicitud.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(solicitud)

    registrar_accion(
        db,
        user_id=current_user.id,
        action="rechazar_publicacion",
        resource=solicitud.resource_type,
        resource_id=str(solicitud.id),
        description=f"{current_user.name} rechazó la solicitud de publicación #{solicitud.id}",
        details={"reason": reject_data.reason}
    )

    return solicitud
