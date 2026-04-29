# Modulo SIEEJ en mariachi/api

El backend de SIEEJ (Sistema de Informacion Estadistica del Estado de Jalisco) vive como modulo dentro de `mariachi/api`. Este documento describe el modelo de datos, las rutas expuestas y como se integra el frontend (otro repo: `iieg-oficial/sieej`).

## Que es

SIEEJ es la plataforma de captura para que dependencias e instituciones de gobierno entreguen al IIEG informacion estructurada sobre:

- Datos generales del ente de gobierno.
- Enlaces tecnicos (responsables y jefes).
- Inventario de bases de datos y sus diccionarios (subidos a Acervo).

El backend antes vivia en un repositorio aparte como FastAPI/SQLModel. En 2026-04-24 se absorbio en mariachi para reusar la auth (cookie HttpOnly + CSRF), el cliente Acervo, el RBAC multi-proyecto y el ciclo Alembic. El frontend (React + Vite + Tailwind) sigue en su propio repo y se sirve via `mariachi-nginx` bajo la ruta `/sieej/`.

## Modelo de datos

Schema dedicado `sieej` en la BD `iieg_portal`. Doce tablas:

| Tabla | Tipo | Descripcion |
|---|---|---|
| `sieej.catalogo_unidad_admin` | catalogo | Unidades administrativas del estado (85 valores) |
| `sieej.catalogo_categoria_datos` | catalogo | Publicos, Internos, Personales, Sensibles, Confidenciales, Reservados |
| `sieej.catalogo_herramientas_gestion` | catalogo | ERP, CRM, Excel, Otro |
| `sieej.catalogo_calidad_datos` | catalogo | Verificacion manual, Herramientas automaticas, Ambas |
| `sieej.catalogo_periodicidad` | catalogo | Diario, Semanal, Mensual, Anual, Indeterminado, Otro |
| `sieej.catalogo_objetivo_uso` | catalogo | Toma de decisiones, Politicas publicas, Informes, Otro |
| `sieej.catalogo_usuarios_datos` | catalogo | Generados internamente, Proveedores externos, Ambos |
| `sieej.catalogo_ejes_estrategicos` | catalogo | Ejes del Plan Estatal (Salud, Empleo, Innovacion, etc.) |
| `sieej.general` | entidad | Una fila por usuario: nombre del ente, hay responsable, descripcion, desafios |
| `sieej.enlace` | entidad | N filas por usuario: enlace tecnico + datos del jefe |
| `sieej.bases_datos` | entidad | N filas por usuario: inventario de bases con FKs a 6 catalogos |
| `sieej.bd_ejes_estrategicos` | N:M | Asocia bases_datos con ejes_estrategicos |

Las semillas de los ocho catalogos provienen de `api/data/sieej/*.json` y se aplican en la migration `e7f8a9b0c1d2_init_sieej_schema.py` (rama mariachi). El proyecto `Project(slug='sieej')` se crea en la migration `c0d1e2f3a4b5_add_projects_user_projects_media_buckets.py`. La misma migration `e7f8a9b0c1d2` siembra el `MediaBucket(acervo_bucket='sieej-diccionarios')`.

Todas las tablas referencian `public.usuarios.id` con `ON DELETE CASCADE`. Los catalogos se referencian con `ON DELETE RESTRICT`.

## Endpoints

