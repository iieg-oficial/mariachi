from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_project_access, verify_csrf
from app.api.metrics import COUNTER_EVENTO_PUBLISH, COUNTER_EVENTO_WRITES, incr
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.core.eventos import EventoEstado
from app.core.optimistic import check_concurrent_edit
from app.core.time import utcnow
from app.models.evento import Evento
from app.models.project import Project, UserProject
from app.models.user import Usuario
from app.schemas.evento import (
    EventoCreate,
    EventoDeleteResponse,
    EventoPublicResponse,
    EventoResponse,
    EventoUpdate,
    OrphanLayerInfo,
)
from app.services import presence
from app.services.actividad_service import registrar_actividad
from app.services.layer_service import find_orphan_auto_leaves, soft_delete_layer
from app.services.mapalab_notifier import notify_tree_changed
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
    db.flush()
    registrar_actividad(
        db,
        actor=_editor,
        action="evento.create",
        resource_type="evento",
        resource_id=evento.id,
        metadata={"slug": slug, "titulo": evento.titulo},
    )
    db.commit()
    db.refresh(evento)
    incr(COUNTER_EVENTO_WRITES)
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
    registrar_actividad(
        db,
        actor=_editor,
        action="evento.update",
        resource_type="evento",
        resource_id=evento.id,
        metadata={"fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(evento)
    incr(COUNTER_EVENTO_WRITES)
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
    registrar_actividad(
        db,
        actor=_editor,
        action="evento.publicar",
        resource_type="evento",
        resource_id=evento.id,
        metadata={"slug": evento.slug},
    )
    db.commit()
    db.refresh(evento)
    incr(COUNTER_EVENTO_PUBLISH)
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
    registrar_actividad(
        db,
        actor=_editor,
        action="evento.despublicar",
        resource_type="evento",
        resource_id=evento.id,
        metadata={"slug": evento.slug},
    )
    db.commit()
    db.refresh(evento)
    incr(COUNTER_EVENTO_WRITES)
    notify_eventos_changed()
    return evento


@router.get("/{evento_id}/orphan-layers-preview", response_model=list[OrphanLayerInfo])
async def preview_orphan_auto_layers(
    evento: Evento = Depends(get_evento_or_404),
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _editor=Depends(_require_editor),
):
    orphans = find_orphan_auto_leaves(db, dataengine_db, evento)
    return [
        OrphanLayerInfo(
            id=layer.id,
            label=layer.label,
            workspace=layer.workspace_alias,
            layer=layer.geoserver_layer,
        )
        for layer in orphans
    ]


@router.delete("/{evento_id}", response_model=EventoDeleteResponse)
async def eliminar_evento(
    delete_orphan_layers: bool = False,
    evento: Evento = Depends(get_evento_or_404),
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _csrf=Depends(verify_csrf),
    _editor=Depends(_require_editor),
    _rl=Depends(_write_rate_limit),
):
    estaba_publicado = evento.estado == EventoEstado.PUBLISHED.value
    evento_id_local = evento.id
    evento_slug = evento.slug

    orphans_to_delete = (
        find_orphan_auto_leaves(db, dataengine_db, evento)
        if delete_orphan_layers
        else []
    )

    registrar_actividad(
        db,
        actor=_editor,
        action="evento.delete",
        resource_type="evento",
        resource_id=evento_id_local,
        metadata={
            "slug": evento_slug,
            "estaba_publicado": estaba_publicado,
            "orphan_layers_deleted": [layer.id for layer in orphans_to_delete],
        },
    )
    db.delete(evento)
    db.commit()

    for layer in orphans_to_delete:
        soft_delete_layer(dataengine_db, layer, _editor.email)
    if orphans_to_delete:
        dataengine_db.commit()
        notify_tree_changed()

    incr(COUNTER_EVENTO_WRITES)
    if estaba_publicado:
        notify_eventos_changed()
    return EventoDeleteResponse(
        message="Evento eliminado",
        orphan_layers_deleted=len(orphans_to_delete),
    )


@router.get("/{evento_id}/preview", response_model=EventoPublicResponse)
async def preview_evento(evento: Evento = Depends(get_evento_visible_or_404)):
    return evento
