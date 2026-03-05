# Arquitectura del Portal IIEG

## Stack Tecnológico

### Portal Web (web/)

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19.2.4 | UI library |
| React Router | 7.13.0 | Routing / SPA navigation |
| Vite | 7.3.1 | Build tool / dev server |
| TailwindCSS | 4.1.18 | Estilos (con @tailwindcss/postcss) |
| Axios | 1.13.3 | HTTP client |
| React GA4 | 2.1.0 | Google Analytics 4 |

### CMS Admin (admin/)

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19.2.4 | UI library |
| React Router | 7.13.0 | Routing / SPA navigation |
| Vite | 7.3.1 | Build tool / dev server |
| Ant Design | 6.2.2 | Componentes UI del panel admin |
| @ant-design/icons | 6.1.0 | Iconografía del CMS |
| Axios | 1.13.3 | HTTP client |
| @dnd-kit | core 6.3 / sortable 10.0 | Drag & drop (ordenamiento de elementos) |
| React GA4 | 2.1.0 | Google Analytics 4 |
| MSW | 2.12.7 | Mock Service Worker (testing) |

### Backend (api/)

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.12 | Runtime |
| FastAPI | 0.111–0.112 | Framework API REST |
| Uvicorn | 0.23+ | ASGI server (desarrollo) |
| Gunicorn + Uvicorn workers | 22–23 | ASGI server (producción) |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.13 | Migraciones de BD |
| Pydantic / pydantic-settings | 2.5+ | Validación de datos y configuración |
| python-jose | 3.3+ | JWT tokens (autenticación) |
| passlib + bcrypt | 1.7+ / 3.2+ | Hashing de contraseñas |
| Redis (driver) | 5.0+ | Cliente para cache y sesiones |
| MinIO (driver) | 7.2+ | Cliente S3 para Acervo |
| psycopg2-binary | 2.9+ | Driver PostgreSQL |
| python-multipart | 0.0.9+ | Upload de archivos |
| python-dotenv | 1.0+ | Variables de entorno |

### Dev / Testing

| Tecnología | Versión | Uso |
|------------|---------|-----|
| ESLint | 9.39.2 | Linter JS/JSX (web + admin) |
| Ruff | 0.3+ | Linter + formatter Python |
| Pytest | 8.0+ | Testing backend |
| HTTPX | 0.26+ | HTTP client async para tests |
| pytest-asyncio | 0.23+ | Soporte async en tests |
| pytest-cov | 4.1+ | Cobertura de tests |
| Mypy | 1.9+ | Type checking Python |

### Base de Datos

| Tecnología | Versión | Uso |
|------------|---------|-----|
| PostgreSQL | 16 (prod) / 18 (dev) | Base de datos relacional del portal |

### GIS / Geoespacial

| Tecnología | Versión | Uso |
|------------|---------|-----|
| GeoServer | 2.27 Kartoza | Servidor de mapas (WMS/WFS/WCS), proxy vía Nginx |
| PostGIS | — | Extensión geoespacial en DataEngine |

### Infraestructura / DevOps

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Docker | — | Contenedores para todos los servicios |
| Docker Compose | — | Orquestación (2 archivos: dev + prod) |
| Nginx | Alpine | Reverse proxy (producción) + servidor de estáticos |
| Make | — | Automatización de comandos (make up, make build, make clean) |
| Node | 24 Alpine | Imagen base para frontend y CMS |
| Python | 3.12 Slim | Imagen base para backend |

### Arquitectura

- Monorepo con 4 directorios: `web/`, `admin/`, `api/`, `nginx/`
- Red Docker compartida (`portal_network`) para comunicación entre servicios
- Dos modos: desarrollo (Vite dev server + Uvicorn --reload) y producción (Nginx estático + Gunicorn)
- Backend: arquitectura en capas — routes → services → models con schemas Pydantic
- Frontend: estructura por páginas con hooks y contextos compartidos

