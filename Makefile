# Makefile de Mariachi (panel IIEG) + Portal (web publico)
# Gestiona comandos de desarrollo y producción para Docker Compose

# UID/GID del host para que volumenes escritos por contenedores tengan ownership correcto
export UID := $(shell id -u)
export GID := $(shell id -g)

# Delega los builds a buildx bake: construye nginx y api en paralelo
export COMPOSE_BAKE := true

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
else
	COMPOSE_FILE := docker-compose.dev.yml
	ENV_FILE     := .env.development
	MSG_ENV      := Desarrollo
endif

.PHONY: help up build down logs restart clean shell-api shell-admin setup setup-hooks test-backend ensure-networks deploy backup-db restore-db install-backup-cron uninstall-backup-cron refresh-mapalab-stats purge-mapalab-events backup-tarjetitas restore-tarjetitas sieej-check sieej-check-fix

## Muestra ayuda de comandos disponibles
help:
	@echo ''
	@echo '${YELLOW}Mariachi + Portal IIEG — comandos disponibles${RESET}'
	@echo ''
	@echo 'Uso: ${YELLOW}make <comando> [ENV=dev|prod]${RESET}'
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
	@echo '  ${YELLOW}make test-backend${RESET} - Corre lint + pytest del backend (mismo entorno que CI)'
	@echo '  ${YELLOW}make sieej-check${RESET}  - Verifica que las definiciones SIEEJ en BD cumplan el contrato'
	@echo '  ${YELLOW}make sieej-check-fix${RESET} - Igual, pero repara las definiciones legadas'
	@echo ''
	@echo '${GREEN}Respaldos de Postgres:${RESET}'
	@echo '  Cubre los 4 schemas de mariachi: public, huachicol, acervo, sieej.'
	@echo '  El schema mapalab (capas) vive en dataengine y lo respalda ese repo.'
	@echo '  ${YELLOW}make backup-db${RESET}              - Genera respaldo manual (rota daily/weekly/monthly en backups/)'
	@echo '  ${YELLOW}make restore-db FILE=...${RESET}    - Restaura desde un .sql.gz (busca en restore/ y backups/)'
	@echo '                                       Dropea con CASCADE los schemas del dump antes de aplicarlo.'
	@echo '  ${YELLOW}make install-backup-cron${RESET}    - Instala cronjob diario a las 3 AM (solo correr en produccion)'
	@echo '  ${YELLOW}make uninstall-backup-cron${RESET}  - Quita el cronjob instalado por install-backup-cron'
	@echo ''
	@echo '${GREEN}Tarjetitas (infobox_config de capas en DataEngine):${RESET}'
	@echo '  ${YELLOW}make backup-tarjetitas${RESET}              - Exporta infobox_config de TODAS las capas a backups/tarjetitas/'
	@echo '  ${YELLOW}make restore-tarjetitas [FILE=...]${RESET} - Aplica un export (busca en restore/ y backups/tarjetitas/; backup previo + confirmacion + apply)'
	@echo '                                       ${YELLOW}Solo lee DATAENGINE_DATABASE_URL de .env.production${RESET} (no de dev).'
	@echo '                                       Override consciente: DATAENGINE_URL='"'"'postgres://...'"'"' make backup-tarjetitas'
	@echo '                                       Solo mueve la columna infobox_config: nada del shape de la capa.'
	@echo '                                       Las capas destino deben existir con el mismo id (PK de mapalab.layers).'
	@echo ''
	@echo '${BLUE}MapaLab — Telemetria${RESET}'
	@echo '  ${YELLOW}make refresh-mapalab-stats${RESET}  - Recomputa los rollups diarios de mapalab-stats'
	@echo '  ${YELLOW}make purge-mapalab-events${RESET}   - Purga eventos crudos mas viejos que la retencion'
	@echo ''

ensure-networks:
	@docker network create iieg-network 2>/dev/null || true

setup-hooks:
	@git config core.hooksPath .githooks
	@echo "${GREEN}Hooks configurados en .githooks/${RESET}"

## Reproduce el job 'backend / test' de CI (ruff + pytest) localmente.
## Util para validar antes de hacer push (el pre-push hook lo invoca).
test-backend:
	@cd api && ruff check --no-cache app tests
	@./api/scripts/run-tests.sh

## Verifica que las definiciones de formularios SIEEJ en BD cumplan el contrato vigente.
## Correr en el deploy despues de migrar; sale con codigo 1 si alguna no valida.
sieej-check:
	@docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) exec -T api \
		python scripts/sieej_check_definiciones.py

## Igual que sieej-check, pero reescribe las definiciones legadas que lo requieran.
sieej-check-fix:
	@docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) exec -T api \
		python scripts/sieej_check_definiciones.py --fix

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
	@API_ENV_FILE=$(ENV_FILE) COMPOSE_FILE=$(COMPOSE_FILE) COMPOSE_ENV_FILE=$(ENV_FILE) ./scripts/postgres-backup.sh

## Restaura un dump .sql.gz. Sin FILE muestra lista interactiva si hay varios.
restore-db:
	@API_ENV_FILE=$(ENV_FILE) COMPOSE_FILE=$(COMPOSE_FILE) COMPOSE_ENV_FILE=$(ENV_FILE) ./scripts/postgres-restore.sh $(FILE)

