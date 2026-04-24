# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

Mientras la versión sea `0.x`, el proyecto se considera pre-producción: los cambios pueden romper compatibilidad entre versiones menores. El versionado se lleva de forma unificada para el monorepo (backend + admin + web + infra). Las versiones previas al monorepo se listan por producto al final como histórico.

---

## [Unreleased]

---

## [0.21.0] - 2026-04-24

**Breaking UI path:** el admin se sirve ahora bajo `/mariachi/` en vez de `/administrador/`, alineando con la convención del `gateway-hub` (`^~ /mariachi/` ya estaba reservado).

### Cambiado

- `admin/vite.config.js`: `base: '/mariachi/'` (antes `/administrador/`).
- `admin/src/main.jsx`: `basename: '/mariachi'`.
- `admin/src/shared/services/api.js`: redirect al login tras 401 apunta a `/mariachi/login`.
- `nginx/conf.d/mariachi.conf`:
    - Nueva `location /mariachi` con alias a `/usr/share/nginx/html/mariachi` y SPA fallback.
    - `location /administrador` ahora devuelve `301 /mariachi$request_uri` (bookmarks viejos siguen funcionando, pero con redirect permanente).
    - `location = /` redirige a `/mariachi/` (antes a `/administrador/`).
- `nginx/Dockerfile`: `COPY --from=admin-builder /app/dist /usr/share/nginx/html/mariachi`.
- `docs/context.md`, `docs/ARCHITECTURE.md`, `README.md`: menciones visibles del path actualizadas a `/mariachi/`.

### Notas

- El prefijo de **API** sigue siendo `/api/administrador/*` (no se toca en este release). Los requests del admin pegan a ese path absoluto y el gateway los rutea correctamente. Cambiar el API prefix es un refactor separado que implica actualizar también el gateway-hub (todavía rutea `/api/*` al upstream que termina en mariachi).
- En producción el `gateway-hub` ya tiene `location ^~ /mariachi/` apuntando al upstream `mariachi`; este release hace que ese path funcione.
- El redirect `301 /administrador → /mariachi` mantiene compatibilidad para links viejos.

---

## [0.20.1] - 2026-04-24

Deuda técnica pendiente del refactor multi-proyecto: migración a Alembic como fuente autoritativa del schema, viewer-por-proyecto blindado a nivel write, y limpieza del drawer legacy.

### Cambiado

- **`api/scripts/init_db.py`** ya no hace `Base.metadata.create_all`. Ahora corre `alembic -x db=mariachi upgrade mariachi@head` vía `subprocess` y, si `DATAENGINE_DATABASE_URL` está presente, también `alembic -x db=dataengine upgrade dataengine@head`. Alembic queda como fuente autoritativa del schema; el hack manual de `alembic stamp` ya no es necesario al resetear una BD de dev.
- **Viewer por proyecto blindado en writes:**
    - `/paginas` (PUT, DELETE) y `/elementos-menu` (POST, PUT, DELETE) añaden guard `_require_editor = require_project_access("portal", min_role="editor")`.
    - `/layer-metadata` (PUT) y `/geoserver/*` usan `_require_project_editor = require_project_access("mapalab", min_role="editor")` (antes era `require_role`, no validaba membership por proyecto).
    - Admin global (`tetlamamakani`) sigue con bypass.
    - Efecto: un usuario con rol global `editora` + `project_role = viewer` en portal/mapalab ya **no puede escribir** en esos módulos, solo leer. El preview-only que pediste funciona en serio.

### Removido

- `admin/src/features/mapalab-layers/components/layersEditor/LayerEditDrawer.jsx` (291 líneas) — código legacy que ya no se importaba desde ningún lugar tras el PR 0.19.0 (split view).

---

## [0.20.0] - 2026-04-24

**Breaking:** el portal público (`web/`) se extrae a su propio repo (`iieg/portal`) con historia preservada vía `git subtree split`. Mariachi queda como panel de administración + API; cada proyecto del ecosistema vive en su propio repo.

### Removido

- Carpeta `web/` completa — ahora en `../portal` como repo independiente.
- Servicio `web` de `docker-compose.dev.yml` + volumen `web_node_modules`.
- Stage `web-builder` de `nginx/Dockerfile`.
- `location /` en `nginx/conf.d/mariachi.conf` (reemplazado por redirect 302 a `/administrador/`).
- Build args de nginx: `VITE_WEB_API_URL`, `VITE_API_TIMEOUT`, `VITE_APP_NAME`.
- Target `shell-web` del Makefile.
- Env vars del portal en los cuatro `.env*`: `WEB_PORT`, `VITE_WEB_PORT`, `VITE_WEB_HOST`, `VITE_APP_NAME`, `VITE_WEB_API_URL`, `VITE_API_TIMEOUT`.

