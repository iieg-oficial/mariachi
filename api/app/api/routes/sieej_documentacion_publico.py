import hashlib
import hmac
import json
import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import Field, ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.settings import get_settings
from app.core.time import utcnow
from app.models.sieej_documentacion import MedicionDoc, PipelineDoc, SincronizacionDoc
from app.schemas._camel import CamelCaseInput
from app.schemas.mapalab_event import MAX_BATCH_EVENTS, EventBatchResponse
from app.schemas.sieej_documentacion import (
    PipelinePublico,
    PipelinePublicoResumen,
    Salud,
    SyncIn,
    SyncResultado,
)
from app.services.mapalab_telemetry import ingest_batch
from app.services.sieej_documentacion import cache, paginas
from app.services.sieej_documentacion.sync import aplicar_sync

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sieej-documentacion", tags=["sieej documentacion publica"])

HORAS_PARA_ATRASO = 26
EVENTOS = frozenset({"page_view", "pipeline_ver", "vistas_ver", "diagrama_zoom", "enlace_salida"})


def verificar_clave_sincronizador(x_api_key: str = Header(default="")) -> None:
    esperado = (get_settings().sieej_documentacion_sync_sha256 or "").strip().lower()
    recibido = hashlib.sha256(x_api_key.encode()).hexdigest()
    if not esperado or not x_api_key or not hmac.compare_digest(recibido, esperado):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")


class EventoDoc(CamelCaseInput):
    event_name: str = Field(..., max_length=50)
    ts: None = None
    layer_id: None = None
    props: dict = Field(default_factory=dict)


class LoteEventosDoc(CamelCaseInput):
    session_id: UUID
    source: Literal["pagina"] = "pagina"
    referrer: str | None = Field(default=None, max_length=500)
    pathname: str | None = Field(default=None, max_length=200)
    events: list[EventoDoc] = Field(..., min_length=1, max_length=MAX_BATCH_EVENTS)


def _publicados(db: Session) -> list[PipelineDoc]:
    return (
        db.query(PipelineDoc)
        .filter(
            PipelineDoc.visible.is_(True),
            PipelineDoc.estado != "retirado",
            PipelineDoc.contenido_publicado.isnot(None),
        )
        .order_by(PipelineDoc.orden, PipelineDoc.clave)
        .all()
    )


def _json(payload: str) -> Response:
    return Response(content=payload, media_type="application/json")


@router.get("/version")
async def version() -> dict[str, str]:
    return {"version": cache.version_actual()}


@router.get("/pipelines", response_model=list[PipelinePublicoResumen])
async def listar(db: Session = Depends(get_db)) -> Response:
    version_cache, guardado = cache.leer("lista")
    if guardado is not None:
        return _json(guardado)
    mediciones = {m.pipeline_id: m for m in db.query(MedicionDoc).all()}
    lista = [paginas.resumen_publico(p, mediciones.get(p.id)) for p in _publicados(db)]
    payload = json.dumps([r.model_dump(mode="json") for r in lista])
    cache.guardar("lista", version_cache, payload)
    return _json(payload)


@router.get("/pipelines/{clave}", response_model=PipelinePublico)
async def obtener(clave: str, db: Session = Depends(get_db)) -> Response:
    version_cache, guardado = cache.leer(f"pipeline:{clave}")
    if guardado is not None:
        return _json(guardado)
    pipeline = next((p for p in _publicados(db) if p.clave == clave), None)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline no encontrado")
    payload = paginas.publica(pipeline, db.get(MedicionDoc, pipeline.id)).model_dump_json()
    cache.guardar(f"pipeline:{clave}", version_cache, payload)
    return _json(payload)


@router.get("/salud", response_model=Salud)
async def salud(db: Session = Depends(get_db)) -> Salud:
    ultima = db.query(SincronizacionDoc).order_by(SincronizacionDoc.id.desc()).first()
    publicados = len(_publicados(db))
    if ultima is None:
        return Salud(
            estado="sin_sincronizar",
            ultima_sincronizacion=None,
            horas_desde_ultima=None,
            estado_ultima=None,
            pipelines_publicados=publicados,
        )
    horas = (utcnow() - ultima.terminado_en).total_seconds() / 3600
    return Salud(
        estado="ok" if horas <= HORAS_PARA_ATRASO else "atrasada",
        ultima_sincronizacion=ultima.terminado_en,
        horas_desde_ultima=round(horas, 2),
        estado_ultima=ultima.estado,
        pipelines_publicados=publicados,
    )


@router.put(
    "/sync",
    response_model=SyncResultado,
    dependencies=[Depends(verificar_clave_sincronizador)],
)
async def sincronizar(payload: SyncIn, db: Session = Depends(get_db)) -> SyncResultado:
    resultado = aplicar_sync(db, payload)
    logger.info(
        "sieej_documentacion.sync estado=%s nuevos=%s actualizados=%s retirados=%s",
        resultado.estado,
        resultado.nuevos,
        resultado.actualizados,
        resultado.retirados,
    )
    return resultado


@router.post(
    "/eventos/lote",
    response_model=EventBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(verificar_clave_sincronizador)],
)
async def ingerir_eventos(request: Request, db: Session = Depends(get_db)) -> EventBatchResponse:
    try:
        lote = LoteEventosDoc.model_validate(await request.json())
    except (ValidationError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    lote.events = [e for e in lote.events if e.event_name in EVENTOS]
    if not lote.events:
        return EventBatchResponse(ok=True, inserted=0)
    insertados = ingest_batch(
        db,
        lote,
        user_agent=request.headers.get("x-visitante-ua") or request.headers.get("user-agent"),
        app=paginas.APP_TELEMETRIA,
    )
    return EventBatchResponse(ok=True, inserted=insertados)
