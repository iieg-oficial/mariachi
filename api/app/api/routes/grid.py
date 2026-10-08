from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import quote, unquote

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, has_permission, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db, get_db
from app.models.user import Usuario
from app.schemas.grid import (
    GridCellsRequest,
    GridCellsResponse,
    GridRowsResponse,
)
from app.services import grid_export, presence
from app.services.grid_batch import CellChange, GridBatchError, GridSpec, apply_cell_changes
from app.services.grids import get_spec

router = APIRouter(prefix='/grid', tags=['grid'])

_write_rate_limit = rate_limit(max_requests=60, window_seconds=60.0)

_SESSION_FACTORIES = {
    'mariachi': contextmanager(get_db),
    'dataengine': contextmanager(get_dataengine_db),
}


def _resolve_spec(resource: str) -> GridSpec:
    spec = get_spec(resource)
    if spec is None:
        raise HTTPException(status_code=404, detail=f"Grid '{resource}' no encontrado")
    return spec


async def _authorize(spec: GridSpec, current_user: Usuario, db: Session) -> None:
    if not spec.permission:
        return
    if not has_permission(current_user, spec.permission):
        raise HTTPException(
            status_code=403, detail=f"Requiere permiso: {spec.permission}"
        )


def _session(spec: GridSpec):
    factory = _SESSION_FACTORIES.get(spec.database)
    if factory is None:
        raise HTTPException(status_code=500, detail=f"Base '{spec.database}' no soportada")
    return factory()


def _presence_id(row_key: str) -> str:
    return quote(row_key, safe='')


@router.get('/{resource}/rows', response_model=GridRowsResponse, response_model_by_alias=True)
async def list_rows(
    resource: str,
    workspace: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    with _session(spec) as session:
        rows = spec.fetch_rows(session.connection(), workspace=workspace, search=search)

    return {
        'resource': spec.key,
        'row_key_field': spec.row_key_field,
        'columns': spec.columns_meta,
        'rows': rows,
    }


@router.patch('/{resource}/cells', response_model=GridCellsResponse, response_model_by_alias=True)
async def patch_cells(
    resource: str,
    payload: GridCellsRequest,
    current_user: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
    _rl: Usuario = Depends(_write_rate_limit),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    if not payload.changes:
        return {'applied': 0, 'rows_touched': 0, 'conflicts': [], 'rejected': []}

    changes = [
        CellChange(
            row_key=item.row_key,
            column=item.column,
            from_value=item.from_value,
            to_value=item.to_value,
        )
        for item in payload.changes
    ]

    with _session(spec) as session:
        try:
            result = apply_cell_changes(
                session.connection(), spec, changes, current_user.email
            )
        except GridBatchError as exc:
            session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception:
            session.rollback()
            raise
        session.commit()

    if spec.on_commit is not None and result['applied'] > 0:
        spec.on_commit()

    return result


@router.get('/{resource}/historial')
async def list_history(
    resource: str,
    row_key: str | None = Query(default=None, alias='rowKey', max_length=300),
    date_from: str | None = Query(default=None, alias='desde'),
    date_to: str | None = Query(default=None, alias='hasta'),
    limit: int = Query(default=200, le=2000),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    with _session(spec) as session:
        history = grid_export.fetch_history(
            session.connection(),
            spec,
            row_keys=[row_key] if row_key else None,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )
    return history


@router.get('/{resource}/export')
async def export_grid(
    resource: str,
    export_format: str = Query(default='xlsx', alias='formato', pattern='^(xlsx|csv)$'),
    sheet: str = Query(default='metadatos', alias='hoja', pattern='^(metadatos|historial)$'),
    workspace: str | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    date_from: str | None = Query(default=None, alias='desde'),
    date_to: str | None = Query(default=None, alias='hasta'),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    with _session(spec) as session:
        conn = session.connection()
        rows = spec.fetch_rows(conn, workspace=workspace, search=search)
        row_keys = [row[spec.row_key_field] for row in rows]
        history = grid_export.fetch_history(
            conn,
            spec,
            row_keys=row_keys if (workspace or search) else None,
            date_from=date_from,
            date_to=date_to,
        )

    rows_headers, rows_body = grid_export.build_rows_sheet(spec, rows)
    history_headers, history_body = grid_export.build_history_sheet(spec, history)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%d')

    if export_format == 'csv':
        headers, body = (
            (history_headers, history_body) if sheet == 'historial' else (rows_headers, rows_body)
        )
        content = grid_export.to_csv(headers, body)
        filename = f'{spec.key}-{sheet}-{stamp}.csv'
        media_type = 'text/csv; charset=utf-8'
    else:
        content = grid_export.to_xlsx([
            ('Metadatos', rows_headers, rows_body),
            ('Historial', history_headers, history_body),
        ])
        filename = f'{spec.key}-{stamp}.xlsx'
        media_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    return Response(
        content=content,
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('/{resource}/presencia')
async def list_presence(
    resource: str,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    by_resource = presence.list_by_resource(spec.presence_scope, current_user.username)
    return {unquote(key): value for key, value in by_resource.items()}


@router.put('/{resource}/presencia')
async def register_presence(
    resource: str,
    row_key: str | None = Body(default=None, embed=True, alias='rowKey'),
    current_user: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    if row_key:
        presence.register(
            spec.presence_scope,
            _presence_id(row_key),
            current_user.username,
            current_user.name,
        )
    return {'ok': True}


@router.delete('/{resource}/presencia')
async def clear_presence(
    resource: str,
    row_key: str | None = Query(default=None, alias='rowKey'),
    current_user: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    spec = _resolve_spec(resource)
    await _authorize(spec, current_user, db)

    if row_key:
        presence.unregister(spec.presence_scope, _presence_id(row_key), current_user.username)
    return {'ok': True}