### Cambiado

- `README.md`, `docs/context.md`, `docs/ARCHITECTURE.md`: mariachi se describe como repo con dos componentes (`admin/` + `api/`); remiten a `../portal` para el portal público.
- Endpoint `/api/portal/*` del backend permanece — lo consume ahora el repo `iieg/portal` desde su propio compose.
- Nginx interno: raíz redirige a `/administrador/`.

### Notas

- Split hecho con `git subtree split --prefix=web -b portal-split` + `git pull` al nuevo repo (historia preservada).
- El gateway-hub externo en staging/prod sigue ruteando `/` al portal; el cambio es interno.

---

## [0.19.0] - 2026-04-24

Edición de capas rediseñada a página dedicada con split view (árbol + editor). SIEEJ entra al sider como administrador genérico de formularios (placeholder listo para integración).

### Agregado

#### Editor de capas como página dedicada

- `features/mapalab-layers/pages/LayerEditPage.jsx` — página nueva en ruta `/mapalab/layers/:id/edit`:
    - Layout **split view**: árbol de capas (sticky, 280px) a la izquierda + editor a la derecha (ancho completo).
    - Click en cualquier capa del árbol lateral navega a su edit page sin salir del contexto.
    - **Tabs horizontales** reemplazan el Collapse del drawer: Identidad, WMS, Descarga, InfoBox, Metadatos descriptivos. Cada tab usa todo el ancho disponible.
    - Preview del InfoBox ahora se renderiza **lado a lado** con el formulario del preset (columnas xs=24 md=12).
    - Header fijo con breadcrumb `Capas / <nombre>` + tag de ID + botones de guardar.
    - URL compartible, botón atrás del browser funciona.
- Router: nueva entrada `mapalab/layers/:id/edit` en `admin/src/main.jsx`.
- `LayersPage` ahora navega a la página dedicada en el botón "Editar" (antes abría drawer modal).

#### SIEEJ — administrador de formularios (placeholder)

- Feature nuevo `features/sieej-formularios/` con `FormulariosPage`:
    - Tabla CRUD genérica con campos `slug`, `name`, `description`, `is_active`.
    - Modal para crear/editar.
    - Alert informativa de "módulo en construcción".
- Entry en `PROJECT_REGISTRY` (`sieej-config.jsx`) con item "Formularios" e icono `FormOutlined`.
- Backend stub `api/app/api/routes/formularios.py` bajo `require_project_access('sieej')`:
    - `GET /formularios` → `[]` (permite que la UI cargue).
    - `POST` / `PUT` / `DELETE` → `501 Not Implemented` con mensaje claro.
- Feature visible en el sider para admin global y para editoras/diseñadoras que tengan membership en `sieej`.

### Cambiado

- `LayersPage` eliminó el state y handlers relacionados con el drawer (`editingLayer`, `drawerOpen`, `saving`, `handleSave`). Ahora navega a la página dedicada.
- `LayerEditDrawer` permanece en el código como componente legacy pero ya no se renderiza desde ningún lugar (sin imports activos). Se eliminará cuando se valide la página en producción.

### Notas

- Al entrar a la página dedicada, el tree lateral se carga una vez al mount (hook `useLayerTreeAdmin.reload`). Cambiar de capa desde el tree lateral actualiza la URL y re-renderiza el form con la capa nueva, pero mantiene el árbol intacto — navegación instantánea.
- Para SIEEJ: cuando el backend real del módulo se implemente, la página ya tiene el shape que espera (`{id, slug, name, description, is_active}`). Solo hay que levantar los endpoints reales en `formularios.py`.

---

## [0.18.0] - 2026-04-24

Media por bucket end-to-end + edición de metadatos descriptivos de capas. Cierra el refactor multi-proyecto con funcionalidad visible. Incluye limpieza de archivos `.env*` duplicados en `api/` y normalización de los `.env*.example` con placeholders genéricos.

### Agregado

#### Backend — multi-bucket

