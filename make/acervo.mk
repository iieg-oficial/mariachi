.PHONY: acervo-barrido

##@ Acervo

acervo-barrido: ## Buscar objetos de acervo con tipo guardado falso y neutralizarlos
	@$(LIB)
	env=$$(resolve_env)
	if [ -z "$$env" ]; then nothing_running 'ACERVO-BARRIDO'; exit 0; fi
	banner 'ACERVO-BARRIDO' "$$env"
	accion=$$(pick 'Accion' 'reporte' 'corregir')
	if [ -z "$$accion" ]; then exit 1; fi
	rule
	if [ "$$accion" = 'reporte' ]; then
		dc "$$env" exec -T api python scripts/acervo_barrido.py
	else
		confirm 'Reescribe tipo y Content-Disposition de los hallazgos en todos los buckets menos portal.' 'corregir'
		dc "$$env" exec -T api python scripts/acervo_barrido.py --corregir
	fi
