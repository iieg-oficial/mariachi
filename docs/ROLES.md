# Roles y RBAC del ecosistema mariachi

Modelo de roles globales y autorizacion por proyecto. Aplica al backend FastAPI (`api/`), al admin CMS (`admin/`), y a los productos publicos servidos por mariachi-nginx (`/sieej/`, futuros `/mapalab/` autenticado, etc.).

## Roles globales

`Usuario.role` es un ENUM Postgres con tres valores:

| Role | Quien | Acceso al admin CMS (`/mariachi/`) | Acceso a productos publicos | Bypass de UserProject |
|---|---|---|---|---|
| `tetlamamakani` | Admin global IIEG | Si | Si (todos los proyectos) | Si |
| `editora` | Staff IIEG (gestor de contenido, editor de capas, etc.) | Si | Si, segun `UserProject` | No |
| `externo` | Usuarios fuera del staff IIEG (dependencias de gobierno, ciudadanos en futuros productos publicos autenticados) | **No** | Si, segun `UserProject` | No |

Constantes en `api/app/api/deps.py`:

```python
ADMIN_ROLE = "tetlamamakani"
STAFF_ROLES = {"tetlamamakani", "editora"}
```

## Autorizacion por proyecto

`UserProject(user_id, project_id, project_role)` modela la membership. `project_role` es un ENUM con dos valores:

- `editor`: puede leer y escribir el contenido del proyecto.
- `viewer`: solo lectura.

El admin global (`tetlamamakani`) tiene bypass automatico en `require_project_access`. Para roles `editora` y `externo` se valida que exista la fila en `user_projects` y que `project_role >= min_role` cuando se especifica.

Proyectos seedeados (migration `c0d1e2f3a4b5`):

- `portal` — Portalito (sitio publico del IIEG).
- `mapalab` — Visor de capas geoespaciales.
- `sieej` — Sistema de Informacion Estadistica del Estado de Jalisco.

## Dependencies disponibles

En `api/app/api/deps.py`:

- `get_current_user` — extrae el usuario de la cookie HttpOnly (`access_token`). Devuelve 401 si no hay sesion.
- `verify_csrf` — valida la cabecera `X-CSRF-Token` en mutaciones (POST/PUT/DELETE/PATCH). Implica `get_current_user`.
- `require_role(["tetlamamakani"])` — restringe a una lista explicita de roles globales. Devuelve 403 si no coincide.
- `require_staff` — atajo para `require_role([tetlamamakani, editora])`. Bloquea el rol externo. Se usa a nivel de `include_router` para proteger todos los endpoints del admin CMS.
- `require_project_access(slug, min_role=None)` — valida que el usuario tenga membership en el proyecto `slug`. Bypass automatico para `tetlamamakani`. Cuando `min_role='editor'` exige `project_role='editor'`.
- `require_bucket_access` — valida acceso al MediaBucket asociado a un proyecto.

## Aplicacion en routers

En `app/main.py`:

```python
# Sin guard de staff: cualquier autenticado puede usar.
app.include_router(auth.router, prefix=settings.admin_prefix)
app.include_router(formularios.router, prefix=settings.admin_prefix)

# Bloqueados para externo:
staff_dep = [Depends(require_staff)]
app.include_router(users.router, prefix=settings.admin_prefix, dependencies=staff_dep)
app.include_router(pages.router, prefix=settings.admin_prefix, dependencies=staff_dep)
# ... y los otros 9 routers admin-only.

# Sin auth (publico):
app.include_router(public.router, prefix=settings.web_prefix)
app.include_router(preview.public_router, prefix=settings.web_prefix)
```

`formularios` no se protege con `require_staff` porque el rol externo es uno de sus consumidores. La gate se aplica dentro del router con `Depends(require_project_access('sieej'))`.

## Frontend admin (`mariachi-admin`)

`admin/src/app/guards/ProtectedRoute.jsx`:

- Redirige al `/login` si no hay sesion.
- Renderiza pantalla 403 si la sesion existe pero `user.role === 'externo'`. Ofrece dos botones: "Ir a SIEEJ" (redirige a `/sieej/inicio-sesion` por window.location.href para salir del SPA admin) y "Cerrar sesion".

`admin/src/features/auth/pages/LoginPage.jsx`:

- Tras login exitoso, si `user.role === 'externo'`, redirige a `/sieej/inicio-sesion` sin pasar por el panel.
- Para staff (tetlamamakani, editora), navega a `/change-password` o `/` segun `must_change_password`.

## Frontend SIEEJ (`iieg-oficial/sieej`)

No requiere distinguir rol explicitamente. Su `AuthContext` solo necesita que `/api/administrador/autenticacion/perfil` devuelva 200 y que `/formularios/*` no devuelva 403. Cualquier rol con `UserProject(project='sieej')` valido funciona, incluido `externo`.

## Onboarding de un usuario externo

El flujo lo ejecuta un admin (`tetlamamakani`) desde el panel de mariachi:

1. Crear `Usuario` con `role='externo'`, `must_change_password=true` y un password temporal.
2. Asignar `UserProject(user_id=<id>, project_id=<sieej.id>, project_role='editor')`.
3. Compartir las credenciales por canal seguro.
4. El usuario externo entra a `/sieej/inicio-sesion`. Si entra a `/mariachi/login` por error, se le redirige automaticamente a SIEEJ tras autenticar.
5. Si `must_change_password=true`, en su primera sesion en SIEEJ se le mostrara el flujo de cambio de contrasena (pendiente: implementar `must_change_password` en el frontend SIEEJ; hoy solo el admin lo aplica).

Equivalente en SQL (para seed manual):

```sql
INSERT INTO usuarios (username, email, hashed_password, name, role, must_change_password, created_at)
VALUES ('dependencia_x', 'contacto@dependencia.gob.mx', '<bcrypt_hash>', 'Dependencia X', 'externo', true, NOW());

INSERT INTO user_projects (user_id, project_id, project_role)
SELECT u.id, p.id, 'editor'
FROM usuarios u, projects p
WHERE u.username = 'dependencia_x' AND p.slug = 'sieej';
```

## Casos de uso planeados

- **SIEEJ**: usuarios externos = dependencias de gobierno cargando informacion estadistica de sus bases de datos.
- **MapaLab autenticado** (futuro): usuarios externos = ciudadanos consultando capas restringidas con sesion. El admin CMS sigue siendo solo para `editora`/`tetlamamakani` que gestionan capas.
- **Portal**: hoy es publico (sin auth). Si en el futuro requiere areas autenticadas para ciudadanos, se usa el mismo rol `externo`.

## Auditoria

US #148 *Registro de auditoria de accesos* (backlog) cubre la trazabilidad. Recomendacion al implementar: registrar al menos `(user_id, role, action, resource, project_slug, timestamp)` para diferenciar accesos de staff vs externo.

## Validacion de la separacion (smoke)

Comportamiento esperado en dev tras esta implementacion:

| Caller | Endpoint | Codigo |
|---|---|---|
| `editora` autenticada | `GET /administrador/usuarios` | 200 |
| `externo` autenticado | `GET /administrador/usuarios` | **403** |
| `externo` autenticado | `GET /administrador/paginas` | **403** |
| `externo` autenticado | `GET /administrador/formularios/catalogos` | 200 (con UserProject sieej) |
| `externo` autenticado | `GET /administrador/autenticacion/perfil` | 200 |
| `externo` sin UserProject sieej | `GET /administrador/formularios/catalogos` | 403 (require_project_access) |
