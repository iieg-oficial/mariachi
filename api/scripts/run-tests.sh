#!/usr/bin/env bash
# Corre el suite de pytest del backend reproduciendo el entorno de CI.
#
# Estrategia: si el contenedor mariachi-api está corriendo, ejecutamos pytest
# adentro con env vars de test (igual al workflow test-backend.yml). Si no
# está corriendo, intenta un fallback con `python -m pytest` local.
#
# Variables opcionales:
#   PYTEST_ARGS  flags extra para pytest (default: "-q")
#   API_CONTAINER  nombre del contenedor (default: mariachi-api)

set -e

API_CONTAINER="${API_CONTAINER:-mariachi-api}"
PYTEST_ARGS="${PYTEST_ARGS:--q}"

TEST_ENV=(
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

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${API_CONTAINER}$"; then
    # Asegura que pytest esté disponible en el contenedor (la imagen de prod
    # no lo incluye; el container persiste la instalación hasta el siguiente rebuild).
    if ! docker exec "$API_CONTAINER" python -c "import pytest" 2>/dev/null; then
        echo "[run-tests] pytest no instalado en el contenedor, instalando..."
        docker exec "$API_CONTAINER" pip install -q pytest pytest-asyncio >/dev/null
    fi
    exec docker exec "${TEST_ENV[@]}" -w /app "$API_CONTAINER" pytest $PYTEST_ARGS
fi

# Fallback local: necesita un venv con las deps instaladas.
if command -v pytest >/dev/null 2>&1; then
    cd "$(dirname "$0")/.."
    exec env \
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

echo "[run-tests] No pude correr pytest: ni hay contenedor '${API_CONTAINER}' corriendo," >&2
echo "[run-tests] ni 'pytest' en el PATH. Sugerencias:" >&2
echo "[run-tests]   - make up   (levanta el contenedor)" >&2
echo "[run-tests]   - pip install pytest pytest-asyncio   (en venv local)" >&2
exit 1
