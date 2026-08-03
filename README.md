# Mariachi

**Versión:** número único del monorepo en `api/pyproject.toml` ([changelog](docs/CHANGELOG.md))

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

**Mariachi — panel de administración del ecosistema IIEG**

</div>

Repo con dos componentes que comparten infraestructura:

| Componente | Descripción | Puerto dev |
|---|---|---|
| **admin** | Panel *Mariachi* con React + Ant Design | 3011 |
| **api** | Backend FastAPI + PostgreSQL + Redis | 8000 |

Administra contenido de los proyectos del ecosistema IIEG (Portalito, MapaLab, SIEEJ). El **Portal público** vive ahora en su propio repo ([../portal](../portal)) — consume `/api/portal/*` de este `api`.

En producción se levanta detrás del `gateway-hub` externo (termina SSL, sirve robots/sitemap y headers de seguridad). El `nginx/` interno de este repo queda minimal — sirve los estáticos del `admin/` y hace proxy a `/api/`.

---

## Inicio rápido

### Desarrollo local

```bash
# 1. Crear archivos .env a partir de los ejemplos
make setup

# 2. Editar .env.development con tus credenciales locales

# 3. Levantar
make up
```

Accesos locales: web en `http://localhost:3010`, admin en `http://localhost:3011`, api en `http://localhost:8000/api/administrador`.

### Producción

Corre detrás de `gateway-hub` en la red Docker externa `iieg-network`.

```bash
# Una vez, si la red no existe:
docker network create iieg-network

make deploy               # usa .env.production + docker-compose.yml
```

En el `.env` de `gateway-hub`: `PORTAL_HOST=mariachi-nginx:80`.

---

## Comandos (Makefile)

`make <comando>`. El entorno se detecta solo, ya no hay banderas.

| Comando | Descripción |
|---|---|
| `make up` | Levanta el entorno en segundo plano |
| `make deploy` | Actualiza, reconstruye y levanta producción |
| `make down` | Detiene contenedores |
| `make logs` | Sigue logs en vivo |
| `make restart` | Reinicia |
| `make clean` | Borra contenedores, redes y volúmenes del entorno |
| `make shell` | Shell dentro de un contenedor, con selector de servicio |
| `make setup` | Crea `.env.development` y `.env.production` desde los `.example` |

---

## Entornos

El comportamiento del backend se bifurca por la variable `ENVIRONMENT` (leída en `api/app/core/settings.py`):

| `ENVIRONMENT` | `docs_url` / `redoc_url` / `openapi_url` | `cookie_secure` | `CORS_ORIGINS` con `*` |
|---|---|---|---|
| `development` | configurables | configurable | permitido |
| `production` | forzados a `None` | forzado a `true` | rechazado (error) |

El Makefile elige el `docker-compose.*.yml` y el `.env.*` según el entorno que detecta. El servicio `api` respeta `API_ENV_FILE` para cargar el `.env.*` correcto dentro del contenedor.

---

## CI / CD

Workflows en `.github/workflows/`:

| Workflow | Disparador | Qué hace |
|---|---|---|
| `commit-lint` | PRs | Valida Conventional Commits |
| `ci` | Push a ramas ≠ `production`, y PRs | Lanza los jobs reusables de test en paralelo |
| `cd` | Push a `production` (o manual) | CI como gate → deploy SSH → health-check → notificación Discord única |
| `auto-merge` | Push a `develop` | Abre/actualiza PR `develop → production` con auto-merge |
| `test-backend` | Reusable | `ruff check` + `pytest` sobre `api/` |
| `test-frontend` | Reusable (`app: admin\|web`) | `npm ci` + `npm run lint` + `npm run build` |

En `production`, `cd` ejecuta los tests como gate del deploy: si el CI falla no se despliega. Tras el deploy SSH corre un health-check y se envía **una sola notificación a Discord** con el resultado de todo el flujo. El CI no notifica por separado.

---

## Documentación

| Documento | Descripción |
|---|---|
| [arquitectura](./docs/arquitectura.md) | Stack, estructura y diagrama |
| [router](./docs/router.md) | Registro y montaje de routers del API |
| [roles](./docs/roles.md) | Matriz de roles globales y autorización por proyecto |
| [cookies-csrf](./docs/cookies-csrf.md) | Modelo de seguridad de la sesión |
| [borradores](./docs/borradores.md) | Sistema de borradores y revision queue |
| [editor-sld](./docs/editor-sld.md) | Editor visual de simbología |
| [alembic-multi-env](./docs/alembic-multi-env.md) | Migraciones en dos BDs |
| [mapalab-api-keys](./docs/mapalab-api-keys.md) | Llaves del embed de mapalab: emisión, validación y auditoría |
| [CHANGELOG](./docs/CHANGELOG.md) | Historial de cambios |

El contexto del monorepo, el roadmap y los módulos grandes (SIEEJ, Colibrí, Identidad) viven en el
repositorio central de contexto, en `repos/mariachi/`.

---

## Licencia

[MIT](./LICENSE)
