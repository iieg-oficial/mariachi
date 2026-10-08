"""Purga registros de acceso al embed mapalab más antiguos que la retención configurada.

Variables de entorno:
    MAPALAB_ACCESOS_RETENTION_DAYS (default 90)
    MAPALAB_DIARIO_RETENTION_DAYS (default 365): uso, rendimiento y sitios por día
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.mapalab_api_key_acceso import MapalabApiKeyAcceso
from app.services.mapalab_keys_telemetria import purgar_diarios


def main() -> None:
    retention_days = int(os.environ.get('MAPALAB_ACCESOS_RETENTION_DAYS', '90'))
    diario_retention_days = int(os.environ.get('MAPALAB_DIARIO_RETENTION_DAYS', '365'))
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    session = SessionLocal()
    try:
        deleted = (
            session.query(MapalabApiKeyAcceso)
            .filter(MapalabApiKeyAcceso.timestamp < cutoff)
            .delete(synchronize_session=False)
        )
        session.commit()
        print(
            f"[purge_mapalab_accesos] retention={retention_days}d cutoff={cutoff.isoformat()} deleted={deleted}",
            flush=True,
        )
        diarios = purgar_diarios(session, datetime.now(timezone.utc).date(), diario_retention_days)
        print(
            f"[purge_mapalab_accesos] diario retention={diario_retention_days}d deleted={diarios}",
            flush=True,
        )
    finally:
        session.close()


if __name__ == '__main__':
    main()
