# Mariachi + Portal — Contexto del Proyecto

> Documento de referencia completo. Leer este archivo proporciona contexto del monorepo sin explorar el codebase.

**Versión:** ver `api/pyproject.toml` (la lee `api/app/core/version.py::get_app_version()`; endpoint en vivo `GET /ontoy`). · **Última actualización:** 2026-07-10


---

## Qué contiene este repositorio

Este monorepo aloja el panel de administración del ecosistema IIEG y el backend compartido por varios productos:

| Producto | Qué es | Carpeta | Ruta publica | Estado |
|---|---|---|---|---|
| **Mariachi** | Panel de administración del ecosistema IIEG (Ant Design) | `admin/` | `/mariachi/` | Activo |
| **SIEEJ (frontend)** | Captura de formularios para dependencias de gobierno (otro repo: `iieg-oficial/sieej`) | servido como volumen en `mariachi-nginx` | `/sieej/` | Activo |
| **Colibri Widget** | Web Components embebibles para reportar desde cualquier sitio (Lit + Vite) | `widget/` | `/colibri/widget/colibri-widget.v1.js` | Activo (v0.47.1) |
| **Colibri SDK** | Cliente HTTP TypeScript para integraciones server-side y browser custom | `sdk/` | npm `@iieg/colibri-sdk` | Activo (v0.46.0) |
| **Colibri Docs** | Documentacion publica standalone para integradores externos | `nginx/static/colibri-docs/` | `/colibri/docs/` | Activo (v0.47.4) |

El **Portal público** (sitio web del IIEG) se separó a su propio repo `iieg/portal/` (ver README raíz). Consume `/api/portal/*` de este `api`.

Mariachi y SIEEJ consumen el mismo backend FastAPI en `api/` con el mismo prefijo `admin_prefix` (`/api/administrador`). Mariachi usa los routers `auth`, `users`, `pages`, `menu`, `media`, `borradores`, `layers`, `colibri/*`, etc. SIEEJ usa exclusivamente `/api/administrador/formularios/*` (ver `docs/sieej.md`). Los huespedes externos a la sesion (widget + SDK + integraciones server-side) consumen `/api/public/reportes` (ver `docs/colibri.md`).

**Origen del nombre:** la carpeta del repo se llamaba `portal/` originalmente. En 2026-04-22 se renombro a `mariachi/` para reflejar que el CMS es lo único que se sigue desarrollando. El portal publico sigue alli pero congelado.

---

## Historia breve del rename (2026-04-22)

El monorepo se renombro de `portal/` a `mariachi/` porque:

- El nombre "portal" era ambiguo: habia **el sitio publico** (producto) y **el repo** (que contiene tanto el sitio publico como el CMS).
- El desarrollo del sitio publico (`web/`) se detuvo — lo asignaron originalmente aquí pero se retiro del alcance.
- El CMS (`admin/` + `api/`) es lo único con roadmap activo, y su nombre interno es **Mariachi**.

El rename fue **solo de carpeta e identificadores internos de infra** (docker compose, container names, networks). **No se toco**:

- Branding publico "Portal IIEG", "CMS Portal" en UI
- Rutas URL (`/api/portal`, `/api/administrador`)
- Nombre de BD `mariachi`
- Upstream `portal` en el gateway externo (se mantiene por conflicto de nombres con otro upstream ya existente)

---

## Stack

### Backend (`api/`) — compartido por mariachi y portal

| Tecnologia | Version |
|---|---|
| Python | 3.12 |
| FastAPI | 0.111–0.112 |
| Uvicorn / Gunicorn | 0.23+ / 22+ |
| SQLAlchemy | 2.0 |
| Alembic | 1.13 |
| Pydantic / pydantic-settings | 2.5+ |
| python-jose | 3.3+ (JWT) |
| passlib + bcrypt | Hashing |
| Redis client | 5.0+ |
| minio (SDK S3) | 7.2+ — cliente S3 del Acervo, apunta al gateway S3 de **SeaweedFS** |
| psycopg2-binary | 2.9+ |

Rutas del backend (prefijos):

- `/api/portal/*` (`WEB_PREFIX`) — consume el sitio publico
- `/api/administrador/*` (`ADMIN_PREFIX`) — consume el CMS

### Mariachi CMS (`admin/`)

| Tecnologia | Version |
|---|---|
| React | 19.2.4 |
| React Router | 7.13.0 |
| Vite | 7.3.1 |
| Ant Design | 6.2.2 |
| @dnd-kit core / sortable | 6.3 / 10.0 |
| Axios | 1.13.3 |

Estructura de features (`admin/src/features/`): `acervo`, `auth`, `colibri`, `inicio`, `mapalab-api-keys`, `mapalab-eventos`, `mapalab-home`, `mapalab-layers`, `mapalab-shares`, `mapalab-symbols`, `perfil`, `portal-menu`, `portal-pages`, `revision`, `sieej-formularios`, `users`. Cada feature agrupa `pages/`, `components/`, `hooks/`, `services/`, `constants/`. La estructura `pages/` legada se eliminó.

### Portal web publico (`web/`) — congelado

| Tecnologia | Version |
|---|---|
| React | 19.2.4 |
| React Router | 7.13.0 |
| Vite | 7.3.1 |
| TailwindCSS | 4.1.18 |
| Axios | 1.13.3 |

### Infra

| Componente | Tecnologia | Notas |
|---|---|---|
| Proxy interno | Nginx | sirve `web/dist` en `/`, `admin/dist` en `/mariachi/`, proxea `api/` a backend |
| BD | PostgreSQL 18 (prod y dev) | DB: `mariachi` |
| Cache/sessions | Redis 7 | |
| Almacenamiento | Acervo (**SeaweedFS**, S3-compatible vía su gateway S3) | buckets por proyecto en `acervo_buckets`. **Publicos** (anonymous GetObject): `portal`, `mapalab`, `iieg`. **Privados**: `mariachi`, `sieej`, `dataengine` (deshabilitado). Cada bucket usa `<REF>_user` con policy attached al bucket; sin fallback a creds root. |
| DataEngine (solo v1.4.0+ MapaLab) | PostgreSQL + PostGIS externo | Segunda conexión para tabla `layers` |
| Contenedores | Docker Compose | profiles: prod (`docker-compose.yml`), dev (`docker-compose.dev.yml`) |

---

## Estructura

```
mariachi/
├── api/                          # Backend FastAPI compartido
│   ├── app/
│   │   ├── main.py               # create_app + registro de routers
│   │   ├── api/
│   │   │   ├── deps.py           # get_current_user, verify_csrf, require_role
│   │   │   └── routes/           # auth, users, pages, menu, media, borradores, preview, public
│   │   ├── core/
│   │   │   ├── settings.py       # Pydantic settings (incluye DATAENGINE_DATABASE_URL opcional)
│   │   │   ├── database.py       # engine principal + get_dataengine_db (lazy)
│   │   │   ├── security.py       # JWT + CSRF
│   │   │   └── cache.py          # Redis helpers
│   │   ├── models/               # user, page, menu_item, media, borrador, reporte*, tipo, direccion, source_app, route, grupo, actividad
│   │   ├── schemas/              # Pydantic request/response (incluye form_schema, source_context tipados)
│   │   └── services/             # acervo, colibri_keys, colibri_fingerprint, pii_scrubber, colibri_router_engine
│   ├── alembic/                  # Migraciones (solo BD mariachi por ahora)
│   ├── scripts/                  # init_db, generate_secret_key
│   ├── tests/
│   └── pyproject.toml            # name: mariachi-api
├── admin/                        # CMS Mariachi (Ant Design)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── app/                  # sider-config, router, MainLayout, ProtectedRoute
│   │   ├── features/             # auth, colibri, inicio, mapalab-eventos, mapalab-home,
│   │   │                         # mapalab-layers, media, perfil, portal-menu, portal-pages,
│   │   │                         # revision, sieej-formularios, users
│   │   ├── shared/               # services/api.js (axios + interceptors CSRF + auto-refresh),
│   │   │                         # components reutilizables, hooks, providers, constants
│   │   └── ...
│   └── package.json              # name: mariachi-admin
├── web/                          # Portal publico (congelado)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/apiService.js
│   └── package.json              # name: portal-web
├── widget/                       # Web Components embebibles de Colibri (Lit + Vite)
│   ├── src/
│   │   ├── colibri-button.js     # Custom Element FAB flotante
│   │   ├── colibri-trigger.js    # Custom Element link/icono inline
│   │   ├── colibri-form.js       # Custom Element form embebido
│   │   ├── index.js              # registra los 3 + window.colibri.identify
│   │   └── shared/               # api, theme, icons, panel modal, form renderer
│   ├── dist/                     # bundle servido por mariachi-nginx en /colibri/widget/
│   ├── vite.config.js            # library mode iife + es
│   └── package.json              # name: @iieg/colibri-widget (no se publica a npm)
├── sdk/                          # SDK npm de Colibri (TypeScript puro)
│   ├── src/
│   │   ├── index.ts              # class Colibri + factory
│   │   ├── errors.ts             # ColibriError + 5 subclases (Auth/Validation/RateLimit/...)
│   │   └── types.ts              # tipos publicos exportados
│   ├── tsconfig.json             # target ES2020, declaration true
│   └── package.json              # name: @iieg/colibri-sdk (publicable a npm)
├── nginx/                        # Proxy + sirve estáticos
│   ├── conf.d/mariachi.conf      # Template con envsubst
│   ├── ssl/
│   ├── static/                   # robots.txt, sitemap.xml, colibri-docs/
│   │   └── colibri-docs/         # documentacion publica standalone (HTML estatico)
│   ├── nginx.conf
│   └── Dockerfile                # multi-stage: widget-builder, admin-builder, nginx
├── docs/                         # Este directorio (incluye colibri.md)
├── docker-compose.yml            # name: mariachi (prod)
├── docker-compose.dev.yml        # name: mariachi-dev
├── Makefile
├── .env.development.example
├── .env.staging.example
├── .env.production.example
└── README.md
```

---

## Contenedores y red

### docker-compose.yml (prod)

| Servicio | Container name | Puerto | Funcion |
|---|---|---|---|
| `nginx` | `mariachi-nginx` | 80, 443 | Proxy + estáticos |
| `postgres` | `mariachi-postgres` | interno | PostgreSQL 18 |
| `redis` | `mariachi-redis` | interno | Cache/sessions |
| `api` | `mariachi-api` | interno | FastAPI + Gunicorn |

Red: `mariachi_network` (antes `portal_network`).

### docker-compose.dev.yml

| Servicio | Container name | Puerto | Funcion |
|---|---|---|---|
| `postgres` | `mariachi-postgres-dev` | 5433 (host) → 5432 | PostgreSQL 18 |
| `redis` | `mariachi-redis-dev` | 6379 | Cache/sessions |
| `api` | `mariachi-api-dev` | 8000 | Uvicorn --reload |
| `web` | `mariachi-web-dev` | 3010 | Vite dev server |
| `admin` | `mariachi-admin-dev` | 3011 | Vite dev server |

Redes: `mariachi_network_dev` (propia) + `mapalab-network` (external, para que el admin alcance a `mapalab-dev-frontend-1` desde su Vite proxy). Eventualmente `api` deberá unirse a `dataengine-network` (external) para alcanzar `dataengine-primary` en el modulo de capas.

### Topología por entorno (importante)

| Entorno | Despliegue | Cómo se alcanzan los vecinos (mapalab, dataengine, acervo, geoserver) |
|---|---|---|
| **dev** (workstation local) | Todos los repos levantan su propio `docker-compose.*.yml` en **una sola maquina**. Mariachi, mapalab, dataengine, acervo, etc. corren como contenedores en el mismo host Docker. | Por **nombre de contenedor** via redes docker compartidas/external (`mapalab-network`, `dataengine-network`, `iieg-network`). El Vite del admin proxea `/mapalab/*` a `mapalab-dev-frontend-1:3006` — el hook usa siempre la ruta relativa. |
| **staging** (GCP) | **Una sola VM** con todos los contenedores juntos (misma idea que dev pero en la nube). El `gateway-hub` termina SSL y enruta por path. | Igual que dev: nombres de contenedor via redes docker external. El admin en staging se sirve como build estático desde `mariachi-nginx`; `/mapalab/*` lo resuelve el `gateway-hub` al container de mapalab en la misma VM. |
| **producción** (administracion) | **Servers separados** por servicio (mariachi en una VM, mapalab en otra, dataengine en otra). | Por **hostname/DNS + IP publica o privada** segun el caso. El `gateway-hub` externo termina SSL y enruta `/`/`/mariachi/`/`/api/` a mariachi-nginx, `/mapalab/*` a la VM de mapalab, etc. `DATAENGINE_DATABASE_URL` apunta al host real de DataEngine via `pg_hba.conf` + `sslmode=require`. |

**Implicacion:** el proxy `/mapalab` del `vite.config.js` del admin solo se usa en **dev** (y en staging si el admin se corre con Vite en vez de como build, que no es el caso). En prod el admin es build estático y el enrutamiento lo hace el `gateway-hub`.

---

## Variables de entorno clave

### Backend (`api/`)

| Variable | Ejemplo | Descripcion |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@postgres:5432/mariachi` | BD principal del CMS |
| `DATAENGINE_DATABASE_URL` | `postgresql://mariachi_layers:***@dataengine:5432/db` | **Opcional**, solo para v1.4.0 de MapaLab (modulo de capas). Ver `DATAENGINE_CREDENTIALS.md` |
| `DATAENGINE_POOL_SIZE` | `5` | Pool size del engine secundario |
| `DATAENGINE_MAX_OVERFLOW` | `5` | Max overflow del engine secundario |
| `REDIS_URL` | `redis://redis:6379/0` | |
| `SECRET_KEY` | random 32+ chars | JWT signing |
| `CSRF_SECRET_KEY` | random 32+ chars | CSRF signing |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `COOKIE_NAME` | `access_token` | |
| `COOKIE_DOMAIN` | `app.tu-dominio.com` (prod) | Permite compartir con mapalab bajo mismo dominio |
| `COOKIE_SECURE` / `COOKIE_HTTPONLY` / `COOKIE_SAMESITE` | `true` / `true` / `lax` | |
| `CORS_ORIGINS` | JSON array | |
| `ADMIN_PREFIX` | `/api/administrador` | Ruta del CMS |
| `WEB_PREFIX` | `/api/portal` | Ruta del sitio publico |
| `ACERVO_ENDPOINT` / `ACERVO_PUBLIC_ENDPOINT` / `ACERVO_USE_SSL` / `ACERVO_VERIFY_SSL` | — | Endpoint S3 de SeaweedFS (host y publico, sin creds globales) |
| `ACERVO_<REF>_ACCESS_KEY` / `ACERVO_<REF>_SECRET_KEY` | — | Creds **por bucket** (REF coincide con `acervo_buckets.access_key_ref`). Sin fallback a creds root del cluster: cada bucket activo requiere su par. |

### Frontend (Vite)

| Variable | Uso |
|---|---|
| `VITE_WEB_API_URL` | Base URL que usa `web/` (portal publico). Ej: `https://tu-dominio.com/api/portal` |
| `VITE_ADMIN_API_URL` | Base URL que usa `admin/` (CMS). Ej: `https://tu-dominio.com/api/administrador` |
| `VITE_APP_NAME` / `VITE_ADMIN_APP_NAME` | Branding |
| `VITE_GOOGLE_ANALYTICS_ID` | GA4 |

### Bucket compartido `iieg` (assets institucionales + avatars)

