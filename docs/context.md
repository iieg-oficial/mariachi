# Mariachi + Portal — Contexto del Proyecto

> Documento de referencia completo. Leer este archivo proporciona contexto del monorepo sin explorar el codebase.
>
> Ultima actualizacion: 2026-04-22

---

## 1. Que contiene este repositorio

Este monorepo aloja **dos productos distintos** que comparten backend e infraestructura:

| Producto | Que es | Carpeta | Ruta publica | Estado |
|---|---|---|---|---|
| **Mariachi** | CMS para editar el Portal (admin panel con Ant Design) | `admin/` | `/administrador/` | Activo (se desarrolla) |
| **Portal** | Sitio web publico del IIEG | `web/` | `/` | **Congelado** (no se desarrolla mas) |

Ambos consumen el mismo backend FastAPI en `api/` pero con prefijos de URL distintos.

**Origen del nombre:** la carpeta del repo se llamaba `portal/` originalmente. En 2026-04-22 se renombro a `mariachi/` para reflejar que el CMS es lo unico que se sigue desarrollando. El portal publico sigue alli pero congelado.

---

## 2. Historia breve del rename (2026-04-22)

El monorepo se renombro de `portal/` a `mariachi/` porque:

- El nombre "portal" era ambiguo: habia **el sitio publico** (producto) y **el repo** (que contiene tanto el sitio publico como el CMS).
- El desarrollo del sitio publico (`web/`) se detuvo — lo asignaron originalmente aqui pero se retiro del alcance.
- El CMS (`admin/` + `api/`) es lo unico con roadmap activo, y su nombre interno es **Mariachi**.

El rename fue **solo de carpeta e identificadores internos de infra** (docker compose, container names, networks). **No se toco**:

- Branding publico "Portal IIEG", "CMS Portal" en UI
- Rutas URL (`/api/portal`, `/api/administrador`)
- Nombre de BD `iieg_portal`
- Upstream `portal` en el gateway externo (se mantiene por conflicto de nombres con otro upstream ya existente)

---

## 3. Stack

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
| Proxy interno | Nginx | sirve `web/dist` en `/`, `admin/dist` en `/administrador/`, proxea `api/` a backend |
| BD | PostgreSQL 16 (prod) / 18 (dev) | DB: `iieg_portal` |
| Cache/sessions | Redis 7 | |
| Almacenamiento | Acervo (MinIO S3-compatible) | bucket `iieg-acervo` (prod), `portal-dev` (dev) |
| DataEngine (solo v1.4.0+ MapaLab) | PostgreSQL + PostGIS externo | Segunda conexion para tabla `layers` |
| Contenedores | Docker Compose | profiles: prod (`docker-compose.yml`), dev (`docker-compose.dev.yml`) |

---

## 4. Estructura

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
├── nginx/                        # Proxy + sirve estaticos
│   ├── conf.d/mariachi.conf      # Template con envsubst
│   ├── ssl/
│   ├── static/                   # robots.txt, sitemap.xml
│   ├── nginx.conf
│   └── Dockerfile                # multi-stage: web-builder, admin-builder, nginx
├── docs/                         # Este directorio
├── docker-compose.yml            # name: mariachi (prod)
├── docker-compose.dev.yml        # name: mariachi-dev
├── Makefile
├── .env.example
├── .env.development.example
└── README.md
```

---

## 5. Contenedores y red

### docker-compose.yml (prod)

| Servicio | Container name | Puerto | Funcion |
|---|---|---|---|
| `nginx` | `mariachi-nginx` | 80, 443 | Proxy + estaticos |
| `postgres` | `mariachi-postgres` | interno | PostgreSQL 16 |
| `redis` | `mariachi-redis` | interno | Cache/sessions |
| `api` | `mariachi-api` | interno | FastAPI + Gunicorn |

Red: `mariachi_network` (antes `portal_network`).

### docker-compose.dev.yml

| Servicio | Container name | Puerto | Funcion |
|---|---|---|---|
| `postgres` | `mariachi-postgres-dev` | 5432 | PostgreSQL 18 |
| `redis` | `mariachi-redis-dev` | 6379 | Cache/sessions |
| `api` | `mariachi-api-dev` | 8000 | Uvicorn --reload |
| `web` | `mariachi-web-dev` | 3010 | Vite dev server |
| `admin` | `mariachi-admin-dev` | 3011 | Vite dev server |

Red: `mariachi_network_dev`.

---

## 6. Variables de entorno clave

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
| `ACERVO_ENDPOINT` / `ACERVO_ACCESS_KEY` / etc. | — | MinIO S3 |

### Frontend (Vite)

| Variable | Uso |
|---|---|
| `VITE_WEB_API_URL` | Base URL que usa `web/` (portal publico). Ej: `https://tu-dominio.com/api/portal` |
| `VITE_ADMIN_API_URL` | Base URL que usa `admin/` (CMS). Ej: `https://tu-dominio.com/api/administrador` |
| `VITE_APP_NAME` / `VITE_ADMIN_APP_NAME` | Branding |
| `VITE_GOOGLE_ANALYTICS_ID` | GA4 |

