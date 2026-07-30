from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_project_access, require_role, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db, get_db
from app.models.acervo_bucket import AcervoBucket
from app.models.bulk_ingest_plan import BulkIngestPlan
from app.models.user import Usuario
from app.schemas.bulk_ingest import (
    BulkIngestApplyResult,
    BulkIngestApplySelection,
    BulkIngestColumnPreset,
    BulkIngestPlanResponse,
    BulkIngestUploadResponse,
)
from app.services.acervo import AcervoClient
from app.services.bulk_ingest_parser import (
    MAPALAB_EXCEL_PRESET,
    TECHNICAL_FIELDS,
    BulkIngestParseError,
    apply_mapping,
    parse_source,
)
from app.services.bulk_ingest_planner import apply_plan as run_apply_plan
from app.services.bulk_ingest_planner import build_plan

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix='/layer-metadata/bulk',
    tags=['layer-metadata-bulk'],
    dependencies=[Depends(require_project_access('mapalab'))],
)

_require_editor = require_project_access('mapalab', min_role='editor')
_require_admin = require_role(['tetlamamakani'])
_write_rate_limit = rate_limit(max_requests=20, window_seconds=60.0)

_PLAN_TTL_HOURS = 24
_MAX_FILE_BYTES = 10 * 1024 * 1024
_BULK_BUCKET_PREFIX = 'bulk-ingest'


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_mariachi_bucket(db: Session) -> AcervoBucket:
    bucket = (
        db.query(AcervoBucket)
        .filter(AcervoBucket.acervo_bucket == 'mariachi', AcervoBucket.is_active.is_(True))
        .first()
    )
    if bucket is None:
        raise HTTPException(
            status_code=500,
            detail="Bucket 'mariachi' no configurado en acervo.buckets",
        )
    return bucket


def _plan_or_404(de_db: Session, plan_id: uuid.UUID, current_user: Usuario) -> BulkIngestPlan:
    plan = de_db.query(BulkIngestPlan).filter(BulkIngestPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail='Plan no encontrado')
    if plan.created_by != current_user.email and current_user.role != 'tetlamamakani':
        raise HTTPException(status_code=403, detail='Plan pertenece a otro usuario')
    if plan.expires_at < _now_utc() and plan.status == 'pending':
        plan.status = 'expired'
        de_db.commit()
        de_db.refresh(plan)
    return plan


def _serialize_plan(plan: BulkIngestPlan) -> dict:
    return {
        'plan_id': plan.id,
        'created_at': plan.created_at,
        'created_by': plan.created_by,
        'dependencia': plan.dependencia,
        'source_filename': plan.source_filename,
        'source_object_key': plan.source_object_key,
        'status': plan.status,
        'expires_at': plan.expires_at,
        'applied_at': plan.applied_at,
        'applied_by': plan.applied_by,
        'column_mapping': plan.column_mapping,
        'plan': plan.plan_json,
    }


@router.get('/column-presets', response_model=list[BulkIngestColumnPreset])
async def list_column_presets(
    current_user: Usuario = Depends(_require_editor),
):
    return [
        BulkIngestColumnPreset(
            slug='mapalab-excel',
            label='Track de capas MapaLab (Excel)',
            description='Mapeo de las cabeceras humanas del Excel del MapaLab a campos técnicos.',
            mapping=MAPALAB_EXCEL_PRESET,
        ),
    ]