Bucket publico (anonymous GetObject) para todo lo que se muestra en cualquier frontend del ecosistema. Estructura:

```
acervo/iieg/
  ├── logos/          # iieg-logo.svg, jalisco-escudo.svg, etc.
  ├── icons/          # iconos institucionales reutilizables
  ├── fonts/          # archivos .woff2 si hay fuentes auto-hosteadas
  ├── docs/           # aviso-privacidad.pdf, terminos-uso.pdf, etc.
  ├── images/         # imagenes generales institucionales
  └── avatars/u<user_id>/<uuid>.<ext>   # avatars de usuarios (globales al ecosistema)
```

**Por que avatars aqui y no en `mariachi`**: si una editora aparece en una lista de "ultima edicion" tanto en mariachi-admin como en otros frontends, mostrar el mismo avatar requiere que sea publico y compartido. El bucket `mariachi` es privado (assets administrativos staff-only); los avatars son datos que aparecen en muchas vistas.

**Como leerlo desde un frontend** (mariachi-admin, mapalab, sieej, portal):
- En **produccion/staging** todos los frontends viven bajo el mismo dominio, asi que URL relativa basta: `<img src="/acervo/iieg/logos/iieg-logo.svg">`, `<img src="/acervo/iieg/avatars/u42/abc123.jpg">`.
- En **dev local** cada frontend corre en su propio puerto sin gateway-hub. Si el frontend necesita el bucket en dev, define `VITE_IIEG_ASSETS_URL=http://localhost:9080/iieg` en su `.env.development` y usa `import.meta.env.VITE_IIEG_ASSETS_URL || '/acervo/iieg'` como fallback.

**Como subir**:
- Assets institucionales (`logos/`, `icons/`, `fonts/`, `docs/`): solo el rol global `tetlamamakani` puede subir (control via `acervo_buckets` y permisos del proyecto `iieg`).
- Avatars de usuarios (`avatars/u<id>/...`): cualquier usuario autenticado sube SU PROPIO avatar via el endpoint de perfil; mariachi-api valida que el `user_id` del path coincida con `current_user.id`.

**Convencion de versionado** (assets institucionales): usar paths inmutables (`logos/v1/logo.svg`, `logos/v2/logo.svg`) en lugar de sobreescribir, para no invalidar cache de browsers ni romper frontends que apunten a una version especifica.

### Bucket privado `mariachi`

Reservado para assets administrativos internos del panel admin que NO se exponen al publico: logs descargables, exportaciones internas, archivos staff-only. NO almacena avatars (esos viven en `iieg`). Acceso requiere autenticacion como staff y mariachi-api debe servirlos via presigned URLs o proxy autenticado, NO con URL publica.

El proxy autenticado vive en `GET /api/administrador/acervo/proxy/{bucket_id}/{object_path}` y es la ruta por defecto que devuelve `AcervoClient.get_file_url` cuando el bucket está marcado `is_public=false`. Devuelve un `StreamingResponse` con `Cache-Control: private, max-age=300`.

### Sub-rutas reservadas dentro de buckets compartidos

Algunos features escriben en sub-prefijos del bucket que NO deben aparecer en el listado de la página de Acervo (porque su CRUD se maneja desde otra UI):

| Bucket | Prefijo oculto | Quién lo escribe |
|---|---|---|
| `mariachi` | `reportes/` | `routes/reportes_public.py` (screenshots de reportes) |

La lista vive en `app/core/bucket_policies.py::HIDDEN_PREFIXES_BY_BUCKET` y `media_service.listar_media` la consulta cuando se navega la raíz del bucket (no se aplica si el usuario navega explícitamente al prefix oculto, p. ej. `?folder=/reportes`).

### Carpetas del CMS (`acervo_folders`)

`acervo_folders` es scoped por bucket: cada fila tiene `bucket_id` (FK CASCADE a `acervo_buckets`) y la unicidad es `(bucket_id, path)`. Esto permite que dos buckets distintos tengan una carpeta con el mismo nombre/ruta sin colisión. El frontend siempre envía `bucket_id` al listar/crear/eliminar carpetas. La columna `media.folder` ya no es FK a `acervo_folders.path` (lo era antes del scoping); se persiste como string libre.

---

## Autenticación

### Flujo

1. Admin entra a `/mariachi/` en el navegador.
2. Login emite cookie `access_token` con JWT (`HttpOnly Secure SameSite=lax`).
3. Frontend guarda CSRF token en memoria y lo envia como header `X-CSRF-Token` en writes.
4. Backend valida cookie (`get_current_user`) + CSRF (`verify_csrf`) en rutas protegidas.
5. `require_role([...])` para control de roles.

### Roles

Definidos en `models/user.py`. Flujo de revision con `RevisionQueue` permite aprobacion antes de publicar.

### Cookie compartida con MapaLab (v1.4.0)

Un `COOKIE_DOMAIN` apuntando al subdominio común (ej. `app.tu-dominio.com`) hace que la cookie sea valida en `/mapalab/*` también. Esto permite que:

- El admin autenticado en `/mariachi/layers` tenga sesion automática al ir a `/mapalab/` (ej. para un boton de preview).
- El backend de mapalab NO necesita validar auth (solo lee capas, endpoints publicos). Solo mariachi valida auth para writes.

Ver `docs/COOKIES_CSRF.md` para detalles completos.

---

## Endpoints principales