## Instala cronjob diario a las 3 AM. SOLO correr en la VM de produccion.
install-backup-cron:
	@if [ "$(ENV)" != "prod" ]; then \
		echo "${YELLOW}Este target solo aplica con ENV=prod. Uso: make install-backup-cron ENV=prod${RESET}"; \
		exit 1; \
	fi
	@mkdir -p $(PWD)/backups
	@( crontab -l 2>/dev/null | grep -v 'mariachi-backup' | grep -v 'mariachi-stats' ; \
	   echo "0 3 * * * cd $(PWD) && API_ENV_FILE=$(ENV_FILE) COMPOSE_FILE=$(COMPOSE_FILE) COMPOSE_ENV_FILE=$(ENV_FILE) ./scripts/postgres-backup.sh >> $(PWD)/backups/backup.log 2>&1 # mariachi-backup" ; \
	   echo "*/30 * * * * cd $(PWD) && API_ENV_FILE=$(ENV_FILE) docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) exec -T api python scripts/refresh_mapalab_stats.py >> $(PWD)/backups/mapalab-stats.log 2>&1 # mariachi-stats-refresh" \
	) | crontab -
	@echo "${GREEN}Cronjobs instalados:${RESET}"
	@crontab -l | grep -E 'mariachi-(backup|stats)'

## Quita el cronjob instalado por install-backup-cron.
uninstall-backup-cron:
	@( crontab -l 2>/dev/null | grep -v 'mariachi-backup' | grep -v 'mariachi-stats' ) | crontab -
	@echo "${GREEN}Cronjobs de respaldo y stats removidos.${RESET}"

# =============================================================================
# TARJETITAS (infobox_config en DataEngine)
# =============================================================================

TARJETITAS_DIR := backups/tarjetitas

# Lee DATAENGINE_DATABASE_URL EXCLUSIVAMENTE de .env.production.
# Las tarjetitas siempre se mueven contra prod (fuente de verdad); usar dev
# por accidente puede sobrescribir capas reales. Override consciente:
# DATAENGINE_URL='postgres://...' make ...
define resolve_dataengine_url
DE_URL="$${DATAENGINE_URL:-}"; \
if [ -z "$$DE_URL" ]; then \
	f=.env.production; \
	if [ -f "$$f" ]; then \
		DE_URL="$$(grep -E '^DATAENGINE_DATABASE_URL=' "$$f" 2>/dev/null | head -1 | sed -E 's/^DATAENGINE_DATABASE_URL=//; s/^[\"\x27]//; s/[\"\x27]$$//')"; \
		[ -n "$$DE_URL" ] && echo "[tarjetitas] usando DATAENGINE_DATABASE_URL de $$f"; \
	fi; \
fi; \
if [ -z "$$DE_URL" ]; then \
	echo "${YELLOW}No se encontro DATAENGINE_DATABASE_URL en .env.production (las tarjetitas solo se leen de ese archivo).${RESET}"; \
	echo "Uso: DATAENGINE_URL='postgres://...' make $@"; \
	exit 1; \
fi
endef

## Exporta infobox_config de mapalab.layers a backups/tarjetitas/ (JSON + SQL).
## Auto-detecta DATAENGINE_DATABASE_URL del primer .env.* que la tenga.
## Override: DATAENGINE_URL='postgres://...' make backup-tarjetitas
backup-tarjetitas:
	@mkdir -p $(TARJETITAS_DIR)
	@$(resolve_dataengine_url); \
	DATAENGINE_URL="$$DE_URL" OUT_DIR=$(TARJETITAS_DIR) ./scripts/dataengine-export-infobox.sh

## Aplica un export de tarjetitas en la BD destino. Hace backup reverso primero.
## Sin FILE: selector interactivo; busca en restore/ primero, fallback a backups/tarjetitas/.
## Con FILE: usa el archivo explicito (saltea el selector).
## Override de URL: DATAENGINE_URL='postgres://...' make restore-tarjetitas [FILE=...]
restore-tarjetitas:
	@if [ -n "$(FILE)" ]; then \
		FILE_SEL="$(FILE)"; \
	else \
		FILE_SEL=$$(./scripts/pick-tarjetita.sh) || exit $$?; \
	fi; \
	if [ -z "$$FILE_SEL" ]; then \
		echo "${YELLOW}No se selecciono ningun archivo.${RESET}"; \
		exit 1; \
	fi; \
	$(resolve_dataengine_url); \
	DATAENGINE_URL="$$DE_URL" ./scripts/dataengine-apply-infobox.sh "$$FILE_SEL"

# =============================================================================
# MAPALAB STATS (telemetria)
# =============================================================================

## Recomputa los rollups diarios persistentes de mapalab-stats. Se invoca cada
## 30 min por cron en prod; este target es para refresh manual.
refresh-mapalab-stats:
	@docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) exec -T api python scripts/refresh_mapalab_stats.py

## Purga eventos crudos mas viejos que la retencion configurada (default 90 dias).
## Usa MAPALAB_EVENTS_RETENTION_DAYS / MAPALAB_SESSIONS_RETENTION_DAYS para ajustar.
purge-mapalab-events:
	@docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) exec -T api python scripts/purge_mapalab_events.py

setup:
	@if [ ! -f .env.development ]; then \
		cp .env.development.example .env.development; \
		echo "${GREEN}Creado .env.development desde ejemplo${RESET}"; \
	else \
		echo "${YELLOW}.env.development ya existe${RESET}"; \
	fi
	@if [ ! -f .env.production ]; then \
		cp .env.production.example .env.production; \
		echo "${GREEN}Creado .env.production desde ejemplo${RESET}"; \
	else \
		echo "${YELLOW}.env.production ya existe${RESET}"; \
	fi
