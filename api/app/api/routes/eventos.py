from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_project_access, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.eventos import EventoEstado
from app.core.optimistic import check_concurrent_edit
from app.core.time import utcnow
from app.models.evento import Evento
from app.models.project import Project, UserProject
from app.models.user import Usuario
from app.schemas.evento import (
    EventoCreate,
    EventoPublicResponse,
    EventoResponse,
    EventoUpdate,
)
from app.services import presence
from app.services.mapalab_public_cache import notify_eventos_changed
from app.services.slug_service import is_valid_slug, slugify

router = APIRouter(
    prefix="/eventos",
    tags=["eventos mapalab"],
    dependencies=[Depends(require_project_access("mapalab"))],
)

_require_editor = require_project_access("mapalab", min_role="editor")
_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0)


def _can_edit_mapalab(db: Session, user: Usuario) -> bool:
    if user.role == 'tetlamamakani':
        return True
    project = (
        db.query(Project)
        .filter(Project.slug == 'mapalab', Project.is_active.is_(True))
        .first()
    )
    if not project:
        return False
    membership = (
        db.query(UserProject)
        .filter(
            UserProject.user_id == user.id,
            UserProject.project_id == project.id,
        )
        .first()
    )
    return bool(membership and membership.project_role == 'editor')


def get_evento_or_404(evento_id: int, db: Session = Depends(get_db)) -> Evento:
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    return evento


def get_evento_visible_or_404(
    evento_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> Evento:
    evento = db.query(Evento).filter(Evento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    if evento.estado != EventoEstado.PUBLISHED.value and not _can_edit_mapalab(db, current_user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
    return evento


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
async def listar_eventos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = db.query(Evento)
    if not _can_edit_mapalab(db, current_user):
        q = q.filter(Evento.estado == EventoEstado.PUBLISHED.value)
    return q.order_by(Evento.orden.asc(), Evento.id.desc()).all()


@router.post("", response_model=EventoResponse, status_code=status.HTTP_201_CREATED)
async def crear_evento(
    evento_in: EventoCreate,
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
    _editor=Depends(_require_editor),
    _rl=Depends(_write_rate_limit),
):
    slug = _ensure_slug(db, evento_in.slug, evento_in.titulo)
    data = evento_in.model_dump(exclude={'slug'})
    evento = Evento(slug=slug, estado=EventoEstado.DRAFT.value, **data)
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


@router.put("/{evento_id}/presencia")
async def registrar_presencia_evento(
    evento_id: int,
    current_user: Usuario = Depends(verify_csrf),
):
    presence.register("evento", evento_id, current_user.username, current_user.name)
    return {"ok": True}


@router.get("/{evento_id}/presencia")
async def obtener_presencia_evento(
    evento_id: int,
    current_user: Usuario = Depends(get_current_user),
):
    return presence.list_others("evento", evento_id, current_user.username)


@router.get("/{evento_id}", response_model=EventoResponse)
async def obtener_evento(evento: Evento = Depends(get_evento_visible_or_404)):
    return evento


@router.patch("/{evento_id}", response_model=EventoResponse)
async def actualizar_evento(
    evento_in: EventoUpdate,
    evento: Evento = Depends(get_evento_or_404),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
    _editor=Depends(_require_editor),
    _rl=Depends(_write_rate_limit),
):
    check_concurrent_edit(
        evento.updated_at,
        evento_in.expected_updated_at,
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
    if evento.estado == EventoEstado.PUBLISHED.value:
        notify_eventos_changed()
    return evento


@router.post("/{evento_id}/publicar", response_model=EventoResponse)
async def publicar_evento(
    evento: Evento = Depends(get_evento_or_404),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
    _editor=Depends(_require_editor),
    _rl=Depends(_write_rate_limit),
):
    evento.estado = EventoEstado.PUBLISHED.value
    evento.published_at = utcnow()
    db.commit()
    db.refresh(evento)
    notify_eventos_changed()
    return evento


@router.post("/{evento_id}/despublicar", response_model=EventoResponse)
async def despublicar_evento(
    evento: Evento = Depends(get_evento_or_404),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
    _editor=Depends(_require_editor),
    _rl=Depends(_write_rate_limit),
):
    evento.estado = EventoEstado.DRAFT.value
    db.commit()
    db.refresh(evento)
    notify_eventos_changed()
    return evento


@router.delete("/{evento_id}")
async def eliminar_evento(
    evento: Evento = Depends(get_evento_or_404),
    db: Session = Depends(get_db),
    _csrf=Depends(verify_csrf),
    _editor=Depends(_require_editor),
    _rl=Depends(_write_rate_limit),
):
    estaba_publicado = evento.estado == EventoEstado.PUBLISHED.value
    db.delete(evento)
    db.commit()
    if estaba_publicado:
        notify_eventos_changed()
    return {"message": "Evento eliminado"}


@router.get("/{evento_id}/preview", response_model=EventoPublicResponse)
async def preview_evento(evento: Evento = Depends(get_evento_visible_or_404)):
    return evento
