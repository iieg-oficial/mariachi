from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.api.routes.layers._deps import require_admin, write_rate_limit
from app.core.database import get_dataengine_db
from app.models.user import Usuario
from app.schemas.layer import (
    HighlightBulkApplyBody,
    HighlightBulkApplyResult,
    HighlightBulkRestoreBody,
    HighlightResetBody,
    HighlightStats,
)
from app.services import layer_service
from app.services.mapalab_notifier import notify_tree_changed


router = APIRouter(prefix='/layers/highlight')


@router.get('/stats', response_model=HighlightStats)
async def get_stats(
    db: Session = Depends(get_dataengine_db),
    _admin: Usuario = Depends(require_admin),
):
    return layer_service.get_highlight_stats(db)


@router.post('/bulk', response_model=HighlightBulkApplyResult)
async def bulk_apply(
    data: HighlightBulkApplyBody,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_admin),
    _rl: Usuario = Depends(write_rate_limit),
):
    if not data.dry_run and data.color is None and data.shape is None and data.apply_to == 'defaults':
        raise HTTPException(
            status_code=400,
            detail='Especifique al menos color o shape para aplicar a defaults',
        )
    try:
        result = layer_service.bulk_apply_highlight(
            db,
            color=data.color,
            shape=data.shape,
            apply_to=data.apply_to,
            theme_ids=data.theme_ids,
            dry_run=data.dry_run,
            updated_by=current_user.email,
        )
        if not data.dry_run and result['affected'] > 0:
            db.commit()
            notify_tree_changed()
        return result
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post('/restore', response_model=HighlightBulkApplyResult)
async def restore_snapshot(
    data: HighlightBulkRestoreBody,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_admin),
    _rl: Usuario = Depends(write_rate_limit),
):
    snapshot_dicts = [s.model_dump() for s in data.snapshot]
    affected = layer_service.restore_highlight_snapshot(
        db, snapshot=snapshot_dicts, updated_by=current_user.email,
    )
    if affected > 0:
        db.commit()
        notify_tree_changed()
    return {'affected': affected, 'snapshot': []}


@router.post('/reset', response_model=HighlightBulkApplyResult)
async def reset_all(
    data: HighlightResetBody,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_admin),
    _rl: Usuario = Depends(write_rate_limit),
):
    result = layer_service.reset_highlight(
        db,
        theme_ids=data.theme_ids,
        dry_run=data.dry_run,
        updated_by=current_user.email,
    )
    if not data.dry_run and result['affected'] > 0:
        db.commit()
        notify_tree_changed()
    return result
