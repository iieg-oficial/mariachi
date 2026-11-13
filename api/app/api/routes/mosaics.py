from __future__ import annotations

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.api.deps import require_permission, verify_csrf
from app.api.rate_limit import _client_ip, rate_limit
from app.core.database import get_dataengine_db, get_db
from app.core.settings import get_settings
from app.models.layer import Workspace
from app.models.user import Usuario
from app.services.actividad_service import registrar_actividad
from app.services.geoserver_client import GeoServerError
from app.services.mapalab_notifier import notify_tree_changed
from app.services.mosaic_client import MosaicClient
from app.services.mosaic_publish import (
    enable_time,
    harvest_new,
    inspect_folder,
    mosaic_status,
    publish_mosaic,
)
from app.services.mosaic_service import MosaicError, list_mosaics, reindex_mosaic

router = APIRouter(prefix='/geoserver', tags=['geoserver-mosaicos'])

_require_manage = require_permission('mariachi.geoserver.manage')
_read_rate_limit = rate_limit(max_requests=120, window_seconds=60.0, scope='mosaic_read')
_write_rate_limit = rate_limit(max_requests=10, window_seconds=60.0, scope='mosaic_write')


@router.get('/mosaicos')
async def listar_mosaicos(
    current_user: Usuario = Depends(_require_manage),
    _rl: Usuario = Depends(_read_rate_limit),
):
    client = MosaicClient()
    try:
        mosaicos = await run_in_threadpool(list_mosaics, client)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {'mosaicos': mosaicos}


@router.post('/mosaicos/reindexar')
async def reindexar_mosaico(
    request: Request,
    workspace: str = Body(..., embed=True),
    store: str = Body(..., embed=True),
    reset: bool = Body(default=True, embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_manage),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    client = MosaicClient()
    try:
        resultado = await run_in_threadpool(reindex_mosaic, client, workspace, store, reset)
    except MosaicError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    registrar_actividad(
        db,
        actor=current_user,
        action='geoserver.mosaico.reindexar',
        resource_type='geoserver.mosaico',
        resource_id=f'{workspace}:{store}',
        metadata={
            'borrados': resultado['deleted'],
            'conservados': resultado['preserved'],
            'respaldo': resultado['backup'],
            'render_antes': resultado['render_before'],
            'render_despues': resultado['render_after'],
        },
        ip=_client_ip(request),
    )
    db.commit()
    return resultado


def _subir_version_de_leyendas(dataengine: Session) -> int:
    dataengine.query(Workspace).update(
        {Workspace.legend_version: Workspace.legend_version + 1},
        synchronize_session=False,
    )
    dataengine.commit()
    return dataengine.query(Workspace).count()


@router.post('/reset')
async def reset_geoserver(
    request: Request,
    db: Session = Depends(get_db),
    dataengine: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(_require_manage),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    client = MosaicClient()
    try:
        await run_in_threadpool(client.reset)
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    workspaces = _subir_version_de_leyendas(dataengine)
    notify_tree_changed()

    registrar_actividad(
        db,
        actor=current_user,
        action='geoserver.reset',
        resource_type='geoserver',
        resource_id=None,
        metadata={'leyendas_workspaces': workspaces},
        ip=_client_ip(request),
    )
    db.commit()
    return {'ok': True, 'leyendas_workspaces': workspaces}


async def _run(func, *args):
    try:
        return await run_in_threadpool(func, *args)
    except MosaicError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except GeoServerError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


def _registrar_mosaico(
    db: Session, request: Request, actor: Usuario, action: str, workspace: str, store: str, metadata: dict
) -> None:
    registrar_actividad(
        db,
        actor=actor,
        action=action,
        resource_type='geoserver.mosaico',
        resource_id=f'{workspace}:{store}',
        metadata=metadata,
        ip=_client_ip(request),
    )
    db.commit()


@router.get('/mosaicos/carpeta')
async def inspeccionar_carpeta(
    path: str = Query(..., min_length=1),
    current_user: Usuario = Depends(_require_manage),
    _rl: Usuario = Depends(_read_rate_limit),
):
    return await _run(inspect_folder, MosaicClient(), path)


@router.get('/mosaicos/estado')
async def estado_mosaico(
    workspace: str = Query(..., min_length=1),
    store: str = Query(..., min_length=1),
    current_user: Usuario = Depends(_require_manage),
    _rl: Usuario = Depends(_read_rate_limit),
):
    return await _run(mosaic_status, MosaicClient(), workspace, store)


@router.post('/mosaicos/publicar', status_code=201)
async def publicar_mosaico(
    request: Request,
    workspace: str = Body(..., embed=True),
    path: str = Body(..., embed=True),
    date_format: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_manage),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    data_dir = get_settings().geoserver_data_dir
    resultado = await _run(publish_mosaic, MosaicClient(), workspace, path, date_format, data_dir)
    notify_tree_changed()
    _registrar_mosaico(db, request, current_user, 'geoserver.mosaico.publicar', workspace, resultado['store'], {
        'carpeta': resultado['path'],
        'formato': date_format,
        'periodos': resultado['periods'],
        'anuncia_time': resultado['advertised'],
    })
    return resultado


@router.post('/mosaicos/activar-tiempo')
async def activar_tiempo(
    request: Request,
    workspace: str = Body(..., embed=True),
    store: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_manage),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    client = MosaicClient()
    await _run(enable_time, client, workspace, store)
    estado = await _run(mosaic_status, client, workspace, store)
    notify_tree_changed()
    _registrar_mosaico(db, request, current_user, 'geoserver.mosaico.activar_tiempo', workspace, store, {
        'anuncia_time': estado['advertised'],
    })
    return estado


@router.post('/mosaicos/cosechar')
async def cosechar_mosaico(
    request: Request,
    workspace: str = Body(..., embed=True),
    store: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_manage),
    _csrf: Usuario = Depends(verify_csrf),
    _rl: Usuario = Depends(_write_rate_limit),
):
    data_dir = get_settings().geoserver_data_dir
    resultado = await _run(harvest_new, MosaicClient(), workspace, store, data_dir)
    notify_tree_changed()
    _registrar_mosaico(db, request, current_user, 'geoserver.mosaico.cosechar', workspace, store, {
        'cosechados': resultado['harvested'],
        'fallidos': [f['name'] for f in resultado['failed']],
    })
    return resultado
