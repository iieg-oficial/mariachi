#!/usr/bin/env bash
# Actualiza el remote local tras renombrar el repo en GitHub.
#
# PASOS PREVIOS (manuales en GitHub web):
#   1. Ir a https://github.com/<OWNER>/<OLD_REPO>/settings
#   2. En la seccion "Repository name", cambiar el nombre
#   3. Click en "Rename"
#   GitHub configura una redireccion automatica, asi que el remote viejo sigue funcionando,
#   pero es mejor apuntar al nuevo nombre explicitamente.
#
# Uso:
#   GH_OWNER=<owner> GH_OLD_REPO=<old> GH_NEW_REPO=<new> ./scripts/rename-github-repo.sh           # dry-run
#   GH_OWNER=<owner> GH_OLD_REPO=<old> GH_NEW_REPO=<new> ./scripts/rename-github-repo.sh --execute # aplica
#
# Tambien se puede pasar el URL completo con GH_OLD_URL / GH_NEW_URL (formato SSH o HTTPS).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

: "${GH_OWNER:?GH_OWNER no definido (ej. GH_OWNER=mi-usuario)}"
: "${GH_OLD_REPO:?GH_OLD_REPO no definido (ej. GH_OLD_REPO=nombre-viejo)}"
: "${GH_NEW_REPO:?GH_NEW_REPO no definido (ej. GH_NEW_REPO=nombre-nuevo)}"

OLD_URL="${GH_OLD_URL:-git@github.com:${GH_OWNER}/${GH_OLD_REPO}.git}"
NEW_URL="${GH_NEW_URL:-git@github.com:${GH_OWNER}/${GH_NEW_REPO}.git}"

EXECUTE=0
for arg in "$@"; do
    case "$arg" in
        --execute) EXECUTE=1 ;;
        -h|--help)
            sed -n '2,17p' "$0"
            exit 0
            ;;
    esac
done

CURRENT=$(git remote get-url origin 2>/dev/null || echo "")

echo "=== Remote actual ==="
echo "  $CURRENT"
echo "=== Remote objetivo ==="
echo "  $NEW_URL"
echo

if [ "$CURRENT" = "$NEW_URL" ]; then
    echo "El remote ya apunta al nuevo URL. Nada que hacer."
    exit 0
fi

if [ "$CURRENT" != "$OLD_URL" ]; then
    echo "ADVERTENCIA: el remote actual no es '$OLD_URL'."
    echo "Verifica manualmente antes de ejecutar. Abortando."
    exit 1
fi

if [ $EXECUTE -eq 0 ]; then
    echo "DRY-RUN. Para aplicar:"
    echo "  git remote set-url origin $NEW_URL"
    echo
    echo "Despues verifica con:"
    echo "  git fetch origin"
    echo "  git remote -v"
    exit 0
fi

echo "=== Verificando que el nuevo URL responde ==="
if ! git ls-remote "$NEW_URL" HEAD >/dev/null 2>&1; then
    echo "ERROR: no se puede conectar a $NEW_URL" >&2
    echo "Verifica que el repo ya fue renombrado en GitHub web." >&2
    exit 1
fi

echo "=== Actualizando remote ==="
git remote set-url origin "$NEW_URL"

echo "=== Verificacion ==="
git remote -v
echo
git fetch origin

echo
echo "Remote actualizado correctamente."
echo
echo "Siguiente paso: actualizar referencias en README.md, CONTRIBUTING.md,"
echo "y cualquier workflow de CI/CD que apunte al repo viejo."
