.PHONY: sieej-check

##@ SIEEJ

sieej-check: ## Verificar las definiciones de formularios contra el contrato
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'SIEEJ-CHECK'; exit 0; fi
	banner 'SIEEJ-CHECK' "$$env"
	mode=$$(pick 'Modo' 'verificar' 'verificar y reparar')
	rule
	if [ "$$mode" = 'verificar' ]; then
		dc "$$env" exec -T api python scripts/sieej_check_definiciones.py
	else
		dc "$$env" exec -T api python scripts/sieej_check_definiciones.py --fix
	fi
