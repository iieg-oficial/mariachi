.PHONY: backups restores backup-db restore-db backup-tarjetitas restore-tarjetitas backup-roadmap restore-roadmap backup-llaves restore-llaves backup-telemetria-intranet restore-telemetria-intranet cron

##@ Respaldos

backups: ## Correr los seis respaldos de un tiron
	@$(LIB)
	banner 'BACKUPS' 'postgres, vine, roadmap, tarjetitas, llaves y telemetria de intranet'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'BACKUPS'; exit 0; fi
	row 'Entorno' "$$env"
	rule
	fallos=0
	if project_running "$(PROJECT_PROD)"; then
		run_step 'postgres' $(MAKE) --no-print-directory backup-db || fallos=$$((fallos + 1))
	else
		row 'postgres' 'omitido' "$$C_DIM" 'el general solo corre contra produccion'
	fi
	for objetivo in vine roadmap tarjetitas llaves telemetria-intranet; do
		run_step "$$objetivo" $(MAKE) --no-print-directory "backup-$$objetivo" || fallos=$$((fallos + 1))
	done
	rule
	if [ "$$fallos" -gt 0 ]; then
		printf '  %s%d de 6 fallaron%s. VERBOSE=1 muestra la salida completa.\n\n' "$$C_RED" "$$fallos" "$$C_RESET"
		exit 1
	fi
	printf '  %sTodo respaldado.%s\n\n' "$$C_GREEN" "$$C_RESET"

restores: ## Elegir que restaurar, en vez de recordar el target
	@$(LIB)
	banner 'RESTORES' 'selector'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'RESTORES'; exit 0; fi
	if [ ! -t 0 ]; then
		fail 'Entrada:el selector necesita una terminal' \
			'Sin tty, pick elige la primera opcion sola y aqui cualquiera escribe en la base. Llama al target directo: restore-db, restore-vine, restore-roadmap, restore-tarjetitas, restore-llaves o restore-telemetria-intranet.'
	fi
	row 'Entorno' "$$env"
	rule
	elegido=$$(pick 'Que restaurar' 'vine' 'roadmap' 'tarjetitas' 'llaves' 'telemetria-intranet' 'postgres — la base entera' 'todo — postgres + tarjetitas')
	if [ -z "$$elegido" ]; then exit 1; fi
	case "$$elegido" in
		todo*) objetivos='restore-db restore-tarjetitas' ;;
		postgres*) objetivos='restore-db' ;;
		*) objetivos="restore-$$elegido" ;;
	esac
	rule
	for objetivo in $$objetivos; do
		$(MAKE) --no-print-directory "$$objetivo"
	done

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

backup-roadmap: ## Respaldar solo el roadmap (hitos, ciclos y procesos)
	@$(LIB)
	banner 'BACKUP' 'roadmap'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'BACKUP-ROADMAP'; exit 0; fi
	script_env "$$env"
	rule
	OUT_DIR=$(ROADMAP_DIR) ./scripts/roadmap-backup.sh

restore-roadmap: ## Restaurar el roadmap desde un respaldo, con selector
	@$(LIB)
	banner 'RESTORE' 'roadmap'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'RESTORE-ROADMAP'; exit 0; fi
	script_env "$$env"
	mapfile -t archivos < <(ls -1t $(ROADMAP_DIR)/roadmap-*.sql.gz 2>/dev/null | head -20)
	if [ $${#archivos[@]} -eq 0 ]; then
		printf '  %sNo hay respaldos en %s%s\n\n' "$$C_YELLOW" '$(ROADMAP_DIR)' "$$C_RESET"
		exit 1
	fi
	archivo=$$(pick 'Respaldo a restaurar' "$${archivos[@]}")
	if [ -z "$$archivo" ]; then
		printf '  %sNo se selecciono ningun archivo.%s\n\n' "$$C_YELLOW" "$$C_RESET"
		exit 1
	fi
	rule
	./scripts/roadmap-restore.sh "$$archivo"

backup-llaves: ## Respaldar las llaves de MapaLab, sus embebidos y las apps de Colibri
	@$(LIB)
	banner 'BACKUP' 'llaves'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'BACKUP-LLAVES'; exit 0; fi
	script_env "$$env"
	rule
	OUT_DIR=$(LLAVES_DIR) ./scripts/llaves-backup.sh

restore-llaves: ## Fusionar un respaldo de llaves con las de la base, con selector
	@$(LIB)
	banner 'RESTORE' 'llaves'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'RESTORE-LLAVES'; exit 0; fi
	script_env "$$env"
	archivo=$$(pick_respaldo $(LLAVES_DIR) llaves) || exit 1
	rule
	./scripts/llaves-restore.sh "$$archivo"

backup-telemetria-intranet: ## Respaldar la telemetria de intranet, que solo vive en el espejo
	@$(LIB)
	banner 'BACKUP' 'telemetria de intranet'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'BACKUP-TELEMETRIA'; exit 0; fi
	script_env "$$env"
	rule
	OUT_DIR=$(TELEMETRIA_INTRANET_DIR) ./scripts/telemetria-intranet-backup.sh

restore-telemetria-intranet: ## Agregar la telemetria de intranet de un respaldo, con selector
	@$(LIB)
	banner 'RESTORE' 'telemetria de intranet'
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'RESTORE-TELEMETRIA'; exit 0; fi
	script_env "$$env"
	archivo=$$(pick_respaldo $(TELEMETRIA_INTRANET_DIR) telemetria-intranet) || exit 1
	rule
	./scripts/telemetria-intranet-restore.sh "$$archivo"

cron: ## Instalar o desinstalar los cron de respaldo y stats
	@$(LIB)
	banner 'CRON'
	action=$$(pick 'Accion' 'instalar' 'desinstalar')
	rule
	if [ "$$action" = 'instalar' ]; then cron_install; else cron_remove; fi
	rule
	printf '\n'
