from sqlalchemy.orm import Session

from app.models.history import HistoryEntry


def registrar_accion(
    db: Session,
    user_id: int,
    action: str,
    resource: str,
    resource_id: str | None = None,
    description: str = "",
    details: dict | None = None,
):
    entrada = HistoryEntry(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        description=description,
        details=details or {},
    )
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    return entrada