- `AcervoClient` refactorizado: soporta un cliente por bucket vía `AcervoClient.for_bucket(bucket)` con cache por `(acervo_bucket, access_key_ref)`.
- `resolve_bucket_credentials(access_key_ref)` — resuelve `{ACERVO_*_ACCESS_KEY, ACERVO_*_SECRET_KEY}` desde env; fallback a `ACERVO_ACCESS_KEY/SECRET_KEY` globales si faltan.
- `AcervoClient.list_objects(prefix, recursive)` — lista objetos reales del bucket.
- Columna `bucket_id` en tabla `media` (FK a `media_buckets`, `ON DELETE SET NULL`). Migración `d1e2f3a4b5c6` + backfill: items existentes apuntan al bucket `portal`.
- `GET /multimedia?bucket_id=<id>` — listado filtra por bucket; `require_bucket_access` via helper `_resolve_bucket_or_403`.
- `POST /multimedia` acepta `bucket_id` en formulario; sube al bucket resuelto y persiste `bucket_id` en la fila de `media`.
- `DELETE /multimedia/{id}` — resuelve el bucket del item para borrar en MinIO + BD.
- `GET /multimedia/objetos-bucket?bucket_id=<id>&prefix=<p>` — endpoint nuevo que lista objetos **reales del bucket en MinIO**, útil para el file picker (no depende de la tabla `media`).
- `PUT /layer-metadata/{layer_key}` relajado de admin-only a editor+admin (consistente con el resto de writes sobre mapalab).

#### Frontend — Media por bucket

- `features/media/components/BucketFilePicker.jsx` — modal que lista archivos de un bucket con soporte para múltiples prefijos (tabs) + búsqueda. Al seleccionar devuelve `{nombre, enlace, url}`. Exportado como API pública del feature media.
- `features/media/api/mediaService`: nuevos `getBuckets()` y `listBucketObjects(bucketId, prefix)`. `getMediaFiles({ bucketId, ... })` ahora requiere `bucketId` explícito (no ejecuta si falta).
- `features/media/pages/MediaPage`: selector de bucket arriba de los filtros (carga al mount, selecciona el primero por default). Los listados y uploads usan el `bucketId` seleccionado.

#### Frontend — Metadatos descriptivos editables

- `features/mapalab-layers/components/layersEditor/LayerMetadataSection.jsx` — sección nueva que carga (`GET /layer-metadata/{layer_key}`) y guarda (`PUT`) metadatos:
    - `descripcion`, `frecuencia`, `fecha_ultima` como inputs simples.
    - `fuentes` y `metodologia` como `Form.List` editable (agregar/quitar entradas).
    - `metadato` (archivos adjuntos) como `Form.List` con pares `{nombre, enlace}` + botón que abre el `BucketFilePicker` apuntado al bucket `mapalab` con prefijos `metadata/txt/` y `metadata/xlsx/`.
    - Si la capa aún no tiene metadatos (404), muestra alert y crea al guardar.
- `useLayerTreeAdmin` expone `getLayerMetadata(key)` y `updateLayerMetadata(key, payload)`.
- `LayerEditDrawer` integra la sección como nueva entrada del Collapse: **"Metadatos descriptivos"**. Usa el `layer.id` como `layer_key`.

#### Variables de entorno

- `.env.development.example`, `.env.staging.example`, `.env.production.example` normalizados con placeholders genéricos: `<user>`, `<password>`, `<host>`, `<port>`, `<domain>`, `<bucket_name>`, etc. Sin IPs, hostnames o puertos hardcodeados.
- Agregadas vars `ACERVO_{PORTAL,MAPALAB,DATEENGINE}_{ACCESS,SECRET}_KEY` (placeholders vacíos) en los tres examples — fallback silencioso a las globales.

### Cambiado

- Todos los endpoints de `/multimedia` ahora operan scoped a un bucket específico. El item `Media` guarda `bucket_id` persistente.
- `AuthContext.loginUser` ya hacía hit a `/perfil` (v0.17.0); el `user` del context incluye `accessible_buckets` que el `MediaPage` y el `BucketFilePicker` consumen.

### Removido

- `.env.example` en la raíz (redundante — los 3 `.env.*.example` cubren todos los entornos).
- Duplicados residuales `api/.env.{development,staging,production}.example` — no estaban en git, eran residuos locales. Los únicos env files viven en raíz.

### Corregido

