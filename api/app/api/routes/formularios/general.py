from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.general import GeneralCreate, GeneralResponse, GeneralUpdate
from app.services.sieej.general_service import GeneralService

router = APIRouter()


@router.get("/general", response_model=GeneralResponse)
async def get_general(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    response = GeneralService(db).get(current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Información general no registrada")
    return response


@router.post("/general", response_model=GeneralResponse, status_code=status.HTTP_201_CREATED)
async def create_general(
    data: GeneralCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    return GeneralService(db).create(data, current_user.id)


@router.put("/general/{general_id}", response_model=GeneralResponse)
async def update_general(
    general_id: int,
    data: GeneralUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = GeneralService(db).update(general_id, data, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Información general no encontrada")
    return response


@router.delete("/general/{general_id}")
async def delete_general(
    general_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    response = GeneralService(db).delete(general_id, current_user.id)
    if response is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Información general no encontrada")
    return response
