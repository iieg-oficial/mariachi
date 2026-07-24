# Colibri — sistema de reportes embebible y centralizado

Colibri es el modulo de mariachi/api responsable de centralizar reportes (problemas, solicitudes, sugerencias, dudas, datos incorrectos, bugs) que envian usuarios desde cualquier sitio del ecosistema IIEG y, eventualmente, desde proyectos externos al ecosistema. La meta es que cualquier producto pueda integrarse con el menor friccion posible y que los administradores tengan un solo lugar para triagear, asignar y resolver.

Este documento describe la estrategia de integracion recomendada (camino A primario + camino D complementario), la arquitectura del backend multi-tenant requerida y el roadmap por fases.

## Estado actual (2026-05-07)

**Implementado y operativo:**

- Backend completo: 11 migraciones aplicadas, 7 modelos (`Reporte`, `ReporteTipo`, `ReporteGrupo`, `ReporteActividad`, `DireccionOrganizacional`, `SourceApp`, `ColibriRoute`), 7 routers admin (`/colibri/{tipos,direcciones,source-apps,routes,stats}` + `reportes` extendido + grupos + actividad), endpoint publico endurecido con API keys + CORS + rate limit + PII scrubbing + fingerprinting.
- Panel CMS con 6 paginas en `/colibri/*`: Resumen (stats avanzadas con serie por dia + breakdown), Reportes (lista plana + agrupada con dedupe), Tipos (CRUD + form builder dinamico), Direcciones (CRUD), Source apps (multi-tenancy + rotacion de keys), Routes (fan-out a Discord/Slack/webhooks).
- Widget Web Components servido en `/colibri/widget/colibri-widget.v1.js` (48 KB / 13.5 KB gzip): tres Custom Elements (`colibri-button`, `colibri-trigger`, `colibri-form`) con Shadow DOM, form dinamico, identify(), screenshot opcional, eventos DOM.
- SDK npm `@iieg/colibri-sdk` (6.9 KB raw / ~2 KB gzip) con tipos TS y errores tipados (Auth/Validation/RateLimit/Forbidden/Network).
- Guia de integracion en el topic **Colibri** de la pagina de Documentacion del admin (`/mariachi/documentacion?topic=colibri`), con pestañas Widget / Patron React / SDK / SIEEJ. (La antigua pagina `/colibri/integracion` y las docs publicas standalone `/colibri/docs/` fueron removidas y consolidadas aqui.)

**Bloqueado por politicas:** pagina de seguimiento por token (espera definicion de retencion/uso de email — ver seccion al final).

**Roadmap completo** (todas las fases activas terminadas, ver tabla al final).

## Principios

1. **Una linea para integrar.** El proyecto huesped no deberia escribir una sola linea de UI ni de fetch para tener un boton flotante de reporte funcional. Si lo necesita, que sea decision suya, no requisito.
2. **Framework-agnostic.** El stack del huesped (React, Vue, Astro, Wordpress, vanilla) no debe limitar la adopcion.
3. **Aislamiento.** El widget no debe contaminar el CSS, el bundle ni la consola del huesped.
4. **Multi-tenant desde el dia uno.** Cada huesped es un `source_app` con su propia configuracion (tipos permitidos, dominios autorizados, branding, formulario dinamico).
5. **API-first.** Todo lo que el widget hace, lo puede hacer un cliente programatico via REST.

## Camino A — Widget Web Component embebible (primario)

**Quien lo usa.** Cualquier proyecto que quiera el reporte estandar de IIEG con cero codigo.

El widget expone **tres Custom Elements** segun como quiera mostrarse en el sitio huesped:

- `<colibri-button>` — boton flotante (FAB) que abre un panel con el formulario. Para sitios existentes que quieren agregar reporte sin tocar layout.
- `<colibri-form>` — formulario embebido inline en el flujo del documento. Para landing pages dedicadas a feedback o secciones tipo "Contactanos".
- `<colibri-trigger>` — link/texto/icono inline que abre el mismo panel del FAB. Para footers, menus, parrafos contextuales o iconos junto a un dato (ej. "reportar dato incorrecto").

Los tres comparten el mismo bundle, la misma config (`source-app`, `api-key`, tipos, branding) y el mismo motor de form dinamico. Solo cambia el trigger visual: el `button` flota fijo, el `trigger` se inserta en el flujo del texto, y el `form` no tiene trigger.

### Modo 1: boton flotante (`<colibri-button>`)

```html
<script src="https://iieg.jalisco.gob.mx/colibri/widget/v1.js" defer></script>
<colibri-button
  source-app="mapalab"
  api-key="ck_pub_a8f3..."
  size="md"
  position="bottom-right"
  label="Reportar"
  icon="bug"
  color="#7c3aed"
  tipos="bug,sugerencia,duda"
  theme="auto">
</colibri-button>
```

Custom Element que se posiciona `fixed` en una esquina, abre un panel flotante (modal o popover) al hacer click y muestra el form dinamico adentro.

#### Tamanios y personalizacion del boton

