from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.catalogos import (
    CatalogoAdminItem,
    CatalogoItemPayload,
    CatalogoPayload,
    CatalogoReordenarPayload,
    CatalogoResumen,
)
from app.services.sieej.catalogos_service import CatalogosService

router = APIRouter()

_ver_formularios = [Depends(require_permission("mariachi.sieej_formularios.view"))]
_editar_formularios = [Depends(require_permission("mariachi.sieej_formularios.update"))]


@router.get("/catalogos", response_model=list[CatalogoResumen], dependencies=_ver_formularios)
async def listar_catalogos(db: Session = Depends(get_db)):
    return CatalogosService(db).listar_catalogos()


@router.post(
    "/catalogos",
    response_model=CatalogoResumen,
    status_code=status.HTTP_201_CREATED,
    dependencies=_editar_formularios,
)
async def create_catalog(
    payload: CatalogoPayload,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return CatalogosService(db).create_catalog(payload.label, payload.clave)


@router.put("/catalogos/{clave}", response_model=CatalogoResumen, dependencies=_editar_formularios)
async def update_catalog(
    clave: str,
    payload: CatalogoPayload,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return CatalogosService(db).update_catalog(clave, payload.label)


@router.delete("/catalogos/{clave}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_editar_formularios)
async def delete_catalog(
    clave: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    CatalogosService(db).delete_catalog(clave)


@router.get("/catalogos/{clave}", response_model=list[CatalogoAdminItem], dependencies=_ver_formularios)
async def listar_items(clave: str, db: Session = Depends(get_db)):
    return CatalogosService(db).listar_items(clave)


@router.post(
    "/catalogos/{clave}",
    response_model=CatalogoAdminItem,
    status_code=status.HTTP_201_CREATED,
    dependencies=_editar_formularios,
)
async def crear_item(
    clave: str,
    payload: CatalogoItemPayload,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return CatalogosService(db).crear(clave, payload.value)


@router.put("/catalogos/{clave}/reordenar", response_model=list[CatalogoAdminItem], dependencies=_editar_formularios)
async def reordenar_items(
    clave: str,
    payload: CatalogoReordenarPayload,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return CatalogosService(db).reordenar(clave, payload.orden)


@router.put("/catalogos/{clave}/{item_id}", response_model=CatalogoAdminItem, dependencies=_editar_formularios)
async def renombrar_item(
    clave: str,
    item_id: int,
    payload: CatalogoItemPayload,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return CatalogosService(db).renombrar(clave, item_id, payload.value)


@router.delete("/catalogos/{clave}/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=_editar_formularios)
async def eliminar_item(
    clave: str,
    item_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    CatalogosService(db).eliminar(clave, item_id)
