# Makefile de Mariachi (panel IIEG) + Portal (web publico)
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

.PHONY: help up build down logs restart clean shell-api shell-admin setup setup-hooks ensure-networks deploy backup-db restore-db install-backup-cron uninstall-backup-cron

## Muestra ayuda de comandos disponibles
help:
	@echo ''
	@echo '${YELLOW}Mariachi + Portal IIEG — comandos disponibles${RESET}'
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
	@echo '  ${YELLOW}make shell-admin${RESET} - Entra a la terminal del contenedor Admin'
	@echo '  ${YELLOW}make setup${RESET}       - Crea archivos .env iniciales si no existen'
	@echo '  ${YELLOW}make setup-hooks${RESET} - Configura git hooks del proyecto (core.hooksPath)'
	@echo ''
	@echo '${GREEN}Respaldos de Postgres:${RESET}'
	@echo '  ${YELLOW}make backup-db${RESET}              - Genera respaldo manual (rota daily/weekly/monthly en backups/)'
	@echo '  ${YELLOW}make restore-db FILE=...${RESET}    - Restaura desde un .sql.gz (busca en restore/ y backups/)'
	@echo '  ${YELLOW}make install-backup-cron${RESET}    - Instala cronjob diario a las 3 AM (solo correr en produccion)'
	@echo '  ${YELLOW}make uninstall-backup-cron${RESET}  - Quita el cronjob instalado por install-backup-cron'
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
# DEPLOY (target invocado por CD desde el host de produccion)
# =============================================================================

## Deploy de produccion: build + up con el compose de prod
deploy: ensure-networks
	@echo "${GREEN}Deploy de produccion${RESET}"
	@API_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.yml build
	@API_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.yml up -d
	@echo "${GREEN}Deploy completado${RESET}"

# =============================================================================
# UTILIDADES
# =============================================================================

clean:
	@echo "${YELLOW}Limpiando sistema (contenedores, redes y volúmenes)...${RESET}"
	docker compose -f docker-compose.dev.yml down -v --remove-orphans || true
	docker compose -f docker-compose.yml down -v --remove-orphans || true

shell-api:
	docker compose -f $(COMPOSE_FILE) exec api /bin/bash

shell-admin:
	docker compose -f $(COMPOSE_FILE) exec admin /bin/sh

# =============================================================================
# RESPALDOS DE POSTGRES
# =============================================================================

## Genera respaldo de Postgres aplicando rotacion GFS (daily/weekly/monthly).
## Por defecto usa docker-compose.yml; pasa COMPOSE_FILE=... para otro entorno.
backup-db:
	@COMPOSE_FILE=$(COMPOSE_FILE) ./scripts/postgres-backup.sh

## Restaura un dump .sql.gz. Sin FILE muestra lista interactiva si hay varios.
restore-db:
	@COMPOSE_FILE=$(COMPOSE_FILE) ./scripts/postgres-restore.sh $(FILE)

## Instala cronjob diario a las 3 AM. SOLO correr en la VM de produccion.
install-backup-cron:
	@if [ "$(ENV)" != "prod" ]; then \
		echo "${YELLOW}Este target solo aplica con ENV=prod. Uso: make install-backup-cron ENV=prod${RESET}"; \
		exit 1; \
	fi
	@mkdir -p $(PWD)/backups
	@( crontab -l 2>/dev/null | grep -v 'mariachi-backup' ; \
	   echo "0 3 * * * cd $(PWD) && ./scripts/postgres-backup.sh >> $(PWD)/backups/backup.log 2>&1 # mariachi-backup" \
	) | crontab -
	@echo "${GREEN}Cronjob instalado:${RESET}"
	@crontab -l | grep 'mariachi-backup'

## Quita el cronjob instalado por install-backup-cron.
uninstall-backup-cron:
	@( crontab -l 2>/dev/null | grep -v 'mariachi-backup' ) | crontab -
	@echo "${GREEN}Cronjob de respaldo removido.${RESET}"

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
