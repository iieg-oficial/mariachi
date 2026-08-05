# Llaves del embed de mapalab

mariachi es el registro de las llaves con las que otros sitios embeben el visor de mapalab. Emite,
valida y audita; mapalab solo pregunta. El componente que consume estas llaves y sus atributos están
documentados en `mapalab/docs/widget.md`.

## Reparto de responsabilidades

| Quién | Qué hace |
|---|---|
| **mariachi** | Emite las llaves, guarda su hash, valida cada petición y registra los accesos |
| **mapalab** | Exige la llave en `/embed` y `/api/embed/*`, cachea el veredicto y sirve los tiles |
| **gateway-hub** | Decide con su CSP si el navegador puede cargar el script y montar el iframe |

## Modelo

`mapalab_api_keys`, en la BD de mariachi. La llave en claro **no se persiste**: se guarda el hash y
un prefijo visible para identificarla en la UI.

| Campo | Para qué |
|---|---|
| `visibility` | `public` (`mk_pub_…`, va en el navegador) o `private` (`mk_priv_…`, servidor a servidor) |
| `key_prefix` | Los primeros caracteres, lo único que se vuelve a mostrar |
| `key_hash` | `hash_password(sha256(llave))`, en `services/mapalab_keys.py` |
| `dominios_permitidos` | Allowlist de orígenes. Obligatoria en llaves públicas |
| `ips_permitidas` | Allowlist de IPs, solo para llaves privadas |
| `capas_permitidas` | Si tiene entradas, solo esas capas. **Vacío significa todas las públicas** |
| `cuota_diaria` / `cuota_mensual` | Tope de peticiones; excederlo devuelve 429 |
| `estado` | `active`, `suspended` o `revoked` |
| `expira_en` | Opcional. Al vencer se rechaza con `reason=expired`, pero **el estado sigue en `active`** |

## Endpoints

Administración en `/api/mariachi/mapalab/api-keys`, con rol `tetlamamakani` y CSRF:

| Método | Ruta | Nota |
|---|---|---|
| `POST` | `""` | Devuelve la llave en claro **una sola vez** |
| `PATCH` | `/{id}` | Dominios, capas, cuotas, expiración |
| `POST` | `/{id}/rotate-key` | Llave nueva; la anterior deja de servir |
| `POST` | `/{id}/revoke`, `/suspend`, `/reactivate` | Ciclo de vida |
| `GET` | `/{id}/events`, `/usage`, `/accesos` | Auditoría |

Validación en `/api/mariachi/internal/mapalab/keys/validate`, que consume mapalab con
`X-Internal-Token`. Comprueba, en orden: que la llave exista y su hash coincida, el estado, la
expiración, el origen contra `dominios_permitidos`, la IP si es privada, y las capas pedidas contra
`capas_permitidas`. Responde `{valid, reason, capasPermitidas, dominiosPermitidos, cuotas…}`.

## Tres comportamientos que sorprenden

**Un `PATCH` no invalida la caché de mapalab.** `notify_invalidate_cache` se dispara al rotar,
revocar y suspender, no al editar. mapalab cachea los veredictos `EMBED_KEY_CACHE_TTL_SECONDS`
(300 s por defecto) y **solo cachea los válidos**: por eso *agregar* un dominio surte efecto de
inmediato —el rechazo nunca se guardó— mientras que *quitar* uno o recortar `capas_permitidas`
tarda hasta cinco minutos en aplicarse. Si el cambio es por un incidente, suspender la llave sí es
inmediato.

**Los accesos denegados no quedan en la auditoría.** `mapalab_api_keys_accesos` tiene
`api_key_id NOT NULL`, y una llave rechazada por origen no resuelve id. La tabla responde "quién
usó la llave", no "quién lo intentó". Para lo segundo, el log del gateway, que trae el referer del
iframe.

**`capas_permitidas` vacío no es "ninguna capa", es "todas las públicas".** Un embed que solo pinta
un marcador no necesita capas, pero si se deja el campo vacío la llave habilita el proxy WMS
completo. Como la llave pública viaja al navegador y el `Origin` es falsificable fuera de él,
conviene listar una capa cualquiera para acotar el alcance.

## Emitir una llave sin el panel

Si el panel no está disponible, el alta se puede hacer con el propio código dentro de
`mariachi-api`, reusando `generate_api_key` y `_record_event` para que el registro quede idéntico al
del endpoint. Es el camino de emergencia, no el habitual: no valida CSRF ni rol, así que el criterio
de a quién se le entrega una llave queda en quien ejecuta el script.
