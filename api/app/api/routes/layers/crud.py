from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_csrf
from app.api.routes.layers._deps import (
    map_domain_errors,
    require_mapalab_edit,
    require_mapalab_manage,
    write_rate_limit,
)
from app.core.database import get_dataengine_db
from app.models.evento import Evento
from app.models.layer import Layer, Workspace
from app.models.user import Usuario
from app.schemas.layer import (
    AutoLeafRequest,
    DeletedLayerSummary,
    InitialOrderBody,
    InitialOrderItem,
    LayerCreate,
    LayerReferencesResponse,
    LayerResponse,
    LayerUpdate,
    ReorderBody,
    WorkspaceResponse,
)
from app.services import layer_history, layer_service
from app.services import publicaciones_capas as publicaciones
from app.services.geoserver_client import GeoServerError
from app.services.mapalab_notifier import notify_tree_changed

router = APIRouter(prefix='/layers')


def _capa_references_layer(capa: dict, workspace_alias: str, geoserver_layer: str) -> bool:
    """Recorre recursivamente eventos.capas (incluye sub-capas de categorias)."""
    if not isinstance(capa, dict):
        return False
    if (capa.get('tipo') in (None, 'capa')
            and capa.get('workspace') == workspace_alias
            and capa.get('layer') == geoserver_layer):
        return True
    if capa.get('tipo') == 'categoria':
        for sub in (capa.get('capas') or []):
            if _capa_references_layer(sub, workspace_alias, geoserver_layer):
                return True
    return False


def _compute_references(
    dataengine_db: Session, mariachi_db: Session, layer: Layer,
) -> dict:
    children_count = layer_service.count_alive_children(dataengine_db, layer.id)
    in_initial_order = layer_service.is_in_initial_order(dataengine_db, layer.id)
    eventos_refs: list[dict] = []
    if layer.workspace_alias and layer.geoserver_layer:
        eventos = (
            mariachi_db.query(Evento)
            .filter(Evento.estado == 'published')
            .all()
        )
        for evento in eventos:
            for capa in (evento.capas or []):
                if _capa_references_layer(capa, layer.workspace_alias, layer.geoserver_layer):
                    eventos_refs.append({
                        'id': evento.id,
                        'titulo': evento.titulo,
                        'slug': evento.slug,
                        'activo': evento.activo,
                    })
                    break
    return {
        'children_count': children_count,
        'in_initial_order': in_initial_order,
        'eventos': eventos_refs,
    }


@router.get('/workspaces', response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_mapalab_edit),
):
    return db.query(Workspace).order_by(Workspace.alias).all()


@router.post('/auto-leaf', response_model=LayerResponse)
async def auto_leaf(
    data: AutoLeafRequest,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
):
    try:
        leaf, created = layer_service.find_or_create_auto_leaf(
            db,
            workspace_alias=data.workspace_alias,
            geoserver_layer=data.geoserver_layer,
            label=data.label,
            updated_by=current_user.email,
        )
        if created:
            db.commit()
            db.refresh(leaf)
            notify_tree_changed()
        return leaf
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise map_domain_errors(exc) from exc


@router.get('/initial-order', response_model=list[InitialOrderItem])
async def list_initial_order(
    db: Session = Depends(get_dataengine_db),
    _admin: Usuario = Depends(require_mapalab_manage),
):
    return layer_service.list_initial_order(db)


@router.get('/deleted', response_model=list[DeletedLayerSummary])
async def list_deleted_layers(
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_mapalab_edit),
):
    return layer_service.list_deleted_layers(db)


@router.get('/{layer_id}/references', response_model=LayerReferencesResponse)
async def get_layer_references(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    _editor: Usuario = Depends(require_mapalab_edit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    return _compute_references(db, mariachi_db, layer)


@router.get('/{layer_id}', response_model=LayerResponse)
async def get_layer(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_mapalab_edit),
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
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
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
        raise map_domain_errors(exc) from exc


@router.put('/{layer_id}', response_model=LayerResponse)
async def update_layer(
    layer_id: str,
    data: LayerUpdate,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")

    campos = publicaciones.campos_de('layer', data.model_dump(exclude_unset=True, by_alias=False))
    antes = publicaciones.foto(layer, campos)
    try:
        before = layer_history.snapshot(layer)
        layer = layer_service.update_layer(db, layer, data, updated_by=current_user.email)
        layer_history.record_changes(
            db, layer_id, before, layer_history.snapshot(layer), current_user.email
        )
        db.commit()
        db.refresh(layer)
        notify_tree_changed()
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise map_domain_errors(exc) from exc
    publicaciones.registrar_sin_romper(
        mariachi_db, 'layer', layer_id, antes, publicaciones.foto(layer, campos),
        publicaciones.quien(current_user),
    )
    return layer


@router.delete('/{layer_id}', status_code=200)
async def delete_layer(
    layer_id: str,
    force: bool = False,
    cascade: bool = False,
    db: Session = Depends(get_dataengine_db),
    mariachi_db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
):
    """Soft-delete (admin). Marca deleted_at sin borrar la fila.

    Con hijos vivos exige `?cascade=true`, que los archiva junto con el nodo:
    un grupo con veinte propiedades no se vacia a mano. Las referencias en
    eventos publicados o en el orden inicial siguen exigiendo `?force=true`.
    """
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    if layer.deleted_at is not None:
        raise HTTPException(status_code=409, detail='La capa ya está en papelera')

    refs = _compute_references(db, mariachi_db, layer)
    if refs['children_count'] > 0 and not cascade:
        raise HTTPException(
            status_code=409,
            detail=(
                f"La capa tiene {refs['children_count']} hijo(s) activo(s). "
                'Reenvia con ?cascade=true para archivarlos junto con ella, o muevelos antes.'
            ),
        )
    if not force and (refs['in_initial_order'] or refs['eventos']):
        raise HTTPException(
            status_code=409,
            detail={
                'message': 'La capa está referenciada. Reenvía con ?force=true para archivar de todos modos.',
                'references': refs,
            },
        )

    if cascade:
        archivadas = layer_service.soft_delete_subtree(db, layer, deleted_by=current_user.email)
    else:
        layer_service.soft_delete_layer(db, layer, deleted_by=current_user.email)
        archivadas = [layer.id]
    db.commit()
    notify_tree_changed()
    return {'id': layer_id, 'deletedAt': layer.deleted_at, 'references': refs, 'archived': archivadas}


@router.post('/{layer_id}/restore', response_model=LayerResponse)
async def restore_layer(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    if layer.deleted_at is None:
        raise HTTPException(status_code=409, detail='La capa no está en papelera')

    if layer.parent_id:
        parent = db.query(Layer).filter(Layer.id == layer.parent_id).first()
        if parent is None or parent.deleted_at is not None:
            raise HTTPException(
                status_code=409,
                detail=f"El padre '{layer.parent_id}' no existe o también está en papelera. Restaura el padre primero.",
            )
    layer_service.restore_layer(db, layer, restored_by=current_user.email)
    db.commit()
    db.refresh(layer)
    notify_tree_changed()
    return layer


@router.delete('/{layer_id}/purge', status_code=204)
async def purge_layer(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
):
    """Hard delete real. Solo permitido sobre capas ya en papelera."""
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    try:
        layer_service.purge_layer(db, layer)
        db.commit()
        notify_tree_changed()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return None


@router.patch('/reorder')
async def reorder_layers(
    body: ReorderBody,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
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
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
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


@router.patch('/initial-order')
async def update_initial_order(
    body: InitialOrderBody,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
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
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_mapalab_manage),
    _rl: Usuario = Depends(write_rate_limit),
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
