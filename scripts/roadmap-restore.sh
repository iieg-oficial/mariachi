#!/usr/bin/env bash
# Restaura las tres tablas del roadmap desde un respaldo de roadmap-backup.sh.
# Las reemplaza completas: el hito que no este en el archivo se pierde.
set -euo pipefail

ARCHIVO="${1:?uso: roadmap-restore.sh <archivo.sql.gz>}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

[ -s "$ARCHIVO" ] || { echo "No existe o esta vacio: $ARCHIVO" >&2; exit 1; }

hitos=$(gzip -dc "$ARCHIVO" \
    | sed -n '/^COPY public.roadmap_hitos /,/^\\\.$/p' \
    | grep -cve '^COPY ' -e '^\\\.$' || true)

printf '  Se REEMPLAZAN hitos, ciclos y procesos con %s (%s hitos)\n' "$ARCHIVO" "$hitos"
printf '  Escribe "roadmap" para confirmar: '
read -r respuesta
[ "$respuesta" = 'roadmap' ] || { echo '  Cancelado.'; exit 1; }

gzip -dc "$ARCHIVO" | $COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -v ON_ERROR_STOP=1 \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > /dev/null

$COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "SELECT '\''hitos '\'' || (SELECT count(*) FROM public.roadmap_hitos)
                 || '\'', ciclos '\'' || (SELECT count(*) FROM public.roadmap_ciclos)
                 || '\'', procesos '\'' || (SELECT count(*) FROM public.roadmap_procesos)"' \
    | sed 's/^/  Restaurado: /'
