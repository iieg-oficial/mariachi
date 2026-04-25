from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.enlace import EnlaceCreate, EnlaceResponse, EnlaceUpdate
from app.services.sieej.enlace_service import EnlaceService

router = APIRouter()


@router.get("/enlaces", response_model=List[EnlaceResponse])
async def list_enlaces(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return EnlaceService(db).list(current_user.id)


@router.post("/enlaces", response_model=EnlaceResponse, status_code=status.HTTP_201_CREATED)
async def create_enlace(
    data: EnlaceCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    return EnlaceService(db).create(data, current_user.id)


@router.put("/enlaces/{enlace_id}", response_model=EnlaceResponse)
async def update_enlace(
    enlace_id: int,
    data: EnlaceUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = EnlaceService(db).update(enlace_id, data, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enlace no encontrado")
    return response


@router.delete("/enlaces/{enlace_id}")
async def delete_enlace(
    enlace_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = EnlaceService(db).delete(enlace_id, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enlace no encontrado")
    return response
