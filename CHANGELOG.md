# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

Mientras la versión sea `0.x`, el proyecto se considera pre-producción: los cambios pueden romper compatibilidad entre versiones menores. El versionado se lleva de forma unificada para el monorepo (backend + admin + web + infra). Las versiones previas al monorepo se listan por producto al final como histórico.

---

## [Unreleased]

---

## [0.11.0] - 2026-04-22

Mariachi ahora se levanta detrás de `gateway-hub` en la red `iieg-network`. El nginx interno queda minimal: solo sirve los estáticos de `admin/` y `web/`, y hace proxy a `/api/`. Gateway-hub arriba se encarga de SSL, redirects, `robots.txt`, `sitemap.xml`, headers de seguridad y proxies a `mapalab`, `acervo` y `geoserver`.

### Agregado

- `docker-compose.yml` declara la red externa `iieg-network` y conecta los servicios `nginx` y `api` a ella (además de `mariachi_network` interna para `postgres` y `redis`).

### Cambiado

- `docker-compose.yml`: el servicio `nginx` ya no expone `80/443` al host; ahora usa `expose: 80` para ser alcanzable solo desde `iieg-network`.
- `nginx/Dockerfile`: deja de copiar `nginx/ssl/`, deja de usar `envsubst` sobre el template y arranca nginx directo. `EXPOSE 80` únicamente.
- `nginx/conf.d/mariachi.conf` simplificado a HTTP-only en `:80`:
    - Un solo `server` block.
    - `location /api/` → `mariachi_api` (sin cambios).
    - `location /administrador` → estáticos del CMS.
    - `location /` → estáticos del sitio público.
    - Eliminados: `listen 443 ssl`, redirect `80 → 443`, bloque `ssl_*`, `server_name` con placeholder, HSTS y demás headers de seguridad, `robots.txt`, `sitemap.xml`, CORS en `/api/` y los locations `/mapalab/`, `/acervo/`, `/geoserver/`. Todo eso vive ahora en gateway-hub.
- `docker-compose.yml`: removido `env_file: ./nginx/.env` del servicio nginx (ya no aplica sin template SSL).

### Removido

- `nginx/.env.example` eliminado del repo (variables `SSL_CERTIFICATE`, `SERVER_NAME`, `MAPALAB_HOST`, `GEOSERVER_HOST`, `ACERVO_HOST`, `CORS_ALLOWED_ORIGIN` ya no se consumen — gateway-hub es responsable de todo eso).
- `nginx/static/` (robots.txt, sitemap.xml) eliminado. Gateway-hub sirve esos archivos arriba.

### Notas de deploy

Para que gateway-hub alcance a mariachi en staging/prod:
- El container `mariachi-nginx` debe estar en la red Docker externa `iieg-network` (el compose ya lo declara).
- En el `.env` de gateway-hub: `PORTAL_HOST=mariachi-nginx:80`.
- La red `iieg-network` debe existir en el host (`docker network create iieg-network` si aún no).

Dev local (`docker-compose.dev.yml`) no se ve afectado: sigue usando Vite en 3010/3011 y el API en 8000.

---

## [0.10.0] - 2026-04-22

Soporte explícito para los tres entornos (development, staging, production) y CI básico en GitHub Actions.

### Agregado

- Archivos `.env.staging.example` y `.env.production.example` con los overrides específicos de cada entorno (`COOKIE_SAMESITE=strict` en prod, `COOKIE_SECURE=true` en ambos, bucket y URLs distintos).
- `Makefile` acepta `ENV=staging`; selecciona `docker-compose.yml` con `.env.staging` o `.env.production` según corresponda.
- `make setup` crea también `.env.staging` y `.env.production` a partir de sus ejemplos.
- Campo `environment: Literal["development", "staging", "production"]` en `app/core/settings.py`, leído desde `ENVIRONMENT`.
- `model_validator` en settings que en `environment == "production"` fuerza `docs_url`, `redoc_url` y `openapi_url` a `None`, fuerza `cookie_secure=True` y rechaza `"*"` en `CORS_ORIGINS`.
- Workflows CI en `.github/workflows/`:
    - `commit-lint.yml` — valida Conventional Commits en cada PR.
    - `ci.yml` — se dispara en push a ramas de feature y en PRs; lanza los 3 jobs en paralelo.
    - `test-backend.yml` (reusable) — `ruff check` + `pytest` sobre `api/`.
    - `test-frontend.yml` (reusable, parametrizado por `app`) — `npm ci` + `npm run lint` + `npm run build` sobre `admin/` o `web/`.

