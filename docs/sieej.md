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
- `repeater` — lista de objetos en `datos[step.id]`. Soporta `minItems`, `maxItems` y `tabs` (agrupa fields en pestañas dentro de cada item). Con `tabs`, **cada field pertenece a exactamente una pestaña**: `tab` es obligatorio y `definicion_validator` lo rechaza si falta. Antes un field sin `tab` se renderizaba repetido en todas las pestañas; la migración `a6b7c8d9e0f1` asigna la primera pestaña a los que no lo traían y el renderer hace el mismo fallback para snapshots historicos.
- `summary` — pantalla final de resumen; no captura datos. Soporta `pdfTemplate` y `exportPdf` (por ejemplo, el step `resumen` del seed `sieej-levantamiento` usa `pdfTemplate: "sieej-levantamiento"`).

Los steps `form` y `repeater` aceptan `incompleteNotice` opcional (`{title?, message}`): si el respondent avanza (o envía) con campos visibles sin llenar en ese step, el frontend muestra un modal de advertencia con ese mensaje **sin bloquear** la navegación ni el envío ("Revisar" / "Continuar de todos modos"). Pensado para steps 100% opcionales tipo checklist. Los campos `info` y los ocultos por `showWhen` no cuentan como incompletos; un `checkbox` sin marcar sí cuenta. Se edita desde el `StepDrawer` del CMS.

### Tipos de field
`text`, `textarea`, `number`, `date`, `date_range`, `select`, `select_multiple`, `radio`, `checkbox`, `file`, `info`.

Los antiguos tipos `email` y `tel` se absorbieron en `text` + `validation.pattern`: el constructor visual ofrece un catalogo de regex comunes (correo, telefono de 10 digitos, CURP, RFC, codigo postal, CLABE, etc.) o un patron personalizado. La migracion `a5b6c7d8e9f1` reescribe los `email`/`tel` existentes (definicion, `definicion_snapshot` y `formulario_version`) a `text` con su patron.

Atributos comunes: `name` (unico por step), `label`, `required`, `validation` (`minLength`, `maxLength`, `pattern`, `patternMessage`, `min`, `max`), `showWhen` (`{ field, equals }`; `equals` puede ser un valor o una lista de valores, y la condicion se cumple si el campo disparador coincide con cualquiera).

### Layout (`layout`)

El formulario se renderiza en un grid de **6 columnas**. `layout.colSpan` define el ancho: `1` = fila completa (6/6), `2` = mitad (3/6), `3` = un tercio (2/6).

Los campos se colocan **en orden estricto**: si uno no cabe en lo que resta de la fila, baja a la siguiente y deja el hueco. Antes el grid usaba `grid-flow-row-dense`, que rellenaba huecos con campos **definidos despues** — el orden visual dejaba de coincidir con el de la definicion (y con el orden del tab), volviendo el layout impredecible. Se retiro.

`layout.newRow: true` fuerza que el campo abra una fila nueva (se traduce a `col-start-1`; es no-op si el campo ya quedaba al inicio de fila, asi que no altera el espaciado). Sirve para dejar espacio libre al final de la fila anterior **sin** recurrir a campos `info` con label vacio como espaciadores — un workaround que ensuciaba `datos`, el export y el PDF.

- **`select`/`select_multiple`/`radio`/`checkbox`**: requieren `options` (`[{value, label}]`) o `catalog` (string que identifica un catalogo). No pueden mezclar ambos.
- **`file`**: requiere `bucket` (Acervo). Acepta `maxSizeMB` (cap absoluto 100 MB) y `accept` (lista de MIME/extensions). Al subir via `POST /formularios/{slug}/envio/upload` el backend persiste **dos** registros sincronizados: una fila en `sieej.envio_archivo` (con `bucket`, `object_key`, `url_publica`, `mime`, `size_bytes`, `field_path`) y una entrada en `envio.datos[step][field] = {url_publica, filename, mime, size_bytes}` que es lo que valida `datos_validator` al cierre del envio. El frontend NO debe sobrescribir manualmente la entrada en `datos` (la fuente de verdad la pone el endpoint de upload).
- **`date_range`**: rango de fechas. El valor en `datos` es `{start, end}` con fechas `YYYY-MM-DD`; `datos_validator` exige ambas fechas si alguna esta presente (incluso en borrador) y rechaza `start > end`. En exports/PDF/resumen se formatea `start – end`.
    - **Fechas abiertas** (`api 1.60.0+`): `openStart` / `openEnd` (bool, opt-in por campo) permiten que ese extremo sea una opcion de catalogo en vez de una fecha, para periodos sin termino conocido (`10/02/1992 – NO DETERMINADO`). `openCatalog` fija de que catalogo salen las opciones; si se omite se usa el del sistema `estatus_fecha`. El valor gana las claves hermanas `startOption` / `endOption`: un extremo lleva **fecha u opcion, nunca ambas**, y el orden `start <= end` solo se compara cuando los dos extremos son fechas. Los envios previos (sin las claves nuevas) siguen validando igual. Las opciones **no** se validan contra el catalogo en el backend, por la misma razon que `select`/`radio` con `catalog` tampoco lo hacen (`datos_validator` es puro y no toca la BD).