### Sitio publico (`/api/portal/*`)

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/api/portal/pages/{slug}` | Render publico de pagina |
| GET | `/api/portal/menu` | Menu de navegacion |
| GET | `/api/portal/media/{id}` | Asset publico |

Sin auth. `router = APIRouter(tags=["portal público"])` en `routes/public.py`.

### CMS (`/api/administrador/*`)

| Metodo | Ruta | Funcion |
|---|---|---|
| POST | `/autenticacion/iniciar-sesion`, `/autenticacion/cerrar-sesion` | Login/logout (cookie JWT + CSRF) |
| GET | `/autenticacion/perfil` | Perfil del usuario actual + buckets accesibles |
| PUT | `/autenticacion/perfil` | Actualiza nombre/email/avatar_url del propio usuario |
| GET | `/autenticacion/csrf` | Refresca CSRF token sin re-login (sesion JWT valida). Usado por el interceptor del admin para auto-recovery cuando sessionStorage se vacia |
| POST | `/autenticacion/cambiar-contrasena` | Cambio de contrasena (current + new) |
| GET/POST/PUT/DELETE | `/usuarios/*` | Gestión de usuarios (writes admin-only) |
| POST | `/usuarios/{id}/restablecer-contrasena` | Reset password con temp_password generada (admin-only) |
| GET/POST/PUT/DELETE | `/pages/*` | Editor de paginas |
| GET/POST/PUT/DELETE | `/menu/*` | Gestión de menu |
| GET/POST/PUT/DELETE | `/acervo/*` | Upload/listado/edición de archivos por bucket |
| GET | `/acervo/proxy/{bucket_id}/{object_path}` | Stream autenticado para buckets privados |
| POST | `/acervo/mover-lote` | Mueve múltiples archivos a una carpeta en una sola llamada |
| GET/POST/DELETE | `/acervo/carpetas/*` | CRUD de carpetas (scoped a `bucket_id`) |
| GET/POST/PATCH | `/acervo-buckets/*` | CRUD de buckets registrados (admin solo en writes) |
| GET/POST/PATCH | `/borradores/*` | Revision queue |
| GET | `/preview/*` | Preview de paginas sin publicar |
| GET/POST/PATCH/DELETE | `/colibri/tipos/*` | CRUD de tipos de reporte (admin en writes) |
| GET/POST/PATCH/DELETE | `/colibri/direcciones/*` | CRUD de direcciones organizacionales |
| GET/POST/PATCH/DELETE | `/colibri/source-apps/*` | CRUD de huespedes registrados; `POST /:id/rotate-key` devuelve la API key plana una sola vez |
| GET/POST/PATCH/DELETE | `/colibri/routes/*` | CRUD de rutas de fan-out (Discord/Slack/webhook/email) |
| GET | `/colibri/stats` | Payload completo de metricas para dashboard Resumen |
| GET | `/reportes/grupos/lista` | Vista agrupada por fingerprint (count desc) |
| GET | `/reportes/{id}/actividad` | Timeline de cambios sobre un reporte |
| PATCH | `/reportes/{id}` | Update extendido: estado, severidad, prioridad, duplicado_de, direccion, etc. Cada campo cambiado registra fila en `reporte_actividad` |
| GET/POST/PATCH/DELETE | `/eventos/*` | CRUD de eventos (mapalab-eventos). Workflow draft → review → published con `EventoEstado` enum. Al crear/actualizar (si cambia `capas`) resincroniza `mapalab.layers.label` de las auto-leaf bajo `eventos-auto` con el `alias` del evento vía `sync_auto_leaf_labels`, y dispara `notify_tree_changed` si hubo cambios (`api 1.26.0+`) |
| POST | `/eventos/{id}/publicar`, `/eventos/{id}/despublicar` | Cambios de estado controlados |
| GET | `/eventos/{id}/preview` | Vista publica del evento aun en draft |
| PUT/GET | `/eventos/{id}/presencia` | Coedicion: heartbeat de presencia en Redis (CSRF requerido en PUT) |
| GET/POST/DELETE | `/formularios/*` | CRUD de formularios SIEEJ (admin) |
| GET | `/formularios/catalogos` | Catalogo de tipos/dependencias SIEEJ |
| GET/PUT/POST | `/formularios/{slug}/envio*` | Endpoints respondent: borrador, submit, upload de archivos |
| GET | `/formularios/mis-envios/{id}` | Detalle con `definicion_snapshot` historica + `datos` + `archivos` + `eventos` |
| DELETE | `/formularios/mis-envios/{id}` | Soft-delete del envio para el respondent |
| GET/POST/PATCH/DELETE | `/home/*` | CRUD de secciones del home publico de mapalab |
| GET/POST/PATCH/DELETE | `/mapalab-shares/*` | Gestion de share links de visor mapalab |
| GET | `/layer-metadata/bulk/column-presets` | Presets de mapeo Excel→técnico para ingesta masiva |
| POST | `/layer-metadata/bulk/upload` | Multipart CSV/XLSX + `dependencia` + `column_mapping`. Genera plan persistido (no aplica). Sube original al bucket `mariachi/bulk-ingest/<plan_id>/...` |
| GET | `/layer-metadata/bulk/plan/{plan_id}` | Recupera plan generado (24h TTL) |
| POST | `/layer-metadata/bulk/plan/{plan_id}/apply` | Aplica el plan persistido (admin-only). Optimistic locking con `IS NOT DISTINCT FROM` |
| DELETE | `/layer-metadata/bulk/plan/{plan_id}` | Cancela plan |

Requieren cookie JWT valida + CSRF en writes.

### Colibri publico (`/api/public/reportes/*`)

| Metodo | Ruta | Funcion |
|---|---|---|
| POST | `/api/public/reportes` | Crear reporte. Acepta multipart con screenshot + `respuestas` (JSON validado contra `form_schema` del tipo). Si llega header `X-Colibri-Key`: valida key + CORS dinamico contra `dominios_permitidos` + tipos permitidos + rate limit por (source_app, IP). Aplica scrubbing PII. Calcula fingerprint y agrupa. Dispatcha a routes de fan-out (best-effort). Sin header sigue funcionando legacy. |
| GET | `/api/public/reportes/tipos` | Lista tipos activos con `formSchema` para que el widget/SDK rendericen forms dinamicos. `Cache-Control: public, max-age=300`. |

Sin cookie JWT — autenticacion exclusivamente por API key del huesped (`ck_pub_*` browser, `ck_priv_*` server). Ver `docs/colibri.md` para arquitectura completa.

### Ingesta masiva de metadatos (CSV/XLSX) — implementado

Pestaña `/mariachi/mapalab/layers/ingesta-masiva` en el feature `mapalab-layers`. Sube CSV/XLSX, mapea columnas humanas del Excel del MapaLab a campos técnicos, previsualiza el plan con diff por capa, y aplica.

| Feature | Archivos |
|---|---|
| Backend service de parsing CSV/XLSX | `api/app/services/bulk_ingest_parser.py` |
| Backend service planner + applier | `api/app/services/bulk_ingest_planner.py` |
| Router | `api/app/api/routes/bulk_ingest.py` (`/layer-metadata/bulk/*`) |
| Modelo SQLAlchemy | `api/app/models/bulk_ingest_plan.py` (DataEngineBase) |
| Schemas Pydantic | `api/app/schemas/bulk_ingest.py` |
| Tabla persistencia | `mapalab.bulk_ingest_plans` (dataengine, migración `0012_bulk_ingest_plans`) |
| Frontend orquestador | `admin/src/features/mapalab-layers/pages/BulkIngestPage.jsx` |
| Frontend sub-componentes | `admin/src/features/mapalab-layers/components/bulkIngest/{UploadForm,MappingModal,PreviewPlan,ChangeDetail,ResultView}.jsx` |
| Constantes de mapping | `admin/src/features/mapalab-layers/constants/bulkIngestFields.js` |
| Servicio axios | `admin/src/features/mapalab-layers/services/bulkIngestService.js` |

Características clave:

- **Soporta CSV (UTF-8) y XLSX** (dep nueva `openpyxl>=3.1`). Sheets se descarga primero como CSV/XLSX (no integración directa).
- **Preset `mapalab-excel`** pre-cargado con el mapeo derivado de `dataengine/jobs/bootstrap/run_migrate_mapalab_card.py`. UI permite ajustar mapeo columna por columna en un modal.
- **Plan persistente** en `mapalab.bulk_ingest_plans` con TTL de 24h (`status IN ('pending','applied','cancelled','expired')`). El plan completo se guarda como JSONB (`plan_json`) — preview→apply son operaciones separadas, idempotentes con optimistic locking (`IS NOT DISTINCT FROM`).
- **Cubre dos tablas**: `mapalab.layer_metadata` (descripción, fuentes JSONB, metodología, metadato, downloadable, etc.) y `mapalab.layer_stats` (numeralia 1-8 + pie_numeralia). El planner emite changes con `table: 'layer_metadata' | 'layer_stats'` por diff.
- **Audit con email del usuario real** (`updated_by = current_user.email`), no etiqueta generica.
- **Archivo original al bucket privado `mariachi`** en `bulk-ingest/<plan_id>/<filename>`; recuperable vía `/api/administrador/acervo/proxy/{bucket_id}/{object_key}` (best-effort: si falla la subida, el plan se genera igual).
- **RBAC**: editor/`tetlamamakani` pueden subir y previsualizar; solo `tetlamamakani` puede aplicar. Rate limit 20 writes/min.
- **Métricas**: `mariachi_bulk_ingest_uploads_total` y `mariachi_bulk_ingest_applies_total`.

Tests en `api/tests/services/test_bulk_ingest_parser.py` (parsing, mapping, builders de fuentes/metodología/metadato/numeralia, validación del preset MapaLab).

### v1.4.0 MapaLab (capas) — implementado

| Metodo | Ruta | Funcion |
|---|---|---|
| GET/POST/PUT/DELETE/PATCH | `/api/administrador/layers/*` | CRUD de capas en DataEngine via `get_dataengine_db()`. Invalida `mapalab.layer_tree_cache` via `notify_tree_changed()` |
| PATCH | `/api/administrador/layers/reorder` | Reordena hijos de un padre (drag & drop, admin-only) |
| PATCH | `/api/administrador/layers/bulk-tags` | Edicion masiva de tags (max 500 por request) |
| GET/PUT | `/api/administrador/layer-metadata/{layer_key}` | CRUD de metadata descriptiva (`mapalab.layer_metadata`) |
| GET/PUT | `/api/administrador/layer-metadata/{layer_key}/stats` | CRUD de numeralia + stats_config (`mapalab.layer_stats`) |
| GET | `/api/administrador/geoserver/*` | Introspeccion GeoServer REST (workspaces, campos, estilos) |
| GET | `/api/administrador/geoserver/workspaces/pending` | Workspaces presentes en GeoServer pero no registrados en `mapalab.workspaces` (admin-only). Devuelve `[{geoserverWorkspace, layerCount}]` |
| POST | `/api/administrador/geoserver/workspaces/register` | Registra un workspace nuevo en `mapalab.workspaces` (admin + CSRF). Valida que exista en GeoServer |
| POST | `/api/administrador/layers/auto-leaf` | Idempotente: devuelve o crea un leaf con `(workspace_alias, geoserver_layer)` bajo el padre `eventos-auto` (tema oculto, on-demand). Usado al asociar una capa "solo GeoServer" a un evento. `label` es **obligatorio** y debe ser distinto al `geoserver_layer` (normalizando case + `_`/`-`/espacios); evita registrar capas con el slug como nombre visible (`api 1.14.5+`) |
| POST | `/api/administrador/borradores/por-id/{id}/aprobar` | Aprueba borrador; si `resource_type='layer'`, materializa en DataEngine |
| GET | `/metrics` | Metricas Prometheus (sin auth, usado por huachicol) |

Rate limiting: writes en 60 req/min por usuario, reads de GeoServer en 120 req/min. Responde `429` con header `Retry-After`.

Editor UI: `admin/src/pages/MapalabLayers.jsx` con Ant Design Tree + drawer. Componentes del drawer de InfoBox en `admin/src/components/layersEditor/`: `InfoBoxPresetForm`, `InfoBoxPreview`, `InfoBoxJsonEditor`.

#### Bloques del InfoBox editor (`features/mapalab-layers/components/layersEditor/`)

- `InfoBoxBlocksEditor.jsx` + `InfoBoxPreview.jsx` soportan **múltiples bloques `text` independientes**, identificados por `id` y referenciados en `blockOrder` como `text:<id>`. Cada item de un bloque puede ser **texto fijo** (`label`) o **campo dinámico** (`field`) — el preview renderiza el campo como `<strong>{field}: </strong>{valor}`.
- Items de `text` y `list` aceptan un **`href` opcional** con tokens del feature tipo `https://catastro.gob.mx/{clave_catastral}`. El preview los pinta subrayados (`#5C2472`). El visor mapalab los renderiza como `<a target="_blank">`.
- `infoBoxTextBlocks.js` expone `mkTextKey`, `isTextKey`, `textIdOf`, `genTextId` y `normalizeTextBlocks`. La normalización migra el formato legacy (`text: [{label}, ...]`) al nuevo (`text: [{id, items: [...]}, ...]`) en cada render — sin migración de BD ni cambio de schema (`infobox_config` es `JSONB`).

Ver la documentación interna de mapalab (`/IIEG/mapalab/docs/layers.md`, `infobox.md`) para la arquitectura completa.

### v0.31.0 Editor de simbología (SLD) — implementado

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/api/administrador/geoserver/styles/{alias}/{style_name}` | Devuelve `{rawXml, editable, shape, model, sharedBy, reason}` con detección automática del shape (choropleth/boundary/point). Para `shape='point'` enriquece `model.point.symbol_id` con lookup inverso del catálogo |
| GET | `/api/administrador/geoserver/legend/{alias}/{layer}/{style_name}` | Proxy a `GetLegendGraphic` de GeoServer (independiente del gateway-hub) |
| GET | `/api/administrador/geoserver/palettes` | Lista las 144 paletas oficiales del CSV `paletas_simbologia.csv` |
| POST | `/api/administrador/borradores/por-id/{id}/aprobar` | Si `resource_type='sld'`, genera SLD y hace `put_sld` con verificación SHA256 round-trip |

Editor UI: `admin/src/features/mapalab-layers/components/sldEditor/` — tab "Simbología" en `LayerEditPage` (visible solo en `group`/`leaf`). Soporta dos shapes:

- **`choropleth`** — coropleticos por rangos numéricos del pipeline `estilos-coropleticos-mapalab` (formato canónico). Editor visual con cortes/labels/paleta/borde/null_style.
- **`boundary`** — estilo único + label de TextSymbolizer. Cubre límites/regiones con tabs Polígono / Etiqueta (con halo, placement, vendor options, scale denominators).

Cualquier otro shape (Raster/Point/Line, filtros categóricos, layer groups) cae al fallback `RawXmlFallback` con mensaje claro y leyenda renderizada por GeoServer; el XML se muestra read-only.

Workflow de aprobación: reusa la tabla `borradores` con `resource_type='sld'`, `resource_id='{alias}:{style_name}'`. Sin schema nuevo. Botón "Solicitar revisión" → `tetlamamakani` aprueba en `RevisionQueue` → backend genera SLD → upload a GeoServer → `notify_tree_changed()` invalida cache.

Ver `docs/SLD_EDITOR.md` para la referencia completa por componente.

### v0.50.0 Catálogo de símbolos + shape `point` en SLD editor — implementado

Catálogo administrable de símbolos consumido por el panel de mediciones de MapaLab y por el shape `point` del SLD editor. Incluye flujo de revisión adaptado a SLDs, modo "Publicar directo" para admin, e historial automático de SLDs aplicados con restauración.

#### Endpoints

| Método | Ruta | Función |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/administrador/mapalab/symbol-categories[/{id}]` | CRUD de categorías (tetlamamakani) |
| GET/POST/PUT/DELETE | `/api/administrador/mapalab/symbols[/{id}]` | CRUD de símbolos (tetlamamakani) |
| POST | `/api/administrador/mapalab/symbols/upload` | Upload multipart de imagen (kind=image) al bucket `mapalab/simbologia/` |
| POST | `/api/administrador/mapalab/symbols/reorder` | Reordena símbolos en bulk (usado por drag & drop en el admin) |
| GET | `/api/mapalab/symbols/catalog` | Endpoint público (sin auth) consumido por MapaLab — devuelve `{categories: [{id, slug, name, icon, symbols: [...]}]}` |
| GET | `/api/administrador/borradores/historial/sld/{resource_id}` | Lista versiones aprobadas de ese style (admin) |
| POST | `/api/administrador/borradores/por-id/{id}/re-aplicar` | Re-aplica un borrador aprobado y crea duplicado para historial |

#### Tablas en schema `mapalab` (dataengine, migración `0007_symbol_catalog` + `0010_symbol_bucket_slug`)

- `mapalab.symbol_categories` — `(id, slug UNIQUE, name, icon, sort_order, timestamps)`
- `mapalab.symbols` — `(id, category_id FK CASCADE, kind CHECK('emoji'|'svg'|'image'), value TEXT, name, sort_order, bucket_slug DEFAULT 'mapalab', image_object_key, png_object_key, timestamps)`

`bucket_slug` indica en qué bucket de Acervo vive el archivo del símbolo. Convención por kind:

- `emoji` — `value` tiene el carácter Unicode; `png_object_key` (rasterizado via Twemoji) vive en `mapalab/simbologia/emoji-png/`.
- `image` (PNG/JPG/WebP/GIF) — `image_object_key` vive en `mapalab/simbologia/` (bucket `mapalab`).
- `svg` — `image_object_key` vive en `iieg/leyendas/` (bucket `iieg`). Subido como archivo, no como XML inline. Requiere URLCheck en GeoServer para el bucket `iieg`.

Migración mariachi `d3e4f5a6b7ca`: el unique constraint en `borradores` ahora es parcial (solo aplica a `en_progreso`/`pendiente_revision`/`rechazado`). Los aprobados acumulan historial sin tabla nueva.

#### Rasterización de emojis para GeoServer

Para emojis usados en SLDs, el applier `_apply_sld` invoca `symbol_service.ensure_emoji_png(symbol_id, mariachi_db)` que rasteriza el emoji con **Twemoji** (CDN `cdnjs.cloudflare.com`) y guarda el PNG en `mapalab/simbologia/emoji-png/<codepoint>.png`. `png_object_key` se persiste para no rasterizar dos veces. Esto resuelve la limitación de Java 2D en GeoServer que no soporta fuentes de color.

#### Prerrequisitos de infraestructura

1. El contenedor `geoserver` debe estar en `iieg-network` para resolver `acervo-minio` cuando renderiza el SLD con `<ExternalGraphic>`. Configurado en `/IIEG/geoserver/docker-compose.yml`.
2. GeoServer 2.20+ bloquea por defecto cualquier URL externa en SLDs. Crear un `URLCheck` vía REST API: `POST /rest/urlchecks` con regex `^http://acervo-minio:9000/mapalab/.+$`. Detalles en `docs/SLD_EDITOR.md`.

UI: `/mapalab/simbolos` (admin tetlamamakani). Features en `admin/src/features/mapalab-symbols/` y `admin/src/features/mapalab-layers/components/sldEditor/`.

### v0.31.0 Modelo de Propiedades (display-only)

Los hijos de un nodo `group` son conceptualmente **propiedades** (comparten `geoserver_layer` con el grupo padre, se diferencian solo por `cql_filter`). El schema `mapalab.layers` solo tiene 5 `node_type` (no existe `property`), así que se almacenan como `leaf`.

Inferencia visual (sin cambio de schema):

- Helper `isPropertyOfGroup(nodeType, parentNodeType)` en `admin/src/features/mapalab-layers/constants/nodeTypes.js`.
- Un `leaf` con padre `group` se renderiza con tag cyan **"Propiedad"** en el árbol, header de la página de edición y orden inicial.
- En `LayerEditPage` para una propiedad: tabs `simbologia` y `metadatos` ocultos (se editan en el grupo padre, comparten feature type/SLD), Select de `nodeType` deshabilitado, Alert info que explica el modelo.
- En `LayerCreateModal` al crear bajo un padre `group`: Alert success "Se creará como Propiedad del grupo" explicando el comportamiento (se enciende cuando se enciende el grupo en el visor).

El visor mapalab ya manejaba esto correctamente vía `forceGroup: true` en el árbol (`mapalab/backend/app/services/layer_tree_service.py:101`); el editor mariachi simplemente lo refleja en la UI. Si en el futuro se requiere numeralia/metadata distintas por propiedad, requiere migrar `mapalab.layer_stats` y `mapalab.layer_metadata` de `layer_key` a `layer_id`.

---

## Integracion con el gateway externo

Un gateway Nginx externo enruta segun path. Rutas relevantes para este repo:

| Ruta gateway | Upstream | Destino |
|---|---|---|
| `/` | `portal` (`PORTAL_HOST`) | `mariachi-nginx` (este repo) → `web/dist` |
| `/api/` | `portal` (`PORTAL_HOST`) | `mariachi-nginx` → `mariachi-api` |
| `/mariachi/` | `portal` (`PORTAL_HOST`) | `mariachi-nginx` → `admin/dist` |

**Atencion:** el gateway mantiene el nombre `portal` en su upstream por conflicto de nombres con otro upstream ya existente. Se deja como esta.

La variable `PORTAL_HOST` del gateway sigue apuntando al container de este repo (ahora `mariachi-nginx`) — el puerto/target no cambio, solo el container_name interno.

---

## BD mariachi

Tablas existentes (modelos en `api/app/models/`):

- `usuarios`
- `paginas`
- `menu_items`
- `media`
- `borradores`
- **Colibri** (modulo de reportes embebibles, ver `docs/colibri.md`):
    - `reportes` (extendida con tipo_id, direccion_id, source_app_id, grupo_id, respuestas jsonb, severidad, prioridad, duplicado_de self-FK, bloqueado_por, sla_at)
    - `reporte_tipos` — catalogo editable con form_schema jsonb por tipo
    - `direcciones_organizacionales` — areas internas del IIEG
    - `source_apps` — huespedes registrados con API keys, dominios CORS, scrubbers PII
    - `colibri_routes` — reglas de fan-out automatico
    - `reporte_grupos` — agrupacion por fingerprint sha256 (dedupe)
    - `reporte_actividad` — audit log de cambios por usuario

Migraciones via Alembic en `api/alembic/versions/`.

**v1.4.0 de MapaLab agrega** 3 tablas a **otra BD** (DataEngine, no a `mariachi`):

- `layers`
- `workspaces`
- `initial_layer_order`

Esas migraciones también viven en Alembic de este repo, pero apuntan a `DATAENGINE_DATABASE_URL`. Implica configurar multi-environment en `alembic.ini` (env `mariachi` vs `dataengine`).

---

## Comandos (Makefile)

```bash
make up            # Levanta el entorno (ENV=dev por defecto)
make down          # Detiene servicios
make build         # Reconstruye imagenes
make logs          # Logs en vivo
make restart       # Reinicia
make clean         # Baja todo + limpia volumenes
make shell-api     # Shell dentro de api
make shell-web     # Shell dentro de web
make shell-admin   # Shell dentro de admin
make setup         # Setup inicial (crea .env desde template, init_db)

# Modo prod
make up ENV=prod
```

---

## Cadena de proxy (gateway externo → mariachi-nginx → api)

En staging/prod, mariachi vive **detrás de un gateway externo** (`gateway-hub`, otro repo). La cadena es:

```
cliente (HTTPS) → gateway-hub (Nginx :443, termina SSL)
              → mariachi-nginx (:80 en iieg-network)
              → mariachi-api (Uvicorn/Gunicorn :8000 en mariachi_network)
```

Implicaciones para el código y la configuración:

- **`uvicorn`/`gunicorn`** se arrancan con `--proxy-headers --forwarded-allow-ips='*'` (`api/scripts/start_backend.sh`). Sin esto, `request.url.scheme` siempre sería `http` aunque el cliente venga por HTTPS.
- **`mariachi-nginx`** preserva los headers `X-Forwarded-Proto` y `X-Forwarded-Host` que ya vienen del gateway (via `map`). Si los sobrescribiera con `$scheme`/`$host` locales, el API creería que la conexión es HTTP y que el host es `mariachi-nginx`.
- **`mariachi-nginx`** define `set_real_ip_from` para los CIDRs privados (`10/8`, `172.16/12`, `192.168/16`). Así `$remote_addr` en logs es el IP real del cliente, no el del último hop interno (gateway-hub).
- **No exponer puertos al host** desde `docker-compose.yml` (prod). Solo `expose: 80` en `iieg-network` para que el gateway pueda alcanzar a mariachi-nginx.
- **`cookie_secure=true`** en `.env.production`: el gateway termina TLS y la cookie se envía sobre HTTPS al cliente. Internamente entre containers la cookie ya está set (no se vuelve a enviar al gateway).
- **CORS**: `cors_origins` en `.env.production` se restringe a los dominios públicos del gateway (`https://iieg.jalisco.gob.mx`), no a IPs internos.
- **Límites de subida de archivos** (v1.38.0+):
    - **Subida directa** (≤ 500 MB): un solo `POST /acervo` con `multipart/form-data`. Timeout de axios = `max(300000, ceil(size/1024) * 2)` ms.
    - **Subida por chunks** (> 500 MB): `POST /acervo/chunked/init` → `POST /acervo/chunked/{session}/part` (chunks de 50 MB, secuenciales) → `POST /acervo/chunked/{session}/complete`. Usa el API multipart nativo de SeaweedFS (S3 `CreateMultipartUpload` / `UploadPart` / `CompleteMultipartUpload`). Sesiones en Redis con TTL de 2 h.
    - **Cadena de proxy**: gateway-hub `client_max_body_size 1G` + `proxy_request_buffering off` en `location ^~ /api/administrador/acervo`. mariachi-nginx idem con timeouts 600s. Gunicorn `--timeout 300`.
- **Drag & drop de archivos en Acervo** (v1.38.2+): los `File` del drop se leen de inmediato (`arrayBuffer`) y se reconstruyen en memoria antes de encolarlos — los arrastres vía document portal/GVFS en Linux caducan en segundos (`net::ERR_FILE_NOT_FOUND`). Archivos > 100 MB no se bufferizan. **Limitación conocida**: navegadores Chromium instalados como **snap** (sandbox AppArmor) nunca pueden leer los archivos arrastrados (el picker sí funciona, va por portal XDG); el frontend lo detecta empíricamente (lote completo ilegible → `localStorage mariachi.acervo.dndUnsupported`), oculta el overlay de arrastre y se auto-rehabilita si un drop posterior entrega archivos legibles. No es detectable por user-agent ni evitable con otra librería (dnd-kit es drag interno de DOM, no recibe archivos del SO).
- **Nombrado del object key** (v1.41.0+): por defecto el key **conserva el nombre original** saneado (`sanitize_filename` en `acervo_file_service.py`: NFKD→ASCII, minúsculas, caracteres inseguros→`-`, bloquea `../`); el `original_name` mostrado coincide con la ruta. El modal ofrece un checkbox `use_uuid` para volver al UUID aleatorio (evita caché obsoleta al reemplazar / no expone el nombre real). `POST /acervo` y `/chunked/init` aceptan `use_uuid` y `on_conflict` (`reject`|`rename`); `resolve_upload_name()` resuelve el sufijo consecutivo (`nombre-2.ext`) cuando `rename`. En chunked la validación de duplicado vive en `init` (antes de subir los chunks).
- **Carga masiva** (v1.41.0+): las colisiones `409` no detienen el lote; se acumulan y al terminar un modal ofrece renombrar/omitir por archivo. El cierre del lote se difiere 200 ms y el drag & drop encola las subidas en un solo paso síncrono para garantizar **un único refresco** del listado al terminar (antes el contador podía tocar 0 entre oleadas → refresco prematuro). `ensure_folder_exists()` crea la carpeta en un savepoint con captura de `IntegrityError` para tolerar subidas concurrentes a una carpeta nueva. Las URLs copiadas/previsualizadas incluyen el dominio vía `toPublicUrl()` (`VITE_ACERVO_PUBLIC_URL` → fallback `window.location.origin`).
- **Miniaturas on-the-fly** (v1.42.0+): genera WebP escalado con **Pillow** (anchos `{120,400,1280}`, q80) y lo cachea en SeaweedFS bajo `.thumbs/{path}/{etag}-w{w}.webp` (ETag en la ruta → auto-invalidante). El SVG se sirve tal cual. `.thumbs/` es prefijo oculto global (`bucket_policies.GLOBAL_HIDDEN_PREFIXES`). Cleanup dirigido (`delete_prefix(".thumbs/{path}/")`) en borrar/mover/borrar-carpeta. Front: grid `w=400`, lista `w=120`, preview `w=1280` + "Ver original" (`acervoService.thumbVariant`). **Despliegue:** requiere rebuild de la imagen `mariachi-api` (dep Pillow). Guía de uso y diagnóstico en vivo en `/mariachi/documentacion` (tab Acervo).
    - **Ruta pública por bucket público** (v1.51.0+): la miniatura que se serializa en `thumbnail` es la ruta **anónima** `GET /acervo/thumb/{bucket_name}/{path}?w=` (router `acervo.public_router`, montado sin `admin_prefix` ni auth). Solo responde para buckets **públicos** (`is_public=true`); un bucket privado devuelve `404`. Así cualquier frontend del ecosistema incrusta miniaturas sin sesión. Sigue existiendo la ruta autenticada `GET /api/administrador/acervo/thumb/{bucket_id}/{path}?w=` (staff); ambas comparten el helper `_serve_thumbnail`.
    - **Derivación por tipo**: `thumbnail_for(bucket_name, name, type, url, is_public)` en `serialize_acervo_file`/`serialize_bucket_only`: raster en bucket **público** → ruta pública; **SVG** → la propia `url`; bucket **privado** o resto → `null` (los privados **no** llevan previsualización, por decisión de producto). Sin migración.
    - **Gateway-hub**: como `location ^~ /acervo/` reescribe y proxya todo a SeaweedFS, se requiere una `location ^~ /acervo/thumb/` (prefijo más largo → gana el matcheo `^~`) apuntando a `mariachi-nginx`. Sin ella `/acervo/thumb/...` llega a SeaweedFS y da `403`. Reusa la zona `acervo_thumb`.
- **429 en miniaturas — fix en el gateway** (v1.42.1+): la ráfaga de miniaturas en buckets grandes (p. ej. `portal`) chocaba con el rate limit del **gateway-hub** y el `Cache-Control: no-store` de la location `^~ /api/administrador/acervo` impedía cachear (cada render repetía la ráfaga). Fix en `gateway-hub` (`1.27.2`): zona `acervo_thumb` (30 r/s) + `location ^~ /api/administrador/acervo/thumb` (burst 120, **sin** `no-store`, deja pasar el `immutable` del thumbnail). En mariachi, el diagnóstico (`ThumbnailDiagnostics`) acota las sondas a un **pool de concurrencia de 6** (antes 48 simultáneas). Requiere redeploy del gateway-hub (`make deploy`).

En **dev** (`docker-compose.dev.yml`) no hay gateway: Vite expone `:3011`, API expone `:8010`. El admin se conecta directo al API por `localhost`. La regla `--proxy-headers` con `--forwarded-allow-ips='*'` sigue activa pero como nadie envía headers, no afecta.

---

## Convención sobre comentarios en código

**No agregar comentarios en código.** El código debe ser auto-explicativo a través de nombres descriptivos, funciones pequeñas y servicios/helpers bien delimitados. Esta regla aplica a backend (Python), frontend (JS/JSX), shell, nginx y migraciones Alembic.

Excepciones acotadas (mismo criterio que `docs/CONVENTIONS_BACKEND.md`):

- Lógica de negocio del dominio cuyo *por qué* no se infiere del nombre (ej. referencia a una regulación fiscal específica, una restricción del proveedor de un servicio externo).
- Workarounds temporales con `TODO:` que explican qué condición tiene que cumplirse para removerlos.
- Advertencias críticas de seguridad que un revisor podría pasar por alto al leer el código.

**No** se agregan docstrings redundantes (la firma con type hints ya documenta), ni docstrings narrativos en migraciones Alembic (más allá del template de `revision id` y `create date`), ni comentarios que repiten lo que el código hace.

Cualquier "por qué" que merezca preservarse va en commit message, PR description, o en este `context.md` / `ARCHITECTURE.md` — donde es discoverable y no envejece junto al código.

---

## Convención sobre GitHub CLI (`gh`)

Antes de ejecutar **cualquier** comando `gh`, consulta primero al usuario describiendo el subcomando, el repo/PR/issue/release destino y el efecto esperado. Espera confirmación antes de correrlo.

Aplica a todos los `gh`, incluyendo los de solo lectura (`gh pr view`, `gh issue list`, `gh auth status`). Razón: cada llamada `gh` es una API call autenticada contra GitHub que puede afectar estado externo (crear/modificar PRs, issues, comments, releases) o consumir cuota. La regla unificada elimina la ambigüedad de "¿qué cuenta como destructivo?".

Excepción: si el usuario en el mismo turno te pidió explícitamente correr el comando, no necesitas re-consultar.

---

## Convención sobre mensajes de commit

**No agregar atribuciones automáticas en el mensaje de commit.** Específicamente, omitir trailers como `Co-Authored-By: Claude ...`, `Generated with Claude Code`, o cualquier firma de herramienta. El historial de git debe leer como si lo hubiera escrito un humano del equipo IIEG.

Aplica también a:
- **Pull request bodies / descriptions**: sin "🤖 Generated with..." ni equivalentes.
- **Issue comments creados via `gh`**: sin firma.

Mantener el formato Conventional Commits (`type(scope): subject` + body opcional explicando el *por qué*). El cuerpo describe la decisión técnica; nada más.

---

## Integracion con MapaLab (v1.4.0)

A partir de v1.4.0 de MapaLab, mariachi expone un **editor de capas del visor** bajo `/mariachi/layers`. Esto implica:

1. **Segunda conexión DB** a DataEngine (`DATAENGINE_DATABASE_URL`).
2. **Nuevo router** `api/app/api/routes/layers.py` con CRUD + reorder + duplicate.
3. **Nuevo router** `api/app/api/routes/geoserver.py` con introspección REST via `httpx`.
4. **Nuevo service** `api/app/services/geoserver_client.py`.
5. **Nuevos modelos** SQLAlchemy para `layers`, `workspaces`, `initial_layer_order` en `api/app/models/layer.py` (usan `DataEngineBase` de `core/database.py`).
6. **Nueva pagina admin** `admin/src/pages/LayersEditor.jsx` con Ant Design Tree + drag & drop.
7. **Validacion** contra GeoServer al crear/editar leaf.
8. **Resolucion de templates InfoBox** en backend (`municipio`, `punto`, `punto_completo`, etc.).

El visor de mapalab consume `GET /mapalab/api/layers/tree` (no pasa por este repo; mapalab tiene su propio backend que lee de la misma tabla `layers` en DataEngine).

Pre-requisitos: credenciales de escritura en DataEngine — ver `docs/DATAENGINE_CREDENTIALS.md`.

### Llaves MapaLab embebibles (v0.48.0 → v0.51.0)

Feature `admin/src/features/mapalab-api-keys/` para administrar el ciclo completo del widget `<iieg-mapalab>` que MapaLab expone a otras instituciones.

- **Modelos:** `mapalab_api_keys` (institución, prefijo + bcrypt de la contraseña, sitios autorizados, capas permitidas, IPs, cuotas, estado), `mapalab_api_keys_eventos` (auditoría de acciones del admin), `mapalab_api_keys_uso_diario` (counters por día), `mapalab_api_keys_embeds` (mapas guardados que no expiran), `mapalab_api_keys_accesos` (auditoría detallada por petición — accesos del embed `config/tree/wms` y llamadas del MCP con `endpoint=mcp`, 90 días retención).
- **Endpoints admin:** CRUD de llaves, `rotate-key`, `revoke/suspend/reactivate`, `events`, `usage`, **`embeds`** (vincular hash existente o `embeds/from-layers` que genera el share desde mariachi llamando a mapalab `POST /shares`), **`accesos`** (filtros por rango de fechas, sitio, capa, resultado, endpoint + paginación).
- **Endpoints internos** (X-Internal-Token compartido con mapalab-backend): `validate` (mapalab valida cada key, devuelve `dominiosPermitidos` para defense-in-depth en cliente), `usage` (batch de counters), **`accesos`** (batch de registros de acceso), `embed/cache/invalidate` (al rotar/revocar la key).
- **UI:** fila expandible con tabs `[Datos de la llave] [Armar y previsualizar mapas] [Auditoría]`. El editor inline reemplazó al drawer lateral. Cuatro botones de acción visibles (✎ Editar / 👁 Previsualizar / 🔎 Auditoría / ⋮ Más con dropdown de rotar/pausar/cancelar/eliminar); el botón Auditoría abre la pestaña directa y funciona aun en llaves revocadas. La pestaña Auditoría muestra accesos del embed y llamadas del MCP (`endpoint=mcp`, herramienta en `motivo`). Selector visual de capas con `TreeSelect` que carga el árbol completo del visor. Generación de mapas inline: el admin elige capas, configura la vista moviendo el preview, le pone una etiqueta y guarda como embed permanente con un click. Mariachi se encarga de crear el share en mapalab + pin permanente atómicamente.
- **PostMessage bidireccional con el iframe del preview:** captura `mapalab:viewchange` para llenar inputs de centro/zoom en vivo y envía `mapalab:setview` para "cargar vista guardada" sin recargar el iframe.
- **Lenguaje no técnico:** todo el feature en español plano para servidores públicos. Sin jerga ("llave" en vez de "API key", "código de mapa" en vez de "hash", "sitio autorizado" en vez de "dominio permitido", "contraseña" en vez de "key plana", "generar contraseña nueva" en vez de "rotar"). Todos los Alert con botón ×, salvo el modal de revelación de contraseña (intencional). Placeholders con `Ejemplo: …` en cada input. Modales `Modal.confirm` para acciones destructivas (no Popconfirm).
- **Cron de retención:** `scripts/purge_mapalab_accesos.py` ejecutado por `mariachi-cron-sieej` cada ciclo. Variable `MAPALAB_ACCESOS_RETENTION_DAYS` (default 90).
- **Documentación:** `mapalab/docs/widget.md` (contrato público), `mapalab/docs/planes/widget-pendientes.md` (gobernanza pendiente: clasificación, T&C versionados, linaje, SLA, notificaciones).

---

## Modulo Colibri (v0.42.0–0.46.1)

Colibri es el sistema centralizado de reportes embebibles del IIEG. Vive como modulo dentro de `mariachi/` (no como repo separado) y expone una API publica `/api/public/reportes` consumida por widget + SDK + integraciones server-side. La arquitectura completa esta en `docs/colibri.md`. Resumen de lo que aporta al monorepo:

1. **Backend (`api/app/`)**: 6 modelos nuevos (ReporteTipo, DireccionOrganizacional, SourceApp, ColibriRoute, ReporteGrupo, ReporteActividad) + extension de Reporte con workflow granular. 8 migraciones Alembic con seed/backfill. 5 routers admin (`/colibri/{tipos,direcciones,source-apps,routes,stats}`) + reportes extendido + endpoint publico endurecido. 4 services (`colibri_keys`, `colibri_fingerprint`, `pii_scrubber`, `colibri_router_engine`).

2. **Panel admin (`admin/src/features/colibri/`)**: 7 paginas (Resumen, Reportes con toggle plano/agrupados, Tipos con form builder, Direcciones, SourceApps con rotacion de keys + modal "muestra-una-vez", Routes con fan-out, Integracion con preview en vivo). Sidebar reorganizado: Colibri es proyecto del CMS con `allowedGlobalRoles` para tetlamamakani/editora.

3. **Widget (`widget/`)**: paquete Lit + Vite con 3 Custom Elements (`<colibri-button>`, `<colibri-trigger>`, `<colibri-form>`). Bundle 49.5 KB / 13.8 KB gzip servido en `/colibri/widget/colibri-widget.v1.js` con CORS abierto. Shadow DOM, form dinamico, screenshot opcional. **API global `window.colibri`**: `identify(user)` para asociar sesion con cada reporte, `setContext(key, value)` y `clearContext()` para enriquecer `source_context.custom` (snapshot de mapa, capas activas, etc.), `openPanel({ sourceApp, apiKey })` para disparar el panel programaticamente desde un boton React/HTML del huesped sin renderizar Custom Elements visibles. CSS vars `--offset-x` y `--offset-y` separadas para alinear el FAB respecto a UI existente.

4. **SDK (`sdk/`)**: paquete TypeScript publicable a npm como `@iieg/colibri-sdk`. Cliente HTTP con tipos + 5 errores tipados (Auth/Validation/RateLimit/Forbidden/Network). 6.9 KB raw / ~2 KB gzip.

5. **Docs publicas (`nginx/static/colibri-docs/`)**: HTML standalone 24.7 KB sin dependencias, servido en `/colibri/docs/` sin auth. Live preview, copy-paste snippets, dark mode automatico.

### Integracion con multi-tenancy

Cada huesped es un `source_app` registrado con su propia API key (hash bcrypt sobre sha256 del plaintext, prefix de 12 chars visible para identificar). Las keys `ck_pub_*` validan CORS estricto contra `dominios_permitidos` (soporta wildcards `*.iieg.gob.mx` y `*`). Las `ck_priv_*` no validan CORS pero requieren prefix correcto. Rate limit configurable por huesped y por IP.

### Hardening implementado

- **PII scrubbing**: regex defaults para JWT, tokens en query, Authorization header, CCN. Extensible por `source_app.scrubbers`. Modo `disable_pii` purga UA, viewport, identify, breadcrumbs y email_contacto antes de persistir.
- **Dedupe**: fingerprint sha256 determinista de `(tipo + source_app + ruta_normalizada + mensaje[:200])` que normaliza queries y path params numericos. Lookup-or-create atomico con `SELECT FOR UPDATE SKIP LOCKED`. Panel admin tiene toggle `Lista | Agrupados`.
- **Audit log**: cada `PATCH /reportes/{id}` registra una fila por campo cambiado en `reporte_actividad` con `{campo, anterior, nuevo}` y `actor_id`. Drawer admin muestra Timeline.
- **Workflow granular**: `severidad` (baja/media/alta/critica), `prioridad` (P0..P3), `duplicado_de` self-FK con guarda de auto-referencia, `bloqueado_por` text libre, `sla_at` datetime (calculo automatico pendiente).
- **Fan-out best-effort**: al crear reporte, dispatcha async a Discord/Slack/webhook generico segun reglas en `colibri_routes`. Errores no bloquean la creacion.

### Pendiente bloqueado

Pagina publica de seguimiento por token: requiere que IIEG defina politicas de retencion de email, uso permitido, consentimiento explicito y derechos ARCO. Implementacion tecnica trivial (1-2 dias) pero el bloqueo es 100% normativo.

---

## Modulo Eventos (mapalab-eventos)

Eventos es el modulo del CMS para curar piezas de contenido visual destacadas en el visor de mapalab (campañas tematicas, hitos, lanzamientos). Cada evento agrupa: capas pre-seleccionadas (con auto-activacion), bbox de zoom inicial, etiquetas/separadores en el menu lateral, imagen de portada, y metadata textual. Vive en `api/app/api/routes/eventos.py` + `app/models/evento.py` + `app/schemas/evento.py` y `admin/src/features/mapalab-eventos/`.

### Workflow

`EventoEstado` enum es la single source of truth (`draft` → `review` → `published`). Modelos, schemas, routes y `borrador_service` lo consumen del mismo enum. Combinado con `activo: bool` da la matriz documentada en CHANGELOG §[0.41.0]:

- `draft` + `activo` no visible en viewer (filtrado en `get_evento_visible_or_404`).
- `published` + `activo=true` indexable por el indice parcial `ix_eventos_publicados_visibles ON eventos (orden ASC, id ASC) WHERE estado='published' AND activo=true`.

Solicitar revision crea un `borrador` con `resource_type='evento'`. `tetlamamakani` aprueba en `RevisionQueue`. `_apply_evento` rechaza con 409 si el evento se modifico en paralelo despues de solicitar la revision (concurrencia optimista).

### Endpoints publicos

`GET /api/mapalab/eventos` y `GET /api/mapalab/home` con cache versionado en Redis (`services/mapalab_public_cache.py`). Clave: `mapalab:public_cache:payload:{scope}:{version}`. Cache hit sirve `Response(content=cached_json, media_type='application/json')` sin re-validar Pydantic. Cualquier write hace bump del `version` de scope (sin debounce — cada bump es un `SET` directo barato). El visor poll `/cache-version` cada 30s, pausando con `visibilitychange→hidden`.

### Hardening

- **RBAC + CSRF + rate limit**: `staff_dep` para todos los writes. CSRF en `PUT /presencia`. 60 writes/min por usuario.
- **Validacion**: `CapaRef` exige `workspace+geoserverLayer` si `tipo='capa'` (etiquetas tipo separador no necesitan); `BBox` clampa coords a EPSG:4326; `_validate_image_url` permite `http(s)://`, `data:image/`, `/acervo/`, ruta relativa, y paths del acervo `bucket/object` solo si el bucket esta en `KNOWN_ACERVO_BUCKETS` (`api/app/core/bucket_policies.py`: `portal`, `mapalab`, `iieg`, `mariachi`, `sieej`, `dataengine`); rechaza buckets desconocidos, path traversal (`..`), `javascript:` y URLs > URL_MAX_LENGTH.
- **Robustez del listado publico**: `GET /api/mapalab/eventos` (`routes/public.py`) serializa cada evento dentro de un `try/except` y omite del listado los que fallan validacion (loggeando warning con el `id`), para que un dato malformado puntual no tire el endpoint completo y haga desaparecer todos los eventos del visor.
- **Performance**: `bbox` y `capas` en JSONB; `presence.list_others` usa `SCAN_ITER` (no bloqueante); datetimes con timezone (`timestamp with time zone`) para evitar drift en comparaciones.
- **Tests**: 41 tests cubriendo RBAC, validacion, concurrencia, lifecycle, CSRF.

### Editor admin (`admin/src/features/mapalab-eventos/`)

- `EventoEditPage` con `Tabs` verticales y `forceRender: true` por item (sin esto `getFieldsValue` devolvia `undefined` al guardar campos en tabs lazy).
- `BBoxField` con 3 modos: "Sin zoom" (`bbox=null`), "Coordenadas manuales" con switch CRS **EPSG:4326** ↔ **EPSG:6368** (UTM 14N, reproyeccion frontend con `proj4`), "Dibujar en mapa" con OpenLayers + base CARTO Light. Deps: `ol@^10.9` y `proj4@^2.20`. `BBoxField` memoizado para no recrear `Draw` en cada render.
- `CapasField` permite agregar capas existentes (registradas en `mapalab.layers`) o materializa una capa "solo GeoServer" como leaf bajo el padre `eventos-auto` via `POST /layers/auto-leaf` (idempotente). `AddCapaModal` exige un **nombre humano** distinto al identificador GeoServer para capas no registradas — input inline con validación case/`_`/`-`/espacios y botón "Agregar" deshabilitado con tooltip si está vacío o coincide con el slug; las capas ya registradas mantienen su `label` del catálogo. El orden definido en la tabla (drag & drop via `@dnd-kit/sortable`) controla el Z del mapa cuando el evento se abre: primera fila = al frente, última = al fondo. Texto secundario sobre la tabla lo documenta para el editor.
- `LayerContentDrawer` reusable con tabs Tarjeta · Aviso · Metadatos · Simbologia, montado desde `CapasField` para editar contenido sin navegar al `LayerEditPage`. La tab Aviso usa `NoticeStandalone` (espejo de `InfoboxStandalone`) que guarda `notice` vía `updateLayer` (PUT parcial). El mismo drawer se monta desde la pestaña "Eventos" del árbol de capas (`LayerEditPage`): click en una capa de evento abre el drawer (`setEventoLayerId`) en lugar de navegar — antes el click no mostraba nada porque el tab del árbol no cambiaba y las auto-leaves bajo `eventos-auto` están filtradas del catálogo.
- Editor del aviso (`LayerNoticeSection`, admin 1.26.0): la visibilidad por zoom usa `ZoomRangeField` (`shared/components/`, helpers en `shared/utils/zoomScale`) — un `Slider` de rango con marcas semánticas (Estado · Municipio · Ciudad · Colonia · Calle) calibrado al rango real del visor (`8`–`18`); reemplazó a dos `InputNumber` que permitían invertir mín/máx (origen de `zoomRange` invertidos que rompían la visibilidad). `ZoomRangeField` tiene modo `single`, reutilizado en el zoom inicial del playground de API keys. El selector de tamaño incluye "Mínimo" (`compact`, requiere api 1.25.0). El botón "Guardar aviso" del drawer es sticky en desktop (con el `top` de la preview calculado por la altura de la barra; no sticky en mobile).
- Cada fila de `CapasField` tiene un toggle **"Visible"** (`oculto` en `CapaRef`) que la oculta del visor sin quitarla del evento. El filtrado vive en `EventoPublicResponse._drop_hidden` (recursivo: capas, y categorías/etiquetas con su subárbol); el editor admin (`EventoResponse`) las conserva. Sin migración (JSONB).
- `EventosListPage` con busqueda + filtro estado.
- Visor (`mapalab/frontend/.../EventoMenu.jsx`): renderiza etiquetas como `LabelItem`, auto-activa capas con `autoActivar=true` al abrir el menu (itera `toActivate` en orden inverso para que el primer ítem del editor quede al frente en `activeLayerIds` — compensación al `unshift` de `handleToggleLayer`), boton "Eliminar (N)" para apagar capas externas activas.

Ver `docs/CHANGELOG.md` §[0.41.x] y §[Unreleased] para detalle de cambios por commit.

---

## Modulo Telemetría MapaLab (v0.52.0)

Sistema de ingesta de eventos anónimos del visor MapaLab + panel admin con KPIs. Complementa a Colibri (que captura reportes formales del usuario) midiendo uso pasivo: capas más activadas, herramientas, swipe, descargas, etc.

### Modelo y persistencia

- `mapalab_events` (append-only): `id`, `ts`, `event_name`, `session_id` UUID, `source` (`visor`/`embed`/`widget`), `api_key_id` opcional, `layer_id` desnormalizado, `props` JSONB, `ip_hash` (sha256 + salt diario), `ua_family`. Índices: `ts DESC`, `(event_name, ts DESC)`, `session_id`, parcial sobre `layer_id`, GIN sobre `props`.
- `mapalab_sessions` (rollup por sesión): `session_id` PK, `started_at`, `last_seen_at`, `events_count`, `duration_sec`, `layers_activated`, flags booleanos (`used_swipe`, `used_drawing`, `used_measurement`, `downloaded`, `shared`, `reported`).
- **Rollups diarios persistentes** (tablas, no matviews; nunca se purgan): `mapalab_rollup_{daily,layers,buttons,tools,eventos,themes}` y MCP `mapalab_mcp_rollup_{daily,tools,clients}`. El job `rollup_stats` (servicio `mapalab_telemetry`) recomputa los últimos 3 días desde los crudos y hace upsert idempotente (DELETE+INSERT de la ventana), corre cada 30 min via cron. Las filas históricas persisten indefinidamente aunque los crudos se purguen, lo que permite consultar **cualquier rango histórico con granularidad día/mes/año**. Reemplazó a las matviews de ventana fija (30d/7d/1d/90d), eliminadas en la migración `f8b9c0d1e2f3` (con backfill desde los crudos). `unique_sessions`/`clients`/latencias agregados sobre varios días son aproximaciones (una sesión a caballo entre dos días se cuenta en ambos); se quitó `p95` de tools MCP por no ser sumable. Migración previa: `c9d8e7f6a5b4` creó las tablas crudas.

### Endpoints

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/public/mapalab/events/batch` | Ingesta pública sin auth, rate limit 120/min/IP. Allowlist de 37 event names. Scrubbing PII con `pii_scrubber` de Colibri. Lote máx 100 eventos, `props` máx 4 KB. |
Todos los GET de lectura (excepto `/highlights`) aceptan `date_from`, `date_to` (YYYY-MM-DD) y `grain` (`day`/`month`/`year`); default = últimos 30 días, grain día. `grain` solo afecta el bucketing de las series `/daily` y `/mcp/daily`; el resto solo usa el rango.

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/administrador/mapalab-stats/overview` | KPIs del rango (sesiones, eventos, duración media, % swipe/dibujo/descarga/compartir, reportaron) |
| GET | `/api/administrador/mapalab-stats/layers?limit=N` | Top capas del rango con label/workspace enriquecidos desde `/mapalab/api/layers/tree`. `activations` excluye auto-activaciones de evento (`props.source='evento_open'`); el toggle manual sí cuenta |
| GET | `/api/administrador/mapalab-stats/eventos?limit=N` | Top eventos (`mapalab_rollup_eventos`): opens/closes/fun_facts/centers/shares/sesiones unicas por `evento_id`. El `titulo` se resuelve al nombre actual desde `eventos` |
| GET | `/api/administrador/mapalab-stats/themes?limit=N` | Top temas por aperturas (`mapalab_rollup_themes`): views/sesiones únicas por `theme_id`. Enriquecido con label/workspace/nodeType desde `/mapalab/api/layers/tree`. Filtra solo nodos raíz de tipo `tema` (excluye categorías/capas desplazadas a raíz) |
| GET | `/api/administrador/mapalab-stats/buttons` | Clicks por evento (sider_lock, logo_click, share_map, etc.) |
| GET | `/api/administrador/mapalab-stats/tools` | Uso de herramientas de dibujo/medición |
| GET | `/api/administrador/mapalab-stats/daily` | Serie temporal por origen, bucketeada por `grain` |
| GET | `/api/administrador/mapalab-stats/sessions?page&page_size&source` | Sesiones paginadas con filtros + rango (lee crudos, limitado a la retención de `mapalab_sessions`) |
| GET | `/api/administrador/mapalab-stats/mcp/{overview,tools,daily,clients}` | Telemetría del servidor MCP, también por rango |
| GET | `/api/administrador/mapalab-stats/highlights` | Payload compacto (4 KPIs, fijo 30d) para el Inicio |
| POST | `/api/administrador/mapalab-stats/refresh` | Recompute manual de rollups (admin + CSRF) |

### Panel admin (`admin/src/features/mapalab-stats/`)

- `MapalabStatsPage` con tabs internas en URL (`?tab=resumen|mcp|sesiones`) y un `PeriodSelector` global (granularidad Día/Mes/Año + `RangePicker` que conmuta a picker month/year) en la cabecera; el rango/granularidad seleccionados se propagan a las 3 tabs (Resumen, MCP, Sesiones). Resumen y MCP para staff, Sesiones solo admin. El subtítulo muestra el rango activo.
- La sección Eventos ("Eventos más abiertos") va **arriba** de "Capas más usadas" en Resumen.
- `InicioHighlights` montado en `/inicio` después de "Plataformas del ecosistema": 4 KPIs compactos (fijo 30d) con link "Ver detalle →".
- Hooks de fetching reciben `period` (cache key por `grain|from|to`) + service axios que manda `date_from`/`date_to`/`grain` + catálogo de labels (`BUTTON_LABELS`, `TOOL_LABELS`, `SOURCE_LABELS`).

### Operaciones

- `scripts/refresh_mapalab_stats.py`: recompute de rollups (`rollup_stats`) manual/cron. `make refresh-mapalab-stats`.
- `scripts/purge_mapalab_events.py`: retención configurable. `make purge-mapalab-events`.
- `scripts/postgres-backup.sh`: corre purga antes del dump (skipeable con `MAPALAB_PURGE_ON_BACKUP=false`). `pg_dump` sin filtros incluye tablas + matviews automáticamente.
- `make install-backup-cron` instala dos cronjobs: `0 3 * * * postgres-backup.sh` (con purga incluida) y `*/30 * * * * refresh_mapalab_stats.py`.

### Variables de entorno relevantes

- `MAPALAB_EVENTS_RETENTION_DAYS` (default 90) — días de retención de eventos crudos antes de purgar
- `MAPALAB_SESSIONS_RETENTION_DAYS` (default 180) — días de retención de rollups de sesión
- `MAPALAB_PURGE_ON_BACKUP` (default `true`) — purgar antes de cada backup
- En mapalab frontend (v1.27.0+): `VITE_MARIACHI_PUBLIC_API_HOST` para apuntar al collector, `VITE_TELEMETRY_ENABLED=false` para apagar el collector dejando GA4 intacto.

### Privacidad

- Anónimo: solo IP hasheada con salt diario + familia del User-Agent
- Allowlist de event names (35) — rechaza eventos no registrados
- Scrubbing PII reutiliza el de Colibri (JWTs, tokens en URL, Authorization, CCN)
- Frontend honra Do-Not-Track del navegador automáticamente

---

## Ecosistema

Este repo se integra con otros servicios internos vecinos (CMS, visor de mapas, DataEngine PostgreSQL+PostGIS, gateway Nginx, almacenamiento S3-compatible, GeoServer, stack de observabilidad) que comparten una red Docker común. Los detalles de topología son internos.

---

## Cambios recientes

### 2026-07-10 (admin v1.51.0 + api v1.51.0) — Acervo: miniaturas por ruta pública anónima (buckets públicos) + snippets de integración

La miniatura serializada en `thumbnail` pasa de la ruta autenticada `/api/administrador/acervo/thumb/{bucket_id}/...` a la ruta **pública anónima** `/acervo/thumb/{bucket_name}/{path}?w=`, para que cualquier frontend del ecosistema incruste miniaturas de buckets **públicos** sin sesión. Puntos clave:

- **Backend**: nuevo `acervo.public_router` (`GET /acervo/thumb/{bucket_name}/{path}?w=`, sin auth) que reusa `_serve_thumbnail`; devuelve `404` si el bucket no es público. `thumbnail_for(...)` recibe `is_public`: raster público → ruta pública, SVG → `url`, **privado → `null`** (los privados no llevan previsualización, por decisión de producto). La ruta autenticada por `bucket_id` sigue disponible para staff. Fix: `eliminar_archivo` recupera su `return` (se había quedado sin valor).
- **Gateway-hub**: nueva `location ^~ /acervo/thumb/` → `mariachi-nginx` (antes que `^~ /acervo/` → SeaweedFS, que si no devolvía `403`). Requiere `make deploy` del gateway-hub.
- **Admin — snippets contextuales por archivo**: cada imagen del Acervo tiene un botón `</>` (`CodeOutlined`, en vista lista y grid) que abre `FileSnippetsModal` con los snippets **generados desde la ruta real** del archivo (`<img>` directo, miniatura WebP, `srcSet` 120/400/1280 y `<Image>` de AntD con preview), copiables con un clic; usa `toPublicUrl`/`thumbVariant`. Para buckets privados solo ofrece la URL del proxy (sin miniatura). La doc `/mariachi/documentacion` (tab Acervo) se reorganizó en **2 pestañas** ("Uso del panel" y "Miniaturas y URLs"); se eliminó la pestaña de ejemplos estáticos en favor del botón por archivo.

### 2026-07-09 (admin v1.49.0 + api v1.49.0) — SIEEJ: editor de campos inline con vista previa + tabs del repeater + validation.pattern

Lote de mejoras en el creador visual de definiciones SIEEJ del admin y en el validador del backend. Detalle por feature en CHANGELOG §[api 1.49.0 / admin 1.49.0]. Resumen ejecutivo:

- **Editor de campos inline** (`FieldForm.jsx`, `FieldPreview.jsx`, `fieldUtils.js`, `FieldsList.jsx`): el editor deja de ser un Drawer modal y se colapsa sobre el propio item. Vista previa en vivo de todos los tipos de campo en una segunda columna sticky. Para el tipo archivo, bucket Acervo como `Select` (desde `useAccessibleBuckets`) y extensiones como tags multi. `patternMessage` configurable. Flujo "tipo primero". Fix del autocompletado del nombre interno. Confirmación al eliminar campo. Se elimina `FieldDrawer.jsx`.
- **Tabs internos del repeater** (`StepDrawer.jsx`): editor de filas (`Form.List`) con id/título validados en vez del textarea `id | titulo`. `StepsList.jsx`: acciones a la izquierda del título del paso, editar solo-icono y confirmación al eliminar paso.
- **API** (`definicion_validator.py`): valida `validation.pattern` (regex compilable) y `validation.patternMessage` (string) para text/textarea/email/tel; `definicion_to_validation_rules` exporta el `patternMessage`.

### 2026-07-06 (admin v1.48.0 + api v1.48.0) — SIEEJ: MemberPicker + incompleteNotice + tabs en editor + Reabrir envios + grupos con miembros

Lote de mejoras en el modulo SIEEJ del admin y backend. Detalle por feature en CHANGELOG §[api 1.48.0 / admin 1.48.0]. Resumen ejecutivo:

- **MemberPicker** (`components/MemberPicker.jsx`): `Transfer` de AntD con busqueda por `username`/`name`/`email` reemplaza los `Select mode="multiple"` en `GruposPage` y `AsignacionesEditor` que no escalaban con muchos usuarios. Reutilizable, compatible con `Form.Item`.
- **Editor visual** (`StepsList.jsx`): pasos en **tabs** horizontales con drag & drop en las pestañas (dnd-kit), tags mini de tipo y aviso, botones solo-icono en mobile. Tipos en español via `definitionTypes.js`.
- **incompleteNotice**: validacion backend (`_validar_incomplete_notice`) + UI en `StepDrawer`. El respondent ve un modal no bloqueante al avanzar con campos vacios.
- **Reabrir envios** (`EnviosTable.jsx`): boton "Reabrir" con confirmacion que devuelve un envio `enviado`/`expirado` a `en_proceso`. Deshabilitado si formulario cerrado/fuera de vigencia. Columna Usuario con nombre + email en tooltip.
- **Grupos con miembros atomicos**: `POST /sieej/grupos` acepta `usuarios: int[]`, validacion 400 si IDs inexistentes, transaccion atomica. Creacion/edicion por modal con `MemberPicker`.
- **FormularioResponse** incluye `grupos` y `usuarios_asignados` (schemas `GrupoRef`/`UsuarioRef` + `selectinload`), corrigiendo bug de selects vacios.
- **usuario_nombre/usuario_email** resueltos en lote en `listar_envios`.

### 2026-06-19 (admin v1.43.0 + api v1.43.0) — Recursos GeoServer: carga múltiple y por chunks

La página **Recursos GeoServer** (`/mapalab/recursos-geoserver`, feature `mapalab-geoserver-files`) ahora sube **varios archivos a la vez** y **archivos grandes** (hasta 200 MB) replicando el patrón del Acervo. Como GeoServer REST hace un único PUT (no multipart S3), las partes se acumulan en Redis (`services/geoserver_chunked.py`, chunks de 25 MB, TTL 2 h) y al completar se ensamblan en *streaming* hacia GeoServer (`GeoServerClient.put_style_file_streaming`). Endpoints nuevos: `POST /geoserver/files/chunked/{init,/{session}/part,/{session}/complete}` (rate limit `geoserver_chunk`). El endpoint single (`POST /geoserver/files`, ≤5 MB) queda intacto; el front (`uploadGeoserverFileSmart`) elige single vs chunked por tamaño, reintenta ante `429` y reporta progreso por archivo. Detalle en CHANGELOG §[api 1.43.0 / admin 1.43.0].

### 2026-06-19 (admin v1.43.0 + api v1.43.0) — Diagnóstico de miniaturas: omitir SVG

El diagnóstico en vivo del tab Acervo de `/mariachi/documentacion` ahora **excluye los SVG** y solo evalúa imágenes raster (PNG/JPG/GIF/WebP), que es lo que de verdad se comprime a WebP; el SVG se sirve tal cual. Cambio acotado a `ThumbnailDiagnostics` + texto de la sección. Detalle en CHANGELOG §[api 1.43.0 / admin 1.43.0].

### 2026-06-19 (admin v1.42.1 + api v1.42.1) — Fix 429 en miniaturas del Acervo (gateway) + concurrencia acotada

Al abrir buckets con muchas imágenes (`portal`) algunas miniaturas daban `429`. Causa de fondo en **gateway-hub** (rate-limit bajo de la zona `api` + `Cache-Control: no-store` que impedía cachear → cada render repetía la ráfaga); corregido en gateway-hub `1.27.2` con zona `acervo_thumb` (30 r/s) y `location ^~ /api/administrador/acervo/thumb` (burst 120, sin `no-store`). En mariachi, el diagnóstico de miniaturas pasa a un **pool de concurrencia de 6** (antes hacía hasta 48 sondas simultáneas). Requiere redeploy del gateway-hub. Detalle en CHANGELOG §[api 1.42.1 / admin 1.42.1].

### 2026-06-17 (admin v1.42.0 + api v1.42.0) — Acervo: miniaturas WebP on-the-fly + sección de documentación

Las imágenes del Acervo ya no se descargan completas para mostrarse: `GET /acervo/thumb/{bucket_id}/{path}?w=` genera miniaturas **WebP** con Pillow (anchos `{120,400,1280}`) y las cachea en SeaweedFS bajo `.thumbs/{path}/{etag}-w{w}.webp` (ETag en la ruta → auto-invalidante; prefijo oculto global). El SVG se sirve tal cual. El `thumbnail` se deriva por tipo en la serialización (sin migración) y se limpia la caché al borrar/mover. Front: grid `w=400`, lista `w=120`, preview `w=1280` + "Ver original". Nueva sección **Acervo** en `/mariachi/documentacion` con guía de herramientas y un **diagnóstico de miniaturas en vivo** (peso por variante, % vs original, URL copiable). **Requiere rebuild de `mariachi-api`** (dep Pillow). Detalle en CHANGELOG §[api 1.42.0 / admin 1.42.0].

### 2026-06-17 (admin v1.41.0 + api v1.41.0) — Acervo: nombre original por defecto, UUID opcional y carga masiva robusta

Las subidas al Acervo conservan por defecto el **nombre original** saneado en el object key (URLs legibles); un checkbox `use_uuid` en el modal permite volver al UUID aleatorio. `POST /acervo` y `/chunked/init` aceptan `use_uuid` y `on_conflict` (`reject`|`rename`); con `rename` se agrega sufijo consecutivo (`nombre-2.ext`) vía `resolve_upload_name()`. En carga masiva las colisiones `409` ya no detienen el lote: se acumulan y al terminar un modal ofrece **renombrar u omitir** por archivo. Fix del refresco: el cierre del lote se difiere 200 ms y el drag & drop encola síncronamente (antes el contador tocaba 0 entre oleadas → refresco prematuro + error); `ensure_folder_exists()` usa savepoint + `IntegrityError` para subidas concurrentes a carpeta nueva. Las URLs copiadas/previsualizadas incluyen el dominio (`toPublicUrl()`). Detalle en CHANGELOG §[api 1.41.0 / admin 1.41.0].

### 2026-06-01 (admin v1.24.0 + api v1.23.0) — Ocultar capas dentro de un evento sin quitarlas

`CapaRef` gana el flag `oculto: bool = False`. En el editor de Eventos (`CapasField`) cada fila (capa/etiqueta/categoría) tiene un toggle "Visible" (`Switch` con íconos de ojo) que la oculta del visor público sin removerla del evento; las filas ocultas muestran un tag naranja "Oculto". El backend filtra recursivamente las entradas `oculto=true` en `EventoPublicResponse` (usado por `GET /api/mapalab/eventos` y `GET /eventos/{id}/preview`), incluyendo capas dentro de categorías y descartando categorías/etiquetas ocultas con su subárbol; `EventoResponse` (admin) las conserva. `normalizeCapas` en `EventoEditPage` preserva `oculto` al cargar. Sin migración (`capas` es JSONB). Detalle en CHANGELOG §[admin 1.24.0] y §[api 1.23.0].

### 2026-06-02 (admin v1.25.0 + api v1.24.0) — Desactivar items del Home de MapaLab sin eliminarlos

Cada item de las secciones `guide` (Guía), `select` (Opciones), `faq` (Preguntas) y los `subtopics` de `topics` (Temas) gana un toggle "Activo" en el editor del Inicio (`sectionEditors.jsx`), para "apagarlos" temporalmente del home público sin borrarlos ni perder su orden/configuración. Banner, Temas y Video ya lo tenían vía su `Switch`. Schema (`schemas/home_section.py`): `GuideItem`/`SelectItem`/`FaqItem`/`SubtopicItem` ganan `activo: bool = True` (sin migración — el payload es JSON; los items sin el campo se interpretan como activos). El filtrado efectivo lo hace el visor de MapaLab (v1.65.0): `buildGuide`/`buildSelect`/subtopics filtran `activo !== false`, y `buildFaqContent` devuelve `null` si no queda ninguna pregunta activa (cae al FAQ bundled). El `ItemListEditor` acepta `newItemDefaults` para que los items nuevos nazcan activos. Detalle en CHANGELOG §[admin 1.25.0] y §[api 1.24.0].

### 2026-06-01 (api v1.22.0) — Perf + resiliencia: `/sistema/plataformas` paralelizado + engine DataEngine con `connect_timeout`

Disparado por alertas `HighLatency` en prod (p95 ~4.9s en mariachi-api). El handler `/sistema/plataformas` hacía 7 health-checks **secuenciales** con `httpx.Client` síncrono dentro de un `async def` (sumaba hasta ~14s y bloqueaba el event loop); ahora son `httpx.AsyncClient` + `asyncio.gather` (tiempo total ≈ el probe más lento, ~2s peor caso). Además, el engine de DataEngine tenía `pool_pre_ping=True` **sin `connect_timeout`**: con el puerto de DataEngine aún sin abrir en prod, el `connect()` colgaba por el TCP SYN timeout del SO y el pre-ping reintentaba, propagando latencia a todos los endpoints que tocan DataEngine. Se agregó `connect_args={"connect_timeout": 3}` (var `DATAENGINE_CONNECT_TIMEOUT`) + `pool_recycle=1800` (var `DATAENGINE_POOL_RECYCLE`). Nota operativa: la regla de alerta `HighLatency` ya excluía mariachi desde el 2026-05-18 (huachicol), pero el Prometheus de prod no había recargado reglas; los `+Inf` eran falsos positivos por división 0/0 (avg sin tráfico). Detalle en CHANGELOG §[api 1.22.0].

### 2026-06-01 (admin v1.23.0) — Edición de capas de eventos desde el árbol + tab "Aviso" en el drawer

Dos fixes en el flujo de edición de capas asociadas a eventos. (1) En la pestaña "Eventos" del árbol de capas (`LayerEditPage`), hacer click en una capa de un evento ahora abre el `LayerContentDrawer` (`setEventoLayerId`) en lugar de navegar a `/mapalab/layers/<id>/edit`: antes el click no mostraba nada porque el tab del árbol permanecía en "Eventos" (sin editor inline) y las auto-leaves bajo `eventos-auto` están filtradas de `catalogTreeData`. (2) Nueva tab "Aviso" en el `LayerContentDrawer` vía `NoticeStandalone` (espejo de `InfoboxStandalone`), que guarda `notice` con `updateLayer` (PUT parcial, `exclude_unset=True`). Como `CapasField` reusa el drawer, la tab aparece también en el editor del evento. Sin cambios de backend ni schema (`LayerUpdate.notice` ya existía). Detalle en CHANGELOG §[admin 1.23.0].

### 2026-05-29 (admin v1.22.0) — Banner del home: logo por item respetado en mobile + descripción y CTA opcionales

Iteración sobre el banner del home (introducido en `[1.20.0]`). En mobile y tablet el logo del banner estaba hardcoded al `<Logo name="mapalab">` bundled aunque cada banner del carrusel traía su propio `logoUrl`; ahora aplica el mismo patrón condicional que ya existía en desktop XXL (si hay `logoUrl` usa `<img>`, si no cae al `<Logo>` bundled). Descripción y CTA pasan a ser realmente opcionales: el `banners.map` del visor deja de hacer fallback al texto bundled, y el render del `<p>` de descripción y del `<Link>` del botón se hace condicional (el botón solo aparece si están los dos campos del CTA). Editor admin actualizado con labels "(opcional)" y `help` texts explicando el comportamiento. Sin cambios de schema (el backend ya aceptaba `''` como default en estos 3 campos). Lado mapalab: v1.59.0. Detalle completo en CHANGELOG §[admin 1.22.0].

### 2026-05-28 (v1.20.0) — Banner del home con fondo personalizable (imagen + gradient editable)

El banner del home de MapaLab (`HomeSectionsPage` → sección `banner`) ahora permite subir imagen de fondo distinta para mobile y desktop, además de editar los colores y ángulo del gradiente que se aplica cuando no hay imagen. Schema `BannerItem` extendido con 5 campos opcionales (`imagen_url_mobile`, `imagen_url_desktop`, `gradient_from`, `gradient_to`, `gradient_angle`), sin migración porque el payload es JSON. Editor admin con 3 `ImageUrlField`, 2 `ColorPicker` y 1 `Select` de ángulo. Visor mapalab con lógica condicional por breakpoint: si hay imagen aplica `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(bg)` (scrim fijo para legibilidad); si no hay imagen aplica el gradient editable. El mockup flotante de desktop (`imagen_url`) pasa a ser opcional. Lado mapalab: v1.57.0. Detalle completo en CHANGELOG §[1.20.0].

### 2026-05-13 (v0.52.0) — Telemetría MapaLab end-to-end

Sistema completo de telemetría anónima del visor MapaLab (`mapalab_events`, `mapalab_sessions`, 5 matviews), endpoint público `/api/public/mapalab/events/batch` con rate limit y scrubbing PII, panel admin con tabs internas y KPIs en el Inicio. Sider width ampliado a 280px para acomodar badges BETA. `make backup-db` ahora purga eventos crudos antes del dump y `install-backup-cron` instala también el refresh de vistas cada 30 min. Detalle completo en `docs/CHANGELOG.md` §[0.52.0].

### 2026-05-13 (v0.51.0–0.51.1) — Llaves MapaLab v2 + fix matviews

Ciclo de auditoría del widget y fix de inicialización de vistas materializadas. Detalle en CHANGELOG.

### 2026-05-08 (v0.47.0–0.47.5) — SIEEJ mis-envios + UX cards + Colibri widget v2 + sider con candado + auto-recovery CSRF + fix eventos desaparecidos

Detalle por version en `docs/CHANGELOG.md`. Resumen ejecutivo:

- **0.47.0** — SIEEJ respondent: `GET /formularios/mis-envios` paginado (filtros `estado`/`q`/`sort`) + `GET /formularios/mis-envios/{id}` con `definicion_snapshot` historica (no la actual del formulario), `archivos`, `eventos` (sin `actor_usuario_id`), 403 cross-user. 15 tests pytest cubriendo aislamiento, fidelidad historica, sort invalido, eventos sin actor. CMS admin: `FormulariosListPage` pasa de tabla a grid responsive de cards (1/2/3/4 cols xs/sm/lg/xl) con busqueda local + filtro estado + 3 sorts; `FormularioCard` con accion directa "Envios" (`?tab=envios`); `FormularioEditorPage` con tab persistente en URL bookmarkable. `mis-envios` agregado a `SLUGS_RESERVADOS`.
- **0.47.1** — Colibri widget: `window.colibri.openPanel({ sourceApp, apiKey })` crea `<colibri-panel>` programatico como child de `body` y lo remueve al cerrar (300ms tras `colibri:closed`). Desacopla el panel del Custom Element host, eliminando bug de visibilidad heredada cuando el host estaba oculto. Permite que React wrappers usen un `<button>` HTML nativo y disparen el panel sin renderizar `<colibri-button>`/`<colibri-trigger>`. CSS vars `--offset-x`/`--offset-y` separadas (fallback a `--offset` legacy). Footer `"Powered by Colibri · IIEG"` → `"Impulsado por Colibri"`. Bundle 49.5 KB raw / 13.81 KB gzip.
- **0.47.2** — Admin sider: items inaccesibles se muestran **deshabilitados con `LockOutlined` + tooltip "Solo Administradora"/"Solo Editora"** en lugar de filtrarse del menu. Helper `renderDisabledLabel(label, requiredRoles)` traduce slugs internos (`tetlamamakani`/`editora`/`externo`) a labels legibles. Aplica a items de plataforma y a items dentro de proyectos (proyecto entero deshabilitado si el usuario no es admin/no tiene `allowedGlobalRoles`/no tiene `UserProject`). Resuelve queja de discoverability: editoras ya no se quedan ciegas ante features que no pueden usar.
- **0.47.3** — Auto-recovery del CSRF token: `api/app/api/routes/auth.py` agrega `GET /autenticacion/csrf` que devuelve `{ csrf_token }` con sesion JWT valida (sin `verify_csrf` para evitar circularidad). `admin/src/shared/services/api.js` detecta `403` con `detail` que contiene "csrf" (case-insensitive), llama `refreshCsrfToken()` (deduped via `csrfRefreshPromise`), reintenta el request UNA vez (flag `__csrfRetried`). Soporta `AxiosHeaders.set()` y plain objects. Adicional: `API_URL` fallback `http://localhost:8000/api/administrador` → `/api/administrador` (path relativo) — el hardcoded violaba CSP `connect-src 'self'` cuando el bundle se servia desde otro origen.
- **0.47.4** — Docs publicas: nueva seccion "Patron estandar para huespedes React" en `/colibri/docs/` con snippet copy-paste del componente `ColibriReportButton` (estilos IIEG, `useAuth`/`useLocation`, `setContext('sourceRoute', ...)`, `openPanel`). Documenta la trampa comun del `style={{ padding: 0, border: 0 }}` inline necesario porque algunos huespedes (sieej) tienen reset CSS global tipo `button { padding: 0.6em 1.2em }` que sobreescribe Tailwind utilities y deforma el FAB en pildora. Implementaciones de referencia: `mapalab/frontend/src/components/ReportButton.jsx` y `sieej/frontend/src/components/ColibriReportButton.jsx`.
- **0.47.5** — Fix: eventos publicados desaparecian de mapalab al guardar tras renombrar titulo. Causa raiz combinada: (1) `_validate_image_url` en `api/app/schemas/evento.py` rechazaba paths del acervo `bucket/object` (formato que produce `to_relative` en `mode='before'` cuando llega URL absoluta), tirando `ValidationError` al regenerar el listado publico tras cualquier write — invalidando cache → fetch fresco → 500. (2) `GET /api/mapalab/eventos` armaba el listado con list comprehension sin manejo de error, asi un solo evento mal formado tronaba todo el endpoint. Fix: nueva lista canonica `KNOWN_ACERVO_BUCKETS` en `api/app/core/bucket_policies.py` (`portal`, `mapalab`, `iieg`, `mariachi`, `sieej`, `dataengine`); el validador acepta `bucket/object` solo si el bucket esta registrado y rechaza buckets desconocidos + path traversal (`..`). El listado publico envuelve cada `model_validate` en `try/except`, omite y loggea warning con el `id` del evento que falla. 3 tests nuevos en `test_eventos_validation.py`.