- Branding drift: `README.md`, `Makefile`, `admin/package.json` description, `admin/src/features/auth/pages/LoginPage.jsx` subtítulo, `admin/src/features/media/api/mediaService.js` `DB_NAME`, y `PROJECT_NAME` / `VITE_ADMIN_APP_NAME` en los `.env*` — eliminan referencias a "CMS" y "Portal" como nombre del proyecto (se reservan "Portal" solo para el sitio público y "Mariachi" para el panel). Afecta solo strings de UI/metadata.

### Notas

- Las credenciales específicas por bucket en producción deben definirse por el equipo de Acervo (user dedicado por bucket). En dev local siguen usando la root credential via fallback.
- El `BucketFilePicker` solo navega objetos reales del bucket; aún no permite subir archivos desde el drawer de capa. Upload viene en un PR posterior si se requiere (hoy se sube desde Media y se referencia el path aquí).

---

## [0.17.0] - 2026-04-24

Sider dinámico con grupo "Plataforma" arriba + grupos por proyecto; form de Usuarios con asignación de proyectos y rol por proyecto; `require_project_access` aplicado a los endpoints de dominio existentes. Primer release con cambios visuales del refactor multi-proyecto.

### Agregado

#### Frontend

- `admin/src/app/sider-config.jsx` — config declarativa del sider: `PLATFORM_ITEMS` (Usuarios, Media, Revisiones con filtro por rol global) y `PROJECT_REGISTRY` (portal → Menú + Páginas; mapalab → Capas; sieej → placeholder). `buildSiderItems(user)` construye los items del Menu AntD desde la config + perfil. Agregar un nuevo proyecto = agregar entry a `PROJECT_REGISTRY`, sin tocar `MainLayout`.
- `MainLayout.jsx` ahora renderiza el sider desde `buildSiderItems`. Primer grupo "Plataforma" (siempre que el usuario tenga rol global con al menos un item), luego un grupo por proyecto al que tenga membresía (admin global ve todos los proyectos registrados). Badge de pendientes en "Revisiones" portado a la config.
- `UsersPage` — form con sección "Proyectos y roles" cuando `role=editora`: un checkbox + select (Editor / Viewer) por proyecto disponible. Hidden para `tetlamamakani` con nota informativa de acceso global. Columna nueva en la tabla que muestra las asignaciones como tags.

#### Backend

- `UsuarioCreate` y `UsuarioUpdate` aceptan `project_assignments: list[UserProjectAssignment] | None`. `POST /usuarios` y `PUT /usuarios/{id}` crean/reemplazan membresías en la misma transacción (atómico).
- `UsuarioResponse` ahora incluye `projects: list[UserProjectMembership]` — `GET /usuarios` y `GET /usuarios/{id}` devuelven las asignaciones.
- `AuthContext.loginUser` hace un hit extra a `/autenticacion/perfil` tras el login para poblar `projects` + `accessible_buckets` en el `user` del context (antes solo traía datos básicos).

### Cambiado

- `/paginas` y `/elementos-menu` ahora requieren `require_project_access("portal")` a nivel de router.
- `/layers`, `/layer-metadata`, `/geoserver` ahora requieren `require_project_access("mapalab")` a nivel de router.
- Admin global (`tetlamamakani`) bypass automático por rol; editoras sin membership al proyecto correspondiente reciben `403`.

### Notas

- Las **creds del usuario** para ediciones siguen usando el rol global (`editora`) como check mínimo; la granularidad de `viewer` (bloquear writes por membership) se afinará cuando haya UI para gestionar roles viewer-only y se pueda validar en integración.
- El form de Users envía `project_assignments: []` explícitamente cuando el rol es `tetlamamakani` para limpiar cualquier asignación previa al cambiar de role.

---

## [0.16.0] - 2026-04-24

Backend multi-proyecto: modelo de dominio `Project` + `UserProject` + `MediaBucket`, extensión de `/auth/me` con proyectos y buckets accesibles, y helpers de autorización (`require_project_access`, `require_bucket_access`). Base del refactor multi-proyecto (Portalito, MapaLab, SIEEJ). Sin cambios visuales ni de flujo en el admin todavía — el consumo frontend llega en PR 3 y 4.

### Agregado

#### Modelos y BD (`iieg_portal`)

