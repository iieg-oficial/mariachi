#!/usr/bin/env bash
# Respaldo de las tres tablas del roadmap: hitos, ciclos y procesos.
#
# Viven en el schema 'public', asi que el respaldo general ya se las lleva. Este
# se separa porque su contenido es captura manual —fechas, motivos, linajes y la
# posicion de cada banda— y no se puede recuperar volviendo a correr nada: la
# migracion solo siembra el estado inicial, no lo que se edito despues.
set -euo pipefail

OUT_DIR="${OUT_DIR:-backups/roadmap}"
RETENER="${RETENER:-30}"
ESPERADAS="${ESPERADAS:-3}"   # roadmap_hitos, roadmap_ciclos, roadmap_procesos
HITOS_MINIMOS="${HITOS_MINIMOS:-1}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

log() { printf '[roadmap-backup] %s\n' "$1"; }

mkdir -p "$OUT_DIR"
sello=$(date +%Y%m%d-%H%M%S)
destino="$OUT_DIR/roadmap-$sello.sql.gz"
tmp="$destino.parcial"

$COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" pg_dump --no-owner --no-acl \
        --clean --if-exists \
        --table=public.roadmap_hitos --table=public.roadmap_ciclos \
        --table=public.roadmap_procesos \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
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

# Un dump con las tres tablas vacias pesa lo mismo que uno bueno: sin este gate,
# el roadmap borrado por accidente rotaria a los treinta archivos.
hitos=$(gzip -dc "$tmp" \
    | sed -n '/^COPY public.roadmap_hitos /,/^\\\.$/p' \
    | grep -cve '^COPY ' -e '^\\\.$' || true)
if [ "$hitos" -lt "$HITOS_MINIMOS" ]; then
    log "ERROR: el dump trae $hitos hitos y se esperaban al menos $HITOS_MINIMOS"
    rm -f "$tmp"
    exit 1
fi

mv "$tmp" "$destino"
log "archivo $destino ($(du -h "$destino" | cut -f1), $tablas tablas, $hitos hitos)"

sobrantes=$(ls -1t "$OUT_DIR"/roadmap-*.sql.gz 2>/dev/null | tail -n "+$((RETENER + 1))" || true)
if [ -n "$sobrantes" ]; then
    echo "$sobrantes" | xargs rm -f
    log "rotados $(echo "$sobrantes" | wc -l) respaldos por encima de $RETENER"
fi
