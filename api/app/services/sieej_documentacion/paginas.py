from datetime import timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.mapalab_event import MapalabEvent
from app.models.sieej_documentacion import MedicionDoc, PipelineDoc, ReadmeDoc
from app.schemas.sieej_documentacion import (
    ContenidoPagina,
    PipelineDetalle,
    PipelinePublico,
    PipelinePublicoResumen,
    PipelineResumen,
    SeccionPublica,
)
from app.services.sieej_documentacion.siembra import secciones_con_readme_nuevo

APP_TELEMETRIA = "sieej_documentacion"


def _contenido(datos: dict[str, Any] | None, pipeline: PipelineDoc) -> ContenidoPagina:
    datos = datos or {}
    return ContenidoPagina.model_validate(
        {
            "titulo": datos.get("titulo") or pipeline.clave.replace("_", " "),
            "producto": datos.get("producto") or "",
            "secciones": datos.get("secciones") or [],
        }
    )


def visitas_por_pipeline(db: Session, dias: int = 30) -> dict[str, int]:
    desde = utcnow() - timedelta(days=dias)
    clave = MapalabEvent.props["clave"].as_string()
    filas = (
        db.query(clave, func.count())
        .filter(
            MapalabEvent.app == APP_TELEMETRIA,
            MapalabEvent.event_name == "page_view",
            MapalabEvent.ts >= desde,
        )
        .group_by(clave)
        .all()
    )
    return {c: n for c, n in filas if c}


def resumen(
    pipeline: PipelineDoc,
    medicion: MedicionDoc | None,
    readme: ReadmeDoc | None,
    visitas: dict[str, int],
) -> PipelineResumen:
    borrador = pipeline.contenido_borrador or {}
    return PipelineResumen(
        clave=pipeline.clave,
        titulo=borrador.get("titulo") or pipeline.clave,
        producto=borrador.get("producto") or "",
        estado=pipeline.estado,
        visible=pipeline.visible,
        manual=pipeline.manual,
        orden=pipeline.orden,
        fuentes_detectadas=pipeline.fuentes_detectadas or [],
        clasificacion=medicion.clasificacion if medicion else None,
        borrador_pendiente=borrador != (pipeline.contenido_publicado or {}),
        secciones_con_readme_nuevo=secciones_con_readme_nuevo(
            borrador, readme.commit if readme else None
        ),
        detectado_en=pipeline.detectado_en,
        publicado_en=pipeline.publicado_en,
        actualizado_en=pipeline.actualizado_en,
        actualizado_por=pipeline.actualizado_por,
        sincronizado_en=medicion.sincronizado_en if medicion else None,
        visitas_30_dias=visitas.get(pipeline.clave, 0),
    )


def detalle(db: Session, pipeline: PipelineDoc) -> PipelineDetalle:
    medicion = db.get(MedicionDoc, pipeline.id)
    readme = db.get(ReadmeDoc, pipeline.id)
    base = resumen(pipeline, medicion, readme, visitas_por_pipeline(db)).model_dump()
    return PipelineDetalle(
        **base,
        borrador=_contenido(pipeline.contenido_borrador, pipeline),
        publicado=(
            _contenido(pipeline.contenido_publicado, pipeline)
            if pipeline.contenido_publicado
            else None
        ),
        medicion=_medicion_dict(medicion),
        readme=readme.contenido if readme else None,
        readme_commit=readme.commit if readme else None,
    )


def _medicion_dict(medicion: MedicionDoc | None) -> dict[str, Any] | None:
    if medicion is None:
        return None
    return {
        "clasificacion": medicion.clasificacion,
        "base": medicion.base,
        "origen_base": medicion.origen_base,
        "corte_respaldo": medicion.corte_respaldo,
        "etapas": medicion.etapas or [],
        "tiene_der_svg": bool(medicion.der_svg),
        "sincronizado_en": medicion.sincronizado_en.isoformat() if medicion.sincronizado_en else None,
    }


def publica(
    pipeline: PipelineDoc, medicion: MedicionDoc | None, borrador: bool = False
) -> PipelinePublico:
    datos = pipeline.contenido_borrador if borrador else pipeline.contenido_publicado
    contenido = _contenido(datos, pipeline)
    return PipelinePublico(
        clave=pipeline.clave,
        titulo=contenido.titulo,
        producto=contenido.producto,
        estado=pipeline.estado,
        clasificacion=medicion.clasificacion if medicion else None,
        secciones=[
            SeccionPublica(id=s.id, tipo=s.tipo, titulo=s.titulo, contenido=s.contenido)
            for s in contenido.secciones
            if s.visible
        ],
        base=medicion.base if medicion else None,
        origen_base=medicion.origen_base if medicion else None,
        corte_respaldo=medicion.corte_respaldo if medicion else None,
        etapas=(medicion.etapas or []) if medicion else [],
        der_svg=medicion.der_svg if medicion else None,
        publicado_en=pipeline.publicado_en,
        sincronizado_en=medicion.sincronizado_en if medicion else None,
    )


def resumen_publico(pipeline: PipelineDoc, medicion: MedicionDoc | None) -> PipelinePublicoResumen:
    contenido = _contenido(pipeline.contenido_publicado, pipeline)
    base = (medicion.base if medicion else None) or {}
    vistas_doc = sum(
        len(s.contenido.get("notas", {})) for s in contenido.secciones if s.tipo == "vistas"
    )
    return PipelinePublicoResumen(
        clave=pipeline.clave,
        titulo=contenido.titulo,
        producto=contenido.producto,
        estado=pipeline.estado,
        clasificacion=medicion.clasificacion if medicion else None,
        etapas=(medicion.etapas or []) if medicion else [],
        vistas_en_bd=len(base.get("vistas", [])) if medicion and medicion.origen_base == "bd" else None,
        vistas_documentadas=vistas_doc or len(base.get("vistas", [])),
        tiene_base=bool(base),
    )
