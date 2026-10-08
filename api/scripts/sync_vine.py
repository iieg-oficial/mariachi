"""Trae del biometrico los accesos que falten en el schema vine.

Pensado para invocarse desde cron cada 10 minutos:
    */10 * * * * cd /app && python scripts/sync_vine.py

Sale en 0 sin hacer nada si el modulo esta apagado, para que el cron no reporte
error en los nodos donde vine no corre.
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.core.settings import get_settings
from app.services.vine_sync import VineSyncError, sincronizar


def main() -> None:
    settings = get_settings()
    if not settings.vine_enabled:
        print("[sync_vine] VINE_ENABLED apagado, no hay nada que hacer", flush=True)
        return

    session = SessionLocal()
    try:
        resultado = sincronizar(session)
        print(
            f"[sync_vine] personas={resultado['personas']} "
            f"eventos_nuevos={resultado['eventos_nuevos']} "
            f"ultimo_id={resultado['ultimo_id']}",
            flush=True,
        )
    except VineSyncError as exc:
        print(f"[sync_vine] error: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