### 2026-05-07 (v0.42.0–0.46.2) — Modulo Colibri introducido

Detalle por version en `docs/CHANGELOG.md` y arquitectura completa en `docs/colibri.md`. Resumen ejecutivo:

- **0.42.0** — Backend completo: 6 modelos + 7 schemas + 4 services + 5 routers admin + endpoint publico endurecido + 8 migraciones con seed/backfill.
- **0.43.0** — Panel admin: reorganizacion `features/reportes` -> `features/colibri`, 7 paginas (Resumen/Reportes/Tipos/Direcciones/SourceApps/Routes/Integracion), sidebar como proyecto del CMS, drawer extendido con workflow granular + Timeline de actividad.
- **0.44.0** — Widget `widget/`: paquete nuevo Lit + Vite con 3 Custom Elements (button/trigger/form). Bundle 48 KB / 13.5 KB gzip. Shadow DOM, form dinamico, eventos DOM, theming con dark mode.
- **0.45.0** — SDK `sdk/`: paquete nuevo TypeScript puro publicable como `@iieg/colibri-sdk`. 6.9 KB raw / ~2 KB gzip. Errores tipados, tipos exportados, AbortController + timeout.
- **0.46.0** — Docs publicas standalone (HTML 24.7 KB) en `/colibri/docs/`. Nginx multi-stage con `widget-builder`. Boton "Docs publicas" en IntegracionPage del admin.
- **0.46.1** — Actualizacion de `context.md` y `colibri.md` con estado final del modulo.
- **0.46.2** — `window.colibri.setContext(key, value)` y `clearContext()` para enriquecer `source_context.custom` desde el huesped sin pasar por atributo del Custom Element. Util para integraciones con context dinamico (mapalab cambiando capas/zoom). Coexiste con `__userIdentify`.

