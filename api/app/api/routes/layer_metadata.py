from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_project_access, require_role, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.layer_metadata import LayerMetadata, LayerStats
from app.models.user import Usuario
from app.schemas.layer_metadata import (
    LayerMetadataResponse,
    LayerMetadataUpdate,
    LayerStatsResponse,
    LayerStatsUpdate,
)
from app.services.mapalab_notifier import notify_tree_changed
from app.services.stats_templates import StatsTemplateError, validate_stats_config

router = APIRouter(
    prefix='/layer-metadata',
    tags=['layer-metadata'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

_require_project_editor = require_project_access('mapalab', min_role='editor')
_require_admin = require_role(['tetlamamakani'])
_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0)


@router.get('', response_model=list[LayerMetadataResponse])
async def list_metadata(
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
):
    return db.query(LayerMetadata).order_by(LayerMetadata.layer_key).all()


@router.get('/{layer_key:path}', response_model=LayerMetadataResponse)
async def get_metadata(
    layer_key: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
):
    row = db.query(LayerMetadata).filter(LayerMetadata.layer_key == layer_key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Metadata '{layer_key}' no encontrada")
    return row


@router.put('/{layer_key:path}', response_model=LayerMetadataResponse)
async def update_metadata(
    layer_key: str,
    data: LayerMetadataUpdate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_write_rate_limit),
):
    row = db.query(LayerMetadata).filter(LayerMetadata.layer_key == layer_key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Metadata '{layer_key}' no encontrada")

    payload = data.model_dump(exclude_unset=True, by_alias=False)
    for key, value in payload.items():
        if key in ('fuentes', 'metodologia') and value is not None:
            setattr(row, key, value)
        elif key == 'metadato' and value is not None:
            setattr(row, key, [item if isinstance(item, dict) else item.model_dump() for item in value])
        else:
            setattr(row, key, value)
    row.updated_by = current_user.email

    db.commit()
    db.refresh(row)
    return row


@router.get('/{layer_key:path}/stats', response_model=LayerStatsResponse)
async def get_stats(
    layer_key: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
):
    row = db.query(LayerStats).filter(LayerStats.layer_key == layer_key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Stats '{layer_key}' no encontrados")
    return row


@router.put('/{layer_key:path}/stats', response_model=LayerStatsResponse)
async def update_stats(
    layer_key: str,
    data: LayerStatsUpdate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    meta = db.query(LayerMetadata).filter(LayerMetadata.layer_key == layer_key).first()
    if not meta:
        raise HTTPException(status_code=404, detail=f"Metadata '{layer_key}' no encontrada")

    row = db.query(LayerStats).filter(LayerStats.layer_key == layer_key).first()
    if not row:
        row = LayerStats(layer_key=layer_key)
        db.add(row)

    payload = data.model_dump(exclude_unset=True, by_alias=False)

    if 'stats_config' in payload and payload['stats_config'] is not None:
        try:
            payload['stats_config'] = validate_stats_config(payload['stats_config'])
        except StatsTemplateError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    for key, value in payload.items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)
    notify_tree_changed()
    return row
