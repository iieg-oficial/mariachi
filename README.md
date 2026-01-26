# Portal IIEG

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

**Portal del Instituto de Información Estadística y Geográfica de Jalisco**

</div>

## Componentes

| Componente | Descripción | Puerto Dev |
|------------|-------------|------------|
| **Web** | Portal público con React + Vite + Tailwind | 3010 |
| **Admin** | Panel de administración con React + Ant Design | 3011 |
| **Api** | API con FastAPI + PostgreSQL + Redis | 8000 |

## Inicio Rápido

### Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/IIEG/portal.git
cd portal

# Levantar infraestructura
docker compose -f docker-compose.dev.yml up postgres redis minio -d

# Api
cd api
cp .env.example .env
pip install -e ".[dev]"
uvicorn app.main:app --reload

# Web (nueva terminal)
cd web
npm install && npm run dev

# Admin (nueva terminal)
cd admin
npm install && npm run dev
```

### Producción

```bash
docker compose up -d
```

## Comandos Útiles (Makefile)

El proyecto incluye un `Makefile` para facilitar tareas comunes.

Uso: `make <comando> [ENV=dev|prod]` (por defecto `dev`)

| Comando | Descripción |
|---------|-------------|
| `make up` | Inicia el entorno (en segundo plano) |
| `make build` | Reconstruye e inicia el entorno |
| `make down` | Detiene todos los contenedores |
| `make logs` | Muestra logs en tiempo real |
| `make restart` | Reinicia el entorno |
| `make clean` | Elimina contenedores, redes y volúmenes |
| `make shell-api` | Entra a la terminal del contenedor API |
| `make shell-web` | Entra a la terminal del contenedor Web |
| `make shell-admin` | Entra a la terminal del contenedor Admin |
| `make setup` | Crea archivos .env iniciales |

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](./docs/ARCHITECTURE.md) | Estructura del monorepo y stack |
| [Conexión Frontend](./docs/FRONTEND_CONNECTION.md) | Integración con backend |
| [Cookies y CSRF](./docs/COOKIES_CSRF.md) | Seguridad de autenticación |
| [Contribución](./CONTRIBUTING.md) | Guía para contribuidores |
| [Changelog](./CHANGELOG.md) | Historial de cambios |

## Licencia

[MIT](./LICENSE) - Instituto de Información Estadística y Geográfica de Jalisco
