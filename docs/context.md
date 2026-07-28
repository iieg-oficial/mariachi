# Mariachi + Portal — Contexto del Proyecto

> Documento de referencia completo. Leer este archivo proporciona contexto del monorepo sin explorar el codebase.

**Versión:** número único del monorepo (desde `1.61.0` se fusionaron los antiguos `api`/`admin`). Fuente de la verdad: `api/pyproject.toml` (la lee `api/app/core/version.py::get_app_version()`; endpoint en vivo `GET /ontoy`). Bump con `scripts/bump-version.sh <x.y.z>` (sincroniza `pyproject.toml` + `admin/package.json` y abre la entrada del CHANGELOG). · **Última actualización:** 2026-07-28 (1.97.2)


---

## Qué contiene este repositorio

Este monorepo aloja el panel de administración del ecosistema IIEG y el backend compartido por varios productos:

| Producto | Qué es | Carpeta | Ruta publica | Estado |
|---|---|---|---|---|
| **Mariachi** | Panel de administración del ecosistema IIEG (Ant Design) | `admin/` | `/mariachi/` | Activo |
| **SIEEJ (frontend)** | Captura de formularios para dependencias de gobierno (otro repo: `iieg-oficial/sieej`) | `dist/` estático montado read-only en `gateway-hub` (`SIEEJ_DIST_PATH`) | `/sieej/` | Activo |
| **Colibri Widget** | Web Components embebibles para reportar desde cualquier sitio (Lit + Vite) | `widget/` | `/colibri/widget/colibri-widget.v1.js` | Activo (v0.47.1) |
| **Colibri SDK** | Cliente HTTP TypeScript para integraciones server-side y browser custom | `sdk/` | npm `@iieg/colibri-sdk` | Activo (v0.46.0) |

El **Portal público** (sitio web del IIEG) se separó a su propio repo `iieg/portal/` (ver README raíz). Consume `/api/portal/*` de este `api`.

Mariachi y SIEEJ consumen el mismo backend FastAPI en `api/` con el mismo prefijo `admin_prefix` (`/api/mariachi`; `/api/administrador` sigue montado por compatibilidad durante la transición). Mariachi usa los routers `auth`, `users`, `pages`, `menu`, `media`, `borradores`, `layers`, `colibri/*`, etc. SIEEJ usa `/api/mariachi/formularios/*` para la captura y `/api/mariachi/sieej/*` para la gestión desde el CMS (ver `docs/sieej.md`). Los huespedes externos a la sesion (widget + SDK + integraciones server-side) consumen `/api/public/reportes` (ver `docs/colibri.md`).

**Origen del nombre:** la carpeta del repo se llamaba `portal/` originalmente. En 2026-04-22 se renombro a `mariachi/` para reflejar que el CMS es lo único que se sigue desarrollando. El portal publico sigue alli pero congelado.

---

## Historia breve del rename (2026-04-22)

El monorepo se renombro de `portal/` a `mariachi/` porque:

- El nombre "portal" era ambiguo: habia **el sitio publico** (producto) y **el repo** (que contiene tanto el sitio publico como el CMS).
- El desarrollo del sitio publico (`web/`) se detuvo — lo asignaron originalmente aquí pero se retiro del alcance.
- El CMS (`admin/` + `api/`) es lo único con roadmap activo, y su nombre interno es **Mariachi**.

El rename fue **solo de carpeta e identificadores internos de infra** (docker compose, container names, networks). **No se toco**:

- Branding publico "Portal IIEG", "CMS Portal" en UI
- Rutas URL (`/api/portal`, `/api/administrador` — este último sí se renombró después a `/api/mariachi`, ver "API prefix rename")
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
- `/api/mariachi/*` (`ADMIN_PREFIX`) — consume el CMS y SIEEJ
- `/api/administrador/*` (`ADMIN_PREFIX_LEGACY`) — mismo router, doble montaje por compatibilidad (ver "API prefix rename")

> **Nota de lectura:** las tablas de endpoints de este documento escritas con `/api/administrador/...` corresponden al mismo router y hoy responden también —y preferentemente— bajo `/api/mariachi/...`.

### Mariachi CMS (`admin/`)

| Tecnologia | Version |
|---|---|
| React | 19.2.4 |
| React Router | 7.13.0 |
| Vite | 7.3.1 |
| Ant Design | 6.2.2 |
| @dnd-kit core / sortable | 6.3 / 10.0 |
| Axios | 1.13.3 |

Estructura de features (`admin/src/features/`): `acervo`, `auth`, `colibri`, `inicio`, `mapalab-api-keys`, `mapalab-eventos`, `mapalab-home`, `mapalab-layers`, `mapalab-shares`, `mapalab-symbols`, `perfil`, `portal-menu`, `portal-pages`, `revision`, `sextante`, `sieej-formularios`, `users`. Cada feature agrupa `pages/`, `components/`, `hooks/`, `services/`, `constants/`. La estructura `pages/` legada se eliminó.

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
│   ├── static/                   # estaticos servidos por nginx
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
| `ADMIN_PREFIX` | `/api/mariachi` | Ruta del CMS y de SIEEJ |
| `ADMIN_PREFIX_LEGACY` | `/api/administrador` | Doble montaje del mismo router por compatibilidad |
| `WEB_PREFIX` | `/api/portal` | Ruta del sitio publico |
| `ACERVO_ENDPOINT` / `ACERVO_PUBLIC_ENDPOINT` / `ACERVO_USE_SSL` / `ACERVO_VERIFY_SSL` | — | Endpoint S3 de SeaweedFS (host y publico, sin creds globales) |
| `ACERVO_<REF>_ACCESS_KEY` / `ACERVO_<REF>_SECRET_KEY` | — | Creds **por bucket** (REF coincide con `acervo_buckets.access_key_ref`). Sin fallback a creds root del cluster: cada bucket activo requiere su par. |

### Frontend (Vite)

| Variable | Uso |
|---|---|
| `VITE_WEB_API_URL` | Base URL que usa `web/` (portal publico). Ej: `https://tu-dominio.com/api/portal` |
| `VITE_ADMIN_API_URL` | Base URL que usa `admin/` (CMS). Ej: `https://tu-dominio.com/api/mariachi` |
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

