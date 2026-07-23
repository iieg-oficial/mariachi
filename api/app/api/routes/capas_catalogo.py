from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.api.routes.layers._deps import (
    map_domain_errors,
    require_project_editor,
    write_rate_limit,
)
from app.core.database import get_dataengine_db
from app.models.layer import Workspace
from app.models.user import Usuario
from app.schemas.capas_catalogo import (
    CapaCatalogoBulkCreate,
    CapaCatalogoBulkDelete,
    CapaCatalogoCreate,
    CapaCatalogoReorder,
    CapaCatalogoResponse,
    CapaCatalogoUpdate,
)
from app.services import capas_catalogo_service
from app.services.geoserver_client import GeoServerClient, GeoServerError

router = APIRouter(prefix="/catalogo", tags=["catalogo"])


def _resolve_workspace(db: Session, alias: str) -> Workspace:
    workspace = db.query(Workspace).filter(Workspace.alias == alias).first()
    if workspace is None:
        raise HTTPException(status_code=404, detail=f"Workspace '{alias}' no encontrado")
    return workspace


@router.get("", response_model=list[CapaCatalogoResponse])
async def list_capas(
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    return capas_catalogo_service.get_capas(db)


@router.get("/tags")
async def list_tags(
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    return capas_catalogo_service.get_all_tags(db)


@router.get("/geoserver/{alias}/layers")
async def list_geoserver_layers(
    alias: str,
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    workspace = _resolve_workspace(db, alias)
    try:
        layers = GeoServerClient().get_layers_with_titles(workspace.geoserver_workspace)
    except Exception:
        layers = []
    return {"layers": layers}


@router.get("/geoserver/{alias}/layers/{layer}")
async def get_geoserver_layer_meta(
    alias: str,
    layer: str,
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    workspace = _resolve_workspace(db, alias)
    client = GeoServerClient()
    if not client.layer_exists(workspace.geoserver_workspace, layer):
        raise HTTPException(status_code=404, detail=f"Capa '{layer}' no existe en GeoServer")
    try:
        title = client.get_layer_title(workspace.geoserver_workspace, layer)
    except Exception:
        title = None
    return {"name": layer, "title": title}


@router.get("/{capa_id}", response_model=CapaCatalogoResponse)
async def get_capa(
    capa_id: int,
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    capa = capas_catalogo_service.get_capa(db, capa_id)
    if not capa:
        raise HTTPException(status_code=404, detail=f"Capa '{capa_id}' no encontrada")
    return capa


@router.post("", response_model=CapaCatalogoResponse, status_code=201)
async def create_capa(
    data: CapaCatalogoCreate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(require_project_editor),
    _rl: Usuario = Depends(write_rate_limit),
):
    try:
        capa = capas_catalogo_service.create_capa(db, data, updated_by=current_user.email)
        db.commit()
        db.refresh(capa)
        return capa
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise map_domain_errors(exc) from exc


@router.post("/bulk", status_code=201)
async def bulk_create(
    data: CapaCatalogoBulkCreate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(require_project_editor),
    _rl: Usuario = Depends(write_rate_limit),
):
    try:
        result = capas_catalogo_service.bulk_create_capas(
            db,
            data.workspace_alias,
            data.geoserver_layers,
            data.search_tags,
            updated_by=current_user.email,
        )
        db.commit()
        return result
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise map_domain_errors(exc) from exc


@router.post("/bulk-delete", status_code=200)
async def bulk_delete(
    data: CapaCatalogoBulkDelete,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(require_project_editor),
    _rl: Usuario = Depends(write_rate_limit),
):
    result = capas_catalogo_service.bulk_delete_capas(
        db, data.ids, deleted_by=current_user.email
    )
    db.commit()
    return result


@router.put("/reorder", response_model=list[CapaCatalogoResponse])
async def reorder_capas(
    data: CapaCatalogoReorder,
    db: Session = Depends(get_dataengine_db),
    _current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(require_project_editor),
    _rl: Usuario = Depends(write_rate_limit),
):
    capas = capas_catalogo_service.reorder_capas(db, data.ids)
    db.commit()
    return capas


@router.put("/{capa_id}", response_model=CapaCatalogoResponse)
async def update_capa(
    capa_id: int,
    data: CapaCatalogoUpdate,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(require_project_editor),
    _rl: Usuario = Depends(write_rate_limit),
):
    capa = capas_catalogo_service.get_capa(db, capa_id)
    if not capa:
        raise HTTPException(status_code=404, detail=f"Capa '{capa_id}' no encontrada")
    try:
        capa = capas_catalogo_service.update_capa(
            db, capa, data, updated_by=current_user.email
        )
        db.commit()
        db.refresh(capa)
        return capa
    except (ValueError, GeoServerError) as exc:
        db.rollback()
        raise map_domain_errors(exc) from exc


@router.delete("/{capa_id}", status_code=200)
async def delete_capa(
    capa_id: int,
    db: Session = Depends(get_dataengine_db),
    current_user: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(require_project_editor),
    _rl: Usuario = Depends(write_rate_limit),
):
    capa = capas_catalogo_service.get_capa(db, capa_id)
    if not capa:
        raise HTTPException(status_code=404, detail=f"Capa '{capa_id}' no encontrada")
    capas_catalogo_service.delete_capa(db, capa, deleted_by=current_user.email)
    db.commit()
    return {"id": capa_id, "deletedAt": capa.deleted_at}
