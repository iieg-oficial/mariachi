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

Schema dedicado `sieej` en la BD `iieg_portal`. Tablas vigentes:

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
| `sieej.catalogo_unidad_admin` | catalogo | Unidades administrativas del estado (~85 valores). |
| `sieej.catalogo_categoria_datos` | catalogo | Publicos, Internos, Personales, Sensibles, Confidenciales, Reservados. |
| `sieej.catalogo_herramientas_gestion` | catalogo | ERP, CRM, Excel, Otro. |
| `sieej.catalogo_calidad_datos` | catalogo | Verificacion manual, Herramientas automaticas, Ambas. |
| `sieej.catalogo_periodicidad` | catalogo | Diario, Semanal, Mensual, Anual, Indeterminado, Otro. |
| `sieej.catalogo_objetivo_uso` | catalogo | Toma de decisiones, Politicas publicas, Informes, Otro. |
| `sieej.catalogo_usuarios_datos` | catalogo | Generados internamente, Proveedores externos, Ambos. |
| `sieej.catalogo_ejes_estrategicos` | catalogo | Ejes del Plan Estatal (Salud, Empleo, Innovacion, etc.). |

Los catalogos se siembran desde `api/data/sieej/*.json` en la migracion `e7f8a9b0c1d2_init_sieej_schema`. El proyecto `Project(slug='sieej')` se crea en `c0d1e2f3a4b5_add_projects_user_projects_media_buckets` y la misma migracion `e7f8a9b0c1d2` siembra el `MediaBucket(acervo_bucket='sieej-diccionarios')`.

Todas las tablas referencian `public.usuarios.id` con `ON DELETE CASCADE` (excepto `formulario.creado_por_id` que es RESTRICT). Los catalogos siguen disponibles porque la definicion JSONB puede referenciarlos por nombre (`field.catalog: "unidades_admin"`).

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

### Tipos de field
`text`, `textarea`, `number`, `email`, `tel`, `date`, `select`, `select_multiple`, `radio`, `checkbox`, `file`, `info`.

Atributos comunes: `name` (unico por step), `label`, `required`, `validation` (`minLength`, `maxLength`, `pattern`, `min`, `max`), `showWhen` (`{ field, equals }`).

- **`select`/`select_multiple`/`radio`/`checkbox`**: requieren `options` (`[{value, label}]`) o `catalog` (string que identifica un catalogo). No pueden mezclar ambos.
- **`file`**: requiere `bucket` (Acervo). Acepta `maxSizeMB` (cap absoluto 100 MB) y `accept` (lista de MIME/extensions).
- **`info`**: campo informativo (HTML/markdown), no captura datos.

### Validacion
- `definicion_validator.py::validar_definicion` se ejecuta al crear/editar el formulario y rechaza con 422 si la estructura es invalida (ids duplicados, opciones malformadas, tipos desconocidos, etc.).
- `datos_validator.py::validar_datos` se ejecuta al guardar (`enviar=False`) o cerrar (`enviar=True`) un envio. En modo estricto exige campos `required`; en modo borrador solo valida tipos/formatos.
- `definicion_to_validation_rules` aplana la definicion a reglas planas que el frontend consume via `GET /formularios/:slug/schema` para feedback inline.

### Slugs reservados
`formularios_admin_service.crear()` rechaza con 400 si el slug colisiona con rutas literales del frontend SIEEJ:
`inicio-sesion`, `exencion`, `cambiar-contrasena`, `error`, `regisño`, `catalogos`, `schema`, `envio`, `mis-envios`.

### Versionado
Si una edicion cambia `definicion` y el formulario ya tiene envios, `formulario.version` se incrementa. Los envios existentes mantienen su `formulario_version` y `definicion_snapshot` originales — los cambios solo afectan envios futuros.

## Endpoints

Todo cuelga de `admin_prefix` (`/api/administrador` por default). Las mutaciones requieren `verify_csrf` (cabecera `X-CSRF-Token`). Cookie JWT siempre obligatoria.

### Admin (`/sieej/*`) — gestion de formularios y grupos

