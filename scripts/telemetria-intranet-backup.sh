#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-backups/telemetria-intranet}"
RETENER="${RETENER:-30}"
. "$(dirname "$0")/respaldo-json.sh"

datos=$(psql_base < "$SQL_DIR/telemetria-intranet-backup.sql")

total=$(printf '%s' "$datos" | contar_filas)
if [ "$total" -eq 0 ]; then
    echo '[telemetria-intranet-backup] sin filas de intranet: no se guarda para no rotar respaldos buenos'
    exit 0
fi
guardar_respaldo telemetria-intranet "$datos" "$OUT_DIR" "$RETENER"
printf '[telemetria-intranet-backup] %s filas\n' "$total"