---

## 7. Autenticacion

### Flujo

1. Admin entra a `/administrador/` en el navegador.
2. Login emite cookie `access_token` con JWT (`HttpOnly Secure SameSite=lax`).
3. Frontend guarda CSRF token en memoria y lo envia como header `X-CSRF-Token` en writes.
4. Backend valida cookie (`get_current_user`) + CSRF (`verify_csrf`) en rutas protegidas.
5. `require_role([...])` para control de roles.

### Roles

Definidos en `models/user.py`. Flujo de revision con `RevisionQueue` permite aprobacion antes de publicar.

### Cookie compartida con MapaLab (v1.4.0)

Un `COOKIE_DOMAIN` apuntando al subdominio comun (ej. `app.tu-dominio.com`) hace que la cookie sea valida en `/mapalab/*` tambien. Esto permite que:

- El admin autenticado en `/administrador/layers` tenga sesion automatica al ir a `/mapalab/` (ej. para un boton de preview).
- El backend de mapalab NO necesita validar auth (solo lee capas, endpoints publicos). Solo mariachi valida auth para writes.

Ver `docs/COOKIES_CSRF.md` para detalles completos.

---

## 8. Endpoints principales

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
| GET/POST/PUT/DELETE | `/users/*` | Gestion de usuarios |
| GET/POST/PUT/DELETE | `/pages/*` | Editor de paginas |
| GET/POST/PUT/DELETE | `/menu/*` | Gestion de menu |
| GET/POST | `/media/*` | Upload a Acervo |
| GET/POST/PATCH | `/borradores/*` | Revision queue |
| GET | `/preview/*` | Preview de paginas sin publicar |

Requieren cookie JWT valida + CSRF en writes.

### v1.4.0 MapaLab (capas) — implementado

| Metodo | Ruta | Funcion |
|---|---|---|
| GET/POST/PUT/DELETE/PATCH | `/api/administrador/layers/*` | CRUD de capas en DataEngine via `get_dataengine_db()`. Invalida `mapalab.layer_tree_cache` via `notify_tree_changed()` |
| GET/PUT | `/api/administrador/layer-metadata/{layer_key}` | CRUD de metadata descriptiva (`mapalab.layer_metadata`) |
| GET/PUT | `/api/administrador/layer-metadata/{layer_key}/stats` | CRUD de numeralia + stats_config (`mapalab.layer_stats`) |
| GET | `/api/administrador/geoserver/*` | Introspeccion GeoServer REST (workspaces, campos, estilos) |
| POST | `/api/administrador/borradores/por-id/{id}/aprobar` | Aprueba borrador; si `resource_type='layer'`, materializa en DataEngine |

Editor UI: `admin/src/pages/MapalabLayers.jsx` con Ant Design Tree + drawer.
Script de migracion 1-shot: `api/scripts/migrate_mapalab_card.py` (copio `public.mapalab_card` → `mapalab.layer_metadata` + `mapalab.layer_stats`).

Ver la documentacion interna de mapalab para la arquitectura completa.

---

## 9. Integracion con el gateway externo

Un gateway Nginx externo enruta segun path. Rutas relevantes para este repo:

| Ruta gateway | Upstream | Destino |
|---|---|---|
| `/` | `portal` (`PORTAL_HOST`) | `mariachi-nginx` (este repo) → `web/dist` |
| `/api/` | `portal` (`PORTAL_HOST`) | `mariachi-nginx` → `mariachi-api` |
| `/administrador/` | `portal` (`PORTAL_HOST`) | `mariachi-nginx` → `admin/dist` |

**Atencion:** el gateway mantiene el nombre `portal` en su upstream por conflicto de nombres con otro upstream ya existente. Se deja como esta.

La variable `PORTAL_HOST` del gateway sigue apuntando al container de este repo (ahora `mariachi-nginx`) — el puerto/target no cambio, solo el container_name interno.

---

## 10. BD iieg_portal

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

Esas migraciones tambien viven en Alembic de este repo, pero apuntan a `DATAENGINE_DATABASE_URL`. Implica configurar multi-environment en `alembic.ini` (env `mariachi` vs `dataengine`).

---

## 11. Comandos (Makefile)

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

## 12. Integracion con MapaLab (v1.4.0)

A partir de v1.4.0 de MapaLab, mariachi expone un **editor de capas del visor** bajo `/administrador/layers`. Esto implica:

