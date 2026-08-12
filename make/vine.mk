.PHONY: sync-vine

##@ Vine

sync-vine: ## Traer del biometrico los accesos que falten en el schema vine
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'SYNC-VINE'; exit 0; fi
	dc "$$env" exec -T api python scripts/sync_vine.py
