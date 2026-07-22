# Guía de Contribución

¡Gracias por tu interés en contribuir al Mariachi! Este documento proporciona las directrices para contribuir al proyecto.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Commits y Mensajes](#commits-y-mensajes)
- [Pull Requests](#pull-requests)

## Código de Conducta

Este proyecto adhiere a un [Código de Conducta](./CODE_OF_CONDUCT.md). Al participar, se espera que mantengas este código.

## Cómo Contribuir

1. **Reportar Bugs**: Si encuentras un bug, abre un issue
2. **Sugerir Features**: Propón nuevas características o mejoras
3. **Mejorar Documentación**: Ayuda a mejorar la documentación
4. **Escribir Código**: Implementa features o arregla bugs
5. **Revisar Pull Requests**: Ayuda revisando código de otros

## Configuración del Entorno

### Prerrequisitos

- Node.js >= 20 (admin)
- Python 3.12+ (api)
- Docker y Docker Compose
- Git

### Setup Inicial

```bash
git clone https://github.com/IIEG/mariachi.git
cd mariachi
make setup            # Crea .env.{development,staging,production}
make setup-hooks      # Activa el pre-push hook (ruff + pytest del backend)
make up               # Levanta entorno dev (admin, api, postgres, redis)

# Desarrollo local sin Docker
# Backend (api/)
cd api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Admin (admin/)
cd ../admin
npm install
npm run dev
```

El portal público vive en repo separado (`../portal`); si necesitas levantarlo para testear flujo completo, ve las instrucciones ahí.

### Validación pre-push

El hook `.githooks/pre-push` reproduce el job `backend / test` de CI (`ruff check` + `pytest -q`) antes de cada `git push`. Si CI fallaría, el push se bloquea aquí. Para reproducirlo manualmente: `make test-backend`.

Escapes (úsalos con criterio, CI sigue corriendo):

- `SKIP_PRE_PUSH=1 git push` — salta todo el hook.
- `SKIP_PYTEST=1 git push` — corre solo `ruff`, salta `pytest`.

## Proceso de Desarrollo

### Branching Strategy

- `main`: Código listo para producción
- `develop`: Rama principal de desarrollo
- `feature/*`: Nuevas características
- `fix/*`: Correcciones de bugs
- `hotfix/*`: Correcciones críticas para producción

### Workflow

1. Crear issue describiendo el cambio
2. Crear rama desde `main` o `develop`
3. Desarrollar siguiendo los estándares
4. Escribir tests para tu código
5. Ejecutar tests y linters
6. Commit con mensajes descriptivos
7. Push a tu fork
8. Crear Pull Request

## Estándares de Código

### Backend (Python, `api/`)

- Seguir PEP 8
- Nombres de clases: PascalCase
- Funciones y variables: snake_case
- Máximo 300 líneas por archivo
- Ejecutar: `ruff format` y `ruff check`

### Admin (JavaScript/React, `admin/`)

- ESLint 10 + jsx-a11y + regla `no-restricted-imports` que bloquea PNG (usar WebP/SVG)
- Nombres de componentes: PascalCase
- Funciones y variables: camelCase
- Ejecutar: `npm run lint`

### Sin comentarios en código

El código debe ser auto-explicativo. Cero comentarios — ni JSDoc, ni docstrings descriptivos, ni `//` inline. Si sientes la necesidad de explicar algo, primero intenta renombrar variables/funciones para que el código lo diga.

Excepciones reservadas: frontmatter de migraciones Alembic (generado por la herramienta), directivas `# syntax=docker/dockerfile:1` y similares.

### Arquitectura del admin (feature-sliced)

`admin/src/` está organizado en tres zonas — respetar las reglas de import para mantener la escalabilidad multi-proyecto.

```
admin/src/
├── app/              # shell: MainLayout, guards, providers, sider-config
├── shared/           # reusable entre features: AuthContext, useIsMobile, api
└── features/
    ├── auth/         # plataforma (shared entre proyectos)
    ├── users/        # plataforma
    ├── media/        # plataforma
    ├── revision/     # plataforma (admin-only)
    ├── portal-pages/ # proyecto portalito
    ├── portal-menu/  # proyecto portalito
    ├── mapalab-layers/ # proyecto mapalab
    └── sieej-formularios/ # proyecto sieej
```

**Reglas de dependencia:**

1. Features de **proyecto** (`portal-*`, `mapalab-*`, `sieej-*`) **NO importan entre sí**. Si dos necesitan compartir código, ese código sube a `shared/` o a una feature de plataforma.
2. Features de **proyecto pueden consumir** features de **plataforma** (`users`, `media`, `revision`, `auth`) vía sus barrels: `import { BucketFilePicker } from '@features/media'`.
3. `shared/` **nunca** importa de `features/`.
4. `app/` solo importa de `features/` para registrar rutas y el sider (en `sider-config.jsx` y `main.jsx`).
5. Cada feature expone su API pública en su `index.js` (barrel). No importar desde paths internos de otra feature.

**Agregar un proyecto nuevo:**

1. Crear `features/<slug-proyecto>/` con estructura (`pages/`, `components/`, `hooks/`, `api/`, `index.js`).
2. Agregar entry al `PROJECT_REGISTRY` en `admin/src/app/sider-config.jsx`.
3. Insertar el proyecto en la tabla `projects` (migración backend).
4. Registrar lazy-load en `admin/src/main.jsx` + ruta en el router.

## Commits y Mensajes

### Formato

```
tipo(alcance): descripción corta

Descripción detallada (opcional)

Fixes #123
```

### Tipos de Commit

- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato (no cambia lógica)
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Mantenimiento

### Ejemplos

```bash
feat(auth): agregar endpoint de refresh token
fix(media): corregir validación de tipos de archivo
docs(readme): actualizar instrucciones de instalación
```

## Versionado y releases

El monorepo lleva **un único número de versión** (backend + admin + infra). La fuente de la verdad es `api/pyproject.toml`: es lo que `get_app_version()` reporta en `GET /ontoy`, en `/` y en la versión de los docs OpenAPI.

Para subir de versión usa el script, que sincroniza todo desde un solo comando:

```bash
./scripts/bump-version.sh 1.62.0
```

Actualiza `api/pyproject.toml` y `admin/package.json`, y abre la entrada `## [1.62.0] - <fecha>` al inicio de `docs/CHANGELOG.md` para que la rellenes con las secciones del release.

Las entradas antiguas con `[api X / admin Y]` son históricas: reflejan la etapa en que backend y admin se numeraban por separado.

## Pull Requests

### Antes de Crear PR

- [ ] Código formateado
- [ ] Pasa linting
- [ ] Todos los tests pasan
- [ ] Agregaste tests para código nuevo
- [ ] Actualizaste documentación si es necesario

### Template de PR

```markdown
## Descripción
Breve descripción del cambio

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva característica
- [ ] Breaking change
- [ ] Documentación

## ¿Cómo se ha probado?
Describe cómo probaste los cambios

## Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado self-review de mi código
- [ ] He agregado tests que prueban mi cambio
```

## Recursos

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**¡Gracias por contribuir al Mariachi!** 🎉
