#!/usr/bin/env bash
set -euo pipefail

accion="$1"
llave="$2"
raiz="$HOME/.cache/ci-node-modules"
destino="$raiz/$llave"
prefijo="${llave%-*}"

case "$accion" in
    restaurar)
        if [ -d "$destino" ]; then
            rm -rf node_modules
            cp -a "$destino" node_modules
            touch "$destino"
            echo "hit=true" >> "${GITHUB_OUTPUT:-/dev/stdout}"
        fi
        ;;
    guardar)
        mkdir -p "$raiz"
        temporal=$(mktemp -d "$raiz/.tmp.XXXXXX")
        cp -a node_modules "$temporal/node_modules"
        rm -rf "$destino"
        mv "$temporal/node_modules" "$destino"
        touch "$destino"
        rm -rf "$temporal"
        ls -1dt "$raiz/$prefijo"-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
        ;;
    *)
        echo "uso: node-modules.sh restaurar|guardar <llave>" >&2
        exit 2
        ;;
esac