| Atributo | Tipo | Default | Descripcion |
|---|---|---|---|
| `size` | enum / string | `md` | `sm` (32 px), `md` (44 px), `lg` (56 px), o un valor CSS custom (`size="72px"`) |
| `position` | enum | `bottom-right` | `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `offset` | string | `24px` | Distancia desde el borde de viewport (acepta cualquier unidad CSS) |
| `label` | string | (sin texto) | Texto al lado del icono. Si esta vacio, el boton es solo icono (FAB clasico) |
| `icon` | enum / url | `bug` | `bug`, `chat`, `feedback`, `help`, `flag`, `none`, o una URL a un SVG/PNG custom |
| `color` | css color | brand IIEG | Color de fondo del boton (texto se calcula automatico para contraste AA) |
| `shape` | enum | `circle` | `circle` (FAB redondo), `pill` (estilo capsula con label), `square` (esquinas 8 px) |
| `shadow` | enum | `md` | `none`, `sm`, `md`, `lg`. Sombras CSS predefinidas |
| `hide-on-scroll` | bool | `false` | Oculta el boton al hacer scroll hacia abajo, lo regresa al subir |
| `z-index` | number | `2147483000` | Por default casi al tope para no quedar tapado por modales del huesped |

**Ejemplos de combinaciones tipicas:**

```html
<!-- FAB chico solo icono, esquina inferior derecha -->
<colibri-button size="sm" icon="chat" />

<!-- Pill grande con texto, esquina inferior izquierda, color custom -->
<colibri-button size="lg" shape="pill" label="Reportar problema" position="bottom-left" color="#dc2626" />

<!-- Boton cuadrado mediano sin sombra para layouts minimalistas -->
<colibri-button shape="square" shadow="none" icon="feedback" />
```

### Modo 2: trigger inline (`<colibri-trigger>`)

```html
<script src="https://iieg.jalisco.gob.mx/colibri/widget/v1.js" defer></script>

<p>
  Si los datos de este indicador no se ven correctos,
  <colibri-trigger
    source-app="mapalab"
    api-key="ck_pub_a8f3..."
    as="link"
    label="reporta el problema"
    icon="flag"
    icon-position="left"
    tipos="datos_incorrectos"
    context='{"layer":"poblacion-2020","dato":"municipio-32"}'>
  </colibri-trigger>.
</p>
```

Custom Element que renderiza un trigger inline (link, texto, icono o chip) en el flujo del documento. Al hacer click abre el mismo panel modal que `<colibri-button>`, con el form dinamico adentro. Util cuando el FAB es demasiado intrusivo y el form inline es demasiado pesado para el espacio disponible.

#### Personalizacion del trigger

| Atributo | Tipo | Default | Descripcion |
|---|---|---|---|
| `as` | enum | `link` | `link` (texto subrayado estilo `<a>`), `text` (texto plano clickeable), `icon` (solo icono, sin texto), `chip` (badge con borde y padding), `menu-item` (estilo item de menu, full-width con padding) |
| `label` | string | (sin texto) | Texto del trigger. Requerido salvo cuando `as="icon"` |
| `icon` | enum / url | (sin icono) | `bug`, `chat`, `feedback`, `help`, `flag`, `external`, o URL custom |
| `icon-position` | enum | `left` | `left`, `right` |
| `color` | css color | `inherit` | Color del trigger. `inherit` toma el color del huesped (util para `as="link"`) |
| `underline` | enum | `auto` | `auto` (subrayado solo en `as="link"`), `always`, `hover`, `never` |
| `font-size` | string | `inherit` | Util cuando se inserta dentro de un parrafo y debe matchear la tipografia |
| `panel-position` | enum | `auto` | Donde abre el panel modal: `auto` (smart placement), `center` (modal clasico), `anchor` (popover anclado al trigger) |

**Ejemplos de uso:**

```html
<!-- Footer link clasico -->
<footer>
  <colibri-trigger as="link" label="Reportar problema" icon="bug" tipos="bug" />
</footer>

<!-- Icono pequenio al lado de un dato sospechoso -->
<span>Poblacion: 1,234,567</span>
<colibri-trigger as="icon" icon="flag" tipos="datos_incorrectos"
  context='{"campo":"poblacion","valor":1234567}' />

<!-- Menu item dentro de un dropdown del huesped -->
<ul role="menu">
  <li><a href="/perfil">Mi perfil</a></li>
  <li><a href="/ayuda">Ayuda</a></li>
  <li><colibri-trigger as="menu-item" label="Reportar problema" icon="bug" /></li>
</ul>

<!-- Chip discreto en un header -->
<colibri-trigger as="chip" label="Feedback" tipos="sugerencia,duda" />
```

### Modo 3: formulario inline (`<colibri-form>`)

```html
<script src="https://iieg.jalisco.gob.mx/colibri/widget/v1.js" defer></script>

<section class="container mx-auto py-12">
  <h1>¿Encontraste un problema?</h1>
  <p>Cuentanos y revisamos.</p>

  <colibri-form
    source-app="mapalab"
    api-key="ck_pub_a8f3..."
    tipos="bug,sugerencia,duda"
    layout="card"
    width="640px"
    submit-label="Enviar reporte"
    on-submit="reset">
  </colibri-form>