### Cambiado

- Variable `ENV` renombrada a `ENVIRONMENT` en los archivos `.env.*.example` (evita colisión con la variable `ENV` del Makefile).
- `docker-compose.yml`: `env_file` del servicio `api` pasa de `./.env` hardcodeado a `${API_ENV_FILE:-./.env}`, para que `make up ENV=staging` cargue `.env.staging`.
- `openapi_url` en settings pasa de `str` requerido a `str | None = None` (consistente con `docs_url`/`redoc_url`).

### Seguridad

- `.gitignore` ignora también `.env.staging`.
- En producción, los endpoints `/docs`, `/redoc` y `/openapi.json` quedan deshabilitados por defecto aunque el `.env` los defina.

### Notas

- CD queda intencionalmente fuera de esta versión: aún no hay entorno real al que desplegar. Cuando exista, agregar `cd.yml` tomando como referencia el de `mapalab`.

---

## [0.9.0] - 2026-04-22

Hardening del módulo de edición de capas: selector GeoServer dinámico, edición masiva de tags y rate limiting en memoria.

### Agregado

- **Selector GeoServer en `LayerEditDrawer`**: `workspaceAlias` y `geoserverLayer` se eligen desde listas pobladas vía `/geoserver/workspaces`; `styles` autocompletado desde `/geoserver/workspaces/{alias}/layers/{layer}/styles`. Evita errores de captura manual.
- **Edición masiva de tags**:
    - Backend: `PATCH /layers/bulk-tags` acepta `{ updates: [{id, tags}] }` (máx 500). Reporta `updated` y `not_found`.
    - Admin: `BulkTagsDrawer.jsx` parsea paste TSV desde Excel/Sheets con preview en tabla.
- **Rate limiter en memoria** (`app/api/rate_limit.py`) con sliding window per user_id:
    - `60 req/min` en writes de `/layers` y `/layer-metadata`.
    - `120 req/min` en reads de `/geoserver` (protege GeoServer REST).
    - Responde `429` con header `Retry-After`.
- `useLayerTreeAdmin` expone `listGeoserverWorkspaces`, `listGeoserverFields`, `listGeoserverStyles`, `bulkUpdateTags`.

### Cambiado

- Todos los endpoints write de `/layers` y `/layer-metadata` añaden dependencia `_write_rate_limit`.
- `/geoserver/*` añaden `_read_rate_limit`.

---

## [0.8.0] - 2026-04-22

Módulo de edición de capas (integración con MapaLab), unificación de la nomenclatura del proyecto bajo `mariachi`, migraciones Alembic multi-entorno y sanitización del repo para apertura como público.

### Agregado

#### Módulo de edición de capas (integración con MapaLab)

Mariachi expone desde el CMS un editor del árbol de capas que materializa los cambios en la base de datos de **DataEngine** (externa) y avisa al backend de mapalab para invalidar su cache. Este módulo es una integración; no se mezcla con el versionado de mapalab.

- Segunda conexión a BD vía `DATAENGINE_DATABASE_URL`, con engine lazy y dependencia `get_dataengine_db()` en `app/core/database.py`.
- Modelos SQLAlchemy para `Layer`, `Workspace`, `InitialLayerOrder`, `LayerMetadata`, `LayerStats` (sobre `DataEngineBase`).
- Rutas nuevas en `/api/administrador`:
    - `/layers/*`: CRUD de capas con validación contra GeoServer, reorder y duplicate.
    - `/layer-metadata/{layer_key}`: CRUD de metadata descriptiva.
    - `/layer-metadata/{layer_key}/stats`: CRUD de numeralia y `stats_config`.
    - `/geoserver/*`: introspección REST (workspaces, capas, campos, estilos).
- Aprobación de borradores tipo `layer` (`POST /borradores/por-id/{id}/aprobar`) que materializa el borrador en DataEngine.
- Cliente `GeoServerClient` sobre `httpx` con `GeoServerError`.
- Notificador `mapalab_notifier.notify_tree_changed()` para invalidar el cache del árbol en el backend de mapalab.
- Service `stats_templates` con resolución de templates de InfoBox.
- Scripts: `api/scripts/seed_layers.py`, `api/scripts/migrate_mapalab_card.py`.
- Tests: `api/tests/test_layer_service.py`.
- CMS: página `MapalabLayers` con árbol Ant Design + drag & drop y drawer de edición (`admin/src/components/layersEditor/LayerEditDrawer.jsx`) + hook `useLayerTreeAdmin`.
- Reestructuración del menú lateral del admin en dos grupos: **Portalito** y **Mapalab**.

