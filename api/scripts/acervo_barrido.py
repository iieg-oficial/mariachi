"""Busca en Acervo objetos servidos con un tipo que no es el suyo.

Hasta la auditoria de 2026-09-24 las subidas guardaban el `Content-Type` que
mandaba el cliente: un HTML subido como `reporte.pdf` quedo guardado como
`application/pdf` o como `text/html` servido inline. Este barrido lee los
primeros bytes de cada objeto con un GET por rango, los compara con el tipo
guardado y con la extension y reporta lo que no cuadra.

    docker exec mariachi-api python scripts/acervo_barrido.py
    docker exec mariachi-api python scripts/acervo_barrido.py --bucket sieej
    docker exec mariachi-api python scripts/acervo_barrido.py --corregir

Sin argumentos solo reporta, en CSV por stdout, y no escribe nada. Con
`--corregir` reescribe los metadatos de cada hallazgo (copia del objeto sobre
si mismo): pone el tipo real y `Content-Disposition: attachment` a todo lo que
no sea imagen raster o PDF. El contenido no se toca. El bucket `portal` se
excluye siempre.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.services.acervo_barrido import BUCKETS_EXCLUIDOS, CAMPOS, barrer


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--bucket",
        action="append",
        default=[],
        help="limita el barrido a este bucket; se puede repetir",
    )
    parser.add_argument(
        "--corregir",
        action="store_true",
        help="reescribe los metadatos de los hallazgos en vez de solo reportarlos",
    )
    args = parser.parse_args()

    for nombre in args.bucket:
        if nombre in BUCKETS_EXCLUIDOS:
            print(f"bucket '{nombre}' excluido del barrido, se omite", file=sys.stderr)

    db = SessionLocal()
    try:
        hallazgos, resumen = barrer(db, corregir=args.corregir, nombres=args.bucket)
    finally:
        db.close()

    writer = csv.DictWriter(sys.stdout, fieldnames=CAMPOS)
    writer.writeheader()
    for hallazgo in hallazgos:
        writer.writerow(hallazgo.fila())

    modo = "corregir" if args.corregir else "reporte"
    print(
        f"modo={modo} buckets={','.join(resumen.buckets) or '-'} "
        f"revisados={resumen.revisados} hallazgos={resumen.hallazgos} "
        f"corregidos={resumen.corregidos} errores={resumen.errores}",
        file=sys.stderr,
    )
    return 1 if resumen.errores else 0


if __name__ == "__main__":
    raise SystemExit(main())
