"""Recomputa los rollups diarios persistentes de mapalab-stats.

Pensado para invocarse desde cron cada 30 minutos:
    */30 * * * * cd /app && python scripts/refresh_mapalab_stats.py
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.services.mapalab_telemetry import rollup_stats


def main() -> None:
    session = SessionLocal()
    try:
        refreshed = rollup_stats(session)
        print(
            f"[refresh_mapalab_stats] rolled_up={','.join(refreshed)}",
            flush=True,
        )
    finally:
        session.close()


if __name__ == "__main__":
    main()
