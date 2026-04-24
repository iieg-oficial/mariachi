# Roadmap — Mariachi

**Estado actual:** 0.21.0 · Refactor multi-proyecto cerrado (Portalito, MapaLab, SIEEJ); portal extraído a repo propio; admin servido bajo `/mariachi/`.

## v1.0 — 2026

### v1.0-alpha | Estabilización

- [x] Auth, Usuarios, Páginas, Editor, Menú, Media
- [x] Migración Alembic alineada con modelos (multi-env `mariachi` + `dataengine`)
- [x] Alembic como fuente autoritativa del schema (eliminado `create_all` en `init_db.py`)
- [x] Refactor multi-proyecto: tablas `projects`, `user_projects`, `media_buckets`
- [x] Viewer-por-proyecto aplicado en writes (`require_project_access(min_role="editor")`)
- [x] Portal público extraído a repo propio (`iieg/portal`)
- [x] Admin servido en `/mariachi/` (antes `/administrador/`)
- [ ] Corregir `start_backend.sh` (quitar `--reload` en producción)
- [ ] Tests API ampliar cobertura: projects, user_projects, media_buckets, formularios, pages, menu, media, public
- [ ] Tests Admin: smoke tests con Vitest (LayerEditPage, BucketFilePicker, sider-config)
- [ ] Pasar `npm run lint` con ESLint 10 + jsx-a11y + no-restricted-imports PNG en todo el admin (puede dispar errores acumulados)

### v1.0-beta | CI/CD y QA

- [x] GitHub Actions: lint + tests en PR (backend con `ruff` + `pytest`, admin con `lint` + `build`)
- [x] Auto-merge workflow develop → main con tests previos
- [ ] GitHub Actions: build Docker + push a registry
- [ ] GitHub Actions: workflow `cd.yml` para deploy automatizado a producción (SSH deploy, health-check con reintentos, notificaciones Discord). Tomar como referencia `mapalab/.github/workflows/cd.yml`. Requiere secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DISCORD_WEBHOOK`.
- [ ] Logging estructurado (JSON) en FastAPI — al menos `logger.info` en writes de projects, media-buckets, users, layers (crear/editar/borrar) con contexto `{user_id, action, target}`
- [ ] `/metrics` counters para endpoints nuevos (projects, media-buckets, formularios, layer-metadata)
- [ ] Script de deploy automatizado (staging → producción)
- [x] Revisión de seguridad en backend: CORS sin `*` en producción, `cookie_secure` forzado, `docs_url`/`redoc_url` deshabilitados en prod
- [ ] QA funcional completo en staging

### v1.0-rc | Staging y preparación

- [x] Entornos separados: `.env.staging.example` y `.env.production.example` con Makefile `ENV=staging|prod`
- [x] Compatibilidad con `gateway-hub`: nginx HTTP-only en `iieg-network`
- [ ] Entorno staging con datos reales desplegado
- [ ] Monitoreo básico (health checks + alertas)
- [ ] Backup automatizado de PostgreSQL
- [ ] Pruebas de carga (API timeouts, bucket upload con archivos grandes)
- [ ] Documentación de deploy en `docs/DEPLOYMENT.md`

### v1.0 | Producción

- [ ] Deploy a producción
- [ ] Google Analytics validado
- [ ] Capacitación a usuarios (admin + editora)
- [ ] Migrar prefijo de API `/api/administrador/*` → `/api/mariachi/*` (coordinado con gateway-hub)

> **Nota:** SSL, DNS, `robots.txt` y `sitemap.xml` los gestiona el `gateway-hub` arriba — fuera del scope de este repo.

---

## Módulo de capas (integración MapaLab)

- [x] Editor del árbol de capas con drag & drop
- [x] CRUD de capas, metadata y stats sobre DataEngine
- [x] Introspección de GeoServer (workspaces, capas, campos, estilos)
- [x] Aprobación de borradores tipo `layer` (polimórficos con `resource_type`)
- [x] Rate limiting en memoria para writes y lecturas GeoServer
- [x] Bulk edit de tags con paste TSV
- [x] Selector GeoServer dinámico en drawer de edición
- [x] Editor JSON para `infobox_config` custom
- [x] Formularios dinámicos por preset InfoBox
- [x] Preview de InfoBox con datos dummy
- [x] Observabilidad `/metrics` Prometheus + integración con huachicol
- [x] Editor de capas como página dedicada con split view
- [x] Edición de metadatos descriptivos (fuentes, metodología, archivos adjuntos del bucket mapalab)
- [x] `BucketFilePicker` reusable para archivos del bucket mapalab
- [ ] Upload directo de archivos al bucket mapalab desde `LayerMetadataSection` (hoy hay que ir a Media primero)
- [ ] Credenciales DataEngine provisionadas en producción (ver `DATAENGINE_CREDENTIALS.md`)

---

## SIEEJ — administrador de formularios

- [x] Feature placeholder en sider (`/sieej/formularios`)
- [x] Backend stub con `require_project_access('sieej')` (GET devuelve `[]`, writes responden 501)
- [ ] Modelo de dominio: decidir shape real de un "formulario SIEEJ" (campos, opciones, validaciones)
- [ ] Tabla `sieej_formularios` + migración + CRUD real en `routes/formularios.py`
- [ ] Renderer runtime para instancias del formulario (fuera del scope de mariachi probablemente — vive en su propia app pública)

---

## Post v1.0

### v1.1

- Menú: crear items, agregar hijos, eliminar items
- Menú: editar página desde item
- Papelera (soft-delete con recuperación)
- Historial/auditoría de acciones
- Aislamiento real de `Page` y `MenuItem` por proyecto (hoy solo portal las usa; si un segundo proyecto las requiere, agregar `project_id` FK)

### v1.2

- [x] Aprobaciones y solicitudes de publicación (revision queue)
- Notificaciones (centro de notificaciones)
- Rol global `diseñadora` explícito (hoy solo `tetlamamakani` y `editora`)
- Dashboard de inicio

### v1.3

- Estilos globales (colores, tipografía)
- Layouts (header/footer) — hoy solo aplicable a portal, revisar si se mueve al repo `iieg/portal`
- Gestión de fuentes tipográficas
- Iconos personalizados (CRUD SVG)
- Menú: iconos personalizados (banco de iconos)

### v1.4

- Búsqueda de contenido (página y global Ctrl+K)
- Analytics (visitas, dispositivos, tráfico)
- Redirects (redirecciones URL)

### v1.5

- Verificador de accesibilidad (PageEditor)
- Publicación programada (PageEditor)
- Import/Export de contenido
- Documentación in-app
