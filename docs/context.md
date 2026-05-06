# Mariachi + Portal — Contexto del Proyecto

> Documento de referencia completo. Leer este archivo proporciona contexto del monorepo sin explorar el codebase.

**Versión:** 0.40.6 · **Última actualización:** 2026-05-06


---

## Qué contiene este repositorio

Este monorepo aloja el panel de administración del ecosistema IIEG y el backend compartido por varios productos:

| Producto | Qué es | Carpeta | Ruta publica | Estado |
|---|---|---|---|---|
| **Mariachi** | Panel de administración del ecosistema IIEG (Ant Design) | `admin/` | `/mariachi/` | Activo |
| **SIEEJ (frontend)** | Captura de formularios para dependencias de gobierno (otro repo: `iieg-oficial/sieej`) | servido como volumen en `mariachi-nginx` | `/sieej/` | Activo |

El **Portal público** (sitio web del IIEG) se separó a su propio repo `iieg/portal/` (ver README raíz). Consume `/api/portal/*` de este `api`.

Mariachi y SIEEJ consumen el mismo backend FastAPI en `api/` con el mismo prefijo `admin_prefix` (`/api/administrador`). Mariachi usa los routers `auth`, `users`, `pages`, `menu`, `media`, `borradores`, `layers`, etc. SIEEJ usa exclusivamente `/api/administrador/formularios/*` (ver `docs/sieej.md`).

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
- Nombre de BD `iieg_portal`
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
| MinIO client | 7.2+ (Acervo) |
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

Paginas: `Login`, `PageEditor`, `MenuManager`, `Media`, `RevisionQueue`, `Users`, `ChangePassword`, `MapalabLayers`.

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
| BD | PostgreSQL 18 (prod y dev) | DB: `iieg_portal` |
| Cache/sessions | Redis 7 | |
| Almacenamiento | Acervo (MinIO S3-compatible) | buckets por proyecto en `media_buckets`. **Publicos** (anonymous GetObject): `portal`, `mapalab`, `iieg`. **Privados**: `mariachi`, `sieej`, `dataengine` (deshabilitado). Cada bucket usa `<REF>_user` con policy attached al bucket; sin fallback a creds root. |
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
│   │   ├── models/               # user, page, menu_item, media, borrador
│   │   ├── schemas/              # Pydantic request/response
│   │   └── services/             # acervo (MinIO client)
│   ├── alembic/                  # Migraciones (solo BD iieg_portal por ahora)
│   ├── scripts/                  # init_db, generate_secret_key
│   ├── tests/
│   └── pyproject.toml            # name: mariachi-api
├── admin/                        # CMS Mariachi (Ant Design)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── pages/                # Login, PageEditor, MenuManager, Media, RevisionQueue, Users
│   │   ├── components/           # menuManager, MainLayout, etc.
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── services/             # apiService con axios + interceptors CSRF
│   └── package.json              # name: mariachi-admin
├── web/                          # Portal publico (congelado)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/apiService.js
│   └── package.json              # name: portal-web
├── nginx/                        # Proxy + sirve estáticos
│   ├── conf.d/mariachi.conf      # Template con envsubst
│   ├── ssl/
│   ├── static/                   # robots.txt, sitemap.xml
│   ├── nginx.conf
│   └── Dockerfile                # multi-stage: web-builder, admin-builder, nginx
├── docs/                         # Este directorio
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
| `DATABASE_URL` | `postgresql://user:pass@postgres:5432/iieg_portal` | BD principal del CMS |
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
| `ACERVO_ENDPOINT` / `ACERVO_PUBLIC_ENDPOINT` / `ACERVO_USE_SSL` / `ACERVO_VERIFY_SSL` | — | MinIO S3 (host y publico, sin creds globales) |
| `ACERVO_<REF>_ACCESS_KEY` / `ACERVO_<REF>_SECRET_KEY` | — | Creds **por bucket** (REF coincide con `media_buckets.access_key_ref`). Sin fallback a creds root del cluster: cada bucket activo requiere su par. |

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
- Assets institucionales (`logos/`, `icons/`, `fonts/`, `docs/`): solo el rol global `tetlamamakani` puede subir (control via `media_buckets` y permisos del proyecto `iieg`).
- Avatars de usuarios (`avatars/u<id>/...`): cualquier usuario autenticado sube SU PROPIO avatar via el endpoint de perfil; mariachi-api valida que el `user_id` del path coincida con `current_user.id`.