### CMS (`/api/mariachi/*`, antes `/api/administrador/*`)

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
| GET | `/acervo/resumen` | Totales del Acervo (archivos, imagenes, documentos, carpetas, peso) por bucket accesible + agregado. `bucket_id` opcional lo limita a uno (`1.92.0+`) |
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
| POST | `/formularios/{slug}/envio/actualizar-version` | Actualiza envio `en_proceso` a la definicion vigente conservando `datos` |
| DELETE | `/formularios/mis-envios/{id}` | Soft-delete del envio para el respondent |
| GET | `/formularios/mis-envios/{id}/pdf` | PDF del envio generado server-side |
| PUT | `/formularios/mis-envios/{id}/actualizar-campos` | Correccion post-envio de los campos `editableAfterSubmit`, sin reabrir el envio |
| POST | `/formularios/mis-envios/{id}/actualizar-archivo` | Contraparte multipart para los campos `file` (misma huella de auditoria) |
| GET | `/formularios/mis-envios/{id}/historial` | Historial append-only de valores corregidos (respondent, sin actor) |
| GET | `/sieej/formularios/{id}/envios/{envio_id}/historial` | Mismo historial con actor (admin) |
| POST | `/sieej/formularios/{id}/envios/{envio_id}/reabrir` | Devuelve un envio `enviado`/`expirado` a `en_proceso` conservando su version |
| GET/PUT/DELETE | `/sieej/formularios/{id}/presencia` | Quien esta editando / heartbeat / salida (Redis, TTL 30 s) |
| GET | `/sieej/formularios/presencia` | Presencia de todos los formularios en un scan (se declara antes que la ruta con parametro) |
| GET/POST/PUT/DELETE | `/sieej/catalogos/*` | CRUD de catalogos y opciones (`PUT /{clave}/reordenar` para el orden) |
| POST | `/sieej/expirar-envios-pendientes` | Bulk-expire de envios cuyos formularios pasaron vigencia |
| GET | `/sieej/formularios/{id}/periodos` | Ventanas de captura de un formulario periodico |
| GET | `/sieej/formularios/{id}/notificaciones[/exportar]` | Bitacora de avisos de apertura/faltantes (`?formato=csv\|xlsx`) |
| POST | `/sieej/periodos/tick` | Corre el motor de apertura periodica (idempotente) |
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

### Subida interna al Acervo (`/api/internal/acervo/*`)

| Metodo | Ruta | Funcion |
|---|---|---|
| POST | `/api/internal/acervo/upload` | Subida **upload-only** para plataformas externas (hoy el Portal). Autenticada por header `X-Internal-Token` = `ACERVO_INTERNAL_TOKEN` (mismo patron service-to-service que `MAPALAB_INTERNAL_TOKEN`). Solo bucket `portal`; valida tamaño (25 MB) y MIME, sanea el nombre y renombra en conflicto; **no persiste `AcervoFile`** (el objeto se lista igual como bucketOnly). Registra actividad `acervo.file.upload_internal` + metrica `mariachi_media_uploads_total`. |

Sin cookie JWT. La politica (buckets permitidos, limites) la resuelve `resolve_upload_client()` en `services/acervo_upload_clients.py` — hoy un token fijo del entorno, a futuro un registro de clientes con key rotable por plataforma (patron `source_apps`). El borrado, la edicion y la vista se hacen desde Mariachi. Alcanzable por `iieg-network` (`http://mariachi-api:8000/...`) o por el gateway (`location ^~ /api/internal/acervo/`, sin bot-protection). Ver `docs/acervo-subida-externa.md`.

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

### Captura masiva tipo hoja de cálculo (`/grid`) — implementado

Vista de celdas/filas/columnas dentro del panel para capturar metadatos de muchas capas sin abrir el formulario capa por capa. Nace de que el personal venía de Excel y el editor por capa les resultaba lento para trabajo en lote. Se llega desde el conmutador **Árbol · Tabla** en la cabecera de Capas (`/mariachi/mapalab/layers/tabla`).

El backend es **genérico y reutilizable**: el router no sabe nada de metadatos de capas, y montar un segundo grid (catálogos SIEEJ, capas catálogo, etc.) es escribir una `GridSpec` y registrarla.

| Pieza | Archivo |
|---|---|
| Motor de aplicación de cambios (locking optimista por celda, campos virtuales JSONB) | `api/app/services/grid_batch.py` |
| Registro de grids | `api/app/services/grids/__init__.py` |
| Spec de metadatos de capas | `api/app/services/grids/layer_metadata_grid.py` |
| Router | `api/app/api/routes/grid.py` (`/grid/{resource}/*`) |
| Schemas | `api/app/schemas/grid.py` |
| Grid genérico (React) | `admin/src/shared/components/dataGrid/` |
| Servicio axios | `admin/src/shared/services/gridService.js` |
| Página | `admin/src/features/mapalab-layers/pages/MetadataGridPage.jsx` |
| Layout sin sider | `admin/src/app/FullscreenLayout.jsx` + `admin/src/app/fullscreenHeader.js` |

**La tabla corre a pantalla completa**, fuera del `MainLayout`: su ruta cuelga de un `FullscreenLayout` hermano (ambos bajo `MainProvider` + `ProtectedRoute`), no de los children del layout con sider. La barra superior deja solo marca, botón de regreso, título y las acciones que la página declara con `useFullscreenHeader({ title, backTo, extra })` — cualquier página futura que necesite todo el ancho reusa ese layout. El `<Outlet />` va memoizado con `useMemo(..., [])` para que el contador de cambios sin guardar (que se actualiza en cada tecla) re-renderice la barra sin arrastrar la tabla; los cambios de ruta lo atraviesan igual porque viajan por contexto.

No hay conmutador Árbol/Tabla dentro de la vista de tabla: el botón de regreso ya lleva al árbol. El conmutador vive solo en la página del árbol, junto al botón de configuración. Los filtros (workspace, búsqueda) son botones con dropdown en la barra, no una franja de filtros, para que la tabla ocupe todo lo que queda; el conteo de capas vive en la barra de estado inferior. **La barra es oscura (`#001529`), así que los botones necesitan CSS propio** (`.mariachi-topbar .ant-btn.ant-btn-variant-*`): sin él quedan con el color por defecto y se vuelven invisibles sobre el fondo. `FullscreenLayout.test.jsx` ancla que antd siga emitiendo esas clases, porque el día que cambien el síntoma es "no se ven los botones" y no falla nada más.

