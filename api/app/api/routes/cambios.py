from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import PANEL_PERMISSIONS, get_current_user, get_db, has_permission
from app.core.cambios import flujo
from app.models.user import Usuario

router = APIRouter(prefix="/cambios", tags=["cambios"])


def puede_ver(usuario: Usuario, evento: dict) -> bool:
    return all(
        any(has_permission(usuario, permiso) for permiso in grupo)
        for grupo in evento.get("permisos") or []
    )


@router.get("/stream")
async def stream_de_cambios(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> StreamingResponse:
    if not any(has_permission(current_user, p) for p in PANEL_PERMISSIONS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso al panel")
    db.close()
    return StreamingResponse(
        flujo(lambda evento: puede_ver(current_user, evento), request.is_disconnected),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