</section>
```

Custom Element que renderiza el formulario directamente en el flujo del documento, sin trigger ni panel flotante. Se acomoda al ancho de su contenedor por default.

#### Personalizacion del formulario

| Atributo | Tipo | Default | Descripcion |
|---|---|---|---|
| `layout` | enum | `card` | `card` (con border + shadow + padding), `bare` (sin envoltorio, hereda estilos del huesped lo mas posible), `compact` (campos en una sola columna apretada) |
| `width` | string | `100%` | Ancho del form (`100%`, `640px`, `min(100%, 720px)`, etc.) |
| `tipo-selector` | enum | `tabs` | `tabs` (pestañas arriba), `dropdown` (select), `radio` (lista de radios), `hidden` (oculto si solo hay un tipo permitido) |
| `tipo-default` | string | (primero activo) | Slug del tipo preseleccionado al cargar |
| `submit-label` | string | `Enviar` | Texto del boton de submit |
| `cancel-label` | string | (oculto) | Si se define, agrega un boton secundario de cancelar |
| `on-submit` | enum | `message` | Que hacer despues de submit exitoso: `message` (muestra confirmacion in-place), `reset` (limpia y queda listo para otro reporte), `redirect` (navega a `redirect-url`), `hide` (oculta el form) |
| `redirect-url` | url | — | Solo aplica si `on-submit="redirect"` |
| `success-message` | string | `¡Gracias! Recibimos tu reporte.` | Texto del estado exitoso (acepta `{id}` como placeholder) |
| `color` | css color | brand IIEG | Color del boton submit y acentos del form |
| `compact-labels` | bool | `false` | Labels arriba pero pequeños, estilo Material Design dense |

**Ejemplos:**

```html
<!-- Form bare dentro de una landing existente, hereda tipografia del huesped -->
<colibri-form source-app="portal" api-key="..." layout="bare" tipo-selector="dropdown" />

<!-- Form compacto en sidebar de 320 px -->
<colibri-form source-app="mapalab" api-key="..." layout="compact" width="320px" tipo-selector="hidden" tipos="sugerencia" />

<!-- Form que redirige a pagina de gracias custom -->
<colibri-form source-app="sieej" api-key="..." on-submit="redirect" redirect-url="/gracias?id={id}" />
```

### Atributos compartidos (ambos modos)

| Atributo | Tipo | Default | Descripcion |
|---|---|---|---|
| `source-app` | string | (requerido) | Slug del huesped registrado en `source_apps` |
| `api-key` | string | (requerido) | API key publica del huesped (`ck_pub_...`); valida CORS y rate limit |
| `tipos` | csv | (todos los activos) | Subset de tipos permitidos para el huesped |
| `theme` | enum | `auto` | `light`, `dark`, `auto` (sigue prefer-color-scheme) |
| `lang` | enum | `es` | `es`, `en` (i18n del UI) |
| `email-required` | bool | `false` | Forzar email obligatorio aunque la config del tipo lo deje opcional |
| `endpoint` | url | (origen del script)`/api/public/reportes` | Override del endpoint. Por default el widget lo deriva del origen desde el que se cargo el `<script>` (mismo host que la API); solo se necesita para staging/dev del huesped |
| `context` | json | `{}` | Contexto adicional inyectado en cada reporte (ej. `{"userId":42,"plan":"pro"}`) |

### Stack del bundle

- **Lit** (preferido) o Preact + custom element wrapper. Objetivo de bundle: < 30 KB gzip.
- **Shadow DOM** obligatorio. El CSS del widget no puede sangrar al huesped, y el del huesped no puede romper el widget.
- **html2canvas** opcional, lazy-loaded solo si el usuario pulsa "Adjuntar captura".
- **Sin dependencias de runtime del huesped** — bundle completamente standalone.

### Hosting y versionado

Servido por `mariachi-nginx`:

| Ruta | Caching | Contenido |
|---|---|---|
| `/colibri/widget/v1.js` | `Cache-Control: public, max-age=86400, immutable` | Bundle inmutable de la familia v1.x |
| `/colibri/widget/v1.<sha>.js` | `Cache-Control: public, max-age=31536000, immutable` | Build especifico por hash, para integraciones que pinneen exacto |
| `/colibri/widget/latest.js` | `Cache-Control: public, max-age=300` | Apunta al ultimo major estable; se desaconseja usar en prod |

Cuando se quiera publicar v2 con breaking changes, los huespedes en v1 siguen funcionando. Solo migran cuando ellos quieran cambiar el `<script src>`.

### Configuracion del widget (atributos del Custom Element)

| Atributo | Tipo | Default | Descripcion |
|---|---|---|---|
| `source-app` | string | (requerido) | Slug del huesped registrado en `source_apps` |
| `api-key` | string | (requerido) | API key publica del huesped (`ck_pub_...`); valida CORS y rate limit |
| `position` | enum | `bottom-right` | `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `tipos` | csv | (todos los activos) | Subset de tipos permitidos para el huesped |
| `theme` | enum | `auto` | `light`, `dark`, `auto` (sigue prefer-color-scheme) |
| `lang` | enum | `es` | `es`, `en` (i18n del UI) |
| `email-required` | bool | `false` | Forzar email obligatorio aunque la config del tipo lo deje opcional |
| `endpoint` | url | (origen del script)`/api/public/reportes` | Override del endpoint. Por default el widget lo deriva del origen desde el que se cargo el `<script>` (mismo host que la API); solo se necesita para staging/dev del huesped |

