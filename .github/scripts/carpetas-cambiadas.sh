#!/usr/bin/env bash
set -euo pipefail

salida="${GITHUB_OUTPUT:-/dev/stdout}"

if [ -z "${BASE:-}" ] || [ "$BASE" = "0000000000000000000000000000000000000000" ] || ! git cat-file -e "$BASE^{commit}" 2>/dev/null; then
    for carpeta in "$@"; do
        echo "$carpeta=true" >> "$salida"
    done
    exit 0
fi

cambios=$(git diff --name-only "$BASE...HEAD")
for carpeta in "$@"; do
    if grep -qE "^($carpeta/|\.github/)" <<< "$cambios"; then
        echo "$carpeta=true" >> "$salida"
    else
        echo "$carpeta=false" >> "$salida"
    fi
done
