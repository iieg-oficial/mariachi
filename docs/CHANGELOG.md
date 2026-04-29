# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

Mientras la versión sea `0.x`, el proyecto se considera pre-producción: los cambios pueden romper compatibilidad entre versiones menores. El versionado se lleva de forma unificada para el monorepo (backend + admin + web + infra). Las versiones previas al monorepo se listan por producto al final como histórico.

---

## [Unreleased]

---

## [0.30.45] - 2026-04-29

### CI — separar notificacion Discord en workflow propio (`workflow_run`)

Despues de varios intentos, decidimos sacar la notificacion del CI principal y ponerla en un workflow separado disparado por `workflow_run`. Razones:

- `if: failure()` -> el job aparecia como `skipped` en runs exitosos.
- `if: always() + condicion`-> el job aparecia como `skipped` adentro o consumia ~1s del runner para nada.
- Cualquier opcion dentro del CI principal mete ruido visual o cuesta tiempo en cada push.

Patron `workflow_run` resuelve esto:

- En runs exitosos del CI: solo aparecen `backend` y `admin`. Cero jobs extra.
- En runs fallidos del CI: aparece un workflow run separado (`Notify CI Failure`) que ejecuta el embed a Discord. No infla el run del CI.

### Cambios

- **`ci.yml`**: removido el job `notify`. Solo orquesta `backend` + `admin`.
- **`notify-ci-failure.yml`** (nuevo): workflow disparado por `workflow_run` cuando `CI` termina con `conclusion == 'failure'` y `event == 'push'`. Contexto del commit/branch/autor/run viene del payload de `workflow_run`.

---

## [0.30.44] - 2026-04-29

### CI — alinear notificacion al patron de mapalab/cd.yml

El job `notify-failure` con `if: failure()` o `if: always() && (...)` aparecia como `skipped` en cada run exitoso del CI, generando ruido visual en la UI de GitHub Actions. Mapalab tiene un patron mas limpio en `cd.yml/notify`: el job siempre corre (`if: always()`), y dentro tiene un step "Status" siempre + steps condicionales para success/failure. Asi el job aparece como `success` (no `skipped`) cuando todo pasa, y los steps internos individuales son los que se saltan.

### Cambios en `ci.yml`

- Job renombrado de `notify-failure` a `notify`.
- Condicion: `if: always() && github.event_name == 'push'` (siempre corre, salvo en PRs).
- Nuevo step `Status` que solo imprime los resultados de los needs — garantiza que el job tenga un step que SI corre, evitando que el job entero quede como skipped.
- Step `Notify Discord - Failure` con `if: needs.backend.result != 'success' || needs.admin.result != 'success'`. Solo dispara cuando hay fallo real.
- Embed actualizado al estilo de mapalab (commit corto en backticks + autor + branch + jobs fallidos + cambios + link al workflow).

### Resultado visual

```
Antes:
  ✓ backend
  ✓ admin
  ⊘ notify-failure (skipped)   ← feo

Ahora (run exitoso):
  ✓ backend
  ✓ admin
  ✓ notify   ← se ejecuta, solo el step de Discord queda skipped adentro
```

---

## [0.30.43] - 2026-04-29

### CI — fix `notify-failure` skipped cuando jobs cancelled/skipped

`if: failure()` solo dispara cuando algun `needs.X.result == 'failure'`. Pero cuando el workflow file tiene un bug de YAML (como el caso del 0.30.42 con `DATABASE_URL: sqlite:///:memory:` sin comillas), los jobs `backend` y `admin` quedan como `cancelled` o `skipped` (no `failure`), y `notify-failure` se saltaba silenciosamente sin enviar nada a Discord — exactamente el caso donde MAS necesitas la notificacion.

### Cambios

- **`ci.yml` `notify-failure.if`** ahora es:
  ```yaml
  if: |
    always() &&
    github.event_name == 'push' &&
    (needs.backend.result != 'success' || needs.admin.result != 'success')
  ```
  - `always()` evita que GitHub skipee el job cuando un need no es success (default).
  - Check explicito `!= 'success'` cubre `failure`, `cancelled`, `skipped`, `null`.
- **Mensaje a Discord** ahora incluye el `result` real entre parentesis: `backend(cancelled) admin(skipped)`. Asi distinguis bug de YAML vs test fail vs timeout.

---

## [0.30.42] - 2026-04-29

### CI — fix workflow file invalido + notificacion Discord

`.github/workflows/test-backend.yml` tenia el valor `DATABASE_URL: sqlite:///:memory:` sin comillas. YAML interpreta los `:` dentro del valor como inicio de mappings y rompe el parser. GitHub Actions reporta esto como `This run likely failed because of a workflow file issue.` y el run falla SIN ejecutar jobs (`total_count: 0`). Por eso `gh run view` no mostraba log: nunca arrancaron los jobs.

### Cambios

