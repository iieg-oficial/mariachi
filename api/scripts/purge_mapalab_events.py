"""Purga eventos crudos de mapalab y del MCP más antiguos que la retención configurada.

Los agregados viven en los rollups diarios `huachicol.rollup_*` y
`huachicol.mcp_rollup_*`, que solo recalculan los últimos días y conservan
el histórico; los eventos crudos sirven para drilldowns recientes. Mantener
retención corta evita inflar `huachicol.events` y `huachicol.mcp_events`.
MAPALAB_EVENTS_RETENTION_DAYS aplica a ambas tablas de eventos.

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
from app.models.mapalab_mcp_event import MapalabMcpEvent


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
        deleted_mcp_events = (
            session.query(MapalabMcpEvent)
            .filter(MapalabMcpEvent.timestamp < events_cutoff.replace(tzinfo=None))
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
            f"deleted_events={deleted_events} deleted_mcp_events={deleted_mcp_events} "
            f"deleted_sessions={deleted_sessions}",
            flush=True,
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()
