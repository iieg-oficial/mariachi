#!/usr/bin/env bash
set -euo pipefail

ARCHIVO="${1:?uso: llaves-restore.sh <archivo.json.gz>}"
. "$(dirname "$0")/respaldo-json.sh"

[ -s "$ARCHIVO" ] || { echo "No existe o esta vacio: $ARCHIVO" >&2; exit 1; }
resumen=$(gzip -dc "$ARCHIVO" | python3 -c 'import json, sys; d = json.load(sys.stdin); print(", ".join(f"{k} {len(v)}" for k, v in d.items()))')
confirmar_restore llaves "las llaves de $ARCHIVO ($resumen) con las de la base: solo se agregan las que falten, las existentes no se tocan"

sql_con_datos "$ARCHIVO" llaves-restore.sql | psql_base | sed 's/^/  Agregadas: /'
