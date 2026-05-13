"""Purga eventos crudos de mapalab más antiguos que la retención configurada.

Las vistas materializadas conservan agregados; los eventos crudos solo
sirven para drilldowns recientes. Mantener retención corta evita inflar
la tabla.

Variables de entorno:
    MAPALAB_EVENTS_RETENTION_DAYS (default 90)
    MAPALAB_SESSIONS_RETENTION_DAYS (default 180)
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.mapalab_event import MapalabEvent, MapalabSession


def main() -> None:
    events_days = int(os.environ.get("MAPALAB_EVENTS_RETENTION_DAYS", "90"))
    sessions_days = int(os.environ.get("MAPALAB_SESSIONS_RETENTION_DAYS", "180"))
    events_cutoff = datetime.now(timezone.utc) - timedelta(days=events_days)
    sessions_cutoff = datetime.now(timezone.utc) - timedelta(days=sessions_days)

    session = SessionLocal()
    try:
        deleted_events = (
            session.query(MapalabEvent)
            .filter(MapalabEvent.ts < events_cutoff)
            .delete(synchronize_session=False)
        )
        deleted_sessions = (
            session.query(MapalabSession)
            .filter(MapalabSession.last_seen_at < sessions_cutoff)
            .delete(synchronize_session=False)
        )
        session.commit()
        print(
            f"[purge_mapalab_events] events_retention={events_days}d "
            f"sessions_retention={sessions_days}d "
            f"deleted_events={deleted_events} deleted_sessions={deleted_sessions}",
            flush=True,
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()
