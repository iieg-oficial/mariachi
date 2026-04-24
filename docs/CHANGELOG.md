# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

Mientras la versión sea `0.x`, el proyecto se considera pre-producción: los cambios pueden romper compatibilidad entre versiones menores. El versionado se lleva de forma unificada para el monorepo (backend + admin + web + infra). Las versiones previas al monorepo se listan por producto al final como histórico.

---

## [Unreleased]

---

## [0.15.0] - 2026-04-24

Reestructura del admin a **feature-sliced architecture** (sin cambios de lógica ni de UI). Preparación para el refactor multi-proyecto (Portalito, MapaLab, SIEEJ) y multi-bucket. Este release es puramente arquitectónico: misma funcionalidad, organización escalable.

### Cambiado

- **`admin/src/` reorganizado en tres zonas**:
    - `app/` — shell de la aplicación: `MainLayout`, `guards/` (`ProtectedRoute`, `RoleProtectedRoute`, `ErrorBoundary`), `providers/MainProvider`.
    - `shared/` — reutilizable entre features: `contexts/AuthContext`, `hooks/useIsMobile`, `services/api`. Se mantiene mínimo a propósito; los componentes solo se promueven a `shared/` cuando se repiten en 3+ features.
    - `features/<nombre>/` — módulos autocontenidos con convención `pages/`, `components/`, `hooks/`, `api/`, `constants/`, `utils/` según aplique, y un barrel `index.js` como API pública.
- **Features de plataforma** (compartidos entre proyectos): `features/auth/`, `features/users/`, `features/media/`, `features/revision/`.
- **Features de proyecto** (con prefijo explícito): `features/portal-pages/`, `features/portal-menu/`, `features/mapalab-layers/`. Prefijo por proyecto para que `git grep` identifique a qué pertenece cada módulo.
- **Renames**:
    - `admin/src/pages/MapalabLayers.jsx` → `admin/src/features/mapalab-layers/pages/LayersPage.jsx`.
    - `admin/src/pages/PageEditor.jsx` → `admin/src/features/portal-pages/pages/PageEditorPage.jsx`.
    - `admin/src/pages/MenuManager.jsx` → `admin/src/features/portal-menu/pages/MenuManagerPage.jsx`.
    - `admin/src/pages/Users.jsx` → `admin/src/features/users/pages/UsersPage.jsx`.
    - `admin/src/pages/Media.jsx` → `admin/src/features/media/pages/MediaPage.jsx`.
    - `admin/src/pages/RevisionQueue.jsx` → `admin/src/features/revision/pages/RevisionQueuePage.jsx`.
    - `admin/src/pages/Login.jsx` → `admin/src/features/auth/pages/LoginPage.jsx`.
    - `admin/src/pages/ChangePassword.jsx` → `admin/src/features/auth/pages/ChangePasswordPage.jsx`.
- **Aliases de Vite simplificados** en `admin/vite.config.js`: se reemplazan los 10 aliases granulares (`@components`, `@pages`, `@providers`, `@utils`, `@hooks`, `@services`, `@contexts`, `@constants`, `@layouts`) por tres semánticos: `@app`, `@features`, `@shared` (más `@` y `@assets` existentes).
- **Imports actualizados** en toda la codebase del admin siguiendo el nuevo layout. Los archivos se movieron con `git mv` para preservar la historia.

### Reglas de arquitectura introducidas

- Features de proyecto (`portal-*`, `mapalab-*`, `sieej-*`) **no importan entre sí**.
- Features de proyecto **pueden consumir** features de plataforma (`users`, `media`, `revision`) vía sus barrels (ej: `import { FilePicker } from '@features/media'`).
- `shared/` nunca importa de `features/`.
- `app/` puede importar de `features/` solo para registrar rutas y el sider (el entry point es `main.jsx` y eventualmente `app/routes.jsx`).

### Notas

- Sin cambios de comportamiento runtime. Tests y linter pasan. El build genera chunks por feature gracias a los `lazy()` desde barrels.
- Siguiente paso: backend multi-proyecto (PR 1 del plan) — tablas `projects`, `user_projects`, `media_buckets`, endpoints y seeds.

---

## [0.14.0] - 2026-04-24

Homologación de configuraciones, tooling, stack frontend/backend y estilo de documentación con mapalab (referencia más madura del ecosistema IIEG). Reorganización del stack dev para imágenes Docker nombradas y arranque rápido; observabilidad Sentry end-to-end; nginx interno purgado de limitaciones (gateway-hub es el único rate limiter y productor de security headers); documentación uniformada en tono, acentos, diagramas y frontmatter.

