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
| **Frontend** | Portal público con React + Vite + Tailwind | 3010 |
| **CMS** | Panel de administración con React + Ant Design | 3011 |
| **Backend** | API con FastAPI + PostgreSQL + Redis | 8000 |

## Inicio Rápido

### Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/IIEG/portal.git
cd portal

# Levantar infraestructura
docker compose -f docker-compose.dev.yml up postgres redis minio -d

# Backend
cd backend
cp .env.example .env
pip install -e ".[dev]"
uvicorn app.main:app --reload

# Frontend (nueva terminal)
cd frontend
npm install && npm run dev

# CMS (nueva terminal)
cd cms
npm install && npm run dev
```

### Producción

```bash
docker compose up -d
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](./docs/ARCHITECTURE.md) | Estructura del monorepo y stack |
| [Conexión Frontend](./docs/FRONTEND_CONNECTION.md) | Integración con backend |
| [Cookies y CSRF](./docs/COOKIES_CSRF.md) | Seguridad de autenticación |
| [Contribución](./CONTRIBUTING.md) | Guía para contribuidores |
| [Changelog](./CHANGELOG.md) | Historial de cambios |

### READMEs Específicos

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [CMS README](./cms/README.md)

## Licencia

[MIT](./LICENSE) - Instituto de Información Estadística y Geográfica de Jalisco