### Eventos DOM

Ambos Custom Elements emiten los mismos eventos para que el huesped reaccione:

```javascript
document.querySelector('colibri-button').addEventListener('colibri:submitted', (e) => {
  console.log('Reporte enviado', e.detail.id);
});
```

| Evento | `detail` | Cuando | Aplica a |
|---|---|---|---|
| `colibri:ready` | `{}` | El componente termino de cargar config y tipos | `button`, `trigger`, `form` |
| `colibri:opened` | `{}` | El panel modal se abrio | `button`, `trigger` |
| `colibri:closed` | `{}` | El panel modal se cerro | `button`, `trigger` |
| `colibri:tipo-changed` | `{ tipo: string }` | El usuario cambio el tipo de reporte en el selector | `button`, `trigger`, `form` |
| `colibri:submitted` | `{ id: number, tipo: string }` | Reporte creado exitosamente | `button`, `trigger`, `form` |
| `colibri:error` | `{ message, status }` | Falla la creacion | `button`, `trigger`, `form` |

### API publica programatica

Cada Custom Element expone metodos en la instancia para control externo:

```javascript
// boton flotante
const btn = document.querySelector('colibri-button');
btn.open({ tipo: 'bug', context: { route: '/dashboard', userId: 42 } });
btn.close();
btn.report({ tipo: 'sugerencia', mensaje: 'Idea X' }); // headless, sin abrir UI

// trigger inline (mismos metodos que el boton: comparten panel)
const trigger = document.querySelector('colibri-trigger');
trigger.open({ tipo: 'datos_incorrectos', context: { layerId: 42 } });
trigger.close();

// form inline
const form = document.querySelector('colibri-form');
form.setTipo('bug');
form.setValues({ url_afectada: location.href });
form.reset();
form.submit(); // submit programatico (respeta validacion)
```

## Camino D — API + SDK liviano (complementario)

**Quien lo usa.** Proyectos que necesitan reportar programaticamente sin UI (un cron que detecta error, un Lambda que recibe webhook, una integracion server-to-server, una app movil nativa). Tambien proyectos que quieren su propia UI custom.

**Como se ve.**

```javascript
import { Colibri } from '@iieg/colibri-sdk';

const colibri = new Colibri({
  sourceApp: 'mapalab-cron',
  apiKey: 'ck_priv_b7e2...',
  baseUrl: 'https://iieg.jalisco.gob.mx/api/public'
});

await colibri.report({
  tipo: 'bug',
  mensaje: 'Pipeline ETL fallo en step 3',
  email: 'oncall@iieg.gob.mx',
  context: { jobId: 'abc-123', step: 3, error: 'TimeoutError' }
});
```

### SDK characteristics

- **Solo HTTP + tipos.** Sin UI, sin DOM, sin React. < 5 KB gzip.
- **Publicado en npm como `@iieg/colibri-sdk`.** Tipos TypeScript incluidos.
- **Misma autenticacion que el widget:** API key + CORS + rate limit.
- **Funciona en Node y navegador.** Usa `fetch` global; sin polyfills. En Node/workers `baseUrl` **debe ser absoluto** (ej. `https://iieg.jalisco.gob.mx/api/public`); en el browser puede ser relativo. Si se omite un `baseUrl` absoluto fuera del browser, el constructor lanza un error explicito en vez de fallar en el primer request.
- **Errores tipados:** `RateLimitError`, `ValidationError`, `AuthError`, `ForbiddenError`, `NetworkError`.

### Endpoints REST documentados

Todo lo que el SDK hace esta en `POST /api/public/reportes` y un endpoint publico read-only para que terceros puedan implementar su propio cliente sin el SDK:

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| POST | `/api/public/reportes` | API key + CORS | Crear reporte (multipart si trae screenshot) |
| GET | `/api/public/reportes/tipos` | Ninguna | Lista de todos los tipos activos, con su `formSchema`. `Cache-Control: public, max-age=300`. No filtra por `source_app` (el widget aplica el subset `tipos` del lado cliente). |

## Como se complementan A y D

| Caso de uso | Camino |
|---|---|
| Boton flotante en una SPA | A |
| Reporte en Wordpress | A |
| Reporte desde un sitio estatico | A |
| Cron de Node que reporta fallas | D |
| Worker de Cloud Run | D |
| App movil React Native | D |
| App con UI custom de reporte | D (con widget oculto, solo metodos) |
| Sitio que quiere boton estandar pero ademas reportar errores JS automaticos | A + D |

El SDK del camino D es el cliente HTTP que el widget del camino A usa internamente. Misma libreria, dos consumidores. Esto evita drift entre la UX del widget y la API publica.

## Multi-tenancy: tabla `source_apps`