### Agregado

#### Infraestructura y orquestación

- `api/Dockerfile` multi-stage con targets `development` (instala `.[dev]`) y `production` (solo runtime), BuildKit cache mount sobre `pip`.
- `admin/Dockerfile.dev` y `web/Dockerfile.dev` — imágenes propias con `npm install` bakeado; arranque instantáneo en lugar de reinstalar deps en cada `up`.
- `.dockerignore` por servicio en `api/`, `admin/` y `web/` (raíz global eliminado).
- `docker-compose.dev.yml`: imágenes nombradas uniformemente (`mariachi-api-dev`, `mariachi-admin-dev`, `mariachi-web-dev`, `mariachi-postgres-dev`, `mariachi-redis-dev`) vía `build` + `image`; postgres/redis usan `build.dockerfile_inline` para taggear sin archivo extra.
- `Makefile`: export de `UID`/`GID` al compose (ownership correcto en volúmenes montados), targets `setup-hooks` (`git config core.hooksPath .githooks`) y `ensure-networks` (crea `iieg-network` si no existe).

#### CI/CD

- `.github/workflows/auto-merge.yml` nuevo — on push a `develop`, corre backend + admin + web y abre/actualiza PR `develop → main` con auto-merge si pasa.
- `test-frontend.yml` enriquecido con `npm test --if-present` y `npm run check:dead-code:strict --if-present` (corren cuando los scripts existan en el `package.json`).

#### Frontend (admin y web)

- `eslint-plugin-jsx-a11y` integrado para cobertura de accesibilidad.
- Regla `no-restricted-imports` que bloquea imports `.png` — forzar WebP/SVG por performance.
- `rollup-plugin-visualizer` para análisis de bundle (`dist/stats.html`).
- Vendor splitting con `manualChunks` en admin (`react-vendor`, `antd`, `dnd-kit`, `sentry`) y en web (`react-vendor`, `sentry`).
- `@sentry/react` + `@sentry/vite-plugin` con guard por `VITE_SENTRY_DSN` (no-op si vacío).
- `lint-staged` con `eslint --max-warnings=0` para pre-commit.
- Scripts npm nuevos: `test`, `test:ui`, `test:coverage`, `check:dead-code`, `check:dead-code:strict`, `prepare` (bootstrap de git hooks).
- DevDeps para testing: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@testing-library/{dom,jest-dom,react}`, `happy-dom`, `knip`.

#### Backend

- `sentry-sdk[fastapi]` inicializado en `app/main.py` condicional por `settings.sentry_dsn`.
- `coloredlogs` y `rich` para DX.
- Campos `sentry_dsn` y `sentry_traces_sample_rate` en `core/settings.py`.

#### Nginx interno

- Nueva location `/api/administrador/media/` con `proxy_read_timeout 600s`, `proxy_buffering off`, `proxy_request_buffering off` — endpoint dedicado para uploads grandes al Acervo sin timeouts cortos.
- Optimizaciones: `keepalive 32` en upstream, `worker_connections 2048`, `proxy_buffering` + buffers (16k/32k), `open_file_cache`, `reset_timedout_connection`.

#### Variables de entorno

- Bloque Sentry en `.env.example`, `.env.development.example`, `.env.staging.example`, `.env.production.example`: `VITE_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- `docker-compose.yml` y `docker-compose.dev.yml`: pasan `SENTRY_DSN` y `SENTRY_TRACES_SAMPLE_RATE` al api; `nginx/Dockerfile` recibe `VITE_SENTRY_DSN` + tokens de auth como build args para ambos builders (`web-builder` y `admin-builder`).

### Cambiado

- **Frontend bumps a paridad con mapalab**:
    - React `19.2.4` → `19.2.5`
    - React Router `7.13.0` → `7.14.2`
    - Vite `7.3.1` → `7.3.2`
    - ESLint `9.39.2` → `10.2.1` (major)
    - `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` actualizados.
- **Backend runtime Python**: `requires-python>=3.12` (antes `>=3.10`). `ruff target-version = "py312"` y `mypy python_version = "3.12"` (coinciden con el Docker runtime real).
- **Nginx interno — eliminadas todas las limitaciones** (gateway-hub las aplica upstream):
    - `limit_req_zone` y `limit_req` removidos.
    - `server_tokens off` removido (gateway lo oculta).
    - `client_max_body_size` global puesto a `0` (ilimitado local; gateway limita).
    - Timeouts `/api/` diferenciados: `connect 10s / send 120s / read 120s` (antes `60s` en todo).
