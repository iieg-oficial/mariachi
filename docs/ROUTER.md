# ROUTER — Enrutamiento de Mariachi

Referencia del enrutamiento del CMS (`admin/`), su relación con la autorización del
backend (`api/`) y el ruteo de borde del `gateway-hub`. Cubre la arquitectura vigente y
el lote de hardening aplicado en `api 1.39.0 / admin 1.39.0` (+ `gateway-hub 1.27.1`).

---

## Capas de enrutamiento

El acceso al CMS atraviesa tres capas; cada una tiene una responsabilidad distinta y
ninguna sustituye a la siguiente:

1. **`gateway-hub` (Nginx de borde)** — termina TLS y reparte por path entre productos.
2. **`mariachi-nginx`** — sirve el bundle estático del admin y proxea `/api/*` al backend.
3. **React Router (`admin/`)** — navegación SPA dentro de `/mariachi/`.
4. **FastAPI (`api/`)** — única capa de seguridad real (los guards de React son solo UX).

---

## React Router (`admin/`)

- **Stack:** React 19 + React Router 7 en modo `createBrowserRouter`, con `basename: '/mariachi'`
  (Vite `base: '/mariachi/'`). Todas las páginas se cargan con `lazy()` + `Suspense`.
- **Definición:** el árbol vive en `admin/src/main.jsx`. Dos features inyectan sus rutas con
  builders: `buildColibriRoutes` (`features/colibri/routes.jsx`) y `buildMapalabApiKeysRoutes`
  (`features/mapalab-api-keys/routes.jsx`).

### Anidamiento

```
MainProvider (ConfigProvider AntD + locale es + errorElement)
├── /login                         (público)
└── ProtectedRoute > MainLayout    (requiere sesión + staff)
    ├── index → Navigate a /inicio
    ├── inicio, perfil, documentacion, change-password
    ├── users, actividad, revision          (RoleProtectedRoute: tetlamamakani)
    ├── menu, pages/edit/:id, acervo         (RoleProtectedRoute: staff)
    ├── mapalab/*                            (capas, eventos, símbolos, stats, …)
    ├── sieej/*                              (formularios, grupos)
    ├── …colibri (builder)                   (resumen staff; catálogos admin)
    ├── …mapalab-api-keys (builder)          (admin)
    └── *  → 404 (Result)
```

### Guards (`admin/src/app/guards/`)

| Guard | Función |
|---|---|
| `ProtectedRoute` | Exige sesión (`isAuthenticated`). Bloquea no-staff con 403 y los manda a SIEEJ. Maneja `loading`. |
| `RoleProtectedRoute` | Filtra por `allowedRoles` por ruta. Sin permiso → 403. |
| `ErrorBoundary` | `errorElement` de las rutas. Mapea a 404/403/500 con `useRouteError`. |

> Los guards solo ocultan UI. Un cliente que manipule el bundle no obtiene datos: la
> autorización la impone FastAPI (ver abajo).

### Sider ↔ rutas (`admin/src/app/`)

El menú lateral se define aparte de las rutas y se sincroniza a mano:

- `sider-registry.jsx` — `PROJECT_REGISTRY` (ítems por proyecto, con `path`, icono y
  `allowedGlobalRoles`) y `FOOTER_ITEMS`.
- `sider-config.jsx` — `buildSiderItems` (filtra por rol, deshabilita con candado en vez de
  ocultar), `defaultOpenKeyForPath` (submenú abierto) y `selectedKeyForPath` (ítem resaltado).

`selectedKeyForPath(pathname)` elige el ítem cuyo `path` es el **prefijo más largo** que
coincide, de modo que una ruta de detalle (`/mapalab/eventos/123/edit`) resalta su ítem
padre (`/mapalab/eventos`) y un ítem anidado (`/mapalab/layers/ingesta-masiva`) gana sobre
su hermano base (`/mapalab/layers`).

---

## Autorización en el backend (`api/`)

Todos los routers del CMS se registran con `staff_dep` en `app/main.py`; los writes añaden
`verify_csrf` + `require_role`. Reglas a tener presentes al ampliar el router:

- **`GET /usuarios`** es accesible para *staff* (no solo admin) **a propósito**: SIEEJ-grupos
  lo necesita para asignar miembros, y `_serialize_user` redacta por rol (a una editora le
  enmascara el email y le oculta los proyectos de otros). No restringir a admin.
- **`GET /colibri/tipos` y `/direcciones`** los consumen páginas staff
  (`ReportesListPage`/`ResumenPage`) para resolver nombres. Mantener accesibles a staff.
- **`GET /colibri/source-apps` y `/colibri/routes`** son admin-only en endpoint
  (`require_role(['tetlamamakani'])`): exponen configuración sensible (dominios CORS,
  prefijos de API key, scrubbers PII, URLs de webhooks). Sus únicos consumidores son páginas
  admin.

Regla general: si una ruta es admin-only en la UI, el endpoint **GET** correspondiente debe
exigir el mismo rol; de lo contrario la confidencialidad que comunica la UI es filtrable por
API directa con una sesión de staff.

---

## Ruteo de borde (`gateway-hub`)

`gateway.conf.template` reparte por path (de más específico a más general). Lo relevante para
mariachi:

| Ruta pública | Upstream | Notas |
|---|---|---|
| `/api/administrador/acervo` | mariachi | `^~`, body 1G, buffering off (uploads grandes) |
| `/api/` | mariachi | backend FastAPI |
| `/mariachi/assets/` | mariachi | `^~`, rate-limit zona `static` + cache `immutable` |
| `/mariachi/` | mariachi | bundle del admin (SPA) |
| `/administrador/` | mariachi | alias legacy → `rewrite` a `/mariachi/…` |

Los assets del admin (nombres con hash de contenido de Vite) se sirven bajo
`/mariachi/assets/` con la zona `static` (50 r/s, burst 200) en vez de `general` (10 r/s,
burst 20), para que la ráfaga de chunks `lazy()` de la primera carga no devuelva `429`.

---

## Lote de hardening (`api 1.39.0 / admin 1.39.0` · `gateway-hub 1.27.1`)

1. **Autorización:** `GET /colibri/source-apps` y `/colibri/routes` pasan a exigir
   `tetlamamakani`. Cierra la lectura de configuración sensible por sesiones de staff. No se
   tocaron `/usuarios`, `/colibri/tipos` ni `/direcciones` (los consume staff legítimamente).
2. **Redirect de sesión:** el interceptor de `shared/services/api.js` redirige el `401` a
   `/mariachi/login` (antes apuntaba a `/mariachi/administrador/login`, inexistente, que solo
   funcionaba por rebote).
3. **`/administrador` legacy:** `mariachi-nginx` sustituye el prefijo
   (`rewrite ^/administrador(/.*)?$ /mariachi$1 permanent`) en vez de anteponerlo; repara los
   deep links legacy (`/administrador/mapalab/layers`, etc.) que antes caían en 404.
4. **Resaltado del sider:** `selectedKeyForPath` resuelve el ítem activo en rutas de detalle.
5. **Rate-limit de assets (gateway-hub):** `location ^~ /mariachi/assets/` con zona `static`
   + `Cache-Control: immutable`. Elimina los `429` en la carga de chunks y reduce descargas
   posteriores.

### Despliegue

Los puntos 1–4 van en el `make deploy` de `mariachi`. El punto 5 vive en `gateway-hub` (repo
aparte): requiere su propio `make deploy` para re-renderizar el template y recargar Nginx.
