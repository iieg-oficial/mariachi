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

- Node.js >= 20 (admin y web)
- Python 3.12+ (api)
- Docker y Docker Compose
- Git

### Setup Inicial

```bash
git clone https://github.com/IIEG/mariachi.git
cd mariachi
make setup            # Crea .env.{development,staging,production}
make up               # Levanta entorno dev (admin, web, api, postgres, redis)

# Desarrollo local sin Docker
# Backend (api/)
cd api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Portal publico (web/)
cd ../web
npm install
npm run dev

# CMS (admin/)
cd ../admin
npm install
npm run dev
```

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

### Admin y Web (JavaScript/React, `admin/` y `web/`)

- Usar ESLint configurado
- Nombres de componentes: PascalCase
- Funciones y variables: camelCase
- Ejecutar: `npm run lint`

### Sin comentarios innecesarios

El código debe ser auto-explicativo. Comentarios solo para lógica de negocio compleja.

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