- **Docker**:
    - `docker-compose.yml`: servicio `api` con `build.target: production`.
    - `docker-compose.dev.yml`: servicios `web` y `admin` con `build` + `image` dedicados (antes usaban `image: node:24-alpine` y ejecutaban `npm install` inline en cada `up`).
- `docs/CONTRIBUTING.md`: paths obsoletos `backend/`, `frontend/`, `cms/` corregidos a `api/`, `web/`, `admin/`; branding "Portal IIEG" → "Mariachi".
- `docs/PENDIENTES.md`: `cd.yml` registrado en el roadmap de v1.0-beta como pendiente (SSH deploy + health-check + notificaciones Discord; referencia `mapalab/.github/workflows/cd.yml`).

### Corregido

- `api/pyproject.toml`: agregado `[tool.setuptools.packages.find] include = ["app*"]` — `pip install -e .` fallaba con "Multiple top-level packages discovered: app, alembic" al correr el Dockerfile multi-stage.
- `admin/package.json` y `web/package.json`: eliminado `eslint-plugin-react@7.37.5` — peer dep incompatible con ESLint 10 (pedía `eslint@<=9.7`); no se usaba en `eslint.config.js`.
- `docs/DATAENGINE_CREDENTIALS.md`: `SELECT version()` (falso positivo del sweep de acentos — es una función SQL, no prosa).
- `docs/CHANGELOG.md`: `text/plain; version=0.0.4` (idem — es un parámetro de content-type).

### Removido

- `eslint-plugin-react` de admin y web (incompatible con ESLint 10 y sin uso en el config).
- `.dockerignore` en la raíz (reemplazado por uno por servicio).
- Rate limit en memoria en nginx interno — gateway-hub es el rate limiter autoritativo del stack IIEG. El rate limit en memoria del api/app (`app/api/rate_limit.py`) queda como defensa en profundidad.
- Security headers en nginx interno — gateway-hub ya inyecta HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, COOP, X-Permitted-Cross-Domain-Policies, CSP. Duplicarlos solo causa drift.

### Documentación

Estilo homologado con mapalab (referencia más madura):

- Emojis eliminados de headings y tablas en todos los docs.
- Numeración `## N.` removida de `context.md` y `DATAENGINE_CREDENTIALS.md`.
- Acentos consistentes en 11 docs + README (sweep de ~60 términos: `configuración`, `migración`, `documentación`, `específico`, `también`, `después`, `automáticamente`, `política`, `topología`, `versión`, etc.).
- Frontmatter estandarizado en 5 docs principales (`context.md`, `ARCHITECTURE.md`, `ALEMBIC_MULTI_ENV.md`, `DATAENGINE_CREDENTIALS.md`, `COOKIES_CSRF.md`): bloque `> resumen` + línea `**Versión:** 0.14.0 · **Última actualización:** 2026-04-24`.
- Diagrama ASCII de arquitectura en `docs/COOKIES_CSRF.md` migrado a Mermaid `sequenceDiagram`.

### Dependencias

- Requiere **Python 3.12+** en el entorno del backend (antes 3.10+).
- Frontend requiere Node 20+ en CI/CD (no cambió, pero vale mencionar).

---

## [0.13.0] - 2026-04-23

Admin CMS responsive en mobile con paleta de marca de MapaLab, login minimalista, conectividad end-to-end con mapalab + DataEngine en dev, y migraciones de deprecaciones AntD 6.

### Agregado

#### Admin responsive + rebrand
- `admin/src/hooks/useIsMobile.js` — wrapper de `Grid.useBreakpoint` (`isMobile = !screens.md`). Patron uniforme para 12 paginas/componentes que ahora se adaptan a mobile.
- `MainLayout`: `Sider` se reemplaza por `Drawer` lateral en mobile (`<md`); `Header` con padding reducido y nombre de usuario oculto, solo avatar.
- `index.css`: tweaks globales de mobile (padding de Card/Layout, `ant-modal` al ancho del viewport, `ant-drawer-content-wrapper` max 100vw, `ant-card-head-wrapper` apilado, `img { max-width: 100% }`).
- Paginas con breakpoint: `Users`, `Media`, `RevisionQueue`, `MenuManager`, `MapalabLayers`, `PageEditor`, `ChangePassword`. Headers apilan en mobile, tablas con `scroll: { x: 'max-content' }` y `pagination.simple`, botones `block` en mobile, acciones icon-only.
- Drawers y modales responsive: `LayerEditDrawer` y `BulkTagsDrawer` pasan a `placement="bottom"` + `height: 92%` en mobile; Modales de menu, publish, rechazo, preview, upload y edit con `width: '100%'` centered.
- **Paleta de marca de MapaLab** aplicada al tema global del admin (`admin/src/providers/MainProvider.jsx`): `colorPrimary` = `#2e4372` (numeralia), `colorWarning` = `#FF8300` (orange), `Menu` dark con seleccionado en `#5C2472` (purple), trigger del sider en purple. Constantes exportadas como `BRAND`.
- **Login minimalista**: sin gradiente pesado ni Card con sombra; inputs `variant="filled"`; barrita de marca con gradiente de los 3 colores de MapaLab. Titulo "Mariachi", subtitulo compacto. Responsive nativo.