Sin cambios disruptivos: el endpoint publico `/api/public/reportes` mantiene compat con clientes legacy (sin header `X-Colibri-Key`); las API keys se generan en el momento que el admin lo decida desde `/colibri/source-apps`.

### 2026-05-06 (v0.40.2)

Detalle en `docs/CHANGELOG.md` §[0.40.2]. Resumen:

- **Admin SIEEJ sidebar habilitado**: `app/sider-config.jsx` deja el grupo SIEEJ visible. Items: Formularios (`/sieej/formularios`) y Grupos (`/sieej/grupos`). "Agregar dependencia" queda disabled (placeholder).

### 2026-05-06 (v0.40.1)

Detalle completo en `docs/CHANGELOG.md` §[0.40.1]. Resumen:

- **Cleanup ruff** post-refactor `CamelCaseInput`: 8 schemas con `BaseModel` no usado removido y orden de imports normalizado. Sin cambios de comportamiento.

### 2026-05-06 (v0.40.0)

Detalle en `docs/CHANGELOG.md` §[0.40.0]. Resumen:

- **SIEEJ levantamiento**: `pdfTemplate='sieej-levantamiento'` y `exportPdf=true` inyectados al step `resumen` del formulario para que el frontend descargue el PDF custom con formato del wizard original.

