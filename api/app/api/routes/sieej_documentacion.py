import copy
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, null
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_current_user, get_db, require_permission, verify_csrf
from app.core.optimistic import check_concurrent_edit
from app.core.time import utcnow
from app.models.sieej_documentacion import (
    MedicionDoc,
    PipelineDoc,
    ReadmeDoc,
    SincronizacionDoc,
)
from app.models.user import Usuario
from app.schemas.sieej_documentacion import (
    AjustesPipeline,
    ContenidoPagina,
    PipelineDetalle,
    PipelineNuevo,
    PipelinePublico,
    PipelineResumen,
    Sincronizacion,
)
from app.services import presence
from app.services.actividad_service import registrar_actividad
from app.services.sieej_documentacion import cache, paginas
from app.services.sieej_documentacion.siembra import contenido_desde_readme, contenido_inicial

router = APIRouter(prefix="/sieej-documentacion", tags=["sieej documentacion"])

_editor = require_permission("mariachi.sieej_documentacion.update")
_publicador = require_permission("mariachi.sieej_documentacion.publish")
PRESENCIA = "sieej_documentacion"


def _pipeline_o_404(db: Session, clave: str) -> PipelineDoc:
    pipeline = db.query(PipelineDoc).filter(PipelineDoc.clave == clave).first()
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline no encontrado")
    return pipeline


def _registrar(db: Session, actor: Usuario, accion: str, clave: str) -> None:
    registrar_actividad(
        db,
        actor=actor,
        action=f"sieej_documentacion.{accion}",
        resource_type="sieej_documentacion_pipeline",
        resource_id=clave,
    )


@router.get("/pipelines", response_model=list[PipelineResumen])
async def listar(db: Session = Depends(get_db)) -> list[PipelineResumen]:
    mediciones = {m.pipeline_id: m for m in db.query(MedicionDoc).all()}
    readmes = {r.pipeline_id: r for r in db.query(ReadmeDoc).all()}
    visitas = paginas.visitas_por_pipeline(db)
    pipelines = db.query(PipelineDoc).order_by(PipelineDoc.orden, PipelineDoc.clave).all()
    return [
        paginas.resumen(p, mediciones.get(p.id), readmes.get(p.id), visitas) for p in pipelines
    ]


@router.post("/pipelines", response_model=PipelineDetalle, status_code=status.HTTP_201_CREATED)
async def crear(
    nuevo: PipelineNuevo,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_editor),
) -> PipelineDetalle:
    if db.query(PipelineDoc).filter(PipelineDoc.clave == nuevo.clave).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un pipeline con esa clave")
    orden = (db.query(func.max(PipelineDoc.orden)).scalar() or 0) + 1
    pipeline = PipelineDoc(
        clave=nuevo.clave,
        estado="nuevo",
        manual=True,
        fuentes_detectadas=[],
        orden=orden,
        contenido_borrador=contenido_inicial(nuevo.titulo, nuevo.producto, None, None),
        contenido_publicado=null(),
        detectado_en=utcnow(),
        actualizado_por=actor.username,
    )
    db.add(pipeline)
    _registrar(db, actor, "crear", nuevo.clave)
    db.commit()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.get("/sincronizaciones", response_model=list[Sincronizacion])
async def sincronizaciones(
    limite: int = Query(default=30, ge=1, le=200), db: Session = Depends(get_db)
) -> list[SincronizacionDoc]:
    return (
        db.query(SincronizacionDoc).order_by(SincronizacionDoc.id.desc()).limit(limite).all()
    )


@router.get("/pipelines/{clave}", response_model=PipelineDetalle)
async def obtener(clave: str, db: Session = Depends(get_db)) -> PipelineDetalle:
    return paginas.detalle(db, _pipeline_o_404(db, clave))


@router.get("/pipelines/{clave}/vista-previa", response_model=PipelinePublico)
async def vista_previa(clave: str, db: Session = Depends(get_db)) -> PipelinePublico:
    pipeline = _pipeline_o_404(db, clave)
    return paginas.publica(pipeline, db.get(MedicionDoc, pipeline.id), borrador=True)


@router.put("/pipelines/{clave}", response_model=PipelineDetalle)
async def guardar_borrador(
    clave: str,
    contenido: ContenidoPagina,
    expected_updated_at: datetime | None = Query(default=None, alias="expectedUpdatedAt"),
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_editor),
) -> PipelineDetalle:
    pipeline = _pipeline_o_404(db, clave)
    check_concurrent_edit(
        pipeline.actualizado_en,
        expected_updated_at,
        detail="La página fue modificada por otra persona",
    )
    readme = db.get(ReadmeDoc, pipeline.id)
    datos = contenido.model_dump()
    for sec in datos["secciones"]:
        if sec["origen"] != "readme":
            continue
        original = contenido_desde_readme(sec["tipo"], readme.contenido if readme else None)
        sec["editada"] = sec["contenido"] != original
        if not sec["editada"]:
            sec["readme_commit"] = readme.commit if readme else None
    pipeline.contenido_borrador = datos
    flag_modified(pipeline, "contenido_borrador")
    pipeline.actualizado_en = utcnow()
    pipeline.actualizado_por = actor.username
    _registrar(db, actor, "guardar_borrador", clave)
    db.commit()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.patch("/pipelines/{clave}", response_model=PipelineDetalle)
