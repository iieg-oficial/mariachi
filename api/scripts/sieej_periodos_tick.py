"""Tick de apertura periodica de formularios SIEEJ.

Materializa periodos, abre/cierra ventanas segun la fecha, expira los envios
en proceso de las ventanas que cerraron y dispara los avisos (apertura y
faltantes). Idempotente: correrlo varias veces no reenvia avisos ni reabre
ventanas.

Diseñado para el loop del contenedor `cron-sieej` o para crontab del host:

    docker exec mariachi-api python scripts/sieej_periodos_tick.py

Equivalente al endpoint admin `POST /sieej/periodos/tick` pero sin credenciales
(corre en proceso del API con acceso directo a la BD). Imprime un resumen JSON,
o falla con exit code 1 si la BD no esta disponible.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.services.sieej.periodos_service import PeriodosService


def main() -> int:
    try:
        db = SessionLocal()
    except Exception as exc:
        print(json.dumps({"error": f"db connection failed: {exc}"}), file=sys.stderr)
        return 1

    try:
        resumen = PeriodosService(db).tick()
    finally:
        db.close()

    print(json.dumps(resumen))
    return 0


if __name__ == "__main__":
    sys.exit(main())