### 2026-05-06 (v0.39.4)

Detalle en `docs/CHANGELOG.md` §[0.39.4]. Resumen:

- **SIEEJ slugs reservados**: `formularios_admin_service.crear()` rechaza con 400 si el `slug` solicitado colisiona con rutas literales del frontend SIEEJ (`inicio-sesion`, `exencion`, `cambiar-contrasena`, `error`, `regisño`, `catalogos`, `schema`, `envio`).

### 2026-05-06 (v0.39.3)

Detalle en `docs/CHANGELOG.md` §[0.39.3]. Resumen:

- **Fix SLD de styles globales**: capas con style global asignado (ej. `point`, `line`, `polygon`) daban `502` al abrir tab Simbología. `GeoServerClient.get_sld` ahora hace fallback de `/rest/workspaces/<ws>/styles/<name>` a `/rest/styles/<name>` (catálogo global). El endpoint expone `isGlobal: bool` y fuerza `editable=false` con razón explicativa para que el frontend caiga al fallback (XML read-only + leyenda renderizada).

### 2026-05-06 (v0.39.2)

Detalle en `docs/CHANGELOG.md` §[0.39.2]. Resumen:

- **Fix `flattenLeaves`**: el árbol publico `/mapalab/api/layers/tree` expone `workspace`/`geoserverLayer` dentro de `wmsConfig`, no flat. Sin este fix, ningún leaf se detectaba y el botón "Editar contenido" del drawer en `CapasField` quedaba siempre deshabilitado.

