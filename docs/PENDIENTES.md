# Roadmap — Mariachi

## v1.0 — 2026

### v1.0-alpha | Estabilización
- [x] Auth, Usuarios, Páginas, Editor, Menú, Media
- [ ] Corregir `start_backend.sh` (quitar `--reload` en producción)
- [x] Migración Alembic alineada con modelos actuales (multi-env `mariachi` + `dataengine`)
- [x] Tests API: layer_service, stats_templates, auth, users
- [ ] Tests API: pages, menu, media, public
- [ ] Tests Admin: smoke tests con Vitest

### v1.0-beta | CI/CD y QA
- [x] GitHub Actions: lint + tests en PR (backend con `ruff` + `pytest`, admin y web con `lint` + `build`)
- [ ] GitHub Actions: build Docker + push a registry
- [ ] Logging estructurado (JSON) en FastAPI
- [ ] Script de deploy automatizado (staging → producción)
- [x] Revisión de seguridad en backend: CORS sin `*` en producción, `cookie_secure` forzado, `docs_url`/`redoc_url` deshabilitados en prod
- [ ] QA funcional completo en staging

### v1.0-rc | Staging y preparación
- [x] Entornos separados: `.env.staging.example` y `.env.production.example` con Makefile `ENV=staging|prod`
- [x] Compatibilidad con `gateway-hub`: nginx HTTP-only en `iieg-network`
- [ ] Entorno staging con datos reales desplegado
- [ ] Monitoreo básico (health checks + alertas)
- [ ] Backup automatizado de PostgreSQL
- [ ] Pruebas de carga (nginx rate limits, API timeouts)
- [ ] Documentación de deploy en `docs/DEPLOYMENT.md`

### v1.0 | Producción
- [ ] Deploy a producción
- [ ] Google Analytics validado
- [ ] Capacitación a usuarios (admin + editora)

> **Nota:** SSL, DNS, `robots.txt` y `sitemap.xml` los gestiona el `gateway-hub` arriba — fuera del scope de este repo.

---

## Módulo de capas (integración MapaLab)

- [x] Editor del árbol de capas con drag & drop (Ant Design `Tree.draggable`)
- [x] CRUD de capas, metadata y stats sobre DataEngine
- [x] Introspección de GeoServer (workspaces, capas, campos, estilos)
- [x] Aprobación de borradores tipo `layer` (polimórficos con `resource_type`)
- [x] Rate limiting en memoria para writes y lecturas GeoServer
- [x] Bulk edit de tags con paste TSV (`BulkTagsDrawer`)
- [x] Selector GeoServer dinámico en drawer de edición
- [x] Editor JSON para `infobox_config` custom (`InfoBoxJsonEditor`)
- [x] Formularios dinámicos por preset InfoBox (`InfoBoxPresetForm`)
- [x] Preview de InfoBox con datos dummy (`InfoBoxPreview`)
- [x] Observabilidad `/metrics` Prometheus + integración con huachicol
- [x] Tests integración cruzada mariachi → mapalab (`test_integration_notify.py`)
- [ ] Credenciales DataEngine provisionadas en producción (ver `DATAENGINE_CREDENTIALS.md`)

---

## Post v1.0

### v1.1
- Menú: crear items, agregar hijos, eliminar items
- Menú: editar página desde item
- Papelera (soft-delete con recuperación)
- Historial/auditoría de acciones

### v1.2
- [x] Aprobaciones y solicitudes de publicación (revision queue)
- Notificaciones (centro de notificaciones)
- Roles: diseñadora y viewer
- Dashboard de inicio

### v1.3
- Estilos globales (colores, tipografía)
- Layouts (header/footer)
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
