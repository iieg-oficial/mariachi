from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_project_access, verify_csrf
from app.core.cache import get_cache, redis_client, set_cache
from app.core.time import utcnow
from app.models.evento import Evento
from app.models.user import Usuario
from app.schemas.evento import (
    EventoCreate,
    EventoPublicResponse,
    EventoResponse,
    EventoUpdate,
)
from app.services.mapalab_public_cache import notify_eventos_changed
from app.services.slug_service import is_valid_slug, slugify

router = APIRouter(
    prefix="/eventos",
    tags=["eventos mapalab"],
    dependencies=[Depends(require_project_access("mapalab"))],
)

_require_editor = require_project_access("mapalab", min_role="editor")


def _slug_taken(db: Session, slug: str, exclude_id: int | None = None) -> bool:
    q = db.query(Evento.id).filter(Evento.slug == slug)
    if exclude_id is not None:
        q = q.filter(Evento.id != exclude_id)
    return q.first() is not None


def _resolve_slug(db: Session, base: str, exclude_id: int | None = None) -> str:
    if not _slug_taken(db, base, exclude_id):
        return base
    suffix = 2
    while True:
        candidate = f"{base}-{suffix}"
        if not _slug_taken(db, candidate, exclude_id):
            return candidate
        suffix += 1


def _ensure_slug(db: Session, raw: str | None, fallback: str, exclude_id: int | None = None) -> str:
    candidate = raw if raw and is_valid_slug(raw) else slugify(fallback) or "evento"
    return _resolve_slug(db, candidate, exclude_id)


@router.get("", response_model=list[EventoResponse])
async def listar_eventos(db: Session = Depends(get_db)):
    return db.query(Evento).order_by(Evento.orden.asc(), Evento.id.desc()).all()


@router.post("", response_model=EventoResponse, status_code=status.HTTP_201_CREATED)
async def crear_evento(
    evento_in: EventoCreate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    slug = _ensure_slug(db, evento_in.slug, evento_in.titulo)
    data = evento_in.model_dump(exclude={'slug'})
    evento = Evento(slug=slug, estado='draft', **data)
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


@router.put("/{evento_id}/presencia")
async def registrar_presencia_evento(
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
):
    key = f"presencia:evento:{evento_id}:{current_user.username}"
    set_cache(key, {"username": current_user.username, "name": current_user.name}, expire=30)
    return {"ok": True}


@router.get("/{evento_id}/presencia")
async def obtener_presencia_evento(
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
):
    keys = redis_client.keys(f"presencia:evento:{evento_id}:*")
    editores = []
    for key in keys:
        data = get_cache(key)
        if data and data["username"] != current_user.username:
            editores.append(data)
    return editores


@router.get("/{evento_id}", response_model=EventoResponse)
async def obtener_evento(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    return evento


@router.patch("/{evento_id}", response_model=EventoResponse)
async def actualizar_evento(
    evento_id: int,
    evento_in: EventoUpdate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")

    if evento_in.expected_updated_at:
        db_ts = evento.updated_at.replace(tzinfo=None)
        req_ts = evento_in.expected_updated_at.replace(tzinfo=None)
        if abs((db_ts - req_ts).total_seconds()) > 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El evento fue modificado por otro usuario",
            )

    update_data = evento_in.model_dump(exclude_unset=True, exclude={'expected_updated_at'})

    if 'slug' in update_data:
        update_data['slug'] = _ensure_slug(db, update_data['slug'], evento.titulo, exclude_id=evento.id)

    for field, value in update_data.items():
        setattr(evento, field, value)

    evento.updated_at = utcnow()
    db.commit()
    db.refresh(evento)
    if evento.estado == 'published':
        notify_eventos_changed()
    return evento


@router.post("/{evento_id}/publicar", response_model=EventoResponse)
async def publicar_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    evento.estado = 'published'
    evento.published_at = utcnow()
    db.commit()
    db.refresh(evento)
    notify_eventos_changed()
    return evento


@router.post("/{evento_id}/despublicar", response_model=EventoResponse)
async def despublicar_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    evento.estado = 'draft'
    db.commit()
    db.refresh(evento)
    notify_eventos_changed()
    return evento


@router.delete("/{evento_id}")
async def eliminar_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    estaba_publicado = evento.estado == 'published'
    db.delete(evento)
    db.commit()
    if estaba_publicado:
        notify_eventos_changed()
    return {"message": "Evento eliminado"}


@router.get("/{evento_id}/preview", response_model=EventoPublicResponse)
async def preview_evento(evento_id: int, db: Session = Depends(get_db)):
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    return evento