### 2026-05-06 (v0.39.1)

Detalle completo en `docs/CHANGELOG.md` §[0.39.1]. Resumen:

- **Config ACERVO endpoint**: `ACERVO_PUBLIC_ENDPOINT=/acervo` (path-only) en `.env.staging` y `.env.development`. Antes era `localhost:9000` que solo funcionaba si el browser corria en el mismo host que MinIO; ahora `to_absolute` genera URLs relativas que el navegador resuelve contra el origen actual via el gateway-hub.
- **`docker-compose.yml`**: removidas interpolaciones `${VAR}` sin default que sobreescribian con vacio lo que el `env_file:` ya habia inyectado al container. Sin pasar `--env-file` al `docker compose up`, esas lineas dejaban `ACERVO_PUBLIC_ENDPOINT=""` aunque `.env.staging` lo tuviera definido.
- **`MAPALAB_BACKEND_URL`** apunta a `http://host.docker.internal:3006/api` en dev/staging-on-localhost. `mapalab-nginx-1` proxypasa `/api/*` al backend; permite que mariachi-api invalide el cache del visor sin necesitar acceso al puerto interno del backend de mapalab.

### 2026-05-06 (v0.39.0)

Detalle completo en `docs/CHANGELOG.md` §[0.39.0]. Resumen:

- **Workspaces dinamicos**: `GET /geoserver/workspaces/pending` lista workspaces presentes en GeoServer pero no en `mapalab.workspaces`. `POST /geoserver/workspaces/register` (admin + CSRF) los registra. Resuelve el caso de workspaces nuevos que llegan tras un restore (ej. `eventos`). UI: Alert + modal en `LayerCreateModal` para admins.
- **Auto-leaf en eventos**: `POST /layers/auto-leaf` idempotente que materializa una capa "solo GeoServer" como leaf bajo el padre `eventos-auto` (tema oculto, on-demand). `CapasField.addCapa` lo invoca antes de asociar la capa al evento, asi el visor de mapalab encuentra la capa en su arbol y la renderiza. Desde `api 1.14.5` el `label` es obligatorio y debe diferir del `geoserver_layer` (validación normalizada en `AutoLeafRequest`); evita registrar capas con el slug como nombre visible, lo que antes hacía que mapalab mostrara el id en lugar del nombre en el panel de capas activas. `find_or_create_auto_leaf` fija el `label` solo al crear (no lo reescribe si la auto-leaf ya existe), así que renombrar la capa en el evento desincronizaba el catálogo respecto al `alias` (el árbol y Estadísticas seguían con el nombre viejo). Desde `api 1.26.0` el guardado del evento (`crear_evento`/`actualizar_evento`) llama a `sync_auto_leaf_labels` para realinear `mapalab.layers.label` con el `alias` y refresca la caché del árbol (`notify_tree_changed`).
- **Drawer reutilizable de edicion**: `LayerContentDrawer` con tabs Tarjeta · Metadatos · Simbologia, montado desde `CapasField` (boton `EditOutlined` por capa). Reusa `LayerMetadataSection` y `SldEditor` tal cual; envuelve `InfoBoxBlocksEditor` + `InfoBoxPreview` en un `InfoboxStandalone` con su propio Form. Permite editar contenido sin navegar al `LayerEditPage`.
- **Fix global camelCase**: nuevo mixin `CamelCaseInput` aplicado a los schemas que reciben input (Layer, Evento, Page, MenuItem, Usuario, Reporte, LayerMetadata, AcervoBucket, Media, Project, HomeSection payloads). Antes, los schemas declaraban solo `serialization_alias=` y el input camelCase del frontend se ignoraba silenciosamente, lo que causaba que muchas ediciones perdieran campos en el PUT/PATCH sin error visible.
- **Fix GeoServer client**: `list_workspaces`/`list_layers` toleran respuesta vacia (`{"layers":""}` como string) que GeoServer devuelve para workspaces sin layers. Antes lanzaba AttributeError.

