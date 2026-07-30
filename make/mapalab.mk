.PHONY: refresh-mapalab-stats purge-mapalab-events

##@ MapaLab

refresh-mapalab-stats: ## Recomputar los rollups diarios de mapalab-stats
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'REFRESH'; exit 0; fi
	dc "$$env" exec -T api python scripts/refresh_mapalab_stats.py

purge-mapalab-events: ## Purgar eventos crudos mas viejos que la retencion
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'PURGE'; exit 0; fi
	banner 'PURGE' "$$env"
	rule
	dc "$$env" exec -T api python scripts/purge_mapalab_events.py