Para que cualquier proyecto (no solo mapalab/sieej/portal) pueda integrarse, `reportes.source_app` deja de ser un string libre y pasa a ser FK contra una tabla editable desde el panel admin:

```
source_apps
  id, slug (unique), nombre, descripcion,
  api_key_hash       string  -- hash del token, igual que passwords
  api_key_prefix     string  -- primeros 8 chars para identificar visualmente
  dominios_permitidos jsonb  -- ["https://mapalab.iieg.gob.mx", "*.iieg.gob.mx"]
  tipos_permitidos    jsonb  -- ["bug", "sugerencia"] o null = todos
  rate_limit_per_hour integer default 60
  branding            jsonb  -- { color_primario, logo_url, nombre_visible }
  notificar_discord   bool
  discord_webhook_url string  -- override del webhook por huesped (opcional)
  activo              bool
  creado_en, actualizado_en
```

### Validacion en el endpoint publico

El endpoint `POST /api/public/reportes` debe:

1. Leer `X-Colibri-Key` del header (o `api_key` en multipart).
2. Validar el hash contra `source_apps.api_key_hash`.
3. Validar que `Origin` matchee algun pattern de `dominios_permitidos` (CORS dinamico). Si no matchea, 403.
4. Validar que `payload.tipo` este en `tipos_permitidos` del huesped.
5. Aplicar `rate_limit_per_hour` por (`source_app_id`, IP).
6. Crear el reporte y disparar la notificacion al webhook del huesped si esta configurado, o al global si no.

### Tipos de API key

| Prefijo | Uso | Donde vive |
|---|---|---|
| `ck_pub_*` | Widget en navegador | Visible en HTML del huesped (es publica por diseño) |
| `ck_priv_*` | SDK server-side | Variable de entorno del huesped, nunca en cliente |

La diferencia operativa: las `ck_pub_*` solo aceptan requests con `Origin` matcheando `dominios_permitidos`; las `ck_priv_*` no validan CORS pero requieren que `dominios_permitidos` incluya `null` o un valor sentinel `server-side`.

## Form dinamico por tipo

Cada `reporte_tipo` define su propio formulario via `form_schema` JSON:

```json
{
  "campos": [
    { "key": "mensaje", "label": "Describe el problema", "type": "textarea", "required": true, "max_length": 2000 },
    { "key": "url_afectada", "label": "URL donde paso", "type": "url", "required": false },
    { "key": "navegador", "label": "Navegador", "type": "select", "options": ["Chrome", "Firefox", "Safari", "Edge", "Otro"] },
    { "key": "email", "label": "Tu email (opcional)", "type": "email", "required": false }
  ]
}
```

Tipos de campo soportados: `text`, `textarea`, `email`, `url`, `select`, `multiselect`, `radio`, `checkbox`, `file` (screenshot), `direccion` (selector de `direcciones_organizacionales`).

El widget del camino A descarga `GET /portal/reportes/tipos?source_app=X` al primer open y renderiza el form correspondiente al tipo elegido. Los valores se guardan en `reportes.respuestas` (JSON) ademas de los campos canonicos (`mensaje`, `email_contacto`).

## Seguridad y abuso

| Vector | Mitigacion |
|---|---|
| Spam masivo desde un sitio | `rate_limit_per_hour` por `source_app` + IP |
| Bot que reporta sin parar | Honeypot (`website` field) ya implementado en `reportes_public.py` |
| Site clonado usando una API key publica | Validacion estricta de `Origin` contra `dominios_permitidos` |
| API key filtrada | Rotacion desde `/colibri/source-apps` (admin); revocacion inmediata |
| Screenshot con datos sensibles | Bucket privado por default; presigned URL con `Cache-Control: private`; opcion en config del huesped para deshabilitar capturas |
| XSS en `mensaje` mostrado en el widget de otro huesped | El widget nunca muestra reportes de otros usuarios; solo el panel admin los lee, donde se escapa via React |

## Hardening checklist

Items que separan un widget juguete de un sistema embebible para terceros. Las primeras cuatro son **bloqueantes pre-v1** (no se publica el widget sin ellas); las siguientes tres son hardening posterior pero deben quedar en roadmap.

### Bloqueantes pre-v1

#### H1. Auto-captura de contexto + `identify(user)`

El widget inyecta automaticamente en cada reporte:

- `userAgent`, `viewport` (`{width, height, dpr}`), `url`, `referrer`, `lang`, `timestamp` ISO-8601, `timezone`.
- `version` del huesped si esta disponible (atributo `app-version` del Custom Element o `meta[name="version"]` del documento).
- `breadcrumbs`: ultimas N entradas (default 50) de `console.log/warn/error`, navegaciones (`history.pushState`), `fetch`/`xhr` fallidos. El huesped puede deshabilitar via `breadcrumbs="false"`.

API global del huesped para enriquecer:

```javascript
window.colibri.identify({
  id: 42,
  email: 'edgar@iieg.gob.mx',
  name: 'Edgar V.',
  role: 'editor',
  metadata: { plan: 'pro', signupDate: '2025-01-15' }
});

window.colibri.setContext('subscription', { plan: 'pro', mrr: 99 });
window.colibri.addBreadcrumb({ category: 'navigation', message: 'opened dashboard' });
```

