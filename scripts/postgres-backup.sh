#!/bin/sh
# Respaldo de Postgres con rotacion GFS (daily / weekly / monthly).
#
# Politica:
#   - Siempre regenera backups/mariachi-daily.sql.gz
#   - Domingo (DOW=7): copia daily -> mariachi-weekly.sql.gz
#   - Dia 1 del mes:   copia daily -> mariachi-monthly.sql.gz
#
# Resultado: 3 archivos fijos en backups/ (actual, semana pasada, mes pasado).
#
# Que se respalda:
#   pg_dump sin filtros -> incluye TODAS las tablas y vistas materializadas del schema public.
#   Esto cubre las tablas grandes de telemetria (mapalab_events, mapalab_sessions)
#   y las matviews mapalab_stats_* (se repueblan al restaurar via REFRESH implicito).
#
#   Para mantener el dump proporcional, antes de cada backup se purgan eventos
#   crudos mas viejos que MAPALAB_EVENTS_RETENTION_DAYS (default 90) si la
#   variable MAPALAB_PURGE_ON_BACKUP no es "false". Las sesiones rollup
#   mantienen su propia retencion mas larga.
#
# Uso:
#   ./scripts/postgres-backup.sh              # contra docker-compose.yml (default)
#   COMPOSE_FILE=docker-compose.dev.yml ./scripts/postgres-backup.sh
#   BACKUP_DIR=/otra/ruta ./scripts/postgres-backup.sh
#   MAPALAB_PURGE_ON_BACKUP=false ./scripts/postgres-backup.sh   # saltar purga

set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

mkdir -p "$BACKUP_DIR"

DAILY="$BACKUP_DIR/mariachi-daily.sql.gz"
TMP="${DAILY}.tmp"
WEEKLY="$BACKUP_DIR/mariachi-weekly.sql.gz"
MONTHLY="$BACKUP_DIR/mariachi-monthly.sql.gz"

log() {
    echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

cleanup_tmp() {
    rm -f "$TMP" 2>/dev/null || true
}
trap cleanup_tmp EXIT INT TERM

cd "$ROOT_DIR"

log "compose=$COMPOSE_FILE destino=$DAILY"

if [ "${MAPALAB_PURGE_ON_BACKUP:-true}" != "false" ]; then
    log "purgando eventos viejos de mapalab antes del dump (set MAPALAB_PURGE_ON_BACKUP=false para saltar)"
    docker compose -f "$COMPOSE_FILE" exec -T api python scripts/purge_mapalab_events.py 2>&1 \
        | sed 's/^/[backup] /' || log "WARN: purga fallo, sigue con el dump"
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --no-owner --no-acl --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    | gzip -9 > "$TMP"

if [ ! -s "$TMP" ]; then
    log "ERROR: el dump quedo vacio"
    exit 1
fi

mv -f "$TMP" "$DAILY"
log "daily ok ($(du -h "$DAILY" | cut -f1))"

DOW=$(date +%u)
DOM=$(date +%-d 2>/dev/null || date +%e | tr -d ' ')

if [ "$DOW" = "7" ]; then
    cp -f "$DAILY" "$WEEKLY"
    log "weekly actualizado ($(du -h "$WEEKLY" | cut -f1))"
fi

if [ "$DOM" = "1" ]; then
    cp -f "$DAILY" "$MONTHLY"
    log "monthly actualizado ($(du -h "$MONTHLY" | cut -f1))"
fi

log "snapshots presentes:"
ls -lh "$BACKUP_DIR"/mariachi-*.sql.gz 2>/dev/null || true
