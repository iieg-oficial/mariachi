import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_permission, verify_csrf
from app.core.time import utcnow
from app.models.acervo_bucket import AcervoBucket
from app.models.direccion_organizacional import DireccionOrganizacional
from app.models.reporte import Reporte
from app.models.reporte_actividad import ReporteActividad
from app.models.reporte_grupo import ReporteGrupo
from app.models.user import Usuario
from app.schemas.reporte import (
    ReporteAdminResponse,
    ReporteListResponse,
    ReporteUpdate,
)
from app.services.acervo import AcervoClient
from app.services.actividad_service import registrar_actividad

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["reportes admin"])


def _serialize(reporte: Reporte, bucket_lookup: dict[int, AcervoBucket]) -> ReporteAdminResponse:
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

    direccion_payload = None
    if reporte.direccion is not None:
        direccion_payload = {
            "id": reporte.direccion.id,
            "nombre": reporte.direccion.nombre,
            "siglas": reporte.direccion.siglas,
        }

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
            "direccion_id": reporte.direccion_id,
            "direccion": direccion_payload,
            "severidad": reporte.severidad,
            "prioridad": reporte.prioridad,
            "duplicado_de": reporte.duplicado_de,
            "bloqueado_por": reporte.bloqueado_por,
            "grupo_id": reporte.grupo_id,
            "respuestas": reporte.respuestas,
            "creado_en": reporte.creado_en,
            "actualizado_en": reporte.actualizado_en,
        }
    )


def _bucket_lookup(db: Session, ids: set[int]) -> dict[int, AcervoBucket]:
    if not ids:
        return {}
    rows = db.query(AcervoBucket).filter(AcervoBucket.id.in_(ids)).all()
    return {b.id: b for b in rows}


@router.get("", response_model=ReporteListResponse)
async def listar_reportes(
    db: Session = Depends(get_db),
    source_app: str | None = Query(default=None),
    tipo: str | None = Query(default=None, max_length=50),
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


_FIELD_TO_ACTION = {
    "estado": "estado_cambiado",
    "nota_interna": "nota_actualizada",
    "atendido_por_id": "asignado",
    "direccion_id": "direccion_asignada",
    "severidad": "severidad_cambiada",
    "prioridad": "prioridad_cambiada",
    "duplicado_de": "marcado_duplicado",
    "bloqueado_por": "bloqueo_cambiado",
}


_PUEDE_ACTUALIZAR = [Depends(require_permission("mariachi.colibri_reportes.update"))]


@router.patch("/{reporte_id}", response_model=ReporteAdminResponse, dependencies=_PUEDE_ACTUALIZAR)
async def actualizar_reporte(
    reporte_id: int,
    payload: ReporteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
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
    if payload.direccion_id is not None:
        direccion = (
            db.query(DireccionOrganizacional)
            .filter(DireccionOrganizacional.id == payload.direccion_id)
            .first()
        )
        if direccion is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dirección no encontrada")
    if payload.duplicado_de is not None:
        if payload.duplicado_de == reporte.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Un reporte no puede ser duplicado de sí mismo")
        original = db.query(Reporte).filter(Reporte.id == payload.duplicado_de).first()
        if original is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reporte original no encontrado")

    actividades: list[ReporteActividad] = []
    for field, value in update_data.items():
        previous = getattr(reporte, field, None)
        if previous == value:
            continue
        accion = _FIELD_TO_ACTION.get(field, "campo_cambiado")
        actividades.append(
            ReporteActividad(
                reporte_id=reporte.id,
                actor_id=current_user.id,
                accion=accion,
                detalle={"campo": field, "anterior": previous, "nuevo": value},
            )
        )
        setattr(reporte, field, value)
    if actividades:
        for a in actividades:
            db.add(a)
        registrar_actividad(
            db,
            actor=current_user,
            action="reporte.update",
            resource_type="reporte",
            resource_id=reporte.id,
            metadata={"fields": sorted(update_data.keys())},
        )
    reporte.actualizado_en = utcnow()
    db.commit()
    db.refresh(reporte)

    lookup = _bucket_lookup(
        db, {reporte.screenshot_bucket_id} if reporte.screenshot_bucket_id else set()
    )
    return _serialize(reporte, lookup)


@router.delete("/{reporte_id}", dependencies=_PUEDE_ACTUALIZAR)
async def eliminar_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    if reporte.screenshot_object_path and reporte.screenshot_bucket_id:
        bucket = db.query(AcervoBucket).filter(AcervoBucket.id == reporte.screenshot_bucket_id).first()
        if bucket is not None:
            try:
                AcervoClient.for_bucket(bucket).delete_file(reporte.screenshot_object_path)
            except Exception:
                logger.exception(
                    "reportes.delete.screenshot reporte_id=%s path=%s",
                    reporte.id,
                    reporte.screenshot_object_path,
                )

    reporte_id_local = reporte.id
    registrar_actividad(
        db,
        actor=current_user,
        action="reporte.delete",
        resource_type="reporte",
        resource_id=reporte_id_local,
    )
    db.delete(reporte)
    db.commit()
    return {"message": "Reporte eliminado"}


@router.get("/{reporte_id}/actividad")
async def obtener_actividad(reporte_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(ReporteActividad)
        .filter(ReporteActividad.reporte_id == reporte_id)
        .order_by(ReporteActividad.creado_en.desc())
        .all()
    )
    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "accion": row.accion,
            "detalle": row.detalle or {},
            "nota": row.nota,
            "creadoEn": row.creado_en.isoformat() if row.creado_en else None,
            "actorId": row.actor_id,
            "actorUsername": row.actor.username if row.actor else None,
            "actorAvatarUrl": getattr(row.actor, "avatar_url", None) if row.actor else None,
        })
    return items


@router.get("/grupos/lista")
async def listar_grupos(
    db: Session = Depends(get_db),
    source_app: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
):
    from sqlalchemy import desc

    query = (
        db.query(ReporteGrupo, Reporte)
        .join(Reporte, Reporte.id == ReporteGrupo.ultimo_reporte_id)
        .order_by(desc(ReporteGrupo.count), desc(ReporteGrupo.ultimo_visto))
    )
    if source_app:
        query = query.filter(Reporte.source_app == source_app)

    total = query.count()
    rows = query.offset((page - 1) * size).limit(size).all()

    items = []
    for grupo, representante in rows:
        items.append({
            "grupoId": grupo.id,
            "fingerprint": grupo.fingerprint,
            "count": grupo.count,
            "primerVisto": grupo.primer_visto.isoformat() if grupo.primer_visto else None,
            "ultimoVisto": grupo.ultimo_visto.isoformat() if grupo.ultimo_visto else None,
            "representanteId": representante.id,
            "representanteTipo": representante.tipo,
            "representanteEstado": representante.estado,
            "representanteMensaje": (representante.mensaje or "")[:200],
            "representanteSourceApp": representante.source_app,
            "representanteSourceRoute": representante.source_route,
        })
    return {"items": items, "total": total, "page": page, "size": size}


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
