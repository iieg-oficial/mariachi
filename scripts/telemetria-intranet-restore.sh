#!/usr/bin/env bash
set -euo pipefail

ARCHIVO="${1:?uso: telemetria-intranet-restore.sh <archivo.json.gz>}"
. "$(dirname "$0")/respaldo-json.sh"

[ -s "$ARCHIVO" ] || { echo "No existe o esta vacio: $ARCHIVO" >&2; exit 1; }
total=$(gzip -dc "$ARCHIVO" | contar_filas)
confirmar_restore telemetria "$total filas de telemetria de intranet de $ARCHIVO: solo se agregan las que falten"

sql_con_datos "$ARCHIVO" telemetria-intranet-restore.sql | psql_base | sed 's/^/  Agregadas: /'