### 2026-05-07 (v0.41.1) — Audit modulo Eventos: hardening seguridad/validacion + tests + UX

Detalle completo en `docs/CHANGELOG.md` §[0.41.1]. Resumen:

- **Validacion + RBAC + CSRF + concurrencia + rate limit en `/eventos/*`**: `CapaRef` exige workspace+layer si tipo=capa; `BBox` clampa a EPSG:4326; max_length en titulo/descripcion/alias/URLs; `_validate_image_url` bloquea `javascript:`. Viewer no ve eventos en draft (`get_evento_visible_or_404`). `PUT /presencia` exige CSRF. `_apply_evento` rechaza con 409 si el evento se modifico tras "Solicitar revision". 60 writes/min/usuario.
- **Modelo y serializers**: `EventoEstado` enum como SSoT (model + schema + routes + borrador_service); `_EventoVisibleFields` + `_ImageUrlMixin` deduplican `EventoResponse`/`EventoPublicResponse`; datetimes con timezone; `bbox` y `capas` migrados a JSONB.
- **Frontend admin**: payload y form fields en camelCase canonico (sin fallbacks legacy snake_case); autosave no persiste sin titulo; `BBoxField` no recrea `Draw` en cada render (memo via ref); `CapasField` rowKey con fallback para etiquetas; `AddCapaModal` extraido y muestra Alert si GeoServer falla; busqueda + filtro estado en `EventosListPage`; modal de rechazo limpia comentario al cerrar.
- **Frontend visor**: SVG fallback en lugar de "*"; badge "BETA" condicional via `VITE_EVENTOS_BETA_BADGE`; `ExternalEventoWidget` soporta teclado (`onFocus`/`onBlur` con relatedTarget) y `role="region"`; endpoints publicos consumen con `credentials: 'omit'`.
- **Performance backend**: `presence.list_others` con `SCAN_ITER` en lugar de `KEYS` (no bloqueante).
- **Tests**: 41 tests cubriendo RBAC, validacion, concurrencia, lifecycle, CSRF en presencia. Conftest filtra tablas `JSONB`/`ARRAY` para que modelos postgres-only no rompan SQLite.
- **SIEEJ housekeeping** (commits previos al audit): `docs/sieej.md` reescrito al modelo dinamico actual; quitado item placeholder `/sieej/agregar-dependencia` del sider; rol `externo` agregado a `UsersPage` para crear dependencias desde el flujo estandar; eliminado componente huerfano `AddSieejDependenciaPage.jsx` y endpoint `POST /usuarios/agregar-dependencia-sieej`.

### 2026-05-07 (v0.41.0) — Cache server-side de /eventos y /home + indice parcial

Detalle completo en `docs/CHANGELOG.md` §[0.41.0]. Resumen:

- **Cache versionado en Redis** para los endpoints publicos `GET /api/mapalab/eventos` y `GET /api/mapalab/home`. Nuevos helpers `get_cached_eventos`/`store_cached_eventos` (idem `home`) en `services/mapalab_public_cache.py`. Clave: `mapalab:public_cache:payload:{scope}:{version}`. En cache hit la ruta sirve `Response(content=cached_json, media_type='application/json')` y skipea la re-validacion de `response_model`. En miss, serializa con Pydantic, guarda y devuelve.
- **Removido el debounce de 5s** en `notify_eventos_changed` / `notify_home_changed` — cada bump ahora es un `SET` directo en Redis (operacion barata). El debounce anterior ocultaba la ultima edicion de una rafaga; sin el, todas las invalidaciones se reflejan en el siguiente poll de 30s del visor.
- **Indice parcial** `ix_eventos_publicados_visibles ON eventos (orden ASC, id ASC) WHERE estado='published' AND activo=true` (migracion `f3a4b5c6d7e8`). Acelera el filtro tipico del endpoint publico sin penalizar escrituras de drafts.
- Lado mapalab (v1.20.0): el polling de `cache-version` se pausa con `visibilitychange→hidden` y reinicia en `→visible`; combinado con el cache de servidor, el costo total del watcher en background cae a cero.

### Unreleased — Editor de eventos: bbox visual, etiquetas, auto-activación

Detalle completo en `docs/CHANGELOG.md` §[Unreleased] "Editor de eventos: bbox visual, etiquetas, auto-activación de capas". Resumen:

- **Schema `CapaRef`** extendido con `tipo: Literal['capa', 'etiqueta']` (las etiquetas son separadores con título dentro del menú del evento, reusan `LabelItem` que mapalab ya pinta para `nodeType='label'`) y `auto_activar: bool` (define si la capa se enciende sola al abrir el evento o requiere click manual).
- **`BBoxField`** con 3 modos: "Sin zoom" (`bbox=null`), "Coordenadas manuales" con switch CRS **EPSG:4326** ↔ **EPSG:6368** (UTM 14N, reproyección en frontend con `proj4`), y "Dibujar en mapa" con OpenLayers + base CARTO Light. Nuevas deps: `ol@^10.9` y `proj4@^2.20`.
- **`EventoEditPage`** y **`LayerEditPage`** homologan el patrón de `Tabs` verticales con `tabPosition={isMobile ? 'top' : 'left'}` y `forceRender: true` por item para que los `Form.Item` se registren al primer render (sin esto, `getFieldsValue` devolvía `undefined` para campos en tabs lazy y guardaba vacío al hacer save).
- **Vista de error `<Result>`** en `LayerEditPage` cuando falla la carga de la capa, con guardas que deshabilitan los botones de guardar para no sobrescribir con valores en blanco.
- **Selector GeoServer**: `GET /geoserver/workspaces?available_only=true` filtra capas ya registradas en `mapalab.layers`. `LayerCreateModal` y el modal de "Agregar capa al evento" usan esto con un toggle "Solo no registradas".
- **Drag handle visible** en el árbol de capas (`HolderOutlined` siempre presente, antes oculto por CSS).
- **`BucketFilePicker`** ahora es **grid por default** + `Segmented` toggle persistente en localStorage (alineado con la página Media). Beneficia a todos los pickers (eventos, home, capas, perfil) sin cambios en cada uno.
- **Visor (`mapalab/frontend/.../EventoMenu.jsx`)**: renderiza etiquetas como `LabelItem`, auto-activa capas con `autoActivar=true` al abrir el menú (`onToggleLayer(id, true)` — el método espera bool explícito, no es un toggle), y agrega botón "Eliminar (N)" para apagar capas externas activas.

### 2026-04-30 (v0.31.0)

Detalle completo en `docs/CHANGELOG.md` §[0.31.0]. Resumen:

- **Editor de simbología SLD** integrado al panel admin como tab "Simbología" en `LayerEditPage`. Soporta dos shapes: `choropleth` (rangos numéricos del pipeline) y `boundary` (estilo único + label de TextSymbolizer). Otros shapes (raster/point/line/categorical/layer-group) caen al fallback con leyenda renderizada por GeoServer y mensaje claro.
- **Backend SLD**: `sld_generator.py` (porta `coropleticos/sld_dump_geom.py`), `sld_parser.py` (orquestador con detección de shape), `palette_service.py` (144 paletas), `geoserver_client.py` extendido con `get_sld`/`put_sld`/`get_legend_graphic`/`is_layer_group`/`find_layers_using_style`. Verificación SHA256 round-trip al subir SLDs.
- **Workflow de aprobación**: handler `_apply_sld` en `borrador_service.py` registrado en `APPLIERS['sld']`. Reusa la tabla `borradores` con `resource_type='sld'`, sin schema nuevo. `tetlamamakani` aprueba en RevisionQueue → SLD aterriza en GeoServer.
- **Modelo de Propiedades** (display-only): `leaf` con padre `group` se trata como Propiedad. Tag cyan en árbol/header/orden inicial, tabs `simbologia`/`metadatos` ocultos al editar (la metadata se almacena por feature type y se comparte con el grupo padre y hermanos), Alert explicativo al crear bajo padre `group`.
- **`StatusBadge` reutilizable** en `shared/components/`. Variantes (`beta`/`test`/`dev`/`info`/`new`) + posición absoluta opcional. Usado en tab "Simbología" y en botones/radios beta de Numeralia.
- **Alerts cerrables** en toda la interfaz: sweep automatizado agregó `closable` a 45 alerts en 23 archivos.
- **Endpoint proxy** `/geoserver/legend` para que el preview de leyenda funcione en prod-local sin gateway-hub.
- **Versión bumpeada**: `0.30.51` → `0.31.0` (admin + api + context.md).

### 2026-04-23 (v0.13.0)

Detalle completo en `docs/CHANGELOG.md` §[0.13.0]. Resumen:

- **Admin responsive en mobile** con hook `useIsMobile` + Drawer lateral en lugar de Sider + tablas/drawers/modales adaptativos en 12 paginas/componentes.
- **Paleta de marca de MapaLab** aplicada via `ConfigProvider` (numeralia/purple/orange). Constantes exportadas como `BRAND` desde `admin/src/providers/MainProvider.jsx`.
- **Login minimalista** sin gradiente pesado; inputs `variant="filled"`; barrita de marca con los 3 colores.
- **Conectividad dev con mapalab**: proxy Vite `/mapalab/*` + admin en `mapalab-network`. Proxy usado solo en dev (en prod lo resuelve gateway-hub).
- **Conectividad dev con DataEngine**: `api` en `dataengine-network` + `DATAENGINE_DATABASE_URL` poblado.
- **`MAPALAB_BACKEND_URL`** agregada — sin ella el cache `layer_tree_cache` no se invalida tras CRUD y los cambios no aparecen hasta el cron diario.
- **GRANTs sobre `mapalab.*`** automatizados en `dataengine` v1.6.0 (paso 3b de `bootstrap-v14.sh`). Sin eso, el editor truena con `permission denied for table layers`. Ver `DATAENGINE_CREDENTIALS.md` §3.1.
- **Migraciones de deprecaciones AntD v6**: `Alert.message` → `title`, `Drawer.width/height` → `styles.wrapper`, `<Collapse.Panel>` → `items`, `<Spin tip>` reemplazado, wrapper `<App>` en `MainProvider`.

### 2026-04-22

- Rename de carpeta `portal/` → `mariachi/`.
- Container names: `portal-*` → `mariachi-*`.
- Networks: `portal_network{,_dev}` → `mariachi_network{,_dev}`.
- `docker-compose.yml` `name`: `portal`/`portal-dev` → `mariachi`/`mariachi-dev`.
- Upstream nginx interno: `portal_api` → `mariachi_api` (archivo renombrado a `mariachi.conf`).
- `pyproject.toml`: `backend-portal` → `mariachi-api`.
- `admin/package.json`: `admin-portal` → `mariachi-admin`.
- `web/package.json`: `web-portal` → `portal-web` (refleja que es el portal publico).
- Settings: agregado `dataengine_database_url` + engine secundario SQLAlchemy lazy.
- Nuevo doc: `docs/DATAENGINE_CREDENTIALS.md` para el equipo de DataEngine.
- Nuevo doc: este `context.md`.

---

## Pendientes

### Listos para ejecutar (solo faltan credenciales / acciones externas)

- [x] **Alembic multi-environment** — configurado, ver `docs/ALEMBIC_MULTI_ENV.md`. Listo para crear migración de DataEngine cuando haya credenciales.
- [x] **COOKIE_DOMAIN** — ajustado al subdominio específico en `.env.*` (no versionado). Los `.env.*.example` usan placeholder. Cubre `/mariachi/*` y `/mapalab/*` sin exponer cookie a otros subdominios del dominio raiz.
- [x] **Script rename GitHub remote** — `scripts/rename-github-repo.sh`. Correr después de renombrar en GitHub web.
- [x] **Script migración bucket Acervo** — `scripts/migrate-acervo-bucket.sh`. Requiere `mc` instalado y acceso al endpoint de Acervo.

### Listo en dev local

- [x] **Rol `mariachi_layers` provisionado en DataEngine local** — validado: conecta, puede CREATE/DROP tablas, NO tiene acceso a `mapalab_card`. `DATAENGINE_DATABASE_URL` ya configurado en `.env.development` (no versionado).
- [x] **Alembic multi-env probado contra DataEngine local** — `alembic -x db=dataengine current` ejecuta sin errores (heads vacíos, esperado hasta que arranque v1.4.0).

### Coordinacion externa

- [ ] **Renombrar repo en GitHub web** — ir a `https://github.com/<owner>/<repo-viejo>/settings` → Repository name → nuevo nombre. GitHub mantiene redirección automática. Luego correr `GH_OWNER=<owner> GH_OLD_REPO=<viejo> GH_NEW_REPO=<nuevo> scripts/rename-github-repo.sh --execute`.
- [ ] **Credenciales DataEngine en producción** — coordinar con equipo para provisionar rol `mariachi_layers` en el DataEngine de prod (el mismo SQL de `docs/DATAENGINE_CREDENTIALS.md`, pero en la VM real + `pg_hba.conf` con IP del servidor mariachi + `sslmode=require`).
- [ ] **Bucket Acervo `mariachi-dev`** — ejecutar `scripts/migrate-acervo-bucket.sh --execute` cuando haya acceso al MinIO de Acervo. Luego actualizar `ACERVO_BUCKET_NAME` en `.env.development`.

---

## Referencias

- `docs/ARCHITECTURE.md` — diagrama detallado del monorepo
- `docs/CONVENTIONS_BACKEND.md` — convenciones Python/FastAPI
- `docs/CONVENTIONS_CMS.md` — convenciones admin (Ant Design)
- `docs/CONVENTIONS_FRONTEND.md` — convenciones web (Tailwind)
- `docs/COOKIES_CSRF.md` — modelo de seguridad
- `docs/DRAFTS.md` — sistema de borradores y revision queue
- `docs/sieej.md` — modulo SIEEJ: schema dedicado, endpoints `/formularios/*`, integracion con `iieg-oficial/sieej`
- `docs/ROLES.md` — matriz de roles globales (tetlamamakani, editora, externo) y autorizacion por proyecto via UserProject
- `docs/DATAENGINE_CREDENTIALS.md` — requerimientos para credenciales DataEngine
- `docs/ALEMBIC_MULTI_ENV.md` — migraciones en dos BDs (`-x db=mariachi|dataengine`)
- `docs/SLD_EDITOR.md` — editor visual de simbología SLD: backend (parser/generator/borrador handler) + frontend (componentes choropleth/boundary, hook, fallback, status badge)
- `docs/colibri.md` — modulo Colibri: arquitectura, multi-tenancy, hardening (PII, dedupe, audit log, fan-out), widget Web Components, SDK npm, docs publicas
- `scripts/rename-github-repo.sh` — actualiza remote local tras rename en GitHub
- `scripts/migrate-acervo-bucket.sh` — migra contenido de bucket `portal-dev` a `mariachi-dev`
- `docs/PENDIENTES.md` — roadmap del CMS
