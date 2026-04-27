# Mariachi

**Versión:** 0.30.11 ([changelog](docs/CHANGELOG.md))

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

En producción y staging se levanta detrás del `gateway-hub` externo (termina SSL, sirve robots/sitemap y headers de seguridad). El `nginx/` interno de este repo queda minimal — sirve los estáticos del `admin/` y hace proxy a `/api/`.

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

### Staging y producción

Ambos corren detrás de `gateway-hub` en la red Docker externa `iieg-network`.

```bash
# Una vez, si la red no existe:
docker network create iieg-network

# Staging
make up ENV=staging       # usa .env.staging + docker-compose.yml

# Producción
make up ENV=prod          # usa .env.production + docker-compose.yml
```

En el `.env` de `gateway-hub`: `PORTAL_HOST=mariachi-nginx:80`.

---

## Comandos (Makefile)

`make <comando> [ENV=dev|staging|prod]` (por defecto `ENV=dev`).

| Comando | Descripción |
|---|---|
| `make up` | Levanta el entorno en segundo plano |
| `make build` | Reconstruye imágenes y levanta |
| `make down` | Detiene contenedores |
| `make logs` | Sigue logs en vivo |
| `make restart` | Reinicia |
| `make clean` | Borra contenedores, redes y volúmenes del entorno |
| `make shell-api` | Shell dentro del contenedor API |
| `make shell-admin` / `shell-web` | Shell dentro del contenedor admin / web |
| `make setup` | Crea `.env.development`, `.env.staging` y `.env.production` desde los `.example` |

---

## Entornos

El comportamiento del backend se bifurca por la variable `ENVIRONMENT` (leída en `api/app/core/settings.py`):

| `ENVIRONMENT` | `docs_url` / `redoc_url` / `openapi_url` | `cookie_secure` | `CORS_ORIGINS` con `*` |
|---|---|---|---|
| `development` | configurables | configurable | permitido |
| `staging` | configurables | configurable | permitido |
| `production` | forzados a `None` | forzado a `true` | rechazado (error) |

El Makefile elige el `docker-compose.*.yml` y el `.env.*` según `ENV`. El servicio `api` respeta `API_ENV_FILE` para cargar el `.env.*` correcto dentro del contenedor.

---

## CI

Workflows en `.github/workflows/`:

| Workflow | Disparador | Qué hace |
|---|---|---|
| `commit-lint` | PRs | Valida Conventional Commits |
| `ci` | Push a ramas ≠ `develop`/`main`, y PRs | Lanza los 3 jobs reusables en paralelo |
| `test-backend` | Reusable | `ruff check` + `pytest` sobre `api/` |
| `test-frontend` | Reusable (`app: admin\|web`) | `npm ci` + `npm run lint` + `npm run build` |

CD queda pendiente hasta que exista un entorno staging activo.

---

## Documentación

| Documento | Descripción |
|---|---|
| [context](./docs/context.md) | Referencia completa del monorepo |
| [ARCHITECTURE](./docs/ARCHITECTURE.md) | Stack, estructura y diagrama |
| [DATAENGINE_CREDENTIALS](./docs/DATAENGINE_CREDENTIALS.md) | Provisioning del rol para DataEngine |
| [ALEMBIC_MULTI_ENV](./docs/ALEMBIC_MULTI_ENV.md) | Migraciones en dos BDs |
| [COOKIES_CSRF](./docs/COOKIES_CSRF.md) | Modelo de seguridad |
| [DRAFTS](./docs/DRAFTS.md) | Sistema de borradores y revision queue |
| [PENDIENTES](./docs/PENDIENTES.md) | Roadmap |
| [CHANGELOG](./CHANGELOG.md) | Historial de cambios |

---

## Licencia

[MIT](./LICENSE)
