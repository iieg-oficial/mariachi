#!/bin/sh
# Aplica un archivo SQL de infobox_config (generado por dataengine-export-infobox.sh)
# sobre la BD destino, respaldando primero el estado actual.
#
# Pasos:
#   1. Genera backup del estado actual de infobox_config para cada capa que aparece
#      en el SQL de entrada. Sale como SQL reverso (UPDATEs que regresan al estado previo).
#   2. Reporta cuantas ids del archivo de entrada existen en destino (preview).
#   3. Pide confirmacion interactiva.
#   4. Aplica el SQL en una unica transaccion (BEGIN/COMMIT ya viene en el archivo).
#   5. Imprime conteos finales.
#
# Variables:
#   DATAENGINE_URL    conexion psql destino (prod)
#   BACKUP_DIR        carpeta para el backup reverso (default: ./infobox-backups/)
#   ASSUME_YES=1      saltar la confirmacion interactiva (para CI)
#
# Uso:
#   DATAENGINE_URL='postgres://...prod...' \
#     ./scripts/dataengine-apply-infobox.sh ./infobox-exports/infobox-20260522-120000.sql
#
# Para revertir despues:
#   psql "$DATAENGINE_URL" -f ./infobox-backups/infobox-prev-<ts>.sql

set -eu

SQL_FILE="${1:-}"
if [ -z "$SQL_FILE" ] || [ ! -f "$SQL_FILE" ]; then
    echo "Uso: $0 <archivo.sql exportado>" >&2
    exit 1
fi
: "${DATAENGINE_URL:?DATAENGINE_URL no definido}"

BACKUP_DIR="${BACKUP_DIR:-./infobox-backups}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/infobox-prev-$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

INCOMING_KEYS=$(grep -oE "WHERE id = '[^']+'" "$SQL_FILE" | sed "s/WHERE id = '//; s/'$//" | sort -u)
if [ -z "$INCOMING_KEYS" ]; then
    echo "El archivo no contiene UPDATEs con id reconocibles." >&2
    exit 1
fi
INCOMING_COUNT=$(echo "$INCOMING_KEYS" | wc -l | tr -d ' ')

KEY_LIST=$(echo "$INCOMING_KEYS" | awk '{printf "%s%s", (NR>1?",":""), "'\''"$0"'\''" }')

echo "[1/4] Generando backup reverso en $BACKUP_FILE..."
{
    printf -- '-- Snapshot previo de infobox_config en destino, capturado %s UTC\n' "$TIMESTAMP"
    printf -- '-- Restaura con: psql "$DATAENGINE_URL" -f %s\n' "$BACKUP_FILE"
    printf 'BEGIN;\n'
    psql "$DATAENGINE_URL" -A -t -v ON_ERROR_STOP=1 -c "
        SELECT format(
            'UPDATE mapalab.layers SET infobox_config = %s WHERE id = %L;',
            CASE
                WHEN infobox_config IS NULL THEN 'NULL'
                ELSE quote_literal(infobox_config::text) || '::jsonb'
            END,
            id
        )
        FROM mapalab.layers
        WHERE id IN ($KEY_LIST)
        ORDER BY id
    "
    printf 'COMMIT;\n'
} > "$BACKUP_FILE"

BACKUP_COUNT=$(grep -c '^UPDATE' "$BACKUP_FILE" || true)

echo "[2/4] Preview:"
echo "  Entrada:           $INCOMING_COUNT ids en $SQL_FILE"
echo "  Existen en destino: $BACKUP_COUNT (los demas se omitiran sin error)"

if [ "$BACKUP_COUNT" -lt "$INCOMING_COUNT" ]; then
    EXISTING_KEYS_FILE="$(mktemp)"
    psql "$DATAENGINE_URL" -A -t -c "
        SELECT id FROM mapalab.layers WHERE id IN ($KEY_LIST) ORDER BY id
    " 2>/dev/null | sort -u > "$EXISTING_KEYS_FILE"
    MISSING=$(echo "$INCOMING_KEYS" | comm -23 - "$EXISTING_KEYS_FILE")
    rm -f "$EXISTING_KEYS_FILE"
    if [ -n "$MISSING" ]; then
        echo "  Faltantes en destino:"
        echo "$MISSING" | sed 's/^/    - /'
    fi
fi

if [ "${ASSUME_YES:-0}" != "1" ]; then
    printf "\nConfirmas aplicar el SQL en destino? [escribe 'si' para continuar]: "
    read -r ANSWER
    if [ "$ANSWER" != "si" ]; then
        echo "Cancelado. Backup conservado en $BACKUP_FILE"
        exit 0
    fi
fi

echo "[3/4] Aplicando $SQL_FILE..."
psql "$DATAENGINE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "[4/4] Estado final en destino:"
psql "$DATAENGINE_URL" -c "
SELECT
    COUNT(*) FILTER (WHERE infobox_config IS NOT NULL) AS con_tarjeta,
    COUNT(*) FILTER (WHERE infobox_config IS NULL)     AS sin_tarjeta,
    COUNT(*)                                            AS total
FROM mapalab.layers
"

echo
echo "Listo. Para revertir: psql \"\$DATAENGINE_URL\" -f $BACKUP_FILE"
