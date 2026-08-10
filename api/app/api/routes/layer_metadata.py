from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_permission, verify_csrf
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
from app.services.grid_batch import diff_states, record_cell_history
from app.services.grids.layer_metadata_grid import SPEC as METADATA_GRID_SPEC
from app.services.grids.layer_metadata_grid import load_states
from app.services.mapalab_notifier import notify_tree_changed
from app.services.stats_templates import (
    StatsTemplateError,
    execute_stats_batch,
    validate_stats_config,
)

router = APIRouter(
    prefix='/layer-metadata',
    tags=['layer-metadata'],
)

_require_project_editor = require_permission("mariachi.mapalab.update")
_require_manage = require_permission("mariachi.mapalab.manage")
_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0)


@router.get('', response_model=list[LayerMetadataResponse])
async def list_metadata(
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_project_editor),
):
    return db.query(LayerMetadata).order_by(LayerMetadata.layer_key).all()


# NOTA: las rutas con sub-paths fijos (/stats, /stats/preview, /stats/refresh) DEBEN
# declararse ANTES del catch-all `{layer_key:path}` porque el `:path` matchea barras
# y absorbería rutas como "salud:unidades_salud/stats" como un solo layer_key.

@router.get('/{layer_key:path}/stats/preview')
async def preview_stat_get_unsupported(layer_key: str):
    raise HTTPException(status_code=405, detail="Use POST")


@router.post('/{layer_key:path}/stats/preview')
async def preview_stat(
    layer_key: str,
    cfg: dict = Body(...),
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_write_rate_limit),
):
    try:
        validated = validate_stats_config([cfg])[0]
    except StatsTemplateError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    values, errors = execute_stats_batch(db.connection(), [validated])
    if errors:
        raise HTTPException(status_code=502, detail=f"Error ejecutando stat: {errors[0]['error']}")
    return {'value': values[0]['valor'], 'config': validated}


@router.post('/{layer_key:path}/stats/refresh', response_model=LayerStatsResponse)
async def refresh_stats(
    layer_key: str,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_project_editor),
    _rl: Usuario = Depends(_write_rate_limit),
):
    row = db.query(LayerStats).filter(LayerStats.layer_key == layer_key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Stats '{layer_key}' no encontrados")

    cfgs = row.stats_config or []
    if not cfgs:
        raise HTTPException(
            status_code=400,
            detail='Esta capa no tiene configuracion de estadisticas guardada; '
                   'guarda la configuracion antes de recalcular',
        )

    values, errors = execute_stats_batch(db.connection(), cfgs)

    if not values:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail='Ninguna estadistica pudo calcularse; se conservan los valores anteriores. '
                   + '; '.join(f"pos {e['position']}: {e['error']}" for e in errors),
        )

    row.values = values
    row.values_refreshed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)

    response = LayerStatsResponse.model_validate(row)
    return response.model_copy(update={'errors': errors})


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
    _admin: Usuario = Depends(_require_manage),
    _rl: Usuario = Depends(_write_rate_limit),
):
    meta = db.query(LayerMetadata).filter(LayerMetadata.layer_key == layer_key).first()
    if not meta:
        raise HTTPException(status_code=404, detail=f"Metadata '{layer_key}' no encontrada")

    before = load_states(db.connection(), layer_key)

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
    row.updated_by = current_user.email
    row.updated_at = datetime.now(timezone.utc)

    db.flush()
    record_cell_history(
        db.connection(),
        METADATA_GRID_SPEC,
        diff_states(METADATA_GRID_SPEC, layer_key, before, load_states(db.connection(), layer_key)),
        current_user.email,
        source='formulario',
    )

    db.commit()
    db.refresh(row)
    notify_tree_changed()
    return row


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

    before = load_states(db.connection(), layer_key)

    payload = data.model_dump(exclude_unset=True, by_alias=False)
    for key, value in payload.items():
        if key in ('fuentes', 'metodologia') and value is not None:
            normalized = value if isinstance(value, list) else [value]
            normalized = [it for it in normalized if it and any(v is not None and v != '' for v in it.values())]
            setattr(row, key, normalized or None)
        elif key == 'metadato' and value is not None:
            setattr(row, key, [item if isinstance(item, dict) else item.model_dump() for item in value])
        else:
            setattr(row, key, value)
    row.updated_by = current_user.email

    db.flush()
    record_cell_history(
        db.connection(),
        METADATA_GRID_SPEC,
        diff_states(METADATA_GRID_SPEC, layer_key, before, load_states(db.connection(), layer_key)),
        current_user.email,
        source='formulario',
    )

    db.commit()
    db.refresh(row)
    return row
