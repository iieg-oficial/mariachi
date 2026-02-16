from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import Usuario


NOTIFICATION_TYPES = {
    "APPROVAL_REQUEST": "approval_request",
    "APPROVAL_APPROVED": "approval_approved",
    "APPROVAL_REJECTED": "approval_rejected",
    "SCHEDULED_PUBLISH": "scheduled_publish",
    "PAGE_UPDATED": "page_updated",
    "PAGE_PUBLISHED": "page_published",
    "MENU_UPDATED": "menu_updated",
    "PUBLICATION_REQUESTED": "publication_requested",
    "SYSTEM": "system",
}


def crear_notificacion(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    data: dict | None = None,
):
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        data=data or {},
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def notificar_admins(
    db: Session,
    type: str,
    title: str,
    message: str,
    data: dict | None = None,
    exclude_user_id: int | None = None,
):
    admins = db.query(Usuario).filter(Usuario.role == "tetlamamakani").all()

    for admin in admins:
        if exclude_user_id and admin.id == exclude_user_id:
            continue
        crear_notificacion(db, admin.id, type, title, message, data)


def notificar_usuario(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    data: dict | None = None,
):
    crear_notificacion(db, user_id, type, title, message, data)