1. **Segunda conexion DB** a DataEngine (`DATAENGINE_DATABASE_URL`).
2. **Nuevo router** `api/app/api/routes/layers.py` con CRUD + reorder + duplicate.
3. **Nuevo router** `api/app/api/routes/geoserver.py` con introspeccion REST via `httpx`.
4. **Nuevo service** `api/app/services/geoserver_client.py`.
5. **Nuevos modelos** SQLAlchemy para `layers`, `workspaces`, `initial_layer_order` en `api/app/models/layer.py` (usan `DataEngineBase` de `core/database.py`).
6. **Nueva pagina admin** `admin/src/pages/LayersEditor.jsx` con Ant Design Tree + drag & drop.
7. **Validacion** contra GeoServer al crear/editar leaf.
8. **Resolucion de templates InfoBox** en backend (`municipio`, `punto`, `punto_completo`, etc.).

El visor de mapalab consume `GET /mapalab/api/layers/tree` (no pasa por este repo; mapalab tiene su propio backend que lee de la misma tabla `layers` en DataEngine).

Pre-requisitos: credenciales de escritura en DataEngine — ver `docs/DATAENGINE_CREDENTIALS.md`.

---

## 13. Ecosistema

Este repo se integra con otros servicios internos vecinos (CMS, visor de mapas, DataEngine PostgreSQL+PostGIS, gateway Nginx, almacenamiento S3-compatible, GeoServer, stack de observabilidad) que comparten una red Docker comun. Los detalles de topologia son internos.

---

## 14. Cambios recientes

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

## 15. Pendientes

### Listos para ejecutar (solo faltan credenciales / acciones externas)

- [x] **Alembic multi-environment** — configurado, ver `docs/ALEMBIC_MULTI_ENV.md`. Listo para crear migracion de DataEngine cuando haya credenciales.
- [x] **COOKIE_DOMAIN** — ajustado al subdominio especifico en `.env` (no versionado). El `.env.example` usa placeholder. Cubre `/administrador/*` y `/mapalab/*` sin exponer cookie a otros subdominios del dominio raiz.
- [x] **Script rename GitHub remote** — `scripts/rename-github-repo.sh`. Correr despues de renombrar en GitHub web.
- [x] **Script migracion bucket Acervo** — `scripts/migrate-acervo-bucket.sh`. Requiere `mc` instalado y acceso al endpoint de Acervo.

### Listo en dev local

- [x] **Rol `mariachi_layers` provisionado en DataEngine local** — validado: conecta, puede CREATE/DROP tablas, NO tiene acceso a `mapalab_card`. `DATAENGINE_DATABASE_URL` ya configurado en `.env.development` (no versionado).
- [x] **Alembic multi-env probado contra DataEngine local** — `alembic -x db=dataengine current` ejecuta sin errores (heads vacios, esperado hasta que arranque v1.4.0).

### Coordinacion externa

- [ ] **Renombrar repo en GitHub web** — ir a `https://github.com/<owner>/<repo-viejo>/settings` → Repository name → nuevo nombre. GitHub mantiene redireccion automatica. Luego correr `GH_OWNER=<owner> GH_OLD_REPO=<viejo> GH_NEW_REPO=<nuevo> scripts/rename-github-repo.sh --execute`.
- [ ] **Credenciales DataEngine en produccion** — coordinar con equipo para provisionar rol `mariachi_layers` en el DataEngine de prod (el mismo SQL de `docs/DATAENGINE_CREDENTIALS.md`, pero en la VM real + `pg_hba.conf` con IP del servidor mariachi + `sslmode=require`).
- [ ] **Bucket Acervo `mariachi-dev`** — ejecutar `scripts/migrate-acervo-bucket.sh --execute` cuando haya acceso al MinIO de Acervo. Luego actualizar `ACERVO_BUCKET_NAME` en `.env.development`.

---

## 16. Referencias

- `docs/ARCHITECTURE.md` — diagrama detallado del monorepo
- `docs/CONVENTIONS_BACKEND.md` — convenciones Python/FastAPI
- `docs/CONVENTIONS_CMS.md` — convenciones admin (Ant Design)
- `docs/CONVENTIONS_FRONTEND.md` — convenciones web (Tailwind)
- `docs/COOKIES_CSRF.md` — modelo de seguridad
- `docs/DRAFTS.md` — sistema de borradores y revision queue
- `docs/DATAENGINE_CREDENTIALS.md` — requerimientos para credenciales DataEngine
- `docs/ALEMBIC_MULTI_ENV.md` — migraciones en dos BDs (`-x db=mariachi|dataengine`)
- `scripts/rename-github-repo.sh` — actualiza remote local tras rename en GitHub
- `scripts/migrate-acervo-bucket.sh` — migra contenido de bucket `portal-dev` a `mariachi-dev`
- `docs/PENDIENTES.md` — roadmap del CMS
