from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_project_access, require_role, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.layer import Layer, Workspace
from app.models.user import Usuario
from app.schemas.layer import (
    InitialOrderBody,
    InitialOrderItem,
    LayerCreate,
    LayerResponse,
    LayerUpdate,
    ReorderBody,
    WorkspaceResponse,
)
from app.services import layer_service
from app.services.geoserver_client import GeoServerError
from app.services.mapalab_notifier import notify_tree_changed

router = APIRouter(
    prefix='/layers',
    tags=['layers'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

_require_admin = require_role(['tetlamamakani'])
_require_project_editor = require_project_access('mapalab', min_role='editor')
_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0)


def _map_domain_errors(exc: Exception) -> HTTPException:
    if isinstance(exc, GeoServerError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail='Error interno del modulo de capas',
    )


@router.get('/workspaces', response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
):
    return db.query(Workspace).order_by(Workspace.alias).all()


@router.get('/{layer_id}', response_model=LayerResponse)
async def get_layer(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    return layer


@router.post('', response_model=LayerResponse, status_code=201)
async def create_layer(
    data: LayerCreate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    try:
        existing = db.query(Layer).filter(Layer.id == data.id).first()
        if existing:
            raise HTTPException(
                status_code=409, detail=f"Ya existe una capa con id '{data.id}'"
            )

        layer = layer_service.create_layer(db, data, updated_by=current_user.email)
        db.commit()
        db.refresh(layer)
        notify_tree_changed()
        return layer
    except HTTPException:
        raise
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise _map_domain_errors(exc) from exc


@router.put('/{layer_id}', response_model=LayerResponse)
async def update_layer(
    layer_id: str,
    data: LayerUpdate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")

    try:
        layer = layer_service.update_layer(db, layer, data, updated_by=current_user.email)
        db.commit()
        db.refresh(layer)
        notify_tree_changed()
        return layer
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise _map_domain_errors(exc) from exc


@router.delete('/{layer_id}', status_code=204)
async def delete_layer(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    layer_service.delete_layer(db, layer)
    db.commit()
    notify_tree_changed()
    return None


@router.patch('/reorder')
async def reorder_layers(
    body: ReorderBody,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    updated = layer_service.reorder_children(db, body.parent_id, body.order)
    db.commit()
    notify_tree_changed()
    return {'updated': updated}


@router.patch('/bulk-tags')
async def bulk_update_tags(
    body: dict,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    updates = body.get('updates') or []
    if not isinstance(updates, list) or len(updates) == 0:
        raise HTTPException(status_code=400, detail='updates debe ser lista no vacia')
    if len(updates) > 500:
        raise HTTPException(status_code=400, detail='Maximo 500 capas por request')

    updated = 0
    not_found = []
    for item in updates:
        if not isinstance(item, dict):
            continue
        layer_id = item.get('id')
        tags = item.get('tags') or []
        if not layer_id or not isinstance(tags, list):
            continue
        layer = db.query(Layer).filter(Layer.id == layer_id).first()
        if not layer:
            not_found.append(layer_id)
            continue
        cleaned = [str(t).strip() for t in tags if isinstance(t, str) and t.strip()]
        layer.search_tags = cleaned or None
        layer.updated_by = current_user.email
        updated += 1

    db.commit()
    notify_tree_changed()
    return {'updated': updated, 'not_found': not_found}


@router.get('/initial-order', response_model=list[InitialOrderItem])
async def list_initial_order(
    db: Session = Depends(get_dataengine_db),
    _admin: Usuario = Depends(_require_admin),
):
    return layer_service.list_initial_order(db)


@router.patch('/initial-order')
async def update_initial_order(
    body: InitialOrderBody,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    try:
        layer_service.set_initial_order(db, body.layers)
        db.commit()
        notify_tree_changed()
        return {'count': len(body.layers)}
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.post('/{layer_id}/duplicate', response_model=LayerResponse, status_code=201)
async def duplicate_layer(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    try:
        new_layer = layer_service.duplicate_layer(db, layer)
        db.commit()
        db.refresh(new_layer)
        notify_tree_changed()
        return new_layer
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