| Método | Ruta | Función |
|---|---|---|
| GET | `/grid/{resource}/rows` | Filas aplanadas + catálogo de columnas (`columns_meta`). Filtros `workspace` y `search` |
| PATCH | `/grid/{resource}/cells` | Lote de cambios `{rowKey, column, fromValue, toValue}`. Máx 500 por request |
| GET | `/grid/{resource}/historial` | Historial por celda; filtros `rowKey`, `desde`, `hasta` |
| GET | `/grid/{resource}/export` | `formato=xlsx\|csv`. XLSX trae hojas **Metadatos** e **Historial**; CSV usa `hoja=metadatos\|historial` |
| GET/PUT/DELETE | `/grid/{resource}/presencia` | Presencia por fila en Redis (scope por grid, TTL 30 s) |

#### Historial de cambios (`mapalab.grid_cell_history`)

El objetivo del módulo es poder **descargar un Excel de metadatos con historial y responsable**. Antes solo existía `layer_metadata.updated_by` (último autor de la fila, sin decir qué campo ni qué decía antes) y `layer_stats` no tenía ni eso: cambiar una numeralia no dejaba rastro de autor.

Migración `dataengine/jobs/alembic/versions/20260728_0030_grid_cell_history.py`: agrega `updated_by`/`updated_at` a `mapalab.layer_stats` y crea `mapalab.grid_cell_history` con `(resource, row_key, column_key, from_value, to_value, changed_by, changed_at, source)`. Es **genérica** (`resource`): los próximos grids la reusan sin otra migración. Vive en DataEngine y no en la BD de mariachi para que el historial se escriba **en la misma transacción** que el cambio — un historial con huecos ocasionales vale mucho menos que uno garantizado.

- **Se registra por campo lógico, no por columna física.** `column_key` guarda `fuentes_corto` o `numeralia_01_valor`, no `fuentes`/`values`; un historial que dijera "fuentes cambió de {json} a {json}" sería ilegible en el Excel. Esto también descarta implementarlo con un trigger de Postgres: el trigger solo vería el JSONB completo.
- **Los tres caminos de escritura alimentan la misma tabla**, con `source` distinto: `grid` (celda por celda), `formulario` (`PUT /layer-metadata/*`, vía `diff_states`) e `ingesta` (el applier del plan). Si solo registrara el grid, el historial mentiría por omisión: alguien edita en la ficha de la capa y en el Excel parecería que nadie la tocó.
- **No hay historial retroactivo.** `scripts/backfill_grid_history.py` siembra una fila por campo con valor, atribuida al `updated_by` vigente y marcada `source='backfill'`, para que la primera exportación no salga vacía y se distinga de un cambio real. Es idempotente.
- El export usa `openpyxl` (ya era dependencia para *leer* en la ingesta). Los CSV llevan BOM UTF-8 para que Excel no rompa los acentos.
- El historial también se consulta sin descargar: botón de reloj en la barra → `GridHistoryDrawer` (drawer lateral, no modal, para no perder de vista la tabla) con dos alcances, *Esta capa* y *Todas*. Muestra `antes → ahora`, responsable, fecha y un tag por origen.
- `fetch_history` comprueba con `to_regclass` que la tabla exista antes de consultarla: si la migración de DataEngine no está aplicada, la descarga sale igual con los datos actuales en vez de responder 500. Exportar el catálogo no debe depender de que exista la auditoría.

Decisiones que conviene no perder:

- **El diff es por celda tocada**, no por columna presente en un archivo. Eso permite que una celda vacía signifique *borrar* sin ambigüedad, y evita que una fuente múltiple se pise al guardar (a diferencia de un round-trip por Excel, donde la columna JSONB viaja completa).
- **Locking optimista a nivel de campo virtual**: cada cambio manda su `fromValue`; el motor lee la fila con `SELECT ... FOR UPDATE`, compara y si no coincide devuelve `conflict` para esa celda sin tumbar el resto del lote. El front conserva las celdas en conflicto marcadas en rojo.
- **Campos virtuales**: `fuentes_corto`, `metodologia_texto` y los 24 de numeralia no son columnas de tabla. `json_list_item_field` y `json_slot_field` los leen/escriben dentro del JSONB. El writer normaliza `fuentes`/`metodologia` de objeto suelto (formato legado, 128 de 130 filas) a lista de un elemento; el visor y los schemas aceptan ambas formas.
- **Numeralia calculada bloqueada**: las capas con `stats_config` dinámico rechazan edición de numeralia desde el grid (guard en la spec, más celdas deshabilitadas en el front), porque el refresh de stats las volvería a pisar.
- **Permisos**: escribir numeralia desde el grid requiere rol editor del proyecto, no `tetlamamakani`. El `PUT /layer-metadata/{key}/stats` sigue siendo admin-only porque ese endpoint define `stats_config`, que ejecuta SQL; el grid solo toca valores estáticos.
- **Nomenclatura compartida con la ingesta masiva**: las claves de columna son las mismas del preset `mapalab-excel` (`layer_name_usuario`, `numeralia_01_valor`, …), para que exista una sola nomenclatura en el módulo.
- **Borrador local, no en BD**: los cambios viven en memoria y `localStorage` (`mariachi.grid.<resource>.draft`) hasta que se presiona Guardar. No se usa la tabla `borradores` — esa es la cola de revisión de `tetlamamakani` y se ensuciaría con capturas intermedias. Autosave por celda se descartó por ruido de auditoría y rate limit.
- El grid corre sobre `react-datasheet-grid` (MIT, peer React 19). Trae navegación por teclado, selección de rango, pegado multi-celda desde Excel y arrastre de relleno; el **undo (Ctrl+Z) es propio**, sobre el stack de parches del borrador.
- **No quitar el `overrides` de `react`/`react-dom` en `admin/package.json`.** Dos dependencias transitivas del grid (`@tanstack/react-virtual` y `react-resize-detector@7`) declaran rangos de `react-dom` que excluyen la 19, así que npm instala una copia anidada de react-dom 18 y el bundle termina con dos copias de React. En runtime revienta con `Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')` al montar **cualquier** página, porque react-dom 18 busca internals que React 19 eliminó. El build no lo detecta; el test de montaje en `shared/components/dataGrid/__tests__/DataGrid.test.jsx` sí.

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
| GET | `/api/administrador/geoserver/workspaces/{alias}/styles` | Estilos publicados en el workspace; con `?include_global=true` suma los del catálogo global (marcados `isGlobal`). Consumido por la página Estilos de Sextante |
| GET | `/api/administrador/geoserver/fonts` | Tipografías: cruza las familias que la JVM tiene cargadas (`/rest/fonts`) con los `.ttf`/`.otf` subidos a `styles/`. Cada familia trae `source`: `propia` (archivo subido por el CMS), `instalada` (declarada en `GEOSERVER_INSTALLED_FONT_FAMILIES`) o `sistema` |
| POST | `/api/administrador/geoserver/fonts/reload` | `POST /rest/reload` de GeoServer: sin esto una fuente recién subida no queda registrada |
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

