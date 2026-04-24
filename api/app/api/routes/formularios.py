from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_project_access
from app.models.user import Usuario

router = APIRouter(
    prefix='/formularios',
    tags=['sieej-formularios'],
    dependencies=[Depends(require_project_access('sieej'))],
)


@router.get('')
async def list_formularios(current_user: Usuario = Depends(get_current_user)):
    return []


@router.post('', status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def create_formulario(current_user: Usuario = Depends(get_current_user)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Módulo SIEEJ en construcción — endpoints de formularios no implementados',
    )


@router.put('/{formulario_id}', status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def update_formulario(formulario_id: int, current_user: Usuario = Depends(get_current_user)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Módulo SIEEJ en construcción',
    )


@router.delete('/{formulario_id}', status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def delete_formulario(formulario_id: int, current_user: Usuario = Depends(get_current_user)):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail='Módulo SIEEJ en construcción',
    )
