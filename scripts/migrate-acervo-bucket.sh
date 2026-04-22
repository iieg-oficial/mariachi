#!/usr/bin/env bash
# Migra contenido del bucket Acervo 'portal-dev' a 'mariachi-dev'.
#
# Requiere:
#   - mc (cliente MinIO) instalado: https://min.io/docs/minio/linux/reference/minio-mc.html
#   - Acceso al endpoint de Acervo (se toma de .env)
#
# Uso:
#   ./scripts/migrate-acervo-bucket.sh              # dry-run (no copia nada)
#   ./scripts/migrate-acervo-bucket.sh --execute    # ejecuta la copia
#   ./scripts/migrate-acervo-bucket.sh --execute --delete-source  # copia y borra bucket origen (IRREVERSIBLE)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env.development}"
SOURCE_BUCKET="${SOURCE_BUCKET:-portal-dev}"
TARGET_BUCKET="${TARGET_BUCKET:-mariachi-dev}"

EXECUTE=0
DELETE_SOURCE=0

for arg in "$@"; do
    case "$arg" in
        --execute) EXECUTE=1 ;;
        --delete-source) DELETE_SOURCE=1 ;;
        -h|--help)
            sed -n '2,14p' "$0"
            exit 0
            ;;
        *)
            echo "Argumento desconocido: $arg" >&2
            exit 1
            ;;
    esac
done

if ! command -v mc >/dev/null 2>&1; then
    echo "ERROR: 'mc' no esta instalado." >&2
    echo "Instalar con: brew install minio/stable/mc  (mac)" >&2
    echo "O ver: https://min.io/docs/minio/linux/reference/minio-mc.html" >&2
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: no se encontro $ENV_FILE" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${ACERVO_ENDPOINT:?ACERVO_ENDPOINT no definido en $ENV_FILE}"
: "${ACERVO_ACCESS_KEY:?ACERVO_ACCESS_KEY no definido}"
: "${ACERVO_SECRET_KEY:?ACERVO_SECRET_KEY no definido}"

ACERVO_PROTO="http"
if [ "${ACERVO_USE_SSL:-false}" = "true" ]; then
    ACERVO_PROTO="https"
fi

ALIAS="acervo_migration"
ENDPOINT_URL="${ACERVO_PROTO}://${ACERVO_ENDPOINT}"

echo "=== Configuracion ==="
echo "  Endpoint:        $ENDPOINT_URL"
echo "  Bucket origen:   $SOURCE_BUCKET"
echo "  Bucket destino:  $TARGET_BUCKET"
echo "  Execute:         $([ $EXECUTE -eq 1 ] && echo 'si' || echo 'NO (dry-run)')"
echo "  Delete source:   $([ $DELETE_SOURCE -eq 1 ] && echo 'si' || echo 'no')"
echo

echo "=== Configurando alias mc ==="
mc alias set "$ALIAS" "$ENDPOINT_URL" "$ACERVO_ACCESS_KEY" "$ACERVO_SECRET_KEY" >/dev/null

echo "=== Verificando bucket origen ==="
if ! mc ls "$ALIAS/$SOURCE_BUCKET" >/dev/null 2>&1; then
    echo "ERROR: bucket '$SOURCE_BUCKET' no existe o no se puede acceder" >&2
    exit 1
fi

echo "=== Listando contenido de $SOURCE_BUCKET ==="
mc ls --recursive "$ALIAS/$SOURCE_BUCKET" | head -20
TOTAL_FILES=$(mc ls --recursive "$ALIAS/$SOURCE_BUCKET" | wc -l)
echo "Total de archivos: $TOTAL_FILES"
echo

if [ $EXECUTE -eq 0 ]; then
    echo "=== DRY-RUN: no se hizo ningun cambio ==="
    echo "Para ejecutar la copia real, corre: $0 --execute"
    exit 0
fi

echo "=== Creando bucket destino si no existe ==="
if ! mc ls "$ALIAS/$TARGET_BUCKET" >/dev/null 2>&1; then
    mc mb "$ALIAS/$TARGET_BUCKET"
    echo "Bucket $TARGET_BUCKET creado."
else
    echo "Bucket $TARGET_BUCKET ya existe."
fi

echo "=== Copiando objetos (mc mirror) ==="
mc mirror --preserve --overwrite "$ALIAS/$SOURCE_BUCKET" "$ALIAS/$TARGET_BUCKET"

echo "=== Verificando conteo ==="
SRC_COUNT=$(mc ls --recursive "$ALIAS/$SOURCE_BUCKET" | wc -l)
DST_COUNT=$(mc ls --recursive "$ALIAS/$TARGET_BUCKET" | wc -l)
echo "Origen:  $SRC_COUNT archivos"
echo "Destino: $DST_COUNT archivos"

if [ "$SRC_COUNT" != "$DST_COUNT" ]; then
    echo "ERROR: conteo difiere entre origen y destino" >&2
    exit 1
fi

echo "=== Migracion completada exitosamente ==="

if [ $DELETE_SOURCE -eq 1 ]; then
    echo
    echo "ATENCION: --delete-source solicitado."
    read -rp "Confirmar borrado de '$SOURCE_BUCKET' con todo su contenido? (escribe 'si' para confirmar): " CONFIRM
    if [ "$CONFIRM" = "si" ]; then
        mc rb --force "$ALIAS/$SOURCE_BUCKET"
        echo "Bucket $SOURCE_BUCKET eliminado."
    else
        echo "Cancelado. Bucket $SOURCE_BUCKET intacto."
    fi
fi

echo
echo "Siguiente paso: actualizar ACERVO_BUCKET_NAME en .env.development:"
echo "  ACERVO_BUCKET_NAME=$TARGET_BUCKET"
