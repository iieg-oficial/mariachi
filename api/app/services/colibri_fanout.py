import logging

from app.core.database import SessionLocal
from app.models.reporte import Reporte
from app.services.colibri_router_engine import dispatch_reporte
from app.services.discord_notifier import notify_new_reporte

logger = logging.getLogger(__name__)


def despachar_reporte(reporte_id: int) -> None:
    db = SessionLocal()
    try:
        reporte = db.query(Reporte).filter(Reporte.id == reporte_id).first()
        if reporte is None:
            return
        try:
            dispatch_reporte(reporte, db)
        except Exception:
            logger.exception("reportes.dispatch_routes reporte_id=%s", reporte_id)
        try:
            notify_new_reporte(reporte)
        except Exception:
            logger.exception("reportes.discord_notify reporte_id=%s", reporte_id)
    finally:
        db.close()