- **`info`**: campo informativo (HTML/markdown), no captura datos.

### Validacion
- `definicion_validator.py::validar_definicion` se ejecuta al crear/editar el formulario y rechaza con 422 si la estructura es invalida (ids duplicados, opciones malformadas, tipos desconocidos, etc.).
- `datos_validator.py::validar_datos` se ejecuta al guardar (`enviar=False`) o cerrar (`enviar=True`) un envio. En modo estricto exige campos `required`; en modo borrador solo valida tipos/formatos.
- `definicion_to_validation_rules` aplana la definicion a reglas planas que el frontend consume via `GET /formularios/:slug/schema` para feedback inline.

### Compatibilidad de definiciones legadas (`compat.py`)

Cada vez que el contrato se endurece, los formularios que ya viven en produccion quedan fuera de el: un `type: "email"`, un campo de repeater sin `tab` o un `info` espaciador bastan para que el formulario deje de validar, de rendererar o de poder guardarse desde el admin. `compat.py::normalizar_definicion` traduce cualquier definicion historica al contrato vigente. Es **idempotente** y **solo relaja** (nunca inventa campos ni endurece reglas).

Reglas actuales: `tel`/`email` → `text` + `validation.pattern` (respeta el patron propio si ya lo traia); tipo desconocido → `text`; `select`/`radio` sin `options` ni `catalog` → `text`; campos de repeater con `tabs` sin `tab` valido → primera pestaña; `info` sin label (espaciadores) → se elimina; `file` sin `bucket` → `sieej`; `maxSizeMB` sobre el cap → 100; `colSpan` fuera de rango → acotado a 1..3; `pattern` que no compila, `showWhen` huerfano o cruzado entre steps → se descartan; campo sin `label` → hereda el `name`.

Se aplica en tres capas, de modo que **un deploy no depende de que la migracion de datos haya corrido**:

1. **Lectura** — `FormularioResponse`, `FormularioDetalle`, `EnvioDetalleResponse`, `MisEnviosDetalle` y `GET /formularios/:slug/schema` normalizan al serializar; el editor visual y el renderer nunca ven un tipo que no conocen.
2. **Escritura** — `formularios_admin_service.crear/actualizar` normaliza antes de validar (un formulario legado se puede abrir y guardar sin editarlo a mano) y `validar_datos` normaliza el snapshot, para que un envio en curso no muera con `tipo desconocido`. El clasificador de cambios compara **normalizada contra normalizada**: la diferencia por normalizar no cuenta como cambio y no sube version ni congela envios.
3. **Persistencia** — la migracion `c3d4e5f6a7b9` aplica la normalizacion a `sieej.formulario`, `sieej.envio_formulario.definicion_snapshot` y `sieej.formulario_version`. Sustituye el patron de escribir una migracion de datos por cada endurecimiento (`a5b6c7d8e9f1`, `a6b7c8d9e0f1`, `b8c9d0e1f2a4`): las reglas viven en `compat.py` y la migracion solo las materializa.

**Al endurecer el validador**: agrega la regla equivalente en `compat.py` y una definicion real en `api/tests/fixtures/sieej/legacy/`. `tests/test_sieej_compat.py` valida cada fixture contra el contrato vigente, asi que un endurecimiento que rompa formularios existentes falla en CI y no en produccion.

**Verificacion en el deploy** (`scripts/sieej_check_definiciones.py`, tambien `make sieej-check`): recorre las tres tablas y sale con codigo 1 si alguna definicion no valida. Con `--fix` reescribe las que lo requieran — util para una BD restaurada de un backup viejo, sin volver a correr alembic.

