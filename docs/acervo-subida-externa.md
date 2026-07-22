# Subida externa al Acervo (endpoint interno)

Endpoint para que una plataforma externa del ecosistema (hoy el **Portal**, repo
`iieg/portal/`) suba archivos al Acervo **sin sesión de Mariachi**, autenticándose con un
token de servicio.

`POST /api/internal/acervo/upload`

## Por qué un broker y no S3 directo

El Acervo (SeaweedFS) usa credenciales por bucket (`<bucket>-user`) y cada servicio del
ecosistema normalmente escribe por S3 directo con las suyas. Para el Portal **no** se
hace así porque:

- Es código que no controlamos, operado por juniors → riesgo alto de fuga de credencial
  o de borrado accidental.
- `portal` e `iieg` son buckets **públicos institucionales** (logos, avatars, assets del
  portal). Una llave `Write:portal` permite **borrar y sobrescribir** todo el bucket, y
  SeaweedFS no scopa por prefijo.

Por eso el Portal solo obtiene **subida** vía este endpoint. El borrado, la edición y la
vista los hace el staff desde el Acervo de Mariachi. La credencial que se comparte es un token
acotado (solo alta, solo `portal`, con validación y auditoría), no llaves S3.

## Autenticación

Header `X-Internal-Token` con el valor de `ACERVO_INTERNAL_TOKEN` (definido en el `.env`
de mariachi-api). El token es la única credencial; **no** se usa lista de IPs (el FortiGate
colapsa las IPs de origen, así que un allowlist por IP no discrimina). Ver
[context.md](context.md) y la memoria del proyecto sobre `iieg-network`.

- Sin token configurado en el servidor → `503`.
- Token ausente o inválido → `401`.

## Transporte

- **Misma red (iieg-network):** `http://mariachi-api:8000/api/internal/acervo/upload`.
- **Otro servidor (producción):** por el gateway, `https://<dominio>/api/internal/acervo/upload`.
  Requiere la `location ^~ /api/internal/acervo/` en `gateway-hub` (sin `bot-protection`,
  con settings de upload); si no, el cliente HTTP recibe `403` por bot-protection.

## Parámetros (`multipart/form-data`)

| Campo | Req | Descripción |
|---|---|---|
| `file` | sí | Archivo. Máx 25 MB. |
| `bucket_name` | sí | Debe ser `portal` (único permitido para el token actual). |
| `folder` | no | Carpeta destino (ej. `branding`). Default raíz. |
| `on_conflict` | no | `rename` (default, agrega sufijo) o `reject` (409 si ya existe). |
| `use_uuid` | no | `true` para nombre de objeto aleatorio. |
| `alt` | no | Texto alternativo (metadata). |

Tipos permitidos: imágenes (PNG, JPG, GIF, WebP, SVG), PDF, documentos de oficina,
texto/CSV/JSON/XML/GeoJSON y ZIP. Fuera de la lista → `415`. Sobre el tamaño → `413`.

## Ejemplo

```bash
curl -X POST "https://<dominio>/api/internal/acervo/upload" \
  -H "X-Internal-Token: $ACERVO_INTERNAL_TOKEN" \
  -F "file=@logo.png" \
  -F "bucket_name=portal" \
  -F "folder=branding"
```

Respuesta `201`:

```json
{
  "name": "branding/logo.png",
  "originalName": "logo.png",
  "url": "https://.../acervo/portal/branding/logo.png",
  "thumbnailUrl": "/acervo/thumb/portal/branding/logo.png?w=320",
  "bucket": "portal",
  "bucketId": 1,
  "folder": "branding/",
  "size": 12345,
  "type": "image/png"
}
```

El archivo **no** persiste una fila `AcervoFile` (no hay usuario que atribuir); aparece en
Mariachi igualmente porque el listado lee los objetos del bucket directo.

## Archivos

| Pieza | Ubicación |
|---|---|
| Endpoint | `api/app/api/routes/acervo_internal.py` |
| Resolver de política (seam) | `api/app/services/acervo_upload_clients.py` |
| Setting del token | `api/app/core/settings.py` (`acervo_internal_token`) |
| Montaje del router | `api/app/main.py` |
| Ayuda en Mariachi | Documentación → pestaña Acervo → "Subida externa" (`admin/src/features/documentacion/topics/AcervoTopic.jsx`) |
| Location del gateway | `gateway-hub/nginx/templates/gateway.conf.template` |

## Escalar a más plataformas

Hoy el token del `.env` mapea a una política fija (`buckets={portal}`) en
`resolve_upload_client()`. Ese es el **seam**: cuando entren más plataformas, se crea un
registro `acervo_upload_clients` (patrón `source_apps` de Colibri) con key hasheada y
rotable, `allowed_buckets`, `allowed_prefix`, límites y estado, administrable desde Mariachi.
`resolve_upload_client()` pasa a consultar la tabla por prefijo/hash **sin cambiar el
endpoint**. Alta de una plataforma nueva = crear fila, elegir buckets, rotar la key,
entregarla. Cero redeploy.

## Despliegue coordinado

1. mariachi-api con `ACERVO_INTERNAL_TOKEN` en su `.env`.
2. `location ^~ /api/internal/acervo/` en gateway-hub.

Si se invierte el orden, el Portal recibe `403` (bot-protection del gateway) o `503`
(token sin configurar) hasta que ambos estén desplegados.
