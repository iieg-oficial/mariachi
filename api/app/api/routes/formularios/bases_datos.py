from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.bases_datos import (
    BasesDatosCreate,
    BasesDatosResponse,
    BasesDatosUpdate,
)
from app.services.sieej.bases_datos_service import BasesDatosService

router = APIRouter()


@router.get("/bases-datos", response_model=List[BasesDatosResponse])
async def list_bases_datos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return BasesDatosService(db).list(current_user.id)


@router.get("/bases-datos/{bd_id}", response_model=BasesDatosResponse)
async def get_base_datos(
    bd_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    response = BasesDatosService(db).get(bd_id, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base de datos no encontrada")
    return response


@router.post("/bases-datos", response_model=BasesDatosResponse, status_code=status.HTTP_201_CREATED)
async def create_base_datos(
    data: BasesDatosCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    return BasesDatosService(db).create(data, current_user.id)


@router.put("/bases-datos/{bd_id}", response_model=BasesDatosResponse)
async def update_base_datos(
    bd_id: int,
    data: BasesDatosUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = BasesDatosService(db).update(bd_id, data, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base de datos no encontrada")
    return response


@router.delete("/bases-datos/{bd_id}")
async def delete_base_datos(
    bd_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = BasesDatosService(db).delete(bd_id, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base de datos no encontrada")
    return response


@router.post("/bases-datos/{bd_id}/diccionario", response_model=BasesDatosResponse)
async def upload_diccionario(
    bd_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = await BasesDatosService(db).upload_diccionario(bd_id, current_user.id, file)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base de datos no encontrada")
    return response