```bash
docker exec mariachi-api python scripts/sieej_check_definiciones.py
# {"tabla": "sieej.formulario", "revisadas": 5, "requieren_normalizar": 0, "reparadas": 0, "irrecuperables": []}
# {"ok": true, "pendientes": 0}
```

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
- Los paths permitidos se derivan del `definicion_snapshot` del envio: de ahi
  salen tipo, opciones y bucket, porque contra el se valida lo que el
  respondent lleno. Cualquier path que no este permitido se rechaza con 422 —
  el backend no confia en el frontend.
- **La marca `editableAfterSubmit` la manda la definicion vigente** (`api
  1.89.0+`), no el snapshot: es una politica del admin, no contrato de datos.
  Activarla despues alcanza a los envios ya enviados — que son justo los que se
  quieren corregir — y retirarla los deja de cubrir de inmediato. Antes, marcar
  un campo despues del envio no servia de nada: los envios `enviado` no reciben
  propagacion de cambios menores, asi que su snapshot nunca ganaba la marca. Un
  campo que no exista en el snapshot no es editable aunque la vigente lo marque.
  `GET /formularios/mis-envios/{id}` sirve el snapshot con esas marcas ya
  sincronizadas (`snapshot_con_editables_vigentes`), para que el frontend
  ofrezca exactamente lo que el backend autoriza.
- **Cualquier tipo de campo** puede marcarse (`api 1.88.0+`), incluidos los de
  pasos `repeater` y los `file`. En un repeater el path lleva el indice del item
  (`bases_datos[0].diccionario`) y `editable_field_defs` guarda el path **base**;
  `resolver_editable` exige que la forma coincida: un campo de repeater sin
  indice se rechaza, y uno de un paso `form` con indice tambien. El item debe
  existir: la actualizacion ligera corrige respuestas, no da de alta items.
- Los campos `file` **no** se editan por este endpoint (su valor lo escribe la
  subida a Acervo, no el cliente): mandarlos aqui responde 422 indicando usar
  `actualizar-archivo`. Antes quedaban fuera por completo, y el toggle del CMS
  prometia algo que ningun endpoint cumplia (el de upload responde 409 en un
  envio ya `enviado`).
- El merge sobre `datos` es **parcial** (no reemplaza el resto de respuestas), con
  `flag_modified`. Se identifica el envio por `envio_id` (no por
  formulario+usuario) para no ambiguar en formularios periodicos.
- 409 si el envio no esta `enviado` (p. ej. un admin lo reabrio) o si el
  formulario ya no acepta cambios; 403 si el envio no es del usuario.

`POST /formularios/mis-envios/{envio_id}/actualizar-archivo` (multipart:
`field_path`, `file`) es la contraparte para los campos `file`: sube el archivo
nuevo a Acervo, reescribe `datos[step][field]` y deja la **misma huella de
auditoria** que el PUT (fila en el historial con el nombre del archivo anterior
y el nuevo, mas un evento `actualizado`). El archivo previo no se borra: su fila
en `sieej.envio_archivo` conserva `object_key` y `url_publica`, asi que el
historial de versiones del archivo queda completo. Mismas validaciones del
campo que en el alta (`accept`, `maxSizeMB`, bucket).

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

**Descubrimiento desde el frontend** (`api 1.87.0+`): `GET /formularios` incluye
`tiene_campos_editables` por item — `true` solo si el envio esta `enviado` y su
`definicion_snapshot` tiene campos marcados (mismo `editable_field_paths` que
autoriza el `PUT`). El listado no manda la definicion, asi que sin este flag el
respondent solo encontraba la pantalla de actualizacion entrando al detalle. Con
el, SIEEJ pinta el acceso a `/mis-envios/:id/actualizar` en tres lugares: la
tarjeta de la lista (a la izquierda del icono de PDF), el paso Resumen (a la
izquierda de "Descargar PDF") y el encabezado del detalle del envio.

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

## Apertura periodica

Un formulario puede abrir una **ventana de captura recurrente** en vez de tener una vigencia unica. Se configura en `sieej.formulario.periodicidad` (JSONB; `NULL` = formulario no periodico, comportamiento historico):

```jsonc
{
  "frecuencia": "mensual" | "trimestral" | "semestral" | "anual",
  "dia_inicio": 1,        // dia del primer mes del periodo en que abre (1..28)
  "duracion_dias": 7,     // largo de la ventana
  "ancla": "2026-01-01"   // opcional: no se abren ventanas antes de esta fecha
}
```

`validar_periodicidad` (`services/sieej/periodos_service.py`) rechaza frecuencias desconocidas, `dia_inicio` fuera de 1..28 (evita el problema de los meses cortos) y ventanas que no caben dentro del periodo.

