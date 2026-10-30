#!/bin/bash
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"
source make/lib.sh
[ -f make/repo.sh ] && source make/repo.sh

SCRIPT=scripts/publicar_capas_raster.py

env=$(resolve_env)
if [ -z "$env" ]; then
    nothing_running 'CAPAS-RASTER'
    exit 0
fi
banner 'CAPAS-RASTER' "$env"

mapfile -t filas < <(dc "$env" exec -T api python "$SCRIPT" --carpetas)
[ ${#filas[@]} -gt 0 ] || fail 'Capas: GeoServer no tiene capas en raster publicadas desde una carpeta'
opciones=()
for fila in "${filas[@]}"; do
    opciones+=("${fila%%$'\t'*} (${fila##*$'\t'} capas)")
done
elegida=$(pick 'Carpeta' "${opciones[@]}") || exit 1
carpeta=${elegida% (*}
rule

sugerido=$(basename "$carpeta")
sugerido=${sugerido^}
printf '  Nombre del tema [%s]: ' "$sugerido" >/dev/tty
read -r tema </dev/tty || tema=''
tema=${tema:-$sugerido}
tema_id=$(printf '%s' "$tema" | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//')
rule

dc "$env" exec -T api python "$SCRIPT" --carpeta "$carpeta" --tema-id "$tema_id" --tema "$tema" || exit 1
rule
confirm "Se daran de alta ocultas bajo el tema oculto «$tema» ($tema_id)" 'publicar'
rule
dc "$env" exec -T api python "$SCRIPT" --carpeta "$carpeta" --tema-id "$tema_id" --tema "$tema" --aplicar
