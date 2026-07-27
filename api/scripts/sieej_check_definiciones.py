"""Verifica que las definiciones de formularios en BD cumplan el contrato vigente.

Pensado para correr en el deploy, antes y despues de migrar:

    docker exec mariachi-api python scripts/sieej_check_definiciones.py
    docker exec mariachi-api python scripts/sieej_check_definiciones.py --fix

Sin flags solo reporta (exit 1 si alguna definicion no valida, exit 0 si
todas pasan). Con `--fix` reescribe las que requieren normalizacion, que es
lo mismo que hace la migracion `c3d4e5f6a7b9`: sirve para reparar una BD
restaurada de un backup viejo sin volver a correr alembic.

Salida: una linea JSON por tabla mas un resumen final.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.core.database import SessionLocal
from app.services.sieej.compat import normalizar_definicion
from app.services.sieej.definicion_validator import (
    DefinicionInvalidaError,
    validar_definicion,
)

TABLAS = [
    ("sieej.formulario", "definicion", "json"),
    ("sieej.envio_formulario", "definicion_snapshot", "json"),
    ("sieej.formulario_version", "definicion", "jsonb"),
]


def _as_dict(value):
    return json.loads(value) if isinstance(value, str) else value


def _revisar_tabla(db, tabla: str, columna: str, cast: str, fix: bool) -> dict:
    filas = (
        db.execute(text(f"SELECT id, {columna} AS defn FROM {tabla}"))
        .mappings()
        .all()
    )
    invalidas: list[dict] = []
    normalizables: list[int] = []
    reparadas = 0

    for fila in filas:
        actual = _as_dict(fila["defn"])
        if not isinstance(actual, dict):
            invalidas.append({"id": fila["id"], "error": "la definicion no es un objeto"})
            continue

        try:
            validar_definicion(actual)
            vigente = True
        except DefinicionInvalidaError as exc:
            vigente = False
            motivo = str(exc)

        normalizada = normalizar_definicion(actual)
        if normalizada != actual:
            normalizables.append(fila["id"])

        if not vigente:
            try:
                validar_definicion(normalizada)
            except DefinicionInvalidaError as exc:
                invalidas.append({"id": fila["id"], "error": str(exc)})
                continue
            if not fix:
                invalidas.append({"id": fila["id"], "error": f"legada: {motivo}"})

        if fix and normalizada != actual:
            db.execute(
                text(
                    f"UPDATE {tabla} SET {columna} = CAST(:defn AS {cast}) "
                    "WHERE id = :id"
                ),
                {"defn": json.dumps(normalizada, ensure_ascii=False), "id": fila["id"]},
            )
            reparadas += 1

    return {
        "tabla": tabla,
        "revisadas": len(filas),
        "requieren_normalizar": len(normalizables),
        "reparadas": reparadas,
        "irrecuperables": invalidas,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fix",
        action="store_true",
        help="reescribe en BD las definiciones que requieren normalizacion",
    )
    args = parser.parse_args()

    try:
        db = SessionLocal()
    except Exception as exc:
        print(json.dumps({"error": f"db connection failed: {exc}"}), file=sys.stderr)
        return 1

    problemas = 0
    try:
        for tabla, columna, cast in TABLAS:
            resumen = _revisar_tabla(db, tabla, columna, cast, args.fix)
            problemas += len(resumen["irrecuperables"])
            print(json.dumps(resumen, ensure_ascii=False))
        if args.fix:
            db.commit()
    except Exception as exc:
        db.rollback()
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 1
    finally:
        db.close()

    print(json.dumps({"ok": problemas == 0, "pendientes": problemas}))
    return 0 if problemas == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
