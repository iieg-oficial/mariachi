# 🔌 Guía de Conexión de Frontends

Guía completa para conectar los frontends **admin-portal** e **iieg-portal** al backend FastAPI.

---

## 📋 Índice

1. [Resumen de Cambios](#resumen-de-cambios)
2. [Admin Portal (Administración)](#admin-portal-administración)
3. [IIEG Portal (Público)](#iieg-portal-público)
4. [Iniciar Todo el Sistema](#iniciar-todo-el-sistema)
5. [Solución de Problemas](#solución-de-problemas)
6. [Endpoints Disponibles](#endpoints-disponibles)

---

## 🎯 Resumen de Cambios

### ✅ Cambios Realizados

**admin-portal:**
- ✅ Actualizado `services/api.js` para usar JWT tokens en headers
- ✅ Actualizado `AuthContext.jsx` para guardar tokens en localStorage
- ✅ Agregada variable `VITE_API_URL` en `.env.development`
- ✅ MSW (mocks) sigue activo solo en desarrollo
- ✅ En producción, todas las llamadas van al backend real

**iieg-portal:**
- ✅ Creado `services/api.js` para llamadas al backend
- ✅ Actualizada variable `VITE_API_URL` de :3000 a :8000
- ✅ Configuración lista para consumir contenido público

**backend-portal:**
- ✅ 46 endpoints implementados y funcionando
- ✅ Autenticación OAuth2 + JWT
- ✅ CORS configurado para ambos frontends
- ✅ Base de datos PostgreSQL con datos de prueba
- ✅ MinIO para archivos, Redis para caché

---

## 🛠️ Admin Portal (Administración)

### Ubicación
```
/IIEG/admin-portal
```

### Cambios Implementados

#### 1. Servicio API (`frontend/src/services/api.js`)

**Antes:**
```javascript
baseURL: '/',
withCredentials: true,
```

**Ahora:**
```javascript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/administrador',
headers: {
    Authorization: `Bearer ${localStorage.getItem('access_token')}`
}
```

**Características:**
- ✅ Lee JWT token desde `localStorage`
- ✅ Agrega header `Authorization: Bearer <token>` automáticamente
- ✅ Redirecciona a `/login` en caso de 401 (no autorizado)
- ✅ Usa variable de entorno `VITE_API_URL`

#### 2. AuthContext (`frontend/src/contexts/AuthContext.jsx`)

**Cambios clave:**
```javascript
const { access_token, user } = response.data;
localStorage.setItem('access_token', access_token);
setUser(user);

const token = localStorage.getItem('access_token');
if (!token) return;

localStorage.removeItem('access_token');
```

**Flujo de autenticación:**
1. Usuario hace login → Backend devuelve `{ access_token, user }`
2. Token se guarda en `localStorage`
3. Todas las requests subsecuentes incluyen el token en headers
4. Si el token expira (401), se elimina y redirecciona a login

#### 3. Variables de Entorno

**`.env.development` actualizado:**
```bash
VITE_PORT=3011
VITE_HOST_FRONTEND=localhost
VITE_APP_NAME=CMS Portal

# API Backend
VITE_API_URL=http://localhost:8000/api/administrador
VITE_API_TIMEOUT=10000

VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Cómo Iniciar Admin Portal

```bash
# 1. Ir al directorio
cd /IIEG/admin-portal

# 2. Instalar dependencias (si no están)
npm install

# 3. Iniciar en desarrollo
npm run dev

# Acceder en: http://localhost:3011
```

### Credenciales de Prueba

| Usuario | Password | Role | Permisos |
|---------|----------|------|----------|
| admin | admin123 | tetlamamakani | Todos |
| editora1 | editora123 | editora | Páginas, SEO |
| disenadora1 | disenadora123 | diseñadora | Layouts, Estilos |

### Modo Desarrollo vs Producción

**Desarrollo (npm run dev):**
- ✅ MSW activo para testing sin backend
- ✅ Si backend está corriendo, desactiva MSW y conecta al real
- ✅ Hot reload habilitado

**Producción (npm run build):**
- ✅ MSW deshabilitado automáticamente
- ✅ Todas las requests van a `VITE_API_URL`
- ✅ Build optimizado

---

## 🌐 IIEG Portal (Público)

### Ubicación
```
/IIEG/iieg-portal
```

### Cambios Implementados

#### 1. Nuevo Servicio API (`frontend/src/services/api.js`)

**Archivo creado:**
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/administrador';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;
```

**Uso en componentes:**
```javascript
import api from '@services/api';

const response = await api.get('/menu-items/tree');

const response = await api.get(`/pages/${pageId}`);

const response = await api.get('/search/content', {
    params: { q: 'jalisco' }
});
```

#### 2. Variables de Entorno

**`.env.development` actualizado:**
```bash
VITE_PORT=3010
VITE_HOST_FRONTEND=localhost
VITE_APP_NAME=IIEG Portal

# API Backend
VITE_API_URL=http://localhost:8000/api/administrador
VITE_API_TIMEOUT=10000

VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Cómo Iniciar IIEG Portal

```bash
# 1. Ir al directorio
cd /IIEG/iieg-portal

# 2. Instalar dependencias (si no están)
npm install

# 3. Iniciar en desarrollo
npm run dev

# Acceder en: http://localhost:3010
```

### Endpoints Públicos Disponibles

El portal público puede consumir estos endpoints SIN autenticación:

```javascript
GET /api/administrador/menu-items/tree

GET /api/administrador/pages
GET /api/administrador/pages/{id}

GET /api/administrador/layouts
GET /api/administrador/styles

GET /api/administrador/media
GET /api/administrador/media/{id}

GET /api/administrador/search/content?q={query}
GET /api/administrador/search/global?q={query}

GET /api/administrador/icons
```

---

## 🚀 Iniciar Todo el Sistema

### Opción 1: Backend + 2 Frontends (Desarrollo)

**Terminal 1 - Backend:**
```bash
cd /IIEG/backend-portal
docker-compose up -d
# Backend en: http://localhost:8000
# Docs en: http://localhost:8000/docs
```

**Terminal 2 - Admin Portal:**
```bash
cd /IIEG/admin-portal
npm run dev
# Admin en: http://localhost:3011
```

**Terminal 3 - IIEG Portal:**
```bash
cd /IIEG/iieg-portal
npm run dev
# Portal en: http://localhost:3010
```

### Opción 2: Solo Backend (Para Testing)

```bash
cd /IIEG/backend-portal
docker-compose up -d

# Probar endpoints directamente
curl http://localhost:8000/api/administrador/menu-items/tree
```

### Verificar Conexión

**1. Backend Funcionando:**
```bash
curl http://localhost:8000/health
# Debe responder: {"status":"ok"}
```

**2. Login desde CMS:**
```bash
curl -X POST http://localhost:8000/api/administrador/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Respuesta esperada:
{
  "access_token": "eyJhbGciOiJIUz...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@iieg.gob.mx",
    "name": "Administrador",
    "role": "tetlamamakani"
  }
}
```

**3. Obtener Menú Público:**
```bash
curl http://localhost:8000/api/administrador/menu-items/tree

# Respuesta: Árbol de menú en JSON
```

---

## 🐛 Solución de Problemas

### Error: "Network Error" en Frontend

**Causa:** Backend no está corriendo o CORS no configurado

**Solución:**
```bash
# 1. Verificar que backend esté corriendo
cd /IIEG/backend-portal
docker-compose ps

# 2. Ver logs del backend
docker-compose logs -f backend

# 3. Verificar CORS en backend-portal/app/main.py
# Debe incluir:
allow_origins=[
    "http://localhost:3010",  # iieg-portal
    "http://localhost:3011",  # admin-portal
]
```

### Error: "401 Unauthorized" en Admin Portal

**Causa:** Token no se está enviando o expiró

**Solución:**
```javascript
console.log(localStorage.getItem('access_token'));

```

### Error: "Failed to fetch" en IIEG Portal

**Causa:** Variable `VITE_API_URL` incorrecta

**Solución:**
```bash
# Verificar en iieg-portal/frontend/.env.development
VITE_API_URL=http://localhost:8000/api/administrador  # ✅ Correcto
# NO:
# VITE_API_URL=http://localhost:3000/api    # ❌ Incorrecto (puerto viejo)
```

### MSW Interceptando Requests en Producción

**Causa:** MSW no se deshabilitó en build

**Solución:**
```javascript
export async function startMockServiceWorker() {
    if (import.meta.env.DEV) { 
        await worker.start({...});
    }
}
```

### Puerto 8000 Ya en Uso

**Solución:**
```bash
# Ver qué está usando el puerto
sudo lsof -i :8000

# Opción 1: Matar el proceso
kill -9 <PID>

# Opción 2: Cambiar puerto en docker-compose.yml
ports:
  - "8001:8000"  # Usar 8001 externamente
```

---

## 📡 Endpoints Disponibles

### Autenticación (Requiere Login)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/administrador/auth/login` | Login con credenciales |
| POST | `/api/administrador/auth/logout` | Cerrar sesión |
| GET | `/api/administrador/auth/me` | Usuario actual |
| GET | `/api/administrador/auth/verify` | Verificar token |

### Usuarios (Solo Tetlamamakani)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/administrador/users` | Listar usuarios |
| GET | `/api/administrador/users/{id}` | Obtener usuario |
| POST | `/api/administrador/users` | Crear usuario |
| PUT | `/api/administrador/users/{id}` | Actualizar usuario |
| DELETE | `/api/administrador/users/{id}` | Eliminar usuario |

### Páginas

| Método | Endpoint | Descripción | Requiere Auth |
|--------|----------|-------------|---------------|
| GET | `/api/administrador/pages` | Listar páginas | ❌ No |
| GET | `/api/administrador/pages/{id}` | Obtener página | ❌ No |
| PUT | `/api/administrador/pages/{id}` | Crear/Actualizar | ✅ Sí |
| DELETE | `/api/administrador/pages/{id}` | Eliminar | ✅ Sí |

### Menú

| Método | Endpoint | Descripción | Requiere Auth |
|--------|----------|-------------|---------------|
| GET | `/api/administrador/menu-items` | Listar items | ❌ No |
| GET | `/api/administrador/menu-items/tree` | Árbol jerárquico | ❌ No |
| GET | `/api/administrador/menu-items/{id}` | Obtener item | ❌ No |
| POST | `/api/administrador/menu-items` | Crear item | ✅ Sí |
| PUT | `/api/administrador/menu-items/{id}` | Actualizar | ✅ Sí |
| DELETE | `/api/administrador/menu-items/{id}` | Eliminar | ✅ Sí |

### Media

| Método | Endpoint | Descripción | Requiere Auth |
|--------|----------|-------------|---------------|
| GET | `/api/administrador/media` | Listar archivos | ❌ No |
| GET | `/api/administrador/media/folders` | Listar carpetas | ❌ No |
| POST | `/api/administrador/media` | Subir archivo | ✅ Sí |
| DELETE | `/api/administrador/media/{id}` | Eliminar | ✅ Sí |
| POST | `/api/administrador/media/folders` | Crear carpeta | ✅ Sí |

### Otros Endpoints

**Layouts:** `/api/administrador/layouts`
**Estilos:** `/api/administrador/styles`
**Historial:** `/api/administrador/history` (Solo Admin)
**Búsqueda:** `/api/administrador/search/content`, `/api/administrador/search/global`
**Iconos:** `/api/administrador/icons`

Documentación completa: http://localhost:8000/docs

---

## 🔑 Autenticación en Detalle

### Flujo de Login (CMS Portal)

```javascript
const credentials = { username: 'admin', password: 'admin123' };

const response = await api.post('/auth/login', credentials);

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@iieg.gob.mx",
    "name": "Administrador",
    "role": "tetlamamakani"
  }
}

localStorage.setItem('access_token', access_token);

axios.get('/users', {
  headers: { Authorization: `Bearer ${access_token}` }
});
```

### Expiración de Tokens

**Configuración actual:**
- Tokens expiran en **30 minutos** (configurable en backend)
- Cuando expira, el backend responde con 401
- Frontend automáticamente limpia token y redirecciona a login

**Extender tiempo de sesión:**
```bash
# En backend-portal/.env
ACCESS_TOKEN_EXPIRE_MINUTES=60  # 1 hora
```

---

## 📚 Próximos Pasos

1. ✅ **Backend está corriendo** → Verificar con `docker-compose ps`
2. ✅ **Frontends configurados** → Variables de entorno actualizadas
3. ✅ **Autenticación lista** → JWT tokens funcionando
4. 🔄 **Integrar componentes** → Actualizar llamadas API en páginas específicas
5. 🔄 **Testing** → Probar todos los flujos de usuario
6. 🔄 **Producción** → Deploy con variables correctas

---

## 🆘 Ayuda

Si tienes problemas:

1. Revisa los logs del backend: `docker-compose logs -f backend`
2. Verifica CORS en DevTools > Network
3. Confirma que tokens se están guardando: `localStorage.getItem('access_token')`
4. Prueba endpoints directamente: http://localhost:8000/docs

**Documentación del Backend:** Ver `README.md` en `/IIEG/backend-portal`

---

**Actualizado:** 2024-11-04
**Versión Backend:** 1.0.0
**Compatibilidad:** admin-portal v1.0.0, iieg-portal v1.0.0
