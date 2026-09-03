#!/bin/sh
# Restore manual de Postgres desde un .sql.gz generado por postgres-backup.sh.
#
# Que restaura: los schemas que el dump traiga, que hoy son siete (public,
# huachicol, acervo, sieej, mel, vine, frames). La lista se deriva del propio
# dump, no esta escrita aqui.
# El schema 'mapalab' NO viaja en estos dumps (vive en dataengine).
#
# Los schemas no-public se dropean con CASCADE antes de aplicar el dump: pg_dump
# emite "DROP SCHEMA IF EXISTS <x>;" sin CASCADE, y ese DROP falla si el destino
# tiene objetos que el dump no conoce (tipico al restaurar un dump viejo sobre
# una base con migraciones mas nuevas), abortando el restore a la mitad.
#
# Busqueda del archivo:
#   1. Ruta literal si existe
#   2. restore/<archivo>
#   3. backups/<archivo>
#
# Uso:
#   ./scripts/postgres-restore.sh mariachi-daily.sql.gz
#   ./scripts/postgres-restore.sh /ruta/absoluta/al/dump.sql.gz
#   COMPOSE_FILE=compose.yaml:compose.dev.yaml ./scripts/postgres-restore.sh mariachi-weekly.sql.gz
#
# ATENCION: sobrescribe la base de datos del contenedor postgres del compose activo.

set -eu

FILE="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml:compose.prod.yaml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"

export COMPOSE_FILE
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

DUMP_SCHEMAS=$(gunzip -c "$ABS_FILE" | sed -n 's/^CREATE SCHEMA \([a-z_][a-z0-9_]*\);$/\1/p' | sort -u | tr '\n' ' ')

if [ -n "$DUMP_SCHEMAS" ]; then
    echo "[restore] limpiando schemas del dump:$(printf ' %s' $DUMP_SCHEMAS)"
    for schema in $DUMP_SCHEMAS; do
        $COMPOSE_CMD exec -T postgres sh -c \
            "PGPASSWORD=\$(cat /run/secrets/postgres_password) psql -v ON_ERROR_STOP=1 --quiet -U \$POSTGRES_USER -d \$POSTGRES_DB -c 'DROP SCHEMA IF EXISTS $schema CASCADE'"
    done
fi

echo "[restore] aplicando dump..."
gunzip -c "$ABS_FILE" | $COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql -v ON_ERROR_STOP=1 --quiet -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "[restore] done"
echo "[restore] siguiente paso sugerido: $COMPOSE_CMD exec api alembic current"
echo "[restore] mapalab stats: los rollups son tablas en huachicol y se restauraron con sus datos."
echo "[restore]   si quieres recalcularlas desde huachicol.events: make refresh-mapalab-stats"
