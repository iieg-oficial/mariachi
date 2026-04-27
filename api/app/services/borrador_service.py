import copy
from typing import Callable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.time import utcnow
from app.models.borrador import Borrador
from app.models.evento import Evento
from app.models.home_section import HomeSection
from app.models.layer import Layer
from app.schemas.evento import EventoUpdate
from app.schemas.home_section import SECTION_SCHEMAS
from app.schemas.layer import LayerCreate, LayerUpdate
from app.services import layer_service
from app.services.geoserver_client import GeoServerError
from app.services.mapalab_notifier import notify_tree_changed
from app.services.mapalab_public_cache import notify_eventos_changed, notify_home_changed

ApplyFn = Callable[[Session, Session, Borrador, str], dict]


def _apply_evento(
    db: Session, _dataengine_db: Session, borrador: Borrador, _approver_email: str,
) -> dict:
    data = borrador.data or {}
    try:
        evento_id = int(borrador.resource_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"resource_id inválido para evento: {borrador.resource_id}",
        )

    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evento {evento_id} no existe",
        )

    try:
        update_payload = EventoUpdate.model_validate(data).model_dump(
            exclude_unset=True, exclude={'expected_updated_at'},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payload inválido: {exc}",
        ) from exc

    update_payload.pop('slug', None)
    for field, value in update_payload.items():
        setattr(evento, field, value)
    evento.updated_at = utcnow()
    db.flush()

    if evento.estado == 'published':
        notify_eventos_changed()
    return {'evento_id': evento.id, 'estado': evento.estado}


def _apply_home_section(
    db: Session, _dataengine_db: Session, borrador: Borrador, _approver_email: str,
) -> dict:
    key = borrador.resource_id
    if key not in SECTION_SCHEMAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sección desconocida: {key}",
        )
    section = db.query(HomeSection).filter(HomeSection.key == key).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sección '{key}' no inicializada",
        )

    schema_cls = SECTION_SCHEMAS[key]
    try:
        validated = schema_cls.model_validate(borrador.data or {}).model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payload inválido: {exc}",
        ) from exc

    section.payload_published = copy.deepcopy(validated)
    flag_modified(section, 'payload_published')
    section.payload_draft = copy.deepcopy(validated)
    flag_modified(section, 'payload_draft')
    section.published_at = utcnow()
    section.updated_at = utcnow()
    db.flush()
    notify_home_changed()
    return {'home_section_key': key}


def _apply_layer(
    _db: Session, dataengine_db: Session, borrador: Borrador, approver_email: str,
) -> dict:
    data = borrador.data or {}
    layer_id = borrador.resource_id
    existing = dataengine_db.query(Layer).filter(Layer.id == layer_id).first()

    try:
        if existing:
            update_payload = LayerUpdate.model_validate(data)
            layer_service.update_layer(
                dataengine_db, existing, update_payload, updated_by=approver_email,
            )
            action = 'updated'
        else:
            create_payload = LayerCreate.model_validate({**data, 'id': layer_id})
            layer_service.create_layer(
                dataengine_db, create_payload, updated_by=approver_email,
            )
            action = 'created'
        dataengine_db.commit()
        notify_tree_changed()
        return {'action': action, 'layer_id': layer_id}
    except (ValueError, GeoServerError) as exc:
        dataengine_db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


APPLIERS: dict[str, ApplyFn] = {
    'evento': _apply_evento,
    'home_section': _apply_home_section,
    'layer': _apply_layer,
}


def apply_borrador(
    db: Session,
    dataengine_db: Session,
    borrador: Borrador,
    approver_email: str,
) -> dict:
    apply_fn = APPLIERS.get(borrador.resource_type)
    if apply_fn is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Aprobación no implementada para resource_type='{borrador.resource_type}'",
        )
    return apply_fn(db, dataengine_db, borrador, approver_email)