#### Infraestructura

- **Alembic multi-environment**: migraciones separadas por BD (`-x db=mariachi|dataengine`, `version_table` distinta por entorno). Las versiones viejas se reubicaron en `alembic/versions/mariachi/` y se agregó `alembic/versions/dataengine/`.
- Variables nuevas: `DATAENGINE_DATABASE_URL`, `DATAENGINE_POOL_SIZE`, `DATAENGINE_MAX_OVERFLOW`, `GEOSERVER_URL`, `GEOSERVER_USER`, `GEOSERVER_PASSWORD`, `GEOSERVER_TIMEOUT`, `MAPALAB_BACKEND_URL`.
- `httpx>=0.26,<0.28` promovido a dependencia de runtime.
- Scripts utilitarios en `scripts/`:
    - `migrate-acervo-bucket.sh` — migra bucket `portal-dev` → `mariachi-dev` vía `mc`.
    - `rename-github-repo.sh` — actualiza el remote local tras renombrar el repo en GitHub.
- Documentación: `docs/DATAENGINE_CREDENTIALS.md`, `docs/ALEMBIC_MULTI_ENV.md`, `docs/context.md`.

### Cambiado

- Nomenclatura interna del proyecto: `portal*` → `mariachi*` (containers, redes, upstream nginx, template `portal.conf` → `mariachi.conf`, paquetes `backend-portal` → `mariachi-api`, `admin-portal` → `mariachi-admin`, `web-portal` → `portal-web`).
- Branding del sidebar del admin actualizado a `Mariachi` / `MA`.
- `COOKIE_DOMAIN` configurable para compartir sesión con `/mapalab/*`.

### Seguridad

- `COOKIE_DOMAIN` en `.env.example` pasa de dominio real hardcodeado a placeholder genérico.
- `docs/context.md` y `docs/DATAENGINE_CREDENTIALS.md` sanitizados: se remueven dominios reales de producción, IPs internas, rutas absolutas locales y nombres de servicios vecinos internos.
- `scripts/rename-github-repo.sh`: owner/repo parametrizados por variables de entorno.

---

## [0.7.0] - 2026-03-05

### Agregado

- Revamp de la documentación de arquitectura con stacks tecnológicos detallados y diagrama actualizado.
- Headers de seguridad adicionales en nginx.

---

## [0.6.1] - 2026-02-20

### Cambiado

- `burst` del rate limit de `/geoserver/` incrementado de `20` a `50` (commit `82b3c76`).

---

## [0.6.0] - 2026-02-18

### Agregado

- Sistema de borradores y revision queue para páginas y menús; refactor de componentes de página al nuevo carrusel (commit `c0e652b`).
- Setting `ACERVO_VERIFY_SSL` para controlar la verificación del certificado del Acervo.
- Mejora en el lookup de usuario en `init_db`.

### Cambiado

- Ajustes de títulos en alertas del UI.

### Corregido

- `expected_updated_at` excluido del `model_dump` del schema de página (evita 400 al guardar) (commit `bf9dbfe`).

---

## [0.5.0] - 2026-02-17

### Agregado

- Renderizado dinámico de páginas con modelo basado en bloques (reemplaza páginas estáticas) (commit `b45f2a0`).
- `robots.txt` y `sitemap.xml` servidos desde nginx (commit `035dd5e`).
- Soporte HTTPS para Acervo: proxy nginx, generación dinámica de URLs y nuevas variables de entorno (commit `009eb14`).

### Cambiado

- Eliminación de Mock Service Worker y actualización de componentes Ant Design en `JsonEditorModal` (commit `50e8fe3`).
- Limpieza de funcionalidad no usada.

---

## [0.4.0] - 2026-02-16

### Agregado

- Sistema de borradores y publication requests; must-change-password para usuarios nuevos; refactor de object storage a Acervo (commit `8a4669d`).
- Rate limiting, security headers y timeouts reducidos en nginx; carga aislada de variables de entorno para el proxy (commit `3cc9a7f`).

