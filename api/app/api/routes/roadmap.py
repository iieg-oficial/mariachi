from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.models.roadmap import RoadmapHito
from app.models.roadmap_extra import RoadmapCiclo, RoadmapProceso
from app.models.user import Usuario
from app.schemas.roadmap import (
    RoadmapCicloBase,
    RoadmapCicloCrear,
    RoadmapCicloSalida,
    RoadmapHitoActualizar,
    RoadmapHitoCrear,
    RoadmapHitoSalida,
    RoadmapProcesoBase,
    RoadmapProcesoCrear,
    RoadmapProcesoSalida,
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


def _buscar_en(db: Session, modelo, clave: str):
    fila = db.query(modelo).filter(modelo.clave == clave).first()
    if not fila:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe {clave}",
        )
    return fila


def _crear_en(db: Session, modelo, datos):
    if db.query(modelo).filter(modelo.clave == datos.clave).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe la clave {datos.clave}",
        )
    fila = modelo(**datos.model_dump())
    db.add(fila)
    db.commit()
    db.refresh(fila)
    return fila


def _actualizar_en(db: Session, modelo, clave: str, datos):
    fila = _buscar_en(db, modelo, clave)
    for campo, valor in datos.model_dump().items():
        setattr(fila, campo, valor)
    db.commit()
    db.refresh(fila)
    return fila


@router.get("/ciclos", response_model=List[RoadmapCicloSalida])
async def listar_ciclos(db: Session = Depends(get_db)):
    return db.query(RoadmapCiclo).order_by(RoadmapCiclo.orden).all()


@router.post("/ciclos", response_model=RoadmapCicloSalida, status_code=status.HTTP_201_CREATED)
async def crear_ciclo(
    datos: RoadmapCicloCrear,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    return _crear_en(db, RoadmapCiclo, datos)


@router.put("/ciclos/{clave}", response_model=RoadmapCicloSalida)
async def actualizar_ciclo(
    clave: str,
    datos: RoadmapCicloBase,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    return _actualizar_en(db, RoadmapCiclo, clave, datos)


@router.delete("/ciclos/{clave}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_ciclo(
    clave: str,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    db.delete(_buscar_en(db, RoadmapCiclo, clave))
    db.commit()


@router.get("/procesos", response_model=List[RoadmapProcesoSalida])
async def listar_procesos(db: Session = Depends(get_db)):
    return db.query(RoadmapProceso).order_by(RoadmapProceso.orden).all()


@router.post("/procesos", response_model=RoadmapProcesoSalida, status_code=status.HTTP_201_CREATED)
async def crear_proceso(
    datos: RoadmapProcesoCrear,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    return _crear_en(db, RoadmapProceso, datos)


@router.put("/procesos/{clave}", response_model=RoadmapProcesoSalida)
async def actualizar_proceso(
    clave: str,
    datos: RoadmapProcesoBase,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    return _actualizar_en(db, RoadmapProceso, clave, datos)


@router.delete("/procesos/{clave}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_proceso(
    clave: str,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_permission(PERMISO)),
    __: Usuario = Depends(verify_csrf),
):
    db.delete(_buscar_en(db, RoadmapProceso, clave))
    db.commit()
