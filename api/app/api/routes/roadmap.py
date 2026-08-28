from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.models.roadmap import RoadmapHito
from app.models.user import Usuario
from app.schemas.roadmap import (
    RoadmapHitoActualizar,
    RoadmapHitoCrear,
    RoadmapHitoSalida,
)

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

PERMISO = "mariachi.roadmap.manage"


def _buscar(db: Session, clave: str) -> RoadmapHito:
    hito = db.query(RoadmapHito).filter(RoadmapHito.clave == clave).first()
    if not hito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe el hito {clave}",
        )
    return hito


@router.get("/hitos", response_model=List[RoadmapHitoSalida])
async def listar(db: Session = Depends(get_db)):
    return (
        db.query(RoadmapHito)
        .order_by(RoadmapHito.fecha_eje, RoadmapHito.orden)
        .all()
    )


@router.post("/hitos", response_model=RoadmapHitoSalida, status_code=status.HTTP_201_CREATED)
async def crear(
    datos: RoadmapHitoCrear,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    if db.query(RoadmapHito).filter(RoadmapHito.clave == datos.clave).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un hito con la clave {datos.clave}",
        )
    hito = RoadmapHito(**datos.model_dump())
    db.add(hito)
    db.commit()
    db.refresh(hito)
    return hito


@router.put("/hitos/{clave}", response_model=RoadmapHitoSalida)
async def actualizar(
    clave: str,
    datos: RoadmapHitoActualizar,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    hito = _buscar(db, clave)
    for campo, valor in datos.model_dump().items():
        setattr(hito, campo, valor)
    db.commit()
    db.refresh(hito)
    return hito


@router.delete("/hitos/{clave}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar(
    clave: str,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    db.delete(_buscar(db, clave))
    db.commit()
