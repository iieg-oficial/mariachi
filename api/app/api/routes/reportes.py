import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_csrf
from app.core.time import utcnow
from app.models.media_bucket import MediaBucket
from app.models.reporte import Reporte
from app.models.user import Usuario
from app.schemas.reporte import (
    ReporteAdminResponse,
    ReporteListResponse,
    ReporteUpdate,
)
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["reportes admin"])


def _serialize(reporte: Reporte, bucket_lookup: dict[int, MediaBucket]) -> ReporteAdminResponse:
    screenshot_url: str | None = None
    if reporte.screenshot_object_path and reporte.screenshot_bucket_id:
        bucket = bucket_lookup.get(reporte.screenshot_bucket_id)
        if bucket is not None:
            try:
                screenshot_url = AcervoClient.for_bucket(bucket).get_file_url(
                    reporte.screenshot_object_path
                )
            except Exception:
                logger.exception(
                    "reportes.screenshot_url reporte_id=%s bucket=%s",
                    reporte.id,
                    bucket.acervo_bucket,
                )

    return ReporteAdminResponse.model_validate(
        {
            "id": reporte.id,
            "tipo": reporte.tipo,
            "mensaje": reporte.mensaje,
            "email_contacto": reporte.email_contacto,
            "source_app": reporte.source_app,
            "source_route": reporte.source_route,
            "source_context": reporte.source_context or {},
            "screenshot_url": screenshot_url,
            "estado": reporte.estado,
            "nota_interna": reporte.nota_interna,
            "atendido_por_id": reporte.atendido_por_id,
            "creado_en": reporte.creado_en,
            "actualizado_en": reporte.actualizado_en,
        }
    )


def _bucket_lookup(db: Session, ids: set[int]) -> dict[int, MediaBucket]:
    if not ids:
        return {}
    rows = db.query(MediaBucket).filter(MediaBucket.id.in_(ids)).all()
    return {b.id: b for b in rows}


@router.get("", response_model=ReporteListResponse)
async def listar_reportes(
    db: Session = Depends(get_db),
    source_app: str | None = Query(default=None),
    tipo: Literal["problema", "solicitud", "sugerencia", "duda", "datos_incorrectos", "bug"] | None = Query(default=None),
    estado: Literal["nuevo", "en_revision", "resuelto", "descartado"] | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
):
    query = db.query(Reporte)
    if source_app:
        query = query.filter(Reporte.source_app == source_app)
    if tipo:
        query = query.filter(Reporte.tipo == tipo)
    if estado:
        query = query.filter(Reporte.estado == estado)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Reporte.mensaje.ilike(like),
                Reporte.source_route.ilike(like),
                Reporte.email_contacto.ilike(like),
            )
        )

    total = query.count()
    rows = (
        query.order_by(Reporte.creado_en.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    bucket_ids = {r.screenshot_bucket_id for r in rows if r.screenshot_bucket_id}
    lookup = _bucket_lookup(db, bucket_ids)
    items = [_serialize(r, lookup) for r in rows]
    return ReporteListResponse(items=items, total=total, page=page, size=size)


@router.get("/{reporte_id}", response_model=ReporteAdminResponse)
async def obtener_reporte(reporte_id: int, db: Session = Depends(get_db)):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")
    lookup = _bucket_lookup(
        db, {reporte.screenshot_bucket_id} if reporte.screenshot_bucket_id else set()
    )
    return _serialize(reporte, lookup)


@router.patch("/{reporte_id}", response_model=ReporteAdminResponse)
async def actualizar_reporte(
    reporte_id: int,
    payload: ReporteUpdate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if payload.atendido_por_id is not None:
        usuario = db.query(Usuario).filter(Usuario.id == payload.atendido_por_id).first()
        if usuario is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario asignado no existe")

    for field, value in update_data.items():
        setattr(reporte, field, value)
    reporte.actualizado_en = utcnow()
    db.commit()
    db.refresh(reporte)

    lookup = _bucket_lookup(
        db, {reporte.screenshot_bucket_id} if reporte.screenshot_bucket_id else set()
    )
    return _serialize(reporte, lookup)


@router.delete("/{reporte_id}")
async def eliminar_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    if reporte.screenshot_object_path and reporte.screenshot_bucket_id:
        bucket = db.query(MediaBucket).filter(MediaBucket.id == reporte.screenshot_bucket_id).first()
        if bucket is not None:
            try:
                AcervoClient.for_bucket(bucket).delete_file(reporte.screenshot_object_path)
            except Exception:
                logger.exception(
                    "reportes.delete.screenshot reporte_id=%s path=%s",
                    reporte.id,
                    reporte.screenshot_object_path,
                )

    db.delete(reporte)
    db.commit()
    return {"message": "Reporte eliminado"}


@router.get("/stats/contadores")
async def contadores_estado(db: Session = Depends(get_db)):
    from sqlalchemy import func
    rows = (
        db.query(Reporte.source_app, Reporte.estado, func.count(Reporte.id))
        .group_by(Reporte.source_app, Reporte.estado)
        .all()
    )
    result: dict[str, dict[str, int]] = {}
    for source_app, estado, count in rows:
        result.setdefault(source_app, {})[estado] = count
    return result