1. El contenedor `geoserver` debe estar en `iieg-network` para resolver el Acervo cuando renderiza el SLD con `<ExternalGraphic>`. Configurado en `/IIEG/geoserver/docker-compose.yml`.
2. GeoServer 2.20+ bloquea por defecto cualquier URL externa en SLDs. Hace falta un `URLCheck` vía REST API (`POST /rest/urlchecks`) que cubra el host del Acervo. Detalles en `docs/SLD_EDITOR.md`.

> **Pendiente de verificar (2026-07-28):** ambos puntos se escribieron cuando el Acervo era **MinIO** (`acervo-minio:9000`). Tras la migración a **SeaweedFS** (`acervo-seaweedfs:8333`) el `URLCheck` con la regex vieja apuntaría a un host que ya no existe, y el síntoma sería un símbolo que no pinta en el mapa —fácil de confundir con un problema del estilo—. Revisar con `GET /rest/urlchecks` y reescribir la regex si sigue con el host de MinIO.

UI: `/sextante/simbolos` (admin tetlamamakani). Features en `admin/src/features/mapalab-symbols/` y `admin/src/features/mapalab-layers/components/sldEditor/`. El `SymbolPicker` (selector del catálogo, reusado por el editor SLD, los eventos y el ícono de categoría) vive en `mapalab-symbols/components/`.

El **ícono de la categoría** (`symbol_categories.icon`, columna `TEXT`) acepta un emoji o la URL de un símbolo del catálogo (imagen/SVG). Las respuestas de categoría —admin y el catálogo público— exponen `iconUrl` derivado: la URL si el valor apunta a un archivo, `null` si es emoji, para que el visor no infiera por heurística.

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

2. **Panel admin (`admin/src/features/colibri/`)**: 6 paginas (Resumen, Reportes con toggle plano/agrupados, Tipos con form builder, Direcciones, SourceApps con rotacion de keys + modal "muestra-una-vez", Routes con fan-out). La guia de integracion vive en el topic **Colibri** de la pagina de Documentacion del admin (`/mariachi/documentacion?topic=colibri`). Sidebar reorganizado: Colibri es proyecto del CMS con `allowedGlobalRoles` para tetlamamakani/editora.

3. **Widget (`widget/`)**: paquete Lit + Vite con 3 Custom Elements (`<colibri-button>`, `<colibri-trigger>`, `<colibri-form>`). Bundle 49.5 KB / 13.8 KB gzip servido en `/colibri/widget/colibri-widget.v1.js` con CORS abierto. Shadow DOM, form dinamico, screenshot opcional. **API global `window.colibri`**: `identify(user)` para asociar sesion con cada reporte, `setContext(key, value)` y `clearContext()` para enriquecer `source_context.custom` (snapshot de mapa, capas activas, etc.), `openPanel({ sourceApp, apiKey })` para disparar el panel programaticamente desde un boton React/HTML del huesped sin renderizar Custom Elements visibles. CSS vars `--offset-x` y `--offset-y` separadas para alinear el FAB respecto a UI existente.

4. **SDK (`sdk/`)**: paquete TypeScript publicable a npm como `@iieg/colibri-sdk`. Cliente HTTP con tipos + 5 errores tipados (Auth/Validation/RateLimit/Forbidden/Network). 6.9 KB raw / ~2 KB gzip.

5. **Guia de integracion (`admin/src/features/documentacion/topics/ColibriTopic.jsx`)**: topic **Colibri** de la pagina de Documentacion del admin (`/mariachi/documentacion?topic=colibri`), con pestañas Widget / Patron React / SDK / SIEEJ. Reemplaza a la antigua pagina `/colibri/integracion` y a las docs publicas standalone `/colibri/docs/`, ambas removidas.

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
- `scripts/postgres-backup.sh`: corre purga antes del dump (skipeable con `MAPALAB_PURGE_ON_BACKUP=false`). `pg_dump` sin filtros cubre los 4 schemas de la base (`public`, `huachicol`, `acervo`, `sieej`); los rollups de stats son **tablas** en `huachicol` (`rollup_*`, `mcp_rollup_*`), no matviews, así que viajan con sus datos y no hay que recomputarlos al restaurar. Antes de promover el dump valida que cada schema de `EXPECTED_SCHEMAS` aparezca en él, para no pisar `weekly`/`monthly` con un dump parcial.
- `make install-backup-cron` instala dos cronjobs: `0 3 * * * postgres-backup.sh` (con purga incluida) y `*/30 * * * * refresh_mapalab_stats.py`.
- `scripts/postgres-restore.sh`: dropea con `CASCADE` los schemas declarados en el dump antes de aplicarlo (el `DROP SCHEMA` que emite `pg_dump` no lleva `CASCADE` y aborta si el destino tiene objetos que el dump no conoce).

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

### 2026-07-27 (1.94.0–1.94.1) — SIEEJ: acomodo manual y explícito de los campos del editor

