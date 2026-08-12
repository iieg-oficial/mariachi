export UID := $(shell id -u)
export GID := $(shell id -g)
export COMPOSE_BAKE := true

REPO_NAME    := mariachi
COMPOSE_PROD := -f compose.yaml -f compose.prod.yaml
COMPOSE_DEV  := -f compose.yaml -f compose.dev.yaml
ENV_PROD     := .env.production
ENV_DEV      := .env.development
TARJETITAS_DIR := backups/tarjetitas

UP_GUARDS     = ensure_network
DEPLOY_GUARDS = ensure_network

include make/common.mk
include make/backup.mk
include make/dev.mk
include make/sieej.mk
include make/vine.mk
include make/mapalab.mk