### Ventanas materializadas y un envio por periodo

Cada ventana concreta es una fila de `sieej.formulario_periodo`: `clave` (`2026-03`, `2026-T2`, `2026-S1`, `2026`), `apertura`, `cierre`, `estado` (`programado|abierto|cerrado`) y los sellos `notificado_apertura_en` / `notificado_faltantes_en`.

`sieej.envio_formulario` gana `periodo_id`, y la constraint `UNIQUE (formulario_id, usuario_id)` se reemplaza por **dos indices unicos parciales** (migracion `f9a0b1c2d3e4`):

- `WHERE periodo_id IS NOT NULL` -> `UNIQUE (formulario_id, usuario_id, periodo_id)`: un envio por usuario **y periodo**.
- `WHERE periodo_id IS NULL` -> `UNIQUE (formulario_id, usuario_id)`: preserva el invariante de los formularios no periodicos.

Asi conviven los dos modelos sin migrar datos: los envios existentes quedan con `periodo_id = NULL`.

### Que decide si esta abierto

La ventana abierta **se computa de la config** (`ventana_abierta(periodicidad, ahora)`), no del `estado` de la fila: el gating funciona aunque el tick no haya corrido todavia (importante en dev, que no levanta el sidecar). `EnviosService._formulario_acepta_cambios` delega ahi cuando el formulario es periodico, y `get_o_iniciar` resuelve el periodo abierto (creando la fila si falta) para buscar o crear el envio **de ese periodo**. Sin ventana abierta las escrituras responden 409.

La expiracion de un envio periodico se ancla al `cierre` de **su** periodo, no a `formulario.vigencia_fin`.

En el listado del respondent los formularios periodicos siguen visibles con la ventana cerrada (para poder mostrar la proxima apertura); la vigencia solo filtra a los no periodicos.

### Tick

`PeriodosService.tick()` es el motor, y es **idempotente**: materializa el periodo vigente y el siguiente, abre los que entraron en ventana (disparando el aviso de apertura una sola vez) y cierra los vencidos (marca `cerrado`, expira los envios `en_proceso` de ese periodo y dispara el aviso de faltantes una sola vez). Los sellos `notificado_*_en` son la guarda anti-duplicado.

```sh
docker exec mariachi-api python scripts/sieej_periodos_tick.py
# {"formularios": 3, "aperturas_notificadas": 1, "cierres_notificados": 0, "envios_expirados": 0}
```

El sidecar `cron-sieej` lo invoca en cada iteracion del loop (antes del expire), con el mismo `CRON_SIEEJ_EXPIRE_INTERVAL`. `POST /sieej/periodos/tick` (admin, CSRF) lo dispara a mano: es la via de prueba en dev, donde el sidecar no corre.

### Avisos

Al abrir la ventana se avisa al **creador** del formulario; los respondents se enteran in-app (el formulario aparece abierto en su lista, con la fecha de cierre). Al cerrar se avisa de los **faltantes** solo al creador y a los administradores. Faltantes = asignados (por grupo + individuales) menos quienes enviaron en ese periodo; los envios que expiraron cuentan como faltantes.

Cada aviso queda en `sieej.notificacion` (`tipo` `apertura|faltantes`, `resumen`, `payload` con ventana/conteos/lista de faltantes, `destinatarios`) y se publica **best-effort** en el webhook de Discord de SIEEJ (`discord_webhook_sieej`): un fallo de red se loggea y no tumba el tick. No hay correo — el stack no tiene SMTP.

| Verbo | Path | |
|---|---|---|
| GET | `/sieej/formularios/{id}/periodos` | Ventanas del formulario |
| GET | `/sieej/formularios/{id}/notificaciones` | Bitacora de avisos |
| GET | `/sieej/formularios/{id}/notificaciones/exportar` | Descarga la bitacora (`?formato=csv\|xlsx`) |
| POST | `/sieej/periodos/tick` | Corre el tick (idempotente) |

En el CMS la periodicidad se configura en la pestaña **Configuracion** del formulario, y la pestaña **Periodos** (solo visible si es periodico) lista las ventanas, la bitacora de avisos y el boton de exportar.

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

### Edicion concurrente

Dos personas editando el mismo formulario no se pisan, y se ven entre si.

