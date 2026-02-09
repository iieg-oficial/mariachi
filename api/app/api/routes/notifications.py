from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import Usuario
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notificaciones"])


@router.get("", response_model=list[NotificationResponse])
async def listar_notificaciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    unread_only: bool = False,
    limit: int = 50,
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.read == False)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.get("/count")
async def contar_no_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .count()
    )
    return {"unreadCount": count}


@router.put("/{notification_id}/read")
async def marcar_como_leida(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

    notification.read = True
    db.commit()
    return {"message": "Notificación marcada como leída"}


@router.put("/read-all")
async def marcar_todas_como_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.read == False
    ).update({"read": True})
    db.commit()
    return {"message": "Todas las notificaciones marcadas como leídas"}


@router.delete("/{notification_id}")
async def eliminar_notificacion(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")

    db.delete(notification)
    db.commit()
    return {"message": "Notificación eliminada"}


@router.delete("")
async def eliminar_todas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Todas las notificaciones eliminadas"}
