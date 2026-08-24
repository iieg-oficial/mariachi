from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.grupo import (
    GrupoCreate,
    GrupoResponse,
    GrupoUpdate,
    GrupoUsuariosUpdate,
)
from app.services.sieej.grupos_service import GruposService

router = APIRouter()


@router.get("/grupos", response_model=list[GrupoResponse])
async def listar_grupos(db: Session = Depends(get_db)):
    return GruposService(db).listar()


@router.post(
    "/grupos",
    response_model=GrupoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_grupo(
    data: GrupoCreate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return GruposService(db).crear(data.nombre, data.descripcion, data.usuarios)


@router.get("/grupos/{grupo_id}", response_model=GrupoResponse)
async def obtener_grupo(
    grupo_id: int,
    db: Session = Depends(get_db),
):
    return GruposService(db).get(grupo_id)


@router.put("/grupos/{grupo_id}", response_model=GrupoResponse)
async def actualizar_grupo(
    grupo_id: int,
    data: GrupoUpdate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return GruposService(db).actualizar(grupo_id, data.nombre, data.descripcion)


@router.delete("/grupos/{grupo_id}")
async def eliminar_grupo(
    grupo_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    GruposService(db).eliminar(grupo_id)
    return {"message": "Grupo eliminado"}


@router.put("/grupos/{grupo_id}/usuarios", response_model=GrupoResponse)
async def actualizar_miembros(
    grupo_id: int,
    data: GrupoUsuariosUpdate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return GruposService(db).actualizar_miembros(
        grupo_id, data.usuarios, data.coordinadores
    )


@router.get("/grupos/{grupo_id}/usuarios")
async def listar_miembros(
    grupo_id: int,
    db: Session = Depends(get_db),
):
    miembros = GruposService(db).listar_miembros(grupo_id)
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "rol_grupo": rol,
        }
        for u, rol in miembros
    ]
