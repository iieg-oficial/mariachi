#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "uso: $0 <x.y.z>" >&2
    exit 1
fi

new_version="$1"

if [[ ! "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: version invalida '$new_version' (esperado x.y.z)" >&2
    exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pyproject="$repo_root/api/pyproject.toml"
package_json="$repo_root/admin/package.json"
changelog="$repo_root/docs/CHANGELOG.md"
today="$(date +%Y-%m-%d)"

for f in "$pyproject" "$package_json" "$changelog"; do
    if [[ ! -f "$f" ]]; then
        echo "error: no existe $f" >&2
        exit 1
    fi
done

old_pyproject="$(sed -nE 's/^version = "([^"]+)"/\1/p' "$pyproject" | head -1)"
old_package="$(sed -nE 's/.*"version": "([^"]+)".*/\1/p' "$package_json" | head -1)"

sed -i -E "0,/^version = \".*\"/s//version = \"$new_version\"/" "$pyproject"
sed -i -E "0,/\"version\": \".*\"/s//\"version\": \"$new_version\"/" "$package_json"

if grep -q "^## \[$new_version\]" "$changelog"; then
    echo "aviso: docs/CHANGELOG.md ya tiene la entrada [$new_version]; no se toca" >&2
else
    tmp="$(mktemp)"
    awk -v ver="$new_version" -v day="$today" '
        !inserted && /^## \[/ {
            print "## [" ver "] - " day
            print ""
            print "### Cambios"
            print ""
            print "-"
            print ""
            inserted = 1
        }
        { print }
    ' "$changelog" > "$tmp"
    mv "$tmp" "$changelog"
fi

echo "  api/pyproject.toml   ${old_pyproject:-?} -> $new_version"
echo "  admin/package.json   ${old_package:-?} -> $new_version"
echo "  docs/CHANGELOG.md    + ## [$new_version] - $today"
