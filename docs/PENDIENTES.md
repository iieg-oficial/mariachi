# Roadmap — Mariachi

**Estado actual:** 0.48.1 · **Ultima revision:** 2026-05-11

Monorepo del CMS Mariachi + backend FastAPI compartido + 5 paquetes Colibri (widget, SDK, docs publicas, panel, backend) + modulo Eventos + modulo SIEEJ. La version pre-1.0 implica que pueden romperse compats menores entre minor; el versionado es unificado.

Lineas activas por modulo abajo. Roadmap a v1.0 sigue al final.

---

## Plataforma core (auth, usuarios, paginas, menu, media, buckets)

### Implementado

- [x] Auth con cookie JWT + CSRF + roles globales (`tetlamamakani`/`editora`/`externo`)
- [x] Usuarios CRUD admin-only, profile self-update, reset password
- [x] **Auto-recovery del CSRF token** (v0.47.3) via `GET /autenticacion/csrf` + interceptor con retry
- [x] **Sider con candado** (v0.47.2): items inaccesibles visibles + tooltip explicativo
- [x] Paginas, menu, media (multi-bucket scoped)
- [x] Multi-proyecto: tablas `projects`, `user_projects`, `media_buckets`
- [x] `require_project_access(min_role='editor')` aplicado en writes
- [x] Buckets publicos/privados + proxy autenticado para privados
- [x] Carpetas scoped por bucket (`(bucket_id, path)` unique)
- [x] **Hardening usuarios v0.48.0**: blanqueo de campos privilegiados en self-update (cierra vulnerabilidad de autopromocion), rate limit + lockout en login, invalidacion de sesion al cambiar/resetear password (`password_changed_at` + `iat` en JWT)
- [x] **Endpoint upload avatar v0.48.0**: `POST /autenticacion/perfil/avatar` al bucket publico `iieg/avatars/u<id>/` con validacion de tipo y tamano, path enforced en servidor
- [x] **Privacidad GET /usuarios para editora v0.48.1**: email enmascarado y `projects = []` para editora viendo a OTRO; admin y self-view ven todo
- [x] **UI cards en UsersPage v0.48.1**: refactor de tabla a grid responsive con `UserCard`, search/filter, pagination
- [x] **Audit log persistido (US #148) v0.48.1**: tabla `actividad_log`, helper `registrar_actividad`, endpoint admin `/actividad`, UI `/mariachi/actividad`. Acciones cableadas: `user.*` y subset de `sieej.*`

### Pendiente

- [ ] Logging estructurado JSON completo: extender `registrar_actividad` a `eventos.*`, `reportes.*`, `colibri.*` (hoy solo cubre `user.*` y subset de `sieej.*`)
- [ ] `/metrics` counters para endpoints de `eventos`, `home`, `mapalab-shares`, `formularios`
- [ ] Migrar prefijo `/api/administrador/*` → `/api/mariachi/*` (coordinado con `gateway-hub`)
- [ ] Tests admin: smoke con Vitest (sider-config con candado, BucketFilePicker, FormularioCard, EventoEditPage)
- [ ] `npm run lint` clean en admin con ESLint 10 + jsx-a11y + no-restricted-imports PNG (puede disparar errores acumulados)

---

## Modulo Eventos (mapalab-eventos)

### Implementado

- [x] CRUD + workflow `EventoEstado` enum (`draft`/`review`/`published`)
- [x] Borradores polimorficos `resource_type='evento'` + concurrencia optimista
- [x] BBoxField con 3 modos (sin zoom / coordenadas EPSG:4326 ↔ EPSG:6368 / dibujar en mapa) + OpenLayers
- [x] CapasField con auto-leaf bajo `eventos-auto` para capas "solo GeoServer"
- [x] LayerContentDrawer reutilizable (Tarjeta/Metadatos/Simbologia)
- [x] Cache Redis versionado para `/eventos` y `/home` publicos
- [x] Indice parcial `ix_eventos_publicados_visibles`
- [x] Audit completo: RBAC + CSRF + rate limit (60/min) + validacion (CapaRef, BBox, image_url)
- [x] 41 tests pytest cubriendo lifecycle, concurrencia, presence, RBAC
- [x] Validacion `_validate_image_url` acepta paths del acervo `bucket/object` con bucket validado contra `KNOWN_ACERVO_BUCKETS` y guard de `..` (path traversal). Tests cubren bucket conocido aceptado, desconocido rechazado, y traversal rechazado (v0.47.5)
- [x] Listado publico `GET /api/mapalab/eventos` envuelve cada `model_validate` en `try/except` y omite del listado los eventos que fallan validacion (logging `warning` con su `id`), evitando que un dato malformado puntual tire el endpoint completo y haga desaparecer todos los eventos del visor (v0.47.5)

### Pendiente

- [ ] SLA / scheduling de publicacion (publicacion programada) — no parte de v1.0
- [ ] Visor: filtros por categoria/tag de evento (hoy es lista plana)

---

## Modulo Colibri (reportes embebibles)

### Implementado

- [x] Backend completo: 6 modelos + 7 schemas + 4 services + 5 routers admin + endpoint publico endurecido
- [x] Panel admin: Resumen, Reportes (plano + agrupados), Tipos (form builder), Direcciones, SourceApps con rotacion de keys, Routes con fan-out, Integracion con preview
- [x] Widget Lit + Vite con 3 Custom Elements + bundle 49.5 KB raw / 13.81 KB gzip
- [x] **API global `window.colibri`**: `identify`, `setContext`/`clearContext`, `openPanel` programatico (v0.47.1)
- [x] CSS vars `--offset-x`/`--offset-y` separadas (v0.47.1)
- [x] SDK npm `@iieg/colibri-sdk` publicable
- [x] Docs publicas standalone con seccion "Patron React" (v0.47.4) — implementado en mapalab + sieej
- [x] PII scrubbing, dedupe via fingerprint, audit log, fan-out best-effort

### Pendiente

- [ ] **Pagina publica de seguimiento por token** — bloqueado por normativa: requiere politicas de retencion de email, uso permitido, consentimiento explicito, derechos ARCO. Implementacion tecnica trivial (1-2 dias), bloqueo 100% normativo
- [ ] Calculo automatico de `sla_at` a partir de `tipo.sla_horas` (hoy se persiste manual)
- [ ] Notificaciones in-app cuando llega un reporte de severidad `alta`/`critica` (hoy solo via fan-out a Discord/Slack)

---

## Modulo SIEEJ (formularios para dependencias)

### Implementado

- [x] Schema dedicado `sieej.*` con `formularios`, `envios`, `grupos`, `eventos`
- [x] Catalogos (tipos, dependencias)
- [x] CRUD admin de formularios + builder de definicion
- [x] Endpoints respondent: `GET /formularios/{slug}/envio`, `PUT /envio`, `POST /envio/upload`
- [x] **Endpoints `/mis-envios`** (v0.47.0): listado paginado + detalle con `definicion_snapshot` historica
- [x] CMS admin grid de cards con busqueda + filtro estado + 3 sorts (v0.47.0)
- [x] Tabs persistentes en URL bookmarkable (`?tab=envios`)
- [x] PDF custom para `levantamiento` con formato del wizard original
- [x] `SLUGS_RESERVADOS` para evitar colisiones con rutas literales del frontend SIEEJ
- [x] Rol `externo` integrado al flujo `UsersPage` para crear dependencias
- [x] **Reglas de negocio v0.48.0**: `showWhen.field` validado contra fields existentes (referencias muertas rechazadas); `EnviosService._formulario_acepta_cambios` bloquea PUT/upload sobre formularios cerrados o fuera de vigencia; reapertura admin con preservacion de `definicion_snapshot`; auto-expiracion lazy + bulk admin; upload sincroniza `envio.datos[step][field]` con la URL publica; limite de 5 MB en payload `datos`
- [x] **Race en `get_o_iniciar` v0.48.0**: catch de `IntegrityError` por constraint UNIQUE devuelve el envio existente (antes daba 500)
- [x] **Audit log estructurado v0.48.0** en operaciones admin (crear/actualizar/publicar/cerrar/eliminar/reabrir_envio)
- [x] **Audit log persistido v0.48.1** en tabla `actividad_log` con endpoint admin y UI (`sieej.formulario.create/update`, `sieej.envio.reabrir`)
- [x] **must_change_password UX v0.48.1**: ya estaba implementado en `/IIEG/sieej/frontend/` (ChangePassword.jsx + ProtectedRoute guard + AuthContext redirect post-login). Investigado durante auditoria
- [x] **Soft-delete de envios v0.48.1**: `DELETE /formularios/mis-envios/{id}` (respondent), `eliminado_en` poblado, admin sigue viendo el envio
- [x] **Script CLI de auto-expiracion v0.48.1**: `api/scripts/expire_sieej_envios.py` para cron del host

---

## Modulo MapaLab (capas + home + shares)

### Implementado

- [x] CRUD de capas + reorder + bulk-tags + duplicate
- [x] Editor metadata (`mapalab.layer_metadata`) + numeralia/stats (`mapalab.layer_stats`)
- [x] Introspeccion GeoServer + `workspaces/pending` + `workspaces/register`
- [x] Editor SLD con shapes `choropleth` y `boundary` + fallback raw XML + leyenda renderizada
- [x] Modelo de Propiedades (display-only) para `leaf` con padre `group`
- [x] Cache versionado para `/eventos` y `/home` publicos
- [x] Workflow de aprobacion polimorfico (`resource_type` ∈ `{layer, sld, evento, home, ...}`)
- [x] BucketFilePicker grid + Segmented toggle persistente

### Pendiente

- [ ] **Credenciales DataEngine en produccion** — coordinar con equipo para provisionar rol `mariachi_layers` (mismo SQL de `docs/DATAENGINE_CREDENTIALS.md` pero en VM real + `pg_hba.conf` con IP del servidor mariachi + `sslmode=require`)
- [ ] Upload directo al bucket mapalab desde `LayerMetadataSection` (hoy hay que ir a Media primero)
- [ ] Bucket Acervo `mariachi-dev` migrado (`scripts/migrate-acervo-bucket.sh --execute`)

---

## CI / CD / Infra

### Implementado

- [x] GitHub Actions: `ci.yml` con lint (ruff/ESLint) + tests (pytest/vitest)
- [x] Auto-merge workflow develop → main con tests previos
- [x] CORS sin `*` en produccion, `cookie_secure` forzado, `docs_url`/`redoc_url` deshabilitados en prod
- [x] `--proxy-headers --forwarded-allow-ips='*'` en uvicorn/gunicorn
- [x] `set_real_ip_from` para CIDRs privados en nginx
- [x] Compatibilidad con `gateway-hub` (HTTP-only en `iieg-network`)

### Pendiente

- [x] **Workflow `cd.yml`** v0.48.x — implementado siguiendo el patron de mapalab. Trigger push a `production`, 3 jobs (deploy SSH + health-check con 10 retries / 15s + notify Discord). Requiere secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `PROJECT_PATH`, `DISCORD_WEBHOOK_URL` (opcional: `HEALTH_CHECK_URL`). `make deploy` agregado al Makefile para invocacion desde el host
- [ ] Build Docker + push a registry en CI
- [ ] **Renombrar repo en GitHub** `portal/` → `mariachi/`. Correr `scripts/rename-github-repo.sh --execute` despues
- [ ] Entorno staging con datos reales desplegado
- [ ] Monitoreo basico (health checks + alertas)
- [ ] Backup automatizado de PostgreSQL
- [ ] Pruebas de carga (API timeouts, bucket upload con archivos grandes)
- [ ] `docs/DEPLOYMENT.md`
- [ ] Corregir `start_backend.sh` (quitar `--reload` en produccion)

---

## Roadmap a v1.0

### v1.0-rc

- [ ] Tests admin Vitest minimo viable (sider, FormularioCard, EventoEditPage, BucketFilePicker)
- [ ] CD workflow (`cd.yml`) operativo
- [ ] Endpoint upload de avatar (bucket `iieg/avatars/u<id>/`)
- [ ] Logging estructurado JSON completo
- [ ] QA funcional completo en staging

### v1.0

- [ ] Deploy a produccion
- [ ] Capacitacion a usuarios (admin + editora)
- [ ] Migrar prefijo `/api/administrador/*` → `/api/mariachi/*` (coordinado con gateway-hub)

> **Nota:** SSL, DNS, `robots.txt` y `sitemap.xml` los gestiona el `gateway-hub` arriba — fuera del scope de este repo.

---

## Post v1.0

### v1.1

- Menu: crear items, agregar hijos, eliminar items
- Menu: editar pagina desde item
- Papelera (soft-delete con recuperacion) para `pages`, `eventos`, `envios`
- Historial/auditoria de acciones (US #148)
- Aislamiento real de `Page` y `MenuItem` por proyecto (hoy solo portal las usa)

### v1.2

- Notificaciones (centro de notificaciones in-app)
- Rol global `disenadora` explicito (hoy solo `tetlamamakani`/`editora`/`externo`)
- Dashboard de inicio con KPIs por proyecto
- Pagina publica de seguimiento de reportes Colibri (desbloquea cuando llegue politica de privacidad)

### v1.3

- Estilos globales (colores, tipografia)
- Layouts (header/footer) — solo aplicable a portal, revisar si se mueve al repo `iieg/portal`
- Gestion de fuentes tipograficas
- Iconos personalizados (CRUD SVG)
- Menu: iconos personalizados (banco de iconos)

### v1.4

- Busqueda de contenido (pagina y global Ctrl+K)
- Analytics (visitas, dispositivos, trafico)
- Redirects (redirecciones URL)

### v1.5

- Verificador de accesibilidad (PageEditor)
- Publicacion programada (PageEditor + Eventos)
- Import/Export de contenido
- Documentacion in-app
