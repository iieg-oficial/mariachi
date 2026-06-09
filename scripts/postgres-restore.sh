#!/bin/sh
# Restore manual de Postgres desde un .sql.gz generado por postgres-backup.sh.
#
# Busqueda del archivo:
#   1. Ruta literal si existe
#   2. restore/<archivo>
#   3. backups/<archivo>
#
# Uso:
#   ./scripts/postgres-restore.sh mariachi-daily.sql.gz
#   ./scripts/postgres-restore.sh /ruta/absoluta/al/dump.sql.gz
#   COMPOSE_FILE=docker-compose.dev.yml ./scripts/postgres-restore.sh mariachi-weekly.sql.gz
#
# ATENCION: sobrescribe la base de datos del contenedor postgres del compose activo.

set -eu

FILE="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"

COMPOSE_CMD="docker compose"
if [ -n "$COMPOSE_ENV_FILE" ]; then
    COMPOSE_CMD="$COMPOSE_CMD --env-file $COMPOSE_ENV_FILE"
fi

resolve_file() {
    if [ -f "$1" ]; then
        echo "$1"
    elif [ -f "$ROOT_DIR/restore/$1" ]; then
        echo "$ROOT_DIR/restore/$1"
    elif [ -f "$ROOT_DIR/backups/$1" ]; then
        echo "$ROOT_DIR/backups/$1"
    else
        return 1
    fi
}

if [ -n "$FILE" ]; then
    ABS_FILE=$(resolve_file "$FILE") || {
        echo "[restore] no se encontro el archivo: $FILE" >&2
        echo "[restore] buscado en: $FILE, $ROOT_DIR/restore/$FILE, $ROOT_DIR/backups/$FILE" >&2
        exit 1
    }
else
    CANDIDATES=$(ls -1 "$ROOT_DIR/restore"/*.sql.gz "$ROOT_DIR/backups"/*.sql.gz 2>/dev/null || true)
    COUNT=$(printf '%s\n' "$CANDIDATES" | grep -c . || true)

    if [ "$COUNT" -eq 0 ]; then
        echo "[restore] no hay archivos .sql.gz en $ROOT_DIR/restore/ ni en $ROOT_DIR/backups/" >&2
        echo "[restore] coloca un dump ahi o pasa una ruta: $0 <archivo.sql.gz>" >&2
        exit 1
    elif [ "$COUNT" -eq 1 ]; then
        ABS_FILE="$CANDIDATES"
        echo "[restore] unico candidato detectado: $ABS_FILE"
    else
        echo "[restore] archivos disponibles:"
        i=1
        printf '%s\n' "$CANDIDATES" | while IFS= read -r f; do
            size=$(du -h "$f" | cut -f1)
            mtime=$(date -r "$f" '+%Y-%m-%d %H:%M' 2>/dev/null || stat -c '%y' "$f" | cut -d. -f1)
            printf '  [%d] %s  (%s, %s)\n' "$i" "$f" "$size" "$mtime"
            i=$((i + 1))
        done
        printf '[restore] elige un numero: '
        read -r CHOICE
        case "$CHOICE" in
            ''|*[!0-9]*)
                echo "[restore] entrada invalida" >&2
                exit 1
                ;;
        esac
        if [ "$CHOICE" -lt 1 ] || [ "$CHOICE" -gt "$COUNT" ]; then
            echo "[restore] numero fuera de rango (1..$COUNT)" >&2
            exit 1
        fi
        ABS_FILE=$(printf '%s\n' "$CANDIDATES" | sed -n "${CHOICE}p")
    fi
fi

cd "$ROOT_DIR"

echo "[restore] compose=$COMPOSE_FILE"
echo "[restore] archivo=$ABS_FILE ($(du -h "$ABS_FILE" | cut -f1))"
echo "[restore] ATENCION: esto SOBRESCRIBE la base de datos actual."
printf "[restore] Ctrl+C para cancelar, ENTER para continuar... "
read -r _CONFIRM

echo "[restore] aplicando dump..."
gunzip -c "$ABS_FILE" | $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T postgres sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 --quiet -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "[restore] done"
echo "[restore] siguiente paso sugerido: $COMPOSE_CMD -f $COMPOSE_FILE exec api alembic -x db=mariachi current"
echo "[restore] mapalab stats: las vistas materializadas se restauraron con los datos del dump."
echo "[restore]   si quieres recalcularlas: make refresh-mapalab-stats"
