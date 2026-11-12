import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_db, require_permission, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_dataengine_db
from app.models.layer import Workspace
from app.models.user import Usuario
from app.schemas.borrador import BorradorResponse
from app.services import estilos_lote, estilos_lote_estilo
from app.services.estilos_lote_archivo import leer_archivo
from app.services.estilos_lote_tabla import TablaInvalidaError
from app.services.geoserver_client import GeoServerError

router = APIRouter(prefix='/geoserver/estilos-lote', tags=['geoserver'])

_require_geoserver_manage = require_permission('mariachi.geoserver.manage')
_lote_rate_limit = rate_limit(max_requests=20, window_seconds=60.0, scope='estilos_lote')
_preview_rate_limit = rate_limit(max_requests=240, window_seconds=60.0, scope='estilos_lote_preview')

MAX_TABLA = 500_000
MAX_ARCHIVO = 5_000_000
MAX_FILAS = 500


class TablaIn(BaseModel):
    texto: str = Field(max_length=MAX_TABLA)
    reemplazar: list[int] = Field(default_factory=list, max_length=MAX_FILAS)


class EditarIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=MAX_FILAS)


class VistaPreviaIn(BaseModel):
    alias: str
    layer_name: str
    fila: dict | None = None
    sld: str | None = Field(default=None, max_length=MAX_TABLA)


class EstiloIn(BaseModel):
    alias: str
    estilo: str


class XmlIn(EstiloIn):
    capa: str = ''
    xml: str = Field(min_length=1, max_length=MAX_TABLA)


def _workspace(dataengine_db: Session, alias: str) -> str:
    ws = dataengine_db.query(Workspace).filter(Workspace.alias == alias).first()
    if ws is None:
        raise HTTPException(status_code=404, detail=f"Workspace alias '{alias}' no existe")
    return ws.geoserver_workspace


def _tabla_invalida(exc: TablaInvalidaError) -> HTTPException:
    filas = getattr(exc, 'filas', None)
    detalle = {'mensaje': str(exc), 'filas': [f.to_dict() for f in filas] if filas else []}
    return HTTPException(status_code=422, detail=detalle)


@router.post('/leer-archivo')
async def leer_archivo_tabla(
    archivo: UploadFile = File(...),
    _user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_lote_rate_limit),
):
    contenido = await archivo.read(MAX_ARCHIVO + 1)
    if len(contenido) > MAX_ARCHIVO:
        raise HTTPException(status_code=413, detail='El archivo pesa más de 5 MB')
    try:
        texto = await run_in_threadpool(leer_archivo, archivo.filename or '', contenido)
    except TablaInvalidaError as exc:
        raise _tabla_invalida(exc) from exc
    return {'texto': texto}


@router.get('/sin-publicar', response_model=list[BorradorResponse])
async def sin_publicar(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_geoserver_manage),
):
    return estilos_lote.borradores_sin_publicar(db)


@router.get('/historial', response_model=list[BorradorResponse])
async def historial(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(_require_geoserver_manage),
):
    return estilos_lote.historial(db)


@router.post('/revisar')
async def revisar_tabla(
    tabla: TablaIn,
    dataengine_db: Session = Depends(get_dataengine_db),
    _user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_lote_rate_limit),
):
    try:
        filas = await run_in_threadpool(estilos_lote.revisar, tabla.texto, dataengine_db)
    except TablaInvalidaError as exc:
        raise _tabla_invalida(exc) from exc
    return {'filas': [f.to_dict() for f in filas]}


@router.post('/editar')
async def editar_borradores(
    pedido: EditarIn,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    _user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_lote_rate_limit),
):
    try:
        texto = estilos_lote.tabla_de_borradores(pedido.ids, db, dataengine_db)
        filas = await run_in_threadpool(estilos_lote.revisar, texto, dataengine_db)
    except TablaInvalidaError as exc:
        raise _tabla_invalida(exc) from exc
    return {'filas': [f.to_dict() for f in filas]}


@router.post('/desde-estilo')
async def desde_estilo(
    pedido: EstiloIn,
    dataengine_db: Session = Depends(get_dataengine_db),
    _user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_lote_rate_limit),
):
    workspace = _workspace(dataengine_db, pedido.alias)
    try:
        texto = await run_in_threadpool(estilos_lote_estilo.tabla_de_estilo, workspace, pedido.estilo)
        filas = await run_in_threadpool(estilos_lote.revisar, texto, dataengine_db)
    except TablaInvalidaError as exc:
        raise _tabla_invalida(exc) from exc
    except GeoServerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return {'filas': [f.to_dict() for f in filas]}


@router.post('/xml', response_model=BorradorResponse, status_code=201)
async def guardar_xml(
    pedido: XmlIn,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_lote_rate_limit),
):
    _workspace(dataengine_db, pedido.alias)
    try:
        return estilos_lote_estilo.guardar_xml(db, pedido.alias, pedido.estilo, pedido.capa, pedido.xml, current_user)
    except TablaInvalidaError as exc:
        raise _tabla_invalida(exc) from exc


@router.post('/borradores', response_model=list[BorradorResponse], status_code=201)
async def crear_borradores(
    tabla: TablaIn,
    db: Session = Depends(get_db),
    dataengine_db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_lote_rate_limit),
):
    try:
        return await run_in_threadpool(
            estilos_lote.crear_borradores, tabla.texto, db, dataengine_db, current_user, None, tabla.reemplazar,
        )
    except TablaInvalidaError as exc:
        raise _tabla_invalida(exc) from exc


@router.post('/vista-previa')
async def vista_previa(
    pedido: VistaPreviaIn,
    width: int = Query(default=360, ge=120, le=800),
    dataengine_db: Session = Depends(get_dataengine_db),
    _user: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_geoserver_manage),
    _rl: Usuario = Depends(_preview_rate_limit),
):
    workspace = _workspace(dataengine_db, pedido.alias)
    try:
        imagen = await run_in_threadpool(
            estilos_lote.vista_previa, workspace, pedido.layer_name, pedido.fila, width, None, pedido.sld,
        )
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail='GeoServer tardó demasiado') from exc
    except (GeoServerError, httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return Response(content=imagen, media_type='image/png', headers={'Cache-Control': 'no-store'})
