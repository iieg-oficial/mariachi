from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role, verify_csrf
from app.core.time import utcnow
from app.models.colibri_route import ColibriRoute
from app.models.user import Usuario
from app.schemas.colibri_route import (
    ColibriRouteCreate,
    ColibriRouteResponse,
    ColibriRouteUpdate,
)
from app.services.actividad_service import registrar_actividad

router = APIRouter(prefix="/colibri/routes", tags=["colibri routes"])


@router.get("", response_model=list[ColibriRouteResponse])
async def listar_routes(
    db: Session = Depends(get_db),
    activo: bool | None = Query(default=None),
    _admin: Usuario = Depends(require_role(["tetlamamakani"])),
):
    query = db.query(ColibriRoute)
    if activo is not None:
        query = query.filter(ColibriRoute.activo.is_(activo))
    return (
        query.order_by(ColibriRoute.orden.asc(), ColibriRoute.id.asc()).all()
    )


@router.get("/{route_id}", response_model=ColibriRouteResponse)
async def obtener_route(
    route_id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_role(["tetlamamakani"])),
):
    route = db.query(ColibriRoute).filter(ColibriRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route no encontrada")
    return route


@router.post("", response_model=ColibriRouteResponse, status_code=status.HTTP_201_CREATED)
async def crear_route(
    payload: ColibriRouteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    route = ColibriRoute(**payload.model_dump())
    db.add(route)
    db.flush()
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.route.create",
        resource_type="colibri.route",
        resource_id=route.id,
        metadata={"nombre": route.nombre, "kind": route.kind},
    )
    db.commit()
    db.refresh(route)
    return route


@router.patch("/{route_id}", response_model=ColibriRouteResponse)
async def actualizar_route(
    route_id: int,
    payload: ColibriRouteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    route = db.query(ColibriRoute).filter(ColibriRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route no encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(route, field, value)
    route.actualizado_en = utcnow()
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.route.update",
        resource_type="colibri.route",
        resource_id=route.id,
        metadata={"fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(route)
    return route


@router.delete("/{route_id}")
async def eliminar_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    __: Usuario = Depends(require_role(["tetlamamakani"])),
):
    route = db.query(ColibriRoute).filter(ColibriRoute.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route no encontrada")
    route_id_local = route.id
    route_nombre = route.nombre
    registrar_actividad(
        db,
        actor=current_user,
        action="colibri.route.delete",
        resource_type="colibri.route",
        resource_id=route_id_local,
        metadata={"nombre": route_nombre},
    )
    db.delete(route)
    db.commit()
    return {"message": "Route eliminada"}