- Tabla `projects`: `id`, `slug` UNIQUE, `name`, `description`, `is_active`, `created_at`.
- Tabla `user_projects`: many-to-many usuario↔proyecto con `project_role: editor | viewer`. FK a `usuarios(id)` y `projects(id)` con `ON DELETE CASCADE`.
- Tabla `media_buckets`: `acervo_bucket` UNIQUE, `access_key_ref` (nombre de env var, no cred en BD), `display_name`, `is_public`, `is_active`, FK a `projects(id)`.
- Seeds iniciales en la misma migración:
    - Proyectos: `portal`, `mapalab`, `sieej`.
    - Buckets: `portal` → project portal, `mapalab` y `dateengine` → project mapalab. Los dos primeros `is_public=true` (match con las políticas anónimas GET de Acervo).
    - Backfill: cada usuario `editora` existente recibe membership `editor` en `portal` y `mapalab` para no romper acceso previo.
- Migración: `c0d1e2f3a4b5_add_projects_user_projects_media_buckets.py` sobre branch `mariachi`.

#### Modelos Python

- `app/models/project.py`: `Project`, `UserProject`.
- `app/models/media_bucket.py`: `MediaBucket`.
- Ambos registrados en `app/models/__init__.py`.

#### Schemas Pydantic

- `app/schemas/project.py`: `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `UserProjectAssignment`, `UserProjectMembership`, `BucketSummary`.
- `app/schemas/media_bucket.py`: `MediaBucketCreate`, `MediaBucketUpdate`, `MediaBucketResponse`.
- `app/schemas/user.py`: nuevo `CurrentUserResponse` que extiende `UsuarioResponse` con `projects: list[UserProjectMembership]` y `accessible_buckets: list[BucketSummary]`.

#### Endpoints

- `GET /api/administrador/projects` — lista proyectos activos (cualquier usuario autenticado).
- `POST /api/administrador/projects` — admin-only, crea proyecto.
- `PATCH /api/administrador/projects/{id}` — admin-only, actualiza.
- `GET /api/administrador/projects/{id}/members` — admin-only, lista membresías.
- `PUT /api/administrador/projects/users/{user_id}` — admin-only, reemplaza todas las membresías de un usuario en una sola llamada (payload: `[{project_slug, project_role}]`).
- `GET /api/administrador/media-buckets` — lista buckets visibles para el usuario actual (admin ve todos; editora/diseñadora filtra por proyectos asignados).
- `POST /api/administrador/media-buckets` — admin-only.
- `PATCH /api/administrador/media-buckets/{id}` — admin-only.
- `GET /api/administrador/autenticacion/perfil` — ahora devuelve `CurrentUserResponse` con `projects` y `accessible_buckets` precalculados en un solo hit.

#### Helpers de autorización (`app/api/deps.py`)

- `get_current_user_context()` — inyecta dict con user + memberships + buckets accesibles. Usado por `/autenticacion/perfil`.
- `require_project_access(project_slug, min_role=None)` — dependencia que verifica membership del usuario en el proyecto indicado. Admin global bypass. `min_role="editor"` rechaza viewers.
- `require_bucket_access(bucket_id_param="bucket_id")` — dependencia que verifica que el usuario pertenezca al proyecto dueño del bucket, devuelve el objeto `MediaBucket` resuelto.

### Convenciones introducidas

- **Credenciales por bucket NO viven en la BD.** `media_buckets.access_key_ref` guarda el nombre de una env var (ej. `ACERVO_MAPALAB`) y el backend resuelve `{ref}_ACCESS_KEY` / `{ref}_SECRET_KEY` del entorno en runtime. Evita leaks via dumps de DB.
- **Superadmin es por rol global** (`tetlamamakani`), no por asignación. No hace falta insertar filas en `user_projects` para admins — pueden con todo por defecto.
- **Un usuario puede ser `editor` en un proyecto y `viewer` en otro** (el viewer que pediste para preview sin edición se modela como `user_projects.project_role='viewer'`, no como rol global nuevo).

### Notas

- Los endpoints existentes `/pages`, `/menu`, `/layers`, `/layer-metadata`, `/geoserver` **aún no** usan `require_project_access`. Se aplicarán en PR 3 (sider dinámico + form de Users con proyectos), junto con el UI para asignar proyectos al crear/editar usuarios. Aplicarlo sin ese UI rompería el flujo de alta de usuarios.
- El consumo real de `access_key_ref` por el servicio de Media (cliente MinIO por bucket) llega en PR 4.
- La migración detectó que `init_db.py` inicializaba el schema con `create_all` sin registrar revision en Alembic. Se hizo `alembic stamp b5c6d7e8f9a0` antes de aplicar la nueva — documentar en `DEPLOYMENT.md` cuando exista.

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
