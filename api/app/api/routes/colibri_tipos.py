from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, verify_csrf
from app.core.time import utcnow
from app.models.reporte import Reporte
from app.models.reporte_tipo import ReporteTipo
from app.models.user import Usuario
from app.schemas.reporte_tipo import (
    ReporteTipoCreate,
    ReporteTipoReorderRequest,
    ReporteTipoResponse,
    ReporteTipoUpdate,
)

router = APIRouter(prefix="/colibri/tipos", tags=["colibri tipos"])


@router.get("", response_model=list[ReporteTipoResponse])
async def listar_tipos(
    db: Session = Depends(get_db),
    activo: bool | None = Query(default=None),
):
    query = db.query(ReporteTipo)
    if activo is not None:
        query = query.filter(ReporteTipo.activo.is_(activo))
    return query.order_by(ReporteTipo.orden.asc(), ReporteTipo.id.asc()).all()


@router.get("/{tipo_id}", response_model=ReporteTipoResponse)
async def obtener_tipo(tipo_id: int, db: Session = Depends(get_db)):
    tipo = db.query(ReporteTipo).filter(ReporteTipo.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo no encontrado")
    return tipo


@router.post("", response_model=ReporteTipoResponse, status_code=status.HTTP_201_CREATED)
async def crear_tipo(
    payload: ReporteTipoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    if db.query(ReporteTipo).filter(ReporteTipo.slug == payload.slug).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un tipo con slug '{payload.slug}'",
        )

    tipo = ReporteTipo(**payload.model_dump())
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


@router.patch("/{tipo_id}", response_model=ReporteTipoResponse)
async def actualizar_tipo(
    tipo_id: int,
    payload: ReporteTipoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    tipo = db.query(ReporteTipo).filter(ReporteTipo.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tipo, field, value)
    tipo.actualizado_en = utcnow()
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/{tipo_id}")
async def eliminar_tipo(
    tipo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    tipo = db.query(ReporteTipo).filter(ReporteTipo.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo no encontrado")

    en_uso = db.query(Reporte).filter(Reporte.tipo_id == tipo_id).count()
    if en_uso > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede eliminar: {en_uso} reporte(s) usan este tipo. Desactívalo en lugar de eliminar.",
        )

    db.delete(tipo)
    db.commit()
    return {"message": "Tipo eliminado"}


@router.patch("/reorder/batch", response_model=list[ReporteTipoResponse])
async def reordenar_tipos(
    payload: ReporteTipoReorderRequest,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    ids = [item.id for item in payload.items]
    rows = db.query(ReporteTipo).filter(ReporteTipo.id.in_(ids)).all()
    by_id = {r.id: r for r in rows}
    if len(by_id) != len(ids):
        faltantes = set(ids) - set(by_id.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipos no encontrados: {sorted(faltantes)}",
        )

    for item in payload.items:
        by_id[item.id].orden = item.orden
        by_id[item.id].actualizado_en = utcnow()
    db.commit()
    return (
        db.query(ReporteTipo)
        .order_by(ReporteTipo.orden.asc(), ReporteTipo.id.asc())
        .all()
    )
