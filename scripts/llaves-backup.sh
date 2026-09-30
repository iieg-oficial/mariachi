#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-backups/llaves}"
RETENER="${RETENER:-30}"
LLAVES_MINIMAS="${LLAVES_MINIMAS:-1}"
. "$(dirname "$0")/respaldo-json.sh"

datos=$(psql_base < "$SQL_DIR/llaves-backup.sql")

total=$(printf '%s' "$datos" | contar_filas)
if [ "$total" -lt "$LLAVES_MINIMAS" ]; then
    printf '[llaves-backup] ERROR: el respaldo trae %s filas y se esperaban al menos %s\n' "$total" "$LLAVES_MINIMAS"
    exit 1
fi
guardar_respaldo llaves "$datos" "$OUT_DIR" "$RETENER"
printf '%s' "$datos" | python3 -c 'import json, sys; d = json.load(sys.stdin); print("[llaves-backup] " + ", ".join(f"{k} {len(v)}" for k, v in d.items()))'
