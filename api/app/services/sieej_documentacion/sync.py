import copy

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.time import utcnow
from app.models.sieej_documentacion import MedicionDoc, PipelineDoc, ReadmeDoc, SincronizacionDoc
from app.schemas.sieej_documentacion import PipelineSyncIn, SyncIn, SyncResultado
from app.services.sieej_documentacion import cache
from app.services.sieej_documentacion.siembra import contenido_inicial, refrescar_desde_readme

ACTOR = "sincronizador"
FUENTES_PARA_RETIRAR = ("bd", "readme")


def _fuente_ok(payload: SyncIn, clave: str) -> bool:
    return (payload.fuentes.get(clave) or {}).get("estado") == "ok"


def _crear(db: Session, item: PipelineSyncIn, orden: int) -> PipelineDoc:
    contenido = contenido_inicial(item.titulo, item.producto, item.readme, item.readme_commit)
    ahora = utcnow()
    pipeline = PipelineDoc(
        clave=item.clave,
        carpeta_etl=item.carpeta_etl,
        estado="nuevo",
        fuentes_detectadas=list(item.fuentes_detectadas),
        orden=orden,
        contenido_borrador=contenido,
        contenido_publicado=copy.deepcopy(contenido),
        detectado_en=ahora,
        publicado_en=ahora,
        actualizado_por=ACTOR,
    )
    db.add(pipeline)
    db.flush()
    return pipeline


def _actualizar(pipeline: PipelineDoc, item: PipelineSyncIn) -> None:
    pipeline.carpeta_etl = item.carpeta_etl or pipeline.carpeta_etl
    pipeline.fuentes_detectadas = list(item.fuentes_detectadas)
    if pipeline.estado == "retirado":
        pipeline.estado = "activo"
    borrador = copy.deepcopy(pipeline.contenido_borrador or {})
    sin_pendientes = borrador == (pipeline.contenido_publicado or {})
    if refrescar_desde_readme(borrador, item.readme, item.readme_commit):
        pipeline.contenido_borrador = borrador
        flag_modified(pipeline, "contenido_borrador")
        if sin_pendientes:
            pipeline.contenido_publicado = copy.deepcopy(borrador)
            flag_modified(pipeline, "contenido_publicado")
            pipeline.publicado_en = utcnow()
        pipeline.actualizado_por = ACTOR
    pipeline.actualizado_en = utcnow()


def _guardar_mediciones(db: Session, pipeline: PipelineDoc, item: PipelineSyncIn) -> None:
    medicion = db.get(MedicionDoc, pipeline.id) or MedicionDoc(pipeline_id=pipeline.id)
    medicion.clasificacion = item.clasificacion
    medicion.base = item.base
    medicion.origen_base = item.origen_base
    medicion.corte_respaldo = item.corte_respaldo
    medicion.etapas = item.etapas
    medicion.der_svg = item.der_svg
    medicion.sincronizado_en = utcnow()
    db.add(medicion)
    if item.readme is not None:
        readme = db.get(ReadmeDoc, pipeline.id) or ReadmeDoc(pipeline_id=pipeline.id)
        readme.contenido = item.readme
        readme.commit = item.readme_commit
        readme.sincronizado_en = utcnow()
        db.add(readme)


def aplicar_sync(db: Session, payload: SyncIn) -> SyncResultado:
    existentes = {p.clave: p for p in db.query(PipelineDoc).all()}
    orden = (db.query(func.max(PipelineDoc.orden)).scalar() or 0) + 1
    nuevos: list[str] = []
    vistos: set[str] = set()
    for item in payload.pipelines:
        vistos.add(item.clave)
        pipeline = existentes.get(item.clave)
        if pipeline is None:
            pipeline = _crear(db, item, orden)
            orden += 1
            nuevos.append(item.clave)
        else:
            _actualizar(pipeline, item)
        _guardar_mediciones(db, pipeline, item)

    retirados: list[str] = []
    if payload.pipelines and all(_fuente_ok(payload, f) for f in FUENTES_PARA_RETIRAR):
        for clave, pipeline in existentes.items():
            if clave not in vistos and not pipeline.manual and pipeline.estado != "retirado":
                pipeline.estado = "retirado"
                retirados.append(clave)

    fuentes_ok = all(f.get("estado") == "ok" for f in payload.fuentes.values())
    estado = "ok" if fuentes_ok and not payload.errores else "parcial"
    if not payload.pipelines:
        estado = "error"
    terminado = utcnow()
    iniciado = payload.iniciado_en.replace(tzinfo=None)
    db.add(
        SincronizacionDoc(
            iniciado_en=iniciado,
            terminado_en=terminado,
            duracion_ms=max(0, int((terminado - iniciado).total_seconds() * 1000)),
            estado=estado,
            fuentes=payload.fuentes,
            nuevos=nuevos,
            actualizados=len(vistos) - len(nuevos),
            errores=payload.errores + [f"retirado: {c}" for c in retirados],
            version=payload.version,
        )
    )
    db.commit()
    cache.invalidar()
    return SyncResultado(
        estado=estado, nuevos=nuevos, actualizados=len(vistos) - len(nuevos), retirados=retirados
    )