## Diagrama de Arquitectura

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'background': '#f3f4f6', 'primaryColor': '#f3f4f6', 'lineColor': '#6b7280'}}}%%
flowchart TB
    subgraph INTERNET["🌐 Internet"]
        U["👤 Usuario / Navegador"]
    end

    subgraph SERVIDOR["🔒 Servidor Principal — iieg.jalisco.gob.mx"]
        direction TB
        NGINX_SSL["Nginx :443 SSL + HTTP/2\n:80 → 301 → :443"]

        subgraph RUTAS["Rutas Nginx"]
            direction TB
            R_WEB["/ → Portal SPA"]
            R_CMS["/administrador → CMS"]
            R_API["/api/ → FastAPI"]
            R_GEO["/geoserver/ → GeoServer"]
            R_MAPA["/mapalab/ → MapaLab"]
            R_ACERVO["/acervo/ → Acervo"]
        end

        subgraph STATIC["Archivos Estáticos"]
            FE_WEB["Portal React 19 + Vite 7"]
            FE_CMS["CMS React 19 + Ant Design 5"]
        end

        subgraph DOCKER["Docker — portal_network"]
            direction TB
            API_SVC["FastAPI :8000"]

            subgraph DB_SVC["PostgreSQL 16 :5432"]
                PG_DB["DB: iieg_portal"]
                PG_VOL["Volume: postgres_data"]
                ALEMBIC["Alembic migrations"]
            end

            subgraph REDIS_SVC["Redis 7 :6379"]
                REDIS_CACHE["Cache / Sessions"]
                REDIS_VOL["Volume: redis_data"]
            end
        end
    end

    subgraph INST_GEO["🗺️ GeoServer"]
        subgraph GS_SVC["GeoServer 2.27 Kartoza :8080"]
            GS_WMS["WMS / WFS / WCS"]
            GS_DATA["data_dir + plugins"]
            GS_ACC["🔐 Web restringido\nSolo acceso desde el instituto"]
        end
    end

    subgraph INST_DE["🗄️ DataEngine"]
        DE_PG_PRI["PostgreSQL Primary\nPostGIS :5432 SSL"]
        DE_PG_REP["PostgreSQL Replica :5433"]
        DE_BKP["pg-backup"]
    end

    subgraph INST_MAPA["🧪 MapaLab"]
        ML_FE["Frontend SPA"]
        ML_BE["Backend Node.js :3000"]
    end

    subgraph INST_ACERVO["📦 Acervo"]
        ACERVO_S3["MinIO S3-compatible\n:9000 API · :9001 Console"]
        BKT_PORTAL["Bucket: iieg-portal"]
        BKT_MAPA["Bucket: mapalab"]
        BKT_BKP["Bucket: backups"]
    end

    U -->|"HTTPS :443"| NGINX_SSL
    NGINX_SSL --> RUTAS

    R_WEB --> FE_WEB
    R_CMS --> FE_CMS
    R_API -->|"HTTP :8000"| API_SVC
    R_GEO -->|"HTTP :8080"| GS_SVC
    R_MAPA -->|"HTTP :3000"| ML_BE
    R_ACERVO -->|"HTTPS"| ACERVO_S3

    API_SVC -->|"SQL :5432"| DB_SVC
    API_SVC -->|"TCP :6379"| REDIS_SVC
    API_SVC -->|"HTTPS S3"| BKT_PORTAL

    GS_SVC -->|"SQL :5432"| DE_PG_PRI

    ML_BE -->|"SQL :5233 solo lectura"| DE_PG_REP
    ML_BE -->|"HTTPS S3"| BKT_MAPA

    DE_PG_PRI -->|"replicación"| DE_PG_REP
    DE_PG_PRI -->|"dump"| DE_BKP
    DE_BKP -->|"HTTPS S3"| BKT_BKP

    style INTERNET fill:#ede9fe,stroke:#7c3aed,color:#4c1d95,font-weight:bold
    style SERVIDOR fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a,font-weight:bold
    style RUTAS fill:#dbeafe,stroke:#60a5fa,color:#1e40af,font-weight:bold
    style STATIC fill:#dbeafe,stroke:#60a5fa,color:#1e40af,font-weight:bold
    style DOCKER fill:#ecfdf5,stroke:#22c55e,color:#065f46,font-weight:bold
    style API_SVC fill:#86efac,stroke:#16a34a,color:#14532d,font-weight:bold
    style DB_SVC fill:#fde68a,stroke:#f59e0b,color:#78350f,font-weight:bold
    style REDIS_SVC fill:#fecaca,stroke:#ef4444,color:#7f1d1d,font-weight:bold
    style INST_GEO fill:#fff7ed,stroke:#f97316,color:#7c2d12,font-weight:bold
    style GS_SVC fill:#fdba74,stroke:#ea580c,color:#431407,font-weight:bold
    style INST_DE fill:#fef2f2,stroke:#ef4444,color:#7f1d1d,font-weight:bold
    style INST_MAPA fill:#ecfeff,stroke:#22d3ee,color:#164e63,font-weight:bold
    style INST_ACERVO fill:#faf5ff,stroke:#a855f7,color:#581c87,font-weight:bold
```

## Estructura del Monorepo

```
portal/
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── api/routes/   # Endpoints
│   │   ├── core/         # Config, security, database
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── alembic/          # Migraciones DB
│   └── scripts/          # Scripts de utilidad
│
├── frontend/             # Portal público (React)
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── contexts/
│       └── public/
│
├── cms/                  # CMS Admin (React + Ant Design)
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── services/
│       │   └── contexts/
│       └── public/
│
└── docs/                 # Documentación adicional
```

## Flujos de Trabajo

### Desarrollo Local

```bash
# Levantar servicios de infraestructura
docker compose -f docker-compose.dev.yml up postgres redis minio -d

# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend (puerto 3010)
cd frontend && npm run dev

# CMS (puerto 3011)
cd cms && npm run dev
```

### Producción

```bash
docker compose up -d
```

## Puertos

| Servicio | Desarrollo | Producción |
|----------|------------|------------|
| Frontend | 3010 | 80 (nginx) |
| CMS | 3011 | 80 (nginx) |
| Backend | 8000 | 8000 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| MinIO API | 9000 | 9000 |
| MinIO Console | 9001 | 9001 |

## Documentación Adicional

- [Conexión Frontend-Backend](./FRONTEND_CONNECTION.md)
- [Cookies y CSRF](./COOKIES_CSRF.md)
