.PHONY: sync-vine backup-vine restore-vine

##@ Vine

sync-vine: ## Traer del biometrico los accesos que falten en el schema vine
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'SYNC-VINE'; exit 0; fi
	dc "$$env" exec -T api python scripts/sync_vine.py

backup-vine: ## Respaldar solo el schema vine (personal, eventos, fichas e incidencias)
	@$(LIB)
	banner 'BACKUP' 'vine'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'BACKUP-VINE'; exit 0; fi
	script_env "$$env"
	rule
	OUT_DIR=$(VINE_DIR) ./scripts/vine-backup.sh

restore-vine: ## Restaurar el schema vine desde un respaldo, con selector
	@$(LIB)
	banner 'RESTORE' 'vine'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'RESTORE-VINE'; exit 0; fi
	script_env "$$env"
	mapfile -t archivos < <(ls -1t $(VINE_DIR)/vine-*.sql.gz 2>/dev/null | head -20)
	if [ $${#archivos[@]} -eq 0 ]; then
		printf '  %sNo hay respaldos en %s%s\n\n' "$$C_YELLOW" '$(VINE_DIR)' "$$C_RESET"
		exit 1
	fi
	archivo=$$(pick 'Respaldo a restaurar' "$${archivos[@]}")
	if [ -z "$$archivo" ]; then
		printf '  %sNo hay respaldos en %s%s\n\n' "$$C_YELLOW" '$(VINE_DIR)' "$$C_RESET"
		exit 1
	fi
	rule
	./scripts/vine-restore.sh "$$archivo"
