from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.api.routes.layers._deps import (
    require_admin,
    require_project_editor,
    write_rate_limit,
)
from app.core.database import get_dataengine_db
from app.models.layer import Layer, LayerAlias
from app.models.user import Usuario
from app.schemas.layer import LayerAliasCreate, LayerAliasResponse
from app.services import slug_service
from app.services.mapalab_notifier import notify_tree_changed

router = APIRouter()


@router.get('/{layer_id}/aliases', response_model=list[LayerAliasResponse])
async def list_layer_aliases(
    layer_id: str,
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")
    return (
        db.query(LayerAlias)
        .filter(LayerAlias.layer_id == layer_id)
        .order_by(LayerAlias.created_at)
        .all()
    )


@router.post(
    '/{layer_id}/aliases',
    response_model=LayerAliasResponse,
    status_code=201,
)
async def create_layer_alias(
    layer_id: str,
    body: LayerAliasCreate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_admin),
    _rl: Usuario = Depends(write_rate_limit),
):
    layer = db.query(Layer).filter(Layer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail=f"Capa '{layer_id}' no encontrada")

    if slug_service.slug_taken(db, body.alias):
        raise HTTPException(
            status_code=409,
            detail=f"Alias '{body.alias}' ya esta tomado por otra capa o slug canonico",
        )

    alias = LayerAlias(
        alias=body.alias,
        layer_id=layer_id,
        created_by=current_user.email,
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    notify_tree_changed()
    return alias


@router.delete('/{layer_id}/aliases/{alias}', status_code=204)
async def delete_layer_alias(
    layer_id: str,
    alias: str,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_admin),
    _rl: Usuario = Depends(write_rate_limit),
):
    row = (
        db.query(LayerAlias)
        .filter(LayerAlias.alias == alias, LayerAlias.layer_id == layer_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail=f"Alias '{alias}' no existe en capa '{layer_id}'")
    db.delete(row)
    db.commit()
    notify_tree_changed()
    return None