El editor de formularios deja colocar un campo en cualquier parte de su línea y reservarle la línea entera aunque sea angosto: `layout.col` (1..6) lo ancla a una columna — `newRow` pasa a ser su caso particular (`col: 1`) — y `layout.alone` lo extiende hasta el final de la fila limitando su contenido al ancho elegido. `definicion_validator` rechaza una `col` donde el ancho declarado no cabría; el renderer la ignora en vez de crear una columna implícita. Lado respondent: SIEEJ 1.49.0 (`helpers/gridLayout.js`), que conviene desplegar antes o junto con este.

`1.94.1` corrige que la vista previa y el bloque de acomodo parpadearan al mover un campo de línea: las tarjetas se agrupaban en un `Fragment` por fila, así que cambiar de fila las desmontaba (una `key` estable no evita el remonte si cambia de padre) y la limpieza de `FieldForm` revertía el cambio en ciclo. Ahora separadores y tarjetas son hermanos directos del grid (`flatMap`), el borrador de acomodo lleva el índice del campo que lo emitió, y `fieldToFormValues` normaliza posiciones imposibles heredadas de antes del validador.

### 2026-07-27 (1.91.1–1.93.0) — Acervo: claves legibles para SIEEJ y buckets protegidos administrables

- **Claves legibles**: los archivos de SIEEJ pasan de `{slug}/envio{id}/{uuid}.{ext}` a `{slug}/{usuario}-{envio_id}[/{periodo}]/{step}.{campo}/{ts}-{nombre}-{sufijo}.{ext}` (`services/sieej/acervo_keys.py`), con un directorio por campo y sus versiones ordenadas dentro. Junto a ellos se escribe un `envio.json` best-effort con lo necesario para reconstruir el envío sin la BD. La migración de los objetos existentes es un script idempotente (`scripts/sieej_migrar_object_keys.py`), **no** una migración de alembic: habla con Acervo por red y un fallo del bucket tumbaría el arranque del api.
- **Buckets protegidos**: bandera `protegido` en `acervo.buckets` (migración `c4d5e6f7a8b0`). El explorador oculta borrar/editar/mover/subir/crear carpeta y `resolve_bucket_escribible` responde 409 **incluso al admin**. `sieej` es el primero: sus claves están referenciadas desde `envio_archivo` y `envio.datos`. En `1.93.0` la bandera se administra desde `/acervo/buckets` (switch por bucket, admin-only); activarla es directo, desactivarla pide confirmación.

### 2026-07-27 (1.86.0–1.89.0) — SIEEJ: compatibilidad de definiciones legadas y actualización post-envío que sí alcanza a los envíos

- **`compat.py` (1.86.0)**: `normalizar_definicion` traduce cualquier definición histórica al contrato vigente — idempotente y solo relaja. Se aplica en **lectura**, **escritura** y **persistencia** (migración `c3d4e5f6a7b9`), de modo que un deploy no depende de que la migración de datos haya corrido. Sustituye el patrón de escribir una migración por cada endurecimiento del validador: al endurecer, se agrega la regla en `compat.py` y una definición real en `api/tests/fixtures/sieej/legacy/`, y `test_sieej_compat.py` falla en CI en vez de en producción. Verificación en deploy con `scripts/sieej_check_definiciones.py` (`make sieej-check`, `--fix` para reparar).
- **`editableAfterSubmit` de verdad (1.87.0–1.89.0)**: cualquier tipo de campo puede marcarse, repeaters y `file` incluidos (los `file` van por `POST .../actualizar-archivo`, que deja la misma huella de auditoría). La marca la manda la **definición vigente**, no el snapshot — es política del admin, no contrato de datos —, así que activarla después del envío alcanza a los envíos ya enviados, que son justo los que se quieren corregir. `GET /formularios/` expone `tiene_campos_editables` por item para que el respondent encuentre la pantalla sin entrar al detalle.

### 2026-07-24 (1.82.0) — Sextante: sección propia para GeoServer + ícono de categoría con imagen/SVG

Lo relacionado con GeoServer estaba repartido dentro de MapaLab o escondido en modales del editor de capas. Ahora es una sección del sider, **Sextante** (feature `admin/src/features/sextante/`), con cinco subpáginas; el sider además sube **Acervo** por encima de Huachicol.

- **Nuevas:** `/sextante/workspaces` (registrados vs pendientes, alta incluida — el flujo salió del Alert de `LayerCreateModal`, que sigue usando el mismo `RegisterWorkspaceModal` ya movido a `sextante`), `/sextante/capas` (introspección workspace → capa → campos con valores de muestra + estilos + layer group) y `/sextante/estilos` (catálogo de SLDs por workspace con tipo detectado, capas que comparten el estilo, leyenda en vivo y XML copiable).
- **Movidas:** `/sextante/recursos` (antes `/mapalab/recursos-geoserver`) y `/sextante/simbolos` (antes `/mapalab/simbolos`); las rutas viejas redirigen.

### 2026-07-28 (1.96.0 – 1.97.2) — Sextante: recursos sin tope, tipografias y anclaje a la raiz del workspace

Seis subpáginas: se suma **Tipografías** (`/sextante/tipografias`).

