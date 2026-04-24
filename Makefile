# Makefile para IIEG Mariachi (CMS) + Portal (web publico)
# Gestiona comandos de desarrollo, staging y producción para Docker Compose

# UID/GID del host para que volumenes escritos por contenedores tengan ownership correcto
export UID := $(shell id -u)
export GID := $(shell id -g)

# Colores para output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

# Entorno por defecto: dev
ENV ?= dev

# Configuración según entorno
ifeq ($(ENV),prod)
	COMPOSE_FILE := docker-compose.yml
	ENV_FILE     := .env.production
	MSG_ENV      := Producción
else ifeq ($(ENV),staging)
	COMPOSE_FILE := docker-compose.yml
	ENV_FILE     := .env.staging
	MSG_ENV      := Staging
else
	COMPOSE_FILE := docker-compose.dev.yml
	ENV_FILE     := .env.development
	MSG_ENV      := Desarrollo
endif

.PHONY: help up build down logs restart clean shell-api shell-web shell-admin setup setup-hooks ensure-networks

## Muestra ayuda de comandos disponibles
help:
	@echo ''
	@echo '${YELLOW}IIEG Mariachi (CMS) + Portal - Comandos disponibles${RESET}'
	@echo ''
	@echo 'Uso: ${YELLOW}make <comando> [ENV=dev|staging|prod]${RESET}'
	@echo '     (Por defecto ENV=dev)'
	@echo ''
	@echo '${GREEN}Comandos Generales:${RESET}'
	@echo '  ${YELLOW}make up${RESET}          - Inicia el entorno (en segundo plano)'
	@echo '  ${YELLOW}make build${RESET}       - Reconstruye e inicia el entorno'
	@echo '  ${YELLOW}make down${RESET}        - Detiene todos los contenedores'
	@echo '  ${YELLOW}make logs${RESET}        - Muestra logs en tiempo real'
	@echo '  ${YELLOW}make restart${RESET}     - Reinicia el entorno'
	@echo ''
	@echo '${GREEN}Utilidades:${RESET}'
	@echo '  ${YELLOW}make clean${RESET}       - Elimina contenedores, redes y volúmenes (¡Cuidado!)'
	@echo '  ${YELLOW}make shell-api${RESET}   - Entra a la terminal del contenedor API'
	@echo '  ${YELLOW}make shell-web${RESET}   - Entra a la terminal del contenedor Web'
	@echo '  ${YELLOW}make shell-admin${RESET} - Entra a la terminal del contenedor Admin'
	@echo '  ${YELLOW}make setup${RESET}       - Crea archivos .env iniciales si no existen'
	@echo '  ${YELLOW}make setup-hooks${RESET} - Configura git hooks del proyecto (core.hooksPath)'
	@echo ''

ensure-networks:
	@docker network create iieg-network 2>/dev/null || true

setup-hooks:
	@git config core.hooksPath .githooks
	@echo "${GREEN}Hooks configurados en .githooks/${RESET}"

# =============================================================================
# COMANDOS PRINCIPALES
# =============================================================================

up:
	@echo "${GREEN}Iniciando entorno de $(MSG_ENV)...${RESET}"
	API_ENV_FILE=$(ENV_FILE) docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d

build:
	@echo "${GREEN}Reconstruyendo entorno de $(MSG_ENV)...${RESET}"
	API_ENV_FILE=$(ENV_FILE) docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d --build

down:
	@echo "${YELLOW}Deteniendo entorno de $(MSG_ENV)...${RESET}"
	API_ENV_FILE=$(ENV_FILE) docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) down

logs:
	API_ENV_FILE=$(ENV_FILE) docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) logs -f

restart: down up

# =============================================================================
# UTILIDADES
# =============================================================================

clean:
	@echo "${YELLOW}Limpiando sistema (contenedores, redes y volúmenes)...${RESET}"
	docker compose -f docker-compose.dev.yml down -v --remove-orphans || true
	docker compose -f docker-compose.yml down -v --remove-orphans || true

shell-api:
	docker compose -f $(COMPOSE_FILE) exec api /bin/bash

shell-web:
	docker compose -f $(COMPOSE_FILE) exec web /bin/sh

shell-admin:
	docker compose -f $(COMPOSE_FILE) exec admin /bin/sh

setup:
	@if [ ! -f .env.development ]; then \
		cp .env.development.example .env.development; \
		echo "${GREEN}Creado .env.development desde ejemplo${RESET}"; \
	else \
		echo "${YELLOW}.env.development ya existe${RESET}"; \
	fi
	@if [ ! -f .env.staging ]; then \
		cp .env.staging.example .env.staging; \
		echo "${GREEN}Creado .env.staging desde ejemplo${RESET}"; \
	else \
		echo "${YELLOW}.env.staging ya existe${RESET}"; \
	fi
	@if [ ! -f .env.production ]; then \
		cp .env.production.example .env.production; \
		echo "${GREEN}Creado .env.production desde ejemplo${RESET}"; \
	else \
		echo "${YELLOW}.env.production ya existe${RESET}"; \
	fi