**Convencion de versionado** (assets institucionales): usar paths inmutables (`logos/v1/logo.svg`, `logos/v2/logo.svg`) en lugar de sobreescribir, para no invalidar cache de browsers ni romper frontends que apunten a una version especifica.

### Bucket privado `mariachi`

Reservado para assets administrativos internos del panel admin que NO se exponen al publico: logs descargables, exportaciones internas, archivos staff-only. NO almacena avatars (esos viven en `iieg`). Acceso requiere autenticacion como staff y mariachi-api debe servirlos via presigned URLs o proxy autenticado, NO con URL publica.

El proxy autenticado vive en `GET /api/administrador/multimedia/proxy/{bucket_id}/{object_path}` y es la ruta por defecto que devuelve `AcervoClient.get_file_url` cuando el bucket está marcado `is_public=false`. Devuelve un `StreamingResponse` con `Cache-Control: private, max-age=300`.

### Sub-rutas reservadas dentro de buckets compartidos

Algunos features escriben en sub-prefijos del bucket que NO deben aparecer en el listado de la página de Multimedia (porque su CRUD se maneja desde otra UI):

| Bucket | Prefijo oculto | Quién lo escribe |
|---|---|---|
| `mariachi` | `reportes/` | `routes/reportes_public.py` (screenshots de reportes) |

La lista vive en `app/core/bucket_policies.py::HIDDEN_PREFIXES_BY_BUCKET` y `media_service.listar_media` la consulta cuando se navega la raíz del bucket (no se aplica si el usuario navega explícitamente al prefix oculto, p. ej. `?folder=/reportes`).

### Carpetas del CMS (`media_folders`)

`media_folders` es scoped por bucket: cada fila tiene `bucket_id` (FK CASCADE a `media_buckets`) y la unicidad es `(bucket_id, path)`. Esto permite que dos buckets distintos tengan una carpeta con el mismo nombre/ruta sin colisión. El frontend siempre envía `bucket_id` al listar/crear/eliminar carpetas. La columna `media.folder` ya no es FK a `media_folders.path` (lo era antes del scoping); se persiste como string libre.

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
| POST | `/auth/login`, `/auth/logout` | |
| GET/POST/PUT/DELETE | `/users/*` | Gestión de usuarios |
| GET/POST/PUT/DELETE | `/pages/*` | Editor de paginas |
| GET/POST/PUT/DELETE | `/menu/*` | Gestión de menu |
| GET/POST/PUT/DELETE | `/multimedia/*` | Upload/listado/edición de archivos por bucket |
| GET | `/multimedia/proxy/{bucket_id}/{object_path}` | Stream autenticado para buckets privados |
| GET/POST/DELETE | `/multimedia/carpetas/*` | CRUD de carpetas (scoped a `bucket_id`) |
| GET/POST/PATCH | `/media-buckets/*` | CRUD de buckets registrados (admin solo en writes) |
| GET/POST/PATCH | `/borradores/*` | Revision queue |
| GET | `/preview/*` | Preview de paginas sin publicar |

Requieren cookie JWT valida + CSRF en writes.

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
| POST | `/api/administrador/layers/auto-leaf` | Idempotente: devuelve o crea un leaf con `(workspace_alias, geoserver_layer)` bajo el padre `eventos-auto` (tema oculto, on-demand). Usado al asociar una capa "solo GeoServer" a un evento |
| POST | `/api/administrador/borradores/por-id/{id}/aprobar` | Aprueba borrador; si `resource_type='layer'`, materializa en DataEngine |
| GET | `/metrics` | Metricas Prometheus (sin auth, usado por huachicol) |

Rate limiting: writes en 60 req/min por usuario, reads de GeoServer en 120 req/min. Responde `429` con header `Retry-After`.

Editor UI: `admin/src/pages/MapalabLayers.jsx` con Ant Design Tree + drawer. Componentes del drawer de InfoBox en `admin/src/components/layersEditor/`: `InfoBoxPresetForm`, `InfoBoxPreview`, `InfoBoxJsonEditor`.

Ver la documentación interna de mapalab (`/IIEG/mapalab/docs/layers.md`, `infobox.md`) para la arquitectura completa.

