.PHONY: backup-db restore-db backup-tarjetitas restore-tarjetitas cron

##@ Respaldos

backup-db: ## Respaldo de Postgres con rotacion GFS, solo produccion
	@$(LIB)
	banner 'BACKUP' 'postgres'
	require_prod_running
	rule
	script_env prod
	./scripts/postgres-backup.sh

restore-db: ## Restaurar un dump de Postgres, con selector
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'RESTORE'; exit 0; fi
	banner 'RESTORE' "$$env"
	rule
	script_env "$$env"
	./scripts/postgres-restore.sh

backup-tarjetitas: ## Exportar infobox_config de mapalab.layers
	@$(LIB)
	banner 'BACKUP' 'tarjetitas'
	mkdir -p $(TARJETITAS_DIR)
	url=$$(dataengine_url)
	row 'Origen' 'dataengine' "$$C_GREEN" 'via .env.production'
	rule
	DATAENGINE_URL="$$url" OUT_DIR=$(TARJETITAS_DIR) ./scripts/dataengine-export-infobox.sh

restore-tarjetitas: ## Aplicar un export de tarjetitas, con selector
	@$(LIB)
	banner 'RESTORE' 'tarjetitas'
	url=$$(dataengine_url)
	file=$$(./scripts/pick-tarjetita.sh)
	if [ -z "$$file" ]; then
		printf '  %sNo se selecciono ningun archivo.%s\n\n' "$$C_YELLOW" "$$C_RESET"
		exit 1
	fi
	rule
	DATAENGINE_URL="$$url" ./scripts/dataengine-apply-infobox.sh "$$file"

cron: ## Instalar o desinstalar los cron de respaldo y stats
	@$(LIB)
	banner 'CRON'
	action=$$(pick 'Accion' 'instalar' 'desinstalar')
	rule
	if [ "$$action" = 'instalar' ]; then cron_install; else cron_remove; fi
	rule
	printf '\n'
