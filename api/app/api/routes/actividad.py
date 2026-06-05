"""Endpoint admin de consulta de actividad (US #148).

Lista entradas de `actividad_log` con filtros y paginacion. Solo
`tetlamamakani` accede; cualquier otro rol recibe 403 via include_router.
"""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE, require_role
from app.core.database import get_db
from app.models.actividad_log import ActividadLog
from app.models.user import Usuario

router = APIRouter(prefix="/actividad", tags=["actividad"])

_require_admin = require_role([ADMIN_ROLE])


@router.get("")
async def listar_actividad(
    db: Session = Depends(get_db),
    actor_id: int | None = Query(None),
    actor_role: str | None = Query(None, pattern=r"^(tetlamamakani|editora|externo)$"),
    action_prefix: str | None = Query(None, max_length=64),
    resource_type: str | None = Query(None, max_length=64),
    desde: datetime | None = Query(None),
    hasta: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: Usuario = Depends(_require_admin),
):
    query = db.query(ActividadLog, Usuario).outerjoin(
        Usuario, ActividadLog.actor_id == Usuario.id
    )
    if actor_id is not None:
        query = query.filter(ActividadLog.actor_id == actor_id)
    if actor_role:
        query = query.filter(ActividadLog.actor_role == actor_role)
    if action_prefix:
        query = query.filter(ActividadLog.action.like(f"{action_prefix}%"))
    if resource_type:
        query = query.filter(ActividadLog.resource_type == resource_type)
    if desde:
        query = query.filter(ActividadLog.created_at >= desde)
    if hasta:
        query = query.filter(ActividadLog.created_at <= hasta)

    total = query.count()
    rows = (
        query.order_by(ActividadLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "items": [
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "actor_role": e.actor_role,
                "actor_name": actor.name if actor else None,
                "actor_username": actor.username if actor else None,
                "actor_avatar_url": actor.avatar_url if actor else None,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "metadata": e.log_metadata or {},
                "ip": e.ip,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e, actor in rows
        ],
    }
