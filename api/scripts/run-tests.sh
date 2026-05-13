#!/usr/bin/env bash
# Corre el suite de pytest del backend reproduciendo el entorno de CI.
#
# Estrategia: arranca un contenedor desechable a partir de la imagen
# `mariachi-api:latest` (build del Dockerfile) con env vars de test
# (sqlite:///:memory:, secrets dummy, ENV=test). Si pytest no esta instalado
# en la imagen lo agrega al vuelo. Si la imagen no existe, intenta `pytest`
# del PATH local.
#
# Variables opcionales:
#   PYTEST_ARGS  flags extra para pytest (default: "-q")
#   API_IMAGE    nombre de la imagen (default: mariachi-api:latest)

set -e

API_IMAGE="${API_IMAGE:-mariachi-api:latest}"
PYTEST_ARGS="${PYTEST_ARGS:--q}"

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"

TEST_ENV=(
    -e ENV=test
    -e PROJECT_NAME=mariachi-test
    -e "DATABASE_URL=sqlite:///:memory:"
    -e SECRET_KEY=test-secret-key-do-not-use-in-production
    -e CSRF_SECRET_KEY=test-csrf-secret-key-do-not-use-in-production
    -e "REDIS_URL=redis://localhost:6379/0"
    -e 'CORS_ORIGINS=["http://localhost:3000"]'
    -e ACERVO_ENDPOINT=localhost:9000
    -e ACERVO_PUBLIC_ENDPOINT=localhost:9000
    -e ACERVO_USE_SSL=false
    -e ACERVO_PORTAL_ACCESS_KEY=test-portal
    -e ACERVO_PORTAL_SECRET_KEY=test-portal-secret
    -e ACERVO_MAPALAB_ACCESS_KEY=test-mapalab
    -e ACERVO_MAPALAB_SECRET_KEY=test-mapalab-secret
    -e ACERVO_MARIACHI_ACCESS_KEY=test-mariachi
    -e ACERVO_MARIACHI_SECRET_KEY=test-mariachi-secret
    -e ACERVO_SIEEJ_ACCESS_KEY=test-sieej
    -e ACERVO_SIEEJ_SECRET_KEY=test-sieej-secret
    -e ACERVO_IIEG_ACCESS_KEY=test-iieg
    -e ACERVO_IIEG_SECRET_KEY=test-iieg-secret
)

if docker image inspect "$API_IMAGE" >/dev/null 2>&1; then
    # Container temporal sobre la imagen prod-ish. Instala pytest al vuelo si
    # la imagen no lo trae (la imagen `production` del Dockerfile no incluye
    # los `[dev]` extras). Monta el codigo en /app para que recoja los
    # cambios locales sin rebuild.
    PYTEST_CHECK='python -c "import pytest" 2>/dev/null || pip install -q pytest pytest-asyncio >/dev/null'
    exec docker run --rm \
        "${TEST_ENV[@]}" \
        -v "$API_DIR:/app" \
        -w /app \
        --entrypoint sh \
        "$API_IMAGE" \
        -c "$PYTEST_CHECK && pytest $PYTEST_ARGS"
fi

# Fallback local: necesita un venv con las deps instaladas.
if command -v pytest >/dev/null 2>&1; then
    cd "$API_DIR"
    exec env \
        ENV=test \
        PROJECT_NAME=mariachi-test \
        DATABASE_URL='sqlite:///:memory:' \
        SECRET_KEY=test-secret-key-do-not-use-in-production \
        CSRF_SECRET_KEY=test-csrf-secret-key-do-not-use-in-production \
        REDIS_URL='redis://localhost:6379/0' \
        CORS_ORIGINS='["http://localhost:3000"]' \
        ACERVO_ENDPOINT=localhost:9000 \
        ACERVO_PUBLIC_ENDPOINT=localhost:9000 \
        ACERVO_USE_SSL=false \
        ACERVO_PORTAL_ACCESS_KEY=test-portal \
        ACERVO_PORTAL_SECRET_KEY=test-portal-secret \
        ACERVO_MAPALAB_ACCESS_KEY=test-mapalab \
        ACERVO_MAPALAB_SECRET_KEY=test-mapalab-secret \
        ACERVO_MARIACHI_ACCESS_KEY=test-mariachi \
        ACERVO_MARIACHI_SECRET_KEY=test-mariachi-secret \
        ACERVO_SIEEJ_ACCESS_KEY=test-sieej \
        ACERVO_SIEEJ_SECRET_KEY=test-sieej-secret \
        ACERVO_IIEG_ACCESS_KEY=test-iieg \
        ACERVO_IIEG_SECRET_KEY=test-iieg-secret \
        pytest $PYTEST_ARGS
fi

echo "[run-tests] No pude correr pytest:" >&2
echo "[run-tests]   - imagen Docker '${API_IMAGE}' no existe (corre 'make build' o 'make up')" >&2
echo "[run-tests]   - y 'pytest' no esta en el PATH" >&2
echo "[run-tests] Soluciones:" >&2
echo "[run-tests]   make up   # build + arranca el entorno" >&2
echo "[run-tests]   o crea un venv:  cd api && python -m venv .venv && source .venv/bin/activate && pip install -e '.[dev]'" >&2
exit 1
