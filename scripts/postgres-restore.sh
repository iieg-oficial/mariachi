#!/bin/sh
# Restore manual de Postgres desde un .sql.gz generado por postgres-backup.sh.
#
# Que restaura: los schemas que el dump traiga, que hoy son siete (public,
# huachicol, acervo, sieej, mel, vine, frames). La lista de lo que se dropea se
# deriva del propio dump; EXPECTED_SCHEMAS solo dice cual es el minimo que un
# dump de mariachi debe traer para aceptarlo.
# El schema 'mapalab' NO viaja en estos dumps (vive en dataengine).
#
# Antes de tocar la base se valida, en este orden:
#   1. Integridad del .gz completo (gunzip -t) y el marcador de cierre de
#      pg_dump. Sin esto un archivo truncado pasaba: 'sh' no tiene pipefail, el
#      fallo de gunzip se perdia detras del pipe y los schemas se dropeaban igual.
#   2. Que el dump sea de mariachi, con el mismo gate que postgres-backup.sh. El
#      selector lista cualquier .sql.gz de restore/ y backups/, donde tambien
#      caen los dumps de vine y roadmap.
#
# Los schemas se dropean con CASCADE antes de aplicar el dump: pg_dump emite
# "DROP SCHEMA IF EXISTS <x>;" sin CASCADE, y ese DROP falla si el destino tiene
# objetos que el dump no conoce (tipico al restaurar un dump viejo sobre una
# base con migraciones mas nuevas), abortando el restore a la mitad.
#
# 'public' se dropea y se recrea como los demas, para que la base quede igual al
# dump y no sobrevivan tablas que el dump no conoce. CLEAN_PUBLIC=false conserva
# el comportamiento viejo (solo se borra lo que el dump menciona).
#
# Los DROP viajan en el mismo stream que el dump y psql corre con
# --single-transaction: si algo falla a la mitad, la base queda como estaba.
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
#   CLEAN_PUBLIC=false ./scripts/postgres-restore.sh mariachi-daily.sql.gz
#   EXPECTED_SCHEMAS='public huachicol' ./scripts/postgres-restore.sh dump-viejo.sql.gz
#
# ATENCION: sobrescribe la base de datos del contenedor postgres del compose activo.

set -eu

FILE="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml:compose.prod.yaml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
EXPECTED_SCHEMAS="${EXPECTED_SCHEMAS:-public huachicol acervo sieej mel vine frames}"
CLEAN_PUBLIC="${CLEAN_PUBLIC:-true}"

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

if ! gunzip -t "$ABS_FILE" 2>/dev/null; then
    echo "[restore] ERROR: el archivo esta corrupto o incompleto (gunzip -t fallo)" >&2
    echo "[restore] no se toco la base de datos" >&2
    exit 1
fi

if ! gunzip -c "$ABS_FILE" | tail -20 | grep -q '^-- PostgreSQL database dump complete'; then
    echo "[restore] ERROR: el dump no termina con el marcador de pg_dump" >&2
    echo "[restore] quedo cortado a la mitad; no se toco la base de datos" >&2
    exit 1
fi

DUMP_OBJECTS=$(gunzip -c "$ABS_FILE" |
    sed -n -E 's/^CREATE (TABLE|SCHEMA) ([a-z_][a-z0-9_]*)[.;].*/\2/p' | sort -u)

MISSING=""
for schema in $EXPECTED_SCHEMAS; do
    if ! printf '%s\n' "$DUMP_OBJECTS" | grep -qx "$schema"; then
        MISSING="$MISSING $schema"
    fi
done

if [ -n "$MISSING" ]; then
    echo "[restore] ERROR: el dump no contiene objetos de:$MISSING" >&2
    echo "[restore] no parece un dump de mariachi, o esta incompleto" >&2
    echo "[restore] contiene:$(printf ' %s' $DUMP_OBJECTS)" >&2
    echo "[restore] override: EXPECTED_SCHEMAS='...' $0 $FILE" >&2
    exit 1
fi

echo "[restore] dump verificado: integridad y schemas ($EXPECTED_SCHEMAS)"
echo "[restore] ATENCION: esto SOBRESCRIBE la base de datos actual."
printf "[restore] Ctrl+C para cancelar, ENTER para continuar... "
read -r _CONFIRM

DUMP_SCHEMAS=$(gunzip -c "$ABS_FILE" | sed -n 's/^CREATE SCHEMA \([a-z_][a-z0-9_]*\);$/\1/p' | sort -u | tr '\n' ' ')

PRELUDE=''
for schema in $DUMP_SCHEMAS; do
    PRELUDE="${PRELUDE}DROP SCHEMA IF EXISTS $schema CASCADE;
"
done

if [ "$CLEAN_PUBLIC" != 'false' ]; then
    PRELUDE="${PRELUDE}DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
"
    echo "[restore] limpiando schemas:$(printf ' %s' $DUMP_SCHEMAS) public"
else
    echo "[restore] limpiando schemas:$(printf ' %s' $DUMP_SCHEMAS)"
    echo "[restore] public se conserva (CLEAN_PUBLIC=false): sobrevive lo que el dump no menciona"
fi

echo "[restore] aplicando dump en una sola transaccion..."
{ printf '%s' "$PRELUDE"; gunzip -c "$ABS_FILE"; } | $COMPOSE_CMD exec -T postgres sh -c \
    'PGPASSWORD="$(cat /run/secrets/postgres_password)" psql --single-transaction -v ON_ERROR_STOP=1 --quiet -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

echo "[restore] done"
echo "[restore] siguiente paso sugerido: $COMPOSE_CMD exec api alembic current"
echo "[restore] mapalab stats: los rollups son tablas en huachicol y se restauraron con sus datos."
echo "[restore]   si quieres recalcularlas desde huachicol.events: make refresh-mapalab-stats"