#### Conectividad dev
- `admin/vite.config.js`: nuevo proxy `server.proxy['/mapalab']` apuntando a `mapalab-dev-frontend-1:3006`. `headers.host = 'localhost'` para saltar `allowedHosts` de Vite 7 del mapalab. Env var `VITE_MAPALAB_PROXY_URL`.
- `docker-compose.dev.yml`: servicio `admin` se conecta a `mapalab-network` (external). Servicio `api` se conecta a `dataengine-network` (external). `extra_hosts: host.docker.internal:host-gateway` en `api` para alcanzar el backend de mapalab que corre en `network_mode: host`.
- **`MAPALAB_BACKEND_URL`** en `.env.development` y `.env.development.example` (`http://host.docker.internal:8001` en dev). Sin esta var, `mapalab_notifier` hace early return y `mapalab.layer_tree_cache` nunca se invalida — el editor "no aplica" los cambios.
- **`DATAENGINE_DATABASE_URL`** completada en `.env.development` apuntando a `dataengine-primary:5432/iieg_gis` por nombre de contenedor. Password del rol `mariachi_layers` regenerada (el rol ya existia provisionado via `mapalab-dataengine`).

#### Retry previo (venia de [No publicado])
- `mapalab_notifier`: retry con backoff exponencial (3 intentos, delays 0.5s y 1s) al invocar `POST /layers/refresh-cache` en mapalab. Tras agotar reintentos incrementa el counter `mariachi_tree_notify_failed_total` (expuesto en `/metrics`) y loguea `ERROR` para alerta en Loki.

### Cambiado

- **`ConfigProvider` envuelve ahora un `<App>` de AntD** (`MainProvider.jsx`) para que `message.*` y `Modal.confirm/info/...` puedan consumir tema. Callers siguen usando la API estática — migrar a `App.useApp()` queda como deuda (16 archivos).
- **Migraciones de deprecaciones AntD v6**:
    - `Alert.message` → `Alert.title` (15 ocurrencias en 9 archivos: Login, ChangePassword, MapalabLayers, InfoBoxJsonEditor, BulkTagsDrawer, MenuItemModal, PublishChangesModal, SEOAnalyzer, SEOEditor).
    - `Drawer.width/height` → `styles.wrapper` (`MainLayout`, `LayerEditDrawer`, `BulkTagsDrawer`, `PageEditor`).
    - `<Collapse.Panel>` children → `items` prop (`LayerEditDrawer`).
    - `<Spin tip>` standalone → `<Spin>` con texto debajo (`main.jsx`, `MapalabLayers.jsx`).
- **Política de ownership del schema `mapalab.*`**: las migraciones con `-x db=dataengine` son la fuente autoritativa. `mapalab-dataengine/jobs/bootstrap/v14_schema.sql` queda frozen como baseline. Cambios futuros de schema viven unicamente en `alembic/versions/dataengine/`.
- `docs/context.md`: actualizado PostgreSQL a 18 (prod y dev) — el README previo decía 16 en prod, drift de documentación resuelto.

### Corregido

- **Cache de `layer_tree_cache` no se invalidaba** tras cada CRUD en mariachi (los cambios del editor no aparecian hasta el cron diario). Root cause: `MAPALAB_BACKEND_URL` vacío en dev. Fix arriba en "Agregado / Conectividad dev".
- **500 + CORS aparente al editar capa**: no era CORS sino que el API explotaba con `RuntimeError: DATAENGINE_DATABASE_URL no esta configurado`, lo que impedia los headers CORS. Fix: URL completada + red `dataengine-network` + GRANTs sobre tablas preexistentes (automatizado en `mapalab-dataengine` v1.6.0 — paso 3b de `bootstrap-v14.sh`).
- `tests/test_integration_notify.py`: patch pattern `httpx.Client` recursivo arreglado. 4 tests pre-existentes que fallaban ahora pasan. Agregados 2 tests nuevos (`test_notifier_retries_on_failure`, `test_notifier_succeeds_on_retry`).

