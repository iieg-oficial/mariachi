from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, verify_csrf
from app.core.time import utcnow
from app.models.direccion_organizacional import DireccionOrganizacional
from app.models.reporte import Reporte
from app.models.user import Usuario
from app.schemas.direccion_organizacional import (
    DireccionOrganizacionalCreate,
    DireccionOrganizacionalResponse,
    DireccionOrganizacionalUpdate,
)

router = APIRouter(prefix="/colibri/direcciones", tags=["colibri direcciones"])


@router.get("", response_model=list[DireccionOrganizacionalResponse])
async def listar_direcciones(
    db: Session = Depends(get_db),
    activo: bool | None = Query(default=None),
    q: str | None = Query(default=None, max_length=200),
):
    query = db.query(DireccionOrganizacional)
    if activo is not None:
        query = query.filter(DireccionOrganizacional.activo.is_(activo))
    if q:
        like = f"%{q}%"
        query = query.filter(
            DireccionOrganizacional.nombre.ilike(like)
            | DireccionOrganizacional.siglas.ilike(like)
        )
    return query.order_by(
        DireccionOrganizacional.orden.asc(),
        DireccionOrganizacional.nombre.asc(),
    ).all()


@router.get("/{direccion_id}", response_model=DireccionOrganizacionalResponse)
async def obtener_direccion(direccion_id: int, db: Session = Depends(get_db)):
    direccion = (
        db.query(DireccionOrganizacional)
        .filter(DireccionOrganizacional.id == direccion_id)
        .first()
    )
    if not direccion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dirección no encontrada")
    return direccion


@router.post(
    "",
    response_model=DireccionOrganizacionalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_direccion(
    payload: DireccionOrganizacionalCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    direccion = DireccionOrganizacional(**payload.model_dump())
    db.add(direccion)
    db.commit()
    db.refresh(direccion)
    return direccion


@router.patch("/{direccion_id}", response_model=DireccionOrganizacionalResponse)
async def actualizar_direccion(
    direccion_id: int,
    payload: DireccionOrganizacionalUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    direccion = (
        db.query(DireccionOrganizacional)
        .filter(DireccionOrganizacional.id == direccion_id)
        .first()
    )
    if not direccion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dirección no encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(direccion, field, value)
    direccion.actualizado_en = utcnow()
    db.commit()
    db.refresh(direccion)
    return direccion


@router.delete("/{direccion_id}")
async def eliminar_direccion(
    direccion_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    direccion = (
        db.query(DireccionOrganizacional)
        .filter(DireccionOrganizacional.id == direccion_id)
        .first()
    )
    if not direccion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dirección no encontrada")

    en_uso = db.query(Reporte).filter(Reporte.direccion_id == direccion_id).count()
    if en_uso > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede eliminar: {en_uso} reporte(s) referencian esta dirección. Desactívala en lugar de eliminar.",
        )

    db.delete(direccion)
    db.commit()
    return {"message": "Dirección eliminada"}
