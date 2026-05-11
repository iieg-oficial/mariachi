"""Audit log de acciones admin (US #148).

Helper centralizado para registrar actividad en `actividad_log`. Los
servicios y endpoints que ya hacen `logger.info(action=...)` pueden
opcionalmente llamar `registrar_actividad` para persistir el evento.

La escritura es best-effort: si la insercion falla (e.g. la sesion ya
hizo rollback), se loguea warning sin propagar. Esto evita que un fallo
de auditoria tumbe la operacion original.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.actividad_log import ActividadLog
from app.models.user import Usuario

logger = logging.getLogger(__name__)


def registrar_actividad(
    db: Session,
    *,
    actor: Usuario | None,
    action: str,
    resource_type: str | None = None,
    resource_id: str | int | None = None,
    metadata: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    """Inserta una fila en `actividad_log`. No hace commit (el caller decide
    cuando commitear, normalmente junto con la operacion principal).
    """
    try:
        entry = ActividadLog(
            actor_id=actor.id if actor else None,
            actor_role=actor.role if actor else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            log_metadata=metadata or {},
            ip=ip,
        )
        db.add(entry)
    except Exception as exc:
        logger.warning(
            "actividad_log insert fallo action=%s actor=%s: %s",
            action,
            actor.id if actor else None,
            exc,
        )