Router: `app/api/routes/sieej_admin/*`. Protegido por `staff_dep` (cualquier usuario autenticado en el monorepo). El admin global (`role='tetlamamakani'`) tiene acceso completo.

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/sieej/stats` | Conteos: dependencias en sieej, formularios activos, envios por estado, archivos. Consumido por el dashboard de SIEEJ. |
| GET | `/sieej/formularios` | Lista (filtro opcional `estado`, `slug`). |
| POST | `/sieej/formularios` | Crear formulario (estado inicial `borrador`). |
| GET | `/sieej/formularios/{id}` | Detalle. |
| PUT | `/sieej/formularios/{id}` | Editar. Bumpea `version` si cambia `definicion` y hay envios. |
| POST | `/sieej/formularios/{id}/publicar` | `borrador` → `activo`. |
| POST | `/sieej/formularios/{id}/cerrar` | `activo` → `cerrado`. |
| DELETE | `/sieej/formularios/{id}` | Si no tiene envios, borra; si tiene, lo cierra (preserva historico). |
| PUT | `/sieej/formularios/{id}/asignaciones` | Reemplaza grupos y usuarios asignados. |
| GET | `/sieej/formularios/{id}/envios` | Lista paginada de envios (filtro opcional `estado`). |
| GET | `/sieej/formularios/{id}/envios/{envio_id}` | Detalle de un envio. |
| GET | `/sieej/grupos` | Lista grupos. |
| POST | `/sieej/grupos` | Crear grupo. |
| GET | `/sieej/grupos/{id}` | Detalle. |
| PUT | `/sieej/grupos/{id}` | Editar nombre/descripcion. |
| DELETE | `/sieej/grupos/{id}` | 400 si tiene formularios asignados. |
| GET | `/sieej/grupos/{id}/usuarios` | Miembros. |
| PUT | `/sieej/grupos/{id}/usuarios` | Reemplaza miembros. |

### Respondent (`/formularios/*`) — captura

Router: `app/api/routes/formularios/*`. Protegido por `Depends(require_project_access('sieej'))`. El admin global tiene bypass del check de proyecto.

| Metodo | Ruta | Funcion |
|---|---|---|
| GET | `/formularios/catalogos` | Bundle con las ocho colecciones de catalogos. Reduce roundtrips desde el wizard. |
| GET | `/formularios/` | Lista de formularios visibles (activos + dentro de vigencia + asignados al user o a un grupo del user). |
| GET | `/formularios/{slug}` | Definicion (snapshot si ya hay envio) + envio actual. |
| GET | `/formularios/{slug}/schema` | Definicion + reglas de validacion planas para feedback inline. |
| GET | `/formularios/{slug}/envio` | Lee o inicia el envio del usuario actual. |
| PUT | `/formularios/{slug}/envio` | Guarda (borrador) o cierra (`enviar=true`) el envio. Valida contra `definicion_snapshot`. |
| POST | `/formularios/{slug}/envio/upload` | Sube un archivo al bucket configurado en el field `file`. Guarda `EnvioArchivo`. |
| GET | `/formularios/mis-envios` | Listado paginado del **historial del usuario** (filtros `estado`, `q`, `page`, `page_size`, `sort`). Filtra siempre por `usuario_id` de la sesion (no acepta override). Sort soportado: `-actualizado_en` (default), `-enviado_en` (NULLS LAST portable), `nombre`. |
| GET | `/formularios/mis-envios/{envio_id}` | Detalle del envio del usuario: `definicion_snapshot` + `datos` + `archivos[]` + `eventos[]`. 404 si no existe; 403 si pertenece a otro usuario. **No expone `actor_usuario_id`** en eventos para no filtrar identidad de admins que reabran/expiren. |

### Visibilidad y RBAC del envio

`FormulariosDinamicosService.listar_visibles` y `get_by_slug_visible` filtran:

1. `formulario.estado == 'activo'`
2. `vigencia_inicio <= now <= vigencia_fin` (ambas opcionales)
3. user es admin global, **o** asignado individualmente, **o** miembro de un grupo asignado

Un envio se crea **lazy** la primera vez que el respondent guarda o consulta el formulario. Al iniciar se congela `formulario_version` y `definicion_snapshot`. Cambios futuros del formulario no afectan envios existentes.

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
    │   │   ├── formularios.py                       # CRUD + publicar/cerrar/asignaciones/envios
    │   │   ├── grupos.py                            # CRUD grupos + miembros
    │   │   └── stats.py                             # GET /sieej/stats
    │   └── formularios/                             # Captura (respondent)
    │       ├── __init__.py                          # Router con require_project_access('sieej')
    │       ├── catalogos.py                         # GET bundle
    │       └── dinamicos.py                         # Lista, detalle, schema, envio, upload
    ├── models/sieej/
    │   ├── __init__.py
    │   ├── catalogos.py                             # 8 catalogos
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
| `/sieej/formularios` | `FormulariosListPage` | Lista + crear formulario + acciones (publicar/cerrar/eliminar). |
| `/sieej/formularios/:id` | `FormularioEditorPage` | Tabs: Definicion, Configuracion, Asignaciones, Envios. |
| `/sieej/grupos` | `GruposPage` | CRUD de grupos + drawer "Miembros". |

Los items aparecen en el sider bajo el grupo "SIEEJ" del `PROJECT_REGISTRY` (`admin/src/app/sider-config.jsx`). La gestion de **dependencias** (crear usuarios `role='externo'` con asignacion a `sieej:editor`) vive en `/users` — no es parte del project registry de SIEEJ porque `usuarios` es una entidad global del CMS.

El editor visual de la definicion JSONB esta en `components/visualEditor/` (StepsList + FieldsList + drawers).

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

Las credenciales del bucket se resuelven con `ACERVO_<REF>_ACCESS_KEY`/`ACERVO_<REF>_SECRET_KEY` (REF coincide con `media_buckets.access_key_ref`). Si faltan, `services/acervo.py::resolve_bucket_credentials` lanza `RuntimeError` explicito (desde 0.30.29 ya no hay fallback a creds root del cluster — principio de menor privilegio). Generar/rotar con `cd ../acervo && ./scripts/init-buckets.sh --rotate sieej-diccionarios`.

## Auth y RBAC

Una dependencia de gobierno = `Usuario(role='externo')` + `UserProject(project=sieej, role='editor')`. La cuenta se crea desde la pagina de **Usuarios** del CMS (`/users`) con rol `externo` y asignacion al proyecto `sieej`; el reset de contraseña genera la temporal que se comparte con la dependencia.

El admin global (`role='tetlamamakani'`) tiene acceso sin necesidad de membership por proyecto. El rol `externo` (introducido en 0.25.0) reemplaza el uso historico de `editora` para usuarios fuera del staff IIEG. Las cuentas con `role='externo'` reciben 403 al intentar acceder a routers admin-only del CMS. Detalle completo de la matriz de roles en [docs/ROLES.md](ROLES.md).

El flujo del wizard se basa en `user_id`: cada `EnvioFormulario` referencia al usuario que lo abrio. Un usuario solo ve y edita sus propios envios (filtros aplicados en services).

## DataEngine

SIEEJ no toca DataEngine. Las tablas viven en `iieg_portal`, no en la BD externa con PostGIS. Cualquier cambio futuro que toque DataEngine va en rama dedicada `prod-migracion` y se aplica con `alembic -x db=dataengine upgrade head`.
