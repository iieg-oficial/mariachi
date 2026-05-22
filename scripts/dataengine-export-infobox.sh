#!/bin/sh
# Exporta infobox_config de mapalab.layers en DataEngine a dos archivos:
#   - <out>/infobox-<ts>.json : lectura humana, mapa { id: infobox_config }
#   - <out>/infobox-<ts>.sql  : UPDATEs idempotentes para aplicar en otra BD via
#                               scripts/dataengine-apply-infobox.sh
#
# Solo toca la columna infobox_config; nada mas de la capa se exporta.
# Las capas destino tienen que existir con la misma id (el UPDATE
# no inserta filas nuevas: id ausente => 0 rows afectados, sin error).
#
# Variables:
#   DATAENGINE_URL   conexion psql (postgres://user:pass@host:port/db?sslmode=...)
#   OUT_DIR          carpeta de salida (default: ./infobox-exports/)
#
# Uso:
#   DATAENGINE_URL='postgres://...staging...' ./scripts/dataengine-export-infobox.sh

set -eu

: "${DATAENGINE_URL:?DATAENGINE_URL no definido}"
OUT_DIR="${OUT_DIR:-./infobox-exports}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
JSON_OUT="$OUT_DIR/infobox-$TIMESTAMP.json"
SQL_OUT="$OUT_DIR/infobox-$TIMESTAMP.sql"

mkdir -p "$OUT_DIR"

psql "$DATAENGINE_URL" -A -t -v ON_ERROR_STOP=1 -c "
SELECT COALESCE(
  jsonb_pretty(jsonb_object_agg(id, infobox_config ORDER BY id)),
  '{}'::text
)
FROM mapalab.layers
WHERE infobox_config IS NOT NULL
" > "$JSON_OUT"

{
    printf -- '-- infobox_config snapshot generado %s UTC desde DATAENGINE_URL\n' "$TIMESTAMP"
    printf -- '-- Total de capas con infobox_config:\n'
    psql "$DATAENGINE_URL" -A -t -v ON_ERROR_STOP=1 -c "
        SELECT '-- ' || COUNT(*)::text
        FROM mapalab.layers
        WHERE infobox_config IS NOT NULL
    "
    printf 'BEGIN;\n'
    psql "$DATAENGINE_URL" -A -t -v ON_ERROR_STOP=1 -c "
        SELECT format(
            'UPDATE mapalab.layers SET infobox_config = %L::jsonb, updated_at = NOW() WHERE id = %L;',
            infobox_config::text,
            id
        )
        FROM mapalab.layers
        WHERE infobox_config IS NOT NULL
        ORDER BY id
    "
    printf 'COMMIT;\n'
} > "$SQL_OUT"

UPDATE_COUNT=$(grep -c '^UPDATE' "$SQL_OUT" || true)

echo "Export listo:"
echo "  JSON: $JSON_OUT"
echo "  SQL:  $SQL_OUT"
echo "  Capas con infobox_config: $UPDATE_COUNT"
echo
echo "Siguiente paso (en la VM de prod):"
echo "  DATAENGINE_URL='postgres://...prod...' \\"
echo "    ./scripts/dataengine-apply-infobox.sh $SQL_OUT"
