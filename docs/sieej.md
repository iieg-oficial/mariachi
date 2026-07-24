# Modulo SIEEJ en mariachi/api

El backend de SIEEJ (Sistema de Informacion Estadistica del Estado de Jalisco) vive como modulo dentro de `mariachi/api`. Este documento describe el modelo de datos, las rutas expuestas y como se integra el frontend (otro repo: `iieg-oficial/sieej`).

> **Cambio de arquitectura — abril 2026.** El wizard SIEEJ original con tablas estaticas (`general`, `enlace`, `bases_datos`, `bd_ejes_estrategicos`) fue reemplazado por una **plataforma de formularios dinamicos**: un schema con definicion en JSONB que permite al admin crear cualquier wizard sin migraciones de codigo. Las tablas legacy se eliminaron en la migracion `c6d7e8f9ab01_drop_wizard_sieej_tables` y fueron sustituidas por `formulario` + `envio_*` en `a4b5c6d7e8f9_add_sieej_formularios_dinamicos`. El levantamiento original quedo seedeado como un formulario mas (`b5c6d7e8f9aa_seed_sieej_levantamiento`).

## Que es

SIEEJ es la plataforma de captura para que dependencias e instituciones de gobierno entreguen al IIEG informacion estructurada. La plataforma:

- Define formularios multi-paso (`steps` de tipo `form`, `repeater` o `summary`) con campos tipados (text, number, date, select, file, etc.).
- Asigna formularios a usuarios o a grupos de usuarios (visibilidad).
- Captura los envios contra un snapshot inmutable de la definicion vigente al iniciar el envio.
- Audita el ciclo de vida del envio (eventos: iniciado, guardado, enviado, expirado, reabierto).
- Soporta uploads de archivos a buckets Acervo (MinIO) por field.

El backend antes vivia en un repositorio aparte como FastAPI/SQLModel. En 2026-04-24 se absorbio en mariachi para reusar la auth (cookie HttpOnly + CSRF), el cliente Acervo, el RBAC multi-proyecto y el ciclo Alembic. El frontend respondent (React + Vite + Tailwind) sigue en su propio repo y se sirve via `mariachi-nginx` bajo la ruta `/sieej/`.

## Modelo de datos

Schema dedicado `sieej` en la BD `mariachi`. Tablas vigentes:

| Tabla | Tipo | Descripcion |
|---|---|---|
| `sieej.formulario` | entidad | Definicion JSONB del formulario. Slug unico, estado `borrador`/`activo`/`cerrado`, `version` (se bumpea si la definicion cambia y ya hay envios), vigencias opcionales. |
| `sieej.grupo` | entidad | Grupo de usuarios. Permite asignar un formulario a N usuarios sin listarlos uno a uno. |
| `sieej.usuario_grupo` | N:M | `usuarios.id` ↔ `sieej.grupo.id` (CASCADE). |
| `sieej.formulario_grupo` | N:M | `sieej.formulario.id` ↔ `sieej.grupo.id` (CASCADE). |
| `sieej.formulario_usuario` | N:M | `sieej.formulario.id` ↔ `usuarios.id` (CASCADE). Asignacion individual. |
| `sieej.envio_formulario` | entidad | Un envio por usuario × formulario (UNIQUE). Estado `en_proceso`/`enviado`/`expirado`. Campos: `formulario_version`, `definicion_snapshot` (JSONB), `datos` (JSONB), `paso_actual`. |
| `sieej.envio_archivo` | entidad | Archivos subidos en campos `file` del envio. Guarda `bucket`, `object_key`, `url_publica`, `mime`, `size_bytes`. |
| `sieej.envio_evento` | entidad | Auditoria del envio. Tipos: `iniciado`, `guardado`, `enviado`, `expirado`, `reabierto`. |
| `sieej.catalogo` | catalogo | Un registro por catalogo global: `clave` UNIQUE (lo que referencia `field.catalog`) + `label`. CRUD completo desde el admin. |
| `sieej.catalogo_opcion` | catalogo | Opciones `{catalogo_id, value}`. UNIQUE por catalogo; CASCADE al borrar el catalogo. |