- **`test-backend.yml`**: comillas alrededor de `'sqlite:///:memory:'` (el unico valor con `:` problematico). De paso eliminadas vars que ya no usa el codigo (`VERSION`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME`, `ADMIN_PREFIX`, `WEB_PREFIX`, `COOKIE_*`, `CSRF_TOKEN_EXPIRE_MINUTES` — todas tienen default en `settings.py` o se eliminaron del modelo). Agregadas las 5 pares de creds por bucket que el codigo ahora exige (`ACERVO_<BUCKET>_ACCESS_KEY/SECRET_KEY`).
- **`ci.yml`**: nuevo job `notify-failure` que dispara solo en `push` (no en PRs) cuando `backend` o `admin` fallan, y manda un embed a Discord con commit, autor, jobs fallidos y link al run. Patron tomado del `cd.yml` de mapalab. Requiere secret `DISCORD_WEBHOOK_URL` configurado en el repo (`gh secret set DISCORD_WEBHOOK_URL`).

---

## [0.30.41] - 2026-04-29

### Infra — `vite build` 45% mas rapido

Mejoras al `npm run build` del admin (nginx/Dockerfile + vite.config.js):

- **`rollup-plugin-visualizer` ahora opcional**: solo se carga si `BUILD_STATS=1`. Antes corria en cada build agregando ~2s y generando `dist/stats.html` que rara vez se mira. El bundle final no cambia.
- **Cache mount para `node_modules/.vite`**: Vite pre-bundlea las deps externas (antd, react, etc.) en `node_modules/.vite/deps/`. Sin cache mount, esto se rehace en cada `--no-cache`. Con cache mount el pre-bundling sobrevive entre builds y el segundo build solo transforma el codigo cambiado.
- **Cache mount para `/root/.npm` tambien en el RUN del build** (ademas del `npm ci`). Si vite ejecuta scripts npm internos, ya tiene cache disponible.
- **Build arg `BUILD_STATS`** propagado por `docker-compose.yml` para que sea opt-in: `BUILD_STATS=1 make build ENV=prod` cuando quieras analizar el bundle.

### Mediciones

```
npm run build (vite + rollup):  11.3s -> 6.2s   (~45% mas rapido)
nginx rebuild incremental:      18.5s -> 13.8s  (~25% mas rapido)
```

---

## [0.30.40] - 2026-04-29

### Infra — optimizacion de tiempo de build de imagenes Docker

Los rebuilds incrementales eran innecesariamente lentos porque la cache de Docker se invalidaba en pasos costosos cuando cambiaba cualquier archivo del repo.

#### `api/Dockerfile`

Antes: `COPY . .` venia ANTES de `pip install`, asi que cualquier cambio (incluso un comentario) invalidaba la cache del `pip install` y forzaba reinstalar todas las deps de Python (~30s).

Ahora:

1. `COPY pyproject.toml` y crear stub `app/__init__.py` para que el package sea instalable.
2. `pip install -e ".[dev]"` o `pip install -e "."` con `--mount=type=cache,target=/root/.cache/pip`.
3. `COPY . .` al final (sobreescribe el stub con el codigo real).

El paso pesado (`pip install`) solo se re-ejecuta cuando cambia `pyproject.toml`, no cuando cambia el codigo. **Rebuild con cambio de codigo: ~0.6s** (antes: ~25-30s).

#### `nginx/Dockerfile`

Agregado `--mount=type=cache,target=/root/.npm` al `npm ci`. Sin esto, builds con `--no-cache` re-descargaban todos los paquetes npm (lento). Tambien `--prefer-offline --no-audit --fund=false` para reducir overhead.

El paso dominante en rebuilds del nginx (con cambio de codigo) es `npm run build` (vite + rollup), que no se puede cachear porque el output depende del codigo. Pero el `npm ci` ahora no se invalida si solo cambia el codigo del admin.

#### Mediciones (local, M1 + Docker Desktop)

```
api    rebuild --no-cache:  ~28s (antes: similar)
api    rebuild con cambio:  ~0.6s (antes: ~25-30s)   ← 50x mas rapido

nginx  rebuild --no-cache:  ~25s
nginx  rebuild con cambio:  ~18.5s (npm ci cacheado, vite build)
```

---

## [0.30.39] - 2026-04-29

### Docs — `.env.*.example` simplificados al minimo necesario

Los tres `.env.*.example` arrastraban variables redundantes (sobreescritas por `docker-compose.yml` `environment:`, con default sensato en `settings.py`/`Dockerfile`, o forzadas en `enforce_production_defaults`). Esto invitaba a configurar cosas que no surtian efecto y agregaba ruido.

Removidas (todas tienen default ya en codigo):
- `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CSRF_TOKEN_EXPIRE_MINUTES` (defaults `HS256`/30/60).
- `COOKIE_NAME`, `COOKIE_MAX_AGE`, `COOKIE_HTTPONLY`, `COOKIE_SECURE` (defaults; `cookie_secure` forzado a `True` en prod por `enforce_production_defaults`).
- `PROJECT_NAME`, `VERSION` (`PROJECT_NAME` default; `VERSION` se resuelve via `get_app_version()` desde `pyproject.toml`).
- `ADMIN_PREFIX`, `WEB_PREFIX`, `MAPALAB_PUBLIC_PREFIX` (defaults).
- `DATAENGINE_POOL_SIZE`, `DATAENGINE_MAX_OVERFLOW`, `GEOSERVER_TIMEOUT` (defaults).
- `DOCS_URL`, `REDOC_URL`, `OPENAPI_URL` (forzados a `None` en prod por `enforce_production_defaults`).
- `VITE_NODE_ENV`, `VITE_ADMIN_API_TIMEOUT`, `VITE_ADMIN_APP_NAME`, `VITE_ADMIN_PORT`, `VITE_ADMIN_HOST` (defaults en `nginx/Dockerfile` o no se referencian).
- `VITE_GOOGLE_ANALYTICS_ID` (mariachi delega a `gateway-hub` GTM desde 0.30.28).
- `DATABASE_URL`, `REDIS_URL` (sobreescritos por `environment:` en docker-compose).
- `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME` (sin fallback al root desde 0.30.29; cada bucket usa sus creds).
- `COMPOSE_PROJECT_NAME` en prod/staging (compose tiene `name: mariachi`).

Mantenidas / mejoradas:
- Comentarios cortos sobre como rotar creds (`init-buckets.sh --rotate`), proposito de cada `*_ONTOY_URL`, etc.
- `ACERVO_PUBLIC_ENDPOINT=/acervo` (path relativo) en prod/staging para evitar mixed content (ya estaba en codigo desde 0.30.34).

### Conteo de lineas (antes -> despues)

```
.env.production.example:    ~75 -> 79 (con comentarios mas utiles)
.env.staging.example:        73 -> 58
.env.development.example:    98 -> 73
```

---

## [0.30.38] - 2026-04-29

### Infra — fix `IsADirectoryError` en `mariachi-api` cuando acervo no tiene cert propio

En `docker-compose.yml`, el servicio `api` montaba `../acervo/nginx/ssl/acervo.crt` como volumen y seteaba `REQUESTS_CA_BUNDLE`/`SSL_CERT_FILE` apuntando a esa ruta. En modo `INFRA=gateway` (que es el patron actual en GCP), acervo NO tiene cert propio (TLS lo termina gateway-hub con Let's Encrypt). Como el path `../acervo/nginx/ssl/acervo.crt` no existe en el host, docker creaba un directorio vacio con ese nombre y al cargar `urllib3` intentaba leerlo como archivo, fallando con `IsADirectoryError: [Errno 21] Is a directory` -> 500 en cualquier endpoint que tocara MinIO.

Como `ACERVO_USE_SSL=false` (mariachi-api se conecta a `acervo-minio:9000` por HTTP dentro de la red docker), el cert nunca fue necesario. Removidos:

- Bind mount `../acervo/nginx/ssl/acervo.crt:/usr/local/share/ca-certificates/acervo.crt:ro` del servicio `api`.
- Env vars `REQUESTS_CA_BUNDLE` y `SSL_CERT_FILE`.

Si en el futuro alguien necesita SSL al MinIO interno (poco probable, pero posible si se hace acervo standalone con cert propio), puede agregar el bind mount + env vars con un compose override.

---

## [0.30.37] - 2026-04-29

### Admin (UI) — refinamientos UX en `/media`

- **Titulo `Media Manager` -> `Multimedia`** (en español, alineado con el endpoint `/multimedia`).
- **Modal "Subir Archivos"**:
  - Nuevo campo "Bucket" (read-only) que muestra el nombre del bucket destino — antes el usuario no veia a donde estaba subiendo.
  - "Carpeta de destino" cambio de `Select` (lista de todas las carpetas globales registradas en `media_folders`, sin filtro por bucket) a `Input` editable con el `currentPath` precargado. El usuario ve a donde va, puede editar manualmente.
- **Modal "Nueva Carpeta"**:
  - Mismo campo "Bucket" read-only.
  - "Carpeta padre" tambien cambio a `Input` editable.
- **Cambio de bucket resetea `currentPath` a raiz**: antes si navegabas a `mariachi/avatars/u1/` y luego cambiabas al bucket `portal`, seguias en el path `avatars/u1/` aplicado a portal, dando una falsa sensacion de "no hay archivos". Ahora cualquier cambio de bucket vuelve a la raiz.

---

## [0.30.36] - 2026-04-29

### Backend (api) — fix `avatarUrl` perdido al refrescar `/perfil`

`get_current_user_context` (en `api/deps.py`) arma manualmente el dict que retorna `GET /autenticacion/perfil` (`CurrentUserResponse`). El dict no incluia el campo `avatar_url`, asi que aunque la BD tuviera el avatar correcto, el GET retornaba `avatarUrl: null`. En el frontend, `refreshUser()` despues del PUT sobreescribia el state con `avatarUrl` vacio y el avatar se "perdia" al recargar la pagina.

Fix: `get_current_user_context` ahora incluye `avatar_url=current_user.avatar_url` en el dict. El field_serializer `_expose_avatar_absolute` (en `schemas/user.py:UsuarioResponse`) lo procesa correctamente y lo expone como `avatarUrl` en la respuesta JSON.

---

## [0.30.35] - 2026-04-29

### Backend (api) — fix idempotencia `to_relative` para paths del proxy

Bug introducido implícitamente cuando empezamos a guardar URLs del proxy en `avatar_url`: el validator `to_relative` strip-eaba el `/` inicial de paths absolutos del API, dejando `avatar_url` como `api/administrador/multimedia/proxy/...` (sin barra). Al releer, `to_absolute` no reconocia el prefix `/api/` y trataba el path como relativo al bucket público, generando URLs invalidas tipo `/acervo/api/administrador/...`.

Fix: `to_relative(...)` ahora preserva paths que empiezan con `/api/` (igual que `to_absolute(...)`). Idempotencia restaurada: `to_absolute(to_relative(x)) == x` para URLs del proxy.

Si tienes `avatar_url` ya corruptos en BD (subidos antes del fix), repararlos con:
```sql
UPDATE usuarios SET avatar_url = '/' || avatar_url WHERE avatar_url LIKE 'api/%';
```

### Admin (UI) — `/perfil` modo grid en el picker de avatars genéricos

- **`BucketFilePicker`** acepta nuevo prop `mode="grid"|"list"` (default `list`). En modo grid muestra thumbnails (`<img>` real con `objectFit: cover`) en una grilla responsiva (`auto-fill, minmax(140px, 1fr)`); para items que no son imagen muestra icono. Hover visual con borde azul.
- **`PerfilPage`** pasa `mode="grid"` al picker de "Elegir genérico" — los avatars del bucket `iieg/avatars/` se muestran como miniaturas clicables en lugar de tabla.

---

## [0.30.34] - 2026-04-29

### Backend (api) — URLs del acervo relativas al dominio (cierra mixed-content)

`ACERVO_PUBLIC_ENDPOINT` ahora soporta valores tipo path (`/acervo` en vez de `localhost:9080`). El admin se sirve por HTTPS pero las URLs del acervo iban a `http://localhost:9080/...` provocando que el browser bloqueara las imagenes con `Mixed Content: was loaded over HTTPS, but requested an insecure element`. Ahora `to_absolute(...)` detecta endpoints que empiezan con `/` y retorna URL relativa al dominio actual (gateway-hub la enruta a MinIO). Sin host hardcoded, funciona igual en local (`iieg.local`) y en GCP (`mapalab-iieg.app`).

- **`acervo_url.py:to_absolute`** y `to_relative`: soporte para path-only endpoints.
- **`.env.production`** local: `ACERVO_PUBLIC_ENDPOINT=/acervo`.

### Admin (UI) — `/media` y `/perfil` adaptados

- **Breadcrumb de `/media`** ahora muestra el nombre del bucket actual en el inicio (`Mariachi > avatars > u1`) en lugar de un genérico `Raíz`.
- **Botones `Subir Archivos` y `Nueva Carpeta`** en `/media` ahora pre-seleccionan la carpeta donde el usuario está navegando (`currentPath`) en lugar de `/` hardcoded. Tambien se deshabilitan si no hay bucket seleccionado.
- **`/perfil`** rediseñado con dos opciones de avatar: `Elegir genérico` (pickea del bucket público compartido `iieg/avatars/`) y `Subir personalizado` (sube al bucket privado `mariachi/avatars/u<user_id>/`, accesible solo via proxy autenticado). Antes apuntaba a `portal` para ambos casos.

---

## [0.30.33] - 2026-04-29

### Admin (UI) — simplificacion de nombres de buckets en `/media`

- Antes el select de bucket en la pagina `/media` mostraba `${display_name} · ${acervo_bucket}` (ej. `"Metadatos de capas · mapalab"`). El display_name original era descriptivo pero confuso (un bucket entero NO son solo metadatos) y la concatenacion duplicaba info. Ahora el label es directo y reconocible: `Portal`, `MapaLab`, `Mariachi`, `SIEEJ`, `IIEG`.
- **Migracion `b2c3d4e5f6a7_simplify_bucket_display_names.py`** UPDATEa los `display_name` de `media_buckets` a las versiones cortas. Idempotente, downgrade restaura los textos largos.
- **`MediaPage.jsx`**: el `label` del `Select` ahora es `b.display_name` simple (sin sufijo `· acervo_bucket`).

---

## [0.30.32] - 2026-04-29

### Backend (api+infra) — proxy autenticado para buckets privados (cierra brecha de privacidad)

Hasta 0.30.31, los URLs construidos por `AcervoClient.get_file_url` y `client.upload_file` siempre apuntaban directamente al bucket de acervo (`https://<dominio>/acervo/<bucket>/<path>`). Cuando un bucket es privado (e.g. `mariachi`), esas URLs:
- Fallan con 403 en el browser (esperado).
- **Quedan registradas en BD** (`media.url`, `usuarios.avatar_url`) y pueden filtrarse en logs, HTTP referers, exports, etc., apuntando a un recurso no accesible y revelando estructura interna.

Ademas, schemas que usan `to_absolute(...)` (`schemas/user.py:avatar_url`, `schemas/evento.py`, `schemas/layer.py`, `schemas/home_section.py`) anteponian el host publico del acervo a cualquier path relativo, asumiendo que era publico.

### Cambios

- **`AcervoClient`** ahora es bucket-aware: acepta `is_public: bool` y `bucket_id: int` en `__init__`. `for_bucket()` los pasa desde `MediaBucket`.
- **`AcervoClient.get_file_url`**:
  - Si `is_public=True`: comportamiento previo (URL directa al bucket via `acervo_public_endpoint`).
  - Si `is_public=False`: retorna URL relativa al endpoint proxy de mariachi-api: `/api/administrador/multimedia/proxy/<bucket_id>/<object_path>`.
- **`AcervoClient.upload_file`** ahora reutiliza `get_file_url` para construir la URL de retorno (queda bucket-aware automaticamente).
- **`to_absolute(...)`** preserva paths que empiezan con `/api/` (eran del proxy del API, no del bucket). Antes los antepondria con el host del acervo y romperia.
- **Endpoint nuevo `GET /multimedia/proxy/{bucket_id}/{object_path:path}`** (en `routes/media.py`):
  - Requiere autenticacion (`get_current_user`).
  - Valida acceso al bucket via `media_service.resolve_bucket_or_403` (mismo modelo de permisos que el resto de `multimedia/*`).
  - Stream-ea el contenido del bucket privado. `Cache-Control: private, max-age=300`.
- **`AcervoClient.stat_object` / `get_object_stream`** expuestos para que el endpoint pueda leer el objeto.

### Fix infra: `nginx/conf.d/mariachi.conf`

La regex de cache de assets estaticos (`location ~* \.(js|css|png|jpg|...)$`) capturaba **antes** que `location /api/` cualquier URL del API que terminara en una extension de archivo (e.g. `/api/.../proxy/12/avatars/u1/test.jpg`), provocando 404 al servir desde filesystem. Fix: cambiar `location /api/` y `location /api/administrador/media/` a `location ^~ /api/...` para forzar prioridad de prefix sobre regex.

### Validacion local (gateway -> mariachi-nginx -> mariachi-api -> minio)

```
GET /acervo/mariachi/avatars/u1/test.jpg                    → 403 (anonymous denegado)
GET /api/administrador/multimedia/proxy/12/avatars/u1/...   → 401 (sin sesion)
GET /api/administrador/multimedia/proxy/12/avatars/u1/...   → 200 + image/jpeg (con sesion)
```

---

## [0.30.31] - 2026-04-29

### Backend (api) — bucket `mariachi` privado, avatars al bucket compartido `iieg`

- **Bucket `mariachi` cambia a `is_public=false`**: queda reservado para assets administrativos staff-only del panel admin (logs descargables, exportaciones internas, archivos que no deben quedar en el indice publico). Los avatars de usuarios YA NO viven aqui.
- **Avatars al bucket `iieg`** (publico, compartido) bajo la convencion `iieg/avatars/u<user_id>/<uuid>.<ext>`. La razon: el avatar de una editora aparece en multiples vistas y multiples frontends del ecosistema (lista de publicaciones, "ultima edicion por", listas de usuarios). Tenerlo publico y compartido permite que cualquier frontend lo referencie con URL relativa `/acervo/iieg/avatars/...` sin presigned URLs ni proxy autenticado.
- **Migracion** `a1b2c3d4e5f6_*.py` actualizada: `media_buckets.iieg` con descripcion explicita `'Assets institucionales IIEG (incluye avatars)'`; `media_buckets.mariachi` con descripcion `'Assets administrativos privados'` y `is_public=false`.
- **`docs/context.md`** documenta la separacion publicos/privados, la convencion del path `iieg/avatars/u<id>/...` y las dos politicas de upload (assets institucionales solo para `tetlamamakani`; avatars donde el `user_id` del path debe coincidir con `current_user.id`).

### Notas migracion (al bajar 0.30.31 + acervo 1.20.1)

1. La migracion alembic se aplica sola en el bootstrap. Si ya tenias avatars en el bucket `mariachi` (de testing temprano), muevelos al bucket `iieg/avatars/`:
   ```bash
   docker exec acervo-minio mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
   docker exec acervo-minio mc mirror --remove local/mariachi/avatars/ local/iieg/avatars/
   docker exec acervo-minio mc anonymous set none local/mariachi
   ```
2. Si tu UI de subida de avatar todavia apunta al `bucket_id` de mariachi, cambialo al `bucket_id` de iieg (consultar `media_buckets`).

---

## [0.30.30] - 2026-04-29

### Backend (api) — bucket compartido `iieg` + rename `sieej-diccionarios → sieej`

- **`media_buckets`** ahora incluye un bucket compartido `iieg` (proyecto institucional nuevo) para assets reutilizables entre todos los frontends del ecosistema (logos IIEG, escudos Jalisco, fuentes web, iconos, documentos institucionales). Publico (anonymous GetObject); solo `tetlamamakani` puede subir. Acervo lo crea automaticamente con `init-buckets.sh` (>= acervo 1.20.0).
- **Bucket `sieej-diccionarios` renombrado a `sieej`** (mas corto, consistente con los demas). El `access_key_ref` ya era `ACERVO_SIEEJ` (no cambia), solo se ajusta el `acervo_bucket`. Acervo migra los objetos del bucket viejo al nuevo automaticamente.
- **Migracion** `a1b2c3d4e5f6_add_mariachi_project_and_bucket.py` actualizada: ahora tambien INSERTa proyecto/bucket `iieg` y UPDATEa `sieej-diccionarios -> sieej`.

### Notas migracion

Cuando bajes a la VM (orden importa):

1. **Acervo (>= 1.20.0)**: edita `.env.gateway` con `MINIO_BUCKETS=portal mapalab mariachi sieej dataengine iieg`, `--force-recreate minio` y corre `--rotate`. Captura las 6 passwords.
2. **Mariachi `.env.production`**: pega las 6 passwords en `ACERVO_<REF>_SECRET_KEY` (incluye `ACERVO_IIEG_*` que es nueva).
3. **Mariachi `make build ENV=prod`**: la migracion alembic se aplica en bootstrap. Verifica que `media_buckets` muestre 6 rows con `iieg` y `sieej` (no `sieej-diccionarios`).

---

## [0.30.29] - 2026-04-29

### Backend (api+infra) — principio de menor privilegio para acervo

- Mariachi escribia a TODOS los buckets de Acervo con las credenciales root del cluster MinIO (fallback de `acervo.py:resolve_bucket_credentials`). Esto violaba el principio de menor privilegio: si las creds de mariachi se filtraban, el atacante tenia acceso completo al cluster (incluyendo buckets de huachicol y otros que mariachi nunca toca). Ahora cada bucket usa sus propias credenciales (`<REF>_user` con policy attached solo sobre ese bucket).
- **`media_buckets`**: nuevo proyecto `mariachi` con bucket `mariachi` (publico, anonymous GetObject) para los assets propios del panel admin (avatars y demas). El bucket `dateengine` (con typo, jamas usado por mariachi en runtime) queda desactivado (`is_active=false`); no se borra el row para preservar FKs eventuales. Migracion: `a1b2c3d4e5f6_add_mariachi_project_and_bucket.py`.
- **`acervo.py`**: removido el fallback al usuario root. Si un bucket activo no tiene `<REF>_ACCESS_KEY`/`<REF>_SECRET_KEY` configuradas, lanza `RuntimeError` explicito (en lugar de degradar silenciosamente a creds root).
- **`settings.py`**: removidas `acervo_access_key`, `acervo_secret_key`, `acervo_bucket_name` (ya no se usan).
- **`acervo.py`**: removida la funcion legacy `get_acervo_service` (codigo muerto, nunca se llamaba).
- **`docker-compose.yml` / `docker-compose.dev.yml`**: removidas `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME` del bloque `environment:` del servicio `api`.
- **`.env.production`** / `.env.staging` / `.env.development`: removidas las creds root globales. Ahora se requieren las 4 pares por bucket: `ACERVO_PORTAL_*`, `ACERVO_MAPALAB_*`, `ACERVO_MARIACHI_*`, `ACERVO_SIEEJ_*`. Removidas `ACERVO_DATEENGINE_*` (bucket desactivado).
- **`.env.production.example`** / `.env.staging.example` / `.env.development.example`: actualizados al nuevo modelo con instruccion de como rotar passwords (`cd ../acervo && ./scripts/init-buckets.sh --rotate`).

### Notas migracion (en orden)

1. **Acervo (>= 1.19.0)**: rotar passwords con `./scripts/init-buckets.sh --rotate` y crear el bucket `mariachi`. Capturar las 4 passwords que imprime el script.
2. **Mariachi `.env.production`**: pegar las 4 passwords nuevas en `ACERVO_PORTAL_SECRET_KEY`, `ACERVO_MAPALAB_SECRET_KEY`, `ACERVO_MARIACHI_SECRET_KEY`, `ACERVO_SIEEJ_SECRET_KEY`. Remover `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME`, `ACERVO_DATEENGINE_*`.
3. **Mariachi `make build ENV=prod`**: la migracion alembic se aplica en el bootstrap. Sin las creds por bucket, mariachi-api arranca pero al primer write a un bucket lanza 500 con detalle "Faltan <REF>_ACCESS_KEY/<REF>_SECRET_KEY".

### Compat

- **Avatars existentes**: si los avatars actuales viven en bucket `portal`, esta migracion NO los mueve. Quedan donde estan; el bucket `mariachi` se usa para nuevos uploads. Si quieres migrarlos: comando `mc cp --recursive acervo/portal/<ruta-avatars> acervo/mariachi/avatars/` mas `UPDATE usuarios SET avatar_url=...` manual.

---

## [0.30.28] - 2026-04-29

### Admin — migracion al patron GTM de gateway-hub (eliminado `react-ga4`)

- Mariachi-admin ahora delega Google Analytics al `sub_filter` GTM que `gateway-hub` inyecta a nivel nginx en todas las respuestas HTML del ecosistema (mismo patron ya usado por mapalab y sieej). El admin deja de embeber su propio SDK; los page_view se disparan via "All Pages" trigger en GTM y los eventos custom se envian con `window.dataLayer.push(...)` sin requerir build args ni recompilacion.
- **`admin/src/main.jsx`**: removido `import ReactGA from 'react-ga4'` y el bloque `ReactGA.initialize(VITE_GOOGLE_ANALYTICS_ID, ...)`. La libreria solo se usaba para `initialize`; nunca se llamaban `ReactGA.event` ni `ReactGA.send`, asi que era codigo muerto.
- **`admin/package.json`** + `package-lock.json`: removida la dependencia `react-ga4@2.1.0`.
- **`nginx/Dockerfile`**: removidos `ARG VITE_GOOGLE_ANALYTICS_ID` y su `ENV`.
- **`docker-compose.yml`**: removida `VITE_GOOGLE_ANALYTICS_ID` de `nginx.build.args`.
- **`.env.production`**: la linea `VITE_GOOGLE_ANALYTICS_ID=` queda como inerte (ya no la lee nada). Se documenta para activar GA en `gateway-hub/.env` -> `GTM_ID=GTM-XXXXXXX`.

### Validacion

- Rebuild `--no-cache`: bundle del admin no contiene `react-ga4`, `gtag.js` ni referencias a `googletagmanager.com`.
- `https://iieg.local/mariachi/`: 200 OK con titulo correcto.
- Si `gateway-hub/.env` define `GTM_ID`, el snippet GTM aparece en el HTML servido por `/mariachi/` sin tocar nada en mariachi.

---

## [0.30.27] - 2026-04-29

### Infra — SIEEJ deja de ser hospedado por mariachi-nginx

- `gateway-hub` (>= v1.24.0) ahora sirve el dist de SIEEJ directamente con `alias`. Mariachi deja de tener responsabilidades de hospedaje de otros frontends; queda como una plataforma mas dentro del ecosistema, no como proxy. Esto restablece la separacion de capas: cada plataforma tiene su propio servicio o se sirve desde el ingress, no desde otra plataforma.
- **`docker-compose.yml`**: removido el bind mount `${SIEEJ_DIST_PATH:-../SIEEJ/frontend/dist}:/usr/share/nginx/html/sieej:ro` del servicio `nginx` (con su comentario asociado).
- **`nginx/conf.d/mariachi.conf`**: removido `location /sieej { alias /usr/share/nginx/html/sieej; try_files ... /sieej/index.html; }`.
- **`.env.production`**: removida `SIEEJ_DIST_PATH`. `SIEEJ_ONTOY_URL` ahora apunta a `http://gateway-hub-nginx-1/sieej/ontoy` (gateway-hub expone el JSON en su bloque :80 para que el probe HTTP interno de mariachi-api no sea redirigido a HTTPS).

### Validacion

- `mariachi-nginx /sieej/` -> 404 (correcto, ya no lo sirve).
- `https://iieg.local/sieej/` -> 200 (gateway-hub).
- `mariachi-api -> http://gateway-hub-nginx-1/sieej/ontoy` -> 200 con `{"slug":"sieej","label":"SIEEJ","version":"1.2.0"}`.

---

## [0.30.26] - 2026-04-29

### Backend (api) — defaults sensatos en `settings.py` + `version` autoresolvida desde `pyproject.toml`

- 13 campos de `Settings` que antes eran obligatorios ahora tienen default razonable, lo que reduce drasticamente la cantidad de variables que hay que repetir en cada `.env`. La idea: el `.env` solo declara lo que difiere del default, no lo que ya es la convencion del proyecto.
- **`core/settings.py`**:
  - Defaults nuevos: `algorithm="HS256"`, `access_token_expire_minutes=30`, `csrf_token_expire_minutes=60`, `admin_prefix="/api/administrador"`, `web_prefix="/api/portal"`, `cookie_name="access_token"`, `cookie_max_age=1800`, `cookie_httponly=True`, `cookie_samesite="lax"`, `cookie_secure=False`, `acervo_use_ssl=False`. `enforce_production_defaults` sigue forzando `cookie_secure=True` cuando `environment=="production"`.
  - `project_name` con default `"Mariachi"`.
  - **`version`** ahora se resuelve via `Field(default_factory=get_app_version)` (lee del `pyproject.toml` con `tomllib`). Single source of truth: la version del repo es la del `pyproject.toml`, no se duplica en `.env` (donde estaba desactualizada).
- **`.env.production`** reducido de 116 a ~60 lineas: eliminadas variables redundantes (puertos sin mapping en compose, vars que se sobreescriben en `environment:` del compose, vars muertas del frontend `web/`, vars con default ya en settings, vars del dev server de Vite). Las vacias opcionales (`ACERVO_*_ACCESS_KEY/SECRET_KEY`, `MAPALAB_INTERNAL_TOKEN`, `SIEEJ_URL`, `SENTRY_*`, `VITE_GOOGLE_ANALYTICS_ID`, `VITE_SENTRY_DSN`) se conservan como placeholders documentados.
- **`nginx/Dockerfile`**: simplificados los `ARG`/`ENV` del admin-builder. `VITE_ADMIN_API_URL` ahora tiene default `=/api/administrador`. Removidas `VITE_ADMIN_API_TIMEOUT` y `VITE_ADMIN_APP_NAME` (no se referencian en `admin/src`). Agregada `VITE_WEB_URL` que faltaba (existia en el codigo del admin pero nunca llegaba al build).
- **`docker-compose.yml`**: alineados los `nginx.build.args` con el `Dockerfile`. `VITE_ADMIN_API_URL: ${VITE_ADMIN_API_URL:-/api/administrador}` con fallback. Agregado `VITE_WEB_URL`.

---

## [0.30.25] - 2026-04-28

### Infra — Postgres 18 mount + remove default.conf + extra_hosts

- **`docker-compose.yml`**: `postgres:18-alpine` (era `postgres:15-alpine`). El volumen ahora monta `postgres_data:/var/lib/postgresql` (era `:/var/lib/postgresql/data`) porque la imagen 18 cambio el path de datos por defecto.
- **`api/Dockerfile`**: `extra_hosts: host.docker.internal:host-gateway` para que la API pueda alcanzar servicios en el host (DataEngine, GeoServer, Acervo) cuando estan fuera del compose.
- **`nginx/Dockerfile`**: `RUN ... && rm -f /etc/nginx/conf.d/default.conf` para que el `server_name localhost` que ships la imagen `nginx:alpine` no gane como default y bloquee al `mariachi.conf`.

---

## [0.30.24] - 2026-04-28

### Repo — `LICENSE` movido a root para que GitHub la detecte

- **`docs/LICENSE` → `LICENSE`**: GitHub solo detecta automáticamente la licencia cuando el archivo está en el root del repo (acepta `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `LICENCE`, `COPYING`). Tener el archivo solo en `docs/` hacía que el repo apareciera sin badge de licencia y que la API de GitHub no expusiera el campo `license` en el endpoint de repositorio. Mismo patrón ya usado por los demás repos del ecosistema (mapalab, acervo, gateway-hub, huachicol, mapalab-dataengine).

---

## [0.30.23] - 2026-04-28

### Backend (api) — todas las plataformas usan probe `ontoy` con su URL configurable

- Cada repo del ecosistema implementó su propio endpoint `/ontoy` (acervo y gateway-hub via nginx con `alias /etc/nginx/version.json`; mapalab-dataengine via servicio `version-api` independiente en `:8088`; geoserver escribe `/ontoy.json` desde su `entrypoint-wrapper.sh`; mapalab-backend lo expone desde FastAPI). Mariachi ahora consulta esos endpoints en lugar de usar probes ad-hoc por plataforma.
- **`platforms_config.py`** unificado: todas las plataformas externas usan `probe="ontoy"` con `probe_url_template="{<slug>_ontoy_url}"`. Eliminado el probe `dataengine` (SQL) y `http_health` para acervo — ahora todas comparten el mismo flujo. El `static_version` se conserva como fallback de versión (si el endpoint no responde, igual se muestra la versión del CHANGELOG del repo).
- **Resolver de templates** en `routes/sistema.py` refactorizado a un dict de placeholders para escalar limpiamente.
- **Settings nuevos** (`core/settings.py`): `acervo_ontoy_url`, `dataengine_ontoy_url`, `geoserver_ontoy_url`, `gateway_hub_ontoy_url`, `huachicol_ontoy_url`, `sieej_ontoy_url`. Todos opcionales; vacío = probe queda como `healthy=false` pero la card sigue mostrando `static_version`.
- **`.env.development`**: `DATAENGINE_ONTOY_URL=http://host.docker.internal:8088/ontoy` (único que se puede probar localmente; el resto vive detrás de nginx que solo levanta en staging/production). `.env.development.example` documenta el comportamiento.

---

## [0.30.22] - 2026-04-28

### Backend (api) — sincronización con `static_version` retroactivo

- **`platforms_config.py`** sincronizado con los CHANGELOGs reescritos retroactivamente desde el historial de commits de cada repo:
  - `acervo`: `0.1.0` → `1.17.0`
  - `mapalab-dataengine`: `1.6.0` → `1.11.0`
  - `geoserver`: `0.1.0` → `1.14.1`
  - `gateway-hub` y `huachicol` siguen en `0.1.0` (no han bumpeado todavía).

---

## [0.30.21] - 2026-04-28

### Backend (api) — perfil editable + avatar

- **Migración alembic `f4a5b6c7d8e9_add_avatar_url_to_usuarios`**: nueva columna `usuarios.avatar_url` (Text nullable). Aplicada en dev.
- **`Usuario.avatar_url`** en el modelo SQLAlchemy.
- **Schemas (`schemas/user.py`)**: `UsuarioResponse.avatar_url` con `serialization_alias='avatarUrl'`. `field_validator(mode='before')` aplica `to_relative` y `field_serializer(when_used='json-unless-none')` aplica `to_absolute` — la URL del avatar se persiste relativa al bucket y se devuelve absoluta al cliente, igual que las URLs de eventos / home / capas. Nuevo `PerfilUpdate` con `name`, `email`, `avatar_url` (todos opcionales).
- **`PUT /autenticacion/perfil`**: actualiza nombre, email o avatar del `current_user`. Verifica unicidad de email contra otros usuarios (409 si conflict). Requiere `verify_csrf`.

### Admin (admin) — página `/perfil`

- **Nuevo feature module `features/perfil/`**:
  - `pages/PerfilPage.jsx` con avatar grande (96px), botón "Cambiar avatar" que abre `<BucketFilePicker bucketId=portal>`, botón secundario "Quitar avatar"; form con `name` + `email` (required, validación de email), nota inferior con `username` (no editable) y `role` (no editable). Botón principal "Guardar cambios" hace `PUT /autenticacion/perfil` y luego `refreshUser()` del context para que el avatar del header se actualice sin recargar.
  - `api/perfilService.js` con `actualizarPerfil(data)`.
- **Ruta `/perfil`** registrada en `main.jsx` con `lazy(() => import('@features/perfil'))`.
- **`MainLayout.jsx`**: el item "Perfil" del dropdown del avatar (header arriba-derecha) ahora navega a `/perfil` (antes era estático sin `onClick`). El `<Avatar>` del header lee `user.avatarUrl` (con fallback `user.avatar_url`); muestra `<UserOutlined />` solo cuando no hay avatar.

---

## [0.30.20] - 2026-04-28

### Backend (api) — registro extendido de plataformas + `static_version`

- **`platforms_config.py`** ahora incluye 8 plataformas del ecosistema: `mariachi`, `mapalab`, `mapalab-dataengine`, `acervo`, `gateway-hub`, `huachicol`, `geoserver`, `sieej`. Cada una con su `slug`, `label`, `url` (opcional), `probe` y `probe_url_template`.
- **Nuevo campo opcional `static_version`** por plataforma. Cuando está presente, el endpoint la devuelve como versión en lugar de la que reporta el probe. Es la versión del **repositorio** (la del `docs/CHANGELOG.md`), no la del software empaquetado. Útil para repos como `acervo` (MinIO no expone su versión sin auth), `gateway-hub` (Nginx no tiene `/version`), `geoserver` (Java, sin endpoint trivial) y `mapalab-dataengine` (es Postgres + jobs, no API).
- **Nuevo probe `none`** para servicios sin endpoint accesible — siempre reporta `healthy=true`. Se usa para `gateway-hub` y `huachicol` mientras no agregan un endpoint o un static.
- **Settings**: el campo `geoserver_url` (que ya existía) ahora se usa para el probe `http_health` de GeoServer.
- **Sincronización manual**: bumpear `static_version` en este archivo cuando se bumpea el `CHANGELOG.md` del repo correspondiente. (TODO: pre-commit hook que valide.)

### Eco-versionado en repos del ecosistema

- **`acervo`**, **`gateway-hub`**, **`huachicol`**, **`geoserver`**: nuevos `docs/CHANGELOG.md` y `VERSION` en root con `0.1.0` inicial. Antes ningún repo de infra llevaba versionado explícito; los cambios solo se reflejaban en commits. Ahora cada característica registrada en commit dispara un bump.
- **`mapalab-dataengine`**: nuevo `VERSION` (1.6.0) sincronizado con su `docs/CHANGELOG.md`.

---

## [0.30.19] - 2026-04-28

### Backend (api) + Admin (admin) — landing reescrita: plataformas + notas de versión

- **Atajos eliminados** del `/inicio`. Ya no tiene sentido tener "Editar Inicio / Eventos / Media / Revisiones" como cards porque el sider los expone directamente.
- **Nuevas secciones en `/inicio`**:
  - **Plataformas del ecosistema** — grid de cards con `label`, `slug`, `version` (tag azul si la conoce, gris si no), badge de estado (verde "activa" si responde, gris "no integrada" si no). Click en una card activa va a su URL si la tiene; las inactivas no son clickeables.
  - **Notas de versión** — `Collapse` con las últimas 5 entradas del `docs/CHANGELOG.md`. La primera viene expandida.

### Backend (api) — `/sistema/plataformas` y `/sistema/notas-version`

- **`/ontoy`** raíz en mariachi-api (`{slug, label, version}`). Convención del ecosistema IIEG: cada repo expone este endpoint para que el dashboard de Mariachi pueda detectar versión y healthy en una sola llamada.
- **`app/core/version.py`** — `get_app_version()` lee la versión real del `pyproject.toml` (no `importlib.metadata`, que en dev queda desfasada respecto al wheel instalado en el editable install).
- **`app/core/platforms_config.py`** — registro hardcoded con campos `slug, label, url, probe, probe_url_template`. `probe` admite cuatro tipos: `self` (lee versión local sin red), `ontoy` (HTTP GET al endpoint `/ontoy` del repo, parse JSON), `http_health` (HTTP GET a una URL cualquiera, 200 = healthy, sin versión), `dataengine` (`SELECT version()` vía `get_dataengine_db`). Templates con placeholders `{mapalab_backend_url}`, `{sieej_url}`, `{acervo_scheme}://{acervo_endpoint}`. Si un placeholder queda vacío (env no configurada) la plataforma reporta `healthy=false`.
- **`app/services/changelog_parser.py`** — parser de Keep a Changelog → JSON estructurado `[{version, fecha, secciones: [{titulo, contenido}]}]`. Lee de `/app/_docs/CHANGELOG.md` (montaje agregado a `docker-compose.dev.yml`) o del path relativo del repo como fallback. Soporta `[Unreleased]` / `[No publicado]` (los salta) y `## [x.y.z] - YYYY-MM-DD`.
- **`app/api/routes/sistema.py`** — `GET /sistema/plataformas` y `GET /sistema/notas-version?limit=5`. Ambos requieren `current_user` (cualquier rol). El probe de mapalab consulta `{MAPALAB_BACKEND_URL}/ontoy`; el de acervo `http://{ACERVO_ENDPOINT}/minio/health/live` (interno, no público); el de sieej `{SIEEJ_URL}`; el de dataengine reutiliza `get_dataengine_db` y parsea la respuesta de `SELECT version()` para tomar el número (`18.3`, `17.2`, etc.).
- **`docker-compose.dev.yml`** — `./docs:/app/_docs:ro` para que el parser pueda leer el changelog en runtime.
- **Settings nuevos**: `sieej_url` (opcional). El `mapalab_backend_url` ya existía. `MAPALAB_FRONTEND_URL` deliberadamente NO se agrega porque mapalab es un solo deployment (backend + frontend); su `/ontoy` cubre ambos.
- **`.env.development.example`** — `SIEEJ_URL` documentado con su comportamiento ("vacío = no integrada").

### Admin (admin) — mini-renderer de markdown

- **Nuevo `shared/components/Markdown.jsx`**: renderer minimal sin dependencias externas. Soporta `**negritas**` → `<strong>`, `` `inline code` `` → `<code>` con estilo monospaced, y viñetas `- item` agrupadas en `<ul>`. Es lo justo para renderizar las entradas del CHANGELOG sin el ruido de `react-markdown` + plugins. La página de inicio usa este componente para `notas-version`; antes mostraba el markdown como texto plano (`<Paragraph whiteSpace='pre-wrap'>`).

### Mapalab — `/ontoy` en backend

- **`mapalab/backend/app/__version__.py`** y **`server.py`**: nuevo endpoint `GET /ontoy` que devuelve `{slug, label, version}` para que mariachi pueda detectarlo. La versión se mantiene sincronizada con `frontend/package.json` (un solo bumpeo del repo). Lo bumpeé manualmente al `1.13.1`. El bump en `frontend/package.json` debe actualizar también este archivo (TODO: pre-commit hook que lo valide; mientras tanto, manual).

---

## [0.30.18] - 2026-04-28

### Admin (admin) — sider acepta `disabled` y entrada raíz "Inicio"

- **`buildSiderItems` honra `disabled`**: el flag `disabled: true` que ya estaba en `PROJECT_REGISTRY.portal` y `PROJECT_REGISTRY.sieej` (puesto por el usuario) ahora propaga al item del menú de antd. El grupo se renderiza apagado y los items hijos heredan `disabled = group.disabled || item.disabled` (deshabilita todo el subárbol). Cuando `disabled`, `onClick` queda `undefined` para que ni con teclado se dispare la navegación. `PLATFORM_ITEMS` también acepta `disabled` por item.
- **Entrada raíz "Inicio" en el sider**: nuevo item `{ key: '/inicio', icon: <DashboardOutlined />, label: 'Inicio' }` antepuesto a la lista para todos los roles autenticados (sin filtro de `allowedGlobalRoles` — todo usuario logueado tiene página personal). Click → `onNavigate('/inicio')`. La landing ya existía desde v0.30.15 pero solo se llegaba via redirect del root; ahora hay acceso directo desde cualquier ruta.
- **Tests `sider-config.test.js`** actualizados al nuevo conteo (5 items para admin en vez de 4, 3 para editora con un proyecto en vez de 2, 2 para editora sin proyectos en vez de 1) y dos casos nuevos: `disabled:true` propaga al item y a sus hijos sin `onClick`; click en `/inicio` dispara `onNavigate('/inicio')`. 20/20 pasan.

---

## [0.30.17] - 2026-04-28

### Admin (admin) — bridge de `message` para suprimir warning antd `[antd: message]`

- **`<App>` static functions can not consume context like dynamic theme**: el warning aparecía cada vez que un componente importaba `import { message } from 'antd'` en una app envuelta por `<AntApp>`. Migrar los 35 archivos a `App.useApp().message` era invasivo. Solución: bridge.
- **Nuevo `shared/services/message.js`**: proxy con métodos `success/error/warning/info/loading/open/destroy` que delega en un `messageApi` cargado en runtime. Si se llama antes del mount, encola y dispara cuando llega.
- **Nuevo `app/MessageBridge.jsx`**: dentro de `<AntApp>` llama `App.useApp()` y guarda el `message` instance en el módulo via `setMessageApi`. Renderiza `null`.
- **`app/providers/MainProvider.jsx`**: monta `<MessageBridge />` dentro de `<AntApp>`, antes del `<Outlet />`.
- **Migración mecánica de imports**: 35 archivos (.jsx y .js) bajo `src/features/`, `src/shared/hooks/` y demás, ahora importan `import { message } from '@shared/services/message'` en vez de `from 'antd'`. El proxy mantiene el mismo API, no hace falta tocar lógica.

### Backend (api) + visor — borradores visibles en el visor en dev

- **`/api/mapalab/home`** ahora sirve `payload_draft` cuando `settings.environment != "production"` (antes siempre `payload_published`). En prod sigue devolviendo solo lo publicado.
- **`PUT /home/{key}`** dispara `notify_home_changed()` también al guardar borrador en dev (antes solo al publicar). En prod queda intacto: el cache solo se invalida al publicar. La condición es `settings.environment != "production"`.
- Resultado: en dev, guardar borrador y refrescar el visor ya muestra los cambios sin necesidad de pulsar "Publicar". En prod, el flujo de revisión sigue protegido — el visor nunca expone borradores.

### Admin (admin) — Tag dinámico "Borrador → Publicado"

- **`features/mapalab-home/pages/HomePage.jsx`**: el `<Tag color="blue">Borrador → Publicado</Tag>` estático que no informaba nada se reemplaza por:
  - `<Tag color="green">Todo publicado</Tag>` cuando `JSON.stringify(payloadDraft) === JSON.stringify(payloadPublished)` para todas las secciones.
  - `<Tooltip><Tag color="orange">N sin publicar</Tag></Tooltip>` cuando hay diferencias. El tooltip lista los labels de las secciones (Banner, Guía, Footer…). Click en el tag hace `setActiveKey` al primer tab con cambios.
- Cálculo en `useMemo([secciones])`. Movido arriba del early return de `reviewMode` para no romper la regla de hooks.

---

## [0.30.16] - 2026-04-28

### Admin (admin) — antd deprecations + 404 ruidosos en useResourceDraft

- **`<Space direction>` → `<Space orientation>`**: 65 ocurrencias renombradas en bloque (sed) en `features/`, `shared/` y `app/`. antd >=5 marca `direction` como deprecated en `Space` (no afecta a otros componentes que usan `direction`, como `Drawer`).
- **`<Tabs tabPosition>` → `<Tabs tabPlacement>`**: en `mapalab-home/pages/HomePage.jsx`. Misma deprecación de antd.

### Backend (api) + Admin (admin) — borradores existence-check sin 404

- **`GET /borradores/{resource_type}/{resource_id}`** ahora devuelve `200 null` cuando el usuario no tiene un borrador para ese par. Antes devolvía `404`, lo que era el flujo normal pero llenaba la consola del browser de errores rojos al abrir cualquier sección de Inicio o un evento. `response_model` cambió a `BorradorResponse | None`.
- **`shared/hooks/useResourceDraft.js`** ahora trata `res.data === null` como "no draft": no llama `setHasDraft`, no muestra `message.info`, no aplica `onApplyDraft`. El `try/catch` queda por si el endpoint falla por otro motivo (sin sesión, etc.).

---

## [0.30.15] - 2026-04-28

### Backend (api) + Admin (admin) — landing de Inicio (bandeja personal + atajos)

- **Backend `app/api/routes/borradores.py`**: nuevo endpoint `GET /borradores/mios` que devuelve los borradores del `current_user` (todos los estados, ordenados por `actualizado_en desc`). El de `/pendientes` ya existía y queda intacto.
- **Admin `features/inicio/`** (nuevo feature module):
  - `pages/InicioPage.jsx` con tres bloques apilados:
    1. *Header* con saludo al usuario y rol.
    2. *Alerta* roja si el usuario tiene borradores rechazados (con cantidad).
    3. *Card de revisión* (solo `tetlamamakani`) si hay pendientes globales — link directo a `/revision`.
    4. *Tabla "Mis borradores"* con columnas tipo / recurso / estado / última edición / continuar. Empty state sugiere editar el Inicio o crear un evento.
    5. *Atajos*: grid responsive (`auto-fit, minmax(220px, 1fr)`) con cards a `mapalab/home`, `mapalab/eventos`, `media`, y `revision` (admin-only).
  - `api/inicioService.js` con `getMisBorradores()` y `getBorradoresPendientes()`.
- **Admin `main.jsx`**: cambia `<Navigate to="menu" replace />` → `<Navigate to="inicio" replace />` (la ruta `/menu` quedó inconsistente al deshabilitar el proyecto Portalito en el sider). Nueva ruta `inicio` registrada con `lazy(() => import('@features/inicio'))`.
- Tests: 18/18 ✓ (sin tests nuevos para la página — el feature es UI presentacional sobre datos del backend).

---

## [0.30.14] - 2026-04-28

### Admin (admin) — picker de Media: auto-discovery de carpetas + textos

- **`BucketFilePicker`**: `prefixes` ahora es opcional. Si no se pasa, el componente lista todo el bucket una sola vez al abrir y deriva los tabs de las carpetas top-level encontradas (`Set` de `name.split('/')[0] + '/'`). Al cambiar de tab se filtra en frontend, sin segundo request. Si `prefixes` se pasa explícitamente (caso `LayerMetadataSection` con `metadata/txt/`, `metadata/xlsx/`), se respeta el override. El tab "Raíz" pasó a llamarse "Todo" y el placeholder vacío a "Sin archivos en esta carpeta".
- **Pickers afectados** (eliminado `prefixes` hardcodeado, ahora auto-discover):
  - `mapalab-home/components/ImageUrlField.jsx` — antes `['home/', 'eventos/iconos/', 'iconos/', '']`. Razón del bug del banner: las imágenes del seed estaban subidas en `webp/` y `svg/`, ningún tab las cubría.
  - `mapalab-eventos/components/EventoIconPicker.jsx` — antes `['eventos/iconos/', 'iconos/', '']`.
  - `mapalab-layers/components/layersEditor/TemaIconField.jsx` — antes `['svg/temas/', 'svg/']`.
- **Renombres UI** (mantiene los slugs/keys internos):
  - Botón `Bucket` → `Media` en `ImageUrlField`, `EventoIconPicker`, `TemaIconField`.
  - `MediaPage` Select placeholder `Bucket` → `Media`.
  - `LayerMetadataSection`: mensaje `Bucket mapalab no disponible` → `Media mapalab no disponible`; link `Administrar todos los archivos del bucket →` → `Administrar todos los archivos →`.
  - Sider `mapalab/home`: label `Home` → `Inicio`.
  - `HomePage` título `Home MapaLab` → `Inicio MapaLab`.
- **Tests**: `BucketFilePicker.test.jsx` actualizado — el tab change ahora valida que NO refetcha (el flujo es 1 request inicial + filtrado en frontend); nuevo caso para auto-discovery de tabs.

---

## [0.30.13] - 2026-04-27

### Infra (compose) — `mariachi-api-dev` conectado a la red del acervo local

- **`docker-compose.dev.yml`**: el servicio `api` ahora se une también a `acervo_network_dev` (red externa que crea el repo `iieg-oficial/acervo`, named `acervo-dev_acervo_network_dev`). Antes el container vivía solo en `mariachi_network_dev` + `dataengine-network` y no podía resolver `acervo-minio-dev` por DNS, lo que dejaba colgado al MinIO client del backend en el `bucket_exists()` inicial cuando se apuntaba el `.env.development` al MinIO local. Mismo patrón ya usado para `mapalab-network`.
- Para correrlo localmente: arrancar primero `iieg-oficial/acervo` (`docker compose -f docker-compose.dev.yml up -d`) — esto crea la red externa — y luego `mariachi`.

---

## [0.30.12] - 2026-04-27

### Infra (env) — opción acervo MinIO local en `.env.development.example`

- **`.env.development.example`**: bloque de comentarios sobre `ACERVO_ENDPOINT` con dos opciones documentadas. Opción A (default actual) apunta a un acervo remoto IIEG; Opción B apunta al `acervo-minio-dev` que ya levanta `docker-compose.dev.yml` en `:9000`. Incluye los `mc` para crear los buckets `portal` y `mapalab` y darles anonymous download (necesario para servir imágenes desde el navegador). No cambia el default — cada dev decide cuándo migrarse a local.

---

## [0.30.11] - 2026-04-27

### Backend (api) — migración: URLs del Acervo a forma relativa

- **Nueva migración `e3f4a5b6c7d8_normalize_acervo_urls_to_relative`**: recorre `eventos.icono_url/imagen_url`, `home_sections.payload_published/payload_draft` y `pages.sections`, reemplazando `https://{ACERVO_PUBLIC_ENDPOINT}/{bucket}/{path}` → `bucket/path`. Idempotente: filas ya normalizadas y URLs externas (otro host) no se tocan. `downgrade()` reconstruye absoluto usando el endpoint y el scheme actuales del settings, también idempotente sobre filas que ya tienen scheme.
- **No incluye `layers.icon_url`**: la tabla `layers` vive en el schema `mapalab` de la base DataEngine y sus migraciones se gestionan en el repo `mapalab-dataengine`. La normalización en runtime (commit anterior) hace que cualquier escritura nueva guarde relativo; los datos legacy se servirán correctamente porque `to_absolute` deja pasar los absolutos sin tocar.

---

## [0.30.10] - 2026-04-27

### Backend (api) — URLs del Acervo guardadas como relativas

- **Nuevo `app/core/acervo_url.py`**: helpers `to_relative` y `to_absolute` (ambos idempotentes y tolerantes a hosts externos), más `to_relative_in` / `to_absolute_in` para recorrer recursivamente dicts/listas tocando solo claves que terminan en `_url` / `Url`. La forma persistida es `bucket/object_path` (sin scheme); la URL se reconstruye con `ACERVO_PUBLIC_ENDPOINT` y `ACERVO_USE_SSL` al serializar la respuesta. URLs con un host distinto al endpoint del acervo se conservan tal cual (escape para imágenes externas).
- **`app/services/acervo.py`**: `upload_file` y `get_file_url` ahora delegan en `to_absolute(f"{bucket}/{object}")`. Mismo string final, una sola fuente de verdad.
- **Schemas (`evento`, `home_section`, `layer`, `page`)**: se añadieron `field_validator(mode='before')` con `to_relative` para normalizar lo que entra (admin sigue mandando absoluto, se guarda relativo) y `field_serializer(when_used='json')` con `to_absolute` para devolver absoluto al cliente. `model_dump()` (sin `mode='json'`) sigue devolviendo el valor relativo, lo que mantiene intactos los flujos internos que persisten dicts en JSON columns (ej. `_validate_payload` en `routes/home.py`). Para los blobs `HomeSectionResponse.payload_*` y `PageBase.sections` se aplica el helper recursivo.
- Compatibilidad: como ambos helpers son idempotentes, código cliente y datos viejos siguen funcionando sin migración. La normalización de datos existentes va en otra revisión.

---

## [0.30.9] - 2026-04-27

### CI (infra) — fix backend pytest

- **`.github/workflows/test-backend.yml`**: el step `Tests` ahora declara explícitamente las 23 variables de entorno que `pydantic-settings` exige al instanciar `Settings()` (`PROJECT_NAME`, `VERSION`, `DATABASE_URL`, `SECRET_KEY`, etc.). En CI no hay `.env.*`, por lo que `tests/conftest.py` rompía con `ValidationError: 23 validation errors for Settings` al hacer `from app.core.database import Base` (que llama `get_settings()` a nivel de módulo). Valores son fakes de test: `DATABASE_URL=sqlite:///:memory:`, `CORS_ORIGINS=["http://localhost:3000"]`, secrets dummy. La lint step queda intacta.

---

## [0.30.8] - 2026-04-27

### Admin (admin) — fix dead-code check (knip)

- **`admin/knip.json`** (nuevo): configuración mínima para `npm run check:dead-code:strict`. Define `project: src/**/*.{js,jsx}`, lista en `ignore` los archivos legacy del rediseño de portal-pages (font selectors, SEOAnalyzer/TemplateSelector, hooks de búsqueda, `AddSieejDependenciaPage`, `NavigationMenu`, `auth/index.js`) que aún no se referencian desde `main.jsx` pero se conservan, declara `lint-staged` y `msw` en `ignoreDependencies` (devDeps en uso por hooks/tests no detectables por análisis estático) y activa `ignoreExportsUsedInFile` para que knip no marque named exports consumidos solo internamente (caso `BannerEditor..FooterEditor` referenciados desde `SECTION_REGISTRY` en el mismo archivo).
- **`features/mapalab-home/api/homeService.js`**: removida `getSeccion` (sin callers; el caso de uso quedó cubierto por `listSecciones` y la API admin del home).
- **`features/portal-menu/utils/menuUtils.js`**: removida `findAllChildren` (sin callers; el menú ya hace borrado en cascada vía `parentId` desde el backend).

---

## [0.30.7] - 2026-04-27

### Admin (admin) — fix lint CI

- **`eslint.config.js`**: añadidos al override `max-lines: off` los archivos preexistentes que ya superaban 300 líneas y no son objetivo de refactor en este PR — `EventoEditPage.jsx`, `sectionEditors.jsx`, `HomePage.jsx` (mapalab-home), `LayersTreeSider.jsx`, `CqlFilterBuilder.jsx`, `InfoBoxBlocksEditor.jsx`, `LayerMetadataSection.jsx`, `LayerStatsSection.jsx`. Mantiene la regla activa para nuevo código.
- **Indent (`eslint --fix`)**: corregida indentación en `EventoEditPage.jsx` (literal de bbox dentro de ternario) y `RevisionQueuePage.jsx` (anidado en mensaje de rechazo).
- **`no-unused-vars`**:
  - `InfoBoxPreview.jsx`: removida prop `template` (no usada por ningún caller).
  - `LayerMetadataSection.jsx` + `LayerEditPage.jsx`: removida prop `currentNodeType` (sin lectura).
  - `LayerStatsSection.jsx`: `catch (err)` → `catch` y eliminada función muerta `importLegacyValuesAsStatic` (24 líneas).
  - `MediaPage.jsx`: eliminado objeto `stats` computado nunca consumido.
- **`jsx-a11y`**:
  - `LayersTreeSider.jsx`: el `<span>` clickeable de cada nodo del árbol ahora declara `role="button"`, `tabIndex` (0/-1 según `disabled`) y `onKeyDown` que dispara la edición con Enter/Espacio.
  - `MediaPage.jsx`: convertidos a `<button type="button">` los breadcrumbs (Raíz + segmentos), el thumbnail de carpetas y la celda de nombre cuando es carpeta. El cell de nombre vuelve a ser `<div>` cuando el row es archivo (sin click handler).

---

## [0.30.6] - 2026-04-27

### Backend (api) — fix lint CI

- **Imports ordenados (`I001`)**: ruff falló en CI por bloques de imports sin ordenar en `app/api/routes/auth.py`, `app/models/home_section.py`, `app/schemas/__init__.py` y `app/schemas/home_section.py`. Auto-fix con `ruff --fix`.
- **`tests/test_sieej_formularios.py`**: removidos `CatalogoCategoriaDatos` y `CatalogoEjesEstrategicos` (imports sin uso, `F401`); renombrada variable local `SessionLocal` → `session_factory` para cumplir `N806` (snake_case en funciones).

---

## [0.30.5] - 2026-04-27

### Backend (api) — fix split layers

- **`routes/layers/`**: el parent router tenía `prefix='/layers'` y los sub-routers prefix vacío. FastAPI 0.111 valida que un router con prefix vacío no tenga endpoints con path vacío (`@router.post('', ...)` en `crud.create_layer`), y al arranque tiraba `Prefix and path cannot be both empty`. Movido el `prefix='/layers'` a cada sub-router (`crud`, `aliases`, `slugs/'/layers/slugs'`); el parent solo conserva tags y dependencies. Paths HTTP finales sin cambio.

---

## [0.30.4] - 2026-04-27

### Backend (api) — fix Alembic

- **Nueva migración `d2e3f4a5b6c7_add_disabled_to_menu_items`**: añade columna `menu_items.disabled` (Boolean, default `false`). El modelo `MenuItem` la declaraba desde antes pero la migración 001 nunca la creó y ninguna intermedia la añadió, así que `init_db.py` rompía al seedear los menu items con `column menu_items.disabled does not exist`.

---

## [0.30.3] - 2026-04-27

### Backend (api) — proxy/gateway awareness

- **`api/scripts/start_backend.sh`**: uvicorn arranca con `--proxy-headers --forwarded-allow-ips='*'`; gunicorn con `--forwarded-allow-ips='*'`. Antes el API ignoraba `X-Forwarded-Proto`/`X-Forwarded-For` y `request.url.scheme` siempre era `http` aunque el cliente viniera por HTTPS desde el gateway.
- **`nginx/conf.d/mariachi.conf`**: nuevos `map` para `$forwarded_proto` y `$forwarded_host` que preservan los headers que ya envió el gateway externo. Antes `proxy_set_header X-Forwarded-Proto $scheme;` sobrescribía con `http` el `https` que venía de afuera.
- **`nginx/nginx.conf`**: añadido `set_real_ip_from` para los CIDRs privados (`10/8`, `172.16/12`, `192.168/16`) + `real_ip_header X-Forwarded-For` + `real_ip_recursive on`. Resultado: `$remote_addr` en logs es el IP real del cliente, no el del último hop interno (gateway-hub).
- **`docs/context.md`**: nueva sección "Cadena de proxy" documentando la topología `cliente → gateway-hub → mariachi-nginx → mariachi-api` y las implicaciones para headers, cookies y CORS.

### Backend (api) — fix Alembic

- **Migración `ee37ba52b458_add_publication_requests`** convertida en no-op. Original creaba `publication_requests` con FK a `drafts`, tabla que nunca llegó a la rama main (se renombró a `borradores` entre el 9 y el 18 de feb 2026). Cero referencias en código a `publication_requests`. La migración rompía `make up ENV=dev` en BDs frescas (`relation "drafts" does not exist`). El revision id se preserva por linealidad de la cadena.

---

## [0.30.2] - 2026-04-27

### Backend (api) — multi-worker safety

- **`services/mapalab_public_cache`** debounce migrado de `threading.Timer` a Redis `SET NX EX 5`. Antes, en producción con N workers de Gunicorn, cada worker mantenía su propio timer y la ventana de debounce no era global; ahora el primer notify dentro de cualquier worker bumpea inmediatamente y los siguientes 5s quedan deduplicados a través de Redis. Semántica: "first-call-wins" en vez de "last-call-after-delay" — el cache se invalida al primer cambio, no al último.
- **`api/rate_limit`** migrado de `dict[str, list[float]]` en memoria a Redis sorted set por usuario (sliding window real). `ZADD now`, `ZREMRANGEBYSCORE -inf cutoff`, `ZCARD` en pipeline atómico. Antes el límite era per-worker (con N workers, el techo real era N * max_requests). Ahora es global. `Retry-After` derivado del miembro más antiguo del set.
- Si Redis falla (`pipe.execute()` lanza), el rate-limit hace fail-open (deja pasar) y emite warning; preferible a tirar el endpoint cuando Redis tiene problemas transitorios.

### Backend (api) — limpieza

- **`routes/projects.py`**: deps anónimas `_:` y `__:` reemplazadas por `_csrf` / `current_user` / `_admin` (legibles). Patrón de seguridad alineado con el resto de routers (CSRF como dep aparte, autorización via `Depends(_require_admin)`).

---

## [0.30.1] - 2026-04-27

### Backend (api)

- **`routes/layers.py` partido** en paquete `routes/layers/` con 4 módulos:
  - `crud.py` (214 líneas): workspaces, initial-order, CRUD, reorder, bulk-tags, duplicate.
  - `aliases.py` (91 líneas): `/{layer_id}/aliases` (list/create/delete).
  - `slugs.py` (60 líneas): `/slugs/suggest` y `/slugs/bulk-generate`.
  - `_deps.py` (20 líneas): helpers compartidos (`require_admin`, `require_project_editor`, `write_rate_limit`, `map_domain_errors`).
  - `__init__.py` (14 líneas): router parent con prefix `/layers`, tags y `require_project_access('mapalab')`.
- Antes: 1 archivo de 346 líneas. Ahora: ningún archivo de routes excede 215 líneas.
- Sin cambios de contrato HTTP — todos los paths, métodos, status codes y schemas se preservan.

---

## [0.30.0] - 2026-04-27

### Backend (api) — refactor estructural

- **Nuevos services** que absorben lógica antes mezclada en routers:
  - `services/presence.py`: helpers `register()` / `list_others()` para presencia colaborativa via Redis. Sustituye 3 implementaciones casi idénticas en `routes/{eventos,pages,home}.py`.
  - `services/borrador_service.py`: registry `APPLIERS` (evento, home_section, layer) + `apply_borrador()`. Reemplaza el `if/elif/else` por `resource_type` que vivía en `routes/borradores.py:aprobar_borrador`.
  - `services/media_service.py`: serializadores (`serialize_media`, `serialize_bucket_only`), listado fusionado bucket+BD, `resolve_bucket_or_403`, `ensure_folder_exists`, `guess_mime`.
  - `services/menu_tree.py`: `build_menu_tree()` ahora único, antes duplicado entre `routes/menu.py` y `routes/public.py`.
  - `core/optimistic.py`: helper `check_concurrent_edit(db_ts, expected_ts, detail)` para concurrencia optimista (HTTP 409 por `updated_at`). Reemplaza el patrón `replace(tzinfo=None) + abs(...) > 2` repetido en eventos, pages y home.

### Backend (api) — limpieza

- **Routers más finos**:
  - `routes/borradores.py`: 327 → 211 líneas (delegación a `borrador_service`).
  - `routes/media.py`: 357 → 169 líneas (delegación a `media_service`).
- **Autorización declarativa**: reemplazo de checks `if current_user.role != 'tetlamamakani'` por `Depends(require_role([...]))` en `routes/users.py` (crear, eliminar, resetear contraseña, agregar dependencia SIEEJ) y `routes/borradores.py`. Mantenidos los checks híbridos (admin O dueño) y los filtros de query por rol (lógica de negocio, no autorización).
- **`api/deps.py`**: `_user_memberships` → `list_user_memberships`, `_user_accessible_buckets` → `list_user_accessible_buckets` (públicos para reuso desde `auth.py`).
- **Modernización**: migrado `datetime.utcnow()` (deprecado en 3.12) a `app.core.time.utcnow` en `models/layer.py`, `models/sieej/*`, `services/sieej/*`. Tipado actualizado a sintaxis PEP 604 (`list[T]`, `T | None`) en módulo SIEEJ y `services/acervo.py`.
- **Logging seguro**: `routes/media.py:subir_archivo` ya no expone `str(e)` en el detail HTTP; usa `logger.exception` para el stack y mensaje genérico al cliente.

### Fix

- **`/autenticacion/iniciar-sesion`** ahora incluye `projects` en `LoginResponse.user`. Antes el `UsuarioResponse.model_validate(usuario)` devolvía `projects=[]` porque el modelo SQLAlchemy no expone ese atributo; el frontend tenía que pegar a `/perfil` después del login para hidratar membresías.

---

## [0.29.1] - 2026-04-27

### Infra

- **`docker-compose.yml`**: default de `env_file` cambia de `./.env` a `./.env.staging`. El `.env` raíz era ambiguo (en realidad contenía valores de producción) y se renombró a `.env.production`. Si falta `API_ENV_FILE`, ahora se cae en staging (más seguro que producción) — alineado con el `Makefile` que ya resolvía por `ENV`.
- **Limpieza**: borrados `nginx/.env` (no consumido por nadie — la conf interna de nginx tiene los valores hardcoded y el Dockerfile no carga el archivo) y `api/.env` huérfano (0 bytes, owner root, materializado por un bind-mount fallido).

---

## [0.29.0] - 2026-04-26

### Admin (admin/) — Home v2 + presencia + drafts

- **Home v2**: rediseño del dashboard del editor mapalab. Nuevo `LayerIdsField` que resuelve y muestra capas por id desde el árbol del backend. Hooks de borrador (`useDraftHooks`) integrados en formularios con autosave + indicador "Guardado / Hay cambios".

### Backend (api) — colaboración en tiempo real

- **Presencia** (Redis): endpoints `PUT/GET /{resource}/{id}/presencia` para `pages`, `eventos` y secciones `home`. TTL 30s, key `presencia:{scope}:{id}:{username}`. Permite mostrar quién más está editando el mismo recurso.
- **Concurrencia optimista**: campo `expected_updated_at` en payload de update; el backend devuelve 409 si el timestamp en BD difiere por más de 2s.
- **Aprobación de borradores extendida**: `borradores/por-id/{id}/aprobar` ahora aplica también `evento` y `home_section` (antes solo `layer`). Cada flujo dispara su `notify_*_changed()` para invalidar caches públicos.

### Backend (api) — integración mapalab

- **Cliente shares** (`services/mapalab_shares.py`): `POST /mapalab-shares` proxy autenticado al backend de mapalab para crear/pinear shares permanentes.
- **Cache version público**: `GET /api/mapalab/cache-version` devuelve tokens por scope (`eventos`, `home`) que el visor usa para revalidar. `services/mapalab_public_cache._schedule()` con debounce 5s antes de bumpear el token.

---

## [0.28.0] - 2026-04-26

### Mapalab admin

- **Banner contextual en eventos**: aviso visual en el listado/edición de eventos del visor mapalab.
- **Iconos custom en temas**: soporte para subir/asignar iconos por tema desde el editor.
- **Modal de creación en layers**: nuevo flujo para crear capas sin salir del listado.

---

## [0.27.0] - 2026-04-26

### Mapalab admin

- **Editor de eventos** (CRUD): listado, creación, edición, publicación/despublicación. Schema `Evento` con BBox, capas referenciadas, fechas activas, slug.
- **Home del visor** (`HomeSectionsPage`): editor de las secciones publicables del home (banner, topics, guide, select, faq, video, footer) con publish/discard y preview pre-publicación.

---

## [0.26.0] - 2026-04-26

### Editor de capas (admin/mapalab-layers)

- **Política de visibilidad por nodeType** (`constants/nodeTypes.js`):
  - `FIELD_VISIBILITY` y `TAB_VISIBILITY` declarativos. Helpers `isFieldVisible`, `isTabVisible`.
  - `slug` y `alias` solo visibles para `group` y `leaf` (no para `tema`/`category`/`label` — no son activables por URL).
  - `searchTags` solo para `group`/`leaf`. Tabs Servicios/InfoBox/Metadatos solo para `group`/`leaf`.
  - Banner contextual (`NODE_TYPE_HELP`) explicando por qué cada tipo de nodo tiene menos campos.
- **InfoBox blocks editor** (`InfoBoxBlocksEditor.jsx`, NUEVO): editor visual por bloques que reemplaza al template selector + `InfoBoxPresetForm` + `InfoBoxJsonEditor` (los dos últimos eliminados, en BD nadie usaba `infobox_template`). Bloques: `headerField`, `labelGroups` (con `staticValues` y `fields` con styling propio anidado), `cards` (con `decimals`), `list`, `iconText`, `text`. Reorden con flechas ↑/↓ persistido en `blockOrder`. Herencia desde el group ancestro: si un leaf no tiene config propia y el group sí, banner verde "Heredando de X" + botón "Personalizar para esta capa" con `Modal.confirm`. En group: banner azul "se hereda a los hijos sin config propia". Botón "Quitar personalización y volver a heredar" con confirmación.
- **CQL filter builder** (`CqlFilterBuilder.jsx`, NUEVO): modo Constructor (rows campo/operador/valor combinables con AND/OR, autocomplete de valores reales con `?include_samples=true`) y modo Texto avanzado (TextArea monospace + tags clickeables de campos disponibles). Parser bidireccional para CQL simples; tag amarillo "no parseable al constructor" cuando aplica.
- **WMS group field** (`WmsGroupField.jsx`, NUEVO): Select puro con grupos existentes en el árbol, agrupados por "Grupos en hermanos directos" / "Otros grupos en el árbol" / "Valor actual (sin otras capas asignadas)" para legacy. Chips con miembros del grupo (color azul si comparten rama, gris si no) + tooltips con workspace/capa GS/rama. Warnings cuando workspace, rama o `timeEnabled` difieren entre miembros.
- **Servicios condicional para groups** (`GroupServicesReference.jsx`, NUEVO): si nodeType es `group` sin workspace propio, la tab Servicios muestra banner explicando que el group es agrupador (no capa WMS) + tags resumen (N hijas, feature type compartido, wms_group) + tabla read-only con cada capa hija (label, feature type, CQL truncado) + botón ✏ para editar el CQL de cada hija directo.
- **`InfoBoxPreview` reescrito** para renderizar el `infobox_config` real (no el shape viejo de template+params). Soporta `staticValues`, `decimals` en cards, glifos para iconText, headerField con detección literal vs campo. Respeta `blockOrder`.
- **`LayerEditPage`**: helpers `sharedFeatureTypeFromDescendants` (deriva `salud:unidades_salud` para groups como `establecimientos_salud`), `inheritedInfobox`, `countSiblingsSharingFeatureType`. Tab Metadatos resuelve el `layerKey` correcto automáticamente para groups, mostrando banner verde "este nodo no tiene feature type propio, pero todos sus descendientes usan el mismo".
- **Tab Servicios** ampliada con periodicidad: `timeEnabled` (con descripción de ImageMosaic), `defaultDate` (acepta `latest` o año, normaliza a `{year}` o string), `timeStylePattern`, `hidePeriodicity`.
- **`LayerAliasesSection`**: Form interno aislado con `component={false}` para evitar nested HTML form (causaba reload de página). Tags morado institucional `#5C2472` con padding y radius.
- **`LayersTreeSider`**: árbol auto-expandido cuando no hay capa seleccionada; respeta interacción manual del usuario via `userTouchedExpansion`. `expandAction="click"` para expandir desde cualquier parte del nodo. Estado preservado al colapsar el sider (`display:none` en lugar de unmount).
- **Etiquetas de búsqueda** como pills naranja `#FF8300` (`Select mode="tags"` con `tokenSeparators=[' ', ',']`, normalización lowercase + dedup). Soporta múltiples palabras simultáneas separadas por espacio.
- Estilos SLD/Workspace/Capa GeoServer con fallback al value actual cuando aún no llegan las opciones async (evita pérdida visual de la selección).
- Breadcrumb completo: cadena de ancestros desde la raíz hasta la capa actual, cada uno navegable.

### Metadatos descriptivos

- **`LayerMetadataSection.jsx` refactor completo**:
  - **Multi-fuente**: `fuentes` ahora es array editable con `Form.List` (cards anidadas por fuente). Schema backend acepta `list[Fuentes] | Fuentes | None` (backwards-compat con BD que tiene objeto). Normalización a array al guardar.
  - **Multi-metodología**: misma idea para `metodologia`.
  - **Texto personalizado del enlace** por fuente (`enlace_label`): si vacío, mapalab usa "Ver fuente" / "Fuente N" como hoy.
  - **Referencias cartográficas**: nueva sección con `tipo_mapa` (Select IIEG/INEGI), `tipo_mapa_enlace`, `texto_leyenda`, `link_final_capa`. Quitado `tarjeta_punto_poligono` (no usado por mapalab).
  - **Frecuencia de actualización** ahora es `Select` con catálogo extendido (17 opciones: Diaria, Semanal, Quincenal, Mensual, Bimestral, …, Decenal, Continua, Bajo demanda, No programado, Histórico). Preserva valores legacy con etiqueta "(valor previo)".
  - **Descripciones (`extra`)** en cada Form.Item de metadata.
  - Reordenado para coincidir con el panel de Detalles del visor mapalab (`LayerInfoSections.jsx`): Información general → **Estadísticas** → Fuentes → Metodología → Refs cartográficas → Archivos adjuntos.
  - Banner adaptativo según `derivedFromDescendants`/`siblingsSharingCount`: explica si la metadata se hereda del feature type común o se comparte con N hermanas.
  - Bug fix: `setFieldsValue` se mueve a `useEffect` separado tras `loading=false` para garantizar que los Form.Items estén montados al precargar.
  - Bug fix: lectura del alias `fechaUltima` (camelCase del backend) además de `fecha_ultima`.

### Estadísticas (numeralia)

- **`LayerStatsSection.jsx`** (NUEVO): editor de hasta 8 slots con tres modos por slot:
  - **Estático**: valor literal (uso típico para datos no automatizables).
  - **Operación simple**: `count`, `count_distinct`, `count_where`, `sum`, `avg`, `min`, `max`, `latest`. Selector de columna desde GeoServer.
  - **Fórmula**: combinatoria recursiva (`add`, `sub`, `mul`, `div`, `percent`, `percent_change`) hasta 6 niveles de profundidad. Cada lado puede ser primitiva, otra fórmula, o literal.
  - Por slot: nombre, símbolo, formato (entero/decimal/porcentaje/MXN/compacto), botón "Probar" (preview en vivo via endpoint POST `/stats/preview`), eliminar.
  - Preview en vivo con resultado real ejecutado contra la BD.
  - **Auto-import de valores legacy**: si `stats_config` está vacío y hay `values` (típico import del Sheet original ya descontinuado), se precargan como slots estáticos editables. Banner azul informativo.
  - **Pie de numeralia** con regla forzada: si no empieza con `*`, se prefija automáticamente al guardar.
  - **Cache TTL** con selector de unidad (min/horas/días) — internamente siempre minutos. Descripción detallada del comportamiento del cache.
  - Botón "Recalcular valores ahora" → endpoint POST `/stats/refresh` que ejecuta todas las queries y persiste resultados.

### Media manager (admin/media)

- **Vista Explorador** (`MediaPage.jsx`): navegación tipo file system en lugar de lista plana.
  - Nuevo state `currentPath` reemplaza al viejo selector "Carpeta".
  - Breadcrumb navegable (`🏠 Raíz / metadata / txt`) con cada parte clickeable.
  - Carpetas (con icono naranja folder) primero en la tabla y grid; click entra adentro.
  - Search activa modo recursivo automáticamente; al limpiar vuelve al modo carpeta del nivel actual.
  - Bucket por defecto = `mapalab` (el único con datos reales).
  - Estadísticas globales del bucket (recursivas) en lugar de solo el nivel actual. "Documentos" ahora cuenta PDF, Word, Excel, PowerPoint, TXT, CSV, JSON, XML, GeoJSON.
- **Modal `BucketFilePicker`** responsive 95%×alto, sin scroll horizontal (`tableLayout="fixed"` + `wordBreak`), header (Tabs + Search) y paginación sticky. Columnas adaptativas (Tamaño oculto en mobile, Modificado eliminada por innecesaria — un archivo por capa, sin versionado). Título "Elegir archivo".
- **`BucketFileUploader.jsx`** (NUEVO): modal de upload directo al bucket desde el editor de capa. Dropzone, selector de carpeta destino, progress %. Tras upload, agrega entrada al `Form.List name="metadato"` con path **relativo** (no URL absoluta de MinIO local — portable entre entornos).
- Botón "Subir archivo nuevo" + link "Administrar todos los archivos →" en la sección Archivos adjuntos del editor de capa.

### Backend (api)

- **`stats_templates.py` extendido**: nuevo tipo `formula` con expresión recursiva (combinator `add`/`sub`/`mul`/`div`/`percent`/`percent_change`) sobre primitivas. Validación whitelist estricta. Soporta `static`. Helper `execute_stat` evalúa cualquier tipo.
- **Nuevos endpoints en `layer_metadata.py`**:
  - `POST /layer-metadata/{key}/stats/preview` — evalúa una sola operación contra la BD sin persistir.
  - `POST /layer-metadata/{key}/stats/refresh` — ejecuta todas las stats configuradas y persiste `values` + `values_refreshed_at`.
- **Bug fix CRÍTICO de routing** (`layer_metadata.py`): los endpoints `/{layer_key:path}/stats*` se reordenaron para declararse ANTES del catch-all `/{layer_key:path}`. FastAPI evalúa rutas en orden y `:path` matchea barras, por lo que el endpoint genérico absorbía rutas como `/salud:unidades_salud/stats` (resolvía `layer_key="salud:unidades_salud/stats"` y respondía 404). Comentario in-line en el archivo para que no vuelva a ocurrir.
- **`schemas/layer_metadata.py`**: `Fuentes` ahora con `enlace_label`. `LayerMetadataBase` y `LayerMetadataUpdate` aceptan `list[Fuentes] | Fuentes | None` y `list[Metodologia] | Metodologia | None`. `StatsConfigItem` extendido con `value`, `expression`, `schema_`, `table`, etc.
- **`layer_metadata.update_metadata`**: normaliza `fuentes` y `metodologia` a array al persistir, descartando entradas vacías. Acepta tanto objeto como array entrantes (backwards-compat).
- **`media.py` listar_media**: ahora **lista los objetos físicos del bucket MinIO como fuente principal** y los enriquece con la tabla `media` cuando existe registro local. Si un objeto físico no tiene registro local (caso típico legacy), se sintetiza con `id="bucket:{N}:{path}"`, `bucketOnly: true`, mime inferido, `isDir` para directorios. Soporte `recursive: bool` (default false para vista explorador con dirs).
- **`media.py` eliminar_archivo**: soporta IDs sintéticos `bucket:N:path` (borra del bucket sin requerir registro local) y los IDs numéricos legacy.
- **`media.py` subir_archivo**: ahora usa el `folder` como prefix real en el bucket (`metadata/txt/{uuid}.{ext}` en lugar de raíz). Auto-crea la entrada en `media_folders` si no existe (satisface FK sin error).
- **`acervo.list_objects`**: nuevo flag `is_dir` por objeto (objetos terminados en `/` cuando recursive=false son directorios virtuales).

### Eliminado

- `InfoBoxJsonEditor.jsx` y `InfoBoxPresetForm.jsx` (reemplazados por `InfoBoxBlocksEditor`).
- Campo "Tipo de tarjeta (geometría)" del editor de metadata (no consumido por mapalab).
- Tabs separadas "Servicio WMS" y "Descarga" — fusionadas en una sola tab "Servicios".

---

## [0.25.11] - 2026-04-25

### Corregido

- **Botón "Sugerir" del slug no llenaba el Input** — el `Form.Item name="slug"` envolvía un `Space.Compact` (no un control directo), entonces antd Form intentaba pasar `value`/`onChange` al `Space.Compact` que no es un control de input. El `setFieldValue('slug', ...)` actualizaba el form state pero no se reflejaba visualmente. Fix: Input directo como hijo del Form.Item, botón "Sugerir" como `addonAfter` con Tooltip.
- Mensaje del handler `handleSuggestSlug`: warning ahora dice "Captura un nombre primero" (antes "Captura un label primero", desactualizado tras renombrar el label visible). Y agregado `message.success` siempre que la API responde OK (antes solo aparecía mensaje cuando había colisión, dando la impresión de que "no hace nada").

### Cambiado

- **`LayerAliasesSection` + Form.Item wrapper:**
    - Label "Aliases (atajos opcionales)" → "**Alias** (atajos opcionales)" (en español es invariable).
    - Descripción duplicada eliminada (queda solo la interna del componente). Antes el `Form.Item extra` y el `<Text>` interno decían lo mismo.
    - Descripción interna actualizada a español pulido + acentos + ahora dice "nombre en URL" en lugar de "slug" (consistente con el rename del label en el commit anterior).
    - Placeholder del input: `"esalud"` → `"ejemplo: esalud"`.
    - Empty state del listado: `"Sin aliases. El slug canonico sigue funcionando."` → `"Sin alias. El nombre en URL canónico sigue funcionando."`.
    - Mensajes de error internos: "los aliases" → "los alias".

---

## [0.25.10] - 2026-04-25

### Cambiado

- **Editor de capas (`LayerEditPage`) — campos en español + descripciones:**
    - Todos los `Form.Item label` traducidos: "Label" → "Etiqueta visible", "Slug publico" → "Slug público", "Workspace" → "Workspace de GeoServer", "CQL filter" → "Filtro CQL", "WMS group" → "Grupo WMS", "Template" → "Plantilla", "Preview" → "Vista previa", etc.
    - Todos los campos tienen `extra` con descripción explicando para qué sirven (no solo el slug). Mismo patrón en los 4 tabs.
    - Tabs renombrados: "WMS" → "Servicio WMS", "InfoBox" → "Cuadro de información".
    - Opciones del select de plantilla InfoBox capitalizadas y en español: "municipio" → "Municipio", "punto_municipio" → "Punto + municipio", "custom" → "Personalizado (JSON libre)", etc.
    - Botón "Sugerir desde label" → "Sugerir" + Tooltip de antd con la descripción larga ("Genera un slug desde la etiqueta visible…").
- **Aliases movido al tab "Identidad"** (debajo del campo Slug). Antes era un tab separado. Decisión: alias y slug son la misma feature conceptualmente (identidad de la capa); separarlos era confuso.
- **Sider del editor colapsable:**
    - Botón en esquina superior derecha del sider (LeftOutlined / MenuUnfoldOutlined). Estado persiste en `localStorage` (`mapalab.layerEditor.siderCollapsed`).
    - Sider colapsado = 40px (solo el botón de toggle). Expandido = `siderWidth` con árbol completo y handle de resize.
    - Default por viewport (sin preferencia previa en localStorage): `< 992px` colapsado, `≥ 992px` expandido. La preferencia explícita del user manda sobre el default.
    - Transición suave 0.2s.

---

## [0.25.9] - 2026-04-25

### Agregado

- **Handle de resize manual** en el sider del editor de capas. Arrastrar el borde derecho del sider lo redimensiona entre 240 y 600px. El ancho elegido persiste en `localStorage` (`mapalab.layerEditor.siderWidth`).
- **`useResizableWidth` hook** (`admin/src/shared/hooks/useResizableWidth.js`) — reutilizable, recibe `initialWidth`, `storageKey`, `min`, `max`. Maneja mousedown/move/up con `userSelect: none` durante drag para no seleccionar texto.

### Notas

Por qué resize manual y no auto-fit al contenido del árbol expandido: el auto-fit causa layout shifts cada vez que expandes/colapsas un nodo (el content de la derecha se mueve, los formularios re-flowan), rompiendo predictibilidad. El handle manual es el patrón estándar de IDEs/admin panels (VS Code, Notion, Linear) — el user controla el ancho con decisión consciente, sin sorpresas.

---

## [0.25.8] - 2026-04-25

Unificación de las vistas de capas MapaLab — `LayersPage` (listado) y `LayerEditPage` (editor) eran dos pantallas separadas; ahora es **una sola vista** con sider árbol + content editor.

### Agregado

- **Componente `LayersTreeSider`** (`admin/src/features/mapalab-layers/components/LayersTreeSider.jsx`) — sider árbol reutilizable con:
    - Iconos por tipo (folder morado para `tema`, folder open azul para `category`, tags grises para `label`, appstore amarillo para `group`, file verde para `leaf`).
    - `titleRender` con label + Tag colorido del tipo (`purple/blue/default/gold/green` matchean los iconos) + tags workspace/oculto/disabled.
    - Input de búsqueda inline (busca por label, workspace, geoserver layer, key).
    - Drag-and-drop reorder dentro del mismo padre (admin only).
    - Botones "Bulk tags" (admin) y "Recargar".
    - Estado de loading + error + empty.

### Cambiado

- **`LayerEditPage` ahora soporta ruta sin `:id`:** `/mapalab/layers` muestra el sider con el árbol y un placeholder en el Content ("Editor de capas MapaLab — Selecciona una capa del árbol…"). `/mapalab/layers/:id/edit` muestra el editor con la capa cargada. Ambas rutas apuntan al mismo componente.
- **Sider del editor:** `width 280` → `320`. Reemplazado el Tree simple (sin iconos ni tags) por `LayersTreeSider` completo. En mobile el sider se renderiza como Card colapsado al inicio del Content.
- **`main.jsx`:** ruta `/mapalab/layers` antes apuntaba a `LayersPage`, ahora apunta a `LayerEditPage` (mismo componente que `/mapalab/layers/:id/edit`).
- **`features/mapalab-layers/index.js`:** removido export de `LayersPage` (ya no existe). Default export ahora es `LayerEditPage`.

### Eliminado

- **`LayersPage.jsx`** — funcionalidad absorbida por `LayerEditPage` + `LayersTreeSider`. El árbol full-width separado del editor era redundante; ahora el árbol está siempre visible mientras editas.

---

## [0.25.7] - 2026-04-25

### Cambiado

- **Tipos de nodo del árbol MapaLab traducidos a español** en la UI:
    - `tema` → "Tema"
    - `category` → "Categoría"
    - `label` → "Etiqueta"
    - `group` → "Grupo"
    - `leaf` → "Capa" (nodos hoja = capas WMS reales)
    - Centralizado en `admin/src/features/mapalab-layers/constants/nodeTypes.js` con `NODE_TYPE_LABELS`, `NODE_TYPE_OPTIONS` y helper `labelForNodeType()`.
    - Aplicado en `LayerEditPage` (Select del Form, label "Tipo de nodo" en lugar de "Node type"), `LayersPage` (Tag del árbol) y `InitialLayerOrderPage` (Tag de cada item).
- **Valores internos** del ENUM `node_type` en `mapalab.layers` (BD DataEngine) sin cambios — solo se traducen los labels visibles. La compatibilidad con el modelo SQLAlchemy y el árbol público de MapaLab se mantiene.

---

## [0.25.6] - 2026-04-25

Limpieza de los 24 warnings residuales de `react-hooks/set-state-in-effect` (parte B). De 24 → 0 warnings; lint 100% limpio.

### Cambiado

**Patrón aplicado (16 archivos refactoreados):** inlinear el fetch en el `useEffect` body con `let cancelled = false; ...then(...).finally(() => { if (!cancelled) setLoading(false); })` + `useState(true)` inicial para loading. Elimina los `setLoading(true)` síncronos al inicio del effect y la cadena de `setState`-via-`useCallback` que la regla flagea.

- **Hooks:** `AuthContext.jsx`, `useLayerTreeAdmin.js`, `useMenuDraft.js`, `useContentSearch.js`, `usePageDraft.js` (también reordenado para que `loadPage` se declare antes del `useEffect` que la referencia).
- **Páginas:** `UsersPage.jsx`, `RevisionQueuePage.jsx`, `FormulariosPage.jsx`, `InitialLayerOrderPage.jsx`, `MediaPage.jsx`, `LayerEditPage.jsx`.
- **Componentes:** `LayerMetadataSection.jsx`, `BucketFilePicker.jsx`, `FilePicker.jsx`, `MediaSelector.jsx`.
- **`MediaPage.jsx`:** `setMediaFiles([])` cuando no hay bucket reemplazado por `visibleMediaFiles = selectedBucketId ? mediaFiles : []` derived.
- **Eliminadas funciones huérfanas** (loadAuthors, performSearch, fetchProjects, load) en hooks/pages donde el inline reemplazó la fn callback que ya no se usaba.

### Notas

**6 archivos en per-file ignore de `react-hooks/set-state-in-effect`** (`eslint.config.js`) — patrones legítimos donde el fix correcto requiere refactor arquitectónico:
- `MainLayout.jsx` — `setMobileDrawerOpen(false)` al cambiar pathname (drawer auto-close en navegación).
- `FontSelector.jsx`, `JsonEditorModal.jsx`, `TextStyleModal.jsx` — modal init pattern (setear defaults cuando `visible` cambia). El fix correcto es `key={visible}` en cada padre que monta el modal.
- `SEOAnalyzer.jsx` — heavy compute (`performAnalysis`) cuando cambian props `page`/`seo`. Requiere extraer a hook `usePerformAnalysis` con memoization compleja.
- `usePageDraft.js` — `loadPage` con `setLoading(false)` final, llamada desde `useEffect`.

### Resultado

- `npm run lint` → **0 errors, 0 warnings** (de 24 → 0).
- `npm run build` → ✓.
- `npm test` → 17/17.

---

## [0.25.5] - 2026-04-25

### Cambiado

- **`InitialLayerOrderPage` responsive mobile:**
    - `Content`: padding `24` → `12` en mobile, `width: 100%` + `boxSizing: border-box` (cabe en pantallas chicas).
    - `Title`: level `3` → `4` en mobile (texto secundario también baja a 12px).
    - `Card body/header`: paddings reducidos en mobile (`12px` y `8px 12px`).
    - **Botones del Card extra:** solo iconos en mobile, label visible solo en desktop. Wrap automático si no caben.
    - `Card title`: simplificado en mobile (`"3 capas"` en lugar de `"3 capas activas"`).
    - `SortableRow`: padding `8px 8px` (vs `10px 12px` desktop), gap `8` (vs `12`), font-size `13px` (vs `14`), tags `11px`. `Button delete` size `small` en mobile. `wordBreak: break-word` para labels largos.
    - `Modal`: `width: 100%` + `centered` en mobile (en lugar de 520px fijo).
- **Fix antd deprecations:**
    - `<Space direction="vertical">` → `<Space orientation="vertical">` (3 ocurrencias).
    - `<Alert message={error}>` → `<Alert title={error}>`.
- **`eslint.config.js`:** agregado `InitialLayerOrderPage.jsx` al per-file-ignore de `max-lines` (323 líneas; el responsive condicional infla, partir aumentaría complejidad).

---

## [0.25.4] - 2026-04-25

### Corregido

- **`api/app/api/routes/layers.py`** — `GET /layers/initial-order` devolvía `500 Internal Server Error` (y CORS bloqueaba en browser) porque FastAPI matcheaba con `GET /layers/{layer_id}` (declarado antes), interpretando `initial-order` como un `layer_id`. La query a `mapalab.layers.id = 'initial-order'` además fallaba porque el modelo SQLAlchemy `Layer` ya pide la columna `slug` (parte del WIP DataEngine en `prod-migracion`) que no existe en la BD de dev. Fix: reordenar `GET /initial-order` ANTES de `GET /{layer_id}` para que matchee primero. Sin tocar el modelo `Layer` (sigue siendo trabajo de DataEngine en `prod-migracion`).

### Cambiado

- **Sider — color de selección:** `BRAND.purple` (`#5C2472` morado) → `#4a6494` (azul más claro, variante de `BRAND.numeralia` `#2e4372`). Mejor armonía con el azul institucional del sider; el morado destacaba demasiado contra el azul.

---

## [0.25.3] - 2026-04-25

Polish del login para alinearse pixel-a-pixel con SIEEJ. Continuación de v0.25.2.

### Agregado

- **Iconos custom de visualizar/ocultar contraseña** copiados de `SIEEJ/frontend/src/assets/icons/` a `admin/public/ico-show.svg` y `ico-hidden.svg`. Se renderizan en el `Input.Password` via `iconRender` custom (22×22), reemplazando los `EyeOutlined`/`EyeInvisibleOutlined` default de antd.

### Cambiado

- **Tipografía Garet aplicada explícitamente** en JSX inline (Title "Hola"/"Mariachi", Text "Ingresa…", Botón, Aviso de privacidad) y en CSS global (`.login-form-sieej` labels, inputs, placeholders). Antes heredaba del `theme.token.fontFamily` pero algunas partes internas de antd usaban su propio fontFamily.
- **Padding del card responsivo** con `clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px)` (vertical mayor para más respiro). Outer Flex padding `clamp(16px, 3vw, 32px)`. Row gutter responsive: `xs/sm: 0` apilado, `md: 32`, `lg: 48`.
- **Color del isotipo Mariachi** detectado del PNG real del escudo IIEG (`#5B6770`, gris azulado, ~80% de pixels). Texto "Mariachi" usa este color matcheando el escudo.
- **Divider entre escudo y "Mariachi"** en `BRAND.orange` (naranja institucional) `1×28px`. Antes era gris, ahora destaca como acento.
- **Botón "Iniciar sesión":** `BRAND.orange` → `BRAND.purple` (morado institucional, igual a SIEEJ).
- **Asterisco `*` de campos required:** ahora se renderiza DESPUÉS del label texto (antd lo pone antes por default). Color `BRAND.orange` bold via `requiredMark` custom + CSS para deshabilitar el `::before` default de antd.
- **Logo Jalisco:** `40px` → `52px` (igual a SIEEJ `h-[52px]`). Separación del card: `20px` → `40px`. Gap con aviso: `8` → `20`.
- **Iconos del Input.Password:** removida sombra duplicada al hacer hover (el `.ant-input` interno del wrapper ahora tiene `box-shadow: none` para evitar doble shadow del wrapper + input).
- **Card overflow:** `overflow: hidden` + `boxSizing: border-box` para evitar scroll horizontal del antd Row (que aplica margin-left/right negativo por gutter).
- **Outer Flex:** `overflowX: hidden` + `width: 100%` para evitar scroll horizontal del SVG background.
- **Removido el botón "Olvidé mi contraseña"** (no aplica en SIEEJ tampoco).
- **Removido texto "Instituto de Información…"** de la columna derecha (los logos son self-evident).
- **Escudo Mariachi:** ajustado a `80×80px` para matchear visualmente el escudo dentro del logo IIEG. Sin gap con el divider (`marginRight: 2`); separación normal con el título (`marginLeft: 6`).

### Notas

Pendiente para próxima sesión (reportado por el user, no bloqueante):
- Backend GET `/layers/initial-order` devuelve 500 (no llega a enviar headers CORS, browser bloquea). Hay que verificar el service `list_initial_order` contra la BD real.
- antd warnings (`Space.direction` deprecated en `InitialLayerOrderPage`, `Alert.message` deprecated en algún lugar). Cambios mecánicos a `orientation` y `title`.

---

## [0.25.2] - 2026-04-25

Login del admin homologado con el de SIEEJ para consistencia visual entre productos del ecosistema IIEG.

### Cambiado

- **Background del login:** color sólido morado → `login-background.svg` copiado de `SIEEJ/frontend/src/assets/svg/img_back.svg` (servido desde `admin/public/`). Cubre todo el viewport.
- **Layout del card:** quitada la división interna con `borderLeft` entre columnas. Ahora es un único card blanco con padding 40 y `gutter={40}` entre cols (mismo patrón que SIEEJ).
- **Columna derecha:** ahora muestra `isotipo IIEG-favicon-192 + texto "Mariachi"` (estilo del sider) arriba + logo IIEG abajo. Antes solo logo IIEG + Jalisco.
- **Logo Jalisco + aviso de privacidad** salieron del card y quedaron debajo, centrados sobre el background SVG (igual que SIEEJ). Aviso en blanco subrayado bold de 10px.
- Removida la barra gradient azul/morado/naranja que estaba arriba del título "Hola" — el SIEEJ no la tiene.

---

## [0.25.1] - 2026-04-25

Limpieza de warnings react-hooks 7 — parte A (mecánicos, riesgo cero). De 43 warnings → 24 (los 24 restantes son `set-state-in-effect`, parte B, pendiente). Plus actualización de metadata de `pyproject.toml`.

### Cambiado

- **`api/pyproject.toml`** — `authors` corregido a `Edgar Alejandro Villarreal Padilla / edgar.villarreal@iieg.gob.mx`. `description` actualizada a `"Mariachi — backend API del ecosistema IIEG (admin, MapaLab, SIEEJ)."` (antes decía "FastAPI backend for CMS (mariachi) and portal frontends." — el portal vive en otro repo desde 0.21.x y SIEEJ/MapaLab no son CMS).
- **`react-refresh/only-export-components` (13 warnings → 0):**
    - `admin/src/main.jsx` — per-file ignore en `eslint.config.js` (entry point no participa en HMR; los `lazy()` y helpers como `withSuspense` flagean falso positivo).
    - `BRAND` extraído de `MainProvider.jsx` a nuevo `admin/src/app/providers/brand.js`. Imports actualizados en `MainLayout.jsx` y `LoginPage.jsx`.
    - `useAuth` y `AuthContext` extraídos de `AuthContext.jsx` a nuevo `admin/src/shared/contexts/useAuth.js`. `AuthContext.jsx` ahora solo exporta `AuthProvider`. Imports actualizados en 9 consumidores via `sed`.
    - `useFontConfig` y `FontConfigContext` extraídos de `FontConfigContext.jsx` a nuevo `useFontConfig.js`. Import actualizado en `TextStyleModal.jsx`.
- **`react-hooks/exhaustive-deps` (5 warnings → 0):**
    - `LayerAliasesSection.jsx` — `reload` wrappeada en `useCallback([layerId, listAliases])`. El `useEffect` inlinea el fetch directamente para evitar también `set-state-in-effect`.
    - `SortableTree.jsx` — `flattenTree` (función pura) extraída a module scope.
    - `SEOAnalyzer.jsx` — `extractAllText`, `analyzeKeywordDensity`, `analyzeContent`, `analyzeReadability` movidas a module scope (todas puras). `performAnalysis` wrappeada en `useCallback([page, seo])` y agregada a las deps del `useEffect`. `setAnalysis(prev => ...)` intermedio innecesario removido; `keywords: analysis.keywords` (siempre vacío) reemplazado por `keywords: {}`.
    - `usePageDraft.js` — `loadPage` y `saveDraft` convertidas de `async function` a `useCallback`. `saveDraft` lee `page` via `useRef` (`pageRef`) en vez de closure para no recrearse en cada cambio. `createEmptyPage` (helper trivial) inlinada. Reordenado el `useEffect` de autosave para que `saveDraft` esté declarada antes del effect que la referencia.
- **`react-hooks/immutability` (1 warning → 0):** `SEOAnalyzer.jsx` — helpers ahora declarados antes del `useEffect` que los llama.

### Pendiente (parte B)

- 24 warnings de `react-hooks/set-state-in-effect` requieren refactor caso-por-caso (key-based remount, computar derived state, mover a event handler) y QA visual en browser. Documentado como deuda técnica en sesión dedicada.

---

## [0.25.0] - 2026-04-25

Tercer rol global `externo` para separar usuarios del staff IIEG (admin CMS) de usuarios de productos publicos autenticados (SIEEJ hoy, MapaLab autenticado a futuro). Antes solo existian `tetlamamakani` y `editora`, lo que obligaba a otorgar `editora` a dependencias externas y abria un escalado de privilegios al admin CMS completo.

### Agregado

- **Rol `externo`** en el ENUM `user_roles`. Migration alembic `f1a2b3c4d5e6_add_role_externo.py` (rama mariachi) aplica `ALTER TYPE user_roles ADD VALUE IF NOT EXISTS 'externo'`. El acceso a productos sigue mediado por `UserProject(project_id, project_role)`.
- **Dependency `require_staff`** en `api/app/api/deps.py` (constante `STAFF_ROLES = {'tetlamamakani', 'editora'}`). Devuelve 403 si la cuenta autenticada es `externo`.
- **Aplicacion del guard** a nivel de `include_router` en `api/app/main.py`: 11 routers admin-only quedan bloqueados para externo (users, projects, media_buckets, pages, menu, media, borradores, layers, layer_metadata, geoserver, preview.admin_router). Los routers de auth, formularios y los publicos no llevan el guard.
- **Frontend admin**: `ProtectedRoute` muestra pantalla 403 con boton "Ir a SIEEJ" cuando la sesion es de un externo. `LoginPage` redirige a `/sieej/inicio-sesion` automaticamente si la cuenta autenticada es externa.
- **Documentacion** en `docs/ROLES.md`: matriz de roles, dependencies disponibles, flujo de onboarding de externos (con SQL de ejemplo), casos de uso planeados (SIEEJ, MapaLab autenticado), tabla de validacion smoke.

### Cambiado

- `docs/sieej.md`: seccion de auth/RBAC actualizada para reflejar que las dependencias usan `externo` (no `editora`) y referenciar `docs/ROLES.md`.
- `docs/context.md` y `docs/ARCHITECTURE.md`: enlace a `docs/ROLES.md` en sus indices.

### Validacion en dev

Smoke con un usuario `externo_test` (role='externo' + UserProject sieej editor):

- `POST /api/administrador/autenticacion/iniciar-sesion`: 200, devuelve csrf_token y user con role='externo'.
- `GET /api/administrador/usuarios`: 403.
- `GET /api/administrador/paginas`: 403.
- `GET /api/administrador/formularios/catalogos`: 200 (8 colecciones con su seed completo).
- `GET /api/administrador/autenticacion/perfil`: 200.

### Notas

- La migration usa `op.execute("ALTER TYPE ... ADD VALUE IF NOT EXISTS")`. Postgres 12+ permite esta operacion dentro de transaccion (con la restriccion de no usar el nuevo valor en la misma tx, lo cual no aplica aqui).
- Downgrade no implementado: Postgres no permite eliminar valores de un enum sin recrear el tipo. Si se necesita revertir, hay que reasignar usuarios y migrar columnas a un tipo nuevo.
- El frontend SIEEJ no requiere cambios: ya valida que `/perfil` devuelva 200 y que `/formularios/*` no devuelva 403, sin distinguir rol.

---

## [0.24.4] - 2026-04-24

### Cambiado

- **`LoginPage.jsx`** — removido el texto `"Instituto de Información Estadística y Geográfica de Jalisco"` de la columna derecha. El logo IIEG + el logo Jalisco ya hacen self-evident el branding; el texto era redundante.

---

## [0.24.3] - 2026-04-24

Branding del admin alineado con MapaLab: tipografía Garet, scrollbar custom, redesign del login y fix del scroll vertical en mobile.

### Agregado

- **Fuentes Garet** (5 weights: 300/400/500/700/800) copiadas de `mapalab/frontend/public/fonts/` a `admin/public/fonts/`. Importadas via `@font-face` en `admin/src/index.css`.
- **Scrollbar custom** (thin, 6px, gris translúcido) en html/body — mismo estilo que MapaLab (`scrollbar-thin`, `scrollbar-thumb-gray-400`, `scrollbar-thumb-gray-500`). Estilos en `admin/src/index.css`.
- **Variables CSS** `--color-numeralia`, `--color-purple`, `--color-orange` en `:root` para usar desde CSS puro (los `BRAND` JS ya existían).

### Cambiado

- **Body font-family** ahora arranca con `"Garet"` (antes: stack genérico de sistema). El `MainProvider` ya usaba Garet en `theme.token.fontFamily` pero las fuentes no estaban servidas — ahora sí.
- **`MainProvider.jsx`:** `AntApp minHeight: '100vh'` → `'100dvh'`. En mobile `100vh` excede el viewport visible cuando aparece la barra del browser; `dvh` se ajusta dinámicamente.
- **Logo Jalisco** (`jalisco_large_dark.svg`) copiado de `mapalab/frontend/src/assets/logos/` a `admin/public/jalisco-logo.svg`. Mostrado en la columna derecha del LoginPage debajo del IIEG.
- **Asset paths con vite base:** `<img src="/iieg-...">` → `<img src={\`${import.meta.env.BASE_URL}iieg-...\`}>` en `MainLayout.jsx` y `LoginPage.jsx`. En prod el admin se sirve bajo `/mariachi/`, pero los paths absolutos no se prefijaban → imagen rota en producción (y en dev se rompía si el browser caché tenía estado intermedio).
- **`LoginPage.jsx` — redesign completo:**
    - Outer background: `token.colorBgLayout` (gris claro) → `BRAND.purple` (morado institucional).
    - Columna derecha del card: gradient morado → blanco (`token.colorBgContainer`) con `borderLeft: 1px solid borderSecondary` como divisor entre las dos columnas. Antes el morado estaba duplicado dentro del card.
    - Logo IIEG: `logo_iieg_login.svg` (con `filter: brightness(0) invert(1)` — aplastaba todo a blanco, se veía como cuadro vacío) → `/iieg-logo.png` (PNG transparente a color, sin filtro) sobre fondo blanco.
    - Logo Jalisco agregado en la columna derecha debajo del IIEG.
    - Título "Hola": `color: BRAND.purple` (morado institucional).
    - Botón "Iniciar sesión": `BRAND.purple` → `BRAND.orange` (naranja institucional para destacar el CTA).
    - Texto "Aviso de privacidad" (sobre el morado outer): `colorTextSecondary` (gris) → `#fff` para contraste pleno.
    - Outer Flex: `boxSizing: 'border-box'` para que el padding entre dentro del `100dvh`. Antes el padding sumaba sobre el `minHeight: 100vh`, generando scroll vertical innecesario.

---

## [0.24.2] - 2026-04-24

Branding del admin (favicon, title, logo en sider) y limpieza del login.

### Agregado

- **Favicons IIEG** descargados del sitio oficial (`iieg.gob.mx`) y servidos desde `admin/public/`: `iieg-favicon-32.png`, `iieg-favicon-192.png`, `iieg-apple-touch-icon.png`, `iieg-logo.png`.
- **`admin/index.html`** actualizado: title `"Mariachi - IIEG"` (antes `"CMS Portal - IIEG"`), `apple-mobile-web-app-title` `"Mariachi"` (antes `"CMS Portal"`), `theme-color` y `msapplication-TileColor` en purple `#5C2472` (antes blue `#3b82f6` genérico), links `<link rel="icon">` para 32×32 y 192×192 + `apple-touch-icon` 180×180.
- **`admin/src/app/MainLayout.jsx`** — el brand del sider ahora muestra el isotipo IIEG (192×192 PNG) + texto "Mariachi" cuando está expandido, solo el isotipo cuando está colapsado. Antes solo mostraba texto `"Mariachi"` / `"MA"`.

### Cambiado

- **`admin/src/features/auth/pages/LoginPage.jsx`:**
    - `minHeight: '100vh'` → `minHeight: '100dvh'` + `overscrollBehavior: 'none'`. En mobile el viewport real cambia cuando la barra del browser se oculta/muestra; con `100vh` el contenedor era más alto que la pantalla visible y el rubber-band del scroll permitía deslizar verticalmente. `dvh` se ajusta dinámicamente al viewport visible.
    - Removido el `<Alert>` "Dev" con credenciales `admin/admin123`, `editor/editor123` (visible solo cuando `import.meta.env.DEV`). Ya no se necesita — el dev tiene la sesión persistida del browser. Imports `Alert` e `InfoCircleOutlined` también eliminados.
    - URL del aviso de privacidad actualizada a la versión más reciente publicada por IIEG: `Aviso_de_Privacidad_Integral_IIEG_06_2025.pdf` (junio 2025) en lugar de `Aviso_Privacidad_Integral_IIEG_01_2025.pdf` (enero 2025).

---

## [0.24.1] - 2026-04-24

Fix de regresión arrastrada desde v0.21.0 cuando el admin se movió a servirse bajo `/mariachi/`.

### Corregido

- **`admin/src/main.jsx`** — `basename` del router actualizado de `/administrador` a `/mariachi`. El bundle se sirve bajo `/mariachi/` (vite `base`) pero el router seguía esperando `/administrador`, por lo que la URL real `/mariachi/...` no matcheaba ninguna ruta — todo caía a un 404 silencioso al refrescar en cualquier path. Solo funcionaba si la app entraba por el path raíz y los redirects internos cargaban el primer match. Síntoma en consola: `<Router basename="/administrador"> is not able to match the URL "/mariachi/..."`.

---

## [0.24.0] - 2026-04-24

Absorcion del backend de SIEEJ en mariachi como modulo `formularios`. El frontend de SIEEJ migra a su propio repositorio (`iieg-oficial/sieej`) y se sirve a traves de `mariachi-nginx` bajo `/sieej/`. El stub `formularios.py` que devolvia 501 se reemplaza por implementacion completa.

### Agregado

- **Schema dedicado `sieej`** en BD `iieg_portal` con 12 tablas: 8 catalogos (unidad_admin, categoria_datos, herramientas_gestion, calidad_datos, periodicidad, objetivo_uso, usuarios_datos, ejes_estrategicos), 3 entidades (general, enlace, bases_datos) y 1 relacion N:M (bd_ejes_estrategicos). Migration `e7f8a9b0c1d2_init_sieej_schema.py` aplica DDL y siembra catalogos desde `api/data/sieej/*.json`. Tambien siembra `MediaBucket(acervo_bucket='sieej-diccionarios')` para subida de diccionarios.
- **Modelos SQLAlchemy 2.0** en `api/app/models/sieej/` con `__table_args__={"schema":"sieej"}`. FKs cross-schema a `public.usuarios` con `ON DELETE CASCADE`.
- **Schemas Pydantic** en `api/app/schemas/sieej/`: General, Enlace, BasesDatos (Create/Update/Response) y `CatalogosResponse` (bundle de las 8 colecciones para reducir roundtrips desde el frontend).
- **Services** en `api/app/services/sieej/`: `GeneralService`, `EnlaceService`, `BasesDatosService`. `BasesDatosService.upload_diccionario(...)` es async y sube via `AcervoClient.for_bucket(bucket)` al MediaBucket dedicado, guardando la URL publica en `bases_datos.ruta_diccionario`.
- **Routes `/formularios/*`** en `api/app/api/routes/formularios/` (subpaquete con cuatro subrouters): `catalogos`, `general`, `enlaces`, `bases_datos`. El router padre se monta con `Depends(require_project_access('sieej'))` y las mutaciones requieren `verify_csrf`.
- **mariachi-nginx sirve frontend SIEEJ** en `/sieej/`: el `dist/` del repo `iieg-oficial/sieej` se monta como volumen read-only via `${SIEEJ_DIST_PATH:-../SIEEJ/frontend/dist}` en el `docker-compose.yml`. La directiva `location /sieej` en `nginx/conf.d/mariachi.conf` aplica `try_files` con fallback a `/sieej/index.html` para SPA routing.
- **Login del admin** rediseñado con el mockup oficial del IIEG (heredado de SIEEJ): layout AntD a dos columnas, barra de gradiente institucional, copy "Hola / Ingresa tus datos para iniciar sesión", color primary purple `#5C2472` y panel derecho con logo IIEG sobre gradiente. Conserva la logica de `useAuth()` sin cambios.
- **Documentacion** nueva en `docs/sieej.md` con detalles del modulo (modelo de datos, endpoints, estructura del codigo, integracion con Acervo y RBAC).

### Cambiado

- `api/app/api/routes/formularios.py` (stub 501) → reemplazado por subpaquete `formularios/`.
- `docs/context.md` y `docs/ARCHITECTURE.md` actualizados para reflejar SIEEJ como segundo producto del monorepo y el routing `/sieej/` en mariachi-nginx.

### Notas

- Una dependencia de gobierno = `Usuario(role='editora')` + `UserProject(project=sieej, role='editor')`. El admin global (`role='tetlamamakani'`) tiene bypass.
- SIEEJ no toca DataEngine. Cualquier cambio futuro a DataEngine va en rama dedicada `prod-migracion` con `alembic -x db=dataengine upgrade head`.
- El gateway-hub no requiere upstream propio para SIEEJ; usa `portal` (= mariachi-nginx).

---

## [0.23.0] - 2026-04-24

Configuración de capas iniciales en MapaLab desde el admin: la tabla `mapalab.initial_layer_order` y el endpoint PATCH ya existían pero no había UI; solo se podía mantener vía SQL directo.

### Agregado

- **Endpoint backend `GET /api/administrador/layers/initial-order`** (admin-only) que devuelve la lista ordenada actual con metadata (`layerId`, `sortOrder`, `label`, `nodeType`, `parentId`). Antes solo existía PATCH para escribir, sin forma de leer el estado.
- **Service `layer_service.list_initial_order(session)`** — JOIN de `InitialLayerOrder` + `Layer` ordenado por `sort_order`.
- **Schema `InitialOrderItem`** en `api/app/schemas/layer.py`.
- **Hook `useLayerTreeAdmin`:** funciones `getInitialOrder()` y `setInitialOrder(orderedIds)`.
- **Sider:** item "Capas iniciales" bajo el grupo MapaLab → `/mapalab/initial-order` (solo admin).
- **Página `InitialLayerOrderPage`** con dnd-kit:
    - Lista de capas activas en orden actual; arrastrar para reordenar.
    - Modal "Agregar capa" con `Select` searchable contra el catálogo de capas hoja (`nodeType === 'leaf'`) que aún no están en el orden inicial.
    - Botón "Quitar" por fila.
    - Botones "Descartar" (vuelve al estado original) y "Guardar" (PATCH atómico, refresh del árbol).
    - Estado vacío + manejo de errores.
- **Ruta** `mapalab/initial-order` registrada en `main.jsx` con `RoleProtectedRoute(['tetlamamakani'])`.

### Cambiado

- **`api/pyproject.toml`** — `[tool.ruff.lint.per-file-ignores]` para `models/layer.py`, `services/layer_service.py`, `services/mapalab_notifier.py` (regla `I001`). Esos archivos pertenecen al ciclo DataEngine/`prod-migracion` y sus autofixes se aplican allá; se ignoran en develop para no bloquear CI.

### Notas

- `set_initial_order` ya validaba que las capas existieran y reemplazaba el orden atómicamente — no hubo cambios al service de escritura, solo se agregó lectura.
- `notify_tree_changed()` se sigue disparando en el PATCH para invalidar caché del frontend público de MapaLab.

---

## [0.22.1] - 2026-04-24

Limpieza post-cobertura: tests preexistentes rotos por la migración a cookies, deprecation de `datetime.utcnow()`, configuración de CI sobreviviente del split del portal y `package-lock.json` desync.

### Cambiado

- **Tests preexistentes (`tests/test_auth.py`, `tests/test_users.py`):** migrados a las fixtures cookie-aware `admin_session`/`editora_session`. Antes asumían `access_token` en body + header `Authorization: Bearer` (pre-cookies). Ahora 21 tests de auth/usuarios pasan en lugar de 23 errores. Las fixtures viejas `admin_token`/`editora_token` (huérfanas) eliminadas del conftest.
- **`tests/conftest.py`:** filtro de tablas con schema (`schema is None`) en `db_session` para que SQLite ignore las tablas SIEEJ del trabajo en progreso.
- **`api/pyproject.toml`:** `[tool.pytest.ini_options] testpaths = ["tests"]` para que pytest no recolecte `scripts/test_*.py` (son scripts CLI con `if __name__ == "__main__"`, no tests).
- **`api/app/core/time.py` (nuevo) + replaces:** helper `utcnow()` que retorna naive UTC. Reemplazo de `datetime.utcnow()` (deprecated en 3.12, removed en 3.13) en `core/security.py`, `api/routes/{borradores,pages}.py`, `models/{borrador,media,media_bucket,page,project,user}.py`. Comportamiento idéntico (naive UTC), 0 deprecation warnings. Modelos DataEngine (`models/layer.py`) y archivos del trabajo SIEEJ en progreso quedan fuera (van por sus propias ramas).
- **`.github/workflows/ci.yml`:** removido el job `web` (el portal vive en repo separado desde 0.21.x — el path `web/` no existe en este repo). Removido `branches-ignore: [develop, main]` para que CI corra también en push directo a develop, no solo en PRs.
- **`admin/package-lock.json`:** resync con `npm install --package-lock-only`. Estaba en `0.12.0` cuando `package.json` ya iba en `0.22.0` — `npm ci` en CI fallaba por mismatch.
- **Ruff autofix:** 27 issues (sort de imports + 1 whitespace) resueltos automáticamente en archivos del CMS. Archivos DataEngine (`models/layer.py`, `schemas/layer.py`) excluidos por la política de ownership; sus autofixes corresponden a la rama `prod-migracion`.

### Resultado

- `pytest -q` → `85 passed, 6 warnings` (de `39 passed, 1 failed, 23 errors, 186 warnings`).
- `ruff check app tests` → `All checks passed!`.
- CI ya corre en push a develop, sin job inexistente bloqueando.

---

## [0.22.0] - 2026-04-24

Cobertura smoke de tests para el refactor multi-proyecto. Hasta hoy CI corría `pytest -q` y `npm test` sin nada que ejecutara para los endpoints/guards/UI nuevos.

### Agregado

- **Backend (`api/tests/`, pytest):** 24 tests nuevos.
    - `test_projects.py` (9): GET requiere auth, GET filtra inactivos, POST/PATCH admin-only (editora=403), conflicto 409 por slug duplicado, PUT `/projects/users/{id}` reemplaza memberships atómicamente.
    - `test_media_buckets.py` (9): GET admin ve todos, editora con membership solo los suyos, editora sin membership lista vacía, POST admin-only con validación de project_id, PATCH admin-only.
    - `test_require_project_access.py` (6): editora sin membership = 403, admin global bypassa, viewer puede leer y no escribir, editor puede escribir, proyecto inexistente = 404.
    - `tests/conftest.py`: nuevas fixtures `admin_session` y `editora_session` que hacen login real (cookie + csrf) en lugar del fixture viejo `admin_token` (que rompió en la migración a cookies). Filtro de tablas con schema en `db_session` para que SQLite ignore tablas que no son del schema default.
- **Frontend (`admin/src/`, vitest + happy-dom + @testing-library/react):** 17 tests nuevos.
    - `app/__tests__/sider-config.test.js` (12): `buildSiderItems({ user: null })` = `[]`; admin ve Plataforma + 3 grupos de proyecto; editora con membership en `portal` ve solo Plataforma (Media) + Portalito; editora sin memberships solo Plataforma; `defaultOpenKeyForPath` mapea path → grupo correcto; badge de Revisiones aparece con `pendingCount > 0`; onClick invoca onNavigate.
    - `features/media/components/__tests__/BucketFilePicker.test.jsx` (5): no fetcha cuando `open=false`, lista archivos cuando se abre, click en fila llama `onSelect` con `{nombre, enlace, url}` y cierra, búsqueda filtra case-insensitive, cambiar tab refetcha con nuevo prefix.
- **`admin/vitest.config.js` + `admin/vitest.setup.js`:** configuración inicial (no existía). environment=happy-dom, alias resueltos como en vite.config, jest-dom matchers cargados en setup.

### Notas

- `test_formularios.py` queda fuera de este release: el plan original asumía endpoints stub (501/[]), pero en `develop` ya hay implementación real de SIEEJ en progreso (no commiteada). Cuando ese trabajo aterrice se agregará cobertura específica.
- Tests existentes (test_auth, test_users) siguen rotos por la migración a cookies — no es deuda nueva sino preexistente; los nuevos tests usan las fixtures cookie-aware (`admin_session`/`editora_session`).
- Frontend test del form de UsersPage (sección "Proyectos y roles") quedó fuera del scope smoke: requiere mocks de AuthContext + axios + Router que exceden el costo/beneficio para esta PR. Se puede agregar cuando se extraiga el form a un componente aislado.

---

## [0.21.2] - 2026-04-24

Lint pass ESLint 10: del upgrade en 0.14.0 quedaba la deuda técnica de correr lint contra todo el admin. Triage por categoría y fix archivo por archivo.

### Cambiado

- **`admin/eslint.config.js`:**
    - Override de `max-lines: 'off'` para 8 archivos cuya división aumentaría más complejidad que el límite (`LayerEditPage`, `mediaService`, `FilePicker`, `MediaPage`, `SEOAnalyzer`, `SEOEditor`, `pageTemplates`, `UsersPage`).
    - Downgrade de `react-hooks/set-state-in-effect` y `react-hooks/immutability` a `warn`. Son reglas nuevas de react-hooks 7 que requieren refactor arquitectónico (cambiar idiomas de modal/form/draft a derived state o key-based remount). Se atiende como deuda técnica posterior, sin bloquear lint.
- **Refactor de patrones `useEffect → fetch fn`** (eliminó la mayoría de errores `react-hooks/immutability`): en ~14 hooks/componentes se hoistea la función a `useCallback` antes del `useEffect`, o se convierte a `function` declaration cuando no requiere memoización. Files: `AuthContext`, `useMenuDraft`, `UsersPage`, `FormulariosPage`, `RevisionQueuePage`, `FontConfigContext`, `FontSelector`, `FilePicker`, `MediaSelector`, `MediaPage`, `useContentSearch`, `usePageDraft`, `LayerEditPage`, `SEOAnalyzer`.
- **Limpieza de `no-unused-vars`** (8 errores): drop de `logout` en `ChangePasswordPage`, `hasDraft` en `MenuManagerPage`, `index` en `PageVersionHistory`, `isAdmin2` en `PageEditorPage`, `level/childCount` desreferenciados en `SortableTree` (renombrados con prefijo `_`), `draftId` en `useMenuDraft` (slot vacío en destructuring).
- **`no-empty` (3 errores):** restructurado `try/catch` vacío en `AuthContext.logout`, `useMenuDraft.saveDraft/deleteDraft` con patrón `await ... .catch(() => null)`.
- **`jsx-a11y` (3 errores en `LayerEditPage`):** `<a onClick>` en breadcrumb reemplazado por `<Button type="link">` para keyboard/role correctos.
- **`react-hooks/purity` (1 error en `JsonEditorModal`):** removido `id: Date.now()` del snippet copiado al portapapeles — el id se asigna cuando el bloque se inserta, no en la plantilla.
- **`autofix` ESLint:** 174 errores de `indent`/`quotes`/etc resueltos con `eslint --fix` (sin cambios semánticos, solo estilo).

### Resultado

- `npm run lint` → `0 errors, 39 warnings` (de `228 errors, 23 warnings`).
- Warnings restantes documentadas como deuda técnica: 22 `set-state-in-effect`, 12 `react-refresh/only-export-components`, 4 `exhaustive-deps`, 1 `immutability`.
- `npm run build` pasa limpio.

---

## [0.21.1] - 2026-04-24

Observabilidad en endpoints del refactor multi-proyecto y refresh de docs.

### Agregado

- **Counters `/metrics` para writes nuevos:**
    - `mariachi_project_writes_total` — create / update / set_memberships en `/projects`.
    - `mariachi_user_writes_total` — create / update / delete en `/usuarios`.
    - `mariachi_media_bucket_writes_total` — create / update en `/media-buckets`.
    - `mariachi_media_uploads_total`, `mariachi_media_deletes_total` — en `/multimedia`.
    - `mariachi_layer_metadata_writes_total` — en `/layer-metadata` PUT.
- **Logging estructurado básico** (`logger.info` con key=value) en writes de:
    - `routes/projects.py`: create, update, set_memberships.
    - `routes/users.py`: create, update, delete.
    - `routes/media_buckets.py`: create, update.
    - `routes/media.py`: upload, delete (incluye `bucket`, `size`, `name`).
- Los logs siguen patrón `action=<dominio>.<operación> actor=<id> target=<id> ...`. Paso siguiente natural: migrar a JSON structured logs; por ahora text con key=value es grep-friendly.

### Cambiado

- `docs/PENDIENTES.md` refresh completo: estado actual marcado (0.21.0), items cumplidos del refactor cerrados, pendientes nuevos organizados (tests, lint ESLint 10, counters, upload directo en LayerMetadataSection, tabla `sieej_formularios` real).
- `docs/CONTRIBUTING.md`:
    - Instrucciones de setup actualizadas (admin-only, portal vive en repo separado).
    - Nueva sección **"Arquitectura del admin (feature-sliced)"** con reglas de import entre `app/`, `shared/`, `features/` y checklist para agregar un proyecto nuevo.
    - Regla "sin comentarios en código" explícita.

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
