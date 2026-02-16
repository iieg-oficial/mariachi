from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.history import HistoryEntry
from app.models.user import Usuario

router = APIRouter(prefix="/historial", tags=["historial"])


@router.get("")
async def obtener_historial(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    user_id: int | None = Query(None),
    resource: str | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    query = db.query(HistoryEntry)

    if user_id:
        query = query.filter(HistoryEntry.user_id == user_id)

    if resource:
        query = query.filter(HistoryEntry.resource == resource)

    if action:
        query = query.filter(HistoryEntry.action == action)

    entries = query.order_by(HistoryEntry.timestamp.desc()).limit(limit).all()

    return [
        {
            "id": entry.id,
            "userId": str(entry.user_id),
            "userName": entry.user.name if entry.user else "Unknown",
            "userRole": entry.user.role if entry.user else "Unknown",
            "action": entry.action,
            "resource": entry.resource,
            "resourceId": entry.resource_id,
            "description": entry.description,
            "details": entry.details,
            "timestamp": entry.timestamp.isoformat(),
        }
        for entry in entries
    ]


@router.get("/stats")
async def obtener_estadisticas(
    db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)
):
    total_entries = db.query(HistoryEntry).count()

    by_action = dict(
        db.query(HistoryEntry.action, func.count(HistoryEntry.id))
        .group_by(HistoryEntry.action)
        .all()
    )

    by_resource = dict(
        db.query(HistoryEntry.resource, func.count(HistoryEntry.id))
        .group_by(HistoryEntry.resource)
        .all()
    )

    by_user_query = (
        db.query(Usuario.name, func.count(HistoryEntry.id))
        .join(HistoryEntry, Usuario.id == HistoryEntry.user_id)
        .group_by(Usuario.name)
        .all()
    )
    by_user = dict(by_user_query)

    recent_activity = (
        db.query(HistoryEntry).order_by(HistoryEntry.timestamp.desc()).limit(5).all()
    )

    return {
        "totalEntries": total_entries,
        "byAction": by_action,
        "byResource": by_resource,
        "byUser": by_user,
        "recentActivity": [
            {
                "id": entry.id,
                "userName": entry.user.name if entry.user else "Unknown",
                "action": entry.action,
                "resource": entry.resource,
                "description": entry.description,
                "timestamp": entry.timestamp.isoformat(),
            }
            for entry in recent_activity
        ],
    }