### Documentación

- `docs/context.md`:
    - §5 nueva tabla "Topología por entorno" (dev/staging/prod): cómo se alcanzan los vecinos (mapalab, dataengine, acervo, geoserver) — dev/staging via redes docker compartidas, prod via hostname/DNS + gateway-hub. Implicacion: el proxy `/mapalab` del Vite solo se usa en dev.
    - §14 changelog con entries de 2026-04-23.
- `docs/DATAENGINE_CREDENTIALS.md` §3.1: documenta que los GRANTs sobre `mapalab.*` cuando las tablas las crea otro rol se aplican automáticamente en el paso 3b de `bootstrap-v14.sh` de `mapalab-dataengine`. Ya no hay runbook manual.
- `README.md`: agregada linea de versión (`**Versión:** 0.12.0`), actualizada a 0.13.0.
- `docs/ALEMBIC_MULTI_ENV.md`: documentada la política de ownership del schema `mapalab.*`.

### Dependencias

Requiere `mapalab-dataengine >= 1.6.0` en prod para que el paso 3b aplique los GRANTs automáticamente. Sin esa versión, re-aplicar los GRANTs manualmente (ver `DATAENGINE_CREDENTIALS.md` §3.1).

---

## [0.12.0] - 2026-04-22

Editor de capas avanzado (drag & drop, preview InfoBox, editor JSON custom, formularios por preset), endpoint `/metrics` Prometheus y code-split del admin.

### Agregado

- **Drag & drop de reorden** en `MapalabLayers.jsx` vía `Tree.draggable`. Solo admin, solo siblings con mismo padre. Usa `PATCH /layers/reorder`.
- **`BulkTagsDrawer`** del release anterior ahora visible solo para admin desde el extra del card.
- **Editor InfoBox enriquecido** en `LayerEditDrawer.jsx`:
    - `InfoBoxPresetForm.jsx` renderiza campos específicos por preset (`municipio`, `punto`, `punto_municipio`, `punto_ubicacion`, `punto_completo`).
    - `InfoBoxPreview.jsx` muestra preview con datos dummy (badges de municipio/característica, listas, iconText, stats, texto).
    - `InfoBoxJsonEditor.jsx` para preset `custom` (textarea monospace con validación JSON en vivo; `key={layer.id}` para evitar contaminación entre capas).
    - Form incluye `infoboxParams` (dict) e `infoboxConfig` (JSON custom).
- **Endpoint `/metrics`** en `app/api/metrics.py` (formato Prometheus plain text). Contadores:
    - `mariachi_rate_limit_hits_total` — incrementado en `app/api/rate_limit.py`.
    - `mariachi_tree_notify_total` — incrementado en `app/services/mapalab_notifier.py`.
    - `mariachi_geoserver_calls_total` — incrementado en los 3 endpoints de `routes/geoserver.py`.
    - Sin dependencias nuevas: `defaultdict[str, int]` + `threading.Lock`.
- **Code-split del admin** en `src/main.jsx`: `React.lazy()` + `Suspense` para `Users`, `MenuManager`, `PageEditor`, `Media`, `RevisionQueue`, `MapalabLayers`. Chunks separados por página (`MapalabLayers` ~43 kB, ~15 kB gzip). Bundle inicial no carga tree ni editor rico.
- **Tests integración cruzada** (`tests/test_integration_notify.py`):
    - Notifier skip cuando `mapalab_backend_url` vacío.
    - Notifier POST a `/layers/refresh-cache` con URL correcta (mock via `httpx.MockTransport`).
    - Debounce consolida 5 llamadas en 1 single hit.
    - `/metrics` devuelve `text/plain; version=0.0.4`.
    - `incr()` thread-safe (10 threads × 1000 incrementos == 10_000 final).

### Cambiado

- `useLayerTreeAdmin` expone `reorderLayers(parentId, orderedIds)` además de los hooks previos.
- `LayerEditDrawer` usa `Form.useWatch` en 5 campos (workspaceAlias, geoserverLayer, infoboxTemplate, infoboxParams, infoboxConfig) — elimina todo state paralelo.

### Integración huachicol

- `MARIACHI_BACKEND_TARGET` agregado a `scripts/generate-targets.sh` y `.env.example` del stack de monitoreo. Prometheus (file_sd) detecta el target en ~30s tras `make targets`.

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
