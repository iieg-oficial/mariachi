#!/usr/bin/env bash
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
#   pg_dump sin filtros -> toda la base de mariachi, es decir los 4 schemas:
#     public    - plataforma core (usuarios, paginas, menu, eventos, colibri, api keys)
#     huachicol - telemetria y auditoria (events, sessions, mcp_events, rollup_*, actividad)
#     acervo    - buckets, files, folders
#     sieej     - formularios, envios, grupos, catalogos
#
#   Los rollups de mapalab-stats son TABLAS reales en huachicol (rollup_* y
#   mcp_rollup_*), no vistas materializadas: viajan en el dump con sus datos y
#   no requieren recomputo al restaurar.
#
#   NO se respalda aqui el schema 'mapalab' (layers, symbols, layer_metadata,
#   capas_catalogo): vive en la base de dataengine y lo cubre el servicio
#   dataengine-backup de ese repo. Ver ecosystem.md §7.3.
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
#   EXPECTED_SCHEMAS='public huachicol' ./scripts/postgres-backup.sh  # ajustar gate

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
EXPECTED_SCHEMAS="${EXPECTED_SCHEMAS:-public huachicol acervo sieej}"

COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

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
    $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T api python scripts/purge_mapalab_events.py 2>&1 \
        | sed 's/^/[backup] /' || log "WARN: purga fallo, sigue con el dump"
fi

$COMPOSE_CMD -f "$COMPOSE_FILE" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --no-owner --no-acl --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
    | gzip -9 > "$TMP"

if [ ! -s "$TMP" ] || [ "$(gzip -dc "$TMP" 2>/dev/null | head -c1 | wc -c)" -eq 0 ]; then
    log "ERROR: el dump quedo vacio (no se promueve para no pisar weekly/monthly)"
    exit 1
fi

# Un dump que perdio un schema entero sigue siendo un archivo grande y valido:
# sin este gate se promoveria a weekly/monthly y pisaria el ultimo bueno.
FOUND=$(gzip -dc "$TMP" | sed -n -E 's/^CREATE (TABLE|SCHEMA) ([a-z_][a-z0-9_]*)[.;].*/\2/p' | sort -u)

MISSING=""
for schema in $EXPECTED_SCHEMAS; do
    if ! printf '%s\n' "$FOUND" | grep -qx "$schema"; then
        MISSING="$MISSING $schema"
    fi
done

if [ -n "$MISSING" ]; then
    log "ERROR: el dump no contiene objetos de:$MISSING"
    log "ERROR: dump parcial, no se promueve (override: EXPECTED_SCHEMAS='...')"
    exit 1
fi

log "schemas verificados: $EXPECTED_SCHEMAS"

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