- **Subidas sin tope.** Las partes del upload por chunks se acumulan en **disco** (`GEOSERVER_UPLOAD_STAGING_DIR`, volumen propio del contenedor) y no en Redis, donde el tope de 200 MB existía porque eran memoria. `GEOSERVER_UPLOAD_MAX_BYTES=0` (default) = sin límite; el techo es el disco de la VM. El PUT a GeoServer corre en threadpool (si no, gunicorn mata al worker por su `--timeout 300`), usa los bytes realmente acumulados como `Content-Length`, renueva el TTL por chunk y limpia los directorios de subidas abandonadas.
- **Recursos se ancla a la raíz del workspace** (`resource/workspaces/<ws>`), no a `styles/`, para que el geoanalista elija dónde poner cada archivo. **El ámbito global sigue en `styles/`**: su raíz es el data dir completo (`security/`, `logs/`, `global.xml`). Consecuencia: el `xlink:href` del snippet SLD es relativo a la carpeta del SLD, así que un archivo fuera de `styles/` se referencia con `../` (`_sld_href`).
- **Tipografías.** Solo `ttf`/`otf` (lo único que lee Java 2D). Las institucionales —las **Garet**— no viven en el data dir: están versionadas en el repo `geoserver` (`fonts/`) y montadas en `/usr/share/fonts/custom`, así que se declaran con `GEOSERVER_INSTALLED_FONT_FAMILIES` para no darlas por ajenas.
- **Actividad.** Subidas, borrados y reload quedan en `actividad` (`geoserver.file.upload`, `geoserver.file.delete`, `geoserver.fonts.reload`) con actor, IP, workspace, destino, tamaño y modo.
- **Vista alineada con el Acervo:** `PageHeading` compartido, tarjeta contenedora, breadcrumb con conteo y alternador Grid/Lista (`GeoserverFilesList`, `GeoserverFilesToolbar`, `GeoserverFilesContent`).
- **429 al navegar carpetas.** El grid pide una miniatura por archivo. Tres piezas lo evitan: la zona `geoserver_files` del gateway, el scope `geoserver_download` del API (3000/min) y el semáforo de 6 miniaturas (`thumbQueue` + `GeoserverThumb`). La descarga responde `private, max-age=60, must-revalidate` + ETag y **304** ante `If-None-Match`: **no** se marca `immutable` porque la URL es el nombre del archivo y Recursos permite sobrescribirlo.
- **Acceso:** el proyecto `sextante` del registry declara `accessSlug: 'mapalab'`, así que lo ve quien ya tenía MapaLab — el router `/geoserver/*` del backend depende de `require_project_access('mapalab')`. Workspaces y Símbolos siguen admin-only.
- **Backend:** `GeoServerClient.list_workspace_styles()` + `GET /geoserver/workspaces/{alias}/styles`. El resto reusa endpoints existentes.
- **Ícono de categoría de símbolos:** además de emoji admite cualquier símbolo del catálogo (imagen/SVG, guardado como URL del Acervo). Las respuestas de categoría exponen `iconUrl` derivado; lo consume mapalab 1.88.0. Sin migración (`icon` ya era `TEXT`). `SymbolPicker` se mudó a `mapalab-symbols/components/`.

Detalle en CHANGELOG §[1.82.0].

### 2026-07-24 (1.85.0) — SIEEJ: edición concurrente, copiar/pegar campos y una pestaña por campo

Tres cambios de usabilidad en el constructor visual de formularios.

- **Edición concurrente.** Bloqueo optimista (`actualizado_en_esperado` → 409 con quién y cuándo, en vez de pisar) más presencia en Redis reutilizando `services/presence.py` con scope `sieej_formulario`: avatares de quién está editando, en el header del editor (naranja si está en tu misma pestaña) y en cada tarjeta del listado. `GET /sieej/formularios/presencia` resuelve el listado completo en un solo scan y se declara antes que la ruta con parámetro. Columna `actualizado_por_id` (migración `b7c8d9e0f1a3`). Importa porque pisar una definición vieja puede clasificarse como cambio que rompe y reabrir envíos ya enviados.

- **Copiar / Pegar / Duplicar campo.** Evita recapturar a mano un campo cuya regex, catálogo, opciones o configuración de archivo ya costó afinar. El portapapeles vive en `localStorage` (`mariachi.sieej.fieldClipboard`) para cruzar formularios y pestañas del navegador sin permisos; `fieldClipboard.js::prepareFieldForPaste` normaliza al pegar (nombre duplicado → sufijo, `tab` → pestaña activa, `showWhen` huérfano → se quita, `bucket` sin acceso → `sieej`) y avisa de cada ajuste. Sin backend.
- **Se elimina «Comunes».** Un campo sin `tab` se renderizaba repetido en todas las pestañas del elemento y ninguna vista del CMS mostraba el orden real que veía quien captura — origen de los reportes de campos duplicados y de orden inestable. Ahora cada campo pertenece a exactamente una pestaña: `definicion_validator` exige `tab`, el editor asigna la primera a los que no la traían, eliminar una pestaña pide a cuál se mueven sus campos, y un repeater sin pestañas ofrece «Dividir en pestañas». Migración `a6b7c8d9e0f1` sobre las tres columnas JSONB; el renderer de SIEEJ >= 1.39.0 hace el mismo fallback para los snapshots históricos (antes un `tab` inexistente ocultaba el campo por completo). `tab` no es campo significativo del clasificador, así que no sube versión ni reabre envíos.

### 2026-07-24 (1.80.0) — Instituciones del catálogo de MapaLab + invalidación de su caché

El catálogo de capas (`mapalab.catalogo_capas`) se agrupa por la dependencia que produce cada capa. La subpágina pasa a pestañas «Capas» / «Instituciones» (estado en `useCatalogoData`, vista de capas en `CapasTab`), la edición se mueve a la fila expandible (`CapaDetalleEditor`), hay buscador general, acciones en lote (`SelectionActionsBar` → `POST /catalogo/bulk-update`) y reorden por drag & drop de instituciones. Slugs con namespace compartido entre capas e instituciones (`/catalogo/<slug>` resuelve ambos). Cada escritura invalida la caché de 5 min del backend público de mapalab (`POST /catalogo/invalidate-cache` con `X-Internal-Token`), y `ALLOWED_EVENT_NAMES` incorpora `catalogo_share` / `catalogo_institucion_select` (un evento no permitido tumbaba el batch completo con 422). Requiere la migración `0028_catalogo_instituciones` de dataengine + mapalab 1.86.0. Detalle en CHANGELOG §[1.80.0].

### 2026-07-24 (1.79.0) — SIEEJ: los tipos `email` y `tel` se absorben en `text` + catálogo de regex

`email` y `tel` eran texto con un patrón fijo, así que desaparecen como tipos de campo. El constructor visual ofrece un `AutoComplete` único donde el admin elige un formato común (correo, teléfono de 10 dígitos, CURP, RFC, código postal, CLABE, URL…) **o** escribe su propio regex, que se guarda en `validation.pattern` / `validation.patternMessage`. La migración `a5b6c7d8e9f1` reescribe los campos existentes en las tres columnas JSONB (`formulario.definicion`, `envio_formulario.definicion_snapshot`, `formulario_version.definicion`); es idempotente y reversible. Requiere el frontend SIEEJ >= 1.34.0. Detalle en CHANGELOG §[1.79.0].