### Cambiado

- Modificador `^~` en locations `/mapalab/`, `/acervo/`, `/geoserver/` para prefix matching explícito (commit `b81fd32`).

---

## [0.3.0] - 2026-02-09

### Agregado

- Sistema de notificaciones.
- Gestión de menú refactorizada con árbol ordenable y estado de visibilidad mejorado (commit `5905933`).

### Cambiado

- Ant Design: prop `direction` de `Space` renombrada a `orientation` en múltiples vistas (commit `cd5dd62`).

---

## [0.2.0] - 2026-01-27

### Agregado

- Proxy reverso Nginx con terminación SSL para acceso unificado a web, admin y API (commit `f65db8a`).
- Variables de entorno para URLs de API, timeouts y nombres de app en el build del frontend (commit `09c3027`).

### Cambiado

- Build frontend consolidado multi-stage en el Dockerfile de nginx; assets servidos directamente (commit `c19e968`).
- URLs distintas para admin y web en la configuración del API service; mejora en el redirect de login del admin (commit `7cd7f44`).
- Rename del prefijo de API `/cms` → `/administrador`; ajuste de Docker build contexts y configuración Nginx (commit `8ec6ab7`).
- Ajustes menores en `docker-compose.yml`: path del `env_file` del API y eliminación de image names explícitos para `portal-web` y `portal-admin`.

---

## [0.1.0] - 2026-01-26

Primer release del monorepo unificado.

### Agregado

- Inicialización del monorepo (commit `ac7df89`): backend FastAPI (`api/`) + sitio público (`web/`) + CMS (`admin/`) + infra Docker Compose.
- History service (commit `1607dbe`).

### Cambiado

- Componentes renombrados en docs: Frontend/CMS/Backend → Web/Admin/Api.
- Eliminado el servicio MinIO local; el API se conecta a una instancia externa (Acervo) vía nuevas variables de entorno (commit `e5d3149`).

---

## Historial previo al monorepo

Antes del monorepo, el versionado se llevaba por componente. Se conserva aquí como referencia. Los números de esta sección son los originales de cada componente — no son comparables con la nueva línea `0.x` del monorepo.

### Backend

#### [1.2.0] - 2025-11-05

- **Agregado**: Schemas `FolderCreate` y `FolderResponse` para validación y respuestas de carpetas de media.
- **Cambiado**: `POST /media/folders` acepta JSON body.
- **Corregido**: Error 422 al crear carpetas desde el CMS.

#### [1.1.0] - 2025-11-05

- **Agregado**: Cookies httpOnly para tokens JWT, tokens CSRF firmados con JWT, middleware `verify_csrf()`, documento `COOKIES_CSRF.md`.
- **Cambiado**: Login establece cookie httpOnly; todos los endpoints mutables requieren CSRF.

#### [1.0.0] - 2024-11-04

- Autenticación OAuth2 + JWT, gestión de usuarios con roles (`tetlamamakani`, `editora`, `diseñadora`), páginas dinámicas con secciones y componentes, gestión de menú jerárquico, integración MinIO/S3, layouts configurables, historial de acciones, búsqueda global, Docker Compose con PostgreSQL, Redis y MinIO.

### Frontend (`web/`)

#### [0.0.2] - 2025-11-05

- **Agregado**: Servicios `layoutService`, `menuService`, `pageService`, `styleService`; header personalizable; menú dinámico.
- **Cambiado**: Refactor a servicios por dominio; `GlobalProvider` con carga paralela.

#### [0.0.1] - 2025-09-15

- Inicialización del proyecto: React + Vite + Tailwind.

### CMS (`admin/`)

#### [0.0.4] - 2025-11-05

- **Agregado**: `MediaSelector`, `HeaderLayoutForm`, `FooterLayoutForm`; header personalizable.
- **Cambiado**: `Layouts.jsx` refactorizada (-79% líneas).

#### [0.0.3] - 2025-11-05

- **Agregado**: Soporte para cookies httpOnly; interceptor Axios para CSRF.
- **Cambiado**: Migración de `localStorage` a `sessionStorage` para CSRF.

#### [0.0.2] - 2025-10-28

- **Cambiado**: Migración de Tailwind CSS 4 a Ant Design 5.

#### [0.0.1] - 2025-10-28

- Inicialización del CMS: React 19 + Vite 7 + Ant Design 5.
