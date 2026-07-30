.PHONY: setup setup-hooks test-backend

##@ Desarrollo

setup: ## Crear los .env iniciales desde los ejemplos
	@$(LIB)
	banner 'SETUP'
	for env in development production; do
		if [ -f ".env.$$env" ]; then
			row "$$env" 'ya existe' "$$C_DIM"
		else
			cp ".env.$$env.example" ".env.$$env"
			row "$$env" 'creado' "$$C_GREEN" "edita .env.$$env"
		fi
	done
	rule
	printf '\n'

setup-hooks: ## Configurar los git hooks del proyecto
	@$(LIB)
	git config core.hooksPath .githooks
	row 'Hooks' 'configurados' "$$C_GREEN" '.githooks/'

test-backend: ## Correr ruff y pytest del backend, como en CI
	@$(LIB)
	banner 'TEST' 'backend'
	rule
	cd api && ruff check --no-cache app tests
	./api/scripts/run-tests.sh
