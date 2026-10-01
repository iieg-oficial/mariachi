#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-backups/llaves}"
RETENER="${RETENER:-30}"
LLAVES_MINIMAS="${LLAVES_MINIMAS:-1}"
. "$(dirname "$0")/respaldo-json.sh"

parcial="$OUT_DIR/llaves-$(date +%Y%m%d-%H%M%S).json.gz.parcial"
trap 'rm -f "$parcial"' EXIT
volcar_respaldo llaves-backup.sql "$parcial"

total=$(gzip -dc "$parcial" | contar_filas)
if [ "$total" -lt "$LLAVES_MINIMAS" ]; then
    printf '[llaves-backup] ERROR: el respaldo trae %s filas y se esperaban al menos %s\n' "$total" "$LLAVES_MINIMAS"
    exit 1
fi
resumen=$(gzip -dc "$parcial" | python3 -c 'import json, sys; d = json.load(sys.stdin); print(", ".join(f"{k} {len(v)}" for k, v in d.items()))')
publicar_respaldo llaves "$parcial" "$OUT_DIR" "$RETENER"
printf '[llaves-backup] %s\n' "$resumen"