**Bloqueo optimista (la garantia).** `FormularioUpdate` acepta
`actualizado_en_esperado`: el `actualizado_en` que tenia el formulario cuando se
abrio el editor. Si otra persona guardo despues, el `PUT` responde **409** con
quien guardo y cuando, en vez de sobreescribir. Se compara con una tolerancia de
un segundo para no dar falsos positivos con clientes que truncan el ISO a
milisegundos. Sin el campo el `PUT` se comporta como antes (compatibilidad).

Esto importa mas de lo que parece: el guardado de la definicion corre el
clasificador de cambios, asi que pisar una edicion con una definicion vieja no
solo pierde texto — puede clasificarse como cambio que **rompe**, subir la
version y **reabrir envios ya enviados** de las dependencias.

`sieej.formulario.actualizado_por_id` (migracion `b7c8d9e0f1a3`) guarda quien
escribio por ultima vez; `FormularioResponse` lo expone como `actualizado_por`.

**Presencia (el aviso).** Reusa `services/presence.py` (Redis, TTL 30 s) con
scope `sieej_formulario`, extendido con `avatar_url` y `seccion`:

| Verbo | Path | |
|---|---|---|
| PUT | `/sieej/formularios/{id}/presencia` | Heartbeat; body `{seccion}` (la pestaña abierta) |
| DELETE | `/sieej/formularios/{id}/presencia` | Salir al desmontar el editor |
| GET | `/sieej/formularios/{id}/presencia` | Quien mas esta en ese formulario |
| GET | `/sieej/formularios/presencia` | Presencia de **todos** los formularios en un solo scan, para el listado |

`GET /sieej/formularios/presencia` se declara **antes** que
`/sieej/formularios/{id_or_slug}` en el router: si no, la ruta con parametro se
come el literal.

En el admin, `usePresenciaFormulario(id, seccion)` late cada 20 s (pausa con
`document.hidden`) y `PresenciaEditores` pinta un `Avatar.Group` con tooltip
`nombre · en Seccion`. Al desmontar el editor manda el `DELETE`; al **cerrar la
pestaña** (donde el cleanup de React ya no corre) lo manda en `pagehide` con
`fetch(..., {keepalive:true})` — `sendBeacon` no sirve porque el endpoint exige
el header CSRF. Si aun asi no llega, el TTL de 30 s limpia la presencia. En el editor la etiqueta se pone naranja cuando alguien
esta en **tu misma** pestaña; en el listado cada tarjeta muestra los avatares de
quien la tiene abierta. La presencia es un aviso, no un candado: quien garantiza
es el 409.

`presence.list_others`/`list_by_resource`/`unregister` degradan a vacio/no-op si
Redis no responde (mismo criterio best-effort que `core/cache.py`), para que la
caida del cache no tumbe el editor con un 500 por un adorno. Un editor tardio
sigue protegido por el 409, que no depende de Redis.

### Copiar y pegar campos

Cada campo del editor tiene **Copiar** (para pegarlo en otro paso o en otro formulario) y **Duplicar aqui**, de modo que un campo con regex, catalogo, opciones o configuracion de archivo ya afinada no se vuelva a capturar a mano.

En los anchos **Chico** y **Mediano** (`colSpan` 3 y 2) la tarjeta no da para cuatro botones en la columna del asa, asi que Copiar, Duplicar y Eliminar se colapsan en un menu **⋯ Mas opciones** y solo queda visible Editar (y Guardar mientras se edita). En ancho **Grande** y en mobile los botones siguen sueltos. Dentro del menu, Eliminar confirma con `Modal.confirm` en vez del `Popconfirm` (un popover anidado en un dropdown se cierra con el menu). El portapapeles vive en `localStorage` (`mariachi.sieej.fieldClipboard`, payload `{kind:'sieej.fields', v:1, fields:[...]}`) para que cruce formularios y pestañas del navegador sin permisos; ademas se escribe best-effort al portapapeles del sistema como JSON legible. No hay backend involucrado.

`fieldClipboard.js` normaliza al pegar (`prepareFieldForPaste`), que es lo que evita dejar la definicion invalida:

| Riesgo | Regla |
|---|---|
| `name` ya existe en el paso | sufijo `_2`, `_3`… y aviso con el nombre final (el backend rechaza duplicados) |
| `tab` de otro paso | se fuerza a la pestaña activa; sin pestañas se elimina |
| `showWhen` cuyo disparador no viajo | se quita la condicion y se avisa (si no, el campo nunca se mostraria) |
| `catalog` inexistente | se avisa, sin bloquear (las claves de catalogo son globales) |
| `bucket` no accesible | cae a `sieej` y se avisa |

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