### v0.31.0 Editor de simbología (SLD) — implementado

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/api/administrador/geoserver/styles/{alias}/{style_name}` | Devuelve `{rawXml, editable, shape, model, sharedBy, reason}` con detección automática del shape (choropleth/boundary) |
| GET | `/api/administrador/geoserver/legend/{alias}/{layer}/{style_name}` | Proxy a `GetLegendGraphic` de GeoServer (independiente del gateway-hub) |
| GET | `/api/administrador/geoserver/palettes` | Lista las 144 paletas oficiales del CSV `paletas_simbologia.csv` |
| POST | `/api/administrador/borradores/por-id/{id}/aprobar` | Si `resource_type='sld'`, genera SLD y hace `put_sld` con verificación SHA256 round-trip |

Editor UI: `admin/src/features/mapalab-layers/components/sldEditor/` — tab "Simbología" en `LayerEditPage` (visible solo en `group`/`leaf`). Soporta dos shapes:

- **`choropleth`** — coropleticos por rangos numéricos del pipeline `estilos-coropleticos-mapalab` (formato canónico). Editor visual con cortes/labels/paleta/borde/null_style.
- **`boundary`** — estilo único + label de TextSymbolizer. Cubre límites/regiones con tabs Polígono / Etiqueta (con halo, placement, vendor options, scale denominators).

Cualquier otro shape (Raster/Point/Line, filtros categóricos, layer groups) cae al fallback `RawXmlFallback` con mensaje claro y leyenda renderizada por GeoServer; el XML se muestra read-only.

Workflow de aprobación: reusa la tabla `borradores` con `resource_type='sld'`, `resource_id='{alias}:{style_name}'`. Sin schema nuevo. Botón "Solicitar revisión" → `tetlamamakani` aprueba en `RevisionQueue` → backend genera SLD → upload a GeoServer → `notify_tree_changed()` invalida cache.

Ver `docs/SLD_EDITOR.md` para la referencia completa por componente.

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

## BD iieg_portal

Tablas existentes (modelos en `api/app/models/`):

- `usuarios`
- `paginas`
- `menu_items`
- `media`
- `borradores`

Migraciones via Alembic en `api/alembic/versions/`.

**v1.4.0 de MapaLab agrega** 3 tablas a **otra BD** (DataEngine, no a `iieg_portal`):

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

---

## Ecosistema

Este repo se integra con otros servicios internos vecinos (CMS, visor de mapas, DataEngine PostgreSQL+PostGIS, gateway Nginx, almacenamiento S3-compatible, GeoServer, stack de observabilidad) que comparten una red Docker común. Los detalles de topología son internos.

---

## Cambios recientes

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
- **Auto-leaf en eventos**: `POST /layers/auto-leaf` idempotente que materializa una capa "solo GeoServer" como leaf bajo el padre `eventos-auto` (tema oculto, on-demand). `CapasField.addCapa` lo invoca antes de asociar la capa al evento, asi el visor de mapalab encuentra la capa en su arbol y la renderiza.
- **Drawer reutilizable de edicion**: `LayerContentDrawer` con tabs Tarjeta · Metadatos · Simbologia, montado desde `CapasField` (boton `EditOutlined` por capa). Reusa `LayerMetadataSection` y `SldEditor` tal cual; envuelve `InfoBoxBlocksEditor` + `InfoBoxPreview` en un `InfoboxStandalone` con su propio Form. Permite editar contenido sin navegar al `LayerEditPage`.
- **Fix global camelCase**: nuevo mixin `CamelCaseInput` aplicado a los schemas que reciben input (Layer, Evento, Page, MenuItem, Usuario, Reporte, LayerMetadata, MediaBucket, Media, Project, HomeSection payloads). Antes, los schemas declaraban solo `serialization_alias=` y el input camelCase del frontend se ignoraba silenciosamente, lo que causaba que muchas ediciones perdieran campos en el PUT/PATCH sin error visible.
- **Fix GeoServer client**: `list_workspaces`/`list_layers` toleran respuesta vacia (`{"layers":""}` como string) que GeoServer devuelve para workspaces sin layers. Antes lanzaba AttributeError.

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
- **GRANTs sobre `mapalab.*`** automatizados en `mapalab-dataengine` v1.6.0 (paso 3b de `bootstrap-v14.sh`). Sin eso, el editor truena con `permission denied for table layers`. Ver `DATAENGINE_CREDENTIALS.md` §3.1.
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
- `scripts/rename-github-repo.sh` — actualiza remote local tras rename en GitHub
- `scripts/migrate-acervo-bucket.sh` — migra contenido de bucket `portal-dev` a `mariachi-dev`
- `docs/PENDIENTES.md` — roadmap del CMS
