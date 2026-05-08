"""Bulk-expire de envios SIEEJ que pasaron vigencia.

Diseñado para invocacion desde cron del host:

    docker exec mariachi-api python scripts/expire_sieej_envios.py

Imprime una linea con el numero de envios afectados (formato JSON), o
falla con exit code 1 si la BD no esta disponible. Idempotente: correrlo
varias veces no afecta envios ya en estado expirado.

Para programar via crontab del host (cada hora en punto):

    0 * * * * docker exec mariachi-api python scripts/expire_sieej_envios.py >> /var/log/sieej-expire.log 2>&1

Equivalente al endpoint admin `POST /sieej/expirar-envios-pendientes` pero
sin necesidad de credenciales — corre en proceso del API con acceso DB.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.services.sieej.envios_service import EnviosService


def main() -> int:
    try:
        db = SessionLocal()
    except Exception as exc:
        print(json.dumps({"error": f"db connection failed: {exc}"}), file=sys.stderr)
        return 1

    try:
        afectados = EnviosService(db).expirar_pendientes_bulk()
    finally:
        db.close()

    print(json.dumps({"expirados": afectados}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
