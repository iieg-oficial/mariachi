"""Busca en el biometrico los accesos con id viejo que el sync incremental no ve.

El sync solo pide ids por encima del ultimo copiado. Esta pasada compara todos
los ids del origen hasta ese punto y copia los que falten marcados como tardios.
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.core.settings import get_settings
from app.services.vine_sync import VineSyncError, conciliar


def main() -> None:
    settings = get_settings()
    if not settings.vine_enabled:
        print("[conciliar_vine] VINE_ENABLED apagado, no hay nada que hacer", flush=True)
        return

    session = SessionLocal()
    try:
        resultado = conciliar(session)
        print(
            f"[conciliar_vine] revisados={resultado['revisados']} "
            f"hasta_id={resultado['hasta_id']} tardios={resultado['tardios']} "
            f"ids={resultado['ids']}",
            flush=True,
        )
    except VineSyncError as exc:
        print(f"[conciliar_vine] error: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
