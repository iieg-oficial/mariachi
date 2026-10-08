#!/usr/bin/env bash
# Restaura el schema vine desde un respaldo de vine-backup.sh.
# Reemplaza el schema completo: lo que no este en el archivo se pierde.
set -euo pipefail

ARCHIVO="${1:?uso: vine-restore.sh <archivo.sql.gz>}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

[ -s "$ARCHIVO" ] || { echo "No existe o esta vacio: $ARCHIVO" >&2; exit 1; }

printf '  Se REEMPLAZA el schema vine con %s\n' "$ARCHIVO"
printf '  Escribe "vine" para confirmar: '
read -r respuesta
[ "$respuesta" = 'vine' ] || { echo '  Cancelado.'; exit 1; }

$COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "DROP SCHEMA IF EXISTS vine CASCADE"'

gzip -dc "$ARCHIVO" | $COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -v ON_ERROR_STOP=1 \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > /dev/null

echo '  Restaurado. Revisa con: make status'
