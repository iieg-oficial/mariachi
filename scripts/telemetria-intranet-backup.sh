#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${OUT_DIR:-backups/telemetria-intranet}"
RETENER="${RETENER:-30}"
. "$(dirname "$0")/respaldo-json.sh"

parcial="$OUT_DIR/telemetria-intranet-$(date +%Y%m%d-%H%M%S).json.gz.parcial"
trap 'rm -f "$parcial"' EXIT
volcar_respaldo telemetria-intranet-backup.sql "$parcial"

total=$(gzip -dc "$parcial" | contar_filas)
if [ "$total" -eq 0 ]; then
    echo '[telemetria-intranet-backup] sin filas de intranet: no se guarda para no rotar respaldos buenos'
    exit 0
fi
publicar_respaldo telemetria-intranet "$parcial" "$OUT_DIR" "$RETENER"
printf '[telemetria-intranet-backup] %s filas\n' "$total"
