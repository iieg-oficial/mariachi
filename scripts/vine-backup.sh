#!/usr/bin/env bash
# Respaldo del schema vine: personas, eventos, personas_ficha e incidencias.
#
# Se separa del respaldo general porque la ficha y las incidencias son captura
# manual: no se pueden recuperar volviendo a sincronizar el biometrico, a
# diferencia de personas y eventos.
set -euo pipefail

OUT_DIR="${OUT_DIR:-backups/vine}"
RETENER="${RETENER:-30}"
ESPERADAS="${ESPERADAS:-5}"  # personas, eventos, personas_ficha, incidencias, catalogos
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

log() { printf '[vine-backup] %s\n' "$1"; }

mkdir -p "$OUT_DIR"
sello=$(date +%Y%m%d-%H%M%S)
destino="$OUT_DIR/vine-$sello.sql.gz"
tmp="$destino.parcial"

$COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" pg_dump --no-owner --no-acl \
        --schema=vine -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    | gzip -9 > "$tmp"

if [ ! -s "$tmp" ]; then
    log 'ERROR: el dump quedo vacio'
    rm -f "$tmp"
    exit 1
fi

tablas=$(gzip -dc "$tmp" | grep -c '^CREATE TABLE' || true)
if [ "$tablas" -lt "$ESPERADAS" ]; then
    log "ERROR: el dump trae $tablas tablas y se esperaban $ESPERADAS"
    rm -f "$tmp"
    exit 1
fi

mv "$tmp" "$destino"
log "archivo $destino ($(du -h "$destino" | cut -f1), $tablas tablas)"

sobrantes=$(ls -1t "$OUT_DIR"/vine-*.sql.gz 2>/dev/null | tail -n "+$((RETENER + 1))" || true)
if [ -n "$sobrantes" ]; then
    echo "$sobrantes" | xargs rm -f
    log "rotados $(echo "$sobrantes" | wc -l) respaldos por encima de $RETENER"
fi