El payload del POST mezcla `identify()` + `context()` + breadcrumbs + auto-captura en `source_context`. Sin esto los reportes son anonimos sin trazabilidad y no sirven para debug.

#### H2. PII scrubbing + consentimiento explicito

- **Scrubbers configurables** aplicados antes del POST a campos de texto, URLs y breadcrumbs:
  - JWT (`eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`)
  - Tokens en query string (`token=`, `session=`, `auth=`, `key=`)
  - Emails embebidos en mensajes/URLs (configurable: scrub o keep si el campo es `email`)
  - CCN/CVV (regex Luhn-like)
  - Headers `Authorization` en breadcrumbs de fetch
- **Lista de scrubbers** se puede extender por `source_app` desde el panel admin (`source_apps.scrubbers` jsonb).
- **Modo "no PII"** activable por `source_app` (`source_apps.disable_pii: true`): elimina UA, IP, viewport, identify, breadcrumbs. Para huespedes de gobierno/salud con politica estricta.
- **Consentimiento explicito**: cuando el reporte adjunta screenshot **o** el `source_app` exige consentimiento, se muestra checkbox obligatorio "Acepto el aviso de privacidad" con link al PDF de cada huesped (`source_apps.privacy_url`).

Sin esto el riesgo legal es real: alguien reportara desde una pantalla con datos personales.

#### H3. Webhooks outbound + auto-routing

Tabla `colibri_routes` que define fan-out automatico al crear un reporte:

```
colibri_routes
  id, source_app_id (FK, null = global), tipo_id (FK, null = todos),
  destino   enum  -- 'discord', 'slack', 'linear', 'github', 'jira', 'email', 'webhook_generico'
  config    jsonb -- credenciales/URL/template del destino
  filtros   jsonb -- ej. { severidad: ['high', 'critical'], domicilio: 'cualquiera' }
  activo    bool
  orden     int
```

Casos canonicos:

- `tipo=bug` -> crea issue en Linear/GitHub con titulo, body, labels y screenshot adjunto.
- `tipo=datos_incorrectos` -> mensaje en canal Slack del equipo de datos con link al panel.
- `tipo=solicitud` + tiene `direccion_id` -> notifica al `email_contacto` de la direccion organizacional.
- `severidad=critical` -> webhook generico configurable (PagerDuty/Opsgenie).

Configurable desde `/colibri/integraciones` con templates Jinja-like para titulo/body. Sin esto la promesa de "centralizar" es vacia: los reportes mueren en el panel.

#### H4. Endurecimiento del widget

Lo que separa "widget profesional" de "widget que rompe sitios ajenos":

- **CSP-friendly**: sin `unsafe-inline`, sin `unsafe-eval`. Soporte de `nonce` via atributo `nonce="..."` del Custom Element. CSS dentro de Shadow DOM con `<style>` reemplazado por `adoptedStyleSheets`.
- **SRI publicado**: el endpoint `/colibri/widget/v1.json` devuelve `{ url, integrity, version }` para que los huespedes generen `<script integrity="sha384-...">`. El panel admin muestra el snippet correcto.
- **Aislamiento de errores**: bootstrap del widget envuelto en try/catch. Global error handler **propio** (no usa `window.onerror`) que reporta al backend de Colibri pero **nunca propaga** al huesped. Si el widget falla al renderizar, el huesped ni se entera.
- **Lazy boot**: registrar el Custom Element es lo unico que se ejecuta al cargar el script. No se hace fetch, no se agregan listeners globales, no se crea panel hasta el primer click. La auto-captura de breadcrumbs si se activa al cargar (necesario para tener historial cuando el usuario eventualmente reporte), pero detras de un buffer circular en memoria, sin enviar nada.
- **Idempotente**: si el huesped carga el script dos veces (HMR, SPA con remount), `customElements.define` se protege con guard `if (!customElements.get(...))`. Listeners no se duplican.
- **Sin globals contaminantes**: solo `window.colibri` y los tres Custom Elements. Nada en `window.<misc>`. No usar `Element.prototype` ni mutar prototipos.
- **Bundle de produccion sin sourcemaps embebidos**: sourcemaps se publican en `/colibri/widget/v1.js.map` con header `SourceMap` apuntandolos, pero solo accesibles con cookie de admin (evita exponer source a competidores/atacantes).

### Hardening posterior (fases 9-10) — implementado

#### H5. Dedupe / fingerprinting (fase 9)

Tabla `reporte_grupos` con `fingerprint` (hash sha256 determinista de `tipo + source_app + route_normalizada + mensaje[:200]`). Cada `Reporte` apunta a su grupo via `grupo_id` nullable. La normalizacion de la ruta quita querystrings y reemplaza path params numericos (`/eventos/42` -> `/eventos/:id`), por lo que dos reportes idénticos sobre IDs distintos del mismo recurso quedan en el mismo grupo.

Implementacion:

- Modelo `app/models/reporte_grupo.py` con `fingerprint` unique, `count`, `primer_reporte_id`, `ultimo_reporte_id`, `primer_visto`, `ultimo_visto`.
- Helper `app/services/colibri_fingerprint.py::compute_fingerprint`.
- Lookup-or-create atomico en `crear_reporte` con `SELECT ... FOR UPDATE SKIP LOCKED`. Si el grupo existe, incrementa `count` y mueve `ultimo_reporte_id`.
- Endpoint admin `GET /reportes/grupos/lista` que devuelve grupos ordenados por `count DESC` + representante (ultimo reporte del grupo).
- Toggle `Lista | Agrupados` (Segmented) en `ReportesListPage` que alterna entre la vista plana y la agrupada con badge `count`.

#### H6. Historial / audit log (fase 10)

Tabla `reporte_actividad` con `(id, reporte_id, actor_id, accion, detalle jsonb, nota, creado_en)`. El handler `PATCH /reportes/{id}` itera los campos cambiados y registra una fila por cada uno con `{campo, anterior, nuevo}` en `detalle`. Acciones canónicas: `estado_cambiado`, `nota_actualizada`, `asignado`, `direccion_asignada`, `severidad_cambiada`, `prioridad_cambiada`, `marcado_duplicado`, `bloqueo_cambiado`. Endpoint `GET /reportes/{id}/actividad` devuelve la lista ordenada por `creado_en DESC` con datos del actor (username, avatar). El drawer admin muestra un Collapse colapsable con Timeline AntD por cada actividad: avatar + username + label de la accion + diff `anterior → nuevo`.

#### H7. Workflow granular en `reportes` (fase 10)

Implementado en la migracion `d2e3f4a5b6c8`:

- `severidad` (string enum logico: `baja`, `media`, `alta`, `critica`).
- `prioridad` (string enum: `P0`, `P1`, `P2`, `P3`).
- `duplicado_de` FK a `reportes.id` (con guarda de auto-referencia y validacion de existencia).
- `bloqueado_por` text libre.
- `sla_at` datetime (preparado, calculo automatico queda para una iteracion posterior basada en politicas de SLA del IIEG).

Todos editables desde `ReporteDrawer`: `Select` de severidad y prioridad con tags coloreadas, `InputNumber` para `duplicado_de`, `Input` para `bloqueado_por`. Cualquier cambio dispara registro en `reporte_actividad`.

## Pendientes bloqueados (fuera del roadmap activo)

### Pagina publica de seguimiento por token

Estado: **bloqueado por politicas de uso de email**.

Idea: cada reporte genera un token corto unico (8 chars). Si el reportante dejo email, se le envia confirmacion con link `https://iieg.gob.mx/colibri/seguimiento/{token}` donde puede ver estado actual + comentarios publicos del staff sin loguearse. Cierra el loop "¿que paso con mi reporte?" y baja el ruido de seguimiento manual.

Bloqueado por: el IIEG no tiene aun politicas formales de:

1. **Retencion** del email del reportante (cuanto tiempo se guarda, cuando se purga).
2. **Uso permitido** (solo para responder al reporte? notificaciones automaticas? marketing? — debe quedar explicito en aviso de privacidad).
3. **Consentimiento** — checkbox al enviar reporte aceptando recibir el correo de confirmacion + cualquier seguimiento posterior.
4. **Derechos ARCO** — endpoint y proceso para que el reportante solicite acceso/rectificacion/cancelacion/oposicion sobre su email + reportes.

Reactivar cuando legal/compliance del IIEG defina las cuatro politicas anteriores. La implementacion tecnica es trivial (1-2 dias); el bloqueo es 100% normativo.

## Roadmap por fases

| Fase | Estado | Alcance | Migracion(es) |
|---|---|---|---|
| 1 | ✅ | Move estructural (`features/reportes` -> `features/colibri`, agregar a `PROJECT_REGISTRY`, ruta `/colibri/reportes`, pagina Resumen). Sin migraciones. | — |
| 2 | ✅ | Tabla `reporte_tipos` editable + CRUD + UI. Migrar enum -> FK con backfill. | `c8d9e0f1a2b3` |
| 2.5 | ✅ | Tabla `source_apps` con API keys, CORS dinamico, rate limit por huesped, branding. | `e1f2a3b4c5d6` |
| 3 | ✅ | Tabla `direcciones_organizacionales` + CRUD + selector en drawer. | `d0e1f2a3b4c5` |
| 4 | ✅ | `form_schema` JSON por tipo + editor visual + endpoint publico para el widget. | `f2a3b4c5d6e7` |
| 5 | ✅ | Estadisticas avanzadas (series temporales, top tipos, tiempo de resolucion). | — |
| 5.1 | ✅ | H1 — Auto-captura + `identify()`. Schema de breadcrumbs en `source_context`. SourceContextView en drawer admin. | — |
| 5.2 | ✅ | H2 — PII scrubbing (`pii_scrubber.py`). Campos `disable_pii`, `privacy_url`, `scrubbers` en `source_apps`. | `a1b2c3d4e5f7` |
| 5.3 | ✅ | H3 — Tabla `colibri_routes` + CRUD + UI `/colibri/routes`. Engine de fan-out best-effort (Discord, Slack, webhook generico, email placeholder). | `b1c2d3e4f5a6` |
| 6 | ✅ | Widget Web Components servidos en `/colibri/widget/colibri-widget.v1.js` (Lit + Vite, 48KB / 13.5KB gzip). 3 Custom Elements + Shadow DOM. | — |
| 7 | ✅ | SDK `@iieg/colibri-sdk` (TypeScript puro, 6.9KB raw / ~2KB gzip, dual ESM, errores tipados, identify, setContext). | — |
| 8 | ✅ | Guia de integracion. _(Originalmente pagina `/colibri/integracion` + docs publica `/colibri/docs/`; ambas removidas y consolidadas en el topic **Colibri** de la Documentacion del admin, `/mariachi/documentacion?topic=colibri`.)_ | — |
| 9 | ✅ | H5 — Dedupe/fingerprinting (`reporte_grupos`) + toggle agrupados en panel. | `c1d2e3f4a5b7` |
| 10 | ✅ | H6 — Audit log (`reporte_actividad`) + H7 — workflow granular (`severidad`, `prioridad`, `duplicado_de`, `bloqueado_por`, `sla_at`) + timeline en drawer. | `d2e3f4a5b6c8` |