@router.post('/upload', response_model=BulkIngestUploadResponse)
async def upload_and_plan(
    file: UploadFile = File(...),
    dependencia: str = Form(...),
    column_mapping: str = Form(...),
    db: Session = Depends(get_db),
    de_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
    _rl: Usuario = Depends(_write_rate_limit),
):
    try:
        mapping = json.loads(column_mapping)
        if not isinstance(mapping, dict):
            raise ValueError('column_mapping debe ser objeto JSON')
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f'column_mapping inválido: {exc}')

    invalid_targets = [
        v for v in mapping.values()
        if v and v not in TECHNICAL_FIELDS
    ]
    if invalid_targets:
        raise HTTPException(
            status_code=400,
            detail=f'Campos destino desconocidos: {sorted(set(invalid_targets))}',
        )
    if 'layer_key' not in mapping.values():
        raise HTTPException(
            status_code=400,
            detail='El mapeo debe incluir una columna mapeada a layer_key',
        )

    content = await file.read()
    if len(content) > _MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f'Archivo excede {_MAX_FILE_BYTES // (1024 * 1024)} MB',
        )

    try:
        headers, raw_rows = parse_source(file.filename or '', content)
    except BulkIngestParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not raw_rows:
        raise HTTPException(status_code=400, detail='Archivo sin filas de datos')

    normalized = apply_mapping(headers, raw_rows, mapping)
    plan_data = build_plan(de_db.connection(), dependencia, file.filename or '', normalized)

    plan_id = uuid.uuid4()
    object_key: str | None = None
    try:
        bucket = _get_mariachi_bucket(db)
        client = AcervoClient.for_bucket(bucket)
        safe_name = (file.filename or 'source').replace('/', '_')
        object_key = f'{_BULK_BUCKET_PREFIX}/{plan_id}/{safe_name}'
        await file.seek(0)
        await client.upload_file(file, object_key)
    except HTTPException:
        raise
    except Exception:
        logger.exception('bulk_ingest acervo upload failed, plan_id=%s', plan_id)
        object_key = None

    expires_at = _now_utc() + timedelta(hours=_PLAN_TTL_HOURS)
    plan = BulkIngestPlan(
        id=plan_id,
        created_by=current_user.email,
        dependencia=dependencia,
        source_filename=file.filename or '',
        source_object_key=object_key,
        status='pending',
        plan_json=plan_data,
        column_mapping=mapping,
        expires_at=expires_at,
    )
    de_db.add(plan)
    de_db.commit()
    de_db.refresh(plan)

    unknown_headers = [h for h in headers if h not in mapping or not mapping[h]]

    return BulkIngestUploadResponse(
        plan_id=plan.id,
        expires_at=plan.expires_at,
        plan=plan_data,
        detected_headers=headers,
        unknown_headers=unknown_headers,
        column_mapping=mapping,
    )


@router.get('/plan/{plan_id}', response_model=BulkIngestPlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    de_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_editor),
):
    plan = _plan_or_404(de_db, plan_id, current_user)
    return _serialize_plan(plan)


@router.post('/plan/{plan_id}/apply', response_model=BulkIngestApplyResult)
async def apply_plan_endpoint(
    plan_id: uuid.UUID,
    selection: BulkIngestApplySelection | None = None,
    de_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
    _rl: Usuario = Depends(_write_rate_limit),
):
    plan = _plan_or_404(de_db, plan_id, current_user)

    if plan.status != 'pending':
        raise HTTPException(
            status_code=409,
            detail=f"Plan en estado '{plan.status}', no se puede aplicar",
        )

    sel_keys: set[str] | None = None
    if selection and selection.layer_keys is not None:
        sel_keys = set(selection.layer_keys)

    result = run_apply_plan(
        de_db.connection(),
        plan.plan_json,
        dependencia=plan.dependencia,
        updated_by=current_user.email,
        selection=sel_keys,
    )

    plan.status = 'applied'
    plan.applied_at = _now_utc()
    plan.applied_by = current_user.email
    de_db.commit()
    de_db.refresh(plan)

    return BulkIngestApplyResult(
        plan_id=plan.id,
        applied_at=plan.applied_at,
        applied_by=plan.applied_by,
        metadata_inserts=result['metadata_inserts'],
        metadata_updates=result['metadata_updates'],
        stats_inserts=result['stats_inserts'],
        stats_updates=result['stats_updates'],
        skipped=result['skipped'],
        conflicts=result['conflicts'],
    )


@router.delete('/plan/{plan_id}', status_code=204)
async def cancel_plan(
    plan_id: uuid.UUID,
    de_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    plan = _plan_or_404(de_db, plan_id, current_user)
    if plan.status != 'pending':
        raise HTTPException(
            status_code=409,
            detail=f"Plan en estado '{plan.status}', no se puede cancelar",
        )
    plan.status = 'cancelled'
    de_db.commit()
    return None
