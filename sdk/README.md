# @iieg/colibri-sdk

Cliente HTTP minimalista para enviar reportes a [Colibri](https://github.com/iieg-oficial/context-ame-esta/blob/main/repos/mariachi/modulo-colibri.md), el sistema centralizado de reportes del IIEG.

Sin UI, sin DOM, sin React. Funciona en Node 18+ y en cualquier navegador moderno. < 5 KB gzip.

## Instalación

```bash
npm install @iieg/colibri-sdk
```

## Uso básico (Node)

```typescript
import { Colibri } from "@iieg/colibri-sdk";

const colibri = new Colibri({
    sourceApp: "mi-app",
    apiKey: process.env.COLIBRI_API_KEY!,        // ck_priv_...
    baseUrl: "https://iieg.gob.mx/api/public",
});

await colibri.report({
    tipo: "bug",
    mensaje: "Pipeline ETL falló en step 3",
    email: "oncall@iieg.gob.mx",
    context: { jobId: "abc-123", step: 3 },
});
```

## Uso en navegador

```typescript
import { Colibri } from "@iieg/colibri-sdk";

const colibri = new Colibri({
    sourceApp: "mi-app",
    apiKey: "ck_pub_...",                         // pública, va en el cliente
});

colibri.identify({ id: 42, email: "x@y.com", role: "editor" });
colibri.setContext("plan", "pro");

await colibri.report({
    tipo: "sugerencia",
    mensaje: "Idea: filtros guardados en el dashboard",
});
```

## Tipos de API key

| Prefijo | Uso | Donde vive |
|---|---|---|
| `ck_pub_*` | Browser | Visible en HTML del huésped (es pública por diseño). Requiere CORS configurado. |
| `ck_priv_*` | Server-side | Variable de entorno del huésped, nunca en cliente. |

Genera y rota las keys desde `/colibri/source-apps` en el panel de Colibri.

## API

### `new Colibri(options)`

| Opción | Tipo | Default | Descripción |
|---|---|---|---|
| `sourceApp` | string | (requerido) | Slug del huésped registrado en Colibri |
| `apiKey` | string | (requerido) | API key (`ck_pub_*` o `ck_priv_*`) |
| `baseUrl` | string | `/api/public` | Base URL del API público de Colibri |
| `fetchImpl` | typeof fetch | `globalThis.fetch` | Implementación de fetch (útil en Node < 18) |
| `timeoutMs` | number | `10000` | Timeout por request (0 = sin timeout) |

### `colibri.report(payload, breadcrumbs?)`

```typescript
await colibri.report({
    tipo: "bug",                                  // requerido — slug del tipo
    mensaje: "Mensaje del reporte",               // requerido
    email: "user@example.com",                    // opcional
    sourceRoute: "/dashboard/events",             // opcional (URL afectada)
    context: { customKey: "valor" },              // opcional, va en source_context.custom
    respuestas: { navegador: "chrome" },          // opcional, valida contra form_schema del tipo
});
// → { id: 1234 }
```

### `colibri.tipos(force = false)`

Devuelve los tipos activos con su `formSchema`. Cacheado 5 minutos.

```typescript
const tipos = await colibri.tipos();
for (const t of tipos) {
    console.log(t.slug, t.label, t.formSchema);
}
```

### `colibri.identify(user)`

Asocia datos del usuario logueado del huésped a los siguientes reportes.

```typescript
colibri.identify({
    id: 42,
    email: "x@y.com",
    name: "Edgar V.",
    role: "editor",
    metadata: { plan: "pro", signupDate: "2025-01-15" },
});
```

Pasar `null` limpia la identificación.

### `colibri.setContext(key, value)` / `colibri.clearContext()`

Agrega contexto custom que se incluye en cada reporte (en `source_context.custom`).

```typescript
colibri.setContext("subscription", { plan: "pro", mrr: 99 });
colibri.setContext("subscription", null);  // borra esa key
colibri.clearContext();                     // borra todo
```

## Errores tipados

```typescript
import {
    ColibriError,
    AuthError,
    ForbiddenError,
    ValidationError,
    RateLimitError,
    NetworkError,
} from "@iieg/colibri-sdk";

try {
    await colibri.report({ tipo: "bug", mensaje: "test" });
} catch (err) {
    if (err instanceof RateLimitError) {
        console.warn(`Rate limit. Reintenta en ${err.retryAfter}s`);
    } else if (err instanceof AuthError) {
        console.error("API key inválida o source app desactivado");
    } else if (err instanceof ValidationError) {
        console.error("Payload inválido:", err.detail);
    } else if (err instanceof NetworkError) {
        console.error("Error de red:", err.message);
    } else if (err instanceof ColibriError) {
        console.error("Error Colibri:", err.status, err.message);
    } else {
        throw err;
    }
}
```

## Casos de uso típicos

**Cron de Node que reporta fallas:**
```typescript
import { Colibri } from "@iieg/colibri-sdk";
const colibri = new Colibri({
    sourceApp: "mapalab-cron",
    apiKey: process.env.COLIBRI_KEY!,
});

try {
    await runJob();
} catch (err) {
    await colibri.report({
        tipo: "bug",
        mensaje: `Cron job fallido: ${err.message}`,
        context: { stack: err.stack, env: process.env.NODE_ENV },
    });
    throw err;
}
```

**Worker de Cloud Run / Lambda:**
```typescript
const colibri = new Colibri({
    sourceApp: "ingest-worker",
    apiKey: process.env.COLIBRI_KEY!,
    timeoutMs: 3000,
});

export async function handler(event) {
    try {
        return await process(event);
    } catch (err) {
        await colibri.report({
            tipo: "bug",
            mensaje: err.message,
            context: { eventId: event.id, region: process.env.AWS_REGION },
        }).catch(() => {}); // best-effort, no bloquear
        throw err;
    }
}
```

## Ver también

- [modulo-colibri.md](https://github.com/iieg-oficial/context-ame-esta/blob/main/repos/mariachi/modulo-colibri.md) — arquitectura completa de Colibri.
- [@iieg/colibri-widget](https://github.com/iieg/mariachi/tree/main/widget) — Web Components para integraciones con UI.

## Licencia

UNLICENSED — uso interno IIEG.