Las fases 1-5 son independientes del objetivo embebible. Las 5.1-5.3 fueron bloqueantes pre-widget. Las 6-8 son el habilitador del objetivo "embeber a muchos proyectos". Las 9-10 endurecen la operacion bajo volumen.

**Pendientes futuras** (fuera del roadmap activo):

- Calculo automatico de `sla_at` segun politicas de SLA del IIEG (severidad + tipo).
- Hardening del widget (H4 del roadmap original) — CSP nonce, SRI publicado en `/colibri/widget/v1.json`, error isolation con global error handler propio.
- Endpoint y UI de "merge group" (un click para mergear todos los reportes de un grupo a un mismo `duplicado_de`).
- Export ARCO (cuando se definan las politicas de retencion de email).

## Organizacion del repo

Colibri vive como modulo dentro del monorepo `mariachi/`, no como repositorio separado. Razones:

- Reusa auth (cookie HttpOnly + CSRF), BD `mariachi`, `AcervoClient`, modelos `Usuario`/`AcervoBucket`, Discord notifier, Alembic, ruff y eslint ya configurados.
- Cambios atomicos backend + admin + embed + sdk en un solo PR.
- Una sola pipeline CI, un solo deploy.
- El equipo es pequeño; partir el repo prematuramente cuesta mas que mantenerlo unido.

Estructura:

```
mariachi/
├── api/                  # backend FastAPI — extiende con reporte_tipos, source_apps, etc.
├── admin/                # CMS Ant Design — features/colibri/ con todas las paginas del panel
├── widget/               # NUEVO — Web Components standalone (Lit + Vite)
│   ├── src/
│   │   ├── colibri-button.ts   # Custom Element del FAB flotante
│   │   ├── colibri-trigger.ts  # Custom Element del trigger inline (link/icono/chip)
│   │   ├── colibri-form.ts     # Custom Element del formulario inline
│   │   └── shared/             # panel modal, form dinamico, theming, fetch client (compartidos)
│   ├── dist/             # build servido por mariachi-nginx en /colibri/widget/v1.js
│   ├── vite.config.js
│   └── package.json      # name: @iieg/colibri-widget (no se publica a npm; se sirve)
├── sdk/                  # NUEVO — cliente HTTP minimalista publicable a npm
│   ├── src/
│   ├── package.json      # name: @iieg/colibri-sdk (se publica con npm publish)
│   └── tsconfig.json
└── nginx/                # extiende conf.d/mariachi.conf para servir /colibri/widget/*
```

Cada paquete tiene su propio `package.json` y build, igual que `web/` y `admin/` ya conviven sin compartir dependencias. El `widget/` no hereda React/AntD/axios del `admin/` — debe ser standalone < 30 KB gzip incluyendo ambos Custom Elements (con tree-shaking si el huesped solo usa uno). El `sdk/` solo trae tipos TypeScript y un wrapper de `fetch`, < 5 KB gzip.

### Cuando extraer a repos separados

Disparadores que justificarian mover `widget/` y/o `sdk/` a su propio repositorio:

1. El embed pasa de 3 versiones major y necesita changelog publico con release notes auditables.
2. Lo adopta un cliente externo al ecosistema IIEG (ej. otra dependencia de gobierno) que quiere auditarlo independientemente del CMS.
3. Aparece un equipo dedicado a Colibri con su propio ciclo de releases y permisos de repo.
4. El CI de mariachi se vuelve lento porque los builds del embed/sdk son pesados.

Mientras ninguno aplique, se mantiene en monorepo. La extraccion futura es trivial con `git filter-repo` preservando historial.

## Referencias

- `docs/context.md` §"Sub-rutas reservadas dentro de buckets compartidos" — donde viven los screenshots
- `api/app/api/routes/reportes_public.py` — endpoint publico actual (a extender en fase 2.5)
- `api/app/models/reporte.py` — modelo actual (a extender en fases 2-4)
- `admin/src/features/reportes/` — feature actual (a renombrar en fase 1)
