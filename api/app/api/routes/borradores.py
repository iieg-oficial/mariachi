import copy

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_current_user, get_db, require_role, verify_csrf
from app.core.database import get_dataengine_db
from app.core.time import utcnow
from app.models.borrador import Borrador
from app.models.evento import Evento
from app.models.home_section import HomeSection
from app.models.layer import Layer
from app.models.user import Usuario
from app.schemas.borrador import BorradorResponse, BorradorUpsert, RechazarIn
from app.schemas.evento import EventoUpdate
from app.schemas.home_section import SECTION_SCHEMAS
from app.schemas.layer import LayerCreate, LayerUpdate
from app.services import layer_service
from app.services.geoserver_client import GeoServerError
from app.services.mapalab_notifier import notify_tree_changed
from app.services.mapalab_public_cache import notify_eventos_changed, notify_home_changed

router = APIRouter(prefix="/borradores", tags=["borradores"])

_require_admin = require_role(['tetlamamakani'])


def _apply_evento_borrador(db: Session, borrador: Borrador) -> dict:
    data = borrador.data or {}
    try:
        evento_id = int(borrador.resource_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"resource_id inválido para evento: {borrador.resource_id}")

    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail=f"Evento {evento_id} no existe")

    try:
        update_payload = EventoUpdate.model_validate(data).model_dump(
            exclude_unset=True, exclude={'expected_updated_at'},
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payload inválido: {exc}") from exc

    update_payload.pop('slug', None)
    for field, value in update_payload.items():
        setattr(evento, field, value)
    evento.updated_at = utcnow()
    db.flush()

    if evento.estado == 'published':
        notify_eventos_changed()
    return {'evento_id': evento.id, 'estado': evento.estado}


def _apply_home_section_borrador(db: Session, borrador: Borrador) -> dict:
    key = borrador.resource_id
    if key not in SECTION_SCHEMAS:
        raise HTTPException(status_code=400, detail=f"Sección desconocida: {key}")
    section = db.query(HomeSection).filter(HomeSection.key == key).first()
    if not section:
        raise HTTPException(status_code=404, detail=f"Sección '{key}' no inicializada")

    schema_cls = SECTION_SCHEMAS[key]
    try:
        validated = schema_cls.model_validate(borrador.data or {}).model_dump()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Payload inválido: {exc}") from exc

    section.payload_published = copy.deepcopy(validated)
    flag_modified(section, 'payload_published')
    section.payload_draft = copy.deepcopy(validated)
    flag_modified(section, 'payload_draft')
    section.published_at = utcnow()
    section.updated_at = utcnow()
    db.flush()
    notify_home_changed()
    return {'home_section_key': key}


def _apply_layer_borrador(
    dataengine_db: Session, borrador: Borrador, approver_email: str,
) -> dict:
    data = borrador.data or {}
    layer_id = borrador.resource_id
    existing = dataengine_db.query(Layer).filter(Layer.id == layer_id).first()

    try:
        if existing:
            update_payload = LayerUpdate.model_validate(data)
            layer_service.update_layer(
                dataengine_db, existing, update_payload, updated_by=approver_email
            )
            action = 'updated'
        else:
            create_payload = LayerCreate.model_validate({**data, 'id': layer_id})
            layer_service.create_layer(
                dataengine_db, create_payload, updated_by=approver_email
            )
            action = 'created'
        dataengine_db.commit()
        return {'action': action, 'layer_id': layer_id}
    except (ValueError, GeoServerError) as exc:
        dataengine_db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/pendientes", response_model=list[BorradorResponse])
async def obtener_pendientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_admin),
):
    return (
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.estado == 'pendiente_revision')
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )


@router.get("/por-id/{borrador_id}", response_model=BorradorResponse)
async def obtener_borrador_por_id(
    borrador_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_admin),
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
    current_user: Usuario = Depends(verify_csrf),
):
    if current_user.role != 'tetlamamakani':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden aprobar")

    borrador = db.query(Borrador).filter(Borrador.id == borrador_id).first()
    if not borrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador no encontrado")
    if borrador.estado != 'pendiente_revision':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se aprueban borradores en estado 'pendiente_revision' (actual: {borrador.estado})",
        )

    result: dict = {}
    if borrador.resource_type == 'layer':
        result = _apply_layer_borrador(dataengine_db, borrador, current_user.email)
        borrador.estado = 'aprobado'
        borrador.actualizado_en = utcnow()
        db.commit()
        notify_tree_changed()
    elif borrador.resource_type == 'evento':
        result = _apply_evento_borrador(db, borrador)
        borrador.estado = 'aprobado'
        borrador.actualizado_en = utcnow()
        db.commit()
    elif borrador.resource_type == 'home_section':
        result = _apply_home_section_borrador(db, borrador)
        borrador.estado = 'aprobado'
        borrador.actualizado_en = utcnow()
        db.commit()
    else:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Aprobacion no implementada para resource_type='{borrador.resource_type}'",
        )

    return {'ok': True, **result}


@router.post("/por-id/{borrador_id}/rechazar")
async def rechazar_borrador(
    borrador_id: int,
    body: RechazarIn,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if current_user.role != 'tetlamamakani':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden rechazar")

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
    current_user: Usuario = Depends(verify_csrf),
):
    if current_user.role != 'tetlamamakani':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")

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
