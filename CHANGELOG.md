# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Agregado
- Unificación de repositorios (backend, frontend, cms) en monorepo
- Docker Compose unificado para todos los servicios
- Documentación centralizada en `docs/`

---

## Backend

### [1.2.0] - 2025-11-05

#### Agregado
- Schema `FolderCreate` para validación de creación de carpetas
- Schema `FolderResponse` para respuestas de carpetas

#### Cambiado
- Endpoint `POST /media/folders` ahora acepta JSON body

#### Corregido
- Error 422 al crear carpetas desde el CMS

### [1.1.0] - 2025-11-05

#### Agregado
- Sistema de cookies httpOnly para tokens JWT
- Tokens CSRF firmados con JWT
- Middleware `verify_csrf()` para endpoints mutables
- Documentación `COOKIES_CSRF.md`

#### Cambiado
- Login ahora establece cookie httpOnly
- Todos los endpoints mutables requieren CSRF token

### [1.0.0] - 2024-11-04

#### Agregado
- Sistema de autenticación OAuth2 + JWT
- Gestión de usuarios con roles (tetlamamakani, editora, diseñadora)
- Sistema de páginas dinámicas con secciones y componentes
- Gestión de menú jerárquico
- Integración con MinIO/S3 para media
- Sistema de layouts configurables
- Historial de acciones
- Búsqueda global de contenido
- Docker Compose con PostgreSQL, Redis, MinIO

---

## Frontend

### [0.0.2] - 2025-11-05

#### Agregado
- Servicios API: `layoutService`, `menuService`, `pageService`, `styleService`
- Header personalizable con datos del backend
- Menú de navegación dinámico

#### Cambiado
- Refactorización a servicios por dominio
- GlobalProvider con carga paralela de datos

### [0.0.1] - 2025-09-15

#### Agregado
- Inicialización del proyecto
- Estructura básica React + Vite + Tailwind

---

## CMS

### [0.0.4] - 2025-11-05

#### Agregado
- Componente `MediaSelector` para selección de archivos
- Componentes `HeaderLayoutForm` y `FooterLayoutForm`
- Sistema de header personalizable

#### Cambiado
- Página `Layouts.jsx` refactorizada (-79% líneas)

### [0.0.3] - 2025-11-05

#### Agregado
- Soporte para cookies httpOnly
- Interceptor de Axios para CSRF

#### Cambiado
- Migración de `localStorage` a `sessionStorage` para CSRF

### [0.0.2] - 2025-10-28

#### Cambiado
- Migración de Tailwind CSS 4 a Ant Design 5

### [0.0.1] - 2025-10-28

#### Agregado
- Inicialización del proyecto CMS
- React 19 + Vite 7 + Ant Design 5