### 2026-07-24 (1.78.0) — SIEEJ: actualización ligera de campos post-envío con historial de auditoría

Un field marcado `editableAfterSubmit` se corrige sobre un envío ya `enviado` **sin reabrirlo** (`PUT /formularios/mis-envios/{id}/actualizar-campos`, merge parcial de `datos`, el estado no cambia). Los paths permitidos se derivan del `definicion_snapshot` del envío, no de la definición vigente. Lo nuevo de fondo es que ahora existe versionado de **valores**, no solo de definiciones: la tabla append-only `sieej.envio_valor_historial` (migración `f2b3c4d5e6a7`) guarda `valor_anterior`/`valor_nuevo` por cambio, se registra un evento `actualizado` y el export de envíos incluye la tabla "Historial de cambios". Aplica solo a campos de pasos `form` (repeaters y `file` fuera). Requiere el frontend SIEEJ >= 1.33.0. Detalle en CHANGELOG §[1.78.0]. **Superado en 1.87.0–1.89.0**: hoy aplica a cualquier tipo de campo y la marca la manda la definición vigente.

### 2026-07-24 — SIEEJ: apertura periódica de formularios (sin bump propio)

Un formulario puede abrir una ventana de captura recurrente (`mensual`/`trimestral`/`semestral`/`anual`) en vez de una vigencia única, y **cada periodo genera un envío nuevo** para que el histórico no se sobreescriba. La configuración vive en `sieej.formulario.periodicidad` (JSONB, `NULL` = comportamiento histórico), cada ventana concreta es una fila de `sieej.formulario_periodo`, y el `UNIQUE (formulario_id, usuario_id)` se parte en dos índices parciales según `periodo_id` (migración `f9a0b1c2d3e4`). Lo que decide si está abierto se **computa de la config**, no del `estado` de la fila, así que el gating es correcto aunque el tick no haya corrido. `PeriodosService.tick()` (idempotente, invocado por el sidecar `cron-sieej` y por `POST /sieej/periodos/tick`) materializa ventanas, abre, cierra y dispara los avisos de apertura (al creador) y de faltantes (al creador y a los administradores) por el webhook de Discord de SIEEJ, con bitácora en `sieej.notificacion` exportable a CSV/XLSX desde la pestaña **Periodos** del CMS. No hay correo: el stack no tiene SMTP.

**Pendiente documental:** los tres commits de esta feature (`e26f562`, `c4b71d3`, `1fd73f8`) no bumpearon versión ni abrieron entrada de CHANGELOG. El contrato completo sí está en `docs/sieej.md` §"Apertura periodica". Lado respondent: sieej 1.35.0.

### 2026-07-23 (1.74.0) — Reordenamiento drag & drop de capas del catálogo y opciones de catálogos SIEEJ

Dos features de reordenamiento conectadas por un componente genérico compartido.

- **Catálogo de capas:** nueva columna `orden` en `mapalab.catalogo_capas` y endpoint `PUT /catalogo/reorder`. El admin gana un botón "Reordenar" que activa una tabla con drag & drop (`CapasReorderTable`). Las capas nuevas y de alta masiva reciben `MAX(orden)+1`.
- **Catálogos SIEEJ:** nueva columna `posicion` en `sieej.catalogo_opcion` (migración `e1a2b3c4d5f6`) y endpoint `PUT /sieej/catalogos/{clave}/reordenar`. La tabla de opciones dentro de cada catálogo gana una columna drag handle. Las opciones nuevas quedan al final.
- **Componente compartido:** `SortableTableRow` + `DragHandleCell` en `admin/src/shared/components/SortableTableRow.jsx`. Extraídos de `CapasSortableRow` (eventos), que ahora es un re-export. Lo consumen catálogo de capas, catálogos SIEEJ y cualquier tabla futura con drag & drop.
- **Tests:** 3 tests nuevos en `test_sieej_catalogos.py` (creación ordenada, reordenar persiste, IDs incompletos da 400).

Detalle en CHANGELOG §[1.74.0] y procedimientos de deploy en RUNBOOK.md.

### 2026-07-21 (1.61.0) — Footer del sider unificado + notas de versión en modal + fusión de versiones

Dos frentes. **UI:** el pie del sider pasa de dos bloques (icon-rail de Revisiones/Actividad + menú de Documentación) a **una sola fila** que abarca el ancho, con Documentación · Actividad · Revisiones · Notas de versión separados por dividers y cada uno con tooltip (iconos blancos). `buildIconRailItems`/`buildSiderFooterItems` → `buildSiderFooterRail`; `FOOTER_ITEMS`/`ICON_RAIL_ITEMS` → `FOOTER_RAIL_ITEMS`. Notas de versión sale del Inicio y se abre como modal (`VersionNotesModal`) reutilizando `getNotasVersion` + `Markdown`.

**Versionado:** se **fusiona el doble número** `api X / admin Y` en uno solo para el monorepo. `api/pyproject.toml` es la única fuente de la verdad (lo que `get_app_version()` reporta en `/ontoy`, `/` y docs); `admin/package.json` se alinea. Nuevo `scripts/bump-version.sh <x.y.z>` sincroniza ambos y abre la entrada del CHANGELOG. `changelog_parser` normaliza la versión (extrae el semver) para que el modal muestre `1.60.0` en vez del label dual legacy. Los headers `[api X / admin Y]` previos quedan como histórico. Detalle en CHANGELOG §[1.61.0].

### 2026-07-20 (api 1.60.0 + admin 1.59.0) — SIEEJ: fechas abiertas en el campo de rango

Un `date_range` puede sustituir un extremo por una opción de catálogo cuando no hay fecha exacta (`10/02/1992 – NO DETERMINADO`). Opt-in por campo vía `openStart` / `openEnd`; `openCatalog` elige el catálogo y cae al del sistema `estatus_fecha` si se omite.

