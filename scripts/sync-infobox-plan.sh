#!/usr/bin/env bash
# Sincroniza la copia de infoboxPlan.js con la canonica de mapalab.
#
# El modulo resuelve la configuracion de la tarjetita contra las propiedades de
# una feature. Vive dos veces a proposito —los repos no comparten paquetes— y
# tiene que ser byte a byte identico: si divergen, el editor y el visor pintan
# tarjetas distintas con la misma configuracion, que es como se descubrio que
# los campos compuestos no llegaban al preview.
#
#   sync-infobox-plan.sh          copia de mapalab a mariachi
#   sync-infobox-plan.sh --check  falla si difieren (para CI o pre-push)
#
# MAPALAB_DIR permite apuntar a otra ruta del clon de mapalab.

set -e

MAPALAB_DIR="${MAPALAB_DIR:-$(cd "$(dirname "$0")/../.." && pwd)/mapalab}"
ORIGEN="$MAPALAB_DIR/frontend/src/utils/infoboxPlan.js"
DESTINO="$(cd "$(dirname "$0")/.." && pwd)/admin/src/shared/infoboxPlan.js"

if [ ! -f "$ORIGEN" ]; then
    echo "No se encontro la copia canonica en $ORIGEN" >&2
    echo "Ajusta MAPALAB_DIR si tu clon de mapalab esta en otra ruta." >&2
    exit 2
fi

if [ "${1:-}" = "--check" ]; then
    if diff -q "$ORIGEN" "$DESTINO" >/dev/null 2>&1; then
        echo "infoboxPlan.js alineado con mapalab"
        exit 0
    fi
    echo "DRIFT: admin/src/shared/infoboxPlan.js difiere de la copia canonica de mapalab" >&2
    diff "$ORIGEN" "$DESTINO" >&2 || true
    echo >&2
    echo "Corre scripts/sync-infobox-plan.sh para alinearlo." >&2
    exit 1
fi

cp "$ORIGEN" "$DESTINO"
echo "Copiado $ORIGEN -> $DESTINO"