async def ajustar(
    clave: str,
    ajustes: AjustesPipeline,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_publicador),
) -> PipelineDetalle:
    pipeline = _pipeline_o_404(db, clave)
    if ajustes.visible is not None:
        pipeline.visible = ajustes.visible
    if ajustes.orden is not None:
        pipeline.orden = ajustes.orden
    pipeline.actualizado_por = actor.username
    _registrar(db, actor, "ajustar", clave)
    db.commit()
    cache.invalidar()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.post("/pipelines/{clave}/publicar", response_model=PipelineDetalle)
async def publicar(
    clave: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_publicador),
) -> PipelineDetalle:
    pipeline = _pipeline_o_404(db, clave)
    pipeline.contenido_publicado = copy.deepcopy(pipeline.contenido_borrador)
    flag_modified(pipeline, "contenido_publicado")
    pipeline.publicado_en = utcnow()
    pipeline.actualizado_en = utcnow()
    pipeline.actualizado_por = actor.username
    if pipeline.estado == "nuevo":
        pipeline.estado = "activo"
    _registrar(db, actor, "publicar", clave)
    db.commit()
    cache.invalidar()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.post("/pipelines/{clave}/despublicar", response_model=PipelineDetalle)
async def despublicar(
    clave: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_publicador),
) -> PipelineDetalle:
    pipeline = _pipeline_o_404(db, clave)
    pipeline.contenido_publicado = null()
    pipeline.publicado_en = None
    pipeline.actualizado_en = utcnow()
    pipeline.actualizado_por = actor.username
    _registrar(db, actor, "despublicar", clave)
    db.commit()
    cache.invalidar()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.delete("/pipelines/{clave}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar(
    clave: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_publicador),
) -> None:
    pipeline = _pipeline_o_404(db, clave)
    if pipeline.fuentes_detectadas:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El sincronizador lo detecta y lo volvería a crear; mándalo a borrador",
        )
    db.delete(pipeline)
    _registrar(db, actor, "eliminar", clave)
    db.commit()
    cache.invalidar()


@router.post("/pipelines/{clave}/descartar", response_model=PipelineDetalle)
async def descartar(
    clave: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_editor),
) -> PipelineDetalle:
    pipeline = _pipeline_o_404(db, clave)
    if not pipeline.contenido_publicado:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="No hay una versión publicada a la cual volver"
        )
    pipeline.contenido_borrador = copy.deepcopy(pipeline.contenido_publicado)
    flag_modified(pipeline, "contenido_borrador")
    pipeline.actualizado_en = utcnow()
    pipeline.actualizado_por = actor.username
    _registrar(db, actor, "descartar", clave)
    db.commit()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.post("/pipelines/{clave}/secciones/{seccion_id}/restablecer", response_model=PipelineDetalle)
async def restablecer(
    clave: str,
    seccion_id: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    actor: Usuario = Depends(_editor),
) -> PipelineDetalle:
    pipeline = _pipeline_o_404(db, clave)
    readme = db.get(ReadmeDoc, pipeline.id)
    borrador = copy.deepcopy(pipeline.contenido_borrador or {})
    seccion = next((s for s in borrador.get("secciones", []) if s["id"] == seccion_id), None)
    if seccion is None or seccion.get("origen") != "readme":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Sección sin origen en el README"
        )
    seccion["contenido"] = contenido_desde_readme(seccion["tipo"], readme.contenido if readme else None)
    seccion["editada"] = False
    seccion["readme_commit"] = readme.commit if readme else None
    pipeline.contenido_borrador = borrador
    flag_modified(pipeline, "contenido_borrador")
    pipeline.actualizado_en = utcnow()
    pipeline.actualizado_por = actor.username
    _registrar(db, actor, "restablecer_seccion", clave)
    db.commit()
    db.refresh(pipeline)
    return paginas.detalle(db, pipeline)


@router.put("/pipelines/{clave}/presencia")
async def registrar_presencia(clave: str, actor: Usuario = Depends(verify_csrf)) -> dict:
    presence.register(PRESENCIA, clave, actor.username, actor.name)
    return {"ok": True}


@router.get("/pipelines/{clave}/presencia")
async def obtener_presencia(clave: str, actor: Usuario = Depends(get_current_user)) -> list[dict]:
    return presence.list_others(PRESENCIA, clave, actor.username)
