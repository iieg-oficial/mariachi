# Sistema de Borradores (Drafts)

## Flujo General

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend (Admin)
    participant A as API Backend
    participant DB as Base de Datos

    U->>F: Modifica item de menú
    F->>A: PUT /drafts/menu_items
    A->>DB: Guarda borrador (JSON)
    A-->>F: OK

    U->>F: Recarga página
    F->>A: GET /drafts/menu_items
    A->>DB: Busca borrador del usuario
    DB-->>A: Borrador encontrado
    A-->>F: Datos del borrador
    F->>F: Restaura estado

    U->>F: Publica cambios
    F->>A: POST/PUT/DELETE /menu-items
    A->>DB: Aplica cambios
    F->>A: DELETE /drafts/menu_items
    A->>DB: Elimina borrador
```

## Modelo de Datos

```mermaid
erDiagram
    DRAFTS {
        int id PK
        string resource_type
        int user_id FK
        text data
        datetime created_at
        datetime updated_at
    }
    
    USUARIOS ||--o{ DRAFTS : "tiene"
```

## Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/drafts/{resource_type}` | Obtiene borrador del usuario actual |
| `PUT` | `/drafts/{resource_type}` | Guarda/actualiza borrador |
| `DELETE` | `/drafts/{resource_type}` | Elimina borrador |

## Uso en Frontend

```javascript
const RESOURCE_TYPE = 'menu_items';

await api.put(`/drafts/${RESOURCE_TYPE}`, {
    resource_type: RESOURCE_TYPE,
    data: JSON.stringify({ menuItems, nextTempId })
});

const draft = await api.get(`/drafts/${RESOURCE_TYPE}`);
const data = JSON.parse(draft.data);
```

## Resource Types Disponibles

| Tipo | Descripción |
|------|-------------|
| `menu_items` | Borradores del gestor de menú |
| *(futuro)* | Otros módulos pueden usar el mismo sistema |