Los catalogos originales (unidades_admin, categoria_datos, herramientas_gestion, calidad_datos, periodicidad, objetivo_uso, usuarios_datos, ejes_estrategicos) se sembraron desde `api/data/sieej/*.json` en la migracion `e7f8a9b0c1d2_init_sieej_schema` con una tabla fisica por catalogo; la migracion `d4e5f6a7b8c9_generic_sieej_catalogos` los consolido en el par generico `catalogo` + `catalogo_opcion` (conservando claves y opciones) y elimino las 8 tablas `catalogo_*`. El proyecto `Project(slug='sieej')` se crea en `c0d1e2f3a4b5_add_projects_user_projects_media_buckets` y la misma migracion `e7f8a9b0c1d2` siembra el `AcervoBucket(acervo_bucket='sieej-diccionarios')`.

Todas las tablas referencian `public.usuarios.id` con `ON DELETE CASCADE` (excepto `formulario.creado_por_id` que es RESTRICT). Los catalogos siguen disponibles porque la definicion JSONB puede referenciarlos por nombre (`field.catalog: "unidades_admin"`).

### Catalogos del sistema

`app/services/sieej/catalogos_sistema.py` lista los catalogos que el producto necesita para funcionar. Hoy solo `estatus_fecha` («Estatus de fecha»), sembrado por la migracion `b7c8d9e0f1a2` con NO DETERMINADO, EN PROCESO, VIGENTE, SIN FECHA DE TÉRMINO y PENDIENTE; alimenta las [fechas abiertas](#tipos-de-field) de los campos `date_range`.

No hay columna en BD que los marque: **la fuente de verdad es ese modulo**, para que no exista un estado que pueda desincronizarse del codigo que depende de ellos. `delete_catalog` responde 409 si la clave esta listada ahi; renombrar el `label` y editar sus opciones sigue permitido con las reglas normales (renombrar propaga a los envios, borrar una opcion en uso da 409). `CatalogoResumen` expone `sistema: bool` para que el admin lo distinga con un tag y deshabilite el boton de eliminar.

La migracion del seed es **idempotente**: si la clave ya existe no la duplica ni toca sus opciones, para no revertir ediciones hechas desde el admin.

## Definicion JSONB

Cada `formulario.definicion` es un objeto con esta forma minima:

```json
{
  "version": 1,
  "steps": [
    {
      "id": "general",
      "type": "form",
      "title": "Datos generales",
      "fields": [
        { "name": "razon_social", "label": "Razon social", "type": "text", "required": true }
      ]
    }
  ]
}
```

### Tipos de step
- `form` — un solo objeto en `datos[step.id]`.
- `repeater` — lista de objetos en `datos[step.id]`. Soporta `minItems`, `maxItems` y `tabs` (agrupa fields en pestañas dentro de cada item).
- `summary` — pantalla final de resumen; no captura datos. Soporta `pdfTemplate` y `exportPdf` (por ejemplo, el step `resumen` del seed `sieej-levantamiento` usa `pdfTemplate: "sieej-levantamiento"`).

Los steps `form` y `repeater` aceptan `incompleteNotice` opcional (`{title?, message}`): si el respondent avanza (o envía) con campos visibles sin llenar en ese step, el frontend muestra un modal de advertencia con ese mensaje **sin bloquear** la navegación ni el envío ("Revisar" / "Continuar de todos modos"). Pensado para steps 100% opcionales tipo checklist. Los campos `info` y los ocultos por `showWhen` no cuentan como incompletos; un `checkbox` sin marcar sí cuenta. Se edita desde el `StepDrawer` del CMS.

### Tipos de field
`text`, `textarea`, `number`, `email`, `tel`, `date`, `date_range`, `select`, `select_multiple`, `radio`, `checkbox`, `file`, `info`.

Atributos comunes: `name` (unico por step), `label`, `required`, `validation` (`minLength`, `maxLength`, `pattern`, `min`, `max`), `showWhen` (`{ field, equals }`; `equals` puede ser un valor o una lista de valores, y la condicion se cumple si el campo disparador coincide con cualquiera).

- **`select`/`select_multiple`/`radio`/`checkbox`**: requieren `options` (`[{value, label}]`) o `catalog` (string que identifica un catalogo). No pueden mezclar ambos.
- **`file`**: requiere `bucket` (Acervo). Acepta `maxSizeMB` (cap absoluto 100 MB) y `accept` (lista de MIME/extensions). Al subir via `POST /formularios/{slug}/envio/upload` el backend persiste **dos** registros sincronizados: una fila en `sieej.envio_archivo` (con `bucket`, `object_key`, `url_publica`, `mime`, `size_bytes`, `field_path`) y una entrada en `envio.datos[step][field] = {url_publica, filename, mime, size_bytes}` que es lo que valida `datos_validator` al cierre del envio. El frontend NO debe sobrescribir manualmente la entrada en `datos` (la fuente de verdad la pone el endpoint de upload).
- **`date_range`**: rango de fechas. El valor en `datos` es `{start, end}` con fechas `YYYY-MM-DD`; `datos_validator` exige ambas fechas si alguna esta presente (incluso en borrador) y rechaza `start > end`. En exports/PDF/resumen se formatea `start – end`.
    - **Fechas abiertas** (`api 1.60.0+`): `openStart` / `openEnd` (bool, opt-in por campo) permiten que ese extremo sea una opcion de catalogo en vez de una fecha, para periodos sin termino conocido (`10/02/1992 – NO DETERMINADO`). `openCatalog` fija de que catalogo salen las opciones; si se omite se usa el del sistema `estatus_fecha`. El valor gana las claves hermanas `startOption` / `endOption`: un extremo lleva **fecha u opcion, nunca ambas**, y el orden `start <= end` solo se compara cuando los dos extremos son fechas. Los envios previos (sin las claves nuevas) siguen validando igual. Las opciones **no** se validan contra el catalogo en el backend, por la misma razon que `select`/`radio` con `catalog` tampoco lo hacen (`datos_validator` es puro y no toca la BD).
- **`info`**: campo informativo (HTML/markdown), no captura datos.

### Validacion
- `definicion_validator.py::validar_definicion` se ejecuta al crear/editar el formulario y rechaza con 422 si la estructura es invalida (ids duplicados, opciones malformadas, tipos desconocidos, etc.).
- `datos_validator.py::validar_datos` se ejecuta al guardar (`enviar=False`) o cerrar (`enviar=True`) un envio. En modo estricto exige campos `required`; en modo borrador solo valida tipos/formatos.
- `definicion_to_validation_rules` aplana la definicion a reglas planas que el frontend consume via `GET /formularios/:slug/schema` para feedback inline.

### Slugs reservados
`formularios_admin_service.crear()` rechaza con 400 si el slug colisiona con rutas literales del frontend SIEEJ:
`inicio-sesion`, `exencion`, `cambiar-contrasena`, `error`, `regisño`, `catalogos`, `schema`, `envio`, `mis-envios`.

### Versionado

El backend clasifica cada cambio de definicion en **`menor`** o **`rompe`** comparando la definicion anterior con la nueva (`cambio_classifier.py`):

- **Cambio `menor`**: se propaga automaticamente a todos los envios `en_proceso` al dia, reescribiendo su `definicion_snapshot` y `formulario_version`. No incrementa `formulario.version` (romperia la comparacion con envios ya enviados que comparten el mismo numero de version). Ejemplos: cambiar label/tooltip/layout/orden, agregar campo opcional, agregar opciones, aflojar validacion.
- **Cambio `rompe`**: incrementa `formulario.version` y **congela** a los envios `en_proceso` que ya empezaron (siguen con su snapshot anterior). El respondent ve un banner "El formulario se actualizo" con el diff de cambios y un boton **Actualizar** que migra su envio a la version vigente conservando `datos`. Tras actualizar, los campos nuevos/eliminados/modificados aparecen con distintivos en el sider (badge naranja), el paso (chip "Actualizado") y el campo (badge "Nuevo"/"Cambio"), que se limpian al visitar/editar cada campo y todos al enviar. Ademas, los envios ya **`enviado`** de una version anterior se **reabren** automaticamente a `en_proceso` (`reabrir_enviados_por_cambio()`, evento `reabierto`): dejan de ser un registro final y el respondent debe reenviar sobre la definicion vigente, conservando `datos` y con los mismos distintivos de cambio. `UltimoCambioInfo.reabiertos` reporta cuantos se reabrieron para el aviso al admin en el editor.

> La reapertura automatica masiva (por cambio `rompe`) reescribe el snapshot a la version vigente. Es distinta de la reapertura **manual** individual que un admin dispara desde la tabla de envios (`POST .../envios/{id}/reabrir`), que conserva la version con la que se lleno.

**Columna `cambios_pendientes`** (`sieej.envio_formulario`, JSONB): almacena el diff entre el snapshot anterior y la definicion vigente que el usuario ya acepto. El frontend lo consume como `cambios_aplicados` para los distintivos; manda `cambios_vistos` al guardar para que el backend descarte los marcadores ya visitados.

**Migracion**: `a0b1c2d3e4f5_add_cambios_pendientes_envio_sieej.py` agrega la columna `cambios_pendientes` JSONB a `sieej.envio_formulario`. En staging/prod correr `alembic -x db=mariachi upgrade head` al desplegar.

El nuevo modelo reemplaza el versionado anterior donde cada edicion de definicion incrementaba `formulario.version` ciegamente y los envios existentes mantenian su snapshot original sin posibilidad de actualizarse.

## Endpoints

Todo cuelga de `admin_prefix` (`/api/mariachi` por default; `/api/administrador` sigue vivo por compat durante la transición). Las mutaciones requieren `verify_csrf` (cabecera `X-CSRF-Token`). Cookie JWT siempre obligatoria.

### Admin (`/sieej/*`) — gestion de formularios, grupos y catalogos

Router: `app/api/routes/sieej_admin/*`. Protegido por `staff_dep` (cualquier usuario autenticado en el monorepo). El admin global (`role='tetlamamakani'`) tiene acceso completo.

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/sieej/stats` | Conteos: dependencias en sieej, formularios activos, envios por estado, archivos. Consumido por el dashboard de SIEEJ. |
| GET | `/sieej/formularios` | Lista (filtro opcional `estado`, `slug`). |
| POST | `/sieej/formularios` | Crear formulario (estado inicial `borrador`). |
| GET | `/sieej/formularios/{id_or_slug}` | Detalle. Acepta id numerico o slug. Incluye `grupos` y `usuarios_asignados` con `selectinload`. |
| PUT | `/sieej/formularios/{id}` | Editar. Bumpea `version` si cambia `definicion` y hay envios. |
| POST | `/sieej/formularios/{id}/publicar` | `borrador` → `activo`. |
| POST | `/sieej/formularios/{id}/cerrar` | `activo` → `cerrado`. |
| DELETE | `/sieej/formularios/{id}` | Si no tiene envios, borra; si tiene, lo cierra (preserva historico). |
| PUT | `/sieej/formularios/{id}/asignaciones` | Reemplaza grupos y usuarios asignados. |
| GET | `/sieej/formularios/{id}/envios` | Lista paginada de envios (filtro opcional `estado`). Cada item incluye `usuario_nombre` y `usuario_email` resueltos en lote. |
| GET | `/sieej/formularios/{id}/envios/{envio_id}` | Detalle de un envio. |
| POST | `/sieej/formularios/{id}/envios/{envio_id}/reabrir` | Devuelve un envio `enviado` o `expirado` al estado `en_proceso` para que el respondent pueda corregir y volver a enviar. Registra evento `reabierto` con `actor_usuario_id`. Falla con 409 si el formulario esta `cerrado` o fuera de vigencia, o si el envio no esta en estado reabrible. |
| GET | `/sieej/grupos` | Lista grupos. |
| POST | `/sieej/grupos` | Crear grupo. Acepta `usuarios: int[]` para asignar miembros al crearlo atómicamente. Si algún ID no existe, falla con 400. |
| GET | `/sieej/grupos/{id}` | Detalle. |
| PUT | `/sieej/grupos/{id}` | Editar nombre/descripcion. |
| DELETE | `/sieej/grupos/{id}` | 400 si tiene formularios asignados. |
| GET | `/sieej/grupos/{id}/usuarios` | Miembros. |
| PUT | `/sieej/grupos/{id}/usuarios` | Reemplaza miembros. |
| GET | `/sieej/catalogos` | Lista catalogos (mas recientes primero) con total de opciones y campos enlazados por formulario. |
| POST | `/sieej/catalogos` | Crear catalogo (`label`; `clave` opcional, se deriva del label). |
| PUT | `/sieej/catalogos/{clave}` | Renombrar el `label` (la `clave` es inmutable: la referencian las definiciones JSONB). |
| DELETE | `/sieej/catalogos/{clave}` | 409 si algun campo lo referencia o alguna opcion esta en uso por envios. |
| GET | `/sieej/catalogos/{clave}` | Opciones del catalogo con conteo `en_uso`. |
| POST | `/sieej/catalogos/{clave}` | Agregar opcion. |
| PUT | `/sieej/catalogos/{clave}/{item_id}` | Renombrar opcion; propaga el nuevo valor a los envios que la usan. |
| DELETE | `/sieej/catalogos/{clave}/{item_id}` | 409 si la opcion esta en uso por algun envio. |

### Respondent (`/formularios/*`) — captura

Router: `app/api/routes/formularios/*`. Protegido por `Depends(require_project_access('sieej'))`. El admin global tiene bypass del check de proyecto.

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/formularios/catalogos` | Bundle dinamico `{clave: [{id, value}]}` con todos los catalogos. Reduce roundtrips desde el wizard. |
| GET | `/formularios/` | Lista de formularios visibles (activos + dentro de vigencia + asignados al user o a un grupo del user). |
| GET | `/formularios/{slug}` | Definicion (snapshot si ya hay envio) + envio actual. |
| GET | `/formularios/{slug}/schema` | Definicion + reglas de validacion planas para feedback inline. |
| GET | `/formularios/{slug}/envio` | Lee o inicia el envio del usuario actual. |
| PUT | `/formularios/{slug}/envio` | Guarda (borrador) o cierra (`enviar=true`) el envio. Valida contra `definicion_snapshot`. Acepta `cambios_vistos` para limpiar marcadores de cambios. |
| POST | `/formularios/{slug}/envio/actualizar-version` | Actualiza el envio `en_proceso` a la definicion vigente del formulario. Conserva `datos` y persiste el diff en `cambios_pendientes`. |
| POST | `/formularios/{slug}/envio/upload` | Sube un archivo al bucket configurado en el field `file`. Guarda `EnvioArchivo`. |
| GET | `/formularios/mis-envios/{envio_id}` | Detalle del envio del usuario: `definicion_snapshot` + `datos` + `archivos[]` + `eventos[]`. 404 si no existe; 403 si pertenece a otro usuario. **No expone `actor_usuario_id`** en eventos para no filtrar identidad de admins que reabran/expiren. Se llega desde la lista de formularios (estado `enviado`). El listado `GET /mis-envios` se elimino en 1.47+ (la pantalla "Mis envios" del frontend era redundante con "Mis formularios"). |
| DELETE | `/formularios/mis-envios/{envio_id}` | Soft-delete del envio para el respondent (`eliminado_en` queda poblado). El envio sigue en la BD para que el admin lo vea con flag. El respondent ya no puede pedir el detalle. Idempotente: re-DELETE devuelve 404. |

### Visibilidad y RBAC del envio

`FormulariosDinamicosService.listar_visibles` y `get_by_slug_visible` filtran:

1. `formulario.estado == 'activo'`
2. `vigencia_inicio <= now <= vigencia_fin` (ambas opcionales)
3. user es admin global, **o** asignado individualmente, **o** miembro de un grupo asignado

Un envio se crea **lazy** la primera vez que el respondent guarda o consulta el formulario. Al iniciar se congela `formulario_version` y `definicion_snapshot`. Cambios futuros del formulario no afectan envios existentes.

### Workflow de estados del envio

| Estado | Quien lo establece | Quien puede salir y como |
|---|---|---|
| `en_proceso` | Sistema, al iniciar lazy | Respondent: pasar a `enviado` con `PUT /envio` y `enviar=true`. Sistema: pasar a `expirado` cuando vencimiento pasa (ver "Auto-expiracion" mas abajo). |
| `enviado` | Respondent al cerrar | Admin: pasar a `en_proceso` con `POST /envios/{id}/reabrir` (registra evento `reabierto`). |
| `expirado` | Sistema (auto-expiracion) o admin | Admin: pasar a `en_proceso` con `POST /envios/{id}/reabrir` (mismas reglas). |

### Reglas de escritura del respondent

`PUT /formularios/{slug}/envio` y `POST /envio/upload` rechazan con **409** si:

- `formulario.estado != 'activo'` (esta `borrador` o `cerrado`).
- `formulario.vigencia_inicio > now` (no ha empezado).
- `formulario.vigencia_fin < now` (ya cerro vigencia).
- `envio.estado in {enviado, expirado}` (use reapertura admin si necesita corregir).

La regla central vive en `EnviosService._formulario_acepta_cambios`. Esto evita el caso historico en el que un envio en `en_proceso` quedaba editable indefinidamente despues de que el formulario se cerrara o pasara la vigencia.

### Reapertura (admin)

`POST /sieej/formularios/{id}/envios/{envio_id}/reabrir` devuelve un envio `enviado` o `expirado` a `en_proceso`:

- Solo lo ejecuta staff (`tetlamamakani` o `editora`); el rol `externo` no tiene acceso al router admin.
- Falla 409 si el formulario esta cerrado o fuera de vigencia (no se puede reabrir hacia un formulario que ya no acepta cambios).
- `definicion_snapshot` y `formulario_version` se conservan: la reapertura NO migra al envio a la version vigente del formulario; el respondent corrige sobre el snapshot original.
- Limpia `enviado_en` y `expirado_en`.
- Registra evento `reabierto` con `actor_usuario_id`. El detalle publico (`/formularios/mis-envios/{id}`) NO expone el actor para no filtrar identidad de admins.

### Actualizacion ligera de campos (post-envio)

Alternativa a la reapertura para correcciones puntuales: un field puede marcarse
`editableAfterSubmit: true` en la definicion (toggle en el CMS) y entonces el
respondent lo corrige sobre un envio ya `enviado` **sin reabrirlo**.

`PUT /formularios/mis-envios/{envio_id}/actualizar-campos` con
`{"campos": {"step_id.field_name": valor, ...}}`:

- El envio **no cambia de estado** (sigue `enviado`); no se toca `enviado_en` ni
  `cambios_pendientes`.
- Los paths permitidos se derivan del `definicion_snapshot` del envio (no de la
  definicion vigente), asi que la editabilidad es la que tenia al enviarse.
  Cualquier path que no este marcado se rechaza con 422 — el backend no confia
  en el frontend.
- Solo campos de pasos `form`. Repeaters (path por indice) y `file` quedan fuera
  en esta version; los archivos se siguen editando por el endpoint de upload.
- El merge sobre `datos` es **parcial** (no reemplaza el resto de respuestas), con
  `flag_modified`. Se identifica el envio por `envio_id` (no por
  formulario+usuario) para no ambiguar en formularios periodicos.
- 409 si el envio no esta `enviado` (p. ej. un admin lo reabrio) o si el
  formulario ya no acepta cambios; 403 si el envio no es del usuario.

Cada campo cuyo valor cambie inserta una fila **append-only** en
`sieej.envio_valor_historial` (`field_path`, `field_label`, `valor_anterior`,
`valor_nuevo`, `formulario_version`, `actor_usuario_id`, `cambiado_en`), y se
registra un evento `actualizado` con un resumen (`{campos, n}`) en el payload.
Los cambios sin diferencia real (no-op) no generan historial ni evento.

Lectura del historial: `GET /formularios/mis-envios/{envio_id}/historial`
(respondent, sin actor) y `GET /sieej/formularios/{id}/envios/{envio_id}/historial`
(admin, con actor). El export de envios (`?formato=xlsx|csv`) incluye una tabla
**"Historial de cambios"** — hoja propia en Excel, CSV extra dentro del ZIP — que
es la base del reporte de auditoria.

### Auto-expiracion (lazy)

`EnviosService._expirar_si_corresponde` corre cada vez que un endpoint toca un envio especifico (detalle de respondent, listado de respondent, etc.) y transiciona `en_proceso` -> `expirado` si `formulario.vigencia_fin < now`. Es idempotente: si ya esta `expirado` no hace nada. Registra evento `expirado` con `actor_usuario_id=NULL` (sistema).

Adicionalmente, `POST /sieej/expirar-envios-pendientes` (admin) hace bulk-expire de todos los envios `en_proceso` cuyos formularios pasaron vigencia. Pensado para ejecucion programada (cron externo) o intervencion manual del admin si se detecta un backlog de envios huerfanos. Devuelve `{"expirados": <numero_afectado>}`.

Como no hay scheduler interno corriendo, un envio puede vivir en `en_proceso` despues de pasar vigencia hasta que el respondent o un admin lo consulten. Las escrituras nuevas tardias se rechazan igualmente a nivel de endpoint.

Para correrlo programaticamente sin pasar por el endpoint admin, hay un script CLI que ejecuta el mismo `expirar_pendientes_bulk`:

```sh
docker exec mariachi-api python scripts/expire_sieej_envios.py
# {"expirados": 12}
```

Crontab tipica (cada hora en punto desde el host):

```cron
0 * * * * docker exec mariachi-api python scripts/expire_sieej_envios.py >> /var/log/sieej-expire.log 2>&1
```

El script no requiere credenciales (corre en proceso del API con acceso DB) y es idempotente.

### Servicio sidecar `cron-sieej` (auto-expiracion sin crontab del host)

`docker-compose.yml` define el servicio `cron-sieej` que reusa la imagen de `api` y corre un loop bash con sleep configurable:

```yaml
cron-sieej:
  command: |
    while true; do
      python scripts/expire_sieej_envios.py || true
      sleep ${CRON_SIEEJ_EXPIRE_INTERVAL:-3600}
    done
```

Default: 3600s (cada hora). Para correr mas seguido en staging, setea `CRON_SIEEJ_EXPIRE_INTERVAL=300` en `.env.staging`. Los logs van a `docker logs mariachi-cron-sieej`. Restart policy `unless-stopped`, no requiere cron del host.

## Estructura del codigo

```
api/
├── alembic/versions/mariachi/
│   ├── e7f8a9b0c1d2_init_sieej_schema.py            # Schema + catalogos + seeds
│   ├── a4b5c6d7e8f9_add_sieej_formularios_dinamicos.py  # formulario + grupo + envio_*
│   ├── b5c6d7e8f9aa_seed_sieej_levantamiento.py     # Seedea el wizard original como formulario
│   ├── c6d7e8f9ab01_drop_wizard_sieej_tables.py     # Quita las tablas legacy
│   └── d7e8f9a0b1c2_sieej_levantamiento_pdf_template.py  # pdfTemplate en step resumen
├── data/sieej/
│   └── *.json                                       # Catalogos seed (8 archivos)
└── app/
    ├── api/routes/
    │   ├── sieej_admin/                             # Gestion (admin)
    │   │   ├── __init__.py
    │   │   ├── catalogos.py                         # CRUD catalogos + opciones
    │   │   ├── formularios.py                       # CRUD + publicar/cerrar/asignaciones/envios
    │   │   ├── grupos.py                            # CRUD grupos + miembros
    │   │   └── stats.py                             # GET /sieej/stats
    │   └── formularios/                             # Captura (respondent)
    │       ├── __init__.py                          # Router con require_project_access('sieej')
    │       ├── catalogos.py                         # GET bundle
    │       └── dinamicos.py                         # Lista, detalle, schema, envio, upload
    ├── models/sieej/
    │   ├── __init__.py
    │   ├── catalogos.py                             # Catalogo + CatalogoOpcion (genericos)
    │   ├── formulario.py                            # Formulario
    │   ├── grupo.py                                 # Grupo + tablas N:M
    │   └── envio.py                                 # EnvioFormulario, EnvioArchivo, EnvioEvento
    ├── schemas/sieej/
    │   ├── catalogos.py
    │   ├── formulario.py                            # FormularioCreate/Update/Response/Detalle/ListItem
    │   ├── grupo.py                                 # GrupoCreate/Update/Response + Asignaciones/Miembros
    │   └── envio.py                                 # EnvioResponse/Update/Upload + Archivo + Evento
    └── services/sieej/
        ├── formularios_admin_service.py             # CRUD admin + asignaciones + listado envios
        ├── grupos_service.py                        # CRUD grupos + miembros
        ├── formularios_dinamicos_service.py         # Visibilidad respondent
        ├── envios_service.py                        # Get/iniciar envio, actualizar, upload
        ├── definicion_validator.py                  # Estructura JSONB + flatten a rules
        └── datos_validator.py                       # Datos contra snapshot (estricto/borrador)
```

## Frontend admin (mariachi-admin)

`admin/src/features/sieej-formularios/` expone el editor de formularios. Rutas registradas en `admin/src/main.jsx`:

| Ruta | Componente | Funcion |
|---|---|---|
| `/sieej/formularios` | `FormulariosListPage` | Lista + crear formulario + acciones (publicar/cerrar/eliminar). Cada card incluye accesos directos a Editar, Envíos y Asignaciones. |
| `/sieej/formularios/:id` | `FormularioEditorPage` | Tabs: Definicion, Configuracion, Asignaciones, Envios. |
| `/sieej/grupos` | `GruposPage` | CRUD de grupos + drawer "Miembros". |

Los items aparecen en el sider bajo el grupo "SIEEJ" del `PROJECT_REGISTRY` (`admin/src/app/sider-config.jsx`). La gestion de **dependencias** (crear usuarios `role='externo'` con asignacion a `sieej:editor`) vive en `/users` — no es parte del project registry de SIEEJ porque `usuarios` es una entidad global del CMS.

El editor visual de la definicion JSONB esta en `components/visualEditor/` (StepsList + FieldsList + drawers). Los pasos se muestran en **tabs** con drag & drop en las pestañas (dnd-kit), labels en dos lineas con tags mini de tipo y aviso, botones icono en mobile. Los tipos de paso y campo estan en `constants/definitionTypes.js` (compartidos con los drawers, labels en español).

La pestaña de Envios del editor permite expandir cada envio para ver sus respuestas organizadas en pestañas (una por step del formulario) sin necesidad de descargar el PDF. El detalle expandido muestra el usuario, las fechas de Iniciado, Enviado y Actualizado como metadatos en una sola fila.

La seleccion de miembros en `GruposPage` y `AsignacionesEditor` usa `MemberPicker` — un `Transfer` de AntD con busqueda por `username`, `name` y `email`, que reemplaza los `Select mode="multiple"` anteriores que no escalaban con muchos usuarios. En mobile el `Transfer` se reemplaza por un `Select mode="multiple"` para mejor usabilidad táctil. Las asignaciones se guardan automaticamente al seleccionar/deseleccionar grupos o mover usuarios, sin botón de guardado explícito.

## Frontend respondent (`iieg-oficial/sieej`)

El frontend SIEEJ vive en `github.com/iieg-oficial/sieej` (privado, branch default `develop`). Se construye con `make build` (Vite) y produce un `dist/` con `VITE_BASE_PATH=/sieej/`. Ese `dist/` se monta read-only en `mariachi-nginx`:

```yaml
# mariachi/docker-compose.yml
nginx:
  volumes:
    - ${SIEEJ_DIST_PATH:-../SIEEJ/frontend/dist}:/usr/share/nginx/html/sieej:ro
```

Y se sirve con:

```nginx
# mariachi/nginx/conf.d/mariachi.conf
location /sieej {
    alias /usr/share/nginx/html/sieej;
    try_files $uri $uri/ /sieej/index.html;
}
```

El gateway-hub enruta `/sieej/` al upstream `portal` (= `mariachi-nginx:80`). No requiere upstream propio.

El frontend consume `/api/administrador/formularios/*` con `withCredentials: true`. Guarda el `csrf_token` (devuelto por `/autenticacion/iniciar-sesion`) en `sessionStorage` y lo inyecta en las cabeceras de las mutaciones. Los identificadores se normalizan a lowercase en el login (ver `0.40.7`).

## Acervo

Los archivos subidos por respondents van al bucket configurado en el field `file` de la definicion (por convencion `sieej-diccionarios`, creado por la migracion). El servicio `envios_service.upload_archivo(...)` usa `AcervoClient.for_bucket(bucket)` (cliente cacheado por bucket) y persiste un `EnvioArchivo` con `url_publica`, `bucket`, `object_key`, `filename_original`, `mime`, `size_bytes`. El nombre del objeto sigue el patron `envio<envio_id>/<uuid>.<ext>`.

Las credenciales del bucket se resuelven con `ACERVO_<REF>_ACCESS_KEY`/`ACERVO_<REF>_SECRET_KEY` (REF coincide con `acervo_buckets.access_key_ref`). Si faltan, `services/acervo.py::resolve_bucket_credentials` lanza `RuntimeError` explicito (desde 0.30.29 ya no hay fallback a creds root del cluster — principio de menor privilegio). Generar/rotar editando `acervo/config/identities.json` y haciendo `cd ../acervo && docker compose restart acervo-seaweedfs` (desde acervo 1.22.0; antes era `./scripts/init-buckets.sh --rotate sieej-diccionarios`).

## Auth y RBAC

Una dependencia de gobierno = `Usuario(role='externo')` + `UserProject(project=sieej, role='editor')`. La cuenta se crea desde la pagina de **Usuarios** del CMS (`/users`) con rol `externo` y asignacion al proyecto `sieej`; el reset de contraseña genera la temporal que se comparte con la dependencia.

El admin global (`role='tetlamamakani'`) tiene acceso sin necesidad de membership por proyecto. El rol `externo` (introducido en 0.25.0) reemplaza el uso historico de `editora` para usuarios fuera del staff IIEG. Las cuentas con `role='externo'` reciben 403 al intentar acceder a routers admin-only del CMS. Detalle completo de la matriz de roles en [docs/ROLES.md](ROLES.md).

El flujo del wizard se basa en `user_id`: cada `EnvioFormulario` referencia al usuario que lo abrio. Un usuario solo ve y edita sus propios envios (filtros aplicados en services).

## DataEngine

SIEEJ no toca DataEngine. Las tablas viven en `mariachi`, no en la BD externa con PostGIS. Cualquier cambio futuro que toque DataEngine va en rama dedicada `prod-migracion` y se aplica con `alembic -x db=dataengine upgrade head`.
