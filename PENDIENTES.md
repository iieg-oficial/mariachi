# Roadmap - Portal IIEG

## v1.0 — Febrero a Agosto 2026

### v1.0-alpha — Feb/Mar 2026 | Estabilización
- [x] Auth, Usuarios, Páginas, Editor, Menú, Media
- [ ] Corregir start_backend.sh (quitar --reload en producción)
- [ ] Migración Alembic alineada con modelos actuales (post-destazadero)
- [ ] Tests API: pages, menu, media, public
- [ ] Tests Admin: smoke tests con Vitest

### v1.0-beta — Abr/May 2026 | CI/CD y QA
- [ ] GitHub Actions: lint + tests en PR
- [ ] GitHub Actions: build Docker + push a registry
- [ ] Logging estructurado (JSON) en FastAPI
- [ ] Script de deploy automatizado (staging → producción)
- [ ] Revisión de seguridad (CORS, CSRF, cookies, headers)
- [ ] QA funcional completo en staging

### v1.0-rc — Jun/Jul 2026 | Staging y preparación
- [ ] Entorno staging con datos reales
- [ ] Monitoreo básico (health checks + alertas)
- [ ] Backup automatizado de PostgreSQL
- [ ] Certificado SSL renovación automática (certbot/cron)
- [ ] Pruebas de carga (nginx rate limits, API timeouts)
- [ ] Documentación de deploy en docs/DEPLOYMENT.md

### v1.0 — Agosto 2026 | Producción
- [ ] Deploy a producción
- [ ] DNS y SSL final configurado
- [ ] Verificación robots.txt y sitemap.xml
- [ ] Google Analytics validado
- [ ] Capacitación a usuarios (admin + editora)

---

## Caracteristicas pendientes (post v1.0)

### v1.1 — Octubre 2026
- Menú: crear items, agregar hijos, eliminar items
- Menú: editar página desde item
- Papelera (soft-delete con recuperación)
- Historial/auditoría de acciones

### v1.2 — Noviembre 2026
- Aprobaciones y solicitudes de publicación
- Notificaciones (centro de notificaciones)
- Roles: diseñadora y viewer
- Dashboard de inicio

### v1.3 — Diciembre 2026
- Estilos globales (colores, tipografía)
- Layouts (header/footer)
- Gestión de fuentes tipográficas
- Iconos personalizados (CRUD SVG)
- Menú: iconos personalizados (banco de iconos)

### v1.4 — Enero 2027
- Búsqueda de contenido (página y global Ctrl+K)
- Analytics (visitas, dispositivos, tráfico)
- Sitemap dinámico (generador desde admin)
- Robots.txt dinámico (editor desde admin)
- Redirects (redirecciones URL)

### v1.5 — Febrero 2027
- Verificador de accesibilidad (PageEditor)
- Publicación programada (PageEditor)
- Import/Export de contenido
- Documentación in-app