Bajo `admin_prefix` (`/api/administrador` por defecto), todos los endpoints estan protegidos por `Depends(require_project_access('sieej'))`. Las mutaciones requieren `verify_csrf` (cabecera `X-CSRF-Token`). El admin global (`role='tetlamamakani'`) tiene bypass al check de proyecto.

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/formularios/catalogos` | Bundle con las ocho colecciones de catalogos. Reduce roundtrips desde el wizard del frontend. |
| GET | `/formularios/general` | Lee la informacion general del usuario actual (404 si no hay registro). |
| POST | `/formularios/general` | Crea la informacion general. |
| PUT | `/formularios/general/{id}` | Actualiza por id. |
| DELETE | `/formularios/general/{id}` | Soft delete (`is_active=false`). |
| GET | `/formularios/enlaces` | Lista enlaces del usuario. |
| POST | `/formularios/enlaces` | Crea un enlace. |
| PUT | `/formularios/enlaces/{id}` | Actualiza por id. |
| DELETE | `/formularios/enlaces/{id}` | Soft delete. |
| GET | `/formularios/bases-datos` | Lista bases de datos del usuario. |
| GET | `/formularios/bases-datos/{id}` | Obtiene una base de datos por id. |
| POST | `/formularios/bases-datos` | Crea (solo nombre y descripcion; los demas campos se llenan en updates). |
| PUT | `/formularios/bases-datos/{id}` | Actualiza una base de datos completa, incluyendo los ejes estrategicos N:M. |
| DELETE | `/formularios/bases-datos/{id}` | Soft delete. |
| POST | `/formularios/bases-datos/{id}/diccionario` | Sube el archivo de diccionario al bucket `sieej-diccionarios` via `AcervoClient.for_bucket()`. La URL publica del objeto se guarda en `bases_datos.ruta_diccionario`. |

## Estructura del codigo

```
api/
├── alembic/versions/mariachi/
│   └── e7f8a9b0c1d2_init_sieej_schema.py   # Schema + tablas + seeds
├── data/sieej/
│   └── *.json                              # Catalogos seed (8 archivos)
└── app/
    ├── api/routes/formularios/
    │   ├── __init__.py                     # Router padre con require_project_access
    │   ├── catalogos.py                    # GET bundle
    │   ├── general.py                      # CRUD informacion general
    │   ├── enlaces.py                      # CRUD enlaces
    │   └── bases_datos.py                  # CRUD bases + upload diccionario
    ├── models/sieej/
    │   ├── __init__.py
    │   ├── catalogos.py                    # 8 catalogos
    │   ├── general.py                      # General + relacion a unidad_admin
    │   ├── enlace.py
    │   └── bases_datos.py                  # BasesDatos + BDEjesEstrategicos (N:M)
    ├── schemas/sieej/
    │   ├── general.py
    │   ├── enlace.py
    │   ├── bases_datos.py
    │   └── catalogos.py
    └── services/sieej/
        ├── general_service.py
        ├── enlace_service.py
        └── bases_datos_service.py          # incluye upload_diccionario async
```

## Frontend

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

El frontend consume `/api/administrador/*` con `withCredentials: true`. Guarda el `csrf_token` (devuelto por `/autenticacion/iniciar-sesion`) en `sessionStorage` y lo inyecta en las cabeceras de las mutaciones.

## Acervo

Los diccionarios de bases de datos se suben al bucket `sieej-diccionarios` (creado por la migration). El servicio `bases_datos_service.upload_diccionario(...)` usa `AcervoClient.for_bucket(bucket)` (cliente cacheado por bucket) y guarda la URL en `bases_datos.ruta_diccionario`. El nombre del objeto sigue el patron `u<user_id>/bd<bd_id>/<uuid>.<ext>`.

Las credenciales del bucket se resuelven con `ACERVO_SIEEJ_ACCESS_KEY`/`ACERVO_SIEEJ_SECRET_KEY`. Si faltan, `services/acervo.py::resolve_bucket_credentials` lanza `RuntimeError` explicito (desde 0.30.29 ya no hay fallback a creds root del cluster — principio de menor privilegio). Generar/rotar con `cd ../acervo && ./scripts/init-buckets.sh --rotate sieej-diccionarios`.

## Auth y RBAC

Una dependencia de gobierno = `Usuario(role='externo')` + `UserProject(project=sieej, role='editor')`. La membership se inserta a mano (o via admin CMS) cuando se crea el usuario. El admin global (`role='tetlamamakani'`) tiene acceso sin necesidad de membership por proyecto.

El rol `externo` (introducido en 0.25.0) reemplaza el uso historico de `editora` para usuarios fuera del staff IIEG. Las cuentas con `role='externo'` reciben 403 al intentar acceder a routers admin-only del CMS. Detalle completo de la matriz de roles en [docs/ROLES.md](ROLES.md).

El flujo del wizard se basa en `user_id`: cada fila de `general`, `enlace`, `bases_datos` referencia al usuario que la creo. Un usuario solo ve y edita sus propios registros (filtros aplicados en services).

## DataEngine

SIEEJ no toca DataEngine. Las tablas viven en `iieg_portal`, no en la BD externa con PostGIS. Cualquier cambio futuro que toque DataEngine va en rama dedicada `prod-migracion` y se aplica con `alembic -x db=dataengine upgrade head`.