- **Catálogos del sistema**: nuevo `app/services/sieej/catalogos_sistema.py` como fuente de verdad (sin columna en BD) de los catálogos que no se pueden eliminar. `delete_catalog` da 409; renombrar y editar opciones sigue permitido. Sembrado por la migración idempotente `b7c8d9e0f1a2`. El admin los marca con tag "Sistema".
- **Contrato**: el valor gana `startOption` / `endOption`; cada extremo lleva fecha **u** opción, y `start <= end` solo se compara si ambos son fechas. Sin migración de datos — los envíos previos siguen válidos.
- **Integridad**: un `date_range` con fecha abierta cuenta como campo enlazado al catálogo (`claves_referenciadas`), así que hereda la propagación de renombres y el bloqueo de borrado que ya tenían los `select`. Apagar un extremo abierto se clasifica como cambio que rompe.
- Lado respondent (`iieg-oficial/sieej` 1.32.0): el selector de estatus vive **dentro** del panel del calendario, no como control aparte.

Detalle en CHANGELOG §[api 1.60.0 / admin 1.59.0] y contrato completo en `docs/sieej.md`.

### 2026-07-13 (api 1.55.0 + admin 1.53.0) — SIEEJ: reorganiza versiones — clasifica cambios menor/rompe, propaga y avisa actualización

El modelo de versionado de formularios SIEEJ se reorganiza con clasificación automática de cambios, propagación a envíos en proceso y aviso al respondent con distintivos en sider/paso/campo.

- **Clasificador** (`cambio_classifier.py`): distingue cambios `menor` (se propagan a `en_proceso` sin subir versión: label, tooltip, layout, orden, agregar opcional, aflojar validación) de `rompe` (sube versión y congela a quien ya empezó: eliminar/agregar campo obligatorio, opcional→obligatorio, cambiar type, quitar opciones, endurecer validación, cambiar catalog/type de step).
- **Propagación**: al editar definición, `formularios_admin_service.actualizar()` devuelve `tuple[Formulario, cambio_info|None]` con la clasificación. El admin muestra toast diferenciado según el tipo.
- **Aviso al respondent**: `EnviosService` expone `actualizar_version()` (conserva `datos`, persiste diff en `cambios_pendientes`) e `info_cambios()` que devuelve `actualizacion_disponible`, `cambios_preview` y `cambios_aplicados`. Endpoint `POST /formularios/{slug}/envio/actualizar-version`.
- **Respuesta del frontend** (sieej v1.26.0): banner "El formulario se actualizó" con Ver qué cambió · Actualizar. Badges en StepIndicator, chip "Actualizado" en FormStep, badges "Nuevo"/"Cambió" en FieldRenderer. Los distintivos se limpian al visitar/editar cada campo.
- **BD**: columna `cambios_pendientes` JSONB en `sieej.envio_formulario` (migración `a0b1c2d3e4f5`). En staging/prod correr `alembic -x db=mariachi upgrade head`.
- **Admin visor de envíos** (incluido en este release): `EnvioDetalleDrawer` con `snapshotUtils` (buildRespuestas, diffDefiniciones), tag "Desactualizado" en `EnviosTable`, bucket `sieej` por defecto en `FieldForm`.

### 2026-07-10 (admin v1.51.0 + api v1.51.0) — Acervo: miniaturas por ruta pública anónima (buckets públicos) + snippets de integración

La miniatura serializada en `thumbnail` pasa de la ruta autenticada `/api/administrador/acervo/thumb/{bucket_id}/...` a la ruta **pública anónima** `/acervo/thumb/{bucket_name}/{path}?w=`, para que cualquier frontend del ecosistema incruste miniaturas de buckets **públicos** sin sesión. Puntos clave:

- **Backend**: nuevo `acervo.public_router` (`GET /acervo/thumb/{bucket_name}/{path}?w=`, sin auth) que reusa `_serve_thumbnail`; devuelve `404` si el bucket no es público. `thumbnail_for(...)` recibe `is_public`: raster público → ruta pública, SVG → `url`, **privado → `null`** (los privados no llevan previsualización, por decisión de producto). La ruta autenticada por `bucket_id` sigue disponible para staff. Fix: `eliminar_archivo` recupera su `return` (se había quedado sin valor).
- **Gateway-hub**: nueva `location ^~ /acervo/thumb/` → `mariachi-nginx` (antes que `^~ /acervo/` → SeaweedFS, que si no devolvía `403`). Requiere `make deploy` del gateway-hub.
- **Admin — snippets contextuales por archivo**: cada imagen del Acervo tiene un botón `</>` (`CodeOutlined`, en vista lista y grid) que abre `FileSnippetsModal` con los snippets **generados desde la ruta real** del archivo (`<img>` directo, miniatura WebP, `srcSet` 120/400/1280, componente React JSX y `<Image>` de AntD con preview), copiables con un clic (botón Copiar en el título de cada panel); usa `toPublicUrl`/`thumbVariant`. Para buckets privados solo ofrece la URL del proxy (sin miniatura). La doc `/mariachi/documentacion` (tab Acervo) se reorganizó en **2 pestañas** ("Uso del panel" y "Miniaturas y URLs"); se eliminó la pestaña de ejemplos estáticos en favor del botón por archivo.

### 2026-07-10 (admin v1.52.0 + api v1.52.0) — Acervo: ayuda contextual (botón Documentación + modal + deep-links)

Ayuda contextual desde el gestor `/mariachi/acervo` hacia la documentación, sin salir de la página. Solo admin.

- Botón **Documentación** en el encabezado de `/mariachi/acervo` que abre `AcervoHelpModal` (`features/documentacion/components/AcervoHelpModal.jsx`), un modal que renderiza `AcervoTopic` en la pestaña pedida. Abre en "Uso del panel".
- `AcervoTopic` acepta `defaultActiveTab` (`uso`|`thumbs`) y `showHeader` (oculta su título dentro del modal).
- Los bloques de snippets (fila expandible en Lista y modal `</>` en Grid) muestran un link **"Guía de miniaturas y URLs"** (`FileSnippets` recibe `onHelp`) que abre el modal en "Miniaturas y URLs"; en el diagnóstico no, para no anidar.
- `DocumentacionPage` respeta `?topic=acervo&sec=uso|thumbs` para deep-links directos a la sub-pestaña.

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
