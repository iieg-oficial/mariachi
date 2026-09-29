# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

A partir de `1.0.0` el proyecto está en producción: se sigue versionado semántico estándar (los cambios incompatibles suben la versión mayor). El versionado se lleva de forma unificada para el monorepo (backend + admin + web + infra): **desde `1.61.0` cada release usa un único número**, con `api/pyproject.toml` como fuente de la verdad (es lo que `get_app_version()` reporta en `GET /ontoy`). Las entradas previas con `[api X / admin Y]` reflejan la etapa en que backend y admin se numeraban por separado y quedan como histórico. Las versiones previas al monorepo se listan por producto al final como histórico.

---

## [2.102.3] - 2026-09-29

### Agregado

- `make acervo-barrido` y `api/scripts/acervo_barrido.py`: recorren los buckets de acervo (menos
  `portal`), leen la cabecera de cada objeto por rango y reportan en CSV los que tienen un
  `Content-Type` activo guardado o un tipo real distinto del guardado o de su extensión. En modo
  corregir reescriben tipo real y `Content-Disposition: attachment` sin tocar el contenido; cierra
  lo que la subida anterior a la auditoría dejó guardado (C1).

## [2.102.2] - 2026-09-25

### Corregido: la Documentación ya no dice que MapaLab oculta funciones en producción

Los topics de MapaLab y Telemetría decían que el botón de personalizar y la vista por municipio
solo salían en dev y beta. Desde MapaLab 1.215.0 salen también en producción, con su badge.

## [2.102.1] - 2026-09-24

### Corregido

- Los stats excluyen el schema `mapalab` aunque un workspace lo declare, como el hotfix 1.126.1 de production.

### Eliminado

- `api/scripts/migrate_mapalab_card.py`: migraba la tabla legado `public.mapalab_card`, que
  dataengine 1.45.0 retira. Su contenido vive en `mapalab.layer_metadata` desde el bootstrap de v14.

## [2.102.0] - 2026-09-24

Reparación de la auditoría de seguridad del 2026-09-24.

### Corregido

- **XSS almacenado vía Acervo.** El tipo de un archivo subido se deriva de sus primeros bytes
  (`services/tipo_archivo.py`), no del `Content-Type` del navegador. Los campos `file` de SIEEJ
  exigen extensión permitida **y** contenido que corresponda; el explorador del Acervo, la subida
  interna, el avatar, los símbolos y la captura de Colibrí guardan el MIME detectado. HTML, SVG, XML
  y JS se guardan con `Content-Disposition: attachment`. La subida por partes toma el tipo de la
  extensión y rechaza con 415 un HTML disfrazado; la sesión de subida queda atada a quien la abrió.
- **El proxy `/acervo/proxy/...`** responde siempre con `nosniff` y, salvo imagen raster o PDF,
  con `Content-Security-Policy: default-src 'none'; sandbox` y `Content-Disposition: attachment`.
- **Permisos finos que no se aplicaban.** El admin de SIEEJ pide `sieej_formularios.create/update/
  delete` y `sieej_envios.update/export` por acción, no solo `sieej_admin.view`; grupos y catálogos
  piden `sieej_formularios.update` para escribir. La captura del respondente pide
  `sieej_envios.create`, y corregir o descartar un envío, `sieej_envios.update` y `.delete`. MEL
  edita con `mel.update`. El Acervo combina la membresía de editor con `acervo.create/update/delete`.
- **Frames:** crear, editar, borrar cámaras y aplicar la configuración pide el permiso nuevo
  `mariachi.frames.manage`. Las respuestas, la vista previa y el modo tabla enmascaran usuario y
  contraseña de la URL RTSP; editar con la URL enmascarada conserva la credencial guardada. En el
  modo tabla la URL ya no se edita.
- **Monitor del sistema:** `/sistema/monitor/*` exige `sistema.manage` y valida el nodo y el slug.
- **Enlace de cuentas con minerva:** por correo solo se enlaza un usuario sin `minerva_sub`; un sub
  distinto ya no se sobrescribe y el login vuelve con `auth_error=account_conflict`.
- **Flujo OIDC:** la cookie `mariachi_oidc_tx` va firmada con HMAC, el origen público se valida
  contra `CORS_ORIGINS` y el de `MINERVA_POST_LOGIN_URL`/`MINERVA_REDIRECT_URI`, y el `nonce` del
  `id_token` se valida (firma, `aud`, `iss`).
- **Estadísticas de capas:** vista previa, guardado, recálculo y publicación solo aceptan schemas de
  `mapalab.workspaces`, y un fallo de la base ya no devuelve su texto crudo.
- **Colibrí:** Discord sale con `allowed_mentions` vacío, Slack escapa `<!channel>`, `<!here>` y
  `@everyone`, los webhooks exigen `https` y el log ya no guarda la URL completa.
- **IP del cliente:** nginx solo confía en `X-Forwarded-For` de la red del gateway
  (`NGINX_REAL_IP_FROM`, sin recursión) y la propuesta pública de tarjeta usa el mismo helper que el
  rate limit, no el primer valor de `X-Forwarded-For`.
- Los tokens internos se comparan con `hmac.compare_digest`.
- `/ontoy` y el estado de frames ya no devuelven el texto de la excepción.
- `DELETE /formularios/mis-envios/{id}` respeta la ventana del formulario, como el resto de las
  escrituras de envíos.
- Frontend: la previsualización de acervo ya no muestra HTML, SVG ni XML (solo descarga); el resto
  va en iframe con sandbox y los PDF desde un blob con tipo forzado.
- Frontend: los adjuntos de envíos SIEEJ en el admin se descargan en vez de abrirse en otra pestaña.
- Frontend: la llave del playground del MCP ya no se guarda en localStorage y se borra la que hubiera.
- Frontend: las llaves en claro de MapaLab ya no se guardan en sessionStorage y se borran las
  existentes.
- Frontend: el playground de llaves de MapaLab manda y recibe postMessage solo con el origen del
  visor.
- Frontend: el widget de Colibrí se publica sin sourcemaps.

### Agregado

- Permiso `mariachi.frames.manage` y rol «Frames - administracion» en el manifiesto de minerva.
- El config de Frigate generado define `go2rtc.rtsp` con `FRAMES_RTSP_USERNAME` y
  `{FRIGATE_RTSP_PASSWORD}`: el restream 8554 pide credencial. Sin el usuario no se genera.
- `SIEEJ_EDICION_DESHABILITADA`: congela en la API toda escritura de envíos, el equivalente del
  `VITE_DISABLED_EDITION` que solo existía en el cliente.
- Redis con `requirepass` desde el secreto `secrets/redis_password`; la URL de conexión se arma sola.
- nginx repite los encabezados de seguridad en cada `location` que declara `add_header`.
- La tabla de eventos de la telemetría cuenta datos curiosos, regresos y sesiones reales.

### Cambiado

- El api de producción corre como el usuario `app` (uid 10001), no como root.
- Frontend: axios 1.20.0 y form-data 4.0.6 en el admin (GHSA-gcfj-64vw-6mp9, GHSA-hmw2-7cc7-3qxx).

## [2.101.0] - 2026-09-24

### Cambiado: una propiedad nueva hereda la capa de su grupo y pide su filtro

Las propiedades de un grupo comparten capa de GeoServer: medido en la base, 22 capas las usan 112
nodos y **en todos los grupos sus propiedades usan exactamente una**. Aun así el modal pedía elegir
la capa, y con el filtro «Solo no registradas» encendido por defecto **escondía justo esa**, porque
ya la usaba la primera propiedad. Crear la segunda propiedad de «Cultivos» parecía imposible.

Ahora, cuando el padre es un grupo, la capa se toma del grupo y sólo se pide lo que distingue a la
propiedad de sus hermanas: **el filtro CQL**, que antes había que ir a poner en Avanzado › Servicios.
Mientras se escribe se ve cuántos registros pesca, y un filtro que GeoServer no entiende se marca en
rojo con su mensaje.

### Cambiado: «registrar» nombraba tres cosas distintas

- **Workspaces:** «registrar» pasa a **«conectar al catálogo»**, y su estado a *conectado / sin
  conectar*. La página de workspaces pierde sus dos cajas de aviso: los pendientes van en un chip
  con el detalle en tooltip.
- **Capas de GeoServer:** fuera el switch «Solo no registradas». Se listan todas y la que ya se usa
  lleva `en el árbol ×N`: informa en vez de esconder.

### Corregido: el filtro de capas contaba las de nodos borrados

`available_only` armaba la lista de capas usadas sin mirar `deleted_at`, así que borrar un nodo
sacaba a su capa de la lista por defecto. Hoy no afectaba a ninguna, pero bastaba borrar una.

### Agregado: crear un nodo donde va, y en el orden en que va

- **«+» en cada fila** de tema, categoría y grupo: el nodo nace dentro de esa fila. El «+» de arriba
  del árbol crea en la raíz, y ahora lo dice. Antes el modal abría **siempre** en la raíz, porque la
  página le pasaba `selectedKey={null}` al árbol.
- **Posición entre hermanos** en el propio modal —al principio, después de uno, al final—, en vez de
  caer siempre al final y tener que arrastrarlo. Se aplica con `PATCH /layers/reorder`.

### Agregado: `GET /geoserver/workspaces/{alias}/layers/{capa}/count` y `with_usage`

El conteo admite `cql` y responde 400 con el texto de GeoServer si el filtro no es válido.
`GET /geoserver/workspaces?with_usage=true` agrega `layerUsage` por workspace.

## [2.100.0] - 2026-09-24

### Cambiado: elegir dónde vive un nodo nuevo

La línea de arriba del modal ya no dice sólo el nombre del padre: dice **la ruta completa**, y
cuando no hay nada seleccionado dice «la raíz del árbol» en vez de quedarse callada.

Al tocar «Cambiar» aparece un buscador en lugar del árbol desplegable: se escribe parte del nombre
y cada resultado se lee con su ruta —«Medio ambiente › Hidrología › Presas»— y su tipo a la derecha.
Con más de doscientos nodos era fácil elegir el «Presas» equivocado. **La raíz es una opción de la
lista**, no la ausencia de valor.

Sólo se ofrecen los nodos que de verdad pueden ser padres —tema, categoría y grupo—, así que ya no
se puede elegir una capa o una etiqueta y toparse con el error después.

## [2.99.0] - 2026-09-24

### Cambiado: registrar un workspace ya no se hace a ciegas

Los tres campos del modal se explicaban con letra chica debajo de cada uno; ahora la explicación
vive en el «?» de su etiqueta. **El schema de dataengine dejó de escribirse a mano**: sale de la
lista real de schemas, y si se teclea uno que no existe la UI lo marca. Era el campo más peligroso
del formulario, porque de él sale la llave con la que se busca la periodicidad de cada capa: si no
corresponde, el selector de fechas del visor aparece vacío sin decir por qué.

El **alias se valida contra los ya registrados** mientras se escribe, en vez de esperar al 409 del
servidor, y el botón se bloquea mientras choque. Al elegir el workspace se ve cuántas capas entran
al catálogo, y abajo quedan a la vista las dos llaves que se van a usar: `workspace:capa` para
metadatos y numeralia, `schema:tabla` para la periodicidad.

### Agregado: `GET /geoserver/db-schemas`

Lista los schemas de dataengine, sin los del sistema. Lo consume el selector del modal.

## [2.98.0] - 2026-09-24

### Cambiado: el alta de nodo del árbol de capas se rehízo

El modal preguntaba el tipo de nodo con un `Select` de cinco palabras y explicaba el resto con tres
cajas de aviso. Ahora el tipo son cinco tarjetas con ícono, y bajo un grupo sólo queda habilitada
**Capa**, que es lo único que cabe ahí; el tooltip de las demás dice por qué. Los tres `Alert`
—tipo de nodo, «será Propiedad» y workspaces pendientes— pasaron a íconos de información con
tooltip y a una línea con chip.

El orden sigue a la decisión: dónde vive el nodo —ya resuelto por el árbol, arriba y editable—,
qué es, de qué capa de GeoServer sale y, al final, cómo se llama. El nombre se propone desde el
nombre de la capa. **ID y slug dejan de ser dos campos que estorban**: se muestran calculados en una
línea, con «Editar» para los casos en que no sirve el automático.

Al elegir la capa aparecen sus chips —workspace, nombre y geometría—, que son la confirmación de
que es la correcta antes de crearla.

### Agregado: la geometría se resuelve al registrar, no después

`POST /layers` pregunta la geometría a GeoServer y la guarda en `geometry_type` si el alta no la
trae. Antes quedaba en blanco hasta que corriera `run_backfill_geometry_type.py` de dataengine, y
`run_refresh_hexbin.py` deja fuera del hexbin a las capas sin clasificar. El cliente de GeoServer
estrena `geometry_type()`, que distingue punto, línea, polígono y ráster —`list_fields` aplana toda
geometría a `geometry` y no servía—, y el CMS lo consulta desde
`GET /geoserver/workspaces/{alias}/layers/{capa}/geometry`.

## [2.97.0] - 2026-09-23

Acompaña a mapalab 1.186.0 (editor de tarjetas del catálogo) y se despliega antes que él.

### Cambiado: las propuestas de tarjeta se fusionan sobre la vigente

Al aprobar, la propuesta ciudadana ya no reemplaza la tarjeta completa: toma de ella título, Cifras,
Detalles y Texto, y conserva todo lo demás de la tarjeta **efectiva** (la propia de la capa o la
heredada de `mapalab.layers`): etiquetas de color, íconos con texto, columnas de cifras,
transformación del título. Los bloques que el ciudadano no edita conservan su posición en
`blockOrder`. La lógica vive en `services/mapalab_infobox_fusion.py`, pura y con tests; mapalab tiene
el espejo en `helpers/tarjetaFusion.js`. El listado del panel compara contra la tarjeta efectiva.

### Agregado: reglas de seguridad de la propuesta pública

- **Sin links nuevos.** Una propuesta solo puede traer los `href` que la tarjeta ya tenía; se revisa
  al crearla y otra vez al aprobarla.
- **Sin datos de contacto en el texto libre.** Título fijo, etiquetas, párrafos, afijos, separadores
  y unidades rechazan URLs, dominios comunes, correos y números de diez dígitos o más.
- **Párrafos de texto fijo** en los bloques de Texto, de hasta 300 caracteres. Antes todo párrafo
  exigía un campo y 80 caracteres, así que las 57 tarjetas que ya los tenían no se podían
  re-proponer.
- **Título fijo** (`headerField` que no es columna) ya no se valida como campo: respondía 400 en
  143 de 208 tarjetas.
- `raw` y `split` en filas y `raw` en cifras pasan el esquema, para no perder el formato vigente.

### Agregado: aviso a Discord de cada propuesta nueva

Cada propuesta creada se avisa al webhook `DISCORD_WEBHOOK_MAPALAB`, con la capa y el comentario.
Antes se quedaban en `/mapalab/infobox-propuestas` hasta que alguien entrara a verlas.

### Agregado: «Texto escrito a mano» en la revisión

`ConfigDiff` marca en naranja el texto libre de la propuesta que la tarjeta vigente no tenía, para que
quien aprueba vea justo lo que el ciudadano escribió.

### Corregido: la revisión truena con un título combinado

`ConfigDiff` pintaba `headerField` directo y un título de campos combinados (objeto) tumbaba la
página. Ahora muestra los campos de la combinación, igual que en las filas.

## [2.96.0] - 2026-09-21

### Cambiado: el widget de Colibrí copia los componentes de SIEEJ

El panel, el formulario y los disparadores dejan su tema propio y usan los de SIEEJ: campo gris con
anillo morado al enfocar, etiqueta con el tooltip de la «?» naranja, chips de tipo, carga de archivo
punteada y botones en píldora. Los errores salen junto a cada campo; enviado, fallo y límite
alcanzado siguen el patrón del modal de SIEEJ. En móvil el panel sale como hoja inferior. El foco se
ve en todos los controles y el panel lo atrapa mientras está abierto. El widget pasa a `1.1.0`.

### Agregado: `privacy-url` en el widget

Si el huésped la pasa (atributo o `openPanel({ privacyUrl })`), el formulario pide aceptar el aviso
de privacidad antes de enviar.

### Eliminado: el modo oscuro del widget

El atributo `theme` ya no hace nada: el ecosistema no tiene modo oscuro.

### Corregido: el endpoint público de reportes exige llave

`POST /api/public/reportes` sin `X-Colibri-Key` responde 401; antes creaba el reporte con un
`source_app` libre y sin validar origen. Las llaves `ck_priv_` que llegan desde un navegador
responden 403, y `/sistema/colibri-config` solo entrega llaves `ck_pub_`.

### Corregido: el límite por IP usa la IP real

Los límites por IP de la API leen `X-Real-IP`, que `mariachi-nginx` ya resuelve con `real_ip`. Antes
tomaban el primer valor de `X-Forwarded-For`, que manda el propio cliente.

### Corregido: agrupación, fan-out y capturas de Colibrí

La agrupación por fingerprint usa `INSERT ... ON CONFLICT` y ya no pierde reportes en concurrencia.
Discord, Slack y los webhooks salen en segundo plano, así que el 201 ya no los espera, y dejan de
recibir el correo del reportante. La captura se lee hasta 2 MB y su tipo se detecta por los bytes.
Editar y borrar reportes pide `mariachi.colibri_reportes.update`, no solo el permiso de ver.

## [2.95.0] - 2026-09-21

### Agregado: el acceso conserva de dónde vino y con qué marca

El acceso acepta un `return_to` y devuelve al usuario a esa ruta al terminar, en vez de dejarlo
siempre en el inicio del panel. Es lo que permite que SIEEJ mande a su gente al SSO y los recupere
en la página donde estaban.

El mismo `return_to` viaja por el ciclo de salida: `POST /cerrar-sesion` lo acepta y lo devuelve
dentro del `logout_url`, `/salir` lo arrastra al acceso forzado y de ahí al retorno final. Sin eso
quien cerraba sesión desde otra aplicación terminaba en el panel de mariachi, porque ese tramo se
derivaba del `redirect_uri` fijo. El flujo del propio panel, que no manda `return_to`, no cambia.

Cuando el `return_to` apunta a SIEEJ, el acceso añade un `app_branding` para que minerva muestre la
identidad de SIEEJ en lugar de la de mariachi. Es sólo una pista visual: los permisos los sigue
resolviendo el cliente real. Requiere `MINERVA_SIEEJ_BRANDING_CLIENT_ID`; sin esa variable el acceso
funciona igual, sólo con la marca de mariachi.

### Cambiado: la URL de retorno se deriva del host de la petición

El `redirect_uri` que se manda a minerva se arma con el `Host` de la petición y no con el valor fijo
de la configuración. Así el mismo despliegue atiende por IP y por nombre de DNS sin que el usuario
termine rebotado al otro origen y sin sus cookies, que son host-only.

## [2.94.0] - 2026-09-18

### Agregado: el sider separa el menú en línea del menú local

Debajo del logo hay un segment **En línea / Local**. En línea queda todo lo que también corre en
producción; Local, sólo Vine y Frames, los módulos que hablan con dispositivos de la LAN. Inicio y el
rail inferior salen en los dos. Con el sider colapsado el segment se vuelve vertical, con íconos.

La elección se recuerda, y abrir una URL de Vine o Frames cambia el menú a Local sola.

### Cambiado: el segment se enciende con `VITE_APP_ENV`

Sale sólo con `dev` o `beta`; con `prod`, o si falta, se oculta y el menú queda en línea, así que en
administración Vine y Frames no aparecen. `ENVIRONMENT` no servía: el stack local también corre con
`production`. Es build arg obligatorio: **agregarla al `.env.production` antes del deploy**, o aborta
en «Down».

### Eliminado: la badge `LOCAL`

El segment ya dice qué es local. Vine conserva su badge `TEST`.

## [2.93.4] - 2026-09-21

### Agregado: el lápiz de Recursos GeoServer edita el contenido de los `.properties`

En un `.properties` el lápiz abre **Editar archivo**: nombre y contenido en la misma ventana, con
el texto en un área monoespaciada. Guarda el contenido sobre el mismo archivo y, si cambió el
nombre, lo mueve después. En imágenes y fuentes sigue siendo solo renombrar. La lectura pide
revalidación: la descarga responde con `max-age=60` y, sin eso, reabrir el editor justo después de
guardar mostraba el texto viejo desde la caché del navegador.

Es lo que faltaba para ajustar un mosaico sin entrar al servidor. El cambio no surte efecto hasta
reindexar: GeoServer construye el índice una sola vez.

### Cambiado

- Buscar, **＋**, Reindexar mosaico y las acciones de selección suben a la fila del breadcrumb; la
  barra que iba bajo las pestañas desaparece.
- El contador de carpetas y archivos baja al pie de la lista, dentro del borde. El peso no se
  muestra: GeoServer no lo expone ni en el listado, ni en la metadata, ni en un `HEAD`.
- **Vaciar cachés** explica en un tooltip qué hace.
- El tópico de rásters con TIME ya no manda a capturar `rasterPeriodicity`: desde mapalab 1.172.1
  el visor la toma de GeoServer. Suma los gotchas de `nddi`.

## [2.93.3] - 2026-09-17

### Agregado: `make restores` puede dejar mariachi entero como el respaldo

El selector solo dejaba elegir uno de los cuatro, y quien queria volver al estado
completo tenia que saber que `restore-db` no trae las tarjetitas, porque viven en
dataengine. La opcion **`todo — postgres + tarjetitas`** corre esos dos en ese orden.

No hay opcion de «los cuatro» a proposito: `vine` es un schema de la misma base y
`roadmap` unas tablas de la misma base, asi que el dump de postgres ya los contiene.
Reaplicarlos encima mezclaria snapshots de fechas distintas sin que se note.

## [2.93.2] - 2026-09-17

### Corregido: el restore podia vaciar la base con un archivo que no servia

`postgres-restore.sh` dropeaba los schemas del dump antes de comprobar que el
archivo sirviera. La deteccion de schemas corre detras de una tuberia y el
script es `sh`, que no tiene `pipefail`: el estado que se evalua es el de `tr`,
no el de `gunzip`. Con un `.sql.gz` truncado —probado cortando un dump a
400 KB— `gunzip` imprimia `unexpected end of file`, el script seguia adelante
con la lista parcial, dropeaba los schemas y recien entonces psql fallaba a la
mitad. La base quedaba vacia y sin dump aplicado.

Ahora `gunzip -t` corre solo, fuera de cualquier tuberia, y se exige el
marcador `-- PostgreSQL database dump complete` al final del archivo.

### Corregido: el selector ofrecia dumps de otros proyectos

`restore/` y `backups/` tambien reciben los dumps de vine y roadmap, y el
selector listaba cualquier `.sql.gz` sin preguntarse de quien era. Aplicar el de
vine metia un schema `vine` en la base de mariachi; el de roadmap entra directo
a `public`, donde sus `DROP TABLE IF EXISTS` podrian llevarse tablas nuestras si
los nombres coincidieran.

El restore gana el mismo gate que ya tenia el backup: si al dump le faltan
schemas de `EXPECTED_SCHEMAS`, se rechaza antes de tocar nada. El override
`EXPECTED_SCHEMAS='...'` sigue disponible para restaurar dumps mas viejos que la
lista actual de siete.

### Corregido: un restore a medias dejaba la base a medias

psql corria sin `--single-transaction`, asi que un error a la mitad dejaba los
DROP hechos y el dump a medio aplicar. Los DROP ahora viajan en el mismo stream
que el dump y todo corre en una transaccion: si algo falla, la base queda como
estaba. Verificado inyectando un error al final del stream contra una base
desechable, psql salio con codigo 3 y no quedo ninguna tabla.

### Cambiado: `public` se limpia como los demas schemas

Se dropeaban con CASCADE solo los schemas que el dump declara con
`CREATE SCHEMA`, y `public` no aparece ahi. En `public` sobrevivia entonces lo
que el dump no conocia, mientras que en los otros seis se borraba todo. Ahora
`public` se dropea y se recrea igual, de modo que la base queda identica al
dump. `CLEAN_PUBLIC=false` conserva el comportamiento anterior.

## [2.93.1] - 2026-09-07

### Corregido: cada carpeta ausente dejaba un stacktrace en el log de GeoServer

`browse_styles_dir` trata la carpeta que no existe como lista vacia —es un caso corriente: una
carpeta pendiente, un ambito recien estrenado—, pero GeoServer 3 registra **cada 404 del Resource
API como `ERROR` con stacktrace**, dos lineas por peticion. Navegar el explorador llenaba el log de
`Undefined resource path.` sin que nada estuviera roto.

La consulta manda ahora `quietOnNotFound=true`: mismo 404, cero ruido. Comprobado contra GeoServer
3.0.0. Como reproducirlo y cuando si conviene investigarlo, en `runbook/sextante.md`.

---

## [2.93.0] - 2026-09-07

### Agregado: el roadmap se respalda y se restaura por separado

Las tres tablas del roadmap viven en el schema `public`, asi que el respaldo general
—`pg_dump` sin filtros— ya se las llevaba. Lo que no habia era manera de bajar *solo* el roadmap,
ni de devolverlo sin restaurar la base entera: recuperar un hito borrado por accidente costaba
un `restore-db` que se lleva por delante usuarios, paginas, eventos y todo lo demas.

**`make backup-roadmap`** vuelca `roadmap_hitos`, `roadmap_ciclos` y `roadmap_procesos` a
`backups/roadmap/roadmap-<sello>.sql.gz`, con las secuencias y los indices, y rota a los 30
archivos. **`make restore-roadmap`** ofrece los ultimos veinte en un selector y pide escribir
`roadmap` antes de reemplazarlos; al terminar imprime cuantos hitos, ciclos y procesos quedaron.

Existe aparte del respaldo general por la misma razon que `backup-vine`: **el contenido es captura
manual.** La migracion siembra el estado inicial del roadmap, no las fechas, los motivos, los
linajes ni la posicion de las bandas que se editaron despues; volver a correrla no recupera nada.

El dump se valida antes de guardarse. Ademas de exigir las tres tablas, cuenta los hitos y falla
si vienen menos de `HITOS_MINIMOS` (1 por defecto): un roadmap vaciado por accidente produce un
archivo del mismo peso que uno bueno, y sin ese gate rotaria a los treinta respaldos hasta borrar
el ultimo bueno.

### Agregado: `make backups` y `make restores` para no ir de uno en uno

Con el roadmap ya eran cuatro respaldos con nombre propio. **`make backups` corre los cuatro**
—postgres, vine, roadmap y tarjetitas— con el spinner y el cronometro de siempre, sigue adelante
cuando uno falla y al final dice cuantos fallaron. El general se omite fuera de produccion, que es
donde `backup-db` se niega a correr.

**`make restores` no restaura los cuatro:** abre un selector y delega en el target que elijas.
Restaurar todo en cadena no tiene sentido —`restore-db` ya trae dentro vine y el roadmap— y
mezclaria estados de sellos distintos.

El selector **exige terminal**. Sin tty `pick` elige sola la primera opcion, asi que un
`make restores` en un script o un cron restauraria algo sin que nadie lo pidiera; ahora falla y
nombra los cuatro targets directos. La opcion de la base entera quedo ultima, no primera.

## [2.92.0] - 2026-09-07

### Cambiado: la tarjeta manda, el modo edicion sobra

El modo edicion que introdujo 2.88.0 era un interruptor de mas: obligaba a entrar en un estado antes
de poder renombrar o borrar, cuando lo natural es que las acciones vivan en la tarjeta. Ahora
aparecen al pasar por encima, una por esquina del cover:

| Esquina | Accion |
|---|---|
| Superior izquierda | casilla de seleccion |
| Superior derecha | eliminar |
| Inferior izquierda | renombrar |
| Inferior derecha | descargar (ZIP en las carpetas) |

En movil salen fijas, porque ahi no hay hover. **Las casillas se contagian**: basta seleccionar una
para que aparezcan en todas, que es el gesto real de una multiseleccion.

La barra de acciones masivas ya no depende de ningun modo: sale cuando hay algo seleccionado.

### Cambiado

- **Recargar** sale del encabezado: hacia lo mismo que F5 y que volver a entrar a la pantalla. En su
  lugar queda **Vaciar cachés**, que antes vivia en la barra como «Reset» y en ingles.
- **Nueva carpeta** y **Subir archivos** se funden en un boton `+` con desplegable.
- **Buscar** es un icono que se despliega en input al pasar por encima, al hacer clic o al tabular.

### Eliminado

- La vista de lista y su interruptor Grid/Lista: nadie la usaba. Se va `GeoserverFilesList`.
- El boton de snippet SLD de cada archivo, y con el `SldSnippetModal`. La ruta sigue a la vista en la
  tarjeta para quien arme el `xlink:href` a mano.

---

## [2.91.0] - 2026-09-07

### Agregado: el explorador llega a `geoserver-raster/`

Las carpetas de los ImageMosaic no viven en `styles/` ni bajo un workspace, sino en
`geoserver-raster/<tema>/<mosaico>/`, la unica rama del data dir que el explorador no sabia abrir.
Aceptar `.properties` no bastaba: era la llave sin la puerta.

Junto a **Global (styles/)** hay ahora una pestaña **Rasters** que navega esa rama con todo lo que
tiene el explorador. Con eso, armar y mantener la carpeta de un mosaico —subir los `.tif`, ajustar
el `indexer.properties`, corregir el `timeregex.properties`— se hace desde el CMS.

El ambito viaja en el mismo parametro `workspace` con el valor reservado `__rasters__`, asi que ni
los endpoints ni la auditoria cambiaron de forma. La busqueda global tambien lo recorre.

**Los archivos del indice** (`.dbf`, `.shp`, `.shx`, `.prj`, `.qix`, `.fix`, `.dat`) se listan,
descargan y borran, pero **no se suben**: los genera GeoServer. La lista blanca de subida sigue
siendo la de antes.

**Publicar un mosaico nuevo sigue fuera del CMS.** El `PUT .../external.imagemosaic` que crea la
capa es un paso aparte; el explorador cubre la carpeta y **Reindexar** el mantenimiento.

### Cambiado: la numeralia dinamica se explica con una leyenda, no con un aviso

El grid de metadatos abria con un `Alert` que ocupaba un renglon entero para decir cuantas capas
calculan su numeralia desde la base de datos. Ahora es un cuadrito del mismo rayado que usan esas
celdas, en la barra de estado de la pestaña, junto al contador de capas sin descripcion. El detalle
—que se editan en la pestaña Metadatos de la capa— vive en su tooltip.

---

## [2.90.0] - 2026-09-07

### Agregado: el historial se descarga desde su cajón, y los datos desde Configuración general

`GET /grid/{resource}/export` ya servía las tres formas —Excel con `Metadatos` e `Historial` en dos
pestañas, o un CSV por hoja—, pero solo las ofrecía el menú de descarga de la barra, que existe
únicamente en modo tabla. Desde el árbol no había manera de bajar nada.

**El cajón del historial trae botón de descarga** en los dos modos. Baja en CSV *lo que está
mostrando*: respeta el selector «Esta capa / Todas» y, en modo árbol —donde el cajón mezcla las
rejillas de Capas y Metadatos—, agrega una columna `Rejilla` para distinguirlas. Se arma en el
cliente, sin ida al servidor, y queda inhabilitado cuando no hay cambios registrados.

**Configuración general estrena tarjeta «Descargas»** con selector de rejilla y las mismas tres
opciones de la barra. Un CSV no tiene pestañas, así que la agrupación aplica solo al Excel: las dos
opciones de CSV bajan datos e historial por separado.

De paso, la lógica de exportación que vivía dentro de `GridPanel` pasó a `useGridExport`, que ahora
comparten el panel y la tarjeta nueva, y `triggerDownload` y `downloadCsv` comparten un `saveBlob`.

---

## [2.89.0] - 2026-09-07

### Cambiado: la vista En vivo de frames deja de transmitir y ahora sondea fotos

El mosaico abría un MJPEG multipart por cámara y el backend lo proxeaba con `timeout=None`: una
conexión colgada indefinidamente por cada tarjeta. Sobre un enlace que no es la LAN del NVR
—un túnel, una VPN, una red lenta— esas conexiones se caen y la tarjeta se queda en negro.

Ahora cada tarjeta pide una foto suelta a `GET /frames/camaras/{nombre}/foto`, que trae
`latest.jpg` de Frigate y cierra. El refresco **se autorregula**: la siguiente foto se programa en
el `onLoad`/`onError` de la anterior, así que nunca hay más de una petición viva por cámara y si la
red va lenta el ritmo baja solo en vez de encimar peticiones.

`GET /frames/camaras/{nombre}/stream` y `FramesClient.mjpeg()` **siguen existiendo** para quien
tenga la API en la misma red y quiera video continuo; lo que cambió es qué usa el admin.

---

## [2.88.1] - 2026-09-04

### Corregido: el menú de propiedades del grupo se salía de la pantalla

Un grupo con muchas propiedades estiraba el menú hasta pasarse del alto de la ventana y las últimas
quedaban fuera de alcance. Ahora tiene tope de `60vh` y scroll propio.

### Cambiado: el ícono de información va a la izquierda del contador

Explica el contador, así que se lee mejor antes que después. Su ventana se ancla también a la
izquierda para no quedar colgando fuera del panel.

## [2.88.0] - 2026-09-04

### Agregado: seleccion multiple, borrado de carpetas y modo edicion en Recursos GeoServer

El explorador de recursos de sextante solo dejaba borrar archivos de uno en uno y no tenia forma de
tocar carpetas: vaciar una era entrar y borrar archivo por archivo, y renombrar significaba bajar el
archivo, volver a subirlo con otro nombre y borrar el original.

**Modo edicion** es un interruptor en la barra. Mientras esta activo aparecen las casillas de
seleccion —en grid y en lista— y los botones de renombrar; la seleccion mezcla archivos y carpetas, y
sobre ella actuan **Mover** y **Eliminar** masivos. Apagado, la pantalla queda como estaba.

**El borrado de una carpeta arrastra todo lo que contiene y no hay papelera**, asi que la
confirmacion dice cuantos archivos y subcarpetas se pierden y pide teclear el nombre de la carpeta.
Se rechaza la que contenga archivos de configuracion de GeoServer (`datastore.xml` y companiia).

Renombrar y mover van por `PUT /rest/resource/{path}?operation=move` del Resource API, que sirve
igual para archivos y para directorios. La extension de un archivo no puede cambiar —el
`content-type` dejaria de corresponder al contenido— y una carpeta no se puede mover dentro de si
misma.

### Agregado

- `GET /geoserver/files/folder/info` cuenta lo que cuelga de una carpeta antes de borrarla.
- `DELETE /geoserver/files/folder`, `POST /geoserver/files/move` y `POST /geoserver/files/bulk-delete`,
  los tres auditados en actividad.

### Agregado: el explorador acepta `.properties`

Los ImageMosaic se configuran con `indexer.properties` y `timeregex.properties` junto a los rasters.
El explorador solo aceptaba imagenes y fuentes, asi que cada ajuste de un mosaico —un `TimeFormat`
mal puesto, un `regex` que no ancla al final— exigia acceso al servidor. Ahora se suben, se
descargan, se renombran y se borran como cualquier otro recurso.

**`datastore.properties` sigue cerrado.** Un mosaico con indice en PostGIS deja ese archivo junto a
los rasters con la contrasena en claro, y es el mismo riesgo que ya cubria la lista blanca de
extensiones para `datastore.xml`. `_is_store_config` ahora reconoce las dos formas y el filtro se
aplica al listar, buscar, descargar, subir, mover y borrar: los `*store.properties` ni siquiera
aparecen en el explorador, y pedirlos por su nombre responde **403**.

El `<mosaico>.properties` que GeoServer genera como indice si es visible y se puede borrar. Es
intencional: es lo que **Reindexar** regenera.

### Nota

Mover o renombrar un archivo rompe los `xlink:href` de los SLD que lo referencian por su ruta
anterior. La UI lo advierte; no los reescribe.

---

## [2.87.3] - 2026-09-04

### Corregido: una propiedad de grupo no siempre es hija directa del grupo

Un grupo puede repartir sus variantes bajo etiquetas: «Establecimientos de salud» separa 33 filtros
CQL sobre `unidades_salud` en cuatro niveles de atencion, igual que «Clasificador de cultivos IIEG»
pero con un nivel en medio. El admin definia propiedad como parentesco directo, asi que a esas 33
capas les faltaba **el filtro CQL en el arbol**, el tipo decia «Capa» en vez de «Propiedad» y el
grupo **no ofrecia el boton de propagacion de tarjetita**. El backend de mapalab nunca tuvo el
problema: `_inherit_little_card` ya recorria todos los ancestros.

`tipoQueGobierna()` deja pasar el tipo del ancestro a traves de las etiquetas y `propiedadesDeGrupo()`
las recorre al recolectar. Con eso quedan alineados `toAntTreeData`, `propagacionDelGrupo`,
`LayerCreateModal` y el orden inicial de capas, que tenian la regla escrita cuatro veces.

### Corregido

- La pastilla del grupo contaba solo hijas directas. Ahora cuenta las variantes reales y solo marca
  **«grupo vacio»** cuando de verdad no cuelga ninguna capa; en 2.87.2 marcaba de mas.

## [2.87.2] - 2026-09-04

### Corregido: una etiqueta escondia todo lo que colgaba de ella

En el arbol del editor una etiqueta se dibuja como rotulo —sin flecha y sin click—, pero sus hijos
seguian detras del plegado, asi que nunca se podian abrir. Dejaba **43 nodos inalcanzables**: los 10
grupos de «Delitos contra el patrimonio» y las 33 capas de «Establecimientos de salud». El visor
nunca plego las etiquetas; el editor ahora hace lo mismo y las muestra siempre.

### Corregido: «grupo · N variantes» contaba nodos que no son variantes

La pastilla contaba todos los hijos. Ahora cuenta solo las capas, y un grupo que no tiene ninguna
—porque adentro trae etiquetas o categorias— se marca como **«grupo sin variantes»**, que es
justo el caso de «Establecimientos de salud».

### Cambiado

- El feature type sale del subtitulo de Metadatos y del pie de la vista previa: ya aparece en la
  ficha. Cuando el nodo hereda la metadata de sus hijas se dice eso y nada mas.
- Las secciones colapsables tenian `margin` y `padding` superiores de 28 px cada uno, 56 px de
  separacion real. Queda solo el padding.
- `key` sale del spread de props al recursar el arbol; React avisaba en consola.

## [2.87.1] - 2026-09-04

### Corregido: la pestana Metadatos reventaba al abrir el cajon de contenido

`ReferenceError: Cannot access 'y' before initialization`. Los dos `Form.useWatch` que alimentan las
bombillas de sugerencia se leian cuatro lineas antes de que se declarara el formulario. Es el segundo
fallo identico de la sesion; los dos solo aparecian al abrir la pestana en el navegador. **Vale la
pena activar `no-use-before-define`**: fue la regla que lo encontro, corrida a mano.

### Corregido: la hoja de publicacion imprimia `[object Object]`

`describeValue` hacia `join(', ')` sobre arreglos de objetos. Ahora busca con que nombrarlos —nombre,
corto, largo, texto, enlace— y si no encuentra, cuenta: «2 elementos». Fuentes, metodologia y
metadato se leen como lo que son.

### Corregido: los cambios de metadatos no mostraban su valor anterior

Salian como `?`. La hoja indexa los valores publicados por `resource_id`, y los metadatos usan el
`layer_key` como identificador, no el id de la capa: nunca encontraban con que comparar.

### Corregido: el historial se veia vacio

Abria en «Capas», que tiene cero registros —ese historial solo se escribe al publicar, y desde el
cambio a borradores no ha habido publicaciones—, mientras los que si existen son de Metadatos y
quedaban detras del selector. Ahora **trae los dos recursos y los mezcla** por fecha, con una columna
`Origen`. Se fue el selector: nada queda escondido detras de un click.

El modo tabla no cambia: sigue abriendo el panel con un solo recurso y su filtro por capa.

### Cambiado: la descripcion de la subpagina dice para que sirve, no como funciona

«Un tema o una categoria se abre; una capa se edita. Arrastra el asa…» describia el mecanismo. Queda
en «Catalogo de capas del visor. Da click en una para editarla».

## [2.87.0] - 2026-09-04

### Agregado: la ficha sugiere fecha y frecuencia desde la periodicidad

Una bombilla junto a **Frecuencia de actualizacion** y **Ultima actualizacion** abre un modal con lo
que la periodicidad de la capa indica, de donde sale y cuando se calculo. Aparece **solo cuando la
sugerencia difiere** de lo capturado, y aplicarla es una accion explicita: lo escrito a mano manda.

El dato lo deja listo el cron de dataengine en `fecha_ultima_sugerida` y `frecuencia_sugerida`
(migracion `0047`); mariachi solo lo lee. **dataengine se despliega antes**: sin esas columnas el api
responde 500. Procedimiento en `runbook/tamal-rojo.md` del repo de contexto.

### Cambiado: Apariencia es un solo panel de interruptores

Distintivo, Aviso, Resaltado, Oculta y Fuera de servicio viven en un panel sin marcos ni divisores,
con el switch primero y la etiqueta despues, y el detalle se despliega solo al encenderse. Cada uno
lleva un icono de informacion que responde a hover, click y foco —para que sirva en tactil— en vez
de texto colgando al lado.

El tipo de distintivo usa Segmented y su vista previa se fue a la derecha. El aviso ya no advierte
que le falta titulo: al encender el switch, el cursor salta al campo.

### Cambiado: el tipo de campo de municipio se detecta solo

Se recalcula al cambiar de columna, no solo cuando esta vacio, y desaparece de la vista: con la
deteccion segura queda una palomita con «Detectado como Clave INEGI» y un enlace para forzarlo.

**No se elimino el campo**, aunque parezca redundante: `nombre` lo usan **96 capas** y `clave` **85**,
y el backend genera CQL distinto para cada uno. Ademas la deteccion falla en tres casos reales —
CVEGEO de 10 digitos, claves de otro estado (el patron esta fijado a `14NNN`) y columnas con pocas
muestras—.

### Cambiado: la ficha de metadatos se lee en el orden del visor

Frecuencia y ultima actualizacion subieron bajo el nombre, como tarjetas, que es donde el visor las
pinta. Se agrego la seccion **Referencia cartografica del limite municipal**, que faltaba entre
Metodologia y Metadato. La fecha se elige con calendario en dos precisiones —solo año o fecha
exacta— en vez de texto libre, para que todas las capas usen la misma sintaxis.

En Identidad el tipo de nodo usa Segmented, los alias se llaman «Alias de enlace» y su lista solo
aparece cuando existe alguno.

### Corregido: la pestana Metadatos reventaba al abrirse

`ReferenceError: Cannot access 'tr' before initialization`. El nombre de la capa se pasaba a la
pestana 560 lineas antes de declararse, y un `const` no se puede leer antes de su declaracion. Se
movio el calculo arriba de la construccion de las pestanas.

### Corregido: la seccion Metadato de la vista previa nunca aparecia

Se filtraba por `texto` y `archivo_enlace`, que son los campos de metodologia; `metadato` usa
`nombre` y `enlace`.

## [2.86.0] - 2026-09-04

### Cambiado: deshacer y rehacer suben al encabezado

Vivían dentro del lienzo, encima de la tarjeta. Pasan al encabezado, junto al contador de
propagación, como íconos.

Y de paso se arregla algo que no se veía: **había dos pilas de deshacer**, una en el lienzo y otra
en el modo lista, cada una vigilando la misma configuración. Convivían porque nunca se usan a la
vez, pero cada cambio se apilaba dos veces y `Ctrl+Z` respondía según qué modo estuviera montado.
Ahora la pila vive en la pestaña: una sola, compartida por los tres modos.

### Agregado: vaciar la tarjetita

Un botón de escoba en el encabezado la deja en nada, con confirmación que dice qué va a pasar
después, que no es lo mismo en los tres casos: si la capa hereda, vuelve a mostrar la del grupo; si
es un grupo, sus propiedades se quedan sin ninguna y el visor les inventará una; y si es una capa
suelta, el visor le inventará una a partir de sus columnas.

La confirmación recuerda que **se deshace con Ctrl+Z** mientras no guardes, que es lo que quita el
miedo a usarlo.

## [2.85.0] - 2026-09-04

### Agregado: los breakpoints existen como tokens

Nunca se sembraron: el grupo salía vacío y no había nada que editar. La migración **`m3lbp0001`**
crea los cuatro —`sm` 640, `md` 768, `lg` 1024, `xl` 1280— para cada marca, con su descripción de qué
cambia en cada corte. Es `ON CONFLICT DO NOTHING`, así que no pisa nada si ya existieran.

Con eso el grupo vuelve a mostrar sus filas con el valor editable, como el resto.

### Cambiado: el selector de dispositivo pasa a la vista previa

Estaba en la cabecera del grupo de breakpoints, que no es donde se usa. Ahora vive junto a **Ver
todo**, encima de la pieza, porque es un control de la vista previa.

**Tablet es el ancho por omisión**, que es lo que cabe en la columna. Tablet y Mobile se dibujan ahí
mismo; **Laptop y Escritorio abren la pieza en un modal**, porque a 1024 y 1280 px ya no entran y
verlas encogidas no enseñaba nada.

---

## [2.84.0] - 2026-09-04

### Agregado: guardar refresca el árbol, sin recargar la página a mano

El contador de propagación no se movía al guardar y había que recargar el navegador. La causa no
era el contador: **el árbol se recargaba antes de que se invalidara su caché**.

Al guardar, mariachi avisa a mapalab con `notify_tree_changed`, que agrupa los avisos en una
**ventana de 5 segundos** antes de invalidar. El `await reload()` que ya había justo después de
publicar llegaba dentro de esa ventana y traía el árbol viejo, así que todo seguía igual hasta que
recargabas.

`refrescarArbol` recarga dos veces —al instante por si el caché ya estaba fresco, y otra pasada la
ventana— y devuelve el control tras la primera, para no dejar el botón de guardar girando cinco
segundos. La segunda corre sola y actualiza el contador y los puntos del árbol cuando llega.

Se aplica en **publicar** desde el editor de capas y en **guardar la tarjetita** desde el cajón de
contenido, que antes solo recargaba la capa y no el árbol. El badge de propagación deja de tener su
propia copia de esta lógica.

## [2.83.1] - 2026-09-04

### Cambiado: el badge de propagación se queda con el contador y nada más

Ocupaba demasiado para lo que decía. El badge es ahora solo `8/8`, y toda la explicación —qué es la
propagación, por qué no hay nada que aplicar, por qué una capa dice «sin tarjetita», por qué las
acciones están deshabilitadas— se fue a un **ícono de información** al lado. El menú pierde el
renglón de título y los divisores: queda la lista de propiedades y la acción.

### Corregido: cuando ya estaba propagada parecía que había fallado

Con todas las propiedades heredando, el menú mostraba «Que todas usen la del grupo» deshabilitado y
un texto gris explicando el bloqueo. Se lee como un error, no como que ya está hecho.

Ahora en ese caso la acción se sustituye por **«Ya todas usan la del grupo»** con una palomita
verde. Es el mismo estado, dicho como lo que es: el trabajo terminado.

## [2.83.0] - 2026-09-04

### Cambiado: el modal de edición se organiza en pestañas

Quince campos en una sola columna obligaban a recorrer el formulario entero para tocar uno. Ahora
van agrupados por la pregunta que responden: un hito tiene **Qué es**, **Cuándo** y **Conexiones**;
un ciclo, **Qué es** y **Dónde va**; un proceso, **Qué es** y **Cada cuándo**.

**La vista previa se queda fija arriba**, fuera de las pestañas: se cambie lo que se cambie, el
hito sigue a la vista. Cabecera y pie también quedan fijos y solo el contenido de la pestaña
desplaza, así que «Guardar» y «Eliminar» están siempre donde uno los dejó.

El modal se centra en la pantalla en vez de colgar de un margen superior fijo: cuando crece lo hace
hacia arriba y hacia abajo por igual, y deja de empujarse contra el borde inferior.

### Agregado

- La primera edición de un proceso también se elige en calendario, y de ahí salen solos el mes y
  día de repetición y el texto de periodicidad.

### Interno

- Los formularios de ciclo y proceso salen a `RoadmapCamposExtra`. El modal vuelve a caber en las
  trescientas líneas.
- Las pruebas que abren el modal declaran un tiempo mayor: montarlo implica ocho miniaturas, los
  veintiún proyectos y la lista de conexiones, y en jsdom eso no baja de diez segundos.

---

## [2.82.0] - 2026-09-04

### Cambiado: el listado también edita en flotante

La tarjeta fija debajo de la lista de colores se va. Ahora hacer clic en cualquier fila —de color, de
tipografía, de espaciado— abre el mismo editor anclado a la fila, igual que en la pieza. La columna
de controles recupera el alto que ocupaba la tarjeta.

### Cambiado: los breakpoints se prueban por dispositivo

Las barras no decían nada. En su lugar, el grupo lleva en la cabecera un selector
**Mobile · Tablet · Laptop · Desktop**, cada uno con tooltip del escalón y el ancho que representa
(`sm · 640 px`). Elegir uno encoge la vista previa a ese ancho. Funciona aunque no haya tokens de
breakpoint sembrados, que es el caso hoy.

### Eliminado: el contador de lugares de la vista previa

Decía «3 lugares» encima de una pieza donde ya se ven los tres resaltados.

---

## [2.81.0] - 2026-09-03

### Agregado: el editor del token sale flotando junto al elemento

Hacer clic en cualquier parte de la pieza abre el editor de su token —muestra, hex, descripción y
veredicto de contraste— anclado ahí mismo, sin que la composición se mueva. Se cierra al hacer clic
afuera. El editor salió de `ColoresPanel` a su propio componente y ahora también sirve para tokens que
no son color, donde el veredicto no aplica.

### Corregido: el texto de la pieza no se movía al editar tipografía

El título pedía una familia `font.family.display` que no existe en la semilla —solo hay
`font.family.sans`—, así que se quedaba en la del navegador. Ahora cae en la familia de cuerpo cuando
no hay una de titulares, y la pieza usa la escala completa: `3xl` en el título, `xl` en el subtítulo,
`2xl` en la cifra. Los pesos y los `leading` también se aplican.

### Corregido: los logotipos blancos no se veían

El logo se pintaba sobre el fondo de la pieza. Ahora se enseñan las dos variantes con su fondo: la
clara sobre blanco y la oscura sobre un marco oscuro, que es donde un logotipo blanco se lee.

### Cambiado: el ZIP se llama mel-<marca>.zip

Se había quedado como `identidad-<marca>.zip` cuando el módulo se renombró.

---

## [2.80.0] - 2026-09-03

### Cambiado: el formulario del hito deja de hablar en interno

Los tres campos que había que traducir mentalmente pasan a elegirse viéndolos:

- **El tipo** era un desplegable con `porllegar`, `legacy` y `joven` — nombres que solo existen en el
  código. Ahora son ocho miniaturas **dibujadas como se van a ver**, con su nombre en español
  —«Por llegar», «De antes», «Sin 1.0 todavía»— y una línea que explica cada una.
- **El proyecto** era una lista de veintiún slugs en gris. Ahora cada uno viene con su color, que es
  justamente lo que decide en el mapa, y con su logo los dos que lo tienen.
- **La conexión** era un desplegable de cincuenta y dos etiquetas. Ahora es una lista buscable con
  el color y la fecha de cada hito, ordenada por fecha.

Las etiquetas también dejan de ser jerga: «Cómo se llama», «Cuándo pasó», «Viene de otro hito»,
«Por qué importa».

### Cambiado: la fecha se elige en un calendario

Se acabó escribir `YYYY-MM-DD` a mano. El `DatePicker` la toma y **la fecha visible se escribe
sola** —«31 jul 2026»—, editable después para los casos que no son una fecha: «por salir»,
«2027 · sin fecha».

### Agregado: la vista previa muestra la conexión y la fecha

Al elegir de qué hito viene, la previa dibuja **al otro hito, la curva punteada y la leyenda**, tal
como van a salir en el mapa. Debajo del punto aparece la fecha. Ya no hay que guardar para ver si la
sucesión quedó donde se quería.

### Interno

- Los tres selectores van memoizados. Sin eso, cada tecla en el formulario redibujaba los ocho SVG
  de tipos y los veintiún proyectos.

---

## [2.79.0] - 2026-09-03

### Agregado: la vista previa señala en los dos sentidos

Antes solo iba de token a pieza. Ahora, al pasar o hacer clic sobre cualquier elemento de la
composición —el título, un botón, una etiqueta, las barras— **se marcan a la izquierda los tokens que
lo pintan**, y el clic selecciona el primero y le abre su editor, abriendo de paso el grupo del
acordeón donde vive. Cada zona es alcanzable con el tabulador.

### Agregado: el logotipo entra a la composición

Se toma de `logo.largo.claro`. Si no está definido, sale un hueco marcado con el nombre del campo, que
es de los doce que llevan sin llenarse.

### Cambiado: los grupos se separan y las descripciones se van al tooltip

«Espacio y forma» eran dos cosas distintas: ahora son **Espaciado** y **Forma**, y los
**Breakpoints** salen de ahí a su propio grupo, que antes no se veía por ningún lado.

Las descripciones de color y tipografía dejan su columna y pasan a tooltip sobre el nombre del token,
que libera ancho para el nombre completo. En espaciado y forma se quitan del todo.

### Agregado: dataviz y breakpoints enseñan un ejemplo cuando no hay nada definido

Ninguno de los dos tiene tokens sembrados, así que el grupo salía vacío sin explicar qué iba ahí.
Ahora muestra un juego normal —la rampa secuencial, las cuatro categorías, los cuatro anchos— marcado
como ejemplo.

### Cambiado: la pantalla se llama MEL a secas

El título era «MEL · Manual de Estilo y Lineamientos» con una descripción que repetía lo mismo. Ahora
el título es **MEL** y la descripción dice qué significa. En el menú, «Marcas y tokens» pasa a
**Marca**, con icono propio.

---

## [2.78.1] - 2026-09-03

### Corregido: el resaltado de la vista previa no resaltaba nada

El contenedor raíz de la composición también bajaba de opacidad, y la opacidad de un padre **se
multiplica con la de sus hijos**: se apagaba todo por parejo, incluido lo que debía quedar vivo, así
que el efecto no se veía. Lo mismo pasaba en cada anidamiento —la tarjeta arrastraba a su cifra, la
tabla a sus filas—.

Ahora el lienzo nunca se apaga y un elemento se considera vivo si es el elegido, si su contenedor lo
es, o si contiene a alguno que lo sea. Las pruebas fijan los cuatro casos, incluido el que fallaba:
un contenedor con un hijo vivo no se apaga.

El color de fondo apaga el contenido y deja el lienzo encendido, que es lo que tiene sentido para un
`color.bg`, y un `breakpoint.*` ya no apaga nada: solo encoge la pieza.

---

## [2.78.0] - 2026-09-03

### Cambiado: la vista previa de MEL deja de ser un catálogo y pasa a ser una pieza

Enseñaba los tokens en tarjetas, que es lo mismo que ya hace la lista de la izquierda. Ahora es una
**página de ejemplo con la marca puesta**: título, bajada, botones, etiquetas de estado, tarjetas de
cifra, una gráfica y una tabla, todo compuesto con los valores de la marca. Se lee como algo real.

**Al elegir un token se apaga lo que no lo usa.** Un mapa en `helpers/aplicacion.js` dice en qué
elementos cae cada clave —`color.primary` al título, al botón primario y a la barra de la cifra— y el
resto de la composición baja a `opacity: 0.16`. Arriba se dice cuántos lugares son.

### Agregado: los tokens sin lugar natural ahora se demuestran

En vez de avisar que no aplican: un `breakpoint.*` **encoge la composición** a ese ancho para enseñar
cómo responde; una `shadow.*` se le aplica a una tarjeta que normalmente no lleva sombra, con una nota
que lo explica; un `space.*` se vuelve la separación entre los botones; un `radius.*` redondea botones
y tarjetas; la paleta `dataviz.*` son las barras de la gráfica.

Una prueba fija que **ningún color sembrado quede huérfano**: si se agrega un token de color y nadie
lo mapea, se pone roja.

---

## [2.77.0] - 2026-09-03

### Cambiado: un solo modal, y con vista previa

Seleccionar un elemento en modo edición abre **directamente su formulario**. La barra flotante que
aparecía primero se retira: eran dos pasos para llegar al mismo sitio, y obligaba a decidir de
antemano si el cambio era «rápido» o no.

El modal estrena una **vista previa que se redibuja con cada tecla**, sobre la rejilla de meses del
propio mapa. Marcar «en desarrollo» enciende la bandera BETA ahí mismo; cambiar el tipo cambia el
borde; cambiar el proyecto cambia el color y trae su logo si lo tiene. Deja de hacer falta guardar
para saber cómo quedó.

Los ciclos y los procesos tienen su propia previa: una banda con su color y su nota, un carril con
sus marcas anuales.

### Corregido

- **«Eliminar» se va al extremo izquierdo del pie**, lejos de «Guardar». Estaban pegados y son las
  dos acciones que peor se confunden: una guarda y la otra borra sin vuelta.

---

## [2.76.0] - 2026-09-03

### Agregado: propagar la tarjetita del grupo a todas sus propiedades

La acción en bloque **siempre está en el menú** —«Que todas usen la del grupo»— y cuando no se
puede, dice por qué en vez de desaparecer: no tienes permiso de publicar, el grupo todavía no tiene
tarjetita, o todas las propiedades ya la usan. Antes solo aparecía si alguna propiedad tenía la
suya, así que en la mayoría de los grupos el menú se veía vacío y parecía que faltaba la opción.

**Propagar guarda primero la tarjetita del grupo tal como está en pantalla.** Las propiedades leen
la guardada, no la que estás editando, así que sin ese paso se propagaba una versión vieja sin que
se notara.

Propagar **borra la tarjetita propia** de cada propiedad para que hereden, en vez de copiarles la
del grupo: una copia deja de seguir al grupo y la propagación se rompe justo al usarla.

### Corregido: propagar se saltaba el flujo de revisión

La acción escribía con `updateLayer` directo sobre otras capas. Con el flujo de borradores y
publicación que ahora tiene el editor, eso permitía a quien **no** puede publicar tocar varias capas
de producción de un golpe, saltándose la revisión.

Queda reservada a quien publica. Para el resto el badge sigue siendo informativo —cuántas
propiedades usan la tarjetita y cuáles— con las acciones deshabilitadas y el motivo a la vista.

## [2.75.2] - 2026-09-03

### Cambiado

- **En móvil los botones del roadmap se quedan en icono.** Ocho botones con texto no caben en un
  teléfono: se apilaban en tres filas y empujaban el mapa fuera de la pantalla. El rótulo se retira
  por debajo del punto de quiebre `md` y pasa a `Tooltip`, con `aria-label` en todos para que el
  nombre accesible no dependa del texto visible — un lector de pantalla y las pruebas siguen
  encontrándolos igual.
- **Las filas de acciones dejan de ir pegadas** al encabezado y al lienzo: `6px` arriba y `12px`
  abajo, y la fila que baja en móvil separa `10px`.

---

## [2.75.1] - 2026-09-03

### Corregido: «usar esta» escribía pero no se veía

Dos causas encadenadas, y las dos hacían que pareciera que el botón no hacía nada.

**`useLayerTreeAdmin` no es un contexto.** Cada llamada crea su propio estado, y el badge estaba
llamándolo por su cuenta: pedía el árbol entero otra vez al montarse y su `reload()` refrescaba
**su** copia, no la de la página, que es de donde el badge saca los datos que pinta. La escritura
salía, el conteo no se movía. Ahora recibe `updateLayer` y `reload` de la instancia que sí posee
ese árbol.

**Y el refresco llegaba antes que la invalidación.** Al guardar, mariachi avisa a mapalab con
`notify_tree_changed`, que **agrupa los avisos en una ventana de 5 segundos** antes de invalidar el
caché del árbol. Recargar de inmediato traía el árbol viejo. Ahora recarga dos veces: una al
instante —por si el caché ya estaba fresco— y otra pasada la ventana, con un aviso de «aplicando…»
mientras tanto, porque cinco segundos sin explicación se leen como que se colgó.

Lo que las pruebas no vieron: mockeaban el hook, así que probaban el camino del clic y no el
cableado real. Ahora las funciones entran por props y la prueba avanza el reloj para exigir las
dos recargas.

## [2.75.0] - 2026-09-03

### Cambiado: la vista previa de MEL deja de ser pestañas y pasa a ser una sola página

Las cuatro superficies en un `Segmented` obligaban a cambiar de pestaña para ver la marca completa.
Ahora es **una sola página que se recorre**: arriba el muestrario —cada color en su tarjeta, la
escala tipográfica compuesta con su texto real, y las barras de espaciado y radio—, y abajo los
componentes del admin y el visor usando esos valores.

**Seleccionar un token lo resalta en la vista previa** y lo trae a la vista. Funciona en los dos
sentidos: las tarjetas del muestrario también son botones, y las filas del acordeón de tipografía,
espacio y dataviz ahora se pueden seleccionar.

**La vista previa no se dibuja en móvil.** Debajo de `md` queda solo la columna de controles a ancho
completo; el muestrario no cabe y partirlo lo volvía ilegible.

### Cambiado: los artefactos generados se mudan a un cajón

`theme.qss` y `design.md` ya no ocupan dos pestañas. El botón **Ver artefactos** abre un `Drawer` con
los cinco que emite el backend. Siguen siendo los archivos reales, así que siguen reflejando lo
guardado y no lo pendiente.

### Corregido: las descripciones de color se leían a medias

Las que no cabían quedaban cortadas sin manera de ver el resto. Ahora abren tooltip con hover, con
clic y al llegar con el tabulador.

---

## [2.74.0] - 2026-09-03

### Cambiado: editar deja de robarle alto al mapa

Los formularios salen de la sección y pasan a **modales**. El de un hito, un ciclo o un proceso se
abre desde «Abrir todos los campos» de la barra del elemento; el del marcador, desde su propio
botón. Antes el formulario se montaba bajo el lienzo y se llevaba hasta la mitad del alto en
pantalla completa, que es justo donde se edita.

Los modales se montan dentro del elemento expandido, no en el `body`, o no se verían al estar en
pantalla completa.

### Agregado: una fila de altas en el modo edición

Cuatro botones sobre el mapa: **Cambiar punto**, **Agregar hito**, **Agregar ciclo** y **Agregar
proceso**. Lo que se crea se abre de una vez en su modal, así que el elemento nuevo no se queda
esperando a que alguien lo encuentre para describirlo.

Agregar por doble clic sigue funcionando y ahora también abre el modal.

---

## [2.73.0] - 2026-09-03

### Cambiado: MEL deja de ser siete tablas y pasa a ser un taller

La pantalla enseñaba la base de datos: los 82 tokens en siete tablas idénticas, el contraste en una
tarjeta que no se recargaba, la vista previa como bloque de texto plano con el CSS generado, y un
botón de guardar por fila. Se editaba a ciegas —para saber cómo quedaba la marca había que descargar
el ZIP y montarlo en algún lado—.

Ahora es un **panel partido**. A la izquierda los controles: los tokens de color con su muestra y
**el veredicto de contraste en la misma fila**, el seleccionado con `ColorPicker` y la explicación de
por qué cumple o no, y debajo un acordeón con tipografía, espacio y forma, dataviz y los 40 campos de
la guía. A la derecha, **la marca aplicada**, con cuatro superficies: los componentes del admin, el
visor con su mapa y su leyenda, el `theme.qss` que lee el complemento de QGIS y la guía en markdown.

Panel y Visor se dibujan en el cliente y se mueven al escribir, antes de guardar; QGIS y `design.md`
se piden al backend, así que son los artefactos reales y reflejan lo guardado —la pantalla lo dice
con una etiqueta cuando hay cambios pendientes—.

### Agregado: los cambios se juntan y se revisan antes de guardar

Editar ya no escribe. Los cambios se acumulan en una barra al pie que dice cuántos hay y cuáles, y
**Ver diff** abre el antes y el después de cada uno, con el contraste que gana o pierde. De ahí se
guardan todos o se descartan. El guardado es por lote del lado del cliente: la API sigue recibiendo
un `PUT` por token.

### Agregado: el contraste se calcula en la pantalla

`helpers/contraste.js` evalúa cada token contra `color.bg` de la marca con la fórmula WCAG 2.1, en
vez de depender de los diez pares fijos que devuelve el endpoint. El veredicto se mueve mientras se
escribe. Probado contra los valores sembrados: `#5C2472` da 10.8:1, `#FF8300` da 2.5:1.

### Corregido: una prueba del rename a frames esperaba el orden viejo

`inicioService` ordena alfabéticamente dentro de cada capa, y `frames` no cae donde caía `wacha`.

---

## [2.72.0] - 2026-09-03

Lo que encontró la auditoría del rename a MEL.

### Corregido: el gate de respaldo cubría cuatro de siete schemas

`postgres-backup.sh` validaba `EXPECTED_SCHEMAS="public huachicol acervo sieej"` mientras el dump ya
traía siete: le faltaban `mel`, `vine` y `frames`. Ese gate existe para que un dump al que se le cayó
un schema **no se promueva** a weekly y monthly; con tres schemas fuera de la lista, un dump parcial
habría pasado la revisión y pisado los respaldos buenos. Ahora valida los siete, comprobado contra un
dump real de una base migrada.

### Agregado: pruebas del compat

`tests/test_mel_compat.py` cubre las dos rutas y los dos permisos. Es lo que tiene que ponerse rojo
cuando la fase 3 retire el alias: sin ellas, llevarse algo de más solo se notaba en producción.

### Corregido: los hitos del roadmap seguían diciendo «identidad»

Los dos hitos del módulo pasan a `mel` y `f-mel-tokens`, con `nombre_anterior = 'identidad'` como se
hizo con frigate. `m3l0001` trae los `UPDATE` para las bases que ya existen: editar el seed de una
migración ya aplicada no cambia nada en producción.

### Corregido: dos referencias que el rename dejó atrás

`README.md` seguía listando el módulo como «Identidad» y `docs/arquitectura.md` apuntaba a
`modulo-identidad.md`, que ya no existe.

---

## [2.71.1] - 2026-09-03

### Cambiado: la propagación pasa de recuadro verde a badge accionable

El aviso ocupaba una franja verde sobre el editor y desentonaba. Se convierte en un **badge
`2/3`** junto al botón de ver cómo queda, verde cuando alguien la usa y neutro cuando nadie. Lo que
decía el recuadro vive ahora en el tooltip.

### Agregado: aplicar la tarjetita del grupo a sus propiedades

El badge abre un menú con las propiedades y su estado —usa la del grupo, tiene la suya, sin
tarjetita— y desde ahí se puede **hacer que una propiedad use la del grupo**, o **todas las que
tienen la suya de un golpe**.

Aplicar **borra la tarjetita propia** de esa capa para que vuelva a heredar; no copia nada, porque
duplicar la configuración rompería la propagación futura. Pide confirmación y avisa de lo que
importa: **se guarda de inmediato**, sobre otras capas, y no se deshace con el `Ctrl+Z` del editor,
que solo cubre la tarjetita que estás editando.

Las que dicen «sin tarjetita» quedan sin acción y explican por qué: el grupo no tenía una cuando se
construyó el árbol, así que hay que guardar y refrescarlo.

## [2.71.0] - 2026-09-03

### Corregido: las bandas de ciclo salían negras

Al pasar los ciclos a la base se sembró su color pero **no su tinte de fondo**, que era un `rgba`
aparte y nunca tuvo columna. El componente seguía pidiendo `ciclo.tinte`, recibía vacío, y el SVG
resuelve un relleno ausente como negro: las cuatro bandas tapaban el mapa. Ahora el tinte se deriva
del color del propio ciclo, así que cambiar el color desde el editor cambia también el fondo y no
hay dos valores que puedan contradecirse.

### Cambiado: el marcador sale del catálogo de símbolos

Se retiran los doce emojis inventados. El selector es ahora el `SymbolPicker` de
`mapalab-symbols` —el mismo de `sextante/símbolos`—, con sus categorías y sus tres tipos: emoji,
SVG e imagen. Al lado va un enlace directo para darlos de alta.

La elección se guarda en el navegador de cada quien: es una preferencia visual, no un dato del
roadmap, y no tiene por qué imponerse a los demás. Mientras no se elija ninguno, el marcador es un
perro.

---

## [2.70.0] - 2026-09-03

### Cambiado: editar solo se hace en pantalla completa

El botón de edición **lleva a pantalla completa por su cuenta**: no hay que expandir primero. Y al
salir de pantalla completa, la edición se apaga. Lo que no cambia es el otro sentido — expandir
sigue siendo solo mirar, no editar.

El motivo es de espacio: la barra del elemento seleccionado y el formulario compiten con el mapa, y
en la vista normal el mapa mide 190 píxeles de alto útiles.

### Cambiado: la sección se queda en claro, sin depender del tema

La hoja de ruta declara su propio `ConfigProvider` con el algoritmo claro y `color-scheme: light` en
su raíz, así que ya no hereda nada del tema del sistema ni de un tema dinámico que se agregue más
adelante. El SVG usa negros y grises fijos y no tiene una paleta oscura que ofrecer; forzarlo es más
honesto que dejarlo a la suerte de lo que pinte el navegador.

### Agregado

- `usePantallaCompleta` estrena pruebas: que solo se enciende cuando el elemento expandido es el
  suyo —no cualquiera—, que vuelve a apagarse cuando el navegador sale, y que avisa si lo niega.

---

## [2.69.0] - 2026-09-03

### Agregado: la propagación de la tarjetita se ve en tres lugares

Un grupo comparte su tarjetita con las propiedades que no tienen una propia. Eso pasaba en
silencio: editabas la del grupo sin saber a quién le pegaba, y abrías una propiedad sin saber de
dónde venía lo que estaba viendo.

**En el editor del grupo** —lo que faltaba por completo— un renglón dice «esta tarjetita la usan
**6 de 8** propiedades», con la lista de cuáles heredan, cuáles tienen la suya y cuáles no tienen
ninguna. Cada nombre es un enlace que abre esa capa. Se calcula del árbol que ya está cargado, sin
pedirle nada al backend.

**En el editor de la propiedad** el aviso deja de ser un `<code>` con el nombre del grupo y pasa a
ser un enlace para ir a él. Y dice lo que realmente pasa: «esta capa no tiene tarjetita propia:
muestra la del grupo X».

**En el árbol** cada capa lleva un punto: **relleno** si tiene tarjetita propia, **hueco** si la
hereda de su grupo, y **nada** si no tiene ninguna —esas son las que el visor rellena inventando
una, y hasta ahora no había forma de verlas sin abrirlas una por una.

La herencia se lee del campo `inheritedFrom` que el árbol ya resuelve (mapalab 1.165.0), con el
recorrido de ancestros de antes como respaldo para un árbol en caché viejo.

## [2.68.0] - 2026-09-02

### Cambiado: el módulo Wacha ahora se llama Frames

`wacha` nombraba el módulo por lo que hace mirar —«wacha» es «checa esto»—, pero no decía nada de
lo que guarda ni de para qué existe. El módulo pasa a llamarse **FRAMES**, sigla de *Filmación y
Resguardo Audiovisual para Monitoreo de Eventos y Seguridad*, que además es el nombre técnico de lo
que el sistema almacena.

Cambian el schema de la base (`wacha` → `frames`, con su índice), el prefijo de la API
(`/wacha/*` → `/frames/*`), los permisos (`mariachi.wacha.view` → `mariachi.frames.view`), el rol
atómico («Wacha - camaras» → «Frames - camaras»), las rutas del admin (`/wacha/camaras` y
`/wacha/vivo`), la carpeta del admin y la entrada del sider. Las variables de entorno pasan de
`WACHA_*` a `FRAMES_*`. Los datos no se tocan: la migración `fr4mes0001` es un `ALTER SCHEMA`.

**No lleva capa de compatibilidad**, a diferencia del rename de MEL. El módulo nunca salió de
`tamal-rojo`: no hay clientes con las rutas viejas ni permisos viejos que revocar en minerva. El
manifiesto se importa y listo.

No se renombró nada de **Frigate**: la imagen, las variables que consume (`FRIGATE_RTSP_PASSWORD`,
`FRIGATE_CAMERA_*`) y la ruta `/media/frigate` son del producto upstream y se quedan como están.

---

## [2.67.0] - 2026-09-02

### Cambiado: el módulo Identidad ahora se llama MEL

`Identidad` era un nombre que ya significaba otras tres cosas en el ecosistema: el grupo de columnas
del editor de capas, la identidad del actor en los envíos de SIEEJ y la identidad OIDC que da minerva.
Buscar «identidad» devolvía las cuatro mezcladas. El módulo pasa a llamarse **MEL — Manual de Estilo
y Lineamientos**: los tokens son el estilo, los campos de la guía son los lineamientos.

Cambian el schema de la base (`identidad` → `mel`, con sus índices y constraints), el prefijo de la
API (`/identidad` → `/mel`), los permisos (`mariachi.identidad.*` → `mariachi.mel.*`), la carpeta del
admin y la entrada del sider. Los datos no se tocan: la migración `m3l0001` es un `ALTER SCHEMA`.

No se renombraron el tab **Identidad** del editor de capas ni la «identidad del actor» de SIEEJ: son
otra cosa y se quedan como están. El ZIP descargable sigue llamándose `identidad-<marca>.zip`, que
es lo que describe su contenido para quien lo recibe.

### Agregado: compatibilidad mientras minerva se pone al día

`/identidad` sigue respondiendo como alias de `/mel`, marcado como deprecado en el OpenAPI, y la ruta
`/identidad` del admin redirige a `/mel`. Los permisos viejos siguen dando acceso: el gate acepta
`mariachi.mel.view` **o** `mariachi.identidad.view`, para que el deploy del código no dependa de que
el manifiesto ya esté importado en minerva.

Ambas compatibilidades se retiran en la fase 3, junto con la revocación explícita de
`mariachi.identidad.view`, `mariachi.identidad.update` y el rol `Identidad - administracion`, que el
import de minerva **no borra**.

---

## [2.66.0] - 2026-09-02

### Cambiado: editar deja de ser un formulario

Seleccionar un elemento en modo edición ya no abre el formulario largo debajo del mapa. Aparece una
**barra pegada al elemento** con lo que se toca todo el tiempo —proyecto, tipo, la bandera de
desarrollo y eliminar; color en el caso de un ciclo—, y el formulario completo queda detrás de un
botón. La mano deja de viajar entre el mapa y el pie de la sección.

### Agregado: doble clic para crear

Un doble clic sobre el lienzo crea el elemento que corresponde al lugar donde se hizo, ya con su
fecha puesta: sobre el eje, un **hito**; en el carril de arriba, un **proceso**; dentro de una banda,
un **ciclo** que hereda su altura. Fuera de esas zonas no pasa nada.

### Agregado: el arrastre deja de ser a ciegas

Al mover un hito aparece una guía vertical con la fecha en la que va a caer, y un punto tenue donde
estaba. Los días **1 y 15 tienen imán**: si sueltas a menos de tres días, se pega. Antes había que
soltar para saber dónde había caído.

### Interno

- El estado de selección sale del panel a `useSeleccionRoadmap`, y el alta por posición a
  `useAltaPorClic`. El componente vuelve a caber en las trescientas líneas.

---

## [2.65.0] - 2026-09-02

### Agregado: los metadatos se ven como la ficha del visor y se editan desde ella

La pestana Metadatos muestra a la derecha, en columna pegajosa, **la ficha que abre el visor**: las
mismas secciones, en el mismo orden —Descripcion, Numeralia, Fuentes, Metodologia, Metadato— y sin
las que quedan vacias, igual que el visor las omite. Antes eran ocho campos sueltos sin manera de
saber que armaban una ficha, y por eso salian descripciones de un renglon junto a metodologias de
tres parrafos.

**Cada seccion de la ficha es clickeable** y abre la del formulario que le corresponde; el titulo
lleva a Informacion general. La de numeralia salta a la pestana Estadisticas, asi que la barra de
pestanas del editor paso a ser controlada. Cuando no hay indicadores la seccion se queda visible
—aunque el visor la omita— porque si no, no habria de donde saltar.

### Agregado: los metadatos pasan por el flujo de publicacion

Se fue el boton «Guardar metadatos»: la ficha se autoguarda como borrador `layer_metadata`, cuenta en
«sin publicar» y aparece en la hoja de revision con su propia seccion. Con esto son tres los recursos
que publican igual: capa, metadatos y numeralia.

### Cambiado: el texto de ayuda de 34 campos pasa a tooltip

Cada campo llevaba una o dos lineas grises debajo. Ahora viven en el tooltip del propio campo, que es
donde ya estaba el resto de la informacion extra del editor. Solo se quedan como `extra` los cuatro
que no son texto sino botones.

### Cambiado: los presets del distintivo dejan de estar duplicados dentro del admin

`LayerBadgeSection` tenia su propia copia de `BADGE_PRESETS` y `softBg`, espejo de la de mapalab.
Quedan en `constants/badgePresets.js` con los nombres del visor —`resolveBadge`,
`isBadgeInValidityWindow`— para que comparar contra mapalab sea mirar un archivo contra otro. Hoy
coinciden exacto; ocho pruebas cubren presets, modo personalizado y los bordes de la ventana de
vigencia.

## [2.64.2] - 2026-09-02

### Corregido: el contenido de una sección ya no desborda la tarjeta

La tarjeta mide 239 px y los valores vienen de columnas reales: nombres de doscientos caracteres,
claves sin un solo espacio, URLs largas. Cualquiera de esos empujaba su sección y se salía del
lienzo.

Todo lo que pinta texto parte palabra cuando hace falta y **todo contenedor flex lleva
`minWidth: 0`**, que es lo que de verdad faltaba: sin eso un hijo flexible se niega a encogerse por
debajo de su contenido y arrastra al padre. Los renglones de la lista alinean por línea base, las
etiquetas se acomodan en varias líneas en vez de estirarse, y la rejilla de cifras usa
`minmax(0, 1fr)` en vez de `1fr`, que tiene el mismo problema.

Cinco pruebas lo fijan, una por tipo de sección.

### Cambiado: los selectores de la edición son más altos

Los `Segmented` de la canaleta —«Un campo / Campos combinados», «Unir texto / Sumar», «Campos del
feature / Valores fijos»— pierden el `size="small"` y quedan a la altura normal, que es la que
tienen los controles con los que conviven.

## [2.64.1] - 2026-09-02

### Corregido

- `ruff check app tests` vuelve a pasar limpio. Tres archivos tenían el bloque de imports sin
  ordenar y dejaban en rojo el job de backend: `layer_metadata.py`, `columna_tabla.py` y
  `borrador_service.py`. Son cambios de formato, sin efecto en el comportamiento.

---

## [2.64.0] - 2026-09-02

### Cambiado: la pestana Estadisticas se edita sobre la cuadricula del visor

La cuadricula que el visor pinta bajo la capa subio al principio y **es la vista previa**: los mismos
recuadros, 4x2 con los lugares libres marcados. Se da click en uno y abajo aparece **solo** el editor
de ese indicador, en vez de una lista de ocho fichas abiertas. Sustituye a la tarjeta «Valores
actuales en el visor», que mostraba lo mismo como etiquetas azules al final del formulario.

Los valores se calculan **en vivo** contra la base al cambiar la configuracion o el contexto, asi que
se ve el numero antes de publicar. Antes el unico modo de verlo era guardar y recalcular contra
produccion.

Se fueron los tres botones de alta —habia que elegir el modo antes de saber que se queria—; ahora se
agrega uno y el modo se cambia adentro. «Probar con contexto» y «Vigencia» pasaron al encabezado de
la vista previa, con tooltip, y en movil quedan como iconos. La nota al pie se edita en su lugar, bajo
los recuadros. En todo lo que ve el usuario «slot» pasa a «indicador».

### Agregado: la numeralia pasa por el flujo de publicacion

Era la excepcion: se guardaba directo a produccion mientras el resto del editor ya tenia borrador y
publicacion explicita. Ahora se autoguarda como borrador `layer_stats`, entra en el contador de
«sin publicar» y aparece en la hoja de revision con su propia seccion.

El aplicador **encadena el recalculo**: `PUT /stats` guarda la configuracion pero no recalcula, y sin
ese paso el visor seguiria mostrando los valores materializados anteriores.

### Corregido: el historial salia vacio

Apuntaba solo a `layer-config`, que no tiene registros: desde el autoguardado `PUT /layers` unicamente
corre al publicar. Todo lo que hay hoy es de `layer-metadata`, que quedaba fuera de la consulta.

El panel abre ahora **en general**, sin filtrar por capa y con la columna que dice a cual pertenece
cada cambio, y trae un selector Capas/Metadatos como el modo tabla tiene sus dos pestanas. Las
columnas de metadatos se nombran como las ve el usuario en vez de como claves de base de datos.

## [2.63.0] - 2026-09-02

### Cambiado: la pestaña de tarjetita es un solo componente

`TarjetitaEditor` reemplaza al encabezado suelto más el editor: el modo, la vista limpia y el modal
de plantillas dejan de estar repartidos entre hermanos que no se conocían. Los dos llamadores
—editor de capas y cajón de contenido— pasan de treinta líneas a una. Se va
`InfoBoxEditorHeader.jsx`.

Eso desbloquea lo demás:

- **«Ver cómo queda» es un ícono**, a la derecha del título, sin texto. Al activarlo **se esconde
  todo lo demás** —la leyenda, el selector de modo, la canaleta, las asas, los insertadores— y la
  tarjeta queda centrada en el contenedor. El mismo botón regresa a editar.
- **El panel vacío se estira a su contenedor** con `flex`, en vez del `calc(100vh - …)` que se
  pasaba de largo y sacaba barra de scroll. Con poco espacio cae a 220 px y ahí se queda.
- **El botón Plantillas sale del encabezado.** Con la tarjetita vacía ya está el panel central;
  con contenido vive ahora en el menú del **+** del lienzo, como «Reemplazar con una plantilla…»,
  que es donde se traen cosas.

### Cambiado: la tarjeta abarca el ancho de sus asas

Las asas de arrastre y los botones de duplicar y quitar caían fuera del blanco de la tarjeta y
parecían sueltos. El panel blanco abarca ahora también esa canaleta —239 px de contenido más 28 a
cada lado— así que los controles quedan dentro. **El contenido sigue midiendo 239 px**, que es lo
que mide en el visor; lo que crece es la superficie de trabajo, no la tarjeta. En «ver cómo queda»
el panel se encoge a los 239 exactos.

### Cambiado: un solo control para elegir entre opciones

Los `Radio.Group` con botones se van: «Un campo / Campos combinados / Texto fijo», «Unir texto /
Sumar» y «Campos del feature / Valores fijos» usan el mismo `Segmented` que Lienzo · Lista · JSON.

### Eliminado: el interruptor Escritorio / Móvil de la vista previa

Ya no estaba haciendo nada.

## [2.62.1] - 2026-09-01

### Cambiado: la capa sin tarjetita muestra una sola cosa

Con la tarjetita vacía en modo Lienzo se veían tres cosas compitiendo: el encabezado de la sección,
el panel de «Esta capa todavía no tiene tarjetita» y debajo un lienzo vacío con su franja de
título y su **+**. Ninguna de las tres decía qué hacer.

Ahora el panel **ocupa el alto de la pestaña**, centrado, y es lo único: se esconden la leyenda
«Configuración del cuadro» y el lienzo hasta que haya algo que dibujar. Con una sola sección
configurada todo vuelve a su sitio.

El **selector de modo se queda visible**, porque es la única puerta al modo JSON y pegar un JSON en
una capa vacía es justo el camino de copiar una tarjetita entre entornos.

El modo **Lista no cambia**: con la tarjetita vacía sigue ofreciendo sus chips de «Agregar bloque»,
que ahí sí son la forma de empezar.

## [2.62.0] - 2026-09-01

### Agregado: los ciclos y los procesos también se editan

Hasta ahora solo los hitos vivían en la base; las bandas de ciclo y los carriles de proceso eran
constantes del admin, así que mover el cierre de `tamal-verde` pedía un deploy. **Migración
`r0adm4p0002`**: dos tablas nuevas, `roadmap_ciclos` y `roadmap_procesos`, sembradas con los cinco
ciclos y el proceso que ya existían. Las constantes se eliminan.

Ocho endpoints más bajo `/api/mariachi/roadmap`, con el mismo permiso y el mismo `verify_csrf` que
los hitos. El editor cambia de campos según lo que se seleccione: un ciclo pide nombre, color y sus
límites; un proceso pide su primera edición y cada cuándo se repite.

**Agregar deja de ser exclusivo de los hitos**: hay un botón por tipo.

### Agregado: los hitos se arrastran

En modo edición un hito se toma y se mueve de lado; al soltarlo se guarda con la fecha que le
corresponde a esa posición del eje. Como el eje no es lineal —cada año ocupa el ancho que le tocó—,
`fechaEnX` busca primero el tramo del año y luego el mes y el día dentro de él, que es la inversa
exacta de cómo se dibuja.

El acomodo se recalcula en cada movimiento, así que las etiquetas se reacomodan mientras se
arrastra, no al soltar.

---

## [2.61.0] - 2026-08-31

### Corregido: en el lienzo no había forma de ponerle título a la tarjetita

El menú del **+** excluye el encabezado —no se duplica ni se mueve— y con eso quedó sin puerta:
una capa sin título no podía ganarlo. Ahora, cuando falta, la tarjeta muestra arriba una franja
punteada con **«Agregar título»**.

### Cambiado: el lienzo ya no lleva vista previa al lado

Era la misma tarjeta dos veces. En su lugar hay un botón **«Ver cómo queda»** sobre la propia
tarjeta: apaga las asas, los insertadores y la selección, y la deja como se pinta en el visor.
**«Volver a editar»** regresa. La columna de vista previa se sigue mostrando en el modo Lista.

Las asas y los botones de duplicar y quitar viven fuera de los 239 px de la tarjeta, así que el
lienzo reserva 30 px a cada lado en vez de recortarlos contra la canaleta.

### Cambiado: las plantillas se ofrecen al centro cuando no hay nada

Con la tarjetita vacía, el botón chico del encabezado no se ve. Pasa a ser un panel centrado
—«Esta capa todavía no tiene tarjetita»— con el botón en primario. En cuanto hay una sección, el
panel desaparece y el botón vuelve a su sitio en el encabezado.

### Eliminado: el modo Texto

Duró una versión. La idea era sustituir al JSON, y al construirlo quedó claro que no lo sustituye:
hay configuraciones que no puede escribir sin perder algo, así que el JSON tenía que quedarse de
todos modos. Dos herramientas para expertos que hacen lo mismo es una de más. Se van
`infoboxTexto.js`, su editor y sus pruebas; el segmento vuelve a **Lienzo · Lista · JSON**.

### Eliminado: el interruptor Escritorio / Móvil de la vista previa

No aportaba: la diferencia real entre las dos variantes es de tamaños de letra, y para eso no hace
falta un control.

## [2.60.0] - 2026-08-31

### Agregado: el texto corto, la tarjetita en líneas legibles

Un modo **Texto** con una línea por sección, para copiar entre entornos y revisar en un diff sin
contar corchetes:

```
titulo      nombre
insignia    municipio naranja
renglon     Turno: turno
ubicacion   calle, "#"numero_ext, "Col. "colonia
cifra       Total: hombres + mujeres
```

Las líneas seguidas del mismo tipo forman un bloque; las separadas por otra cosa forman bloques
distintos, así que **el orden del texto es el orden de la tarjeta** y las instancias múltiples
salen solas. Los errores se reportan con su número de línea y **no se aplica nada** hasta que el
texto entero se entienda.

**Si una tarjetita no se puede escribir sin perder algo, no se escribe.** El modo lo dice —qué
clave, qué opción— y manda al JSON. Un texto corto que tira datos en silencio sería peor que las
llaves; por eso **el modo JSON se queda** en vez de ser reemplazado, que era la idea original.

El color se escribe con una palabra (`naranja`, `morado`, `azul`, `verde`, `vino`) y no con la
llave interna del preset: además de leerse mejor, desambigua el caso en que la columna se llama
igual que el color, como `municipio`.

El segmento queda en **Lienzo · Lista · Texto · JSON**.

## [2.59.0] - 2026-08-31

### Agregado: el lienzo, la tarjetita se edita sobre sí misma

La tarjetita deja de tener un editor al lado: **la tarjeta es el editor**. Cada sección se dibuja
como se va a ver, en su sitio y en su orden, con los datos reales de la capa.

- **El + vive entre secciones** y aparece al pasar el cursor, así que el lugar es parte del gesto.
  El de hasta abajo es permanente, que es el que hace falta para el caso normal. Ese mismo menú
  ofrece **duplicar la de arriba**: la duplicación deja de ser un botón dentro del bloque y pasa a
  ser una inserción con lugar.
- **Tocar una sección abre su editor en la canaleta** de la derecha, a la altura de la sección. La
  tarjeta no se encoge ni se reacomoda: sigue midiendo sus 239 px, que es lo único que hace
  confiable lo que ves. En 239 px no cabe un selector; por eso los controles van al lado y no dentro.
- **Se arrastra por el asa** del borde izquierdo. El **encabezado no**: se dibuja como la barra de
  título que es, con candado, porque en el visor siempre se pinta arriba.
- Una sección recién agregada **sigue visible aunque todavía no muestre nada** —dice «sin datos
  todavía»—, en vez de desaparecer hasta que le pongas un campo.
- **La herencia se ve en la tarjeta**: si la capa hereda del grupo, el lienzo la pinta atenuada y
  el botón de personalizar está encima, no en un recuadro aparte.

El segmento pasa a **Lienzo · Lista · JSON**, con el lienzo por defecto. La lista es el editor
anterior y se queda como respaldo: el lienzo no se ha ejercitado con el ratón contra capas reales.

Los editores de cada bloque se reutilizan tal cual —`BlockShell` gana un modo `bare` para vivir en
la canaleta sin su marco—, así que lo que cambia es el acomodo, no la edición.

## [2.58.0] - 2026-08-31

### Agregado: el modo edición arma sucesiones y desempata hitos

El formulario solo dejaba tocar la etiqueta, las fechas, el proyecto, el tipo y el motivo, así que
**las conexiones entre hitos no se podían crear desde la pantalla**: había que escribirlas en la
base a mano. Ahora hay tres campos más:

- **Viene de**, un selector con los demás hitos, que es lo que dibuja la curva punteada.
- **Qué dice la conexión**, la leyenda que va encima —`se renombra`, `lo releva`, `lo sucede`—.
- **Orden en su día**, lo único que desempata dos hitos con la misma fecha.

Los seis linajes que ya existían —geoserver a sextante, IGIBot a agent, el portal de mariachi a
sitio2026 y los dos legados— quedan editables sin tocar SQL.

### Corregido

- **El editor no se veía en pantalla completa.** El marco recortaba con `overflow: hidden` y el
  lienzo se llevaba todo el alto, así que al seleccionar un hito el formulario quedaba fuera de
  cuadro. Ahora el marco reparte el alto: el lienzo toma lo que sobra y el editor se queda con hasta
  un 45% con scroll propio.

---

## [2.57.0] - 2026-08-31

### Cambiado: el tema «Contrato /ontoy» de Documentacion ahora es «Contratos», con dos pestanas

`/ontoy` no era el unico contrato del ecosistema, solo el unico escrito. La pestana pasa a llamarse
**Contratos** y se parte en dos: `/ontoy`, el contrato entre servicios, y **Base de datos**, el
contrato entre datos. El enlace viejo `?topic=ontoy` sigue funcionando y abre la pestana `/ontoy`;
`?sec=base-de-datos` abre la otra.

### Agregado: la pestana «Base de datos» documenta los contratos que no estaban en ningun lado

Se cumplen por nombre, no los valida nadie y fallan en silencio: una columna mal nombrada no da
error, da una capa vacia o un selector sin meses. Quedan escritos `fecha`, `clave_municipio` y
`clave_geo`, `geom` con `geom_iieg`/`geom_inegi`, el `fid` que exige el WFS para paginar y los dos
dialectos de `layer_key`, mas las consultas que detectan cada incumplimiento.

La pantalla es una ficha de consulta —tablas y frases cortas—; la version larga, con el porque de
cada regla, vive en `context-ame-esta/ecosistema/contratos-de-datos.md`.

### Cambiado: la pestana `/ontoy` se puso al dia

Llevaba sin revisarse desde el contrato v2 original y le faltaba todo lo de huachicol 2.8.0 a 2.16.0.
Se agregan los campos `node`, `node_reporter`, `host` y `peers`; los checks `informativo: true`, que
no entran al estado global; las tres formas de servirlo, incluido el stack aparte de
`compose.ontoy.yaml` y la fusion por `ONTOY_UPSTREAM_URL`; y que el monitor guarda tambien `node` y
`host` pero ignora `service`, `released_at` y `peers`.

Se corrige la tabla de adopcion, que decia `geoserver` en vez de `sextante` y daba a mariachi y
mapalab como backend pelado: los once servicios tienen ya su sidecar y su nodo. Y se corrige la
leccion de exposicion, que estaba al reves: el `deny` va **en el gateway**, porque el rewrite le
quita el prefijo a la peticion antes de que el nginx del servicio la vea.

## [2.56.0] - 2026-08-31

### Corregido: el autoguardado detectaba cambios donde no los habia

Abrir una capa y no tocar nada bastaba para que el contador dijera «2 sin publicar», con renglones
que se leian «Etiquetas de busqueda — → —»: los dos lados vacios y aun asi contados como cambio.

La causa es que el diff comparaba los valores del formulario contra el objeto crudo de la capa, y
`populate` no los deja iguales: aplica valores por defecto al poblar —`searchTags` cae en `[]` cuando
la capa trae `null`, `infoboxConfig` en `null` cuando el editor entrega `{}`, `tiled` en `true`—.
Toda capa nacia con cambios fantasma.

Ahora la referencia es **una foto del formulario recien poblado**, no la capa cruda, asi que
cualquier transformacion es simetrica. Ademas la comparacion dejo de ser ingenua: arreglo y objeto
vacios cuentan como nulo, los objetos se serializan con las llaves ordenadas —un orden distinto
inventaba cambios— y un numero y su texto son el mismo valor. `0` y `false` siguen siendo valores,
no vacios.

### Agregado: descartar los borradores desde la hoja de publicacion

El arreglo evita que se creen borradores fantasma nuevos, pero no limpia los que ya se guardaron.
**Descartar todo** borra los borradores listados y deja las capas como estan publicadas. Descarta
los de todas las capas de la lista, no solo los vacios: si hay algo real pendiente, conviene
publicarlo antes.

## [2.55.0] - 2026-08-31

### Agregado: los selectores de campo muestran valores reales

Elegir `cve_est_2` de una lista de nombres era adivinar. Cada columna del selector trae ahora
**hasta tres valores de ejemplo** debajo del nombre, y salen de los mismos diez registros que
alimentan la vista previa: cero peticiones extra.

`SampleFeaturesProvider` los trae una vez por capa y los reparte, así que el editor y la vista
previa miran exactamente los mismos datos.

### Agregado: deshacer y rehacer en la tarjetita

`Ctrl+Z` y `Ctrl+Shift+Z`, con sus dos botones. Arrastraste mal, borraste la sección equivocada o
aplicaste una plantilla encima de media hora de trabajo: se recupera.

Los cambios seguidos **se agrupan**: escribir una etiqueta manda un cambio por tecla, y sin
agrupar cada deshacer borraría una letra. Dentro de medio segundo se reemplaza la cima de la pila
en vez de apilar, así que un deshacer equivale a una edición. Guarda treinta pasos.

El atajo se ignora cuando el cursor está dentro de un campo de texto, donde `Ctrl+Z` tiene que
seguir deshaciendo lo que escribiste.

## [2.54.0] - 2026-08-31

### Agregado: la tarjetita se previsualiza con registros reales de la capa

La vista previa dejaba de mentir a medias: mostraba un «Parque Metropolitano» inventado a mano.
Ahora trae **diez registros reales** de la capa y se puede recorrerlos con ◀ 1 / 10 ▶.

Eso es lo que importa: la tarjeta se ve bien con el primer registro y se rompe con el séptimo, el
que no tiene colonia o el del nombre de doscientos caracteres. Cuando el registro que estás viendo
no trae alguno de los campos que la tarjetita usa, **el panel lo dice por su nombre**.

Se suma un interruptor **Escritorio / Móvil**, porque el visor pinta la tarjeta con otras medidas y
a dos columnas de cifras en teléfono, y esa versión no la revisaba nadie. Y la vista previa pasa a
medir **239 px**, el ancho real de la tarjeta en el visor, en vez de 280.

Cuando la capa no tiene registros que ofrecer —un grupo de capas de GeoServer, por ejemplo— se
sigue pintando con valores de ejemplo y lo dice.

**`GET /geoserver/workspaces/{alias}/layers/{layer}/sample-features`** es el endpoint nuevo:
devuelve hasta cincuenta features con sus propiedades planas, sin geometría. Un grupo de capas
devuelve la lista vacía en vez de fallar.

## [2.53.0] - 2026-08-31

### Cambiado: el buscador de capas se despliega al pasar el cursor

Vivia bajo el titulo de la pagina ocupando su propio renglon. Ahora es un boton de lupa junto a
«Nuevo nodo», en la fila de pestanas, y se abre a 210 px con el cursor encima, al enfocarlo o
mientras tenga texto. Con eso la descripcion de la subpagina recupera su linea completa.

### Cambiado: Mover pasa al encabezado del cajon Avanzado

Era una seccion mas dentro del cajon. Como boton del encabezado se alcanza sin bajar, y su tooltip
dice de que cuelga hoy el nodo. Servicios y Simbologia quedan plegadas al abrir.

### Corregido: las secciones del editor se veian apretadas y chiquitas

El titulo era de 11 px en versalitas grises y se leia como una etiqueta perdida, no como el
encabezado de la seccion. Pasa a 14 px en el color del texto, con la ayuda debajo en 12 px, 28 px de
separacion entre secciones y 20 px antes del contenido. El cajon de Avanzado abre a 600 px con
padding propio.

### Corregido: quitar el marco del arbol no habia ahorrado espacio

Se retiro el `Card` que lo envolvia pero quedaron sus 24 px de padding alrededor, asi que el ancho
recuperado fue ninguno. Bajan a 8 px.

## [2.52.1] - 2026-08-31

### Corregido: el zoom del roadmap dejaba el lienzo en blanco

El SVG recibía el alto en porcentaje —`height: 120%`— dentro de un contenedor flex centrado. Con
`width: auto`, el navegador no tenía de dónde calcular el ancho y lo colapsaba: el lienzo
desaparecía y los botones parecían no hacer nada. Ahora las dos medidas se calculan en píxeles a
partir del alto de la pantalla y la proporción del `viewBox`, así que crecen juntas.

De paso el contenedor pasa de `overflow-x` a `overflow` completo: con el mapa acercado no había
manera de llegar a lo que quedaba fuera por arriba o por abajo, y el centrado por flex recortaba
sin dejar desplazar. Ahora centra con `margin: auto`, que sí convive con el scroll.

### Cambiado

- **Los controles de zoom solo aparecen en pantalla completa.** Fuera de ella el lienzo se dibuja a
  tamaño fijo con scroll horizontal, así que no había nada que acercar. El zoom vuelve a 100% al
  salir.

---

## [2.52.0] - 2026-08-31

### Cambiado: la vista previa de la tarjetita deja de reimplementar el visor

`InfoBoxPreview` ya no interpreta la configuración por su cuenta: llama a **`buildCardPlan`**, el
mismo módulo que usa el visor, y pinta el plan que le devuelve. Todo lo que decidía a mano
—resolver un campo, unir columnas, partir por «; », formatear números y fechas, armar el link de un
ícono, ordenar las instancias— se fue al módulo compartido.

Es el patrón que las estadísticas ya usaban desde siempre: una sola implementación, dos
consumidores. La tarjetita era la excepción, y se notó cuando los campos compuestos funcionaban en
el visor y el preview los ignoraba.

**`admin/src/shared/infoboxPlan.js` es una copia byte a byte** de la canónica que vive en mapalab.
`scripts/sync-infobox-plan.sh` la copia y `--check` falla si divergieron — mismo enfoque que el
`check-model-drift.py` de gateway-hub para los modelos de SQLAlchemy. Editar la copia no sirve de
nada: se edita en mapalab y se sincroniza.

De paso el preview mejora en dos cosas. Los valores de ejemplo se arman **a partir de los campos
que la tarjetita realmente usa** (`referencedFields`), así que ya no depende de que el nombre
coincida con una lista fija. Y acepta `properties`, que es por donde va a entrar el registro real
de la capa.

## [2.51.1] - 2026-08-31

### Corregido: la barra horizontal de la pestaña Tarjetita, ahora sí

El intento anterior atacó lo que no era: los botones anchos y los anchos fijos de los renglones no
tenían nada que ver. La causa estaba una capa más arriba y explica por qué el problema salía **solo**
en esa pestaña — es la única que usaba `Row`.

`<Row gutter={24}>` aplica `marginInline: -12px` (verificado en `antd/lib/grid/row.js`), así que la
fila mide 24px más que su contenedor. Ese contenedor es el panel de la pestaña, que lleva
`padding: 16px 0` —cero horizontal— y cuelga de un `content-holder` con `overflow-y: auto`; por
especificación, `overflow-x: visible` junto a un `overflow-y` que no es visible **computa a `auto`**,
de modo que esos 24px sobrantes se convierten en barra de scroll. Las demás pestañas usan
`EditorSection` y por eso nunca la mostraron.

`Row`/`Col` salen del editor de tarjetita y del cajón de contenido y se sustituyen por un flex con
`gap: 24px`, que no tiene márgenes negativos. De paso el acomodo pasa a depender del ancho real del
contenedor y no del viewport, que es lo correcto aquí: el editor vive dentro de un panel dividido y
los breakpoints `md` de antd medían la ventana completa.

## [2.51.0] - 2026-08-31

### Agregado: zoom en la hoja de ruta

Botones de acercar y alejar con el porcentaje a la vista, de 60% a 300%. **En pantalla completa la
rueda del ratón también hace zoom**; fuera de ella se deja en paz, para no secuestrar el scroll de
la página.

### Corregido

- **Los modales del mapa de servidores no se veían en pantalla completa.** Ant Design los monta en
  `document.body`, que queda fuera del elemento expandido, así que el detalle de un nodo se abría
  donde nadie podía verlo. `NodoDetalleModal` acepta ahora un `contenedor` y el panel le pasa el
  marco cuando está expandido.

### Cambiado

- **El selector de servidores/servicios se mueve a la derecha**, junto a «Pantalla completa» y al
  enlace de la sección. Estaba pegado al título, lejos de los controles con los que se usa.

---

## [2.50.0] - 2026-08-31

### Agregado: pantalla completa también en el mapa de servidores

La sección de Huachicol del inicio estrena el mismo botón que el roadmap, en sus dos vistas. El
mapa de nodos se centra y aprovecha todo el alto en vez de quedarse del tamaño de la tarjeta, que
es donde más se agradece: es un diagrama que se lee mal en un recuadro.

Sale de un hook compartido, `shared/hooks/usePantallaCompleta`, con la API del navegador y el aviso
cuando la niega. Cualquier sección que lo quiera son tres líneas.

### Cambiado

- **El roadmap aprovecha el alto en pantalla completa.** Antes conservaba su tamaño y dejaba el
  espacio vacío arriba y abajo; ahora el lienzo crece a lo alto de la pantalla y queda centrado,
  con el scroll horizontal intacto.
- **Los controles vuelven al encabezado cuando no hay pantalla completa.** La 2.45.0 los había
  metido al lienzo para que sobrevivieran al expandir, pero ahí estorbaban en la vista normal. Ahora
  viven en el encabezado, a la derecha, y solo se mudan adentro al expandir, que es cuando el
  encabezado queda fuera del elemento.

### Interno

- Las llamadas a la API del roadmap salen del panel a `useRoadmapHitos`. El componente pasa de 330
  líneas a 281 y deja de mezclar el estado de la vista con el de los datos.

---

## [2.49.0] - 2026-08-31

### Agregado: los bloques de la tarjetita se pueden duplicar

Cada bloque del cuerpo trae un botón de copiar en su encabezado, y la copia aparece **justo debajo
del original**, ya con su contenido. Sirve para lo que antes no se podía: un grupo de etiquetas
arriba y otro al final, dos listas separadas por las cifras. El **encabezado no se duplica**: se
pinta siempre arriba y solo puede haber uno.

Los chips de «Agregar bloque» siguen desapareciendo al usarlos —uno por tipo—; a partir del segundo
se duplica desde el bloque, que es donde se ve qué se está copiando.

Al agregar o duplicar, la vista **se desplaza sola hasta el bloque nuevo**, que hasta ahora aparecía
fuera de pantalla en tarjetitas largas.

La mecánica de instancias, orden y colapso a la forma simple vive en `constants/infoboxBlocks.js`
como funciones puras (`planAddBlock`, `planDuplicateBlock`, `planRemoveBlock`, `planSetBlockItems`),
con 17 pruebas: es la parte que más fácil se rompe y no se puede ver desde la UI.

### Cambiado: menos texto suelto en el editor de tarjetita

- La explicación larga de la sección pasa a un **tooltip** en el signo de interrogación del título.
- Las descripciones de cada bloque dejan de ir como texto gris al lado del nombre y pasan a
  **tooltip sobre el nombre**; los mismos textos explican los chips de «Agregar bloque».
- «Sin bloques. Agrega uno arriba para empezar.» queda en «Agrega un bloque para empezar.», y la
  leyenda del cuerpo en «Arrastra ⋮⋮ para reordenar.».
- Los títulos de bloque pierden el nombre técnico entre paréntesis: «Etiquetas» en vez de
  «Etiquetas (labelGroups)».

### Cambiado: la vista previa se esconde cuando no hay nada que ver

Con la tarjetita vacía la columna de vista previa mostraba un hueco. Ahora se oculta y el editor
ocupa el ancho completo; reaparece en cuanto hay un bloque o se hereda del grupo.

### Corregido: la barra de scroll horizontal del editor

Los renglones de lista llevaban dos botones de texto —`raw` y `multivalor`— que no cabían en la
columna. Pasan a íconos con tooltip, los anchos fijos de los afijos y del selector de estilo pasan a
mínimos flexibles, y los contenedores ganan `minWidth: 0` para poder encogerse. Se ajusta también el
tirador de arrastre, que quedaba encima del botón nuevo.

## [2.48.0] - 2026-08-31

### Cambiado: la barra de acciones del arbol se vacia

Quedaba una fila de botones sobre el arbol que le robaba alto sin ganar nada. **Recargar** se fue
—el arbol no lo editan veinte personas a la vez—, **Nuevo** se volvio un boton de icono a la derecha
de las pestanas Capas/Eventos/Papelera, y **Etiquetas en lote** se mudo al modal de configuracion
general, que ahora agrupa lo que aplica a varias capas de golpe.

El **historial** paso al encabezado de la pagina, junto al engrane, como boton de icono. El
buscador se alinea a la derecha, en la misma linea que la descripcion de la subpagina, que vuelve.

Tambien se fue el marco que envolvia el arbol y el editor: robaba ancho sin separar nada que no
separara ya el propio encabezado.

### Cambiado: Avanzado se abre desde el encabezado del nodo y trae Mover

*Avanzado* dejo de vivir en la barra de pestanas y es el unico boton del encabezado del nodo. Lo
primero que aparece adentro es **Ubicacion en el arbol**, con la ruta actual y el boton de mover:
antes habia que abrir un modal aparte. Al fondo sigue Archivar.

El boton de publicar **solo aparece cuando hay algo que publicar**; antes decia «Todo publicado»
ocupando lugar para no decir nada.

### Cambiado: todas las secciones del editor se colapsan, abierta solo la primera

Identidad, Apariencia, Metadatos y Avanzado usan el mismo comportamiento: la primera seccion abierta
y el resto plegadas, para llegar de un golpe a la que interesa. Metadatos se partio en cinco
secciones —Informacion general, Fuentes, Metodologia, Referencias cartograficas y Archivos
adjuntos— que antes eran tarjetas apiladas sin plegar.

### Cambiado: la hoja de publicacion muestra el valor anterior

Cada cambio se lee como `antes → despues` en vez de solo el valor nuevo. De las capas que no estan
abiertas no se conoce el valor publicado, y eso se dice con un `?` en vez de inventarlo.

### Agregado: un grupo se puede archivar junto con sus propiedades

`DELETE /layers/{id}` acepta `?cascade=true` y archiva el nodo con toda su descendencia viva. Antes
el backend bloqueaba en seco —«elimina o mueve los hijos primero»— y `force` no lo saltaba: vaciar a
mano un grupo de veinte propiedades no era trabajo de nadie. El modal lo pide con una casilla y deja
claro que **las propiedades se van con el grupo**, porque no son capas aparte sino filtros del mismo
feature type.

Restaurar sigue siendo capa por capa, de arriba abajo: `restore_layer` exige que el padre no este en
papelera.

### Eliminado: tres avisos mas, ahora en el tooltip de su seccion

El de grupo agrupador —que se llevo consigo las etiquetas de capas hijas, feature type y wms_group,
ahora con el detalle en su tooltip—, el del feature type heredado en el editor de SLD, y el de SLD no
editable visualmente, que ademas ocupaba una lista de vinetas y un `<details>` para decir que hay que
editarlo en GeoServer.

## [2.47.0] - 2026-08-31

### Agregado: autoguardado con publicacion explicita

El boton «Guardar» desaparecio. Lo que escribes se guarda solo como borrador —debounce de 1.5 s—
y un boton junto al titulo **Capas MapaLab** dice cuantos cambios llevas sin publicar. Esta ahi
siempre, tanto en el arbol como editando, asi que nadie se va de la pantalla creyendo que publico.

Al pulsarlo abre la **hoja de revision**: los cambios agrupados por capa y por pestana, con una
casilla en cada uno para dejar fuera lo que no quieras publicar todavia. Publica solo lo marcado.
Para quien no es administradora, el mismo boton manda a revision en vez de publicar.

Se apoya en la tabla `borradores` que ya existia: el borrador guarda **solo los campos que
cambiaron**, que es justo lo que `_apply_layer` necesita para aprobarlo. El administrador gana una
red que no tenia —hasta ahora un error suyo entraba en vivo al instante—.

### Agregado: historial de cambios de la capa en el editor

El boton *Historial* del encabezado abre el mismo panel que ya usaba el modo tabla, filtrado a la
capa abierta.

**Para que ese historial sirviera hubo que empezar a escribirlo.** `mapalab.grid_cell_history` ya
tenia prevista la fuente `formulario` —el drawer incluso la pintaba como «Ficha»— pero nadie la
escribia: solo la tabla registraba historial, asi que todo lo editado desde el arbol era invisible.
`PUT /layers/{id}` ahora compara antes y despues y registra cada campo que cambio. Si el registro
falla, el cambio de la capa se guarda igual: el historial no puede tumbar una edicion.

## [2.46.0] - 2026-08-31

### Cambiado: el editor de capas se reagrupa en cinco pestanas y Avanzado vuelve a ser boton

*Avanzado* dejo de ser pestana y es un boton al extremo derecho de la barra que abre un cajon.
Adentro quedan Servicios y Simbologia —y, al fondo, **Archivar capa**, que antes vivia en el
encabezado compitiendo con Guardar—.

Las pestanas quedan en **Identidad, Apariencia, Tarjetita, Metadatos y Estadisticas**:

- **Apariencia** es nueva y junta lo que estaba disperso: *Estatus de capa* (antes «Badge», que no
  decia nada), *Aviso*, *Resaltado* y *Estado* —oculta y fuera de servicio, que estaban en
  Identidad—. Aviso y Badge dejan de ser pestanas propias.
- **Estadisticas** es nueva y saca la numeralia de adentro de Metadatos, donde estaba enterrada al
  fondo de un formulario largo.

Las secciones de Identidad y Apariencia son **colapsables**, para llegar de un golpe a la que
interesa. Colapsar oculta con CSS en vez de desmontar, para no perder el registro de los campos.

### Cambiado: la busqueda de capas sube al nivel de la pagina

El buscador estaba dentro del arbol, asi que desaparecia al entrar a editar. Ahora vive bajo el
selector Arbol/Tabla, visible en los dos modos: escribir en el manda de regreso al arbol filtrado.
Con eso el breadcrumb se queda solo con la ruta —**se van las flechas de paso entre hermanas**: cada
nombre de la ruta ya despliega a sus hermanos, que hacia lo mismo con un control menos.

### Cambiado: mover una capa muestra de donde sale y donde queda

El modal decia «selecciona el destino» y nada mas. Ahora muestra la ruta actual, la ruta resultante
con la capa ya colocada, y solo deja elegir temas, categorias y grupos como padre.

### Cambiado: un tema o una categoria ya no se editan con pestanas

Solo tienen Identidad y Apariencia; una barra de dos pestanas para un nodo que solo organiza era
ruido. Sus secciones se apilan y el boton de Avanzado queda arriba a la derecha.

### Eliminado: seis avisos permanentes que no informaban nada

La explicacion de cada tipo de nodo, la de Propiedad, la del feature type heredado en Metadatos, la
de los ocho slots de numeralia, la de valores legacy, la del resaltado global y la del destino al
mover. Todas eran texto fijo que aparecia siempre y empujaba el formulario hacia abajo; ahora viven
en el tooltip del elemento que describen.

**Los avisos que si avisan se quedan**: que una capa comparta metadata con sus hermanas advierte de
un efecto lateral real —editar ahi cambia varias capas—, y esconderlo seria quitar una advertencia,
no ruido.

### Corregido: la subpagina de capas se desplazaba entera

El contenedor usaba `calc(100vh - 112px)`, un numero que no cubria el margen ni el padding del
`Content` del layout: sobraban 48 px y el documento entero ganaba scroll. Ahora el alto se mide
contra la posicion real del contenedor, asi que se ajusta al viewport sin numeros magicos y el
desplazamiento ocurre dentro del panel de la pestana.

### Corregido: las capas de poligono parecian tener casilla de seleccion

El glifo de geometria de poligono era `BorderOutlined`, un cuadro vacio que se lee como checkbox sin
marcar e invitaba a creer que se podian seleccionar varias capas.

## [2.45.1] - 2026-08-31

### Corregido: las plantillas de tarjetita regañaban a los grupos

El modal decía «No se pudieron leer las columnas de la capa · revisa que la capa tenga workspace y
feature type» siempre que no había columnas, y mandaba a arreglar algo que en dos casos no está
roto: un **nodo de grupo** no apunta a ninguna capa de GeoServer, y una capa que apunta a un
**grupo de capas de GeoServer** hace que `DescribeFeatureType` devuelva vacío por diseño. En los
dos casos la pestaña de predefinidas quedaba en un callejón sin salida.

Ahora el modal distingue tres estados: mientras se leen las columnas muestra un spinner en vez del
aviso; si la capa no tiene feature type lo dice y explica por qué; y si GeoServer no devolvió
columnas lo dice sin culpar a nadie. En los dos últimos casos ofrece un botón que lleva a **Copiar
de otra capa**, que es lo que sí funciona ahí, y se deja de listar las cuatro plantillas
deshabilitadas.

### Corregido: la detección de columnas numéricas

La plantilla de polígono con cifras buscaba tipos por subcadena (`int|long|double|…`), pero el API
normaliza los tipos a `integer` y `number` antes de entregarlos. Pasa a comparar contra el conjunto
de tipos normalizados, tolerando el prefijo de espacio de nombres (`xsd:int`). El test cubría los
tipos crudos y no la forma real que devuelve el endpoint.


## [2.45.0] - 2026-08-31

### Cambiado: los controles del roadmap viven dentro del lienzo

Estaban en el encabezado de la sección, que **queda fuera del elemento en pantalla completa**: al
expandir se perdían todos menos la X del detalle. Ahora son una barra pegajosa dentro del propio
lienzo, así que sirven igual en la página, en pantalla completa y en móvil, sin duplicarlos ni
depender de hover. El editor se movió por el mismo motivo.

`SectionHeader` vuelve a como estaba: la prop `acciones` que había estrenado la 2.40.0 se retira
porque ya no la usa nadie.

### Corregido

- **El lienzo se queda en claro siempre.** En pantalla completa el navegador pintaba el fondo según
  el tema del sistema y en oscuro no se veía nada: el SVG usa negros y grises fijos porque el CMS no
  tiene modo oscuro. Ahora el marco declara `color-scheme: light` y fondo blanco explícito.
- **Las conexiones sucesorias quedaban al aire.** Cada curva de linaje seguía la opacidad de su
  nodo hijo, así que si la madre estaba escondida —un feature sin su proyecto seleccionado— la línea
  seguía dibujada apuntando a nada. Ahora toma la del más escondido de los dos.
- **`api/pyproject.toml` se había quedado en 2.43.0** mientras `admin/package.json` y este archivo
  ya iban en 2.44.0. El desfase entró con el merge de `develop` a `tamal-rojo` (`abe3d49`), que
  resolvió el conflicto de `pyproject` a favor de la rama vieja. Como es la fuente de la verdad del
  monorepo —es lo que `get_app_version()` reporta en `GET /ontoy`—, el monitor de huachicol habría
  visto una versión que no corresponde. Los dos suben juntos a 2.45.0.

---

## [2.44.0] - 2026-08-28

### Agregado: pestana Columnas en el editor de capas

El WFS entrega los nombres crudos de la base —`cve_mun`, `p_total`, `nom_loc`— y la tabla de datos
del visor los muestra tal cual mientras nadie los configure. La pestana Columnas del cajon de la
capa guarda el alias, el orden, la visibilidad y el formato de cada una, sobre la lista de campos
que ya trae `listGeoserverFields`. La geometria no se lista y las columnas guardadas que la capa ya
no tiene se marcan para poder quitarlas.

`GET` y `PUT /layer-metadata/{layer_key}/columnas` escriben en el schema `atributos` de dataengine,
que llega en su migracion 0046. El `PUT` pide `mariachi.mapalab.manage`, como el resto de la
configuracion de capas.

## [2.43.0] - 2026-08-31

### Agregado: plantillas de tarjetita en el editor de capas

Un botón **Plantillas** junto al segmento Visual/JSON abre un modal con dos pestañas:

- **Predefinidas** — cuatro arranques (punto simple, punto con municipio, punto con contacto,
  polígono con cifras) que se arman **con las columnas reales de la capa**, no con nombres
  inventados: si la plantilla no encuentra columna de título se ofrece deshabilitada y dice por
  qué. La de contacto usa el `compose` nuevo para armar la dirección de `calle`, `numero`,
  `colonia` y `cp` cuando vienen separadas, y cae a una sola columna cuando ya viene completa.
- **Copiar de otra capa** — busca entre las capas del árbol que ya tienen tarjetita y trae la suya.

Las dos pestañas comparten la vista previa, y aplicar sobre una tarjetita que ya tiene bloques
**pide confirmación** antes de reemplazarla.

### Cambiado: el botón y el segmento se van a la derecha del título

El segmento Visual/JSON estaba pegado al texto del título. Ahora el título queda a la izquierda y
los dos controles alineados a la derecha, en un `InfoBoxEditorHeader` compartido: el editor de
capas y el cajón de contenido tenían el mismo bloque duplicado y ahora es uno solo.

`STYLE_PRESETS` sale de `InfoBoxBlocksEditor` a `constants/infoboxStyles.js`, que es de donde las
plantillas toman los colores de municipio y característica.

### Cambiado: la pestaña se llama «Tarjetita»

Es como se le dice de hecho. Cambia en el editor de capas y en el cajón de contenido, y con ella
los mensajes de guardado.

## [2.42.0] - 2026-08-31

### Cambiado: el editor de capas agrupa sus campos y saca Avanzado de las pestanas

*Avanzado* dejo de ser una cuarta pestana y es un boton al extremo derecho de la barra, que abre un
cajon con Apariencia, Servicios, Simbologia, Aviso y Badge apiladas. Las pestanas quedan como lo
que son —tres conjuntos del mismo nivel— y lo ocasional deja de competir por ese lugar.

Identidad se partio en tres conjuntos con encabezado propio: **Nombre y acceso**, **Busqueda en el
visor** y **Estado**. Antes eran nueve campos seguidos sin ninguna division.

### Cambiado: la ayuda de cada tipo de nodo vive en su badge, no en un aviso

El recuadro azul que explicaba el tipo de nodo ocupaba un renglon completo arriba del formulario en
cada capa que se abriera. Ahora el badge del tipo esta junto al titulo y lleva esa explicacion en su
tooltip; lo mismo el aviso de Propiedad, que ademas nunca decia donde estaba el filtro CQL que la
distingue de sus hermanas. Los badges de estado —oculta, fuera de servicio— tambien explican en
tooltip que significan.

En Metadatos, el aviso permanente se reduce a una linea con el feature type y su tooltip. Los dos
casos que si informan algo —el nodo que deriva el feature type de sus descendientes y la capa que
comparte metadata con hermanas— siguen siendo un aviso visible, porque avisan de un efecto lateral.

### Corregido: el scroll estaba en la subpagina completa y no en el contenido

El editor entero se desplazaba, asi que la barra de pestanas se iba hacia arriba al bajar por un
formulario largo y volver a cambiar de pestana obligaba a subir. Ahora la ruta, el titulo y las
pestanas quedan fijos y el desplazamiento ocurre dentro del panel de la pestana.

## [2.41.0] - 2026-08-31

### Cambiado: el botón del marcador pausa en vez de dejar de seguirlo

Antes alternaba entre seguir el marcador con el scroll y soltarlo. Ahora **detiene el marcador**,
que es lo que la gente espera de un elemento que se mueve solo. El scroll sigue enganchado mientras
corre y se suelta en cuanto alguien desplaza a mano, sin pedir permiso ni un botón para ello.

### Agregado

- **Pantalla completa** sobre el lienzo, con la API del navegador. Si el navegador la niega, se
  avisa en vez de quedarse callado.
- **Botón de cerrar en el detalle.** Al fijarlo con un clic aparece una X; antes solo se cerraba
  haciendo clic fuera o en el mismo hito.

### Corregido

- **El detalle no cambiaba al tocar otro hito.** Los nodos, los ciclos y los procesos no pasaban el
  evento del clic, así que el detalle se quedaba con la posición del primer hover y ya no se movía.
  Ahora lo pasan los tres, y el teclado calcula la posición desde la caja del elemento.
- **Las sucesiones no resaltaban a su contraparte.** Seleccionar la intranet o el colibrí heredados
  no encendía a quien vino a relevarlos, porque el resaltado solo miraba el proyecto. Ahora recorre
  la cadena de `nace_de` en ambos sentidos, así que geoserver enciende a sextante, IGIBot a agent y
  el portal de mariachi a sitio2026.

---

## [2.40.1] - 2026-08-31

### Corregido

- `FieldValueField` exportaba el componente dos veces, nombrado y por defecto. El `export default`
  se retira: su único consumidor, `InfoBoxBlocksEditor`, siempre usó el nombrado. `knip` lo
  reportaba como export duplicado y dejaba en rojo el `check:dead-code:strict` de CI.

---

## [2.40.0] - 2026-08-31

### Agregado: logos de proyecto y un interruptor para ver los features

Los dos repos que tienen isotipo propio —**mapalab** y **vine**— lo muestran en su nodo, con el
logo arriba y el nombre abajo. Se importan por Vite desde `assets/logos/`, así que el `base` del
admin los resuelve solo. Los demás proyectos siguen sin logo: usan el escudo institucional, que
puesto en catorce nodos no distingue nada.

**Botón «Ver todos».** Hasta ahora los features solo aparecían al seleccionar su proyecto; ahora
pueden mostrarse todos a la vez, atenuados, sin perder de vista el resto del mapa.

### Cambiado

- **Las acciones de la sección pasan a la derecha del encabezado.** `SectionHeader` estrena la prop
  opcional `acciones`, que las coloca junto al enlace y las baja a su propia fila en móvil, igual
  que ya hacía con `badge`. Es aditiva: los demás usos del componente no cambian.
- **El marcador recorre el eje completo**, hasta 2030, en vez de detenerse al final del pasado.
- **La vuelta del marcador pasa de 13 a 26 segundos.** Con el recorrido más largo, iba demasiado
  rápido para seguirlo.

### Eliminado: `GET /mapalab-stats/highlights`

Se retira el endpoint junto con los esquemas `StatsHighlights`, `HighlightLayer` y `HighlightTool`.
Su único consumidor era `InicioHighlights`, que salió del inicio al entrar la hoja de ruta: llevaba
varias versiones sirviendo a nadie y consultando tres tablas de rollup en cada llamada.

Las otras catorce rutas de `mapalab-stats` no se tocan, y el `Highlight*` de `schemas/layer.py` —el
resaltado de capas del visor— es otra cosa y sigue igual.

### Agregado: pruebas

- `api/tests/test_roadmap.py`: ocho pruebas del CRUD de la hoja de ruta. Cubren que una editora lee
  pero no escribe, que una fecha fuera de `YYYY-MM-DD` y un tipo desconocido se rechazan con 422,
  que una clave repetida da 409 y que un hito inexistente da 404.
- `mariachi.roadmap.manage` entra a `TODOS_LOS_PERMISOS` del conftest.

---

## [2.39.0] - 2026-08-28

### Cambiado: el arbol de capas se reestructuro para que se entienda de un vistazo

El arbol y el editor dejaron de convivir en la misma lista. Al seleccionar una capa el arbol se
comprime en una ruta clickeable y el editor ocupa el panel completo. Antes el editor se insertaba
*entre* la fila y sus hijos: un formulario de ocho pestanas partia la lista en dos y mandaba a los
hermanos del nodo a pantallas de distancia.

La ruta no es solo decorativa. Cada nombre regresa a su nivel, cada uno abre la lista de sus
hermanas, un par de flechas pasa a la capa de al lado y un buscador salta a cualquier rama sin
volver al arbol. Recorrer capa por capa —lo que mas se hace en una jornada de captura— paso de
tres gestos a uno.

**Las ocho pestanas son cuatro.** Quedan Identidad, Tarjeta y Metadatos; Apariencia, Servicios,
Simbologia, Aviso y Badge se apilan bajo *Avanzado*. Simbologia se guarda por feature type y no
por nodo, asi que tocarla afecta a todas las hermanas que comparten el feature type: no puede
estar al mismo nivel que Identidad.

**Los seis tipos de nodo se distinguen por forma.** Tema es una banda de seccion, Categoria un
encabezado con carpeta y cuenta, Etiqueta un rotulo sin afordancia de click, Grupo un marco que
encierra a sus propiedades con el filtro CQL de cada una, y Capa una fila con el glifo de su
geometria. Antes todo dependia del color de una etiqueta de 10 px y todo parecia una capa.

**Se fue el modo «Reordenar».** El arrastre ya usaba un umbral de 8 px, asi que nunca choco con el
click: el modo no protegia de nada. El asa aparece al pasar el cursor. En el arbol, un tema o una
categoria se abre y una capa se edita —una fila, un objetivo—; editar un tema es raro y vive en el
lapiz del hover.

### Corregido: tres senales de la fila nunca se pintaban

`toAntTreeData` leia `workspaceAlias`, `geoserverLayer` y `disabled` al nivel del nodo, pero el
arbol del visor anida los dos primeros dentro de `wmsConfig` y codificaba el tercero como un
asterisco en el nombre. La etiqueta del workspace, el nombre de la capa de GeoServer y la marca de
deshabilitada estaban escritas en el codigo y no aparecian nunca; buscar por workspace o por capa
de GeoServer no devolvia nada porque comparaba contra campos vacios.

El mapeo ahora hace el mismo respaldo que ya hacian `flattenLeaves` y `findLeafByWsLayer` treinta
lineas mas abajo, y acepta tanto `disabled` como el asterisco del arbol viejo, para cubrir la
ventana entre desplegar mapalab 1.146.0 y esto.

### Corregido: buscar en el arbol lo dejaba desplegado para siempre

El filtro acumulaba las claves encontradas en el estado de expansion y lo guardaba en
`localStorage`. Al vaciar el campo, el arbol quedaba abierto de par en par —y asi seguia en la
siguiente sesion—. Ahora la expansion del filtro es temporal: al limpiar la busqueda el arbol
vuelve exactamente como estaba.

### Corregido: el selector de «Mover» no dejaba ver el tipo del destino

`buildMoveTreeData` solo conservaba `value` y `title`, asi que en la lista de destinos un Tema y
una Capa se veian identicos. El backend bloquea ciclos y auto-padre pero no valida el tipo del
padre, de modo que se podia colgar un Tema debajo de una Capa sin que nada avisara. Cada destino
muestra su tipo y solo Tema, Categoria y Grupo son seleccionables.

## [2.38.0] - 2026-08-28

### Eliminado: `GET /mapalab-stats/highlights`

Se retira el endpoint junto con los esquemas `StatsHighlights`, `HighlightLayer` y `HighlightTool`.
Su único consumidor era `InicioHighlights`, que salió del inicio en la 2.35.0 al entrar la hoja de
ruta: llevaba tres versiones sirviendo a nadie y consultando tres tablas de rollup en cada llamada.

Las otras catorce rutas de `mapalab-stats` no se tocan, y el `Highlight*` de `schemas/layer.py` —el
resaltado de capas del visor— es otra cosa y sigue igual.

### Agregado

- `tests/test_roadmap.py`: ocho pruebas sobre el CRUD de la hoja de ruta. Cubren que una editora
  lee pero no escribe, que una fecha fuera de `YYYY-MM-DD` y un tipo desconocido se rechazan con
  422, que una clave repetida da 409 y que un hito inexistente da 404.
- `mariachi.roadmap.manage` en `TODOS_LOS_PERMISOS` del conftest.

---

## [2.37.0] - 2026-08-28

### Agregado: el editor de tarjeta arma un dato con varias columnas

`compose` sustituye a `field` en el título, la lista, las cifras, los íconos con texto y las
etiquetas con estilo propio: une varias columnas en un solo valor, con `prefix` y `suffix` por
parte y `sep` como pegamento. Es lo que hacía falta para la dirección, que llega partida en
`calle`, `numero`, `colonia` y `cp`. En las cifras, `op: 'sum'` suma las columnas en vez de unirlas.

Los cuatro selectores de campo casi idénticos del editor salieron a **`FieldValueField`**, que
alterna entre «Un campo» y «Campos combinados» y es el único lugar donde se editan las partes.
`InfoBoxBlocksEditor` **baja** de 1154 a 1106 líneas en vez de crecer. El preview del editor
resuelve las combinaciones con los mismos datos de ejemplo, así que sigue mostrando lo que el
visor va a pintar.

Los renglones de lista ganan el interruptor **multivalor**, que parte el valor por `; ` —el
separador acordado para las columnas con varios valores— y lo muestra como varios renglones.

### Agregado: las propuestas ciudadanas aceptan campos combinados

`InfoboxPropuestaConfig` deja de exigir `field` y admite `compose`, con exactamente uno de los dos
por fila. **`referenced_fields()` recorre las partes**, que es lo que ata cada columna a las que
`DescribeFeatureType` reporta para la capa: sin eso el endpoint público habría aceptado nombres de
columna arbitrarios. Topes nuevos: 6 partes por combinación, 16 caracteres por `prefix` o `suffix`
y 8 por separador, todo contra los 8 KB de siempre.

`headerField` acepta la forma combinada además de la cadena. Sin eso, una capa cuyo título ya
fuera compuesto rechazaba con 422 cualquier propuesta sobre ella.

### Corregido: el separador de una combinación perdía sus espacios

`str_strip_whitespace` del esquema recortaba `sep`, `prefix` y `suffix`, así que un separador
`", "` se guardaba como `","` y uno de un solo espacio quedaba vacío. En esos tres campos el
espacio es el dato: ahora se guardan tal cual.

## [2.36.0] - 2026-08-28

### Agregado: la hoja de ruta se edita desde el CMS

Los hitos dejan de ser una constante del admin y pasan a la base. Corregir una fecha ya no pide un
deploy.

**Migración `r0adm4p0001`**, sobre la cabeza `m3rg30001`. Crea `roadmap_hitos` y la siembra con los
**52 hitos** que hasta ahora vivían en `constants/roadmapHitos.js`, que se elimina. La tabla lleva
índice único por `clave` e índice por `proyecto`.

**Cuatro endpoints** bajo `/api/mariachi/roadmap`: `GET /hitos` para cualquiera del panel, y
`POST`, `PUT` y `DELETE` detrás del permiso nuevo **`mariachi.roadmap.manage`**, ya declarado en
`manifest.minerva.yml`. Los tres de escritura pasan por `verify_csrf`.

**El modo edición aparece solo con el permiso.** Quien no lo tenga no ve el botón. Dentro se puede
cambiar etiqueta, fecha del eje, fecha visible, proyecto, tipo, feature de, nombre anterior, la
bandera de desarrollo y el motivo; agregar un hito; y eliminarlo. Al guardar, el acomodo se
recalcula solo — que es justo lo que la prueba del acomodo protege.

**El marcador que recorre la línea se elige entre doce**, desde el mismo panel de edición.

`fecha_eje` se valida como `YYYY-MM-DD` y `tipo` contra los ocho conocidos, así que una fecha mal
escrita no llega a romper el acomodo en el navegador.

---

## [2.35.0] - 2026-08-28

### Agregado: la hoja de ruta del ecosistema en el inicio

La sección que estrenó la 2.34.0 se rehace entera. Aquella dibujaba fichas por proyecto con
`v2.0.0` y una lista de ocho repos; esta es una línea de tiempo de **cincuenta y dos hitos, de los
sexenios anteriores a 2027**, con las mismas piezas del mapa de nodos: `curvaDe`, `puntoEnCurva` y
un bucle de `requestAnimationFrame`.

**En el eje solo van versiones completas.** `mariachi 2`, no `v2.0.0`. Los `0.x` bajan a feature de
su proyecto y no se dibujan hasta que se selecciona: son veinte etiquetas que dejan de estorbar.

**El eje no es lineal a propósito.** Siete de los hitos caen en once días de agosto de 2026: a
escala pareja se apilan en dos milímetros. Cada año ocupa el ancho que le tocó por lo que pasó en
él y dentro del año los meses sí son proporcionales.

**Seis tipos de hito, y la forma dice cuál es:** versión mayor, lanzamiento oficial, proyecto joven
sin 1.0, feature fuerte, muerto (rojo, tachado) y legado de sexenios anteriores. Los renombres y
las sucesiones se dibujan como curva punteada con su leyenda —`se renombra`, `lo hereda`,
`lo sucede`, `mismo nombre, todo nuevo`—, así que `geoserver 1` conserva el nombre que tenía en
febrero en vez de fingir que ya era sextante.

**Dos formas viven clavadas en el eje:** rombo para un momento de infraestructura y cuadrado para
un proceso anual, con las etiquetas de los procesos hacia arriba y las de los momentos hacia abajo.

**El acomodo se calcula solo.** Ordena por fecha y baja de nivel hasta encontrar hueco; sin esto,
agregar un hito obligaba a recolocar el resto a mano.

Las bandas de ciclo van de fondo y al seleccionarlas se encienden solas **sin apagar los nodos**.
Al seleccionar un hito se resaltan los de su proyecto, sus features aparecen y el resto baja de
opacidad. El detalle sale por tooltip —cursor, tap o teclado—, no por ficha fija.

Datos y modelo completos en el repositorio de contexto; aquí viven como constante.

### Eliminado

- `InicioHighlights`, su export en `mapalab-stats` y el cliente `getHighlights()`, retirados del
  inicio al entrar esta sección. El endpoint `GET /mapalab-stats/highlights` sigue vivo y sin
  consumidor.

---

## [2.34.3] - 2026-08-28

### Corregido: el hueco entre las barras y sus cifras

La columna de la derecha medía 116 px fijos con el texto pegado a su borde, así que entre el final de
la barra y el número quedaba un vacío mucho mayor que el que separa la etiqueta de la barra. Baja a
92 px —lo que ocupa la cifra más larga— y la etiqueta a 44, con lo que los tres bloques quedan a la
misma distancia. Aplica igual a los medidores y a la rejilla de núcleos.

## [2.34.2] - 2026-08-28

### Corregido: las temperaturas no cuadraban con su leyenda

Las cifras iban pegadas a la izquierda de su columna y la leyenda de la gráfica se repartía con otro
criterio, así que el número de un sensor y su nombre no caían en la misma vertical. Ahora ambas usan
el mismo reparto en columnas iguales y van centradas, de modo que cada grado queda sobre su etiqueta.

El número dentro de cada núcleo sube de opacidad para que se lea sobre los cuadros más claros.

## [2.34.1] - 2026-08-28

### Cambiado: se recorta lo que el detalle del nodo decía dos veces

Cada núcleo lleva ahora su número y su porcentaje **dentro del cuadro**, en lugar de esconderlos tras
el cursor: el dato se lee sin apuntar y sin agrandar la rejilla. El texto cambia a blanco en los
núcleos ocupados, donde el fondo va a fondo.

Fuera tres repeticiones:

- La nota `carga 5.45 en 20 núcleos` del CPU, que ya no aporta junto a la rejilla.
- El `libres ·` de la RAM, que quedó en `4.35 GB caché` a secas.
- Los grados en la leyenda de la gráfica, que están enormes justo arriba. La leyenda se queda con el
  nombre del sensor y su color, repartida a lo ancho de su fila.

## [2.34.0] - 2026-08-28

### Cambiado: el CPU se representa con sus núcleos, sin barra de promedio

La barra del promedio y la rejilla de núcleos decían lo mismo dos veces, y la primera decía menos.
Ahora los núcleos ocupan ese lugar y el promedio se queda como cifra a la derecha, con la carga
debajo.

**Los núcleos pasan de barras a una rejilla de cuadros**, de a diez por fila, con la intensidad del
color según el uso —los ociosos casi transparentes, los saturados a fondo—. Con veinte núcleos las
barras de altura variable se leían como un ecualizador y costaba ubicar cuál era cuál; los cuadros
mantienen su sitio y se comparan de un golpe, que es como lo resuelven `htop` y Proxmox.

### Corregido: el caché ya no cuenta como memoria libre

La cifra de libres se calculaba restando lo usado y el caché al total, y eso regalaba el slab no
reclamable: daba más memoria libre de la que hay. Ahora se toma `MemFree` tal como lo reporta el
kernel, que es la misma columna que muestra `top`.

### Cambiado: la línea del sistema se acomoda según la pantalla

En escritorio va a la derecha del identificador del nodo, sobre la misma línea; en móvil baja a su
propia fila.

## [2.33.0] - 2026-08-28

### Agregado: los núcleos del CPU, uno por uno

Bajo el medidor va una barra por núcleo con su uso real, medido por huachicol 2.16.0 sobre
`/proc/stat`. En una máquina de veinte se ve de un vistazo lo que un promedio esconde: si el trabajo
está repartido o si hay un solo core clavado al 100 % mientras el resto duerme —el caso típico de un
proceso que no paraleliza—. Los que están casi ociosos se dibujan atenuados para que el ojo vaya a
los que trabajan.

El porcentaje del medidor ahora es **uso real de CPU**, no la carga dividida entre núcleos: mide
tiempo ocupado, que es lo que la gente espera de un «% de CPU». La carga sigue abajo como nota,
porque dice algo distinto —cuántos procesos esperan turno— y con eso se distingue un equipo ocupado
de uno saturado.

### Cambiado: la barra de RAM lleva el caché en el mismo riel

Un tramo con el color a fondo para lo que usan las aplicaciones y otro más tenue, del mismo tono,
para el caché. La cifra pasa a decir **libres sobre el total**, con el caché desglosado debajo.

Así los cuatro valores están a la vista sin hacer cuentas: lo ocupado y el caché se ven en la barra,
lo libre se lee en el número, y el total cierra la operación. Es la lectura que `top` obliga a armar
mentalmente entre tres columnas.

## [2.32.0] - 2026-08-28

### Cambiado: el medidor de CPU dice un porcentaje, no una carga suelta

Mostraba `2.17 · 20c` y la barra iba llena a esa proporción, sin decir de qué. Eso solo se entiende
sabiendo qué es el promedio de carga de Linux, que no es un porcentaje: es cuántos procesos hay en
cola de ejecución, y por eso puede pasar de 1 por núcleo.

Ahora el medidor dice **`15 %`**, coherente con RAM, swap y disco, y debajo en letra chica la cifra
de origen: `carga 1.24 en 8 núcleos`. El porcentaje es la carga dividida entre los núcleos, que es lo
que hace comparable a S4, de cuatro, con S1, de ocho.

### Agregado: la RAM muestra cuánto de lo libre es caché

Bajo la cifra va ahora `+ 6.28 GB en caché`. La barra sigue midiendo lo mismo —`MemTotal` menos
`MemAvailable`, que es lo correcto— pero sin ver el caché no había forma de cuadrar el número contra
`top`, donde el mismo equipo se lee «1.9 libre, 11 en buff/cache» y parece contradecir un 63 %.

### Cambiado: la línea del sistema sube al encabezado del modal

`gateway · Ubuntu 26.04 LTS · kernel 7.0.0-30 · encendido hace 4 d` va como segunda fila del título,
bajo el identificador del nodo, en vez de perdida entre los medidores. El título permite salto de
línea, así que en móvil se acomoda en su propia fila sin recortarse.

## [2.31.1] - 2026-08-28

### Cambiado: las líneas de temperatura usan la paleta institucional

Morado para el CPU, naranja para el sistema y verde para el disco —los tres de la marca `iieg`— en vez
del azul genérico que traía el sistema. Gráficos, si algún equipo lo expone, va en el azul secundario.

## [2.31.0] - 2026-08-28

### Agregado: la tendencia de temperaturas en el detalle del nodo

Bajo las cifras va ahora una gráfica con una línea por sensor sobre el mismo eje, con lo que huachicol
2.15.0 empezó a guardar. Las cifras se quedan: dicen cómo está **ahora**, y la línea dice si eso es
normal o viene subiendo, que es la pregunta que un número suelto no contesta.

Las tres líneas comparten eje a propósito: si suben todas es la sala, si sube solo el CPU es carga.
El eje vertical se ajusta al rango real de los datos en vez de fijarse en 0–100, para que una
variación de cinco grados se vea como tal y no como una raya plana.

Se pide al abrir el modal, no con el resto del tablero, y solo para nodos reales —Internet no tiene
host que graficar—. Mientras carga lo dice, en vez de afirmar que no hay datos; con un solo punto
tampoco dibuja, porque una línea de un punto no es una tendencia.

**Va a estar vacía un rato**, y eso es correcto: se muestrea cada cinco minutos y la serie empieza
desde cero. En las VMs, que no tienen sensores, no habrá nunca datos de temperatura.

### Cambiado: el detalle del nodo se parte en tres archivos

`NodoDetalleModal` pasó de 300 líneas. Los componentes de presentación —título de sección, medidor,
cifra de temperatura— salen a `piezasNodo`, y los cálculos puros —umbrales, escala de temperatura,
disco libre— a `nodoUtils`, que además quita los avisos de recarga en caliente por mezclar funciones
con componentes.

## [2.30.2] - 2026-08-28

### Cambiado: el puerto se queda solo en la entrada pública

Puesto en cada conexión cargaba el mapa sin aportar: la latencia y el color ya cuentan cómo va el
enlace, y el puerto solo importa cuando alguien va a revisar por qué falla, momento en el que está en
el detalle del nodo. En Internet sí se queda, porque ahí el 80 y el 443 **son** lo que define esa
entrada.

Las temperaturas se reparten a lo ancho del modal en columnas iguales, en vez de amontonarse a la
izquierda.

## [2.30.1] - 2026-08-28

### Cambiado: las temperaturas se leen como cifras, no como barras

Una barra promete una escala llena y para la temperatura eso confunde: 78 sobre 100 no significa
«78 % de calor disponible». Ahora cada sensor es una cifra grande, coloreada según el tramo, con su
nombre y una palabra debajo —fría, templada, caliente, muy caliente—. El número manda y el color lo
refuerza.

### Agregado: el dominio en el nodo de Internet y el puerto en cada conexión

El nodo de Internet muestra el dominio por el que se está entrando, en lugar del texto genérico. Y
las conexiones dicen ahora por qué puerto se midieron —`:6432 · 6 ms`—, igual que la entrada pública
ya mostraba sus 80 y 443. Con seis enlaces el mapa lo absorbe sin apretarse; si algún día son
muchos más, el puerto es lo primero que se puede recortar.

## [2.30.0] - 2026-08-28

### Cambiado: las temperaturas tienen su propia sección, con barra por sensor

La etiqueta suelta se queda corta cuando hay más de una lectura. Ahora es una sección como las demás,
con una barra por sensor —CPU, Sistema, Disco y Gráficos, según lo que el equipo exponga— sobre una
escala fija de 0 a 100 °C, y el color siguiendo el calor: azul fría, verde templada, naranja caliente,
roja muy caliente.

Va aparte de **Recursos** a propósito: esos medidores dicen cuánto se usa de lo disponible y la
temperatura no tiene un «disponible». Mezclarlas hacía leer la barra como si 78 °C fuera «78 % de
algo».

La sección desaparece entera si el equipo no tiene sensores, que es lo normal en una VM.

## [2.29.0] - 2026-08-28

### Agregado: la temperatura del CPU en el detalle del nodo

Una etiqueta que cambia de color con el calor —azul si está fría, verde templada, naranja caliente y
roja muy caliente— junto a los grados. Solo aparece si el equipo tiene sensores: las VMs no los
tienen y ahí no se dibuja nada, en vez de fingir un cero.

### Cambiado: los nodos del mapa usan el color institucional

El morado de la marca para los nodos activos, gris para los que no responden y naranja para los de
red aislada, que además van punteados. El estado deja de competir con las conexiones, que siguen
coloreadas por su latencia: el nodo dice qué es, el enlace dice cómo va.

### Cambiado: los títulos del detalle del nodo

Todas las secciones llevan ahora el mismo encabezado, **Recursos** incluida, que era la única sin
título. El conteo se separa en una etiqueta gris —`7/7`, `11/11`— en vez de ir pegado al texto con un
punto medio.

### Corregido: el selector volvía a su propia fila en escritorio

Al partir el encabezado en dos filas para móvil, los controles se bajaron también en pantallas
grandes, donde sobra espacio al lado del título. Ahora solo se apilan cuando hace falta.

## [2.28.2] - 2026-08-28

### Corregido: el hostname no se alcanzaba a ver

Iba en el título del modal, junto al identificador del nodo, y ahí Ant Design recorta con puntos
suspensivos: en pantallas normales el nombre del servidor se perdía. Ahora encabeza la línea de
sistema del cuerpo —`gateway · Ubuntu 26.04 LTS · kernel 7.0.0-30`—, donde hay ancho de sobra y
además queda junto al resto de la identidad de la máquina.

### Cambiado: los puertos pierden la franja de color

Se quedan con el fondo suave y el número en monoespaciada. La franja lateral repetía lo que el color
del fondo ya decía.

## [2.28.1] - 2026-08-28

### Corregido: los medidores del nodo salían en cero

El catálogo del frontend guardaba el hostname del servidor bajo la clave `host`, la misma que el
monitor usa para las métricas de la máquina. Al fusionar catálogo y nodo, el nombre **pisaba las
mediciones**: `host` dejaba de ser un objeto con RAM, CPU y disco para volverse la cadena `gateway`,
y los cuatro medidores se quedaban en cero.

Ningún test lo cazó porque todos construían el nodo a mano, ya fusionado. Ahora hay uno que monta la
página con una **respuesta real del monitor** y comprueba que las barras no estén todas en cero: es
el único que habría fallado.

### Cambiado: Internet aparece como nodo del mapa

Un nodo aparte, en línea punteada, conectado a S1 por los puertos 80 y 443. Al abrirlo explica que
todo el tráfico público entra por el nginx de gateway-hub y que ningún otro nodo está expuesto,
además del dominio por el que se está entrando. Solo aparece si el monitor reporta S1.

### Cambiado: el detalle del nodo y el encabezado de sección

Fuera la sección de enlaces del modal, que repetía lo que el mapa ya dibuja. Los puertos dejan de
verse como los contenedores: van en tarjetas con el número grande y una franja de color según
respondan.

El encabezado de sección pasa a dos filas: icono, título y acceso directo arriba; los controles
—como el selector de vista— debajo.

## [2.28.0] - 2026-08-28

### Cambiado: el detalle del nodo deja la tabla y muestra lo que sí se usa

La tabla del centro repetía lo que los medidores ya decían. En su lugar van **los puertos** que el
nodo vigila, con cuáles responden, y **los enlaces** con su latencia y su sentido. El sistema del host
—IP, distribución, kernel y desde cuándo está encendido— se resume en una línea bajo los medidores.

El encabezado cambia de peso: un punto de estado junto al identificador en vez de la etiqueta
«operativo», y el hostname real del servidor al lado. Ya no repite el rol, que se lee en la lista de
servicios.

### Cambiado: el mapa dibuja curvas y las aristas son las reales

Las líneas rectas atravesaban las cajas de los nodos que quedaban en medio, y eso hacía leer enlaces
que no existen: el trazo de S1 a S4 pasaba por encima del portalito y parecía conectarlos, cuando el
portalito **no toca la base de datos**. Ahora cada enlace es una curva que se aparta de los nodos.

Las aristas que faltaban ya se miden: mapalab y sextante hacia dataengine, que según los contratos
son quienes leen de esa base.

Fuera la leyenda de latencia y la nota de «click en un nodo»: el color con los milisegundos escritos
al lado se explica solo.

### Cambiado: el inicio y el móvil

El encabezado de la sección dice **Huachicol — Ecosistema**, como el de MapaLab, con el selector
enseguida. En pantallas chicas el encabezado apila título, descripción y acciones en filas, el mapa
gana scroll en ambos ejes con control de zoom hasta 3x, y el detalle del nodo ocupa la pantalla
completa.

## [2.27.0] - 2026-08-27

### Cambiado: se migran las APIs que Ant Design 6 dejó obsoletas

El admin corre sobre Ant Design 6 desde hace meses, pero seguía llamando a propiedades de la 5 que la
librería acepta por compatibilidad mientras avisa por consola. Eran tantos avisos que tapaban
cualquier advertencia real. Migradas contra la documentación de la 6.5:

| Antes | Ahora | Dónde |
|---|---|---|
| `Alert message` | `title` | 132 |
| `Space direction` | `orientation` | 131 |
| `Drawer width` y `height` | `size` | 14 |
| `Timeline items.children` | `content` | 6 |
| `Tabs tabPosition` | `tabPlacement` | 4 |
| `Progress trailColor` | `railColor` | 1 |
| `Steps direction` | `orientation` | 1 |

Dos no eran renombres a secas. En `Tabs`, los valores `left` y `right` pasaron a `start` y `end` para
funcionar en lectura de derecha a izquierda, así que hubo que cambiarlos también dentro de las
expresiones. En `Drawer`, `size` acepta número además de `default` y `large`, con lo que los anchos en
píxeles siguen valiendo tal cual.

La consola de los tests queda **sin un solo aviso de deprecación**, que era el punto: el próximo que
aparezca será de algo que sí importa.

## [2.26.0] - 2026-08-27

### Cambiado: el detalle de un nodo reutiliza la fila del tablero de servicios

Los servicios de un nodo se pintaban con una lista propia —punto, nombre, versión— mientras el
tablero ya tenía una fila mucho más rica. Ahora el modal usa `FilaServicio`, así que cada servicio
del nodo trae su barra de 24 horas, su versión como etiqueta, su disponibilidad y sus enlaces, con
los tramos que huachicol 2.11.0 empezó a mandar.

`FilaServicio` y el catálogo de servicios suben a `shared/`, que es donde deben estar ahora que los
usan el inicio y la vista de servidores.

### Agregado: disco y contenedores en el detalle del nodo

Faltaba el disco, que es la métrica que el `/ontoy` reporta desde siempre y la única que ya estaba
medida antes de este trabajo. Va con su medidor —usado sobre total— y con los gigas libres aparte.

Los contenedores dejan de ser un conteo y se listan por nombre, con los que no están corriendo en
gris.

### Cambiado: el encabezado del modal dice el nombre real del servidor

Junto al identificador del nodo va ahora su hostname —`S1 · gateway`— y el estado se mueve a la
derecha, junto al botón de cerrar, para que no compita con el nombre. El hostname sale del catálogo,
no de una medición: es un dato que no cambia y ya estaba documentado en la topología. En el espejo
lleva el prefijo `pmx-`, que se aplica según el ambiente que reporta el monitor.

### Corregido: el mapa reventaba donde no existe `matchMedia`

`usaMovimiento()` encadenaba `.matches` sobre el resultado de una llamada opcional, así que si el
navegador no exponía `matchMedia` el componente entero fallaba en vez de animar por omisión.

## [2.25.1] - 2026-08-27

### Cambiado: la leyenda ya no lleva línea divisoria

Ni en el mapa ni en el tablero. El espacio basta para separarla del contenido, y con los divisores
entre filas ya retirados esa línea era la única que quedaba dentro de la tarjeta.

## [2.25.0] - 2026-08-27

### Cambiado: el mapa de nodos se refresca cada 20 segundos

Estaba en 60, que sumados a los 60 del sondeo del monitor dejaban hasta dos minutos entre una caída
y verla en pantalla. A 20 segundos el retraso baja a poco más de un minuto y el costo es medible pero
menor: cada petición son 3.2 KB y unos 100 ms de CPU del monitor, así que se pasa de 0.17 % a 0.5 %
de un núcleo por persona mirando.

No se baja más porque el dato de fondo no cambia más seguido: el monitor mide cada 60 segundos, y
pedir cada 5 daría doce respuestas idénticas por cada medición nueva.

**El mapa del inicio no se refrescaba en absoluto**: cargaba una vez al entrar y se quedaba con esa
foto mientras la pestaña siguiera abierta. Ahora comparte el mismo intervalo que la página de
servidores y limpia su temporizador al desmontarse.

## [2.24.1] - 2026-08-27

### Corregido: el conteo de servicios aparecía en la vista de servidores

La leyenda del mapa mostraba «8 / 10 operativos», que cuenta servicios, mientras el mapa dibujaba
seis nodos: dos cifras distintas para dos cosas distintas, juntas y sin distinguirse. Además sobraba,
porque el estado de cada nodo ya se ve en el color de su borde.

El conteo se queda solo en la vista de servicios, que es de donde sale.

## [2.24.0] - 2026-08-27

### Cambiado: el enlace del mapa dice su latencia por color y por velocidad

Antes el color del enlace solo distinguía sano de caído y la velocidad del punto mezclaba dos cosas:
como la duración era fija por arista sin importar su largo, dos enlaces con la misma latencia se
veían a distinta velocidad según qué tan separados estuvieran los nodos en el dibujo.

Ahora la duración se calcula sobre la distancia del tramo, así que **la velocidad en pantalla sí es
la latencia**: dos enlaces iguales se ven iguales aunque midan distinto en el mapa. Un piso de 700 ms
evita que un enlace rápido parpadee.

El color pasa a la latencia en tres tramos —hasta 20 ms, hasta 100 ms, más de 100 ms— y el estado
manda por encima: un enlace caído se pinta rojo, punteado y sin tráfico, así que no se confunde con
uno lento. El número de milisegundos sigue escrito junto a la línea, para no depender solo del color.

`latencia.js` concentra umbrales, escala y duración, y de ahí sale también la leyenda de las dos
vistas.

## [2.23.1] - 2026-08-27

### Corregido: el mapa de nodos salía vacío en el inicio

El panel del inicio no necesita la bitácora, así que pedía `/sistema/monitor/nodos?eventos=0`. El
proxy validaba `ge=1` y respondía **422**, con lo que la carga entera fallaba: en la subpágina, que
usa el valor por omisión, el mapa se veía bien. Ahora `0` es válido y significa «sin eventos».

### Eliminado: el aviso de servicios sin nodo

Explicaba una variable de entorno faltante a quien usa el CMS. Los servicios sin `ONTOY_NODE` se
siguen agrupando aparte, sin cartel.

## [2.23.0] - 2026-08-27

### Cambiado: el inicio alterna entre servidores y servicios

La sección de Huachicol estrena un `Segmented` en el encabezado: **Servidores** por omisión —el mapa
de nodos con sus sondeos animados y el detalle al hacer click— y **Servicios** para el tablero de 24
horas que ya estaba. El contador de operativos baja del título a la esquina derecha de la leyenda,
donde no compite con el selector, y el enlace de la derecha apunta a la página que corresponda a
cada vista.

El mapa y el modal suben a `shared/components/nodos/`, y el servicio a `shared/services`, porque
ahora los usan dos features y la convención pide que lo compartido no se importe de una feature a
otra.

## [2.22.0] - 2026-08-27

### Agregado: Huachicol · Servidores, la vista por nodo

El monitor sabía de servicios y nadie sabía de máquinas. La sección nueva —`/huachicol/servidores`,
sobre `/api/nodos` de huachicol 2.9.0— dibuja un nodo por servidor con lo que corre en él, sus
contenedores y su RAM.

**El mapa está vivo.** Cada punto que viaja por un enlace es un sondeo, y su velocidad sale de la
latencia medida: el enlace de 18 ms tarda visiblemente más que el de 4 ms. Los enlaces caídos se
pintan punteados y sin tráfico. Respeta `prefers-reduced-motion`: con esa preferencia activa el mapa
se dibuja quieto.

**Click en un nodo** —o Enter, porque son enfocables— abre su detalle: carga por núcleo, RAM, swap,
uptime, contenedores, enlaces con su latencia y los servicios que hospeda con su versión. Un nodo sin
reportero de host lo dice en vez de enseñar ceros, que es la diferencia entre «no lo mido» y «está en
cero».

**La bitácora** lista las caídas y recuperaciones con su transición: de dónde venía y a qué pasó. Sale
de la tabla `events` que el monitor llenaba desde siempre y que nadie leía.

Observabilidad no se tocó: esto vive en su propia sección.

## [2.21.0] - 2026-08-27

### Cambiado: el tablero de estatus usa el encabezado de sección del resto del inicio

El inicio tenía dos secciones con dos encabezados distintos: MapaLab con `SectionHeader` —icono,
título, subtítulo y un «Ver detalles →» a la derecha— y el tablero de Huachicol con uno propio,
metido dentro del `Card`. Ahora los dos usan el mismo componente, así que se alinean el tamaño del
título, el color del icono y la posición del enlace.

`SectionHeader` gana una prop `badge` opcional, que es lo único que le faltaba para servir en las dos
secciones: ahí va el contador de servicios operativos, que sigue en rojo cuando no están todos.

## [2.20.0] - 2026-08-26

### Agregado: el portalito aparece en el tablero de estatus

Era el único servicio del ecosistema que nadie vigilaba: ocupa `location /` del gateway y no expone
`/ontoy`. Ahora lo reporta un sidecar desplegado junto a él —huachicol 2.6.0— sin tocar su
repositorio.

Del lado del admin no hubo que hacer casi nada, porque desde 2.14.0 la lista de servicios la manda el
monitor: bastó darle su capa —**Entrada**, junto al gateway, que es donde le toca— y sus enlaces. Sin
esa entrada aparecía igual, pero bajo «Sin clasificar».

Se llama **Portalito** en el tablero y `sitio2026` en el monitor, que es el nombre de su repositorio.

## [2.19.1] - 2026-08-26

### Corregido: el editor de metadatos salía vacío en cuatro temas del visor

Llega de tamal-verde (1.122.4). `mapalab.layer_metadata` está llaveada por `<workspace de
GeoServer>:<capa>` y el admin armaba la llave con el **alias**, así que en `desarrollo`,
`gobierno`, `recursos` y `seguridad` —los cuatro donde alias y nombre real no coinciden— el `GET`
respondía 404 sobre filas que sí existían: 65 de los 119 feature types del árbol. Se traduce el
alias en la API, no en el admin, para cubrir de una vez los cuatro lugares del front que arman la
llave por su cuenta.

### Corregido: `load_layer_binding` no encontraba el `municipio_field` de esos mismos workspaces

La consulta localizaba la capa por `workspace_alias || ':' || geoserver_layer`, que ya no es la
forma de la llave que recibe. Ahora hace `JOIN` contra `mapalab.workspaces`. Es defecto latente
—ninguna capa afectada tiene hoy `stats_config` y `municipio_field` a la vez—, pero lo estrenó
esta rama junto con el editor de filtros y la vista previa con contexto, así que se cierra aquí.
`preview_stat` también traduce el alias, que en tamal-verde no hacía falta porque no había binding.

Mismo cambio en el `stats_engine` de mapalab 1.136.1.

## [2.19.0] - 2026-08-26

Ajustes de lectura sobre el tablero de estatus que estrenó 2.14.0, con el ecosistema ya corriendo
delante y las barras llenas de tramos reales.

### Cambiado: el tablero se apoya en el espacio, no en las líneas

Tres divisores competían entre sí: uno entre servicios, uno entre capas y el de la leyenda. Sobran
los dos primeros —el agrupado por capa ya separa lo que hay que separar— y quedan solo el del
encabezado, que lo pone el `Card`, y el de la leyenda, que ahora sí cruza la tarjeta de lado a lado
compensando el relleno del cuerpo. Sin la línea entre filas, el relleno vertical de cada una baja de
8 a 5 px para que el bloque de una capa se lea junto en vez de flotando.

El eje de horas dejaba 8 px arriba y 8 abajo, y se leía como parte del encabezado. Ahora lleva 12 px
de aire arriba y la primera capa arranca a 2 px, así que el tiempo queda pegado a las filas que
rotula.

La versión pasa de texto gris a `Tag`: azul cuando hay versión, gris cuando el servicio no la
reporta, con cifras tabulares para que queden a plomo entre filas. Es el mismo tratamiento que
tenían las tarjetas antes del tablero. La columna de identidad crece de 196 a 212 px para darle
lugar, con lo que a la barra le quedan unos 690 px: un píxel cada dos minutos.

### Corregido: una caída de tres minutos se veía como dos puntitos raros

Un tramo corto mide menos de un píxel sobre una barra de 24 horas, y encima le tocaba la trama
diagonal de 2 px, que a ese tamaño es ruido y no patrón. Los `timed out` de un solo sondeo —que en
gateway-hub son varios al día— quedaban ilegibles justo cuando son lo que hay que notar.

Un tramo que dura menos del 0.4 % del día se pinta ahora **sólido en el color fuerte**, con 4 px de
ancho mínimo y un halo del color suave que lo despega de sus vecinos. Los tramos largos conservan su
trama. Los huecos de datos cortos **no** se marcan: un sondeo que no se guardó no es un incidente y
no debe gritar como uno.

Las etiquetas de motivo iban con relleno vertical cero y el texto tocaba el borde de la caja; ahora
llevan 4 px arriba y abajo.

## [2.18.0] - 2026-08-25

### Agregado: la tarjeta se edita como JSON y se copia entre entornos

Pasar una tarjeta de pruebas a producción obligaba a `make backup-tarjetitas` /
`make restore-tarjetitas`: exportar el `infobox_config` de **todas** las capas a un SQL, elegir el
archivo y aplicarlo contra la otra base. Para una sola capa era un rodeo largo.

El editor de tarjetas —la pestaña **Tarjeta** del editor de capas y el cajón de contenido— abre
ahora con un selector **Visual / JSON**. En modo JSON se ve el `infobox_config` tal como se guarda,
con botones de copiar y formatear: se copia desde la capa en pruebas y se pega en la misma capa de
producción. Mientras el JSON esté roto no se toca la configuración, así que un pegado a medias no
borra la tarjeta; vaciar el campo sí la quita y devuelve la capa a lo que herede de su grupo.

Cuando la capa está heredando, el modo JSON lo dice y ofrece partir del JSON del grupo. Y si la
configuración trae claves de primer nivel que el visor no lee, las guarda pero avisa cuáles son.

### Eliminado: el aviso de herencia en la tarjeta de un grupo

El recuadro azul que explicaba que el cuadro de un grupo se hereda a sus descendientes ocupaba
espacio en cada edición para repetir algo que ya se ve del otro lado: la capa que hereda lo dice en
su propio aviso, con el nombre del grupo del que viene.

## [2.17.0] - 2026-08-24

### Agregado: herramienta para migrar el padrón a minerva

`scripts/migrar_usuarios_a_minerva.py` da de alta en minerva a la gente que ya existe en mariachi,
con los roles de la aplicación que le tocan a cada quien. Es el paso que faltaba desde `2.0.0`: la
columna `minerva_sub` y la reconciliación por correo están construidas desde entonces, pero el
padrón nunca se dio de alta del otro lado, y **minerva no emite código de autorización a quien no
tiene rol en la aplicación** —responde `access_denied` y no hay token—. Medido en el stack local:
20 usuarios en mariachi, 2 vinculados; los otros 18 no entrarían.

El mapeo vive en `app/services/minerva_migracion.py`, es función pura y tiene 13 pruebas:
`tetlamamakani` va al rol compuesto **Administrador**, y una `editora` recibe un rol atómico por
cada proyecto asignado según sea editor o viewer —«MapaLab - edicion», «SIEEJ - consulta»…—.
Un `externo` con SIEEJ recibe «SIEEJ - reportar». Quien no recibiría ningún rol **no se da de alta**:
el plan lo aparta y lo nombra, porque darlo de alta sin rol es dejarlo con una cuenta que no abre
nada.

Por omisión **solo planea**: imprime lo que haría y no escribe. Escribe con `--aplicar`, y es
idempotente, así que se puede correr dos veces o retomar una corrida a medias.

Dos cosas que la herramienta no puede resolver porque son de minerva, verificadas en su v1.0.0: su
API de administración es unitaria y exige sesión de panel de un administrador global —no hay
`client_credentials` ni delegación por aplicación—, así que el script inicia sesión como persona y
pide la credencial al operador sin guardarla; y **el alta exige contraseña**, sin flujo de
invitación, así que genera una temporal por persona y las deja en un CSV con permisos `600` que hay
que entregar por canal seguro y borrar. El procedimiento completo, en
`runbook/migracion-padron-minerva.md` del repo de contexto.

### Corregido: la migración se niega a aplicar si a minerva le faltan roles

El plan se arma con los roles que minerva declara. Si su manifiesto está viejo, los roles que cada
persona necesita no existen del otro lado y la corrida omitía al padrón entero sin un solo error a
la vista. Ahora el plan enumera los roles ausentes, nombra el síntoma —un `manifest.minerva.yml`
desactualizado— y cómo reimportarlo, y `--aplicar` se detiene antes de escribir: dar de alta media
plantilla sin acceso es peor que no correr nada.

## [2.16.1] - 2026-08-24

### Corregido: guardar en un formulario con grupos respondía 500

El coalescing del historial compara la fecha del último cambio contra el reloj para decidir si dos
ediciones seguidas colapsan en una fila. Postgres devuelve `cambiado_en` **con zona horaria** y
`utcnow()` es **naive**, así que la resta reventaba con `TypeError` y el `PATCH` de captura
respondía 500 en cada guardado.

No lo atrapó ninguna prueba porque **la suite corre sobre SQLite**, donde las dos puntas salen naive
y la resta funciona. La guarda que tenía normalizaba solo el caso contrario —fecha sin zona contra
reloj con zona—, que es el que nunca ocurre. Ahora se normalizan las dos con `to_naive_utc`, y la
prueba de regresión fuerza una fecha con zona para que el caso quede cubierto en SQLite también.

## [2.16.0] - 2026-08-21

### Cambiado: el coordinador se marca sobre la lista de miembros

Era un selector aparte, debajo del de miembros, que obligaba a volver a buscar a la persona que
acababas de agregar. Ahora los miembros elegidos se listan con su interruptor de **Coordinador** en
cada renglón: eliges a quién metes y de una vez quién coordina, sobre la misma lista. Mientras no
haya ningún miembro, la sección lo dice en vez de mostrar un control vacío.

### Agregado: un grupo que llena formularios colaborativos exige coordinador

Sin coordinador el grupo captura pero no puede entregar, y eso se descubre al final, con el trabajo
hecho. Dos bloqueos que cierran el círculo:

- **Quitar al último coordinador** de un grupo asignado a un formulario colaborativo responde 409,
  nombrando los formularios que se quedarían sin quien los envíe. Relevar al coordinador en el mismo
  guardado sí se puede: lo que se rechaza es quedarse sin ninguno.
- **Prender la bandera** con grupos sin coordinador responde 409 con la lista. No se puede entrar a
  un estado del que después no se sale.

En un grupo sin formularios colaborativos no se exige nada: puede quedarse sin coordinador sin
consecuencias. Y un grupo vacío no estorba, porque no hay a quién coordinar.

En el CMS, la lista de miembros avisa en cuanto no hay coordinador, sin esperar al guardado.

### Cambiado: la card de la tetlamamakani también cuenta proyectos

Decía «Todos los proyectos» mientras el resto del padrón mostraba un número, así que la misma
columna se leía de dos formas y no se podía comparar de un vistazo. Ahora cuenta los proyectos
activos del sistema —el mismo catálogo que la pantalla ya tiene cargado— y su tooltip los lista, sin
papel al lado del nombre, porque en ese rol el acceso no viene de una asignación sino del permiso.

## [2.15.1] - 2026-08-21

### Cambiado: el switch de captura colaborativa se mudó a Asignaciones

Estaba en Configuración, junto al de apertura periódica, por parecido de forma. Pero la bandera
**depende de los grupos**: sin grupos asignados no significa nada, y el switch vivía en una pestaña
donde no se ve si los hay. Ahora está debajo del selector de grupos, que es donde se toma la decisión
que le da sentido, y se guarda solo al accionarlo en vez de esperar al botón de la forma.

### Corregido: quitarle el grupo a un formulario colaborativo dejaba su envío sin dueño

El bloqueo de apagar la bandera existía, pero había una segunda puerta al mismo problema: desasignar
el grupo. El envío seguía apuntando a un grupo que ya no ve el formulario, así que sus miembros
perdían el acceso a lo que llevaban capturado, sin aviso. Ahora responde **409** nombrando los grupos
con envíos en proceso y cuántos son. En un formulario normal los grupos se quitan como siempre.

## [2.15.0] - 2026-08-21

### Agregado: la captura colaborativa se prende desde el CMS

Hasta aquí la función estaba completa pero se activaba por SQL, que es una forma elegante de decir
que no se podía usar. Las dos piezas que faltaban:

**El switch «Captura colaborativa»**, en la pestaña Configuración del formulario, junto al de
apertura periódica. Está deshabilitado mientras el formulario no tenga grupos asignados, con el
motivo a la vista: el envío pertenece al grupo, así que sin grupos la bandera no significa nada y lo
único que lograría es que la gente crea que la función no sirve.

Apagarlo con envíos de grupo en proceso responde **409**. Apagar la bandera mueve la identidad del
envío de vuelta a la persona, y los que ya pertenecen a un grupo se quedarían sin ruta de acceso:
nadie los volvería a encontrar desde el formulario. El mensaje dice cuántos son.

**Los coordinadores**, en el drawer de miembros del grupo. `PUT /sieej/grupos/{id}/usuarios` acepta
ahora `coordinadores`, un subconjunto de `usuarios`; quien no aparezca queda como capturista. Va como
lista y no como mapa de roles porque el rol es binario, y así el cliente manda lo que la persona
marcó en vez de un diccionario que tenga que armar. `GET .../usuarios` devuelve `rol_grupo`.

### Agregado: quién capturó cuánto, en el detalle del envío

Un resumen arriba del drawer, solo en envíos de grupo: cada persona con cuántos campos dejó con su
valor actual, la barra de su proporción y la fecha de su último cambio en el tooltip.

Cuenta sobre la autoría y no sobre las filas del historial. Un campo editado tres veces sigue siendo
un campo, y se lo lleva quien lo dejó así, no quien lo empezó — que es la pregunta que uno se hace
mirando un envío de equipo.

## [2.14.0] - 2026-08-21

El inicio del admin cambia las ocho tarjetas del ecosistema por un tablero con historial de 24 horas,
y «Mis borradores» se muda al menú del avatar. Del lado de huachicol corresponde a 2.6.0, que es
quien publica los tramos que el tablero dibuja.

### Agregado: el estatus del ecosistema se lee como tablero, no como tarjetas

Ocho tarjetas iguales con nombre, versión y un punto de color no distinguían un servicio sano de uno
caído más que por ese punto, y el motivo de la caída vivía en un `Tooltip` que el teclado no alcanza.
Ahora es una fila por servicio con la barra de las últimas 24 horas, sacada de los tramos que
`/api/status` estrenó en huachicol 2.6.0.

**La barra distingue por color y por trama**, no solo por color: sólido para operativo, diagonal para
degradado, diagonal densa para caído y cuadrícula para «sin datos», que antes se confundía con una
caída. Cada tramo tiene su `Tooltip` con hora de inicio, de fin, duración y el motivo, y responde
tanto al cursor como al toque.

**Las filas se agrupan por capa** —entrada, datos, aplicaciones, internos— con su propio conteo. Con
ese orden, tres franjas rojas alineadas se leen como un incidente del ecosistema y una sola como un
servicio con problema propio. El motivo del fallo se escribe en la fila, sin pedir interacción.

**El contador va en el título** y no en una banda aparte. La versión queda junto al nombre y los
cuatro enlaces —abrir, repositorio, Taiga, reportar— siguen visibles en una columna de ancho fijo,
que es el máximo posible. En móvil la fila se parte en dos renglones sin esconder nada.

### Corregido: GeoServer nunca se conectaba con el monitor

El catálogo del admin pedía el slug `geoserver`; el monitor lo publica como `sextante` desde el
renombre del 31 de julio (huachicol 2.5.0). No empataban, así que esa tarjeta salía «no integrada»
para siempre aunque el servicio estuviera sano.

De paso deja de existir la causa: **la lista de servicios ahora la manda el monitor** y el catálogo
del frontend solo aporta enlaces y la capa de cada uno. Vine y Frames, que se sondeaban cada minuto y
no aparecían en ningún lado, salen solos; y un servicio nuevo aparece sin tocar el frontend, bajo
«Sin clasificar» hasta que se le asigne capa.

### Cambiado: «Mis borradores» vive en el menú del avatar

Los borradores son asunto de quien los escribe, no del ecosistema, y ocupaban la mitad del inicio.
Se van a un modal que se abre desde el avatar, con el mismo patrón que «Notas de versión»: montado en
`MainLayout` y sin pedir datos hasta abrirse. El avatar lleva un contador rojo cuando hay rechazados.

**Lo que sí pide acción al entrar se queda en el inicio**: la alerta de borradores rechazados y la
tarjeta de «esperando tu revisión». `InicioPage.jsx` baja de 376 líneas a 135, bajo el límite de 300
que llevaba tiempo incumpliendo, y el menú de usuario sale de `MainLayout` a `UserMenu`.

### Agregado: los colores semánticos de la marca iieg

El catálogo de identidad tenía nueve colores y ninguno era `success`, `warning`, `danger` o `info`,
aunque las normas los listan como base. Sin ellos, los colores de estado del tablero habrían quedado
sueltos en el componente, que es justo lo que la norma prohíbe. Se agregan los cuatro más su
superficie, todos AA sobre blanco y sobre su propia superficie; `warning` e `info` comparten valor
con `accent-deep` y `secondary`, que ya existían.

### Corregido: los checks de puerto en Observabilidad salían sin detalle

`describeCheck` armaba el detalle con el porcentaje de disco, los gigas libres, los contenedores y el
mensaje de error, pero ignoraba `port`, que es lo único que traen los checks de upstream del gateway.
Ocho de los nueve checks de gateway-hub se veían con la columna vacía.

### Eliminado: la clave que `POST /usuarios` aceptaba y tiraba a la basura

`UsuarioCreate` declaraba un campo de clave con validación de robustez, y `crear_usuario()` lo
excluía del `model_dump` para escribir `!minerva` en su lugar. Es decir: la API la pedía, la validaba
y después la ignoraba. Quien la mandara podía creer razonablemente que había quedado guardada.

Desde `2.0.0` mariachi no autentica: el login es OIDC contra minerva y **todas** las filas de
`usuarios` llevan `!minerva` como hash inutilizable. La credencial vive en minerva y ahí se
administra. El campo sale del esquema; el endpoint sigue aceptando la misma petición sin él.

Por lo mismo, el estado de la cuenta deja de listar «debe renovar» entre sus pendientes:
`must_change_password` es una marca heredada de la época del login local que ya nadie vuelve a poner
en `true` —las dos rutas que crean usuarios la fijan en `false`— y que ninguna pantalla del admin
sabe atender. Señalaba un trámite que en mariachi ya no existe.

Con el campo fuera, se van también los restos del login local que quedaban colgando: los dos
esquemas de cambio y reinicio de credencial —sin una sola ruta que los importara desde `2.0.0`— y
`app/core/password_policy.py` completo, cuyo único consumidor era el campo que acaba de
desaparecer. `hash_password` y `verify_password` **se quedan**: `colibri_keys` y `mapalab_keys` los
usan para las llaves de API, que sí son secretos vivos.

Quedan en `schemas/user.py` `LoginRequest`, `LoginResponse` y `TokenPayload`, igual de huérfanos
—solo reexportados en `schemas/__init__.py`—, pero son de la familia del login, no de la de las
credenciales, y salen aparte.

## [2.13.0] - 2026-08-21

Cierra los envíos colaborativos de SIEEJ: la sexta y última fase, más las dos aportaciones de
backend que las fases de sieej necesitaban y quedaron sin versionar (2.9.0 a 2.11.0 trajeron el
esquema, la captura por campo y el sync). Del lado del frontend corresponde a sieej 2.1.0 y 2.2.0.

### Agregado: el CMS dice quién llenó cada campo

**Inline en cada respuesta.** `buildRespuestas` acepta un mapa de autoría y cada entrada sale con su
autor; `RespuestasView` pinta un avatar compacto junto al valor, con nombre y fecha en el tooltip.
El drawer de detalle y la fila expandida de la tabla lo heredaron con ese único cambio, que era el
punto de tener un armado común.

**Pestaña de auditoría.** Tabla de diff con campo, valor anterior → nuevo, quién, cuándo y origen.
El endpoint `GET /sieej/formularios/{id}/envios/{envio_id}/historial` existía desde la actualización
ligera post-envío y **nunca tuvo consumidor**: solo faltaba `historialEnvio` en el cliente.

**Pestaña de actividad.** Línea de tiempo del envío sobre un endpoint nuevo,
`GET /sieej/formularios/{id}/envios/{envio_id}/eventos`, que resuelve el nombre del actor igual que
el de historial. Los eventos ya se registraban con actor; no había cómo leerlos.

**Excel y CSV.** La hoja «Historial de cambios» gana la columna `Origen`, que separa la captura de
la corrección formal. La hoja `Envios` gana `Capturado por`: `Usuario` y `Email` son el dueño del
envío, que en un formulario colaborativo no es necesariamente quien capturó. El armado de esas filas
se movió de la ruta al service, donde va la lógica por convención, y de paso sale del mismo recorrido
que ya se hacía sobre el historial.

### Agregado: el envío dice si es de grupo y quién puede cerrarlo

`EnvioResponse` expone `colaborativo`, `grupo_id`, `datos_version` y `puede_enviar`. El último va
resuelto en el servidor y no como rol, para que el cliente no reimplemente la regla del coordinador
y para que un capturista vea el botón bloqueado con el motivo en lugar de descubrirlo con un 403.

### Agregado: la autoría por campo viaja con el envío

`EnvioResponse` trae un mapa `autoria` con el último autor y fecha de cada `field_path`, para pintar
los distintivos sin una llamada extra. El historial del respondent gana `actor_nombre` y `origen`.

**El nombre solo viaja en envíos de grupo.** En uno individual el único actor posible es quien
pregunta, así que va en `null` y el frontend muestra únicamente la fecha. El correo no viaja nunca:
el nombre alcanza para la constancia y el correo no es asunto del resto del equipo. El docstring que
afirmaba que este schema «no expone al actor» quedó corregido, igual que el «append-only» de
`EnvioValorHistorial`, que dejó de ser cierto para la captura cuando entró el coalescing.

## [2.12.0] - 2026-08-21

### Agregado: la sesión se renueva antes de vencer, no después del 401

El CMS esperaba a que la cookie de acceso venciera para reaccionar: la primera petición después del
minuto 30 salía con 401, el interceptor de axios llamaba a `/autenticacion/refrescar` y reintentaba.
Funcionaba —nadie perdía la pantalla— pero dejaba 401 en la consola y un reintento por cada petición
que hubiera en vuelo. En una página que dispara varias al montar, como las estadísticas de vine,
eran dos o tres de golpe.

Ahora el backend informa cuánto le queda a la sesión en `session_expires_in`, que viaja en
`GET /autenticacion/perfil`, en `GET /autenticacion/csrf` y en la respuesta de
`POST /autenticacion/refrescar`. El admin programa el refresco dos minutos antes del vencimiento y
lo reprograma con cada respuesta, así que la cookie se renueva sola mientras la pestaña siga viva.

El valor sale del `exp` del propio token, no de una constante del frontend: cambiar
`ACCESS_TOKEN_EXPIRE_MINUTES` reajusta el calendario sin tocar el bundle.

**Los temporizadores no sobreviven a una laptop suspendida**, y en pestaña de fondo Chrome los
retrasa minutos. Por eso el refresco también se revisa en `visibilitychange`: al volver el foco, si
la hora programada ya pasó, se renueva en el acto. El camino viejo sigue ahí como red: si el
refresco proactivo falla, el 401 y su reintento se comportan igual que antes.

El refresco sigue pasando por `runExclusiveRefresh` —Web Locks más la marca `auth_refreshed_at`—,
así que varias pestañas con el mismo calendario despiertan juntas y sólo una toca la red.

### Agregado: el panel de estadísticas edita filtros y prueba con municipio y fechas

Los filtros compuestos existían en el motor desde esta misma versión, pero configurarlos exigía
escribir el JSON a mano: el panel no los conocía. Ahora cada slot primitivo tiene un editor de
condiciones —columna, operador y valor— con los seis operadores (`eq`, `in`, `gte`, `lte`,
`between`, `is_not_null`) y hasta seis por estadística.

Un botón por condición alterna entre **valor fijo** y **valor del visor**. En el segundo caso se
elige entre municipio seleccionado, fecha inicial o fecha final, y la condición se omite sola cuando
el visor no manda ese dato — que es lo que permite que la misma configuración sirva para el total
estatal del cron y para la vista filtrada. La columna puede ser `@municipio`, que se resuelve a la
que declare la capa en su catálogo en vez de nombrarla a mano.

**Y se puede probar sin salir de la edición.** Una barra de contexto arriba de los slots permite
elegir municipios y un rango de fechas; la vista previa de cada slot los manda al servidor y devuelve
el número que vería alguien con esa selección en el visor. Sin contexto, el preview sigue mostrando
lo que persiste el cron. Antes esto era invisible: una estadística con condiciones de contexto
mostraba el total y parecía rota.

`POST /layer-metadata/{layer_key}/stats/preview` acepta `municipio` (claves INEGI separadas por
coma), `fecha_inicio` y `fecha_fin` como parámetros de consulta, y devuelve el contexto que aplicó.
Se suma `GET /layer-metadata/municipios` para poblar el selector.

### Agregado: filtros compuestos y placeholders de contexto en las estadísticas

Una estadística podía llevar **una** condición, de igualdad exacta, contra un valor fijo. Ahora
lleva hasta seis, con `eq`, `in`, `gte`, `lte`, `between` e `is_not_null`, y aplican a todas las
primitivas —también a `sum`, `avg` o `latest`—, no solo a `count_where`:

```json
"filters": [
  {"field": "nivel_educativo", "op": "eq",      "value": "Primaria"},
  {"field": "municipio",       "op": "in",      "value": "{{municipio.nombres}}"},
  {"field": "fecha",           "op": "between", "value": ["{{fecha.inicio}}", "{{fecha.fin}}"]}
]
```

Un valor con forma `{{clave}}` no es literal: se resuelve al ejecutar contra una lista blanca de
cuatro claves (`municipio.claves`, `municipio.nombres`, `fecha.inicio`, `fecha.fin`) y **siempre por
bind param**, nunca interpolado en el SQL. La propiedad de siempre se conserva: el SQL lo arma el
motor y quien configura solo elige de un catálogo.

**La regla que sostiene el diseño:** si un placeholder no trae valor en el contexto, el filtro **se
omite**. Así una sola configuración sirve para el total estatal que persiste el cron y para el dato
filtrado que pedirá el visor, sin duplicarla por capa. Es lo que permite que la numeralia de la home
—donde no hay municipio seleccionado— siga mostrando el total.

`execute_stats_batch`, `execute_stat` y `build_query` aceptan un `context` opcional; sin él se
comportan exactamente como antes. `where_field`/`where_value` siguen funcionando y se traducen a un
filtro `eq` que conserva el nombre del bind, así que las configuraciones ya guardadas no cambian de
SQL.

Esto es la mitad del camino: falta que `@municipio` se resuelva desde la metadata de la capa en vez
de nombrar la columna a mano, y que el visor pueda pedir el cálculo con contexto. Plan completo en
`context-ame-esta/ecosistema/planes/numeralia-por-contexto.md`.

### Corregido: `count_where` pedía una columna que nunca usaba

La validación de estadísticas exigía `field` en toda operación distinta de `count`, pero
`build_query` arma el `count_where` como `SELECT COUNT(*) … WHERE "<where_field>" = :valor` y no
toca `field` en ningún momento. Configurar un conteo con filtro obligaba a elegir una columna
cualquiera para que la validación dejara guardar, y el panel mostraba dos selectores de columna
donde solo uno hacía algo.

Ahora `count` y `count_where` comparten la misma regla —ninguno pide `field`— y el selector sobrante
desapareció del panel. El cambio va también en `dataengine/jobs/run_refresh_layer_stats.py`, que es
el mismo motor duplicado para el cron: si solo se corrigiera de este lado, el cron descartaría como
inválido lo que el CMS guarda. De paso, el job pasó a validar `field` cuando viene presente, que es
lo que este lado ya hacía.

### Corregido: `make test-backend` no encontraba el script de pruebas

El target hacía `cd api && ruff …` y a continuación `./api/scripts/run-tests.sh`. El `cd` persiste
dentro de la receta, así que la ruta relativa dejaba de resolver y el target moría con
`No such file or directory` justo después de que ruff pasara. Los tests seguían corriendo en CI, que
no usa el Makefile, pero en local no había forma de correrlos con el comando documentado.

---

## [2.11.0] - 2026-08-21

### Agregado: un solo endpoint para latido, delta y presencia

Fase 3 de seis. `POST /formularios/{slug}/envio/sync` devuelve la `datos_version` del envío, su
estado, lo que cambió desde la versión que traía el cliente y quién más lo está viendo, con en qué
paso anda cada quien.

Los tres van juntos a propósito. El gateway limita por IP con `$binary_remote_addr` y un equipo de
una dependencia sale por la misma NAT, así que tres endpoints de polling gastarían el triple de una
cuota que además comparten. Es POST y no GET porque registra presencia —escribe— y así pasa por
`verify_csrf` como toda mutación. Con `salir: true` se da de baja sin pedir nada, que es lo que
manda el `pagehide` del navegador; `sendBeacon` no sirve justamente porque el endpoint exige CSRF.

La presencia sigue siendo un aviso y no un candado: si Redis no responde, el sync devuelve el delta
igual y la captura no se entera.

### Agregado: presencia por HASH para el polling sostenido

`presence.list_others` recorre el keyspace con `scan_iter`, y con redis-py **síncrono** dentro de un
handler `async def` eso bloquea el event loop del worker. Para el CMS —pocos editores, polling
esporádico— no importa; para un equipo latiendo cada diez segundos, sí.

Las funciones nuevas (`entrar`, `salir`, `presentes`) guardan un HASH por recurso y lo leen de un
solo `HGETALL`. Redis no expira campos sueltos de un hash antes de 7.4, así que el TTL vive en la
clave y las entradas vencidas se descartan al leer, lo que además limpia a quien cerró la pestaña
sin avisar. Las funciones viejas quedan intactas: el CMS no cambia.

### Agregado: rate limit por usuario en el polling de captura

El router `/formularios/*` no tenía ninguno de aplicación; el único freno era el del gateway, que es
por IP y castiga a toda la dependencia tras la misma NAT. El sync lleva treinta peticiones por
minuto y por usuario sobre el limitador de ventana deslizante que ya existía. La cadencia del
cliente es de 10 s con la pestaña visible y 30 s en solitario —seis por minuto, unas veinte con
varias pestañas—, así que treinta deja holgura para el jitter y corta un cliente con un bug de
reintento antes de que se coma la cuota compartida.

### Cambiado: las rutas del envío salieron de `dinamicos.py`

El archivo ya estaba en 374 líneas contra el límite de 300 antes de este ciclo y las tres fases lo
habían llevado a 464. Las rutas `/{slug}/envio*` se mudaron a `routes/formularios/envios.py`, que se
incluye antes porque sus paths son más específicos que el `/{slug}` de la ficha. Quedan en 291 y 214
líneas. No cambia ninguna URL.

## [2.10.0] - 2026-08-21

### Agregado: captura simultánea por campo en los envíos de grupo

Fase 2 de seis. La 1 puso la identidad del envío; esta pone la escritura.

`PATCH /formularios/{slug}/envio/campos` hace merge parcial sobre `datos` con la fila del envío
bloqueada, y responde la `datos_version` nueva más el delta desde la que traía el cliente —cada
campo con su último valor y quién lo dejó así—. A diferencia de la corrección post-envío acepta
cualquier campo capturable, no solo lo marcado `editableAfterSubmit`: el envío sigue `en_proceso`.

**El conflicto se resuelve por campo, no por envío.** Un `desde` atrasado no basta para rechazar el
lote: solo hay 409 cuando otro miembro tocó **alguno de los mismos** `field_path` después de esa
versión, y entonces la respuesta trae los dos valores y el nombre de quien escribió el otro. Un 409
por envío completo haría inusable la captura simultánea, que es justo lo que esto habilita. Cuando
hay conflicto no se escribe nada: el lote se rechaza entero para que el cliente reintente con una
sola decisión.

**El `PUT /{slug}/envio` queda cerrado en los envíos de grupo.** Manda `datos` completo, así que un
cliente con la copia vieja borraría de un golpe lo que capturó el resto del equipo. Sobrevive solo
como el acto de enviar, y ese lo hace el coordinador: un capturista recibe 403.

### Agregado: el historial de valores ahora sabe quién capturó cada campo

`envio_valor_historial` era la fuente de las correcciones post-envío. Ahora también recibe la
captura, con `origen` separando las dos:

- **`captura`** sale del PATCH y también del guardado normal, que antes escribía `datos` de golpe y
  sin diff. Un `PUT` de un formulario individual ahora compara contra lo que había y emite una fila
  por campo cambiado, que es lo que permitirá pintar la fecha de modificación en formularios que no
  son colaborativos.
- **`correccion`** es la actualización ligera de un envío `enviado`, sin cambios.

Con autosave por campo cada blur puede generar una fila, así que en `captura` dos ediciones del
mismo actor sobre el mismo campo dentro de cinco minutos colapsan en una: conserva el
`valor_anterior` con que abrió la ventana y le mueve valor, fecha y versión. La versión tiene que
moverse también, o el delta por `datos_version` dejaría de ver el cambio. `correccion` sigue siendo
append puro, que es la que tiene valor de auditoría formal.

### Cambiado: la mecánica de escritura por campo salió de `envios_service`

Los dos flujos compartían resolución de paths, cálculo de cambios y escritura de historial, pero
solo uno la tenía. Ahora vive en `services/sieej/campos_service.py` y los paths puros en
`field_paths.py`; `EnviosService` conserva los mismos nombres como delegados, así que nada de lo que
los usaba cambió. La resolución de grupo se movió de `colaboracion_service.py` a `pertenencia.py`
para que el módulo de captura quede con una sola responsabilidad. `envios_service.py` bajó de 1373 a
1298 líneas ganando funciones.

### Cambiado: la card de usuario deja de ser un tablero de permisos

Seis ajustes a la administración de usuarios, todos de la misma idea: que la card diga lo poco que
se necesita de un vistazo y el detalle viva en la ficha.

- **El rol se llama por su nombre.** `tetlamamakani` se mostraba como «Administradora» en la card,
  el filtro y el formulario. Ahora dice **Tetlamamakani**, que es como se llama el rol en la base,
  en los permisos y en la conversación diaria. Traducirlo solo en la pantalla obligaba a mantener
  dos vocabularios para lo mismo.
- **Las etiquetas de proyecto se resumen en un contador.** Una editora con acceso a ocho proyectos
  llenaba la card de tags y empujaba todo lo demás; con más proyectos en el ecosistema eso solo
  empeora. La card ahora dice «3 proyectos» —o «Todos los proyectos» para tetlamamakani, o «Sin
  proyectos»— y el reparto por proyecto se ve al abrir la ficha, que es donde se edita.
- **El tipo de cuenta vive en un solo lugar.** El tag de rol estaba arriba a la derecha, peleando
  el ancho con el nombre; ahora baja a la fila de etiquetas junto al contador y la dependencia.
- **El avatar sin foto ya no es un monigote gris.** Se pintan las iniciales —nombre y primer
  apellido, saltando partículas como «de» o «la»— sobre un color tomado de una paleta de ocho,
  elegido por hash del username: estable para cada persona y distinto entre vecinos. Los ocho
  colores pasan 4.5:1 contra el texto blanco.
- **La fila de alta y estado se ancla al fondo.** Con `margin-top: auto` y una altura mínima de
  184 px, todas las cards cierran a la misma altura y las secciones de arriba dejan de encogerse
  según cuánto texto traiga cada usuario.
- **El estado de minerva pierde el texto.** Era un tag que decía «Minerva» o «Sin vincular»
  gastando media fila en un dato que dejará de importar cuando todo el padrón esté migrado. Queda
  el escudo: relleno y verde si ya inició sesión, de contorno y ámbar si no. No es solo color —el
  icono cambia de forma y lleva `aria-label` además del tooltip—, como exige
  `ecosistema/identidad-visual.md`.

### Cambiado: 100 usuarios por página y una sola forma de ordenarlos

El grid paginaba de 12 en 12, lo que repartía un padrón de ~80 personas en siete páginas sin
ninguna razón. Sube a **100 por página**: el padrón real cabe entero en una. El esqueleto de carga
se queda en 12 cards, que es lo que se alcanza a ver antes de que respondan los datos.

El selector de orden (nombre, alta más reciente, rol) se retira. Sobre una lista que ahora cabe en
una pantalla, tres criterios de ordenamiento son tres decisiones que nadie quiere tomar: el orden es
**alfabético por nombre**, siempre. Los filtros de búsqueda, rol y proyecto se quedan, que son los
que sí recortan la lista.


## [2.9.0] - 2026-08-21

### Agregado: el envío de SIEEJ puede pertenecer a un grupo

Primera de las seis fases de los envíos colaborativos (plan completo en el repo de contexto,
`repos/mariachi/planes/envios-colaborativos-sieej.md`). Esta fase pone el esquema y la
autorización; el comportamiento visible no cambia hasta la fase 4.

Hasta ahora un envío tenía dueño único: `envio_formulario.usuario_id` más dos índices únicos
parciales garantizaban *un envío por (formulario, usuario[, periodo])*. Cuando una dependencia
reportaba, una sola persona capturaba todo o el equipo se repartía el trabajo por fuera y alguien
transcribía.

La migración `s1eej0001` agrega la otra identidad posible del envío:

- `formulario.colaborativo`, apagado en todos los formularios existentes.
- `envio_formulario.grupo_id` y `datos_version`.
- `usuario_grupo.rol` (`coordinador` | `capturista`), con `capturista` por omisión.
- `envio_valor_historial.datos_version` y `origen` (`captura` | `correccion`); todo lo ya escrito
  queda como `correccion`, que es el único flujo que existía.
- El índice `ix_historial_envio_path_fecha`, que sostiene la consulta de última autoría por campo.
- Los dos índices únicos actuales ganan `AND grupo_id IS NULL` y aparecen `uq_envio_grupo_periodo`
  y `uq_envio_grupo` con la condición contraria: el dueño es el usuario o el grupo, nunca los dos.

`usuario_id` se conserva como «quién inició el envío».

En el código, `EnviosService.puede_editar_envio` sustituye los cuatro `usuario_id != user.id` que
estaban repetidos. En un envío de grupo manda la membresía y no la propiedad: quien sale del grupo
pierde el acceso aunque haya iniciado el envío, y su autoría sigue en el historial.

El módulo nuevo `services/sieej/colaboracion_service.py` resuelve con qué grupo entra cada persona.
Si pertenece a más de un grupo asignado al mismo formulario no hay forma de adivinar: las rutas de
envío responden **409** con la lista de grupos y aceptan `?grupo_id=` para elegir. El listado de
formularios no falla por eso —es de lectura— y toma el primero por nombre.

### Corregido: reasignar un grupo borraba el rol de sus miembros

`GruposService.actualizar_miembros` y el `_set_sieej_grupo` de usuarios sincronizaban la membresía
borrando `usuario_grupo` completo y reinsertándola. Con el `rol` viviendo en esa misma tabla, cada
edición de grupo desde el CMS habría degradado a `capturista` a todos sus coordinadores. Las dos
escrituras pasaron a sincronizar por diferencia: altas, bajas y nada más.

### Cambiado: la card de usuario pierde su footer de acciones

Las dos acciones que colgaban de cada card —el ícono de editar y el de eliminar— desaparecen. Abrir
un usuario es hacer clic en su card, que es lo que ya hacía el ícono de editar: eran dos caminos al
mismo modal, y uno de ellos ocupaba una franja fija en las doce cards de la pantalla.

**Eliminar deja de ser un acceso directo.** Ahora vive dentro del modal de edición, como botón
etiquetado «Eliminar usuario» en el extremo izquierdo del pie, separado de Cancelar y Actualizar.
Borrar a alguien pasa de ser un clic en un ícono junto al de editar —a un pixel de distancia, sobre
una acción que arrastra en cascada los envíos de SIEEJ— a exigir abrir la ficha primero. La
confirmación con el impacto que se agregó en 2.8.0 sigue igual, encima de eso.

El botón se deshabilita con su tooltip cuando la ficha abierta es la propia, y no se dibuja para
quien no tiene `mariachi.usuarios.delete`.

**Con el footer fuera, el clic sobre la card es el único camino a la edición.** El manejador de
teclado que la card ya traía —`role="button"`, `tabIndex` y Enter/Espacio sobre el bloque de datos—
deja de ser una comodidad y pasa a ser el acceso por teclado de la pantalla: si se quita, la
administración de usuarios se vuelve inoperable sin ratón. Hay un test que lo cubre.

El pie del modal se extrajo a `components/UserFormFooter.jsx` con sus propias pruebas; `UserFormModal`
se quedaba en 306 líneas y el límite del ecosistema son 300.

---

## [2.8.1] - 2026-08-21

### Corregido: las cards de usuario se estrujaban y escondían el nombre

El grid repartía las columnas por breakpoints (`xs=24 sm=12 lg=8 xl=6`), así que el ancho de la card
lo decidía la pantalla y no el contenido: entre 576 y 992 px cada card bajaba de ~270 px y el tag de
rol —que no encoge— se comía el espacio del nombre, que salía cortado a media palabra.

Ahora las columnas las decide el contenido:

```css
grid-template-columns: repeat(auto-fill, minmax(min(288px, 100%), 1fr));
```

288 px es el piso: por debajo de eso el grid quita una columna en vez de apretar las que hay. El
`min(288px, 100%)` es lo que evita el desbordamiento en móvil, donde la pantalla puede ser más
angosta que el mínimo y la card debe poder encoger a una sola columna.

El piso solo, sin embargo, deja suelto el otro extremo. Con las pistas en `1fr` la card ocupa todo
lo que sobra, así que en el rango donde cabe una columna pero no dos —el contenedor entre 288 y
576 px, que es la tableta en vertical con el sider abierto— quedaba **una card sola estirada a lo
ancho**, con un avatar de 48 px y medio metro de vacío al lado. La card ahora se topa en 420 px y se
centra en su pista (`maxWidth` + `margin-inline: auto`), y el mismo tope se aplica al skeleton para
que la carga no salte de tamaño.

El tope va en la card y no en la pista a propósito: si el `minmax()` cerrara en 420 px en vez de
`1fr`, el grid contaría las columnas contra ese máximo y un contenedor de 640 px —dos columnas
holgadas de 314— se conformaría con una sola. Con el tope en la card, el número de columnas lo sigue
decidiendo el mínimo y el ancho de cada una lo decide el máximo:

| Ancho disponible | Columnas | Ancho de card |
|---|---|---|
| 308 px (móvil) | 1 | 308 |
| 500 px | 1 | 420, centrada |
| 640 px (tableta) | 2 | 314 |
| 900 px | 3 | 292 |
| 1352 px | 4 | 329 |

Dentro de la card, tres ajustes para que nada quede oculto en el ancho mínimo: el encabezado
envuelve, así que el tag de rol cae debajo del nombre cuando ya no cabe al lado; el avatar deja de
encogerse y el bloque de texto puede hacerlo (`minWidth: 0`, sin lo cual el ellipsis nunca dispara);
y el `@usuario` se trunca como ya lo hacía el email. El `Space` que envolvía avatar y datos se
cambió por un flex directo: sus `ant-space-item` no propagaban el `minWidth: 0` y bloqueaban el
truncado.

---

## [2.8.0] - 2026-08-21

Revisión completa del grid de usuarios del admin y de su endpoint. Seis defectos, la ausencia de
permisos en la UI y todo lo que la pantalla tenía a la mano y no mostraba.

### Agregado: la lista dice quién ya está vinculado a minerva

`GET /usuarios` expone `minerva_vinculado` (derivado de `minerva_sub`) y la card lo pinta como tag.
Desde `2.0.0` la autenticación es OIDC, pero no había forma de distinguir a quien ya inició sesión
de una ficha que nadie ha reclamado. Era el pendiente que dejaba abierto
`planes/migracion-usuarios-minerva.md`: la vía manual de vinculación no se puede operar sin ver
primero quién falta.

La card también muestra la fecha de alta y la dependencia de SIEEJ del usuario externo, dos campos
que el endpoint ya mandaba y que solo se veían abriendo el modal.

### Agregado: filtros por proyecto y orden

Al filtro de rol se suman uno por proyecto —con la opción **Sin proyectos asignados**, que es el
caso que uno busca de verdad— y un selector de orden (nombre, alta más reciente, rol). La búsqueda
ahora cubre también el nombre del proyecto y la dependencia de SIEEJ, no solo usuario, nombre y
email.

### Agregado: el borrado dice qué se lleva por delante

`GET /usuarios/{id}/impacto-eliminacion` cuenta envíos de SIEEJ, dependencias, proyectos y
formularios de los que el usuario es autor. El diálogo de confirmación los enumera antes de borrar.
`usuarios.id` lo referencian 18 tablas y `sieej.envio_formulario` es `ON DELETE CASCADE`: el
confirm anterior decía «Se eliminará el usuario: X» y se llevaba en silencio todos sus envíos.

### Corregido: los avatares nunca se pintaban

`_serialize_user()` armaba el dict a mano y omitía `avatar_url`, así que el grid siempre caía al
ícono genérico aunque el usuario hubiera subido su foto desde el perfil. El campo ya estaba
declarado en `UsuarioResponse` y `deps.py` sí lo mandaba para el usuario actual: solo faltaba en
esta ruta.

### Corregido: los usuarios a partir del 101 no existían para el grid

`GET /usuarios` tiene `limit` con default 100 y el admin pedía `/usuarios` sin parámetros, paginando
en cliente. El grid ahora recorre la lista por páginas hasta agotarla.

### Corregido: borrar al autor de un formulario de SIEEJ devolvía 500

`sieej.formulario.creado_por_id` es `ON DELETE RESTRICT` y `NOT NULL`. El `IntegrityError` salía sin
atrapar y la UI mostraba «Error al eliminar usuario» sin más. Ahora se verifica antes, responde
**409** diciendo cuántos formularios bloquean la baja, y cualquier otra FK que falle en el commit
también sale como 409 en vez de 500.

### Corregido: borrar el último usuario de la última página dejaba el grid en blanco

La página no se recortaba cuando la lista encogía, así que quedaba fuera de rango sin caer al
`Empty`. La página visible ahora se deriva del total.

### Corregido: el tooltip de «No puedes eliminar tu propio usuario» nunca aparecía

El botón iba `disabled` directo dentro del `Tooltip` y Ant Design no emite eventos de mouse en
botones deshabilitados. Se envuelve en un `span`.

### Cambiado: la UI respeta los permisos que el backend ya exigía

El router está montado tras `mariachi.usuarios.view`, pero crear, editar, asignar y borrar piden
`create`, `update`, `assign` y `delete`. Quien solo tenía `view` veía el botón de alta y las dos
acciones de cada card, y se enteraba con un 403. Ahora se consultan con `can()`. Además el formulario
deja de mandar `project_assignments` cuando falta `mariachi.usuarios.assign` —los mandaba siempre, y
eso hacía fallar cualquier edición con 403— y la card ya no promete «Sin proyectos asignados» cuando
lo que pasa es que el visor no tiene permiso de verlos.

La UI nunca es la autorización: el backend valida igual.

### Cambiado: la feature `users` queda partida

`UsersPage.jsx` estaba en la lista de excepciones de `max-lines` de ESLint. Los datos se van a
`hooks/useUsuarios.js`, el filtrado y la paginación a `hooks/useFiltroUsuarios.js`, los controles a
`components/UsersFilters.jsx` y las etiquetas de rol —duplicadas entre la página, la card y el
modal— a `constants/roles.js`. La página baja a 256 líneas y sale de la lista de excepciones.

---

## [2.7.1] - 2026-08-20

### Corregido: `secrets/` no existía en un clon nuevo y el primer deploy fallaba

El `.gitignore` tenía la misma carpeta en dos reglas que se contradecían. La línea 92 excluía el
**directorio**:

```
# Secrets and credentials
secrets/
```

y más abajo estaba el idioma correcto, que excluye el **contenido** y reincluye el andamio:

```
secrets/*
!secrets/.gitkeep
!secrets/*.example
```

Git **no desciende a un directorio excluido**, así que nunca llegaba a evaluar esas excepciones:
estaban muertas. `git check-ignore -v secrets/.gitkeep` señalaba la línea 92 para todo, el
`.gitkeep` nunca estuvo trackeado y por lo tanto `secrets/` **no existía en un clon recién hecho**.

Eso rompía el primer `make deploy` de cualquier host nuevo. `compose.yaml` monta tres secretos
desde ahí —`postgres_password`, `secret_key` y `csrf_secret_key`—, y si el directorio no está,
docker compose falla en seco sin que nada en el repo lo advierta.

Se quita el `secrets/` suelto y se trackea `secrets/.gitkeep`. Verificado con `git add -A`, que es
la única prueba que vale aquí: se stagean `.gitignore` y `.gitkeep`, y tres archivos de secreto de
prueba quedan fuera. (`git check-ignore -v` no sirve para confirmarlo: sale con código 0 aunque el
patrón que coincida sea una negación, así que reporta como «ignorado» un archivo que sí entra.)

**Al actualizar un host que venía de antes de la migración a secretos**, hay que crear los tres
archivos antes del `git pull`, o el deploy se cae a la mitad:

```bash
mkdir -p secrets && umask 077
printf '%s' '<valor>' > secrets/postgres_password
```

`printf '%s'` y no `echo`: el salto de línea que agrega `echo` viaja dentro del secreto y rompe la
autenticación contra Postgres de una forma difícil de diagnosticar.

## [2.7.0] - 2026-08-19

### Cambiado: el directorio de Personal se filtra y se descarga

La subpágina se reordenó alrededor de lo que se hace en ella: filtrar, abrir a alguien y sacar la
lista.

**Captura masiva subió al encabezado**, a la derecha del título, en el slot `extra` que
`PageHeading` ya tenía. Estaba perdido entre los filtros, que es donde menos se parece a lo que es:
la acción principal de la página.

**Los filtros son cuatro `Select` múltiples** —vínculo, área, marca y horario—, cada opción con
cuántas personas trae y un «Limpiar» que dice cuántos hay puestos. Se probó primero con un
`Segmented`, y estuvo mal: en el resto del admin ese control se usa con dos a cuatro opciones —
Todas / Habilitadas / Deshabilitadas—, y con once vínculos se come el ancho de la pantalla. Es un
control de *modo*, no de filtro. El `Select` además deja **combinar** —ver Base y Confianza a la
vez— y recupera los filtros de área, marca y horario que se habían perdido al reducir las columnas.

El orden de los vínculos lo manda el catálogo; lo que aparezca en los datos sin estar en él se
agrega al final, para que nadie quede sin forma de filtrarse.

**Las columnas bajaron de seis a tres:** persona, vínculo y acciones. Los cuatro botones de acciones
abren la fila directo en su pestaña —ficha, vacaciones y permisos, asistencia, ZKTeco— en vez de
obligar a desplegar y luego buscar la pestaña. El último registro se mudó junto al vínculo: es lo
que distingue a quien no ha marcado nunca de quien no está dado de alta, y perderlo dejaba la nota
al pie de la tabla sin referente.

### Agregado: descargar el directorio eligiendo los campos

Botón **Descargar** con 23 campos a elegir y salida en **Excel o CSV**. Baja exactamente lo que
está en pantalla: el frontend manda los PIN visibles, así que el archivo respeta los filtros y la
búsqueda sin tener que repetirlos del lado del servidor.

Reutiliza `grid_export.to_csv` y `to_xlsx`, que ya existían para el editor de capas de MapaLab, en
vez de sumar una librería de hojas de cálculo al bundle del admin. El CSV sale con BOM para que
Excel no rompa los acentos.

`vine_stats._hoy()` pasó a ser pública como `hoy()`: el nombre del archivo lleva la fecha y el
contenedor corre en UTC, así que sellarlo con `date.today()` lo fecharía un día adelante cada tarde
— el mismo error que se corrigió en las estadísticas en la `2.5.0`.

### Agregado: Base y Confianza como vínculos propios

**El biométrico no distingue base de confianza:** su departamento manda a toda la nómina a
«Plantilla». Los dos entran al catálogo de vínculos (`v1ne0006`) y se capturan a mano en la ficha o
en la captura masiva; hasta que alguien los asigne aparecen en cero, sin romper nada.

La migración reescribe el `orden` de todo el bloque de vínculos, no sólo el de los dos nuevos:
dejarlos en 1 y 2 los empataba con prácticas y servicio social, y dos claves con el mismo orden
salen en orden arbitrario — que es justo lo que el `Select` usa para acomodarse.

---

## [2.6.0] - 2026-08-18

### Agregado: entrar ya no pide un clic intermedio

La pantalla de inicio de sesión del admin redirige sola a minerva al cargarse. No pedía credenciales
desde 2.0.0 —sólo tenía un botón—, así que el clic no decidía nada: era un paso de más entre el
usuario y el SSO.

**La pantalla no se elimina**, y no por adorno: es el punto de parada que evita un bucle infinito
cuando minerva deniega el acceso. Si un usuario sin rol en la aplicación llega al `authorize`,
minerva devuelve `?auth_error=access_denied`; con redirección automática incondicional volvería a
salir hacia minerva, que volvería a denegar, sin fin. Por eso el redirect se salta cuando hay
`auth_error`: ahí la pantalla se queda visible con el motivo. Es además donde aterrizan
`ProtectedRoute` y `PermissionRoute` cuando caduca la sesión, conservando el `next`.

### Agregado: la pantalla de espera muestra la marca y firma como institucional

Al redirigir sola, esa pantalla dura un parpadeo: en vez de un formulario vacío muestra el logotipo
de Mariachi con un indicador de carga. La vista completa —con el motivo y el botón— se reserva para
cuando minerva deniega el acceso.

El pie incorpora el **logotipo del IIEG** junto al del Gobierno de Jalisco, obligatorio en cualquier
desarrollo del instituto y que en esta pantalla no aparecía. Se usa la variante para fondo oscuro,
porque se pinta sobre el morado institucional; en móvil ambos encogen y se acercan en vez de
apilarse.

### Corregido: el callback respondía un JSON crudo al expirar la transacción

La cookie de transacción OIDC vive 10 minutos. Si el usuario tardaba más en autenticarse —o el flujo
se reiniciaba en otra pestaña—, no quedaba con qué validar el `state` y el callback contestaba
`400 {"detail": "Estado OIDC inválido"}` en pantalla. Ahora regresa a la pantalla de acceso con
`auth_error=invalid_state`, que explica el motivo y permite reintentar, y de paso limpia la cookie
muerta.

### Corregido: cerrar sesión disparaba un inicio de sesión en paralelo

`logout()` vaciaba el estado de usuario **antes** de navegar al cierre de sesión. Ese cambio hacía
que el guard de rutas montara la pantalla de acceso, cuya redirección automática lanzaba un
`authorize` **sin** `prompt=login` que le ganaba la carrera al del logout: minerva reconocía la
sesión y devolvía al usuario adentro. En los registros se veían dos `login` seguidos, el segundo sin
`forzar`.

Ahora la navegación ocurre sin tocar el estado, y una marca de «cierre en curso» impide que el
interceptor de 401 —que también redirige a la pantalla de acceso— abra ese mismo hueco.

### Corregido: `forzar=1` moría en el frontend

2.5.0 hizo que minerva devolviera el navegador a `/autenticacion/login?forzar=1` para agregar
`prompt=login` al `authorize` y que el SSO volviera a pedir credenciales. Pero `buildMinervaLoginUrl`
sólo propagaba `next`: **el parámetro se perdía antes de llegar al backend** y el `prompt` nunca se
enviaba. No había una sola referencia a `forzar` en todo `admin/src`.

El efecto es el que 2.5.0 quería eliminar: cerrabas sesión y al volver a entrar minerva te reconocía
y te dejaba pasar con la misma cuenta, sin teclear nada. Ahora `forzar` viaja por los tres puntos:
la lectura del query en la pantalla, `login(next, forzar)` y `buildMinervaLoginUrl(next, forzar)`.

### Corregido: cerrar sesión moría en `ERR_SSL_PROTOCOL_ERROR`

El admin navegaba al logout con `window.location.href = logout_url`, una navegación **iniciada por el
documento**. La CSP del admin incluye `upgrade-insecure-requests`, así que el navegador reescribía a
HTTPS la URL del panel de minerva; si ese puerto sirve HTTP plano, el logout moría antes de empezar.
El inicio de sesión no fallaba por lo mismo porque lo redirige el **servidor** con un `302`, y la CSP
no toca los redirects del servidor.

`POST /autenticacion/cerrar-sesion` ya no devuelve la URL de minerva en `logout_url`, sino la de un
endpoint propio —`GET /autenticacion/salir`— que emite ese `302`. El navegador sólo navega a un
origen HTTPS propio y el salto lo da el servidor. El endpoint no revoca nada: la sesión ya la cerró
el `POST`, así que un `GET` ahí no muta estado.

**SIEEJ hereda el arreglo sin cambios**: sigue leyendo el mismo `logout_url` que le devuelve
mariachi. El contrato no cambió, sólo a dónde apunta.

### Cambiado: cerrar sesión ya no pasa por el panel de minerva

2.5.0 mandaba el navegador a `{panel}/logout?redirect_uri=…` para cerrar la cuenta activa del SSO y
volver. **Esa vuelta nunca ocurre:** el `safePath()` del panel descarta cualquier `redirect_uri` de
otro origen y aterriza en su propio `/login`; si la cuenta no es administradora de minerva, termina
en `/no-access`. No es un bug suyo: aceptar destinos externos exige `post_logout_redirect_uris`, que
minerva todavía no implementa, y su código lo dice explícitamente.

Ahora `GET /autenticacion/salir` redirige directo a `/autenticacion/login?forzar=1`, que agrega
`prompt=login` al `authorize`. minerva pide credenciales igual y el usuario **no sale de mariachi**
en ningún momento.

**Lo que cambia de fondo:** cerrar sesión en mariachi cierra la de mariachi, no la del SSO. La cuenta
activa de minerva sigue viva para las demás aplicaciones —que es lo que 2.5.0 ya prefería frente a un
`logout-all`— y el reingreso a mariachi vuelve a pedir credenciales por el `prompt`. Un cierre de
sesión único de verdad requiere que minerva implemente `post_logout_redirect_uris`.

## [2.5.0] - 2026-08-18

### Agregado: la guía del plugin de QGIS en la Documentación del admin

Documentación → MapaLab estrena la pestaña «Plugin de QGIS», al lado de «Propuestas de tarjeta».
Está escrita para quien administra el catálogo, no para quien programa el plugin: qué se puede
hacer desde QGIS, cómo se lee cada fila del árbol según su `nodeType`, y sobre todo **qué campo de
aquí cambia qué allá** —`nodeType` es lo que le pone casilla a un nodo, `cqlFilter` lo que hace que
traiga lo suyo en vez de la tabla entera, `geometry_type` el glifo, y el módulo Identidad los
colores y los logos—.

El plugin no tiene catálogo propio: lee el mismo árbol que el visor, así que un cambio en el editor
de capas se ve en QGIS sin desplegar nada. La pestaña cierra con lo que falta antes de publicarlo
fuera de la red: la allowlist de User-Agent y la zona de rate limit propias en gateway-hub.

### Corregido: cerrar sesión no cerraba la sesión

El botón limpiaba las cookies de mariachi y revocaba el refresh token, pero después redirigía a
`{MINERVA_LOGIN_URL}/logout` con esa variable **vacía**, así que caía al backend de minerva —donde
`/logout` responde **404**, porque la ruta real es `POST /auth/logout`—. Resultado: la sesión del SSO
quedaba viva y al volver a entrar te reconocía sin pedir nada.

La página que sí cierra vive en el **panel** de minerva, no en su backend. `MINERVA_LOGIN_URL` ahora
apunta ahí y el `.env.production.example` explica la diferencia, que es la parte fácil de repetir.

**Apuntar bien no bastaba.** El logout del panel es *suave por diseño* —su propio código lo dice:
«sale de la cuenta activa pero conserva las cuentas del navegador y sus tokens, para volver a entrar
sin re-teclear; NO revoca el jti»—, y el botón que sí cierra todo sólo se dibuja cuando hay **más de
una cuenta** en el navegador. Con una sola cuenta no había salida posible.

La solución no es pelearse con eso, es pedirlo explícitamente: al volver del logout, mariachi manda
al navegador a `/autenticacion/login?forzar=1`, que agrega **`prompt=login`** al `authorize`
(OIDC Core 3.1.2.1). minerva entonces vuelve a pedir credenciales aunque su cookie siga viva. Se
prefirió a un `logout-all` porque **no tumba las sesiones de mapalab y sieej** de paso: cerrar
sesión en mariachi cierra la de mariachi, no la del día.

Importa más de lo que parece: **un permiso nuevo no surte efecto sin volver a entrar**, porque viaja
en el token. Con el logout roto no había forma de estrenar un permiso recién asignado.

De paso, **la pantalla de login del admin dejó de ser un paso**: al llegar a `/login` redirige sola
al SSO en vez de esperar un clic en un botón que sólo tenía una opción. Se detiene si viene con
`auth_error`, para no entrar en bucle cuando el que falla es el SSO.

### Agregado: directorio de Personal, y las estadísticas de gente en su propia pestaña

**Vine → Personal**, subpágina nueva: una fila por persona dada de alta en el biométrico, con su
vínculo, área, medio de marcaje, horario asignado, entrada y salida habituales, días con registro,
cobertura, horas y último registro. Se filtra por vínculo, área, medio y horario, se busca por
nombre, PIN, área o correo, y trae un interruptor para incluir bajas.

Estadísticas ganó dos pestañas: **General** —panorama, ritmo, accesos y calidad— y **Por personal**
—vínculos, horarios, huella contra tarjeta y los rankings—, porque en una sola página ya no cabía.

En el sider vine lleva ahora **`LOCAL` además de `TEST`**: habla con el biométrico de la LAN y no
sirve fuera del instituto, igual que frames. `sider-config` acepta desde ahora un arreglo en
`badgeVariant`, no sólo una cadena.

**El departamento del biométrico resultó ser tres campos en uno**: la adscripción, el tipo de
vínculo y si la persona sigue activa. Es la única fuente de eso, porque `pers_position` —que sí trae
las categorías buenas (Becarios, Prestador de Servicio Social, Auditores Externos…)— está asignado
en **1 de 293 personas**. Del nombre del departamento se derivan ahora el vínculo (Plantilla,
Prácticas profesionales, Servicio social, Limpieza, Delfín, Asimilados, Empleo temporal) y la baja,
que va marcada con el sufijo `(Bajas)`.

**179 de 293 personas estaban dadas de baja e infladas en los conteos.** «Personas registradas»
decía 293 cuando la plantilla viva es 114, y «nunca registran» contaba 88 fantasmas. Ya se excluyen.

**Los dos horarios del instituto —8 a 4 y 9 a 5— quedaron modelados**, y los datos los confirman: la
hora de salida tiene dos picos limpios en 16:00 y 17:00. A cada persona se le asigna el suyo por su
hora de entrada mediana; quien cae fuera de las dos ventanas queda como «Otro» en vez de forzarse a
un horario que no es el suyo.

| Horario | Personas | Entra | Sale | Llega a tiempo |
|---|---|---|---|---|
| 8 a 4 | 20 | 07:56 | 16:01 | 85.9% |
| 9 a 5 | 29 | 09:32 | 16:37 | 35.8% |
| Otro | 15 | 11:42 | 17:37 | — |

### Agregado: ficha editable del personal, en un esquema aparte del biométrico

El biométrico es la fuente de la asistencia, pero **como directorio es pobre**: no tiene teléfono,
ni fecha de ingreso, ni cumpleaños, ni foto, y su «departamento» mezcla tres cosas. Lo que falta se
captura ahora desde el CMS, en `vine.personas_ficha` —tabla propia, migración `v1ne0002`— y **nunca
sobre las tablas que el sync sobrescribe**: la ficha sobrevive a cada `make sync-vine`.

Cada fila del directorio se despliega en un colapsable con cuatro pestañas: **Ficha** (lo editado,
por omisión), **Vacaciones y permisos**, **Asistencia** y **ZKTeco** (lo que llegó del biométrico,
tal cual, para poder comparar). Catorce campos son editables —nombre, apellidos, correo, teléfono,
departamento, vínculo, puesto, horario, cumpleaños, fecha de ingreso, foto, tarjeta, activo y
notas—; cada uno se puede limpiar para que vuelva a mandar el valor del biométrico.

La foto es una **URL**, no un archivo subido: el biométrico guarda `photo_path` para 82 de 293
personas, pero esa ruta apunta a un disco de la máquina de BioTime que no expone servidor HTTP
—sólo el 5432 y un WebSocket— y las imágenes no están en la base. Sin un origen alcanzable, subirlas
sería inventar un almacén nuevo para un dato que ya existe en otra parte.

El vínculo se pinta con etiquetas de color y **Baja va en rojo**, que es la que hay que ver de
lejos. El interruptor «incluir bajas» desapareció: se incluyen siempre y la etiqueta lo dice.

**Editar exige un permiso nuevo, `mariachi.vine_personas.update`**, con su rol atómico
`Vine - editar ficha del personal`. No lo hereda ningún rol compuesto: ver los rankings y corregir
el expediente de alguien no son la misma autorización.

En pantallas chicas el colapsable **deja de ser tabla**: se quita el avatar y cada dato pasa a dos
renglones —etiqueta arriba, valor abajo— en vez de comprimir dos columnas hasta lo ilegible.

La pestaña **Asistencia** trae la estadística individual: horario asignado, promedio de entrada, de
salida y de jornada —dicho como «promedio» en la tarjeta, que antes se leía como si fuera el dato de
hoy—, días con registro y a qué días de la semana viene. Lleva **su propio filtro de periodo**,
porque el de la página es lo único que ese bloque necesitaba y no tenía sentido moverlo desde
arriba.

La primera versión graficaba «a qué hora entra cada día» en minutos desde medianoche: todas las
barras salían del mismo alto —569, 571, 570— y no decía nada. Se cambió por el conteo de días de la
semana, que sí tiene rango que ver.

### Agregado: vacaciones, económicos y permisos — y con eso, días hábiles de verdad

«Días que vino» era un número sin denominador honesto: contaba contra el calendario completo, así
que quien tomó vacaciones aparecía flojo. Ahora hay `vine.incidencias` (migración `v1ne0003`) y el
denominador son **días hábiles**: fuera fines de semana, fuera los siete descansos del artículo 74
de la LFT —con los lunes movibles calculados, no escritos a mano—, fuera el cumpleaños de cada quien
y fuera sus incidencias.

Cada tipo declara su **efecto**: `descuenta` sale del denominador (vacaciones, económico, permiso,
incapacidad), `presente` cuenta como día trabajado sin marca (comisión, home office). Es lo que
distingue «no debía venir» de «vino y no quedó registrado», que se veían igual.

Las fechas se capturan con `RangePicker`, nunca tecleadas: un rango mal escrito es la forma más
fácil de ensuciar una estadística en silencio.

Se editan desde el colapsable de cada persona y desde **Vine → Incidencias**, subpágina nueva con
**captura masiva**: el mismo rango a todo un vínculo —toda la plantilla, todo el servicio social— o
a una selección. Un periodo vacacional institucional es una sola operación, no ciento catorce.

### Agregado: catálogos de horario, vínculo, tarjeta e incidencia

Los horarios estaban escritos en el código y los vínculos se derivaban del nombre del departamento.
Ambos son cosas que cambian sin avisar a nadie, así que se movieron a `vine.catalogos` (migración
`v1ne0004`, con la semilla de lo que ya existía) y se administran desde **Vine → Catálogos**, cuatro
pestañas con su CRUD. El modo edición del personal **elige de catálogo**, no captura texto libre:
así «Prácticas profesionales» no convive con «practicas profesionales».

El catálogo de horario lleva su hora de entrada y salida, el de vínculo su color, el de incidencia
su efecto (`v1ne0005`). El de tarjetas queda creado y **vacío a propósito**: no hay fuente de dónde
sacar la relación tarjeta↔persona, se captura a mano.

### Agregado: edición masiva a pantalla completa

El directorio tiene un botón **Captura masiva** que abre la tabla en el modo pantalla completa que
ya usaba el editor de capas de MapaLab —mismo `useFullscreenHeader`, no una implementación
paralela—. Para llenar teléfonos o fechas de ingreso de la plantilla entera, fila por fila en un
colapsable no es forma.

### Agregado: `make backup-vine` y `make restore-vine`

El respaldo general de la base incluye todo, pero **la ficha y las incidencias son captura manual**:
son lo único de vine que no se recupera volviendo a sincronizar el biométrico. Tienen ahora su
respaldo propio, del schema `vine` solo, con selector interactivo para restaurar y rotación de 30
archivos.

El dump se valida antes de darse por bueno —falla si queda vacío o si trae menos de las cinco tablas
esperadas— y se escribe a `.parcial` hasta que pasa, para que un respaldo truncado no se quede en el
directorio pareciendo bueno.

### Cambiado: la ayuda vive en el título, no en avisos

Los `Alert` que explicaban cada bloque se cambiaron por un ícono de información en el título de la
sección, con el detalle en el tooltip. Los avisos ocupaban una franja permanente para algo que se
lee una vez; ahora está a un hover y la pantalla respira. Sobrevive un solo `Alert`: el de error de
carga, que sí exige atención. El componente `TituloConAyuda` quedó en `shared/` para reusarlo.

Cada bloque explica ahora en qué se basa: que el ritmo horario cuenta marcas y no personas, que
los madrugadores usan la hora mediana y no la más temprana, que las rachas no se cortan en fin de
semana.

### Agregado: planta de los accesos en vez de barras por lector

«Uso de cada acceso» era un gráfico de barras con un nombre de lector por columna, que obligaba a
saber de memoria cuál era de entrada y cuál de salida. Ahora es un **diagrama de la fachada en
planta**: la puerta accesible a la izquierda, las dos automáticas de vidrio, y una flecha por lector
—entrando hacia adentro, saliendo hacia afuera— con su cifra al pie.

**Las dos puertas automáticas sirven para entrar y para salir; los que son de un solo sentido son
los lectores.** Cada puerta tiene el de salida en su pilar izquierdo y el de entrada en el derecho,
y el pilar que las separa lleva uno de cada lado: `IIEG 1`+`IIEG-2` en la principal,
`IIEG-3`+`IIEG-4` en la secundaria. Los datos son consistentes con eso: `IIEG-2` e `IIEG-4` no
registran una sola salida en tres años, y `IIEG 1` e `IIEG-3` ninguna entrada.

Los lectores se dibujan **dentro** de su pilar, en la cara que mira a su puerta y a la altura desde
la que se usan: los de entrada arriba, del lado de afuera; los de salida abajo. Las hojas de vidrio
van separadas del pilar y unidas por sus bisagras. El cuarto apoyo no es pilar sino un tubo —sólo
sostiene las bisagras de la puerta accesible— y por eso se dibuja como una sección circular vacía.

Los lectores **aceptan huella o tarjeta**, no sólo huella: 100,322 eventos por huella y 73,953 por
tarjeta sobre los mismos cuatro dispositivos.

Los demás lectores del histórico (`IIEG-1-Entrada`, `IIEG-2-Salida`, `IIEG-4-Salida`,
`IIEG-1-SIN USO`) **murieron todos en septiembre de 2023**, cuando el sistema se reconfiguró a un
sentido por lector; sus 3,200 registros se reportan como nota al pie en vez de ensuciar el diagrama.

**La puerta accesible tiene lector, pero no está conectado.** Es de acercamiento o clave numérica y
existe físicamente, sólo que en tres años no ha generado un solo evento: la instalación entera
reporta seis puntos y una controladora, y ninguno le corresponde. Se dibuja de una sola hoja
abatible hacia afuera, con su arco de barrido y el símbolo de accesibilidad pintado en el piso, todo
en gris, porque su flujo es el único del edificio que el sistema no puede medir. Conectarlo es la
forma de recuperarlo.

Está hecho con SVG inline, sin librería de gráficas: es un esquema de tres vanos, no un gráfico
estadístico, y ni ECharts (~1 MB) ni Three.js aportarían legibilidad a cambio del peso. El
emparejamiento lector↔puerta vive en `PUERTAS`, en las constantes de la feature.

### Corregido: seis personas no aparecían en ninguna estadística

Las consultas filtraban por `evento = 'Apertura con verificación normal'`, dando por hecho que era
el único marcaje válido. **No lo es.** Quien tiene perfil de superusuario en el biométrico genera
`Apertura de puerta de superusuario` y *nunca* el evento normal, así que quedaba fuera de todo: del
directorio, de los rankings, de los conteos y de la asistencia. Eran **6 personas y 4,915 eventos**
del último año.

Que es asistencia real no admite duda: **98.6% de esas jornadas cierran** —mejor que la tarjeta— con
jornada mediana de 7.75 h, entradas y salidas empatadas por persona y los mismos picos horarios que
el resto de la plantilla.

- `EVENTOS_ASISTENCIA` es ahora una lista y todas las consultas usan `evento = ANY(:eventos)`.
- **`Superusuario` es un tercer medio de marcaje** junto a huella y tarjeta, y cuenta como registro
  confiable para medir la jornada típica. Nadie tiene dos: el tipo de evento es una propiedad del
  perfil de la persona, no del acto.

La señal de que falta un tipo de evento es siempre la misma: alguien que sabe que marca y no
aparece.

### Corregido: la huella y la tarjeta no se registran igual, y eso torcía todo

El 10% de los persona-día del último año tiene entrada pero **no tiene salida**. La causa no es la
persona, es el medio con el que marca:

| Medio de la entrada | Días | Sin salida | Jornada mediana |
|---|---|---|---|
| Huella | 3,092 | 10 (**0.3%**) | 8.09 h |
| Superusuario | 517 | 13 (**2.5%**) | 7.75 h |
| Tarjeta | 4,959 | 831 (**16.8%**) | 6.72 h |

Son **dos poblaciones distintas promediadas juntas**: 18 personas marcan con huella y su registro
cierra prácticamente siempre; 84 marcan con tarjeta y una de cada seis jornadas se queda abierta. La
jornada de tarjeta sale hora y media más corta **porque le faltan salidas, no porque trabajen
menos**, y como una jornada sin salida no se puede convertir en horas, el ranking las descartaba en
silencio: quedaba poblado al 100% por personal de huella, y las personas de tarjeta aparecían con
totales absurdos —2.4 horas en un mes con 19 días asistidos— o no aparecían.

- **La jornada típica se mide sólo sobre el registro de huella**, que es el único que cierra de
  forma confiable, y la tarjeta dice sobre cuántas personas está medida.
- Bloque nuevo **«Huella y tarjeta no se registran igual»**, que muestra las dos poblaciones lado a
  lado con su cobertura y su jornada. Es el encuadre correcto del dato.
- El ranking de horas y la lista de jornadas incompletas llevan **una etiqueta con el medio** de
  cada persona, para que no haya que adivinar por qué alguien está o no está.
- La tarjeta que antes se llamaba «Quién casi no marca salida» ahora es **«Jornadas que no
  cierran»**: no señala a la persona, señala el registro.

El ranking excluye además a quien tenga menos del 60% de cobertura en vez de mandarlo al fondo con
un total falso, y muestra la cobertura de cada quien: «18 de 18» en lugar de sólo «18».

- La tarjeta principal pasa de **jornada promedio a jornada típica (mediana)**: la media venía
  arrastrada por las jornadas de menos de una hora hacia 6.85 h cuando la mediana real es 8.09 h.
- «Calidad del registro» dice cuántas personas concentran el faltante.
- Las jornadas de **más de 16 horas** (25 en el año, la mayor de 19.4 h) ya no entran en promedios
  ni en sumas; se cuentan aparte como descartadas.

**Tres hipótesis descartadas con los datos** antes de dar con el medio: la salida no está registrada
bajo otro tipo de evento (0 casos de 829), casi nunca cruza la medianoche (6 de 829), y no es el
lector —quien entra por `IIEG-4` falla 18.8% contra 4.8% de `IIEG-2`, pero al separar por medio
ambos grupos fallan igual por las dos puertas—. La correlación con el lector era espuria: quienes
marcan con tarjeta entran por ahí.

### Corregido: las ventanas de tiempo se calculaban en UTC

`current_date` y `date.today()` se evaluaban con la zona del contenedor —**UTC**— mientras los
`event_time` del biométrico están en hora local. Entre las 18:00 y la medianoche de México el
servidor ya estaba en el día siguiente, así que «personas hoy» se iba a cero cada tarde y todas las
ventanas se corrían un día. Ahora la fecha se calcula en `America/Mexico_City`.

---

## [2.4.0] - 2026-08-12

### Agregado: estadísticas de asistencia de vine

Sección nueva en el CMS —**Vine → Estadísticas**, con etiqueta `TEST`— construida sobre los
registros del control de acceso del instituto. Cuatro bloques: panorama (jornada promedio, personas
del día, día más flojo de la semana, jornada más larga), ritmo (horario de entradas y salidas, día
de la semana, tendencia mensual y uso de cada acceso), personas (quién acumula más horas, los más
madrugadores y las rachas más largas) y calidad del registro.

**Los datos no salen del módulo de asistencia del biométrico, porque está vacío.** El BioTime del
instituto opera **sólo como control de acceso**: `att_transaction` tiene 0 filas —igual que
`att_timing`, `att_timeslot` y `att_tempsch`—, mientras que `acc_transaction` acumula 288 mil
eventos desde agosto de 2023. Las jornadas se derivan de ahí: primera entrada y última salida de
cada persona por día.

**La dirección se deduce del nombre del lector, nunca de `reader_state`.** Los cuatro accesos son
unidireccionales (`IIEG-2-Entrada`, `IIEG-3-Salida`…) y ese campo es incoherente — hay lectores de
entrada con `0` y de salida con `0` y con `1` según el registro.

Se sincroniza con `POST /vine/sincronizar`, incremental por el `id` del origen e idempotente
(`ON CONFLICT DO NOTHING`), más un botón en la propia página.

**Y en automático cada 10 minutos:** `make sync-vine` corre `scripts/sync_vine.py` y `make cron` lo
instala junto al respaldo y al refresh de stats. Con el módulo apagado el script **sale en 0 sin
hacer nada**, para que el cron no reporte error en los nodos donde vine no corre.

| Endpoint | Devuelve |
|---|---|
| `GET /vine/estadisticas/resumen` | Panorama, calidad y estado de la sincronización |
| `GET /vine/estadisticas/ritmo` | Horario, día de la semana, tendencia mensual y accesos |
| `GET /vine/estadisticas/personas` | Rankings por persona — permiso aparte |
| `POST /vine/sincronizar` | Trae del biométrico lo que falte |

### Cambiado: los módulos locales no se ven por ser administrador

frames se apoyaba en `mariachi.sistema.manage`, que **está en el rol Administrador**: cualquier
administrador veía las cámaras sin que nadie se lo hubiera dado. Ahora cada módulo local tiene
permiso propio —`mariachi.frames.view` y `mariachi.vine.view`—, **ningún rol compuesto los incluye**
y el acceso se asigna persona por persona.

Los dos entran además a `PANEL_PERMISSIONS`: sin eso, quien tuviera sólo el rol del módulo quedaba
con el rol asignado y **fuera del panel**, sin ver nada. Procedimiento completo en
`runbook/modulos-locales-y-permisos.md` del repo de contexto.

**Los rankings con nombre van tras un permiso propio.** `mariachi.vine.view` da las estadísticas
agregadas, que no señalan a nadie; `mariachi.vine_personas.view` agrega los rankings individuales,
que son dato personal laboral. Los dos se declaran en `manifest.minerva.yml` con un rol atómico
cada uno.

**Nace apagada y falla cerrada**, con el mismo criterio que frames: sin `VINE_ENABLED` el router ni
se registra —la ruta responde 404— y sin `VITE_VINE_ENABLED` en el build del admin la sección no
aparece en el sider ni se registra su ruta.

### Gotchas del biométrico

- **El servidor corre en `Asia/Hong_Kong` (+08) y los eventos se guardan en hora de México.**
  `now()` y `current_date` del biométrico van **14 horas adelantados**: `WHERE event_time >=
  current_date` devuelve cero registros aunque el día tenga cientos. Todos los cortes de día se
  calculan del lado de mariachi.
- **Es PostgreSQL 9.2.9, 32-bit, sobre Windows** — sin soporte desde 2017. No admite `FILTER` ni
  funciones XML, así que las consultas contra el origen se escriben sin ellos.
- **Sus estadísticas mienten.** `pg_stat_user_tables` reportaba 141 filas en `acc_transaction`
  cuando tenía 288,899: para dimensionar hay que contar, no leer `n_live_tup`.
- **Una de cada diez jornadas queda incompleta** (97 sin salida y 17 sin entrada de 996 en 30 días).
  Las incompletas no entran en promedios ni rankings, y la sección lo dice en pantalla: si no se
  advierte, el ranking premia a quien marca salida con constancia, no a quien más horas hace.

## [2.3.0] - 2026-08-10

### Agregado: vista en vivo de las cámaras de frames

El módulo de frames ya administraba las cámaras, pero para verlas había que abrir Frigate. Ahora el
CMS trae el mosaico en vivo (`/frames/vivo`) y una vista a pantalla completa (`/frames/vivo/pantalla`),
pensada para dejarla puesta en un monitor: sin barra lateral ni cabecera, con el mosaico ocupando
todo el espacio.

El estado de cada cámara y su recarga viven en `useCamarasEnVivo`, así que las dos pantallas comparten
la misma lógica de carga y reintento. Ambas rutas exigen `mariachi.sistema.manage`, el mismo permiso
que la administración de cámaras.

## [2.2.0] - 2026-08-10

### Agregado: módulo frames, videovigilancia administrada desde el CMS

Las cámaras dejan de configurarse editando el `config.yml` de Frigate a mano en la máquina: pasan a
vivir en Postgres, en un schema propio `frames`, y mariachi genera y entrega la configuración por la
API de Frigate. El YAML pasa a ser artefacto generado.

El módulo va **detrás de `FRAMES_ENABLED`, que por omisión es `false`**, y solo se enciende en el
nodo donde vive frames. No cuelga de `settings.environment` a propósito: el stack local corre con
`ENVIRONMENT=production`, así que derivarlo de ahí lo ocultaría en local o lo encendería en
producción. Sin la variable el router ni se registra. La migración sí corre en todos los entornos y
crea el schema vacío, que es inofensivo; condicionarla haría divergir el historial de alembic.

Tres vistas en el CMS:

- **Cámaras**, con selector de modo: fichas o tabla. El modo tabla **reutiliza el `GridPanel`** de
  captura masiva declarando un `GridSpec` nuevo (`frames-camaras`); no hizo falta tocar la
  maquinaria porque el motor ya soportaba la base de mariachi. Trae búsqueda, exportación,
  historial y presencia, y valida en el servidor que la URL empiece con `rtsp://` y que la
  retención vaya de 1 a 365 días.
- **En vivo**, mosaico con el MJPEG de cada cámara. **mariachi proxea el video**, así que el
  navegador no necesita alcanzar la red donde vive frames.
- Columna **En frames** con los fps reales que reporta `/api/stats`, separada de la configuración
  guardada: una cámara puede estar habilitada en el catálogo y caída en la realidad.

Aplicar valida contra Frigate antes de escribir y se niega si no quedaría ninguna cámara
habilitada. No hay recarga en caliente: aplicar reinicia el NVR.

## [2.1.0] - 2026-08-10

### Agregado: el tipo de geometría en el editor de capas

`mapalab.layers` gana `geometry_type` (dataengine 1.33.0) y el editor lo expone en dos lugares: el
formulario de la capa, pestaña Servicios, y la rejilla de configuración como columna `select`.

Quien lo llena normalmente es el job `geometry-type` de dataengine, leyendo el
`DescribeFeatureType` de GeoServer. El campo se edita a mano para el caso que ese job no puede
resolver: una capa publicada solo por WMS, donde no hay WFS del cual deducir la geometría. Hoy es
una sola, `curvas_de_nivel`.

Los valores son los del contrato con el visor y el plugin —`point`, `line`, `polygon`, `raster`—,
así que el catálogo de opciones traduce solo la etiqueta que ve el usuario. El `on_commit` de la
rejilla sigue siendo `notify_tree_changed`: al guardar se invalida la caché del árbol y el cambio
llega al visor sin esperar al cron.

## [2.0.0] - 2026-08-10

### Cambiado: la autenticación pasa a minerva (OIDC) y la autorización a permisos

**Incompatible.** Mariachi deja de tener login propio. La identidad la emite minerva por
Authorization Code + PKCE con cliente confidencial, y la autorización deja de mirar el rol local
para consultar permisos `mariachi.<recurso>.<accion>` en el IdP. Es el frente 1 del ciclo
`tamal-rojo`.

**Lo que cambia para quien usa el sistema:** la pantalla de login ya no pide usuario y contraseña,
redirige a minerva. Quien no tenga un rol de la aplicación en minerva no recibe código de
autorización y aterriza en `/login?auth_error=access_denied` con el motivo a la vista, en vez de un
error en blanco.

**El modelo de sesión se conserva.** Minerva es proveedor de identidad, no de sesión: tras el
callback mariachi sigue emitiendo su cookie `HttpOnly` con CSRF y refresh en Redis, con rotación y
detección de reuso. Se eligió así porque SIEEJ comparte origen y cookie con mariachi, y retirar el
refresh propio habría arrastrado a SIEEJ a la misma ventana de cambio. Los tokens de minerva nunca
llegan al navegador: viven en Redis bajo un `sid` que la cookie referencia.

**El padrón existente se conserva.** `usuarios.id` lo referencian 18 tablas —entre ellas
`sieej.envio_formulario` con `ON DELETE CASCADE`—, así que la tabla no se recrea: la migración
`m1nerva0001` le agrega `minerva_sub` (único, nulable, indexado). Al primer login se busca por
`minerva_sub`, luego por correo comparando con `lower()` en ambos lados —`usuarios.email` es único
pero sensible a mayúsculas— y solo si no aparece se crea el usuario.

Autorización: los 26 archivos que usaban `require_role` o `require_project_access` pasan a
`require_permission`. La membresía de proyecto deja de decidir accesos. Las comprobaciones directas
de rol en rutas y servicios también se sustituyeron; `usuarios.role` sobrevive solo como criterio de
reparto de los avisos de SIEEJ, porque minerva no expone la consulta inversa de quién tiene un
permiso.

El manifiesto suma dos permisos a los 34 previos: `mariachi.mapalab.manage`, que conserva el nivel
que antes era exclusivo de administración en MapaLab (workspaces, orden inicial, operaciones
masivas), y `mariachi.sieej_admin.view`, que separa el panel de administración de SIEEJ del rol de
las dependencias que solo capturan. Sin ese segundo permiso, el rol «SIEEJ - reportar» habría
entrado al panel, porque comparte `sieej_formularios.view` con «SIEEJ - consulta».

La revocación es inmediata: `MINERVA_PERMISSIONS_CACHE_TTL` queda en `0`, así que cada chequeo
pregunta a minerva y quitar un rol surte efecto en el siguiente request, sin esperar a que expire
un caché.

### Eliminado

- `POST /autenticacion/iniciar-sesion`, `POST /autenticacion/cambiar-contrasena` y
  `POST /usuarios/{id}/restablecer-contrasena`. Conservarlos habría dejado una vía de acceso que
  salta al IdP y que, además, no autoriza nada: los permisos ya solo salen de minerva.
- La pantalla de cambio de contraseña del admin y el botón de reseteo en la ficha de usuario.

Las columnas `hashed_password`, `must_change_password` y `password_changed_at` **no** se borran:
son la única vía de vuelta atrás si la reconciliación falla para alguien. Se retiran en una
migración posterior, una vez confirmado que nadie quedó fuera.

### Agregado

- `minerva_sdk` 0.2.0 vendorizado en `api/minerva_sdk/`, copiado de vine. Valida RS256 contra el
  JWKS de minerva, refresca el JWKS ante un `kid` desconocido y exige la audiencia.
- `GET /autenticacion/login` y `GET /autenticacion/callback`.
- `permissions` en la respuesta de `GET /autenticacion/perfil`, y los helpers `can()` / `canAny()`
  en el frontend para ocultar menús y proteger rutas por permiso.
## [1.126.1] - 2026-09-24

### Corregido

- XSS almacenado vía acervo: el tipo de cada subida sale de sus primeros bytes y no del
  `Content-Type` del navegador. Acervo guarda ese tipo en SIEEJ, el explorador (también por
  partes), la subida interna, el avatar, las capturas de colibrí y los símbolos; HTML, SVG, XML y
  JS se guardan con `Content-Disposition: attachment`.
- Los campos de archivo de SIEEJ exigen extensión aceptada **y** contenido que le corresponda:
  un HTML renombrado a `.pdf` se rechaza con 415.
- El proxy autenticado de acervo responde siempre con `nosniff`; salvo imágenes raster y PDF,
  añade `Content-Security-Policy: default-src 'none'; sandbox` y fuerza la descarga.
- El nginx de mariachi repite `nosniff`, `X-Frame-Options` y `Referrer-Policy` en las locations
  que declaran su propio `add_header`, que antes las anulaban.
- Admin: la vista previa de acervo corre en un iframe con `sandbox`, ya no previsualiza HTML, SVG
  ni XML y pinta los PDF desde un blob con tipo forzado. Los adjuntos de un envío SIEEJ se
  descargan en vez de abrirse en otra pestaña.
- Estadísticas de capas: la vista previa, el guardado y el recálculo de `stats_config` solo
  aceptan schemas de `mapalab.workspaces` (sin `mapalab`) y ya no devuelven el error crudo de la
  base.
- Los tokens internos de mapalab y acervo se comparan con `hmac.compare_digest`.

## [1.126.0] - 2026-09-11

### Agregado

- Formato de año en el editor de tarjetitas: botón «año» en renglones de lista, íconos con texto y
  párrafos, y selector «Solo el año» en cada grupo de etiquetas. Escribe `formato: 'anio'`, que
  mapalab ≥ 1.116.17 pinta como `2026` en vez de `2026-01-01`. La vista previa ya lo aplica.
- Las propuestas ciudadanas aceptan y conservan `formato: 'anio'` en lista y texto; cualquier otro
  valor se rechaza. Antes, aprobar una propuesta sobre una capa con formato lo perdía.

### Corregido

- El editor de etiquetas ya no reordena el grupo: al tocar el selector de campos, los campos con
  estilo propio se iban al final.

## [1.125.1] - 2026-09-10

### Agregado

- La telemetría de mapalab acepta `evento_fun_volver`: el clic en «Volver» del dato curioso pineado
  tras el viaje de las águilas. Queda en los eventos crudos; el rollup por evento no cambia.

## [1.125.0] - 2026-09-10

### Agregado: eventos lite

Un evento con `modo: lite` no lleva capas: solo enciende el botón de dato curioso en el borde del
sider del visor. El tipo se elige en Información y oculta las pestañas Capas, Apariencia y
Geografía. `modo` es `completo` por defecto, así que los eventos existentes no cambian.

La migración `3v3ntl1t30001` agrega a `eventos` las columnas `modo`, `animacion`, `boton_estilo` y
`aviso_inicial`, con sus defaults.

### Agregado: la pestaña Diversión, con vista previa

- Animación por defecto del evento —pelota o águilas— y animación propia por dato curioso.
- Ícono del botón dinámico (el símbolo del próximo dato) o fijo. Los símbolos salen de emoji, del
  catálogo de sextante o de imágenes del Acervo (bucket `iieg`).
- Estilo del botón: fondo de la paleta y borde libre por tramos (sólido, mitades, tercios), con
  plantillas México, IIEG, Naranja y Morado; con o sin fondo, con o sin borde.
- Aviso inicial de hasta 80 caracteres, que el visor muestra una vez por visitante.
- Vista previa sobre un mapa de Jalisco, con el botón a tamaño real, ×2 y ×4, y «Probar», que corre
  la animación del siguiente dato. El mensaje se quita solo a los 10 s.

### Agregado: las águilas te llevan a un lugar

Un dato curioso con águilas acepta un `destino` (`lon`, `lat` y `zoom` de 5 a 19): el visor viaja al
punto mientras vuelan y pinea ahí el dato. El lugar se fija con un clic en el mapa, con el mismo
selector de los avisos de capa, que pasó a `shared/components/NoticeAnchorField.jsx`. El destino vive
en el JSON de `facts`, sin columna nueva.

### Cambiado: la caché pública de eventos expira sola en el siguiente cambio

Al cachear `GET /api/mapalab/eventos`, la llave de versión expira en el próximo inicio o fin de un
evento publicado: uno programado aparece o se retira sin tocar la caché. El payload pasa a
`mapalab:public_cache:payload:v2` para no servir el que se guardó antes de la migración.

## [1.124.0] - 2026-09-10

### Agregado: dar de alta conjuntos al actualizar un envío enviado

`actualizar-campos` acepta un elemento nuevo al final de un repeater: un índice igual al largo
actual —y los consecutivos, si se agregan varios— crea el elemento, respetando `maxItems`. Un
índice con hueco sigue respondiendo «el elemento no existe». El elemento nace marcado con
`__agregado`, y un alta sin ningún valor no deja un elemento vacío.

En un elemento agregado se puede **completar cualquier campo que siga vacío**, no solo los
actualizables, archivos incluidos por `actualizar-archivo`. Lo ya lleno se bloquea igual que en los
demás elementos. Es lo que permite llenar completo un conjunto nuevo: nace al guardar, y sus
archivos se suben justo después, casi siempre en campos que no son actualizables.

### Agregado: nombre de la pestaña de cada elemento

Quien llena puede ponerle nombre a la pestaña de un elemento. Se guarda dentro del propio
elemento, en la clave reservada `__etiqueta`: se edita siempre, sin estar marcada como actualizable,
se recorta a 60 caracteres, vacía regresa al número y deja historial como «Nombre de la pestaña».
El validador de datos ya ignoraba las claves que no son campos, así que no hubo que tocarlo.

El validador de definiciones rechaza los campos que empiecen con `__`, para que ninguno choque con
estas claves. El Excel agrega «Nombre de la pestaña» **al final** de cada hoja de repeater, para no
mover las columnas de quien ya lo consume, y el detalle del envío en el CMS lo muestra junto al
número del elemento.

## [1.123.0] - 2026-08-10

### Agregado: colores de la marca `iieg` en el catálogo de identidad

La semilla de identidad cargó espaciados, radios y tipografía de `iieg`, pero **ni un solo color**:
30 tokens y ninguno del grupo `color`. Mientras tanto, el morado `#5C2472`, el azul `#2e4372` y el
grafito `#465055` vivían hardcodeados en el CSS de mapalab, que es justo lo que la norma prohíbe
(«nunca hardcodear; si falta un token se agrega al catálogo y se regenera»). Cualquier consumidor
nuevo —el plugin de QGIS es el primero— no tenía de dónde tomar la paleta.

La migración `1dent1dad0002` agrega los cinco colores base. Contrastes verificados sobre blanco:

| Token | Valor | Contraste | Uso |
|---|---|---|---|
| `color.primary` | `#5C2472` | 10.77:1 | cumple AA; botones y selección |
| `color.secondary` | `#2e4372` | 9.71:1 | cumple AA; encabezados y datos |
| `color.accent` | `#FF8300` | **2.47:1** | **no cumple AA como texto**; solo fondo o acento |
| `color.text` | `#465055` | 8.27:1 | cumple AA; texto principal |
| `color.bg` | `#FFFFFF` | — | fondo |

El naranja repite el hallazgo que ya estaba documentado para `jalisco`, y por eso su descripción en
el catálogo lo dice explícitamente: quien lo tome para texto tiene el aviso delante.

### Agregado: `tokens.qss`, sexto artefacto del módulo Identidad

Los cinco artefactos existentes sirven a consumidores web. Un cliente de escritorio Qt —el plugin
de QGIS— no puede usar ninguno: QSS es un subconjunto de CSS 2.1 **sin variables**, así que ni
`theme.css` ni `tokens.css` le sirven. `render_tokens_qss` emite reglas ya resueltas desde los
mismos tokens, y el módulo lo entrega junto a los demás en el ZIP y por `/artefactos/tokens.qss`.

Tres decisiones que lo hacen seguro de aplicar:

- **Convierte `rem` a píxeles.** Qt no entiende `rem`; un `0.25rem` sin traducir se ignora en
  silencio y el estilo queda a medias.
- **Solo emite marca.** Fondos, bordes y texto base se dejan en `palette(...)`, del tema del
  anfitrión. Un plugin que impone su paleta se vuelve ilegible en el tema oscuro de QGIS, y la
  identidad exige WCAG 2.1 AA.
- **El acento nunca sale como color de texto**, por sus 2.47:1. Hay un test que lo fija.

Si una marca no tiene tokens de color, el QSS sale sin una sola regla de color en vez de inventar
valores por defecto.

Emite seis roles, para que un consumidor exprese jerarquía sin repetir hex: `primary` (acción
principal), `secondary` (contorno que se rellena al pasar el cursor), `quiet` (acción terciaria, sin
recuadro), `title`, `heading` y `badge`. Incluye además estilos de árbol (`hover`, radios, sin
borde), que es la vista donde más se nota que un panel es ajeno a su anfitrión.

## [1.122.4] - 2026-08-26

### Corregido: el editor de metadatos salía vacío en cuatro temas del visor

`mapalab.layer_metadata` está llaveada por `<workspace de GeoServer>:<capa>`, que es como la
escriben la ingesta masiva y los dumps, y como la lee el visor —resuelve el alias contra
`mapalab.workspaces` antes de consultar—. El admin armaba la llave con el **alias** tal cual,
así que en los cuatro workspaces donde el alias no coincide con el nombre real la fila existía
y el `GET` respondía 404. El front convierte ese 404 en `null` y pinta el formulario en blanco,
por eso parecía que los metadatos no estaban.

Afectaba a `desarrollo`, `gobierno`, `recursos` y `seguridad`: 65 de los 119 feature types del
árbol, con sus 70 filas de metadatos y sus `layer_stats` inalcanzables desde el CMS. En el visor
siempre se vieron bien.

Se resuelve en la API, no en el admin: `GET`/`PUT` de metadatos y de stats y `refresh` traducen
el alias antes de consultar, así que cubre también los cuatro lugares del front que arman la
llave por su cuenta. Ninguna llave guardada cambia.

## [1.122.3] - 2026-08-26

### Corregido: los assets del admin salian con dos cabeceras `Cache-Control`

`expires 1y` mas `add_header Cache-Control "public, immutable"` en el mismo bloque: la primera
directiva **ya emite** `Cache-Control: max-age=31536000` y nginx no las fusiona, asi que cada
archivo se servia con dos cabeceras distintas. Por eso el gateway hacia `proxy_hide_header
Cache-Control` sobre `/mariachi/assets/` y la rehacia a mano.

Ahora sale una sola cabecera completa, y el gateway podra dejar de sobreescribirla **una vez que
este cambio este desplegado** — no antes, o el orden de despliegue decidiria que cabecera llega.

Mismo cambio en mapalab 1.116.5 y en sitio2026, que arrastraban el patron identico.

## [1.122.2] - 2026-08-26

### Corregido: los dos mapas del CMS salían con el watermark «API key required» de CARTO

CARTO empezó a exigir API key en sus basemaps raster y a marcar los tiles que se piden sin ella. El
ancla de avisos del editor de capas (`NoticeAnchorField`) y el selector de bbox del editor de
eventos (`BBoxField`) pedían `light_all` sin llave, así que el fondo quedaba ilegible aunque el
campo siguiera funcionando: el ancla y el bbox se podían seguir eligiendo sobre un mapa marcado.

La URL se centraliza en `admin/src/shared/helpers/cartoBasemap.js`, que agrega `?key=` cuando
`VITE_CARTO_API_KEY` trae valor y la deja intacta cuando está vacía. Antes estaba duplicada en los
dos componentes junto con su atribución. La variable entra como build arg en `nginx/Dockerfile` y en
el servicio nginx de `compose.prod.yaml`, con `?` y no `:?` para que un entorno sin llave pueda
desplegar.

**Es build-time:** cambiar la llave obliga a reconstruir el bundle del admin.

Mismo cambio que mapalab 1.116.4; conviene tomar la decisión de fondo —seguir en raster, migrar a
los basemaps vectoriales o servir el fondo propio— una sola vez para los tres mapas.

## [1.122.1] - 2026-08-07

### Corregido: en un nodo con el crontab vacío no se instalaba el respaldo de la BD

`cron_install` daba por hecho que el crontab tenía al menos una línea. Las recetas corren con
`-eu -o pipefail`, y ahí `crontab -l | grep -v 'mariachi-backup' | grep -v 'mariachi-stats'`
devuelve 1 cuando no hay nada que conservar: el subshell muere antes de los dos `echo` y el
`crontab -` de la derecha recibe la entrada vacía. **Ni el respaldo de las 03:00 ni el refresh de
stats quedaban programados**, y el `make deploy` terminaba en `Error 1` con todos los pasos en
verde, sin una línea de error que apuntara al cron.

Pasa igual al desinstalar cuando esas dos son las únicas líneas del crontab. Los filtros se cierran
con `|| true`. Mismo bug en sextante y acervo, corregido el mismo día.

**En un nodo que ya pasó por esto, `crontab -l` vacío es la señal**; se repara con `make cron`.

## [1.122.0] - 2026-08-07

### Cambiado: el listado de acervo se pagina y se recorre con scroll infinito

`GET /acervo` deja de devolver el bucket completo en cada consulta. Ahora acepta `limit` (100 por
omisión, tope 1000) y `offset`, y responde un sobre `{items, total, limit, offset, hasMore}` en vez
de una lista. Un bucket con miles de objetos ya no manda todo el catálogo en la primera carga: el
explorador pide la siguiente página al llegar al final de la lista, con un botón **Cargar más** como
respaldo cuando el navegador no soporta `IntersectionObserver`.

**El orden pasa al servidor.** Antes cada vista reordenaba en el navegador lo que hubiera recibido
(carpetas primero, luego por nombre); con páginas eso desordena, así que el criterio se aplica ahora
en `listar_media`, ignorando acentos y mayúsculas, y el frontend consume el orden tal cual. Los
`sorter` de columna de la tabla siguen operando sobre lo que ya está cargado.

**El peso agregado de las carpetas solo se calcula en las páginas que traen carpetas.** Cuesta un
listado recursivo del prefijo y, como las carpetas van primero, las páginas siguientes ya no lo
pagan. La consulta de archivos registrados también se acota al prefijo que se está listando.

El selector de archivos (`BucketFilePicker`) cambia su paginador por el mismo scroll infinito, y
`ThumbnailDiagnostics` pide directamente las 16 imágenes que diagnostica en vez de filtrarlas de
todo el bucket.

### Cambiado: el clic en un archivo abre el archivo, no una ficha de datos

El modal de información —miniatura, URL, quién subió, fecha— desaparece. Todo lo que mostraba ya
está en la lista, salvo la URL, que pasa al tooltip del botón **Copiar**: se lee completa antes de
copiarla. En su lugar, el clic abre el contenido: las imágenes en el visor de Ant Design (original,
con zoom y rotación) y los archivos legibles en el navegador —PDF, texto, JSON, XML, audio y video—
en un modal embebido. Los formatos que el navegador no puede mostrar (ZIP, respaldos, binarios) ya
no abren nada.

Como el modal era el único punto de descarga de un archivo suelto, las acciones de la tabla y de las
tarjetas ganan botón de **Descargar**.

## [1.121.0] - 2026-08-05

### Agregado: nombre de descarga por archivo en acervo

El explorador de acervo ya permite fijar el nombre con el que un archivo se guarda al descargarlo,
independiente de su llave en el bucket. Se edita en el modal **Editar Archivo** (campo *Nombre de
descarga*) y también puede mandarse al subir, en el `downloadName` del `POST /acervo`.

El caso que lo motivó es el aviso de privacidad institucional, que pasa a servirse desde acervo en
`iieg/avisos-de-privacidad.pdf` y se publica en `/aviso-de-privacidad`. Una llave sin fecha permite
publicar una versión nueva sin tocar los frontends que la enlazan, pero descargarla dejaba un
archivo con nombre inservible en la máquina de quien la consulta. Con el nombre de descarga, la URL
queda estable y el archivo se guarda como `Aviso_de_Privacidad_Integral_IIEG_2025-06.pdf`.

En ese caso concreto el gateway ya fija la cabecera en su `location`, así que el campo no es
indispensable; sirve para cualquier otro documento de acervo que se enlace directo.

Se emite como `Content-Disposition: inline`, así que los PDF siguen abriéndose en el navegador y el
nombre solo aplica al guardar. Los nombres con acentos llevan además `filename*=UTF-8''…` (RFC
5987) con respaldo ASCII, y se saltan comillas y saltos de línea para que un nombre no pueda
inyectar cabeceras.

**Se reescribe el objeto, no se copia.** SeaweedFS ignora `metadata_directive=REPLACE` en
`copy_object` —tanto sobre la misma llave como hacia otra— y arrastra siempre la metadata del
origen, así que la única vía es volver a subir el contenido con la cabecera nueva. Se hace por
streaming, preservando `Content-Type` y la metadata de usuario, y se rechaza con **413** en
archivos de más de 100 MB: cambiar una cabecera no justifica reescribir un ráster completo.

### Cambiado: el aviso de privacidad del login se enlaza desde acervo

`LoginPage` pasa a `https://iieg.jalisco.gob.mx/aviso-de-privacidad`. Mismo cambio en
mapalab, sieej, minerva y sitio2026.

**El dato vivo del footer de la home de mapalab no está en el código.** `home_sections` guarda
`privacy_policy_href` en `payload_published` y `payload_draft`, y el frontend solo cae a su config
local si viene vacío, así que en cada entorno hay que actualizarlo desde *Mapalab → Home → Footer →
URL del aviso de privacidad*. La migración `b8c9d0e1f2a3` que lo sembró **no se editó**: es
histórica y reescribirla no cambia ningún dato ya insertado.

### Corregido: el proxy de acervo descartaba el `Content-Disposition`

`GET /acervo/proxy/{bucket_id}/{path}` armaba sus cabeceras a mano y solo emitía `Cache-Control` y
`Content-Length`, de modo que todo archivo de bucket privado servido por ahí perdía su nombre de
descarga. Ahora se reenvía la cabecera del objeto cuando existe.

## [1.120.0] - 2026-08-05

### Agregado: límites de fecha configurables en los campos `date` y `date_range`

Un campo de fecha del SIEEJ aceptaba cualquier valor con formato `YYYY-MM-DD`: nada impedía capturar
una fecha futura en un levantamiento que documenta algo ya ocurrido. La definición gana
`validation.minDate` y `validation.maxDate`, que aceptan una fecha ISO fija o el literal **`hoy`**.

`hoy` es relativo a propósito: se resuelve **cuando se valida el envío**, no cuando se configura el
formulario, así que un formulario abierto todo el año no necesita mantenimiento. El servidor lo
resuelve en `America/Mexico_City` (`today_local()` en `app/core/time.py`) y no en UTC, porque entre
las 18:00 y la medianoche hora local UTC ya avanzó de día y «hoy» habría dejado pasar mañana.

- **Definición** (`definicion_validator`): el límite debe ser `hoy` o una fecha ISO existente —
  `2026-02-31` se rechaza— y `minDate` no puede ser posterior a `maxDate` cuando ambos son fijos.
  Los límites viajan además en `GET /formularios/:slug/schema` como reglas `minDate`/`maxDate` con
  su valor literal, para que el frontend los resuelva del lado del cliente.
- **Datos** (`datos_validator`): valida el valor contra los límites resueltos, en `date` y en cada
  extremo de un `date_range` («la fecha final no puede ser posterior a hoy»).
- **Compatibilidad** (`compat.py`): un límite mal formado se descarta y un par invertido pierde el
  `minDate`, siguiendo la regla de que la normalización solo relaja.
- **Clasificador de cambios**: poner un límite donde no había, o endurecer uno existente, **rompe**
  —los envíos ya capturados pueden quedar fuera del rango—; quitarlo o ampliarlo es menor. Entre
  `hoy` y una fecha fija no hay orden estable, así que cualquier cambio entre ambos se trata como
  endurecimiento.

En el editor de campos aparece **Límites de fecha** (`DateLimitsConfig.jsx`) con dos selectores,
mínimo y máximo. El máximo ofrece «Sin límite», «Fecha de llenado» y «Fecha específica»; «Fecha de
llenado» es el nombre visible del literal `hoy` y el atajo para «no permitir fechas futuras». El
**mínimo solo ofrece las dos opciones fijas**: un mínimo relativo invalidaría cada día lo capturado
el día anterior, y el envío empezaría a fallar al enviarse sin que nadie tocara el formulario. El
backend sigue aceptando `minDate: "hoy"` para una definición escrita a mano —y el editor la muestra
bien si ya la trae—, pero no lo propone. De paso, la configuración de los campos `file` (bucket,
extensiones, tamaño) salió de `FieldForm.jsx` a `FileConfig.jsx`, que quedaba por encima del límite
de 300 líneas.

El renderer del SIEEJ consume los límites desde 1.58.0: deshabilita los días fuera de rango en el
calendario. El servidor los vuelve a validar al guardar, así que la restricción no depende del
cliente.

## [1.119.0] - 2026-08-03

### Agregado: pestaña de configuración en la captura masiva

La captura masiva (`/mapalab/layers/tabla`) solo editaba metadatos. Ahora tiene dos pestañas:
**Metadatos** (lo que ya había) y **Configuración**, que edita en hoja de cálculo los campos de
`mapalab.layers` que antes solo se tocaban de uno en uno en el editor del árbol: nombre, nombre en
URL, tipo de nodo, orden, visibilidad, capa de GeoServer, estilo, filtro CQL, grupo WMS, tiles,
formato de imagen, suavizado, WFS, descargable, temporalidad, etiquetas de búsqueda, filtro por
municipio, icono y resaltado.

Son dos tablas con granularidad distinta y por eso van separadas: los metadatos viven por *feature
type* (`workspace:capa`, compartidos entre las capas que lo usan) y la configuración por **nodo del
árbol**. La pestaña de configuración trae una columna de ubicación en el árbol (`Tema > Categoría`)
para ubicar cada nodo, y muestra la tarjeta, el aviso y el badge como resumen de solo lectura —
esos se siguen editando con sus editores dedicados.

El **workspace no se edita desde la tabla**: se cambia en el editor del árbol, que valida contra
GeoServer. La capa de GeoServer sí es editable y se valida celda por celda contra las capas reales
del workspace (con caché de 60 s y comprobación de grupos de capas); si GeoServer no responde, la
celda se acepta en vez de bloquear la captura. Los campos obligatorios rechazan quedar vacíos y los
de catálogo (tipo de nodo, formato, suavizado) validan contra sus valores permitidos, así que un
valor mal capturado se reporta como celda rechazada y no como error de base de datos.

Pueden editar los mismos perfiles que ya editaban metadatos en lote (rol `editor` del proyecto
mapalab). A diferencia del editor del árbol, lo que se guarda desde la tabla **se publica directo**,
sin pasar por el flujo de borrador y revisión.

Por dentro, todo el andamiaje del grid (barra de herramientas, avisos, barra de estado, borrador
local, presencia, historial y exportación) se extrajo a un `GridPanel` genérico en
`shared/components/dataGrid`, y la página quedó como cáscara con pestañas. Cada pestaña conserva su
borrador por separado y muestra en su etiqueta cuántos cambios tiene pendientes; solo la pestaña
activa registra presencia.

Las pestañas van **abajo**, con forma de pestaña de hoja de cálculo, y comparten franja con la barra
de estado (sin guardar, celda activa, quién más está editando, conteo de filas) en vez de gastar dos
tiras horizontales.

### Agregado: buscar y filtrar con el teclado en la captura masiva

`Ctrl+F` abre el buscador de la tabla con el cursor puesto, y `Ctrl+Shift+F` el filtro por
workspace. `Esc` o `Enter` cierran el buscador dejando el filtro aplicado, para volver a la tabla
sin soltar el teclado. Los atajos solo responden en la pestaña que se está viendo y quedan
documentados en el modal de atajos.

`Ctrl+F` se queda el atajo en lugar del buscador del navegador. Es deliberado: la tabla es
virtualizada, así que el buscador del navegador solo encontraría las filas que están pintadas en
ese momento, no las 400 de la tabla.

### Agregado: editar texto largo en la captura masiva

Las celdas de texto largo (descripción, texto de leyenda, filtro CQL, metodología, cita larga de la
fuente) ya no se capturan en un renglón: al entrar en la celda se abre un cuadro de varias líneas
sobre ella, que crece con el contenido y se cierra con `Esc` o `Ctrl+Enter`. Copiar, pegar y borrar
siguen funcionando igual sobre esas celdas.

### Cambiado: la captura masiva ya invalida el caché del árbol del visor

`PATCH /grid/{recurso}/cells` guardaba en base de datos sin avisarle a MapaLab, así que el visor
seguía sirviendo el árbol viejo hasta que expiraba el caché. `GridSpec` ahora acepta un hook
`on_commit` que el endpoint dispara tras el commit, y ambos grids lo usan para llamar
`notify_tree_changed()`. Aplica también a la captura masiva de metadatos, que arrastraba el mismo
hueco.

## [1.118.0] - 2026-07-31

### Agregado: eliminar el envio de una dependencia

`DELETE /sieej/formularios/{id}/envios/{envio_id}?confirmacion=<nombre>` borra el envio de una sola
dependencia: sus respuestas, archivos, eventos e historial (CASCADE del ORM) y los objetos que
subio al Acervo, bajo `{slug}/{usuario}-{envio_id}[/{periodo}]/`. Es el caso de la captura de prueba
o equivocada que debe desaparecer; a diferencia de reabrir, **el formulario le queda como no
iniciado** y la dependencia puede capturar de cero.

Mismas guardas que el borrado de formulario: solo admin global (403 para `editora`) y hay que
mandar el nombre —o el usuario— exacto de quien envio (400 si no coincide). En la pestana Envios
aparece como papelera de la fila, visible solo para el admin global, y el modal obliga a descargar
el **PDF del envio** antes de habilitar el campo de confirmacion. Queda en la actividad como
`sieej.envio.delete`. El modal recuerda que reabrir es la alternativa cuando solo hay que corregir.

El borrado en Acervo se factorizo en `_borrar_en_acervo(claves, prefijo, definicion)`, que
comparten el borrado de formulario y el de envio; `EnviosTable` dejo de duplicar `triggerDownload`
y usa el de `shared/helpers`.

### Agregado: eliminar de verdad un formulario ya contestado

`DELETE /sieej/formularios/{id}` cerraba el formulario en cuanto tenia un envio, para no perder lo
capturado. Eso deja sin salida los formularios de prueba que alguien contesto, los duplicados y los
que se armaron mal: quedaban cerrados en la lista para siempre. Ahora el DELETE acepta
`?confirmacion=<nombre exacto>` y con el borra de verdad — el formulario, sus envios y todo lo que
cuelga de ellos por CASCADE (respuestas, archivos, eventos, historial de valores, versiones
archivadas, periodos y asignaciones).

**Tres cierres para que no pase por accidente:** solo el admin global (`tetlamamakani`; una
`editora` con acceso a SIEEJ recibe 403 y sigue pudiendo cerrar), el nombre escrito debe coincidir
exacto con el del formulario (400 si no) y sin `confirmacion` el endpoint se comporta como antes.
La actividad queda como `sieej.formulario.delete_definitivo` con el conteo de envios y de archivos
borrados.

**Los archivos del Acervo tambien se van.** Se borran por `object_key` registrada y por el prefijo
`{slug}/`, que arrastra los `envio.json` del respaldo; lo primero alcanza a los objetos subidos
antes de un cambio de slug, que viven bajo el slug anterior. Es best-effort de punta a punta: un
bucket caido o sin credenciales se registra y no deja el borrado a medias, porque la fuente de
verdad es la BD. Como el bucket de SIEEJ tiene versionado con retencion, lo borrado queda como
version recuperable por infraestructura durante un tiempo — no es un borrado inmediato definitivo.

En el CMS la papelera de la tarjeta abre `EliminarFormularioModal`, que consulta cuantos envios hay
antes de decidir que pedir: sin envios confirma y ya; con envios obliga a **descargar el Excel de
respaldo** (hasta entonces el campo de confirmacion esta deshabilitado) y a **teclear el nombre
exacto**; a quien no es admin global solo le ofrece cerrar el formulario. De paso,
`EnviosService.bucket_row()` recoge la consulta de bucket que estaba repetida tres veces.

### Agregado: reapertura de formularios cerrados

`POST /sieej/formularios/{id}/reabrir` devuelve un formulario `cerrado` a `activo`. Hasta ahora el
cierre era terminal desde el CMS: la tarjeta solo ofrecia publicar (borrador) o cerrar (activo), y
un formulario cerrado por error o por una prorroga acordada con la dependencia obligaba a tocar la
base de datos.

**Limpia la vigencia que lo dejaria invisible.** Volver a `activo` no basta: `listar_visibles`
filtra por `vigencia_inicio <= now <= vigencia_fin`, asi que un formulario reabierto con la
vigencia vencida seguia sin aparecerle a nadie. El endpoint borra `vigencia_fin` si ya paso y
`vigencia_inicio` si aun no empieza; queda abierto sin fecha de cierre hasta que el admin
configure una nueva. Responde 409 si el formulario no esta cerrado, y con periodicidad materializa
las ventanas igual que publicar.

En el CMS aparece como accion de la tarjeta (icono deshacer, donde antes habia un hueco) y como
boton en el encabezado del editor. Los cuatro handlers del ciclo de vida —publicar, cerrar,
reabrir, eliminar— se unificaron en `hooks/useFormularioAcciones.js`, que los comparten la lista y
el editor; el efecto colateral es que publicar desde la tarjeta ahora tambien pide confirmacion,
como ya hacia desde el editor.

### Agregado: el slug de un formulario se puede cambiar

`PUT /sieej/formularios/{id}` acepta `slug`, con las mismas reglas que la creacion: patron
`^[a-z0-9][a-z0-9-_]*$`, 400 si esta en `SLUGS_RESERVADOS` y 409 si otro formulario ya lo usa (la
validacion se extrajo a `_validar_slug_disponible`, compartida con `crear`). El campo estaba
deshabilitado en la pestana Configuracion y un slug mal escrito al crear solo se corregia
recreando el formulario.

**El cambio no es inocuo y la UI lo dice antes de guardar:** la URL con la que las dependencias
entran (`/sieej/{slug}`) deja de funcionar, y los archivos ya subidos conservan la carpeta del slug
anterior en Acervo porque la convencion de claves empieza por el slug — los nuevos van a la carpeta
nueva. El modal de confirmacion nombra ambas carpetas y, al guardar, el editor navega a la ruta
nueva. La actividad registra `slug_previo`.

### Agregado: GeoPackage en las extensiones de los campos de archivo

`.gpkg` se suma al catalogo de «Extensiones aceptadas» del constructor de campos y
`application/geopackage+sqlite3` al mapa de MIME del Acervo, que hasta ahora lo servia como
`application/octet-stream`. La validacion del upload ya resolvia por extension, asi que no
requiere cambios.

## [1.117.0] - 2026-07-31

### Corregido: tres accesos concedidos por privilegio insuficiente

**`/sistema/*` era alcanzable por el rol externo.** El router se montaba sin `require_staff`, asi
que cualquier usuario autenticado —incluidas las dependencias externas que solo entran a SIEEJ—
podia llamar `GET /sistema/colibri-config` y leer `COLIBRI_API_KEY_MARIACHI` en claro. Los otros
cuatro endpoints del router estaban igual de abiertos. Ahora exige staff.

**El Acervo no distinguia `editor` de `viewer`.** `resolve_bucket_escribible` solo comprobaba que
existiera la membresia en el proyecto, no el `project_role`, asi que un `viewer` podia subir,
mover y borrar archivos en los buckets de su proyecto. Ahora la escritura exige `editor`; la
lectura sigue bastando con la membresia.

**`sieej_admin` no validaba pertenencia al proyecto.** Sus 40 endpoints solo pedian `require_staff`,
de modo que cualquier `editora` del instituto administraba formularios, grupos y catalogos y
reabria envios aunque no tuviera nada que ver con SIEEJ. Ahora el router lleva
`require_project_access('sieej')`, igual que `formularios`.

**Al desplegar:** estos tres cambios quitan accesos que hoy funcionan por error. Antes de la
ventana, correr las consultas de pre-vuelo del runbook (`secretos-y-usuarios.md`) para saber a
quien afecta: una `editora` que administre SIEEJ sin membresia, o un `viewer` que suba archivos,
dejaran de poder. Los `tetlamamakani` no se ven afectados.

### Corregido: mutaciones sin token CSRF

`PUT /identidad/{codigo}/tokens/{id}` y `PUT /identidad/{codigo}/campos` modificaban la identidad
visual sin exigir `X-CSRF-Token`. Lo mismo ocurria en tres endpoints de presencia
(`PUT /paginas/{id}/presencia`, `PUT /home/{key}/presencia` y `DELETE /grid/{resource}/presencia`).
Los cinco pasan a `verify_csrf`.

### Eliminado: `require_bucket_access`

La dependencia no tenia ningun uso en el repositorio y `docs/roles.md` la documentaba como activa.
La logica vigente vive en `acervo_file_service`; la documentacion quedo alineada.

## [1.116.0] - 2026-07-31

### Cambiado: defaults del editor a antialias en texto y tiles activados

Acompana la migracion `0033` de dataengine: los campos de la pestana Servicios abren en
`antialias='text'` y `tiled=true` para las capas que no lo tengan definido.

## [1.115.1] - 2026-07-31

### Agregado: formato de imagen y antialias en la pestana Servicios del editor de capas

Dos `Segmented` nuevos junto a «Servir por tiles»: **Formato de imagen** (PNG / PNG 8 bits /
JPEG) y **Suavizado de bordes** (Completo / Solo texto / Ninguno). Controlan como mapalab le pide
cada capa a GeoServer.

La descripcion de cada campo lleva los numeros medidos y los riesgos, porque el ajuste correcto
depende de la capa: PNG 8 bits baja el tile un 44 % pero puede bandear una rampa continua; quitar
el antialias lo baja un 59 % mas pero deja las lineas finas dentadas; JPEG no soporta
transparencia y no sirve en capas superpuestas. Tambien avisa de que cambiar el antialias
invalida los tiles ya cacheados en GeoWebCache.

Los defaults reproducen el comportamiento anterior. Las columnas las provisiona **dataengine**
(migracion `0032`), como todo el DDL de `mapalab.*`.

**Aviso destacado en el campo de formato: PNG 8 bits y JPEG salen sin transparencia.** GeoServer
emite el PNG de 8 bits como paleta indexada **sin chunk `tRNS`**, verificado en los bytes de la
respuesta, asi que cada tile es un rectangulo opaco que tapa el relieve y las capas de abajo. La
primera version de este texto solo advertia del bandeo en rampas continuas y presentaba el −44 %
de peso como una mejora sin contrapartida; buena parte de ese ahorro era, en realidad, tirar el
canal alfa. El campo ahora lo dice y remite al suavizado de bordes, que da −59 % **conservando**
la transparencia.

## [1.114.1] - 2026-07-31

### Corregido: el explorador de recursos de GeoServer daba 500 contra GeoServer 3

`GET /geoserver/files` respondia 500 con `JSONDecodeError` desde el salto de geoserver a 3.0.0.
La REST de Resource cambio dos cosas y ambas rompian a `browse_styles_dir`:

- **`/rest/resource/{path}` ya no negocia contenido por `Accept`**: devuelve HTML aunque se pida
  `application/json`, y el sufijo `.json` responde 404. Hay que pedir el formato por query string,
  `?format=json`.
- **Los directorios ya no se marcan con `type: text/html`** sino con `application/json`; los
  archivos traen su content-type real (`application/xml`, `text/xml`,
  `application/octet-stream`). La deteccion de carpeta acepta ahora ambas formas, asi que el
  cliente sigue sirviendo contra GeoServer 2.

Afectaba al explorador de archivos, a la busqueda de estilos y al listado de fuentes, que comparten
el mismo recorrido recursivo.

## [1.114.0] - 2026-07-30

### Cambiado: React Router 8 por el advisory GHSA-qwww-vcr4-c8h2

El advisory de React Router (bypass de CSRF que permite ejecutar acciones antes de un 400) cubre
`>=7.12.0 <8.3.0`: **no hay corrección dentro de la línea 7**, así que la única salida era el
major. El admin sube de 7.14.2 a 8.3.0.

El agujero está en el modo RSC —React Server Components con server actions—, que el admin no usa.
No era explotable aquí, pero mantenerlo dejaba un `high` permanente en `npm audit` sin forma de
distinguirlo de uno real.

La migración no tocó código: en 8.3.0 todo se sigue exportando desde `react-router`, que es de
donde ya importaba el admin. Lo que desaparece es el paquete `react-router-dom`, que este repo no
usa. Los 181 tests pasan sin cambios.

Requiere React >= 19.2.7 (ya en 19.2.8) y Node >= 22.22.

### Corregido: `coverage/` en el `.gitignore`

`npm run test:coverage` en `admin/` deja un reporte HTML de cientos de archivos que aparecía como
sin trackear. El `.gitignore` sólo cubría los artefactos de coverage de Python.

## [1.113.0] - 2026-07-30

### Cambiado: Vite 8 con Rolldown, y React 19.2.8

Vite 8 reemplaza esbuild y Rollup por **Rolldown** (bundler en Rust) y **Oxc**. El build del admin
pasa de **5.71 s a 392 ms** y el dev server arranca en 111 ms. Suben también
`@vitejs/plugin-react` a 6.0.5, React y React-DOM a 19.2.8 y Vitest a 4.1.10; el widget queda en
Vite 8 igual que el admin.

La forma de objeto de `manualChunks` —la que usaba el admin— **fue removida en Vite 8**, así que
el chunking se reescribió con `build.rolldownOptions.output.codeSplitting.groups`: cada grupo
declara una expresión regular contra el id del módulo y una prioridad. `react-vendor` lleva la
prioridad más alta para que React no acabe absorbido por `antd`, que es lo que ocurre si los
grupos se traducen en el orden literal anterior (un grupo arrastra las dependencias de lo que
captura, cosa que `manualChunks` no hacía).

Los tres chunks se conservan y `antd` adelgaza de 1590 kB a 1390 kB (gzip 485 → 418). Los 181
tests siguen pasando y `knip` no reporta código muerto nuevo.

En el widget se retiró `minify: 'esbuild'` —deprecado y ahora dependencia externa— y se dejó el
minificador Oxc por defecto: `colibri-widget.v1.js` pasa de 50.13 kB a 50.47 kB y sigue
registrando sus cinco custom elements. `inlineDynamicImports` se reemplazó por
`codeSplitting: false`, su equivalente en Rolldown.

Requiere reconstruir las imágenes de `admin` y `nginx`. El cambio de bundler cambia todos los
hashes de los assets: conviene desplegar fuera de horario pico.

## [1.112.0] - 2026-07-30

### Cambiado: Makefile homologado con el resto del ecosistema

La interfaz de comandos es ahora la misma en los nueve repos: `up` levanta desarrollo sin
reconstruir y `deploy` hace produccion completa (`git pull` + `down` + `build` + `up`). Se
retiraron todas las banderas: el entorno se detecta por el nombre de proyecto de Compose y lo que
antes era un argumento ahora es un selector interactivo. Lo transversal vive en `make/common.mk` y
`make/lib.sh`, copiados en cada repo. Convencion completa en `ecosistema/makefiles.md` del repo de
contexto.

Las reglas se partieron en `make/backup.mk`, `make/dev.mk`, `make/sieej.mk` y `make/mapalab.mk`.

### Cambiado: `ENV=dev|prod` desaparece

`up` levanta desarrollo y `deploy` produccion. El resto de targets detecta el entorno activo por el
nombre de proyecto de Compose, asi que `logs`, `status`, `shell`, `restore-db` y `sieej-check`
funcionan sin decirles donde. `backup-db` exige que produccion este levantada.

### Cambiado: `shell-api`, `shell-admin` y los `logs-*` se fusionan

Un `shell` y un `logs` con selector poblado desde `docker compose ps --services`, que no se
desfasa al agregar un servicio. `install-backup-cron` y `uninstall-backup-cron` pasan a `cron`; de
paso se corrige el nombre, porque instalaba dos crons y no solo el de respaldo.
`sieej-check-fix` se integra en `sieej-check` como opcion del selector.

### Corregido: `${BLUE}` no estaba definida

El bloque de ayuda usaba una variable de color inexistente, y `WHITE` se definia sin usarse.

## [1.111.0] - 2026-07-30

### Eliminado: el entorno staging

`ENV=staging` nunca se uso. No habia rama, ni pipeline, ni VM propia: solo un `.env.staging`
apuntando a localhost y una rama del Makefile que elegia ese archivo en vez de
`.env.production`. Los entornos reales son dos, desarrollo y produccion, y ahora el codigo lo
dice.

#### Eliminado

- La rama `ENV=staging` del Makefile. `make <comando> [ENV=dev|prod]` es la forma completa.
- `.env.staging` y `.env.staging.example`, y la linea correspondiente del `.gitignore`.
  `make setup` ya no intenta crearlos.
- El valor `staging` del `Literal` de `Settings.environment`: queda
  `Literal["development", "production"]`. El unico consumidor era el validador que fuerza
  `docs_url=None` y `cookie_secure=true` en produccion, que no cambia.

`GEOSERVER_UPLOAD_STAGING_DIR` **no tiene nada que ver** con esto y no se toco: es el buffer en
disco de las subidas por partes a GeoServer.

---

## [1.110.0] - 2026-07-30

### Agregar un campo se comporta como editarlo

En el editor visual, «Editar» abre el formulario pegado al campo y a todo el ancho de la rejilla
(`gridColumn: '1 / -1'`), mientras que «Agregar» lo abría en una tarjeta suelta al final de la
lista, lejos del hueco donde se había pedido. Ahora el alta se renderiza dentro de la rejilla, en
la línea donde se pidió el hueco y ocupando el ancho completo; solo cae al final cuando el alta se
pide desde la barra o desde el botón del paso, que es donde corresponde.

#### Cambiado

- `FieldsGrid` acepta `nuevoCampoRow` y `renderNuevoCampo` y coloca el bloque tras el último
  espacio de esa línea. `useNuevoCampo` expone `filaDestino` y estabiliza `limpiar`, que ademas se
  invoca al abrir el alta desde el botón del paso para no heredar un hueco anterior.
- El formulario de alta recibe `defaultCol`, como el de edición.
- El contenedor abierto se resalta con borde de 2 px en morado institucional, tanto al editar un
  campo como al agregar uno nuevo, reusando el lenguaje visual del resaltado de condicionados.
  La tarjeta de alta sale a `NuevoCampoCard` para no cruzar el límite de 300 líneas de
  `FieldsList`.

---

## [1.109.0] - 2026-07-30

### Cambiado: las señales de abuso ahora son checks de `/ontoy`, contadas en Redis

Los contadores que la 1.106.0 mudó a `/ontoy` no los leía nadie: el monitor de huachicol solo
persiste `status`, `checks`, `containers`, `version` y `deployed_at`, y descarta el resto del
payload. Además tenían dos defectos de fondo:

- **Vivían en memoria del proceso.** La API corre con `--workers 2`, así que cada worker contaba
  solo su tráfico y `/ontoy` devolvía lo que hubiera visto el worker que atendió el sondeo.
- **Eran acumulados.** Un total que solo crece cruza cualquier umbral tarde o temprano y dejaría el
  servicio en `degraded` para siempre.

Ahora se registran en **Redis** con `INCR` y `EXPIRE` sobre una ventana de 15 minutos —el mismo
mecanismo que ya usa el lockout de login—, y se publican como dos checks con su propio `status`:

- **`abuso`**: `login_failed`, `login_locked` y `rate_limit_hits`. Pasa a `degraded` cuando la suma
  llega a 30 en la ventana.
- **`mapalab_notify`**: notificaciones de árbol que agotaron sus reintentos. `degraded` a partir de 3.

Como el `status` global es el peor de los checks, una ráfaga de fuerza bruta pone el servicio en
`degraded` y huachicol alerta a Discord y Telegram, que era el objetivo de tener estos números.
Si Redis no responde, `registrar()` no propaga la excepción y los checks devuelven cero: la
telemetría nunca tumba una petición de login.

Esto **no cambia la auditoría**: `actividad_log` sigue registrando `login.failed`, `login.success` y
`login.logout` en Postgres con actor, IP y metadata. Los checks sirven para alertar; el log, para
saber quién hizo qué.

Umbrales y ventana viven en `app/api/metrics.py`. Si se quieren ajustar sin redesplegar código,
tendrían que pasar a `Settings` y al `.env`.

## [1.108.1] - 2026-07-30

### Cambiado: la documentación del contrato `/ontoy` recoge lo aprendido

La ficha de Documentación → Contrato `/ontoy` del admin apuntaba a
`huachicol/docs/ontoy-contrato.md`, que dejó de existir cuando huachicol 2.0 movió sus docs al repo
central, y daba a casi todo el ecosistema como pendiente de migrar a v2 cuando ya está completo.

Se agregan dos secciones que faltaban:

- **Exposición.** Un `/ontoy` servido desde el backend no necesita ser público: el monitor sondea
  por `iieg-network`. El riesgo es que un prefijo general del proxy lo publique sin que nadie lo
  decida, como pasó con `/mapalab/api/ontoy`. Incluye la trampa de verificarlo con `curl`, que recibe
  `403` de la protección anti-bots y hace parecer cerrado lo que está abierto.
- **Qué se guarda de la respuesta.** El monitor solo persiste `status`, `checks`, `containers`,
  `version` y `deployed_at`; el `slug` y el `label` los toma de su `targets.json`. Lo que se quiera
  vigilar va como un `check` con su propio `status`, porque una llave suelta no se almacena ni
  alerta.

La tabla de adopción queda al día y con los checks de cada servicio. La especificación completa en
`context-ame-esta/repos/huachicol/ontoy-contrato.md` recibe las mismas dos secciones.

## [1.108.0] - 2026-07-30

### El diff de definiciones ahora dice el nombre del campo

`diff_definiciones` emitía solo `step_id` y `field_name`, así que el aviso de "el formulario se
actualizó" de SIEEJ mostraba identificadores internos. El frontend no puede resolverlos por su
cuenta: al aplicar una actualización el `definicion_snapshot` del envío se reescribe con la
definición vigente, de modo que los pasos y campos **eliminados** dejan de existir en la única
definición que el respondent tiene a mano. El diff es el último punto donde ambas versiones
conviven en memoria.

#### Agregado

- Cada entrada del diff lleva `step_title` y `field_label`, tomados de la definición vieja cuando
  el cambio es `eliminado` y de la nueva en los demás casos (para `modificado` gana el label nuevo,
  que es justo el que pudo haber cambiado). `CambioRef` los expone como opcionales, así que los
  `cambios_pendientes` ya persistidos siguen validando y el frontend cae a su mapa de etiquetas.

---

## [1.107.0] - 2026-07-30

### Eliminado: la instrumentación que ya no lee nadie

La 1.106.0 dejó los contadores de volumen contándose en memoria sin superficie de lectura. Se
borran: quedan solo los cuatro que `/ontoy` publica (`rate_limit_hits`, `login_failed`,
`login_locked`, `tree_notify_failed`). Son 23 constantes y 60 llamadas a `incr()` menos, repartidas
en 15 archivos.

Con ellas se va el parámetro que ya no distinguía nada: en `mapalab_notifier` el flag `contar`
gobernaba el contador de notificaciones y el de fallos; el primero desaparece y el flag se queda,
porque el de fallos sí se expone.

Si más adelante hace falta medir escrituras, conviene hacerlo con etiquetas —por recurso, por
resultado— y no como un acumulado plano que se reinicia con el contenedor.

### Eliminado: passlib

Era la última fuente de warnings de la suite: importa el módulo `crypt`, que desaparece en Python
3.13. No tenía arreglo por versión —1.7.4 es la última publicada y sigue igual—, así que
`app/core/security.py` pasa a usar `bcrypt` directo, que ya era el motor real por debajo, y el pin
sube de `bcrypt<4.0` a `>=5.0,<6.0`.

**Los hashes existentes siguen siendo válidos**: passlib generaba `$2b$` estándar y `bcrypt.checkpw`
los verifica sin tocar la base. Hay dos detalles que se replicaron a propósito:

- **Truncado a 72 bytes.** passlib truncaba en silencio; bcrypt 5 lanza `ValueError`. Se trunca
  explícitamente para que quien tenga una contraseña más larga siga entrando con ella.
- **Hash ilegible.** `verify_password` devuelve `False` en vez de propagar la excepción, así que un
  registro con hash corrupto responde 401 y no un 500.

`tests/test_auth.py` fija las tres cosas, con un hash generado por passlib incrustado como fixture
para que la compatibilidad no se pueda romper sin que la suite avise. `colibri_keys` y
`mapalab_keys` tenían cada uno su propio `CryptContext` duplicado; ahora reusan esas funciones.

**La suite queda en 889 tests y cero warnings** (venía de 462).

## [1.106.0] - 2026-07-30

### Cambiado: FastAPI sube de 0.112 a 0.141 y la suite pasa de 462 warnings a 1

El pin `fastapi>=0.111,<0.113` llevaba a starlette 0.38.6, cuyo lector de formularios importa el
módulo `multipart` en lugar de `python_multipart` y avisa de la deprecación en cada corrida. Lo que
impedía subir no era FastAPI sino **`prometheus-fastapi-instrumentator`**: la línea 7.x declara
`starlette<1.0.0`, así que con FastAPI moderno (starlette 1.3.1) la instrumentación explotaba y
tumbaba 112 tests con 133 errores. La 8.1.0 declara `starlette>=1.0.0` y ambos suben juntos.

`/metrics` se verificó lado a lado en las dos imágenes: expone exactamente las mismas seis familias
(`http_requests_total`, `http_request_duration_seconds*` y sus `_created`) y las mismas 33 líneas,
así que los dashboards de huachicol que scrapean `mariachi-api:8000` no cambian.

El contrato de la API se comparó generando el `openapi.json` completo con ambas versiones. Las
únicas diferencias son `format: binary` → `contentMediaType: application/octet-stream` en los
uploads (JSON Schema 2020-12, que es lo que OpenAPI 3.1 exige), los campos `ctx` e `input` que
FastAPI ahora documenta en `ValidationError`, y el `rowKey` de abajo.

### Corregido: la presencia por fila del grid nunca se registraba

`PUT /grid/{resource}/presencia` declara `row_key: str | None = Body(default=None, embed=True,
alias='rowKey')`. **FastAPI 0.112 ignoraba el `alias` de un `Body` embebido** — el esquema publicaba
la propiedad como `row_key`—, así que el `{ rowKey }` que envía `gridService.js` llegaba como
`row_key=None` y el `if row_key:` del handler nunca entraba: la presencia por fila se perdía en
silencio. En query params el alias sí se aplicaba, por lo que el `DELETE` de la misma pareja
funcionaba y el fallo pasaba desapercibido. Con 0.141 el alias se respeta y el registro empieza a
ocurrir; el frontend no necesita cambios porque ya mandaba la clave correcta.

### Corregido: el modelo declaraba dos llaves foráneas que la base nunca tuvo

`ReporteGrupo.primer_reporte_id` y `ultimo_reporte_id` declaraban `ForeignKey("reportes.id")`, pero
la migración `c1d2e3f4a5b7` que creó la tabla solo crea el constraint de `reportes.grupo_id`. El
modelo pedía integridad que Postgres no aplica, y un `alembic revision --autogenerate` podía
proponer crearla en cualquier momento. Se quitan del modelo para que coincida con la base; ningún
código dependía de ellas (el join de `reportes.py` usa la condición explícita). El ciclo de
dependencia mutua que declaraban era el origen de ~450 de los 462 warnings: SQLAlchemy no podía
ordenar las tablas para el `create_all`/`drop_all` de cada fixture.

### Corregido: `ultimo_cambio` se inyectaba sin validar

El `PUT` admin de formularios metía el `dict` del servicio en `FormularioUpdateResponse` vía
`model_copy(update=...)`, que no valida. Funcionaba por coincidencia de claves: si el servicio
renombrara una, la respuesta se serializaría mal en silencio. Ahora pasa por
`UltimoCambioInfo.model_validate`.

### Cambiado: constantes de estado renombradas

Starlette 1.x deprecó `HTTP_422_UNPROCESSABLE_ENTITY` y `HTTP_413_REQUEST_ENTITY_TOO_LARGE` en favor
de `HTTP_422_UNPROCESSABLE_CONTENT` y `HTTP_413_CONTENT_TOO_LARGE`. Se renombraron los 20 usos en 8
archivos. Los códigos numéricos siguen siendo 422 y 413: ningún cliente lo nota.

También: `declarative_base` se importa de `sqlalchemy.orm` (la ruta de `sqlalchemy.ext.declarative`
está deprecada desde 2.0), los tests fijan las cookies en el cliente httpx en vez de por request
(deprecado en httpx), y `httpx2` entra a los extras `dev` porque es lo que prefiere el `TestClient`
de starlette 1.x.

El único warning que queda es `passlib` importando el módulo `crypt`, que desaparece en Python 3.13.
No tiene arreglo por versión —1.7.4 es la última y sigue igual—; cuando se actualice el intérprete
habrá que sustituir passlib por `bcrypt` directo en `app/core/security.py`.

### Eliminado: prometheus, con los contadores útiles mudados a `/ontoy`

huachicol dejó de ser un stack de observabilidad en su 2.0.0 (2026-07-21): Prometheus, Grafana,
Loki y Alloy se retiraron y hoy solo sondea el `/ontoy` de cada servicio. El scrape de
`mariachi-api:8000/metrics` que documentaba su changelog v1 ya no existe, así que el endpoint
quedaba exponiendo métricas que nadie leía.

Se retiran `prometheus-fastapi-instrumentator`, la dependencia transitiva `prometheus-client`, el
middleware de instrumentación y el endpoint `GET /metrics`. El sistema de contadores propio
(`app/api/metrics.py`) **se conserva** —lo alimentan 67 llamadas en 18 archivos— y ahora se publica
en el payload de `/ontoy`, bajo la llave `counters`, con los cuatro que sirven para detectar
problemas:

- `mariachi_rate_limit_hits_total`
- `mariachi_login_failed_total`
- `mariachi_login_locked_total`
- `mariachi_tree_notify_failed_total`

Los demás (volúmenes de escritura, lecturas, uploads) se siguen contando en memoria pero no se
exponen: sin una base de series temporales detrás, un acumulado que se reinicia con el contenedor no
permite calcular tasas, y engordaría un payload que se sondea cada pocos segundos. Añadir uno es
agregar su nombre a `ONTOY_COUNTERS`.

### Cambiado: nginx a 1.30.4-alpine

`nginx/Dockerfile` usaba la etiqueta flotante `nginx:alpine`, cacheada en las máquinas del equipo en
1.29.8. Esa versión es vulnerable a **CVE-2026-42533** (CVSS 9.2, desbordamiento de heap con
posible ejecución remota de código, parchado el 15 de julio de 2026), **CVE-2026-60005** y
**CVE-2026-56434**. Se fija la línea estable parchada. La configuración se validó con `nginx -t`
contra 1.30.4 sin cambios.

### Nota de despliegue

**Hay que reconstruir la imagen de la API.** `HTTP_422_UNPROCESSABLE_CONTENT` no existe en starlette
0.38, así que el código de esta versión no arranca contra la imagen anterior. Con `make build` o el
rebuild del deploy queda resuelto; no hay migraciones ni cambios de configuración.

Quien tuviera algo apuntando a `GET /metrics` de mariachi debe mirar `counters` en `/ontoy`: el
endpoint ahora responde 404.

## [1.105.2] - 2026-07-29

### El lint del admin vuelve a cero problemas

#### Corregido

- **`export` muerto en `LayerBadgeSection.jsx`.** `BADGE_PRESETS` se exportaba sin que nadie lo
  importara: su unico uso esta en la linea 32 del propio archivo, y su vecino `VARIANT_OPTIONS` ya
  era local, asi que el `export` era un descuido. Disparaba el warning
  `react-refresh/only-export-components`, que avisa que el fast refresh de Vite deja de funcionar
  cuando un archivo exporta algo que no es un componente. Se quita el `export` en lugar de mover la
  constante a `constants/` —el remedio que sugiere el mensaje del linter— porque nada necesita
  compartirla. `npm run lint` del admin queda en **cero problemas**.

## [1.105.1] - 2026-07-29

### El contexto se movio al repo central y los docs quedaron homologados

Sin cambios de comportamiento salvo la correccion del slug reservado.

#### Corregido

- **`SLUGS_RESERVADOS` incluia `"regisño"`**, presente desde el commit que creo la lista (0.39.4,
  mayo de 2026) y repetido en su mensaje. No protegia nada: el frontend de SIEEJ nunca tuvo una
  ruta `registro` ni `regisño` — sus rutas literales son `cambiar-contrasena`, `error`,
  `exencion`, `inicio-sesion` y `mis-envios`, y el resto cuelga de `:slug`. Se elimino tras
  verificar las rutas reales y que ningun test la referenciara. La lista restante sigue cubriendo
  las cinco rutas del frontend mas `catalogos`, que si colisionaria con
  `GET /formularios/catalogos`.

#### Cambiado

- **Docs renombrados a kebab-case** segun la convencion del ecosistema: `ARCHITECTURE.md` →
  `arquitectura.md`, `ROUTER.md` → `router.md`, `ROLES.md` → `roles.md`, `COOKIES_CSRF.md` →
  `cookies-csrf.md`, `DRAFTS.md` → `borradores.md`, `SLD_EDITOR.md` → `editor-sld.md`,
  `ALEMBIC_MULTI_ENV.md` → `alembic-multi-env.md`. Se actualizaron las referencias en el README,
  en `arquitectura.md`, en `sdk/README.md` y en el docstring de `core/bucket_policies.py`.

#### Eliminado

- `docs/context.md`, `PENDIENTES.md`, `sieej.md`, `colibri.md`, `acervo-subida-externa.md` y
  `DATAENGINE_CREDENTIALS.md`. Su contenido vive ahora en el repositorio central de contexto
  (`iieg-oficial/context-ame-esta`), en `repos/mariachi/`: `contexto.md`, `pendientes.md` (con
  triage de cada item del roadmap contra este changelog), `modulo-sieej.md`, `modulo-colibri.md`,
  `acervo-subida-externa.md` y `dataengine-credenciales.md`.
- Los `docs/CONVENTIONS_*.md` (que estaban en `.gitignore`, sin versionar) y su patron del
  `.gitignore`. Las convenciones de backend son ahora `ecosistema/convenciones-backend.md` y las
  del CMS `repos/mariachi/convenciones-cms.md` en el repo central, ambas corregidas: describian
  Ant Design 5, la estructura `components/pages/contexts`, los alias `@components`/`@pages` y el
  rol `disenadora`, todo desactualizado desde noviembre de 2025.

## [1.105.0] - 2026-07-29

### Cambiado: los campos se agregan en línea desde el propio espacio libre

Agregar un campo junto a otro se pedía con un botón «En línea nueva» al fondo del editor, lejos del lugar donde iba a aparecer, y sin decir en qué línea caería: el campo se acomodaba donde cupiera. Ahora el espacio libre de cada línea es el que ofrece la acción.

- El **hueco** de una línea es clickeable y muestra un `+` al pasar el cursor o al enfocarlo con el teclado. El campo nace con el ancho del hueco (`snapColSpan`), ya colocado en esa columna.
- El **divisor de línea** suma un `+` junto al indicador de «espacio libre», que agrega en el primer hueco de esa línea.
- La barra inferior queda con un solo botón, **«Agregar campo en nueva línea»**, que es lo que de verdad hace: el campo empieza su propia línea aunque después se angoste.

En móvil la grilla es de una columna, así que los huecos no ofrecen la acción y el botón de la barra sigue siendo el camino.

### Corregido: el campo agregado a la izquierda de otro se iba a su propia línea

Al colocar un campo en un hueco que **abre** la línea (a la izquierda de los que ya estaban), el nuevo se guardaba sin la marca de apertura mientras el que era primero la conservaba, así que terminaban en líneas distintas: pedir un campo junto a «a» producía una línea nueva con el campo y dejaba «a» sola en la suya. La colocación ahora reutiliza `moveToSlot` —la misma operación del arrastrar y soltar—, que traspasa la apertura de línea al campo entrante. Queda cubierto con pruebas.

### Corregido: el formulario del campo se vaciaba al re-renderizar el editor

El efecto que rellena el formulario dependía del objeto `field` completo, y el editor lo construía en línea en cada render: cualquier re-actualización de la lista mientras se llenaba un campo nuevo lo reseteaba a valores vacíos. Ahora depende de una clave derivada del nombre y el acomodo, y los valores iniciales del campo nuevo están memoizados.

## [1.104.1] - 2026-07-29

### Corregido: los archivos de GeoServer con nombres legados no se podían descargar ni borrar

Los archivos subidos fuera del panel (o migrados) suelen traer espacios y acentos —
`Icono Salud.svg`, `estación (norte).svg` — y `_validate_file_name` exige segmentos
`[a-zA-Z0-9._-]`, así que descargarlos o borrarlos respondía 400: quedaban atrapados en
GeoServer, visibles pero inmanejables.

Ahora los endpoints de lectura y borrado usan `_validate_file_name_readonly`, que relaja el
formato de los segmentos pero **mantiene la lista blanca de extensiones**, y los nombres viajan
URL-encoded hacia el REST de GeoServer (`quote(..., safe='/')`) para que los caracteres especiales
no rompan la petición. Las subidas siguen exigiendo el formato estricto: la relajación es solo
para gestionar lo que ya existe.

La lista blanca no se relaja porque la raíz del workspace en el Resource API no contiene solo
iconos: `_styles_base()` apunta a `resource/workspaces/{ws}`, donde también viven `datastore.xml`
—con host, base y contraseña del almacén—, `workspace.xml` y los estilos. Sin el filtro de
extensión, un editor podía descargar las credenciales de la base o borrar la configuración del
workspace por el endpoint de archivos.

### Corregido: el ZIP de carpetas incluía los archivos de conexión

`GET /geoserver/files/zip` empaqueta el árbol completo del workspace, así que arrastraba los
`datastore.xml` junto con los iconos y estilos. Se excluyen los archivos de conexión
(`*store.xml`: `datastore`, `coveragestore`, `wmsstore`, `wmtsstore`); el resto del contenido
—incluidos los `.sld` y los `.xml` de estilos— sigue viajando en el ZIP.

### Corregido: el snippet SLD y las URLs de descarga no escapaban el nombre

Con nombres que ya admiten más caracteres, un `&` rompía el XML del `<ExternalGraphic>` y un `#`
truncaba la URL de descarga. El snippet escapa XML (incluidas las comillas del atributo `href`)
y `download_url` codifica nombre y workspace.

## [1.104.0] - 2026-07-29

### Corregido: el recálculo de numeralia fallaba en cascada y podía borrar valores

Auditoría del flujo completo de estadísticas dinámicas de los metadatos de capas.

**Una estadística fallida tumbaba las demás.** `POST /layer-metadata/{key}/stats/refresh` ejecutaba todas las stats sobre la misma transacción; en Postgres un error la aborta por completo, así que la primera query rota hacía fallar todas las siguientes **y el propio `COMMIT`**, devolviendo un 500. El mecanismo de errores parciales que ya existía (`_errors`) era inalcanzable en la práctica, y aunque llegara, el `response_model` lo filtraba antes de salir: **el cliente nunca podía enterarse de qué falló**. Ahora cada stat corre aislada en un `SAVEPOINT` (`execute_stats_batch`) y los fallos viajan en el campo `errors` de la respuesta, que el panel muestra slot por slot.

**El botón "Recalcular valores ahora" borraba la numeralia legacy.** Las capas migradas del Sheet original tienen valores guardados sin configuración; el panel los precargaba como slots estáticos y dejaba el botón habilitado, pero el recálculo usa la configuración **del servidor** — vacía — así que persistía `values=[]` y la numeralia desaparecía del visor sin aviso. Ahora el endpoint responde 400 en vez de vaciar, el botón se deshabilita mientras haya cambios sin guardar o no exista configuración guardada, y el tooltip explica por qué.

**Protección contra borrado**: si ninguna stat pudo calcularse, el endpoint responde 502 con el detalle y conserva los valores anteriores en lugar de dejar la capa sin numeralia.

### Corregido: el guardado se ofrecía a editoras que siempre recibían 403

`PUT /stats` exige rol `tetlamamakani`, pero el panel mostraba "Guardar configuración" a cualquier editora con acceso a la capa: podía configurar, previsualizar y recalcular, y descubría la restricción solo al guardar. Ahora el botón se deshabilita y un aviso explica que el guardado es de administradora; previsualizar y recalcular siguen disponibles.

### Cambiado: el campo `format` por fin se aplica

Se validaba al guardar pero ningún productor lo usaba, así que un promedio llegaba al visor como `340172.1895424836601307`. Ahora `execute_stats_batch` lo aplica al persistir y el preview muestra el valor ya formateado — lo que realmente verá el visor. `integer`, `decimal_2`, `percentage`, `currency_mxn` y `compact` ajustan solo la precisión: el separador de miles lo pone el visor y el símbolo va en su propio campo.

### Corregido: precarga legacy con posiciones duplicadas

Los valores legacy se precargaban sin deduplicar `posicion`, así que un Sheet con posiciones repetidas producía un 400 (`positions duplicadas`) evitable al guardar. El editor de fórmulas tampoco limitaba el anidamiento y dejaba construir expresiones que el backend rechaza pasando de 6 niveles; ahora corta en el mismo límite.

### Nota de despliegue

Requiere la migración `0031_stats_read_grants` de **dataengine 1.28.0**: sin ella, el rol `mariachi_layers` no puede leer los schemas temáticos y toda estadística sobre datos reales responde 502 `permission denied for schema`.

## [1.103.1] - 2026-07-28

### La validación de contraste no revisaba los colores de acento

Los pares críticos cubrían texto, primario y estados, pero dejaban fuera `secondary` y `accent`, que son justo los que se usan en botones, enlaces y llamadas a la acción. Se agregaron esos dos y también `warning` e `info`, que faltaban.

El efecto es inmediato en la marca `jalisco`: su naranja institucional `#FF8300` aparece ahora con **2.47:1 sobre blanco — no cumple AA**. Sirve como fondo o como acento gráfico, pero no como color de texto ni de enlace. Antes esta combinación no se evaluaba y el problema pasaba inadvertido.

## [1.103.0] - 2026-07-28

### La identidad visual ya se administra desde el panel

Nueva sección **Identidad** en el sider (solo `tetlamamakani`), con una pestaña por marca. Cierra el ciclo que empezó en 1.101.0: el modelo, los generadores y ahora la pantalla desde donde se configura.

Qué se puede hacer:

- **Editar tokens** por grupo, con selector de color para los que son color y edición directa para el resto. Las familias tipográficas se escriben separadas por coma y se guardan como lista.
- **Llenar la guía de marca** en sus siete secciones —principios, logotipo, tipografía, rejilla, componentes, iconografía y redacción—. Lo que se deje vacío simplemente no aparece en el `design.md` generado.
- **Ver los artefactos** antes de bajarlos y **descargar el ZIP** con los cinco archivos.

### El contraste se valida al vuelo

La pantalla evalúa seis combinaciones críticas de color —texto sobre fondo, texto sobre tarjeta, primario sobre fondo y los semánticos— y reporta el ratio con su veredicto WCAG: cumple, solo apto para texto grande, o no cumple.

Esto ya sirvió para detectar algo real en la marca `jalisco`: el naranja institucional `#FF8300` **no alcanza AA como color de texto sobre blanco**. Funciona como acento y como fondo, pero un texto naranja sobre blanco no es legible para todos. El gris `#465055`, en cambio, cumple de sobra.

El cálculo de luminancia y ratio sigue la fórmula de WCAG 2.1 y está cubierto por 10 casos, incluidos los extremos (blanco contra negro da 21:1) y las entradas que no son color.

### Endpoints nuevos

```
GET /api/mariachi/identidad/{marca}                    detalle con tokens, campos y contraste
PUT /api/mariachi/identidad/{marca}/tokens/{id}        actualiza un token
PUT /api/mariachi/identidad/{marca}/campos             actualiza campos en lote
```

La ruta de artefactos sueltos pasa de `/{marca}/{artefacto}` a `/{marca}/artefactos/{artefacto}`, para que no compita con `/{marca}` ni con `/{marca}/export`.

## [1.102.0] - 2026-07-28

### El módulo Identidad ya genera y entrega los artefactos de marca

Sobre el modelo de 1.101.0, ahora mariachi construye los cinco archivos que antes salían del `npm run build` de `guidelines-iieg`, y los entrega por HTTP:

```
GET /api/mariachi/identidad/marcas              marcas disponibles
GET /api/mariachi/identidad/{marca}/export      ZIP con todo
GET /api/mariachi/identidad/{marca}/theme.css   artefacto suelto
```

Los artefactos son `design.md`, `theme.css` (bloque `@theme` de Tailwind v4), `tokens.css` (las mismas variables en `:root`), `fonts.css` (`@font-face` desde el Acervo) y los `tokens/*.tokens.json` en formato DTCG. El mapeo de nombres respeta los namespaces de Tailwind v4: `color.*` sale como `--color-*`, `font.size.*` como `--text-*`, `space.*` como `--spacing-*`.

El `design.md` generado **solo documenta lo que está definido**. Antes la guía se llenaba de `TODO` porque el archivo listaba todos los campos posibles; ahora una sección sin datos simplemente no aparece, y el documento dice de entrada que lo que falta hay que preguntarlo en vez de inventarlo. Las reglas que no dependen de configuración —accesibilidad AA, prohibiciones del logotipo, no transmitir información solo con color— se incluyen siempre.

Los generadores son funciones puras, así que se prueban sin base de datos: 14 casos cubren el mapeo de variables, el árbol DTCG, los `@font-face` por peso y el armado del markdown.

## [1.101.0] - 2026-07-28

### Base del módulo Identidad: las marcas del IIEG se administran desde mariachi

Primer paso para que la identidad visual se configure aquí en lugar de editando markdown y JSON a mano en el repo `guidelines-iieg`, que queda en vías de retiro. Esta versión trae solo el modelo de datos y la semilla; la página del admin y la descarga de artefactos vienen después.

Se agrega el schema `identidad` con cuatro tablas: `marcas`, `tokens` (valor en `JSONB`, para que un token acepte texto, número o lista como la familia tipográfica), `campos` (los textos de la guía de marca: personalidad, reglas de logotipo, microcopy) y `fuentes` (familias con sus archivos y pesos).

La semilla trae **únicamente lo que ya estaba configurado** en `guidelines-iieg`; los valores que seguían en `TODO` o marcados como `PLACEHOLDER` no se importaron, para no arrastrar relleno. Quedan cargadas dos marcas:

- **`iieg`** — 30 tokens (espaciado, radios y tipografía), 8 campos y la familia Garet con sus 7 pesos servidos desde el Acervo.
- **`jalisco`** — 35 tokens, incluidos sus 5 colores institucionales reales (`#465055` Pantone 431 C y `#FF8300` Pantone 151 C), 12 campos y la familia Nexa.

Borrar una marca arrastra en cascada sus tokens, campos y fuentes. Migración `1dent1dad0001`.

## [1.100.0] - 2026-07-28

### Agregado: captura masiva de metadatos en una tabla, con historial de quién cambió qué

El área venía de llenar los metadatos de capas en Excel y el editor por capa les resultaba lento: obliga a navegar, cargar y guardar capa por capa, cuando su trabajo es por lote. La vista **Tabla** (`/mapalab/layers/tabla`, conmutador Árbol · Tabla en Capas) es una hoja de cálculo dentro del panel: flechas, Tab, pegado de bloques desde Excel, arrastre para rellenar hacia abajo y Ctrl+Z. Corre a pantalla completa, sin sider, para que la tabla ocupe todo el ancho.

- **Nada se guarda hasta presionar Guardar.** Las celdas editadas se marcan en ámbar y el borrador vive en el navegador: si se cierra la pestaña, al volver se ofrece retomarlo. Se descartó el autosave por celda (ruido de auditoría y rate limit) y la tabla `borradores`, que es la cola de revisión y no debe llenarse de capturas intermedias.
- **Locking optimista por celda**: cada cambio viaja con su valor anterior. Si alguien más tocó esa celda mientras tanto, se marca en rojo y el resto del lote sí se guarda.
- **Historial por celda** (`mapalab.grid_cell_history`): quién cambió qué campo, de qué valor a cuál y cuándo. Se registra por campo lógico (`fuentes_corto`, `numeralia_01_valor`) y no por la columna JSONB completa, que sería ilegible. Los tres caminos de escritura alimentan la misma tabla: la vista de captura, la ficha de la capa y la ingesta masiva. Se consulta en un drawer lateral, con alcance por capa o global.
- **Descarga en Excel y CSV**: el XLSX trae dos hojas, *Metadatos* (estado actual con responsable y fecha) e *Historial*. Era el motivo original del módulo.
- **`mapalab.layer_stats` gana `updated_by`/`updated_at`**: hasta ahora cambiar una numeralia no dejaba rastro de autor en ninguna parte.
- La infraestructura es genérica y reusable (`/grid/{resource}/*` + `GridSpec` en el backend, `shared/components/dataGrid/` en el admin): montar un segundo grid es escribir una spec y registrarla, sin migración nueva.
- Presencia por fila sobre Redis: se ve quién está parado en cada capa mientras se captura.

**Requiere migración de DataEngine (`0030_grid_cell_history`) antes de desplegar mariachi**, y rebuild del admin (dependencia npm nueva `react-datasheet-grid`). Sin la migración, el guardado de la tabla falla; la descarga sigue funcionando sin la hoja de historial. Opcionalmente, `python scripts/backfill_grid_history.py` siembra el estado inicial atribuido al último responsable conocido.

### Corregido

- `useIsMobile` devuelve un objeto, no un booleano. La barra de la vista de pantalla completa lo usaba sin destructurar, así que se quedaba siempre en el diseño de dos filas incluso en escritorio. Ahora una sola fila en desktop y dos en tablet y móvil.
- Los botones de la barra superior oscura heredaban el color por defecto y quedaban negro sobre negro. Se les dio estilo propio; el botón Guardar deshabilitado además dice «Sin cambios» para que se entienda que está inactivo a propósito.
- Los tooltips de esa barra se montaban fuera del viewport y provocaban scroll mientras se reacomodaban: se reemplazaron por `title` nativo, que dibuja el navegador sin reflow.
- El footer del sider apilaba sus botones en fila y no cabían con el sider colapsado; ahora pasan a columna.
- Una copia anidada de `react-dom` 18 (arrastrada por dependencias del grid que no declaran React 19) convivía con React 19 y rompía el render de **cualquier** página con `ReactCurrentBatchConfig`. Se fija una sola copia con `overrides` en `admin/package.json`.

## [1.99.0] - 2026-07-28

### Agregado: un campo condicionado y su disparador se ven como lo que son, una pareja

Un `showWhen` relaciona dos campos que en la cuadrícula pueden quedar lejos, y la única pista era una etiqueta «Condicionado» con el `name` crudo del disparador y el valor sin traducir.

- **La etiqueta dice la condición en palabras** —«Si Responsable = Sí», resuelta contra el catálogo— y **es un enlace**: lleva al disparador, cambiando de pestaña si hace falta y resaltándolo al llegar. Del otro lado, «Activa 3» despliega la lista de los tres campos y navega a cada uno.
- **Al pasar el cursor por la etiqueta se resalta la relación**: el disparador y sus dependientes se marcan y el resto se atenúa. El color sale del nombre del disparador, así que dos grupos de condiciones en el mismo paso se distinguen de un vistazo. Se prefirió esto a dibujar conectores: en un grid de 6 columnas donde los campos cambian de línea, las líneas serían frágiles y ruidosas.
- **Se avisa de la condición rota**: disparador que ya no existe, disparador en otra pestaña del repeater —donde se captura por separado, así que la condición no se evalúa como se espera— y cadenas circulares. Esto importa porque `compat.py` **descarta en silencio** los `showWhen` huérfanos al guardar: sin el aviso, la condición desaparecía sin que nadie se enterara.

### Agregado: mover una línea completa, y un botón para vaciar el portapapeles

- El separador de cada línea gana **subir** y **bajar**, que mueven la línea entera con todos sus campos, junto al ya existente **unir con la de arriba**.
- La barra inferior gana **«En línea nueva»**, que crea el campo ya marcado para abrir línea: agregado con el botón normal, un campo angosto se pega a la línea anterior si cabe.
- El campo copiado se podía sacar del portapapeles solo desde el «Cancelar» del diálogo de pegar, así que en la práctica se quedaba ahí para siempre. Ahora hay una **✕ junto al botón de pegar**.

## [1.98.0] - 2026-07-28

### Agregado: crear y quitar líneas en el acomodo de un formulario SIEEJ

El editor de campo gana el switch **«Empezar una línea nueva en este campo»**, que escribe `layout.newRow`: se puede partir una línea por donde se quiera, sin depender de que el campo caiga en la columna 1. El separador de cada línea, de la segunda en adelante, trae el botón **subir a la anterior**.

Unir suelta el anclaje de **todos** los campos de la línea, no solo del primero: soltando únicamente a ese, los demás conservaban su columna y se quedaban abajo. Los que no quepan arriba forman línea propia.

### Cambiado: la línea de un campo la declara la definición, ya no se deduce del orden

`layout.newRow` pasa a ser la marca de inicio de línea, válida en cualquier columna. Antes solo se reconocía en la columna 1, así que la línea era **implícita**: se deducía comparando la columna pedida contra la ya ocupada, y era el orden de los campos —no la definición— lo que decidía dónde cortaba cada línea. De ahí que ensanchar o mover un campo re-particionara todo lo que venía después.

`materializeLayout` fija ahora línea y columna de cada campo visible, y ordena el arreglo por posición visual para que el orden deje de pelearse con las columnas. Las definiciones anteriores se ven igual y el contrato del backend no cambia —`newRow` ya era un booleano válido—, así que no hay migración. Requiere SIEEJ >= 1.52.0, que trae el mismo modelo del lado del respondent.

### Corregido: mover un campo dejó de desplazar líneas que nadie tocó

Cuatro defectos que salieron de auditar 250 combinaciones de operación y acomodo:

- **Arrastrar sobre otra tarjeta intercambia las dos ranuras** en vez de reordenar la lista. Reordenar movía el campo dentro del arreglo y, como la línea se deducía del orden, re-particionaba el paso entero.
- **El arrastre dejó de quedarse pegado al primer campo que tocaba**: con la estrategia de intercambio el campo se dibuja encima del otro, así que `closestCenter` seguía midiendo contra el mismo par de centros. El destino se resuelve ahora por lo que hay bajo el puntero, con `closestCenter` de respaldo para el teclado.
- **Un hueco solo se ofrece si el campo arrastrado cabe en él**, y nunca si mide menos que el campo más angosto. Antes se ofrecía siempre y al soltar empujaba al vecino a la línea siguiente.
- Las tarjetas ganan **altura mínima** y el umbral del arrastre sube de 4 a 10 px: una tarjeta de línea completa es muy ancha y de poco alto, y al soltar sobre ella un campo angosto el destino saltaba de línea.

`__tests__/acomodo.invariante.test.js` deja fijada la auditoría: cinco acomodos por cinco operaciones, verificando que las líneas ajenas no cambian y que materializar es estable. De 38 alteraciones quedan 8, todas geométricas — un campo que crece o que se intercambia con otro de distinto ancho no puede dejar a sus vecinos donde estaban.

## [1.97.2] - 2026-07-28

### Los recursos de GeoServer dejan de servirse como inmutables

El endpoint de descarga marcaba los archivos `public, max-age=86400, immutable`. Mientras el gateway forzaba `no-store` eso no se notaba, pero al quitarlo (1.97.1) el header empezó a aplicar de verdad — y `immutable` le dice al navegador que no revalide nunca.

El problema es que estas URLs no llevan hash de contenido: son el nombre del archivo, y Recursos permite subir con el mismo nombre para reemplazarlo, que es justo lo que se hace al corregir un icono. Quien ya lo hubiera visto seguiría con el viejo hasta 24 h. Es distinto de los assets de Vite o de las miniaturas del Acervo, donde la URL cambia con el contenido y ahí `immutable` sí corresponde.

Pasa a `private, max-age=60, must-revalidate`, apoyado en el ETag y el 304 que llegaron en 1.97.1: mientras se navega entre carpetas se sirve de caché, y pasado el minuto se revalida con una respuesta sin cuerpo. Un icono reemplazado se ve en un minuto en vez de en un día, y los bytes se siguen sin retransferir. `private` además evita que un proxy compartido guarde contenido que requiere sesión.

## [1.97.1] - 2026-07-28

### Corregido: navegar una carpeta de Recursos devolvía 429

Una carpeta de simbología tiene cientos de SVGs y el grid pide una miniatura por archivo, así que abrirla disparaba una ráfaga de GETs que chocaba contra dos límites a la vez.

- **Rate limit del API.** El scope `geoserver_download` estaba en 600 req/min por usuario (ventana deslizante): una sola carpeta grande lo consumía y la siguiente ya respondía 429. Sube a 3000/min, que sigue acotando el abuso real —bajarse el data dir entero— sin estorbar a un explorador de archivos.
- **Caché anulada en el gateway.** Las rutas de `/geoserver/files` forzaban `Cache-Control: no-store`, que pisaba el `public, max-age=86400, immutable` que ya mandaba el API. El navegador no guardaba nada, así que *cada* regreso a la carpeta repetía la ráfaga completa. Se retira el `no-store` —el API decide, como en `/acervo/thumb`— y la petición de descarga responde **304** ante un `If-None-Match` que coincida, en vez de reenviar el archivo.
- **Ráfaga acotada en origen.** `GeoserverThumb` pide turno a un semáforo de 6 miniaturas concurrentes (`thumbQueue`) antes de asignar el `src`, así que el número de peticiones simultáneas ya no depende de cuántos archivos tenga la carpeta. Mismo patrón que el semáforo de subidas del Acervo.

Requiere gateway-hub >= 1.33.1 para la parte de caché y la zona de rate limit.

## [1.97.0] - 2026-07-28

### Recursos deja de estar anclado a `styles/` dentro de un workspace

El geoanalista tenía que dejarlo todo en `workspaces/<ws>/styles/`. Ahora el ámbito de un workspace se navega desde su **raíz**, así que puede organizar los archivos donde le convenga —incluidas carpetas propias junto a `styles/` y las de los datastores—.

El ámbito **Global se queda en `styles/`** a propósito: su raíz es el data dir completo, con `security/`, `logs/`, `global.xml` y la configuración de todos los workspaces.

Lo que cambia con esto es el `xlink:href` del snippet SLD, porque GeoServer resuelve los href relativos desde donde vive el SLD: un archivo en `styles/iconos/x.svg` sigue siendo `iconos/x.svg`, pero uno fuera de `styles/` ahora sale como `../simbolos/x.svg`. Los `.xml` de configuración no se listan ni se pueden borrar: la lista blanca de extensiones ya los dejaba fuera.

### Tipografías: las institucionales instaladas en el servidor cuentan como nuestras

Las Garet se instalaron a mano en su momento: viven versionadas en el repo `geoserver` (`fonts/`) y se montan read-only en `/usr/share/fonts/custom`, fuera del data dir. El REST de GeoServer las reporta como familias cargadas pero no tiene forma de decir de dónde salieron, así que la página las daba por ajenas.

`GEOSERVER_INSTALLED_FONT_FAMILIES` (default `Garet`) declara esas familias. Ahora hay tres orígenes: `propia` (archivo subido desde el CMS), `instalada` (institucional puesta en el servidor) y `sistema`. Las dos primeras se agrupan bajo «Nuestras tipografías», distinguidas por color y tooltip.

## [1.96.0] - 2026-07-28

### Recursos de Sextante: se va el tope de 200 MB

Los rasters que se quieren publicar pesan varios GB y no entraban. El tope existía por dónde se acumulaban las partes: el upload por chunks es una secuencia de requests independientes que pueden caer en workers distintos de Gunicorn, así que las partes se guardaban en **Redis**, que es memoria — con 7 GB tumbaba a `mariachi-redis`.

Ahora las partes se escriben a disco (`GEOSERVER_UPLOAD_STAGING_DIR`, un volumen propio del contenedor) y solo la metadata de la sesión sigue en Redis, que es lo que da el TTL y lo que comparten los workers. El ensamblado hacia GeoServer se lee por bloques de 8 MB, así que el pico de memoria ya no depende del tamaño del archivo.

- **Sin tope por defecto.** `GEOSERVER_UPLOAD_MAX_BYTES=0` = sin límite; el techo real pasa a ser el disco de la VM. Se puede fijar un tope por entorno sin tocar código.
- **El PUT a GeoServer sale del event loop** (`run_in_threadpool`). Antes bloqueaba al worker, y con archivos grandes gunicorn lo habría matado por su `--timeout 300`.
- **Limpieza de temporales.** Un upload interrumpido dejaba sus partes en disco para siempre: el TTL de Redis borraba la metadata pero no los bytes. `cleanup_stale_dirs()` corre al iniciar cada sesión nueva y borra los directorios sin metadata viva.
- **Content-Length real.** El PUT usa los bytes efectivamente acumulados, no el tamaño declarado por el cliente: si un chunk se reintentaba con otro tamaño, GeoServer recibía el archivo cortado.
- **Sesiones que se renuevan.** Cada parte recibida refresca el TTL; una subida de varios GB podía pasar de las 2 h originales y expirar a medio camino.
- **nginx.** `gateway-hub` y `mariachi-nginx` estrenan `location` propio para `/api/*/geoserver/files` con `client_max_body_size 0`, sin request buffering y timeouts de 30 min.

### Recursos de Sextante: quién subió y borró qué

La sección no dejaba rastro. Ahora las subidas (directa y por partes) y los borrados escriben en `actividad` con actor, IP, nombre, workspace, destino, tamaño y modo de subida: `geoserver.file.upload`, `geoserver.file.delete` y `geoserver.fonts.reload`.

### Nueva subpágina: Tipografías (`/sextante/tipografias`)

Las fuentes de las etiquetas de un SLD se subían como un recurso más y no había forma de ver cuáles había ni si GeoServer las reconocía.

- `GET /geoserver/fonts` cruza las familias que la JVM tiene cargadas (`/rest/fonts`) con los archivos `.ttf`/`.otf` subidos a `styles/`, y **distingue las nuestras de las que ya trae GeoServer**: una familia es «propia» si algún archivo subido la respalda.
- Cada archivo indica si ya está cargado; si alguno no lo está, la página avisa y ofrece `POST /geoserver/fonts/reload`, porque GeoServer solo registra una fuente nueva tras recargar su catálogo.
- Se aceptan `ttf` y `otf` — los únicos dos formatos que Java 2D lee. WOFF/WOFF2 se dejan fuera a propósito: subirlos daría la falsa impresión de que sirven.

### Recursos de Sextante: la vista se alinea con la del Acervo

Mismo orden y misma sintaxis que la vista del Acervo, que estaba más pulida: `PageHeading` compartido, tarjeta contenedora, breadcrumb con el conteo de carpetas y archivos, y barra única con buscador, alternador **Grid / Lista** (se recuerda en `localStorage`) y acciones. La vista de lista es nueva (`GeoserverFilesList`).

## [1.95.0] - 2026-07-28

### Corregido: la tarjeta del editor se dibuja en la columna que dice el modelo

`FieldsList` decide las líneas con `groupIntoRows` — de ahí salen los separadores «Línea N», los huecos de la vista previa y el texto del selector de posición — pero `FieldCard` calculaba su `gridColumn` por su cuenta con `nearestCol`. Con una `col` guardada que no estuviera alineada al ancho, los dos daban resultados distintos: un tercio en la columna 4 se dibujaba en la 3 mientras el modelo (y el renderer de SIEEJ, que sigue al modelo) lo colocaba en la 4. La tarjeta que se ve al acomodar no era la posición que se guardaba.

Ahora `FieldsList` pasa a cada tarjeta la posición ya resuelta y `FieldCard` no recalcula nada.

### Corregido: mover un campo lo deja donde se soltó

Arrastrar un campo (o moverlo con las flechas) reordenaba el array pero conservaba su `layout.col`, así que el campo volvía a su columna anterior: el arrastre parecía no tener efecto. `reflowCol` recalcula la posición del campo movido a la que le toca en el nuevo orden, conservando su ancho y su línea reservada.

### Contrato de acomodo compartido con el renderer de SIEEJ

El modelo de líneas del editor y el del renderer vivían en repos distintos sin nada que verificara que coincidieran, y divergían: en 6 de 10 acomodos con `alone` que el propio editor genera, el respondent veía el campo compartiendo la línea que el CMS mostraba reservada (detalle en el CHANGELOG de SIEEJ 1.51.0, que trae el arreglo de ese lado).

`__fixtures__/layoutContract.js` fija 15 acomodos con su resultado esperado y lo verifican los dos repos contra su propia implementación; el archivo es un duplicado idéntico de `sieej/frontend/test/fixtures/layoutContract.js`. Al tocar el acomodo en cualquiera de los dos, agrega el caso al fixture y cópialo al otro repo.

Requiere SIEEJ >= 1.51.0 para que lo que se acomoda aquí se vea igual al capturar.

## [1.94.2] - 2026-07-28

### Documentación: el contexto de SIEEJ vuelve a describir lo que hace el código

`docs/context.md` seguía anunciando 1.85.0 y `docs/sieej.md` describía una estructura de módulo anterior a la capa de compatibilidad. Lo corregido:

- **Prefijo del API.** `admin_prefix` es `/api/mariachi` desde 1.65.0 y `/api/administrador` solo sobrevive por el doble montaje, pero el contexto lo presentaba al revés. Se corrigen la tabla de variables, las rutas del backend y la sección del CMS, con una nota de lectura para las tablas que aún citan el prefijo viejo: son el mismo router.
- **Quién sirve el `dist/` de SIEEJ.** Ambos documentos decían que se monta en `mariachi-nginx` con un `location` de `mariachi.conf`. Lo sirve el **gateway-hub** directamente (`SIEEJ_DIST_PATH` + `location ^~ /sieej/`), sin upstream ni proxy de por medio; el snippet se reemplaza por el real.
- **Estructura del módulo.** Faltaban `compat.py`, `acervo_keys.py`, `cambio_classifier.py`, `periodos_service.py`, `catalogos_sistema.py`, los modelos `FormularioVersion`/`FormularioPeriodo`/`Notificacion`/`EnvioValorHistorial` y el router de periodos.
- **Endpoints y editor.** Se agregan `actualizar-archivo`, `pdf`, `reabrir`, presencia, catálogos y `expirar-envios-pendientes` a la tabla del contexto; la ruta `/sieej/catalogos` del CMS; y cómo se crea un formulario (semilla de un paso, `borrador`, publicar como acto aparte).
- **Cambios recientes.** Tres entradas nuevas — 1.86.0–1.89.0 (compatibilidad de definiciones legadas y `editableAfterSubmit` que sí alcanza a los envíos), 1.91.1–1.93.0 (claves legibles en Acervo y buckets protegidos) y 1.94.0–1.94.1 (acomodo manual de campos) — y una marca de «superado» en la entrada de 1.78.0, que seguía diciendo que la actualización post-envío solo cubría pasos `form`.

Sin cambios de código.

## [1.94.1] - 2026-07-27

### Corregido: la vista previa y el bloque de acomodo parpadeaban al mover un campo de línea

Cambiar el acomodo de un campo con el editor abierto hacía aparecer y desaparecer la vista previa en ciclo, y el cambio se perdía: los controles volvían al valor guardado.

Las tarjetas se agrupaban por línea dentro de un `Fragment` con la fila como `key`. Cuando el acomodo movía el campo a otra línea, su tarjeta cambiaba de `Fragment` padre y React desmontaba el subárbol —la `key` estable de la tarjeta no evita el remonte si cambia de padre—. Al desmontarse, la limpieza de `FieldForm` emitía «sin borrador», el campo volvía a su línea original y se montaba de nuevo reinicializando el formulario con los valores guardados, que emitían el borrador otra vez: de ahí el ciclo.

- Los separadores y las tarjetas son **hermanos directos del grid** (`flatMap` en vez de `Fragment` anidados), así que React las reordena por su `key` en lugar de destruirlas. El mismo remonte tiraba el estado del arrastre de ancho si la tarjeta cambiaba de fila a media operación.
- El **borrador de acomodo lleva el índice del campo** que lo emitió. No lo llevaba, y se asumía que era el del editor abierto: al saltar del editor de un campo al de otro, el acomodo del primero podía aplicarse un instante al segundo. Ahora también se limpia solo si es suyo.
- `fieldToFormValues` **normaliza la posición** contra el ancho: un campo guardado con una combinación imposible —columna 5 con ancho de media fila, que existía antes de que el validador lo prohibiera— dejaba el selector de posición sin ninguna opción marcada.

Con pruebas de render sobre `FieldsList`, verificadas contra la versión anterior: el caso de la posición revertida falla sin el arreglo.

---

## [1.94.0] - 2026-07-27

### Agregado: el acomodo de los campos del editor de formularios es manual y explícito

Configurar cómo se acomodaban los campos de un formulario SIEEJ no se entendía. La etiqueta decía «Ancho en columnas» pero las opciones eran *Grande / Mediano / Chico* —tamaños, no columnas—, y el dato interno va al revés: `colSpan: 3` es el campo más chico. El ancho y «¿Empezar en fila nueva?» eran dos controles separados que gobernaban lo mismo, la vista previa dibujaba un bloque rayado genérico («Otros campos») en lugar de los vecinos reales, y nada en el listado marcaba dónde terminaba una línea y empezaba la siguiente.

De fondo había un problema mayor: los campos se juntaban solos. El grid acomodaba cualquier par que cupiera en la misma línea, así que agregar o redimensionar un campo recorría a los demás sin que nadie lo hubiera pedido.

- **`layout.col`** guarda la columna donde empieza el campo (1–6) y generaliza a `newRow`, que era su caso particular (`col: 1`). Con posición explícita el acomodo deja de ser automático: un tercio puede vivir a la derecha dejando libre el hueco de la izquierda, y nada lo rellena por su cuenta. `newRow` se sigue escribiendo cuando `col` es 1, así que una definición nueva se renderiza bien en un frontend que todavía no conozca `col`.
- **`layout.alone`** reserva la línea entera para un campo aunque ocupe un tercio: ni el campo anterior sube a compartirla ni el siguiente se cuela en el hueco. Antes esto solo se conseguía configurando el campo vecino, y bastaba con agregar uno después para romperlo.
- El editor de campo pasa a **un solo bloque de acomodo**: ancho (*Fila completa / Media fila / Un tercio*), posición (*Izquierda / Centro / Derecha*, con las opciones que caben según el ancho) y el interruptor de línea reservada. Cada opción lleva un glifo que dibuja la línea y el bloque en su lugar real, y la ayuda describe la consecuencia («Caben 2 por línea…»), no la fracción.
- La **vista previa muestra los vecinos reales** —su nombre y su ancho proporcional— en vez del bloque rayado, con los huecos en su posición. Se recalcula mientras mueves ancho o posición, así que se ve al instante a quién ganas o pierdes como vecino.
- El listado agrupa las tarjetas bajo separadores **Línea 1 / Línea 2** que marcan el espacio libre de cada renglón, y se muestran también en móvil, que es justo donde el grid de 6 columnas no se ve. El acomodo del campo que estás editando se refleja en vivo en esos separadores, sin esperar a guardar.
- En escritorio el ancho se cambia **arrastrando el borde derecho de la tarjeta**, con las 6 columnas guía visibles y snap a tercio, mitad o completa; el selector de ancho queda solo en móvil, donde no hay arrastre.
- **Los formularios existentes no se tocan**: un campo sin `col` sigue fluyendo como siempre y solo se vuelve explícito cuando lo editas, tomando como valor inicial la columna donde ya estaba. Los campos nuevos, pegados y duplicados nacen en la columna 1.
- `_validate_layout` valida `col` (1–6, y que quepa el ancho declarado) y `alone` como booleano; `_normalizar_layout` acota una `col` que se saldría de la cuadrícula, descarta las no enteras y deriva `newRow` de `col: 1`.
- La geometría del grid sale a `fieldLayout.js` con pruebas propias, porque replica el auto-placement de CSS grid —incluido que un campo que no cabe salta de línea sin rellenar el hueco anterior—; el arrastre queda en `useColSpanResize.js`.

Requiere el frontend de SIEEJ **1.49.0** o posterior: sin él, un campo colocado a la derecha se renderiza pegado al hueco de la izquierda y la línea reservada se ve a todo lo ancho.

---

## [1.93.0] - 2026-07-27

### Agregado: la protección de un bucket se administra y se reconoce desde el CMS

`acervo.buckets.protegido` llegó en 1.90.0 sin forma de gestionarlo: quedaba fijo desde la migración.

- **`/acervo/buckets`** gana la columna **Protegido** (candado y tooltip en el encabezado) con switch por bucket, y el campo en el alta/edición. Activarla es directo; **desactivarla pide confirmación**, porque vuelve a habilitar borrar, mover, renombrar y subir sobre contenido cuyas rutas están referenciadas desde la base de datos. Solo admin, como el resto de la gestión de buckets.
- En el **explorador**, el bucket protegido se reconoce por un **candado en su pestaña** —visible también en las pestañas inactivas, para saber cuáles son de solo lectura sin entrar— y por una nota breve bajo las estadísticas. Sustituye al `Alert` que ocupaba media pantalla; el texto es el mismo en el tooltip y en la nota, desde una sola constante.
- El modal de alta/edición de buckets sale a `components/BucketFormModal.jsx` (la página excedía el límite de 300 líneas del proyecto).

---

## [1.92.0] - 2026-07-27

> Se salta `1.91.0`: ese número lo tomó el release de propuestas de tarjeta de MapaLab (commit `f950b01`), y el bump a `1.90.0` de la rama de SIEEJ lo pisó al integrarse, dejando `pyproject.toml` en `1.90.0` con un `1.91.0` ya publicado. Este release realinea hacia arriba; la entrada que colisionaba quedó renumerada como `1.91.1`.

### Corregido: las cabezas de Alembic quedaron bifurcadas y tumbaron el deploy

`c4d5e6f7a8b0` (bucket protegido) y `d4e5f6a7b8ca` (mapalab infobox propuestas) se escribieron en ramas paralelas, ambas colgando de `c3d4e5f6a7b9`. Al integrarse quedaron dos heads y `scripts/init_db.py` —que hace `alembic upgrade head`, en singular— aborta con *"Multiple head revisions are present"*: `mariachi-api` sale con código 1, arrastra a `mariachi-nginx` por el `depends_on` y el `make deploy` muere en el paso 4 del orden maestro.

- **`e4f5a6b7c8d9`**, merge vacío con `down_revision = ('c4d5e6f7a8b0', 'd4e5f6a7b8ca')`. Se prefirió al atajo de reapuntar el `down_revision` de una sobre la otra: eso solo es seguro si **ningún** entorno tiene una aplicada y la otra no — con producción parada en `d4e5f6a7b8ca`, Alembic daría por aplicada la de bucket protegido y jamás crearía `acervo.buckets.protegido`. El merge converge desde cualquier estado. Mismo patrón que `f9a0b1c2d3e4`, que ya usaba `down_revision` en tupla.

### Agregado: el peso y la fecha de las carpetas en el explorador del Acervo

Una carpeta se listaba con `size: 0` y `uploadedAt: null`, así que la rejilla y la tabla del selector de archivos no podían mostrar más que `—`. No era un olvido de la vista: con `recursive=False` S3 devuelve los directorios como *prefixes*, que no traen `size` ni `last_modified`. El botón de información sí los mostraba porque `GET /acervo/carpetas/{id}/info` lista el prefijo recursivamente y agrega — pero eso es una llamada por carpeta y a demanda.

- **`folder_aggregates()`** resuelve el nivel completo con **un solo listado recursivo del prefijo actual**, agrupando por el primer segmento: suma `size` y se queda con el `last_modified` mayor de cada grupo. Verificado contra el bucket `sieej`: 3 carpetas en la raíz → 2 llamadas a `list_objects` (la del nivel + la del agregado), no 4. Descarta marcadores `.keep` y prefijos ocultos, así que los totales coinciden al byte con los de `/carpetas/{id}/info`.
- **Tope de `FOLDER_AGGREGATE_MAX_OBJECTS` (10 000)**: `AcervoClient.list_objects()` acepta `limit` y corta la iteración, así que un prefijo enorme no penaliza la navegación — se pide `limit = tope + 1` y si se pasa, las carpetas vuelven a salir sin agregado en vez de colgar el listado.
- El agregado solo se calcula con `recursive=False` y si el nivel tiene directorios; un listado recursivo (el de búsqueda) no paga la llamada extra.
- Front: `BucketFileGrid` muestra `peso · fecha` bajo el nombre y `BucketFileList` deja de pintar `—` en la columna Tamaño para carpetas, más una columna Fecha (`responsive: ['md']`). Ambos pasan a usar `formatFileSize` del servicio en lugar del formateador local que solo sabía de KB/MB.

> La vista **Media** (`AcervoPage`) recibe el mismo dato pero sigue pintando `—` y `Carpeta` en sus directorios: el cambio se acotó a los componentes del explorador. Queda como pendiente barato.

### Cambiado: las estadísticas del Acervo dejan de encabezar la pantalla

Cuatro `Statistic` a todo lo ancho abrían la vista de Media —archivos, imágenes, documentos, peso— empujando hacia abajo el explorador, que es a lo que se entra. Y eran del bucket activo, no del Acervo: nunca contestaban "cuánto pesa esto en total".

- Un botón sin etiqueta junto a **Documentación** abre **`AcervoStatsModal`** con el panorama completo: totales de archivos, peso, carpetas y buckets, el desglose imágenes/documentos/otros, la última modificación y una tabla con las cifras de cada bucket.
- Las cifras del bucket activo bajan a una línea de texto secundario bajo la barra de pestañas (`N archivos · N imágenes · N documentos · N carpetas · peso`), que cambia al cambiar de bucket.
- **`GET /acervo/resumen`** (`bucket_id` opcional) agrega en el servidor por bucket accesible y devuelve totales. La vista lo usa también para la línea del bucket: antes se traía el listado completo **serializado** con `/acervo?recursive=true` solo para contar.
- `buckets_accesibles()` sale a `acervo_file_service` y `GET /acervo-buckets` pasa a usarla, para no tener dos copias de la resolución de permisos por proyecto.

---

## [1.91.1] - 2026-07-27

> **Nota de numeración.** Esta entrada se publicó como `1.90.0`, número que ya ocupaba el release anterior de MapaLab: dos líneas de trabajo bumpearon en paralelo sobre `develop` el mismo día. Se renumera a `1.91.1` por su lugar real en la cronología (después de `1.91.0`, antes de `1.92.0`); el mensaje del commit conserva el número viejo.


### Cambiado: los archivos de SIEEJ en Acervo se guardan con una ruta legible, y el bucket deja de ser manipulable a mano

Las claves eran `{slug}/envio{id}/{uuid}.{ext}`: cinco UUIDs en una carpeta donde saber qué archivo es cada uno, a qué campo pertenece y cuál versión es la vigente exigía cruzar con `sieej.envio_archivo`. Si se perdía esa tabla, los objetos eran basura anónima. Y con los reemplazos post-envío el problema crecía.

- **Convención nueva** (`services/sieej/acervo_keys.py`): `{slug}/{usuario}-{envio_id}[/{periodo}]/{step}.{campo}/{ts}-{nombre}-{sufijo}.{ext}`. Un directorio por campo con las versiones ordenadas cronológicamente, nombre original sanitizado en la clave y sufijo de 6 hex contra colisiones. El índice de repeater se aplana (`bases_datos[0].diccionario` → `bases_datos-0.diccionario`) y el periodo solo aparece si el formulario es periódico.
- **Contrato único del valor en `datos`**: `{field_path, url_publica, object_key, filename_original, mime, size_bytes}`. Antes convivían dos formas —la del backend (`filename`) y la que el `Dragger` guardaba al pisar el valor con la respuesta del upload— y los lectores caían a la URL cruda, así que **el export y el PDF mostraban un enlace largo en vez del nombre del archivo**. `nombre_archivo()` lee ambas para lo ya guardado.
- **El cliente ya no escribe valores de archivo**: `_preservar_archivos_del_servidor` conserva lo que puso el upload e ignora lo que mande el navegador para campos `file` (un valor vacío sí se respeta: así se quita un archivo). Cierra el origen de las dos formas y evita apuntar un campo a una URL arbitraria.
- **Respaldo `envio.json`** junto a los archivos de cada envío (datos, definición con la que se llenó y catálogo de archivos), actualizado al enviar, al actualizar campos y al reemplazar un archivo. Es best-effort de punta a punta: un fallo de Acervo se registra y se sigue, nunca tumba el envío del respondent —hay un test que lo fija—.
- **`scripts/sieej_migrar_object_keys.py`** migra lo existente (copia, reescribe BD y `datos`, borra el objeto viejo) y genera los respaldos. No es migración de alembic a propósito: habla con Acervo por red y un fallo del bucket durante el bootstrap tumbaría el arranque del api.

### Agregado: buckets protegidos en Acervo

`acervo.buckets.protegido` (migración `c4d5e6f7a8b0`, marca `sieej`). El contenido de esos buckets lo gestiona una aplicación y sus claves están referenciadas desde la BD, así que borrarlas o moverlas desde el explorador deja registros apuntando a objetos inexistentes. `resolve_bucket_escribible` responde **409 incluso al admin** en los 11 endpoints de escritura de `/acervo` (subir, chunked, mover, mover-lote, editar, crear/borrar carpeta, borrar archivo), y el explorador oculta esas acciones, rechaza el drag & drop y muestra un aviso de solo lectura.

Como segunda capa, `scripts/acervo_proteger_bucket.py` habilita **versionado** con retención (5 versiones no vigentes, 90 días por defecto): un borrado deja un *delete marker* restaurable y una sobreescritura conserva la versión previa. El costo en espacio es marginal porque SIEEJ escribe una clave nueva por subida; las versiones solo aparecen al sobreescribir la misma clave o al borrar.

---

## [1.91.0] - 2026-07-27

### Agregado: recepción y moderación de las propuestas de tarjeta del catálogo de MapaLab

Cierra el circuito que abrió 1.90.0. La 1.90.0 dejó el validador y la tabla; ésta trae los endpoints y la pantalla.

**Recepción** — `POST /api/public/mapalab/catalogo/infobox-propuestas`. Honeypot `website` (responde 202 como si nada, y registra el intento), `rate_limit_ip` de 3 por hora, tope de 10 propuestas pendientes por capa e `ip_hash` con el mismo salt de la telemetría. Antes de guardar, la capa se verifica contra `mapalab.catalogo_capas` y cada `field` contra las columnas reales resueltas con `DescribeFeatureType`.

**Moderación** — `GET/POST /api/mariachi/mapalab/infobox-propuestas` (rol `tetlamamakani`, con CSRF en las escrituras) y la pantalla «Propuestas de tarjeta» en el grupo MapaLab. Cada propuesta muestra un **diff estructurado** contra la configuración vigente —qué agrega, qué quita y qué renombra— en lugar de un volcado de JSON. Al aprobar se revalida la configuración antes de aplicarla, se escribe en `mapalab.catalogo_capas.infobox_config` y se invalida el cache del catálogo reusando `notify_catalogo_changed`. Al rechazar se exige un motivo, que queda guardado.

La revalidación en la aprobación es deliberada: si el validador se endurece después de que una propuesta entró a la bandeja, no se puede aprobar algo que hoy ya no pasaría.

### Agregado: los eventos del editor de tarjetas en el collector

`catalogo_infobox_editor_open` y `catalogo_infobox_propuesta` entran a `ALLOWED_EVENT_NAMES` junto con la versión de MapaLab que los emite. Un nombre desconocido tumba el lote completo con 422, así que van en el mismo release.

---

## [1.90.0] - 2026-07-27

### Agregado: base para las propuestas ciudadanas de tarjeta del catálogo de MapaLab

Quien usa el catálogo de MapaLab podrá proponer qué campos aparecen en la tarjeta de información de una capa y en qué orden. La propuesta no se publica sola: llega a una bandeja de moderación y sólo al aprobarla cambia lo que ve el público. Esta versión trae las dos piezas de fondo.

**El validador** (`app/schemas/mapalab_infobox.py`). El endpoint recibirá JSON de gente anónima, así que la configuración se valida con allowlist estricta y se **reconstruye campo por campo**: nunca se persiste el `dict` que llegó. Cubre esquemas de `href` (sólo `http`, `https`, `mailto`, `tel` y rutas absolutas de una sola barra — se rechazan `javascript:`, `data:` y protocol-relative), topes de tamaño (8 KB por configuración, 12 filas por bloque, 3 bloques de texto, 80 caracteres por etiqueta) y `extra='forbid'` en todos los modelos. `validate_fields_exist` compara cada `field` contra las columnas reales de la capa, lo que además evita aprobar tarjetas que apuntan a campos inexistentes.

El editor ciudadano trabaja con un subconjunto seguro del formato: `headerField`, `list`, `cards`, `text` y `blockOrder`. Quedan fuera `iconText.action` (dispara acciones internas del visor), `headerTransform`, `labelGroups` y `cardsColumns`. El editor de capas del admin conserva el formato completo.

**La tabla** `mapalab_infobox_propuestas` (migración `d4e5f6a7b8ca`): estado `pendiente`/`aprobada`/`rechazada` con constraint, revisor, motivo de rechazo, e `ip_hash` para detectar abuso sin guardar la IP. La columna `email` queda reservada y sin uso: el flujo es anónimo y no se le pide correo a quien propone.

### Agregado: tópico MapaLab en la página de documentación

Nueva pestaña en Documentación con la guía del flujo de propuestas: los seis pasos de punta a punta, qué puede incluir una propuesta y qué no (con el motivo de cada exclusión), las seis capas de protección del JSON y una lista de qué revisar antes de aprobar.

---

## [1.89.5] - 2026-07-27

### Documentación: renovar la sesión es responsabilidad de cada frontend, y el encabezado de página es uno solo

`COOKIES_CSRF.md` documentaba el refresh como si el panel fuera su único consumidor. SIEEJ usa las mismas cookies contra el mismo backend y no llamaba a `/refrescar`, así que moría a los 30 min con el refresh de 8 h intacto — el documento no daba forma de anticiparlo.

- Nueva sección **«Renovación desde otros frontends del ecosistema»**: qué debe implementar todo consumidor de `/api/mariachi` (reintento único tras `401`, lo mismo en el arranque, y que ninguna petición se salga del cliente con interceptor), más la coordinación entre pestañas con `navigator.locks` y por qué hace falta —la detección de reúso revoca la familia entera— con la ventana de gracia en `rotate()` anotada como la alternativa no aplicada.
- FAQ: cómo distinguir en el log del gateway si el front renovó o deslogueó (`refrescar 200` vs `iniciar-sesion` tras el `401`), y qué mirar en Redis si el `401` sale del refresh mismo.
- `CONVENTIONS_CMS.md`: `PageHeading` como encabezado obligatorio de pantalla —icono del menú sin estilos propios, descripción en su fila, `extra` a la derecha, `level` según jerarquía— y la regla de que **el padding de página lo pone el layout**, que es lo que se venía duplicando.

---

## [1.89.4] - 2026-07-27

### Cambiado: un solo encabezado de página para todo el panel, empezando por Telemetría

Telemetría tenía el título sin icono y con `padding: '20px 24px 0'` propio sobre el del layout, y sus tres pestañas presentaban el mismo dato de tres formas distintas: MapaLab con icono morado y título responsive, Colibrí con «Colibri» sin tilde, y SIEEJ con icono **azul de Ant Design** (`#1677ff`), nivel de título fijo y otro `padding: 24` encima. Cada pestaña además fijaba su propio ancho máximo (1280 / 1200 / ninguno).

`PageHeading` (`shared/components/PageHeading.jsx`) concentra el patrón que ya seguían Documentación y Observabilidad: icono a 24 px en `BRAND.purple`, título con `level` a discreción de la página, descripción debajo en su propia fila y un `extra` opcional alineado a la derecha (el selector de periodo de MapaLab, el `Segmented` de Colibrí, el botón de alta en Usuarios).

- **Telemetría** encabeza con `BarChartOutlined` —el icono de su entrada en el menú— en `level` 2, y las tres pestañas quedan en `level` 3 (4 en móvil), subordinadas.
- Ninguna de las pestañas vuelve a aplicar padding propio: el `Content` del layout ya lo pone y dentro de un `Tabs` se sumaba dos veces.
- `features/telemetria/components/SectionHeading.jsx` se retira; era la misma idea sin el `extra` y sólo la usaba SIEEJ. No confundir con `shared/components/SectionHeader`, que sigue siendo el encabezado de sección con enlace «Ver detalles» dentro de una tarjeta.
- Inicio y Usuarios pasan a usar `PageHeading` en lugar del markup suelto de 1.89.2.

---

## [1.89.3] - 2026-07-27

### Corregido: dos pestañas del ecosistema podían tumbarse la sesión entre ellas al renovarla

El refresh de `POST /autenticacion/refrescar` es rotativo con detección de reúso: el token viejo queda marcado como usado y, si vuelve a llegar, se revoca **toda la familia**. Mariachi y SIEEJ se sirven desde el mismo origen y comparten la cookie, así que dos pestañas cuyo `access_token` expira a la vez mandan el mismo refresh token: una rota bien y la otra dispara la revocación, dejando a las dos en la pantalla de contraseña.

`runExclusiveRefresh` (`shared/utils/sessionRefresh.js`) serializa la renovación con `navigator.locks` —el lock es por origen, así que alcanza a las pestañas de las dos apps— y deja una marca en `localStorage`: quien entra al lock y ve una renovación de hace menos de 10 s reutiliza la cookie nueva en lugar de rotar otra vez. Sin `navigator.locks` el comportamiento es el de antes.

El backend no cambia: sigue sin ventana de gracia en `rotate()`, la coordinación es del cliente.

---

## [1.89.2] - 2026-07-27

### Cambiado: encabezados de página homogéneos y sin padding duplicado en Inicio

`InicioPage` montaba su propio `Content` con `padding: 24` sobre el `Content` del layout, que ya aplica otros 24 (6 en móvil): el contenido arrancaba con **48 px** de aire arriba y a los lados. Se retira el padding de la página; el `maxWidth: 1200` centrado se queda.

- **Icono de Inicio**: era `DashboardOutlined`, el mismo de Observabilidad. Pasa a `HomeOutlined` en el menú lateral y acompaña al título de la página, como en Documentación y Observabilidad.
- **Usuarios**: el encabezado gana el icono `TeamOutlined` junto al título y la descripción que el resto de las pantallas ya tenía. La descripción va en su propia fila a ancho completo, así que el botón «Nuevo Usuario» sigue alineado con el título.
- **Tarjetas de plataformas** (las que alimenta el monitor Huachicol): el contador `x/y cont.` sube a la fila que ocupaban las acciones y los iconos de acción bajan junto al badge de estado.

---

## [1.89.1] - 2026-07-27

### Corregido: el collector de telemetría rechazaba los lotes con el evento nuevo del catálogo de MapaLab

`ALLOWED_EVENT_NAMES` (`app/schemas/mapalab_event.py`) valida cada `event_name` contra una lista blanca, y `catalogo_infobox_action` —que MapaLab 1.94.0 emite al descargar tarjetas o centrar la selección desde la tarjeta de información— no estaba registrado. Como la validación es de Pydantic sobre la lista completa, **el lote entero se rechazaba con 422**: se perdían también los eventos válidos que viajaban en el mismo batch, no sólo el desconocido.

Al agregar un evento en MapaLab hay que registrarlo aquí en el mismo release, o la telemetría de esa sesión se cae por completo mientras tanto.

## [1.89.0] - 2026-07-27

### Corregido: marcar un campo como editable despues del envio ya sirve para los envios existentes

La lista de campos editables salia del `definicion_snapshot` del envio, y un envio ya `enviado` no recibe propagacion de cambios menores: su snapshot nunca ganaba la marca. Resultado practico — marcar «¿Editable después de enviar?» **no tenia efecto sobre ningun envio ya hecho**, que son justo los que se quieren corregir. Habia que reabrir el envio, que es lo que la actualizacion ligera venia a evitar.

`editable_field_defs(snapshot, vigente)` toma del snapshot el tipo, las opciones y el bucket (contra el se valida lo capturado) pero la **marca** de editable la lee de la definicion vigente: es politica del admin, no contrato de datos. Activarla alcanza a los envios existentes y retirarla los deja de cubrir de inmediato. Un campo que no exista en el snapshot no es editable aunque la vigente lo marque.

`GET /formularios/mis-envios/{id}` sirve el snapshot con esas marcas ya sincronizadas (`snapshot_con_editables_vigentes`), asi que el frontend ofrece exactamente lo que el backend autoriza sin duplicar la regla.

---

## [1.88.0] - 2026-07-27

### Corregido: cualquier campo marcado como editable tras el envio lo es de verdad (archivos y listas repetibles incluidos)

El CMS dejaba marcar «¿Editable después de enviar?» en cualquier campo, pero `editable_field_paths` solo reconocia campos de valor en pasos `form`: los `file` y los de repeaters quedaban fuera en silencio. El caso real que lo destapo: un formulario con tres campos de archivo marcados (`base_de_datos`, `diccionario_de_datos`, `catalogo`) donde nunca aparecia la opcion de actualizar. Peor, para archivos **no habia ninguna via**: el endpoint de upload responde 409 en un envio ya `enviado`, asi que el toggle prometia algo que ningun endpoint cumplia.

- **Repeaters**: `editable_field_defs` guarda el path base y `resolver_editable` valida la forma del path concreto — un campo de repeater exige indice (`bases_datos[0].diccionario`) y uno de un paso `form` no lo admite. El item debe existir: se corrigen respuestas, no se dan de alta items. `_get_valor_en_datos`/`_set_valor_en_datos` ya navegan indices.
- **Archivos**: nuevo `POST /formularios/mis-envios/{envio_id}/actualizar-archivo` (multipart `field_path` + `file`). Sube a Acervo con las mismas validaciones del alta (`accept`, `maxSizeMB`, bucket), reescribe `datos` y deja **la misma huella de auditoria**: fila en `envio_valor_historial` con el nombre del archivo anterior → el nuevo, y evento `actualizado`. El archivo previo no se borra; su fila en `envio_archivo` conserva `object_key`/`url_publica`.
- Mandar un campo `file` al PUT de `actualizar-campos` responde 422 indicando el endpoint correcto: el valor de un archivo lo escribe la subida, no el cliente.
- `tiene_campos_editables` del listado hereda el criterio nuevo, asi que el boton aparece tambien en formularios cuyos unicos campos marcados son archivos o de repeater.

---

## [1.87.0] - 2026-07-27

### Agregado: el listado del respondent dice si un envio tiene campos actualizables

`GET /formularios` gana `tiene_campos_editables` en cada item: es `true` solo cuando el envio ya esta **enviado** y su `definicion_snapshot` tiene campos `editableAfterSubmit` (se calcula con `EnviosService.editable_field_paths`, la misma fuente que autoriza el `PUT .../actualizar-campos`). Sin este flag el frontend no podia saberlo desde la lista: el listado no manda la definicion, asi que el acceso directo a la pantalla de actualizacion solo existia en el detalle del envio.

---

## [1.86.0] - 2026-07-27

### Cambiado: menu «⋯ Mas opciones» en las tarjetas de campo angostas del editor SIEEJ

En los anchos **Chico** y **Mediano** (`colSpan` 3 y 2) la columna del asa apilaba cuatro botones (copiar, duplicar, editar, eliminar) en una tarjeta que apenas da para el label y los tags. Ahora Copiar, Duplicar y Eliminar se colapsan en un menu `⋯` y solo queda visible Editar (y Guardar mientras se edita). En ancho **Grande** y en mobile no cambia nada. Dentro del menu, Eliminar confirma con `Modal.confirm` en vez del `Popconfirm` — un popover anidado en un dropdown se cierra junto con el menu.

### Agregado: capa de compatibilidad para definiciones SIEEJ legadas — el deploy deja de romper formularios existentes

Cada endurecimiento del contrato de la definicion (absorber `email`/`tel` en `text`, exigir `tab` en repeaters con pestañas, retirar los `info` espaciadores) dejaba fuera de contrato a los formularios que ya estaban en produccion. El sintoma tras un deploy: el formulario no renderea el campo, el envio en curso muere con `tipo desconocido` (422) y el admin no puede ni abrirlo y volverlo a guardar. Cada caso se venia parchando con una migracion de datos hecha a mano.

- **`services/sieej/compat.py::normalizar_definicion`** traduce cualquier definicion historica al contrato vigente. Idempotente y **solo relaja**: `tel`/`email` → `text` + patron (respetando el propio si ya lo traia), tipo desconocido → `text`, `select` sin `options` ni `catalog` → `text`, campo de repeater sin `tab` valido → primera pestaña, `info` sin label → se elimina, `file` sin `bucket` → `sieej`, `maxSizeMB` sobre el cap → 100, `colSpan` fuera de rango → acotado, `pattern` que no compila y `showWhen` huerfano o cruzado entre steps → se descartan.
- **Se aplica en lectura y en escritura**, no solo en la migracion: los response models (`FormularioResponse`, `FormularioDetalle`, `EnvioDetalleResponse`, `MisEnviosDetalle`) y `GET /formularios/:slug/schema` normalizan al serializar; `crear`/`actualizar` normalizan antes de validar y `validar_datos` normaliza el snapshot del envio. Un deploy ya no depende de que la migracion de datos haya corrido.
- **Sin bumps espurios de version**: el clasificador de cambios compara la definicion normalizada contra la normalizada, asi que la diferencia por normalizar no cuenta como cambio y no sube `formulario.version` ni reabre envios ya enviados.
- **Migracion `c3d4e5f6a7b9`** materializa la normalizacion en `sieej.formulario`, `envio_formulario.definicion_snapshot` y `formulario_version`. Sustituye el patron de una migracion de datos por endurecimiento: las reglas viven en `compat.py`.
- **`scripts/sieej_check_definiciones.py`** (`make sieej-check`, `make sieej-check-fix`) recorre las tres tablas y sale con codigo 1 si alguna definicion no valida; con `--fix` repara — util para una BD restaurada de un backup viejo.
- **Red en CI**: `tests/fixtures/sieej/legacy/` guarda definiciones reales de produccion y `test_sieej_compat.py` verifica que cada una pasa el contrato vigente ya normalizada. Un endurecimiento futuro que rompa formularios existentes falla en CI, no en produccion.

---

## [1.85.0] - 2026-07-24

### Agregado: edición concurrente de formularios SIEEJ — 409 al pisar + presencia con avatares

Dos personas editando el mismo formulario podían pisarse en silencio: el último guardado ganaba. Y el costo no era solo perder texto — como el guardado de la definición corre el clasificador de cambios, escribir encima con una definición vieja puede clasificarse como cambio que **rompe**, subir la versión y **reabrir envíos ya enviados** de las dependencias.

- **Bloqueo optimista (la garantía).** `FormularioUpdate` acepta `actualizado_en_esperado`; si otra persona guardó después, el `PUT` responde **409** diciendo quién y cuándo, en vez de sobreescribir. Tolerancia de un segundo para no dar falsos positivos con clientes que truncan el ISO a milisegundos. Sin el campo, el `PUT` se comporta como antes. Nueva columna `sieej.formulario.actualizado_por_id` (migración `b7c8d9e0f1a3`), expuesta como `actualizado_por`.
- **Presencia (el aviso).** Reutiliza `services/presence.py` (Redis, TTL 30 s) con scope `sieej_formulario`, extendido con `avatar_url` y `seccion`: `PUT|DELETE|GET /sieej/formularios/{id}/presencia` y `GET /sieej/formularios/presencia` (todos los formularios en un solo scan, para el listado).
- **En el admin**: `usePresenciaFormulario` late cada 20 s y pausa con `document.hidden`; `PresenciaEditores` pinta un `Avatar.Group` con tooltip `nombre · en Sección`. En el editor la etiqueta se pone naranja cuando alguien está en **tu misma** pestaña; en el listado cada tarjeta muestra quién la tiene abierta. En Definición el 409 abre un aviso con botón **Recargar**; en Configuración recarga y avisa. Al cerrar la pestaña la baja se manda en `pagehide` con `fetch keepalive` (sobrevive al cierre y sí manda CSRF, cosa que `sendBeacon` no).
- **Robustez**: `presence.list_others`/`list_by_resource`/`unregister` degradan a vacío/no-op si Redis no responde (mismo criterio best-effort que `core/cache.py`), para que la caída del cache no tumbe el editor con un 500 por un adorno. El 409 no depende de Redis.

La presencia es un aviso, no un candado: quien garantiza que no se pisen es el 409.

### Agregado: copiar, pegar y duplicar campos en el constructor de formularios SIEEJ

Cada campo del editor visual gana **Copiar** y **Duplicar aquí**, y el pie de la lista un botón **Pegar** que aparece solo cuando hay algo copiado (con un resumen de qué se va a pegar). Sirve para no recapturar a mano un campo cuya expresión regular, catálogo, opciones o configuración de archivo ya costó trabajo afinar, sea en otro paso o en otro formulario.

El portapapeles vive en `localStorage` (`mariachi.sieej.fieldClipboard`), no en el del sistema: así cruza formularios y pestañas del navegador sin pedir permisos ni depender de APIs que Firefox no expone. Se escribe además al portapapeles del sistema como JSON legible, best-effort. Sin backend.

`fieldClipboard.js::prepareFieldForPaste` normaliza al pegar, que es lo que evita dejar la definición inválida: `name` duplicado se sufija (`_2`, `_3`…), el `tab` se fuerza a la pestaña activa, un `showWhen` cuyo campo disparador no viajó se elimina (si no, el campo pegado nunca se mostraría), un `catalog` inexistente se avisa y un `bucket` sin acceso cae a `sieej`. Cada ajuste se reporta al admin con un aviso concreto.

### Cambiado: en un repeater con pestañas, cada campo pertenece a exactamente una

Los campos sin `tab` se renderizaban **repetidos en todas las pestañas** del elemento, mezclados en el mismo grid con los de la pestaña activa. En el CMS aparecían agrupados bajo una pestaña «Comunes» que no existe como tal en el respondent, así que ninguna pantalla del editor mostraba el orden real que se iba a ver al capturar. De ahí venían los reportes de campos duplicados y de orden que "se desordena solo".

- **«Comunes» desaparece.** Todo campo pertenece a una pestaña; el selector de pestaña del campo deja de ofrecer «todas» y el del formulario es obligatorio. Al abrir un paso con campos sin pestaña, el editor los asigna a la primera y lo avisa.
- **Un repeater sin pestañas** muestra la lista plana con un botón «Dividir en pestañas»; al crear la primera, los campos existentes quedan en ella.
- **Eliminar una pestaña** ya no propone "moverlos a Comunes" (que los repartía por todas): ahora se elige a qué pestaña van, o se borran con ella.
- **Backend**: `definicion_validator` exige `tab` en los campos de un repeater con `tabs` y lo dice con un mensaje explícito. Migración `a6b7c8d9e0f1` (rama mariachi): asigna la primera pestaña a los campos que no la traían, en `sieej.formulario.definicion`, `sieej.envio_formulario.definicion_snapshot` y `sieej.formulario_version.definicion`. El downgrade no restituye (no hay forma de saber cuáles estaban sin `tab`) pero no pierde datos.
- **Compatibilidad**: el renderer de SIEEJ (>= 1.39.0) manda a la primera pestaña cualquier campo sin `tab` válido, así que los snapshots históricos —que no se migran a la fuerza— siguen mostrándose completos. Antes un `tab` inexistente hacía que el campo no apareciera en ninguna pestaña.
- `tab` no es un campo significativo del clasificador de cambios, así que la normalización no sube versión ni reabre envíos.

### Agregado: apertura periódica de formularios y avisos de apertura/faltantes

Un formulario puede abrir una **ventana de captura recurrente** (`mensual` / `trimestral` / `semestral` / `anual`, con día de apertura y duración en días, más un `ancla` opcional) en lugar de una vigencia única; cada ventana genera un **envío nuevo por usuario**. Migración `f9a0b1c2d3e4`: agrega `sieej.formulario.periodicidad`, las tablas `sieej.formulario_periodo` y `sieej.notificacion`, y `envio_formulario.periodo_id`; reemplaza el `UNIQUE (formulario, usuario)` por dos índices únicos parciales (con y sin periodo), así que los formularios no periódicos conservan su invariante y los envíos existentes no requieren migración de datos.

`PeriodosService.tick()` (idempotente) materializa las ventanas, abre, cierra, expira los envíos en proceso y avisa; corre en el sidecar `cron-sieej` (`scripts/sieej_periodos_tick.py`) o a mano con `POST /sieej/periodos/tick`. El estado «abierto» se computa de la configuración, no de un estado guardado, así que el gating es correcto aunque el cron no haya corrido. Los avisos (apertura al creador; faltantes al creador y administradores) salen best-effort por el webhook de Discord de SIEEJ y quedan en `sieej.notificacion`, con bitácora exportable a CSV/XLSX desde la nueva pestaña «Periodos» del CMS. No se agregó correo: el stack no tiene SMTP. Endpoints nuevos: `GET /sieej/formularios/{id}/periodos`, `/notificaciones[/exportar]` y `POST /sieej/periodos/tick`. Requiere el frontend SIEEJ >= 1.35.0.

## [1.84.0] - 2026-07-24

### Cambiado: ordenamiento del grid de formularios (fin de `grid-flow-row-dense` + `layout.newRow`) y cierre del hack de espaciadores

El grid de campos (6 columnas) dejaba de respetar el orden de la definicion: usaba `grid-flow-row-dense`, que reacomodaba campos hacia atras para rellenar huecos, desalineando el orden visual del de captura y del tab. Se retiro; ahora los campos se colocan en orden estricto.

**`layout.newRow`** (booleano, opcional): fuerza que un campo abra una fila nueva. Es la forma soportada de dejar espacio libre al final de una fila, en vez de campos `info` con label vacio como espaciadores. Se configura con el switch "¿Empezar en fila nueva?" del constructor visual.

**Editor WYSIWYG:** la lista de campos del CMS ahora se pinta como el grid real de 6 columnas (antes era una lista vertical con tags de ancho), asi el admin ve lo que vera quien responde.

**Cierre del hack:** `definicion_validator` ahora exige `label` no vacio tambien para los campos `info` (el early-return se lo saltaba), asi que ya no se pueden crear espaciadores vacios ni por el editor JSON crudo. La migracion `b8c9d0e1f2a4` quita los espaciadores existentes (`info` con label vacio) de `definicion`, `definicion_snapshot` y `formulario_version`.

Requiere el frontend SIEEJ >= 1.38.0.

---

## [1.82.0] - 2026-07-24

### Agregado: Sextante, la sección de GeoServer del panel

Todo lo que toca GeoServer vivía repartido dentro de MapaLab (Recursos GeoServer, Símbolos) o escondido en modales del editor de capas (registrar un workspace, ver qué campos expone una capa). Ahora es una sección propia del sider, **Sextante**, con cinco subpáginas. El sider además sube **Acervo** por encima de Huachicol, que es de consulta esporádica.

- **Workspaces** (`/sextante/workspaces`, admin): tabla de los registrados en `mapalab.workspaces` con alias, workspace de GeoServer, schema de DataEngine y número de capas (desplegables por fila), más el alta de los que existen en GeoServer y no están registrados. Ese flujo estaba solo como un Alert dentro de `LayerCreateModal`, que sigue funcionando: `PendingWorkspacesAlert` y `RegisterWorkspaceModal` se movieron a la feature `sextante` y los dos lugares comparten el mismo modal.
- **Explorador de capas** (`/sextante/capas`): workspace → capa → campos con tipo y valores de muestra, más los estilos asignados y si es un layer group. Sirve para armar filtros CQL, InfoBox y simbología sin adivinar nombres de columnas; antes esa introspección solo se veía dentro de los modales que la consumían.
- **Estilos** (`/sextante/estilos`): catálogo de SLDs por workspace, opcionalmente con los del catálogo global. El detalle muestra el tipo detectado por el parser (coroplético/límite/punto), si es editable desde Mariachi, **qué capas comparten el estilo**, la leyenda en vivo y el XML copiable. La edición visual sigue en la pestaña Simbología de cada capa, con su flujo de revisión.
- **Recursos** (`/sextante/recursos`) y **Símbolos** (`/sextante/simbolos`) son las páginas que ya existían, movidas de MapaLab. Las rutas viejas (`/mapalab/recursos-geoserver`, `/mapalab/simbolos`) redirigen.
- **Acceso**: Sextante se declara con `accessSlug: 'mapalab'`, así que lo ve quien ya tenía acceso a MapaLab — es lo que exige el backend, cuyo router `/geoserver/*` depende de `require_project_access('mapalab')`. Workspaces y Símbolos siguen siendo admin-only.
- **Backend**: `GeoServerClient.list_workspace_styles(workspace)` y `GET /geoserver/workspaces/{alias}/styles?include_global=` (lectura, rate limit `geoserver_read`). El resto de las páginas se arma con endpoints que ya existían.

### Agregado: el ícono de una categoría de símbolos puede ser una imagen o un SVG

El campo «ícono» de cada categoría era un input de 8 caracteres, o sea únicamente emoji tecleado a mano. Ahora se puede elegir cualquier símbolo del catálogo: si es emoji se guarda el carácter, y si es imagen o SVG se guarda su URL del Acervo. La columna `icon` ya era `TEXT`, así que no hay migración.

- `CategoryIconField` alterna entre «Emoji o texto» y «Del catálogo», con vista previa y botón para quitar. `CategoryIcon` centraliza el render (emoji como texto, URL como `<img>`) y lo usan la lista de categorías, el encabezado del panel y las pestañas del `SymbolPicker`.
- `SymbolPicker` se movió de `mapalab-layers/components/sldEditor/` a `mapalab-symbols/components/`, que es donde corresponde por dominio, y acepta una prop `hint` para que cada consumidor ponga su propia nota al pie. Sus tres usos (editor SLD de puntos, snapshot de eventos, ícono de categoría) apuntan ya ahí.
- **Contrato**: las respuestas de categoría (admin y el catálogo público `GET /api/mapalab/symbols/catalog`) ganan `iconUrl`, derivado de `icon` — es la URL si el valor apunta a un archivo, `null` si es emoji. Así el visor no tiene que adivinar. Lo consume mapalab 1.88.0; sin él, una categoría con ícono de imagen mostraría la URL como texto.


## [1.80.0] - 2026-07-24

### Agregado: instituciones del catálogo de Mapalab

Las capas del catálogo (`mapalab.catalogo_capas`) ahora se agrupan por la dependencia que las produce, para que el visor pueda filtrarlas por institución y darle a cada una una URL propia y compartible.

- **La subpágina Catálogo pasa a pestañas**: «Capas» e «Instituciones», cada una con su conteo, en lugar de acumular todos los paneles en una sola vista. El estado y las llamadas al API viven ahora en `useCatalogoData`, y la vista de capas se extrajo a `CapasTab`.
- **Pestaña Instituciones**: alta con **slug autocompletado** conforme se escribe el nombre (deja de autocompletarse en cuanto se edita a mano), edición inline de nombre y slug, borrado con confirmación —las capas quedan sin institución, no se borran— y reorden por drag & drop que define el orden de las pills en el visor. Muestra cuántas capas tiene cada una.
- **Tabla de capas más angosta**: se quedan Nombre (con el workspace debajo, en chico), Institución, Etiquetas —con filtro por lista buscable— y Acciones. Además `scroll={{ x: 'max-content' }}` para que la tabla deje de salirse del viewport.
- **La edición pasa a la fila expandible** (`CapaDetalleEditor`): al desplegar una capa se edita ahí mismo nombre, slug, workspace, capa de GeoServer, institución, etiquetas y habilitada, con Guardar/Descartar que solo se activan si hay cambios, más los datos de solo lectura (URL pública, última edición, orden). Desaparece el panel de edición por doble clic; `CapaFormPanel` queda dedicado al alta y limpia el formulario al guardar.
- **Buscador general** sobre la botonera: filtra por nombre, slug, capa de GeoServer, workspace, institución y etiquetas (sin acentos ni mayúsculas), con un `Segmented` de Todas / Habilitadas / Deshabilitadas al lado y el conteo `N de Total`.
- **Acciones en lote** (`SelectionActionsBar`): asignar institución, habilitar/deshabilitar y **etiquetar** —sumando o reemplazando— además de eliminar. Todas van por un solo endpoint `POST /catalogo/bulk-update` con `exclude_unset`, así que no toca los campos que no se envían.
- El submenú del sider pasa de «Catálogo» a **«Capas catálogo»**.
- **Endpoints**: `GET/POST /catalogo/instituciones`, `PUT /catalogo/instituciones/reorder`, `PUT|DELETE /catalogo/instituciones/{id}` y `POST /catalogo/bulk-update`, con las mismas dependencias de RBAC, CSRF y rate limit que el resto del catálogo.
- **Slugs con namespace compartido**: el visor resuelve `/catalogo/<slug>` contra capas **e** instituciones, así que `_slug_taken` ahora consulta las dos tablas al crear o editar cualquiera de las dos, incluida la generación automática de slugs del alta masiva. Un slug repetido se rechaza con mensaje explícito.

### Corregido: los cambios del catálogo tardaban hasta 5 minutos en verse en el visor

El backend público de mapalab cachea el catálogo 5 minutos en memoria y nadie invalidaba esa cache, así que una capa o institución recién dada de alta no aparecía en `/catalogo` hasta que expiraba el TTL. Cada escritura del catálogo (alta, edición, borrado, reordenamiento, acciones en lote) ahora llama a `POST /catalogo/invalidate-cache` de mapalab con `X-Internal-Token`, en un hilo aparte para no retrasar la respuesta del admin. `mapalab_notifier` se refactorizó para compartir la lógica de reintentos con la notificación del árbol de capas.

### Tests

`tests/test_capas_catalogo_service.py`: 16 casos a nivel de servicio (SQLite en memoria con el schema `mapalab` adjunto, GeoServer monkeypatcheado) que cubren la validación de slug cruzada capa↔institución, reorden, asignación/habilitación/etiquetado en lote (`bulk_update_capas`, modos add/replace), y la desasignación de capas al borrar una institución.

### Corregido: la telemetría del catálogo devolvía 422

`ALLOWED_EVENT_NAMES` no incluía `catalogo_share` ni `catalogo_institucion_select`, y como la validación es por lote, un solo evento no permitido tiraba **todo** el batch con 422. Se agregaron ambos; auditados los 50 eventos que emite el visor contra la lista blanca, no falta ninguno más.

Requiere la migración `0028_catalogo_instituciones` de dataengine y se acompaña de mapalab 1.86.0.

## [1.79.0] - 2026-07-24

### Cambiado: absorción de los tipos `email` y `tel` en `text` + catálogo de regex

Los tipos de campo `email` y `tel` se eliminaron: eran texto con un patrón fijo. El constructor visual del CMS reemplaza el par «select de preset + input de regex» por un **input único** (`AutoComplete`) donde el admin elige un formato común (correo, teléfono de 10 dígitos, CURP, RFC, código postal, CLABE, solo números, solo letras, URL) **o** escribe su propio regex. El patrón se guarda en `validation.pattern` / `validation.patternMessage`, igual que cualquier campo de texto; el renderer de SIEEJ y la validación backend ya no tienen ramas específicas de email/tel.

Migración `a5b6c7d8e9f1` (rama mariachi): reescribe los campos `email`/`tel` existentes a `type: text` + `validation.pattern` en las tres columnas JSONB (`sieej.formulario.definicion`, `sieej.envio_formulario.definicion_snapshot`, `sieej.formulario_version.definicion`). Preserva patrones custom, es idempotente y reversible (`downgrade`).

Requiere el frontend SIEEJ >= 1.34.0.

---

## [1.78.0] - 2026-07-24

### Agregado: actualizacion ligera de campos post-envio con historial de auditoria

Un field puede marcarse `editableAfterSubmit` en la definicion (toggle "¿Editable despues de enviar?" en el constructor visual del CMS). Los envios ya `enviado` permiten corregir **solo** esos campos sin reabrirse: `PUT /formularios/mis-envios/{envio_id}/actualizar-campos` hace un merge **parcial** de `datos` y el envio **no cambia de estado**. Evita el circuito de reapertura (solicitud del respondent + accion del admin) para correcciones puntuales.

Los paths permitidos se derivan del `definicion_snapshot` del envio, no de la definicion vigente; cualquier campo no marcado se rechaza con 422 (el backend no confia en el frontend). Aplica solo a campos de pasos `form`: repeaters y `file` quedan fuera en esta version.

**Historial de auditoria (lo que antes se perdia).** Hasta ahora el `PUT` del envio reasignaba `datos` completo y el valor anterior se perdia: solo existia versionado de *definiciones*, no de *valores*. Se agrega la tabla append-only `sieej.envio_valor_historial` (migracion `f2b3c4d5e6a7`, rama mariachi) con `field_path`, `field_label`, `valor_anterior`, `valor_nuevo`, `formulario_version`, `actor_usuario_id` y `cambiado_en`. Cada cambio real inserta una fila (los no-op no); ademas se registra un evento nuevo `actualizado` en `sieej.envio_evento` con un resumen en `payload`.

#### Agregado

- `PUT /formularios/mis-envios/{envio_id}/actualizar-campos` (CSRF) y `GET /formularios/mis-envios/{envio_id}/historial` (respondent, sin actor).
- `GET /sieej/formularios/{id}/envios/{envio_id}/historial` (admin, con actor).
- El export de envios (`?formato=xlsx|csv`) incluye la tabla **"Historial de cambios"**: hoja propia en Excel, CSV adicional dentro del ZIP.
- `EnviosService.actualizar_campos` / `editable_field_paths` y `FormulariosAdminService.listar_historial_envio` / `historial_de_formulario`.
- `editableAfterSubmit` se suma a los campos significativos del clasificador de cambios: togglearlo cuenta como cambio **menor** (no invalida datos ni reabre envios).

Requiere el frontend SIEEJ >= 1.33.0, que expone la pantalla `/mis-envios/:id/actualizar`.

---

## [1.77.0] - 2026-07-24

### Corregido + Agregado: auditoría de comportamiento de Colibri + reorganización de su documentación

**Tipos de reporte dinámicos, ahora sí end-to-end.** La columna `reportes.tipo` era un `Enum` Postgres fijo de 6 valores y el endpoint público nunca asignaba `tipo_id`: los tipos creados desde el panel daban 422 al enviarse y el fan-out por tipo (Discord/Slack) nunca disparaba. Ahora `tipo` es `varchar`, el tipo se valida contra el catálogo `reporte_tipos` activo y se asigna `tipo_id`. Migración `e2b3c4d5f6a7` (rama mariachi): enum→varchar + drop del tipo `reporte_tipo` + backfill de `tipo_id`. Reversible.

**CORS dinámico para embeds cross-origin.** Nuevo middleware `ColibriPublicCORSMiddleware` que valida el `Origin` contra `source_apps.dominios_permitidos` (con wildcards) y emite los headers CORS —incluido el preflight `OPTIONS`— en `/api/public/reportes`. Antes solo se permitían los orígenes fijos del env, así que un huésped registrado en otro dominio se topaba con el browser bloqueando la respuesta.

**Widget y SDK.** El widget deriva el endpoint del origen desde el que se cargó el `<script>` (antes una ruta relativa rompía el embed cross-origin), implementa el campo `radio` (un `radio` requerido ya no bloquea el envío con 422) y lee el `form_schema` en camelCase o snake_case. El SDK lanza un error claro cuando se usa un `baseUrl` relativo en Node.

**Robustez del endpoint.** Un fallo al guardar el screenshot (S3 caído) ya no aborta todo el reporte; los toasts de error 422 del panel dejan de romperse (el `detail` array de FastAPI se normaliza a texto).

**Documentación consolidada.** Se eliminó la página `/colibri/integracion` (admin) y las docs públicas standalone `/colibri/docs/` (location de nginx + `COPY` del Dockerfile). La guía de integración vive ahora en un topic **Colibri** de la página de Documentación del admin (`/mariachi/documentacion?topic=colibri`), con pestañas Widget / Patrón React / SDK / SIEEJ. Las tabs de source-app en Reportes ahora son dinámicas (salen del catálogo, no de una lista fija).

## [1.74.0] - 2026-07-23

### Agregado: reordenamiento drag & drop de capas del catálogo y opciones de catálogos SIEEJ

Dos frentes conectados por un componente genérico compartido.

**Catálogo de capas:** cada capa gana una posición explícita (`orden` en `mapalab.catalogo_capas`) que controla el orden en que se muestran en el admin y en la vista pública `/catalogo`. El admin agrega un botón "Reordenar" que reemplaza la tabla de filtros por una tabla plana con drag & drop (`@dnd-kit`). Las capas nuevas y las de alta masiva reciben `orden = MAX(orden) + 1` (quedan al final). Endpoint `PUT /catalogo/reorder`.

**Catálogos SIEEJ:** las opciones de cada catálogo ahora soportan orden manual con drag & drop. Nueva columna `posicion` en `sieej.catalogo_opcion` (migración `e1a2b3c4d5f6`) + endpoint `PUT /sieej/catalogos/{clave}/reordenar`. Las opciones nuevas quedan al final; el orden se refleja en los selects de los formularios públicos.

**Componente compartido:** `SortableTableRow` y `DragHandleCell` extraídos a `admin/src/shared/components/SortableTableRow.jsx`. El `CapasSortableRow` de eventos ahora es un re-export a este componente genérico, que también consumen el catálogo de capas y los catálogos SIEEJ. Cualquier tabla futura que necesite drag & drop reutiliza este componente.

3 tests nuevos en `test_sieej_catalogos.py` cubriendo creación ordenada, reordenamiento y validación de IDs incompletos.

## [1.73.0] - 2026-07-23

### Agregado: sesión con refresh token rotativo (deja de expirar a media chamba)

La sesión del panel era un tope fijo de **30 min desde el login, sin renovación**: el JWT de acceso se emitía solo al iniciar sesión y nadie lo reemitía, así que a los 30 min exactos el backend respondía 401 y el interceptor mandaba a `/login` aunque estuvieras trabajando. Ahora hay dos cookies httponly: el **access token** sigue corto (30 min, se usa en cada request) y un **refresh token** opaco con **ventana deslizante de 8 h de inactividad**. Mientras uses el panel, el front renueva el acceso en silencio; solo te saca tras 8 h sin actividad.

- **`POST /autenticacion/refrescar`** (nuevo): lee la cookie de refresh, la **rota** (emite una nueva y revoca la anterior) y devuelve un access token nuevo + `csrf_token` fresco. Rate-limit por IP (30/60s).
- **Rotación + detección de reúso** (`app/core/refresh_token.py`): cada refresh se guarda hasheado en Redis con familia (`rt:tok`/`rt:fam`/`rt:user`) y TTL de 8 h que se refresca en cada uso. Reusar un token ya rotado revoca **toda la familia** (posible robo). Login emite el refresh; `cerrar-sesion` revoca su familia; `cambiar-contrasena` revoca todas las familias del usuario y emite una sesión nueva, para que un refresh robado no evada la invalidación por cambio de contraseña.
- **Front** (`admin/src/shared/services/api.js`): el interceptor intercepta el 401, llama a `/refrescar` (dedup con promesa única) y **reintenta la request original una vez**; si el refresh falla, conserva el flujo actual de redirección a `/login`.
- **Config**: `REFRESH_TOKEN_EXPIRE_MINUTES` (default 480 = 8 h) en `.env.development`/`.env.staging`; prod usa el default. El `max_age` de la cookie de refresh se **deriva** de esa variable para no desacoplar dos valores.
- **Limitación conocida**: el access token sigue siendo JWT stateless; `cerrar-sesion` revoca el refresh, pero el access vigente muere por su propio TTL (≤30 min) — no se agregó blacklist por `jti`.
- Sin migración (el estado vive en Redis): en prod basta rebuild del `api` + restart. 8 tests nuevos (`test_refresh.py`) con Redis simulado; suite completa en verde (579).

## [1.72.2] - 2026-07-23

### Corregido: los cambios del panel no llegaban al visor por timestamps 6 horas en el futuro

`app/core/time.py:utcnow()` devuelve un datetime **naive** que representa UTC. El engine de DataEngine se conectaba sin fijar timezone contra `dataengine-primary`, que corre en `America/Mexico_City`, así que Postgres interpretaba ese naive como hora local y lo guardaba **6 horas adelantado** en las columnas `timestamptz` de `mapalab.layers`.

Consecuencia: `layer_tree_cache.etag` se calcula como `md5(max(updated_at) | count)`, así que bastaba **una** capa editada desde el panel para congelar el etag hasta que pasara esa hora — el visor seguía recibiendo el árbol viejo. Detectado en `cuerpos_de_agua_50k`, con `updated_at` 5h18m en el futuro tras editarla desde el admin.

- **Fix**: `options: -c timezone=utc` en `connect_args` del engine de DataEngine (`app/core/database.py`). Verificado: el desfase pasa de 6 h a 0.02 s. Se corrigieron los `updated_at` ya adelantados.
- No es un reloj desincronizado: host y contenedores coinciden al segundo con NTP activo. `mariachi-postgres` corre en `UTC` y `dataengine-primary` en `America/Mexico_City`; solo el segundo engine estaba afectado.
- Se acotó el arreglo a la conexión en vez de tocar `utcnow()` (151 usos en 52 archivos, 26 modelos con `onupdate=utcnow`) o el timezone del servidor, que también consumen GeoServer y los jobs de dataengine.

## [1.72.1] - 2026-07-23

### Corregido: telemetría del catálogo de MapaLab rechazada con 422

`POST /api/public/mapalab/events/batch` devolvía 422 en cada envío desde `/mapalab/catalogo`. El visor emite 10 eventos `catalogo_*` (`open`, `back`, `search`, `layer_select`, `layer_close`, `feature_click`, `info_open`, `download`, `tools_toggle`, `slug_not_found`) que no estaban en `ALLOWED_EVENT_NAMES`, y el validador de `EventIn` rechaza el batch completo si un solo `event_name` no está en la lista. Drift entre repos: la telemetría del catálogo se agregó en el visor sin registrarla aquí. Allowlist pasa de 46 a 56 nombres; ya no queda ningún evento emitido por el visor sin permitir.

## [1.72.0] - 2026-07-23

### Corregido: respaldos alineados a la organización por schemas

Las reglas de respaldo describían la base cuando todo vivía en `public` con vistas materializadas. Hoy son 4 schemas (`public` 25 tablas, `huachicol` 13, `sieej` 11, `acervo` 3) y **cero matviews**: los rollups de mapalab-stats son tablas reales en `huachicol` (`rollup_*`, `mcp_rollup_*`), viajan en el dump con sus datos y no se recomputan al restaurar.

- **Restore ya no aborta a la mitad**: `pg_dump` emite `DROP SCHEMA IF EXISTS <x>;` **sin** `CASCADE` para los schemas no-`public`. Ese DROP falla si el destino tiene objetos que el dump no conoce (restaurar un dump viejo sobre una base con migraciones más nuevas) y, con `ON_ERROR_STOP=1`, deja la base destruida a medias — reproducido: 1 tabla superviviente de 27. `postgres-restore.sh` ahora dropea con `CASCADE` los schemas declarados en el dump antes de aplicarlo. No ocurría antes porque `pg_dump` nunca dropea `public`.
- **El backup ya no promueve dumps parciales**: la validación era "el archivo no está vacío", así que un dump que perdiera un schema entero seguía siendo un `.gz` grande y válido y pisaba `weekly`/`monthly`. `postgres-backup.sh` verifica que cada schema de `EXPECTED_SCHEMAS` (default `public huachicol acervo sieej`) aparezca en el dump y aborta sin promover si falta alguno.
- **Documentación**: cabeceras de ambos scripts, `make help` y `context.md` describen los 4 schemas y aclaran que el schema `mapalab` (capas, símbolos, metadata) **no** viaja en estos dumps — vive en la base de DataEngine y lo cubre el servicio `dataengine-backup` de ese repo (`ecosystem.md` §7.3).
- El mensaje final del restore sugería `alembic -x db=mariachi current`; `env.py` no lee `-x db` (hay un solo target), ahora es `alembic current`.

## [1.71.0] - 2026-07-23

### Cambiado: etiquetado del Catálogo sin burocracia (admin)

Las etiquetas se editan por capa desde la tabla, en lugar de imponer el mismo set a todas.

- **Etiquetas editables en línea**: la columna "Etiquetas" abre un `Select mode="tags"` al hacer clic y **guarda al salir del campo** (sin botón Aplicar). Actualiza la fila en memoria, así no se pierden filtros ni scroll; revierte y avisa si el API falla.
- **Estado editable en línea**: la columna "Habilitada" pasa de etiqueta a `Switch` que persiste al instante (`PUT /catalogo/{id}`), sin abrir el panel de edición.
- **Alta masiva sin etiquetado impuesto**: se quitó el multiselect de etiquetas de "Importar workspace" y "Agregar múltiples capas"; las capas se etiquetan después desde la tabla.
- **Eliminado** el botón "Etiquetar" de la selección múltiple, reemplazado por la edición en línea.
- **Barra de selección múltiple en fila propia y sticky** bajo el header (`top: 64`), con fondo propio para que el contenido no se cuele por el espacio al hacer scroll.

## [1.70.0] - 2026-07-22

### Rediseño de la subpágina de Catálogo (admin)

Solo admin (sin cambios de API). Se reemplazan las tabs y los modales por una experiencia con paneles inline y acciones en lote.

- **Sin tabs**: título + descripción y una botonera con tres acciones que **despliegan un panel inline** (no modal): **Agregar capa** (`CapaFormPanel`, el form que antes era modal), **Importar workspace** (`ImportWorkspacePanel`, importa todas las capas nuevas de un workspace) y **Agregar múltiples capas** (`BulkAddPanel`, `Transfer` de dos paneles).
- **Filtros por columna** en la tabla (búsqueda en nombre/slug/capa, filtro por lista en workspace/etiquetas/habilitada); se elimina el `Select` de filtro por workspace.
- **Selección múltiple** (checkboxes) con barra de acciones: **eliminar en lote** y **etiquetar** (suma etiquetas a las seleccionadas vía PUT parcial `searchTags`).
- **Edición por doble clic** en la fila (se quita el botón editar); se deshabilita mientras hay selección activa.
- Se extrae el hook compartido `useGeoserverLayers`; se elimina `BulkByWorkspace`.

## [1.69.0] - 2026-07-22

### Agregado: gestión del Catálogo de Mapalab

CRUD y alta masiva de capas del catálogo (tabla `mapalab.catalogo_capas` en DataEngine). Requiere la migración `0025_catalogo_capas`.

- **API**: router `/catalogo` (montado con `staff_dep`; lectura y escritura con `require_project_editor` + CSRF + rate-limit). CRUD con `nombre`/`slug` opcionales (derivados del título/nombre de GeoServer, con resolución de colisión de slug); alta masiva `POST /catalogo/bulk` (usa **WMS GetCapabilities** del workspace para nombres+títulos), `POST /catalogo/bulk-delete`, `GET /catalogo/tags`. Valida contra GeoServer (reusa `validate_layer_against_geoserver`). Nuevos `GeoServerClient.get_layer_title` / `get_layers_with_titles`.
- **Admin**: subpágina "Catálogo" (grupo Mapalab): tabla CRUD (form con selector de capa de GeoServer + autocompletado de etiquetas) + pestaña "Alta por workspace" (Ant Design `Transfer` + botón "Importar todo").

## [1.68.0] - 2026-07-22

### Documentación consolidada del rename `/api/administrador` → `/api/mariachi`

Se consolida el estado de las 3 fases del rename (versiones, ramas, orden de deploy y gate) en el `RUNBOOK.md` del ecosistema y en `docs/PENDIENTES.md`. Sin cambios de código en `develop`. La Fase 3 (retiro del compat, **1.67.0** en mariachi y **1.32.0** en gateway-hub) sigue aislada en la rama `chore/rename-fase3-retiro-compat` hasta cumplir el gate — de ahí el salto de `1.66.0` a `1.68.0` en `develop`.

## [1.66.0] - 2026-07-22

### Rename `/api/administrador` → `/api/mariachi`: el admin consume el prefijo nuevo (Fase 2)

El panel admin pasa a llamar al prefijo nuevo: `VITE_ADMIN_API_URL = /api/mariachi` en los `.env.*` y el fallback de `admin/src/shared/services/api.js`. El prefijo viejo sigue funcionando por el rewrite compat de `mariachi-nginx` (1.65.0), así que no depende del orden de deploy con el api. **Requiere `gateway-hub >= 1.31.0`** desplegado antes (locations `/api/mariachi/acervo*`), o las miniaturas caerían al catch-all `/api/` y perderían su rate-limit dedicado. Falta la Fase 2 de SIEEJ (`VITE_BACKEND_API_HOST` + rebuild del dist) y la Fase 3 (retiro del compat).

## [1.65.0] - 2026-07-22

### Rename del prefijo de administración (`/api/administrador` → `/api/mariachi`)

`admin_prefix` pasa de `/api/administrador` a `/api/mariachi`. El prefijo viejo mentía: además del panel admin lo consumen el frontend público de SIEEJ y **mapalab por llamadas internas directas al backend** (validación de API keys de embeds + telemetría). Es higiene de nombres; **no** libera la raíz del dominio (`/api/` completo ya está reservado en el gateway, la app raíz de terceros nunca lo toca).

- **api**: `admin_prefix = "/api/mariachi"` reubica los ~30 routers; nuevo `admin_prefix_legacy = "/api/administrador"`. Las URLs hardcodeadas de `acervo.py` y `geoserver.py` pasan a usar el setting.
- **Compat sin deploy atómico**: `mariachi-nginx` reescribe `^~ /api/administrador/(acervo|)` → `/api/mariachi/$1` (cubre bundles viejos del admin/SIEEJ y URLs persistidas en contenido; la de acervo conserva `proxy_request_buffering off`). Los 2 routers internos de mapalab (`internal/mapalab/keys` y `internal/mapalab/mcp`) se montan bajo **ambos** prefijos: como mapalab llama directo al backend (sin pasar por nginx), esto evita el único gap peligroso —la validación de embeds no se cae aunque mapalab se despliegue después—.
- **mapalab**: sus 4 referencias internas (`access_logger`, `api_key_validator`, `api_key_quota`, `telemetry`) apuntan a `/api/mariachi/internal/mapalab/*`.
- **Sin afectación**: ingesta del visor público (`/api/public/mapalab/events`), schema `huachicol` de la BD y `/metrics` intactos.
- **Pendiente (Fases 2-3)**: `VITE_ADMIN_API_URL` (admin) y `VITE_BACKEND_API_HOST` (SIEEJ) + rebuild; duplicar las 2 locations de acervo en `gateway-hub`; y en un release posterior, retirar el compat. Procedimiento de producción en `RUNBOOK.md`.

### Sentry y `BUILD_STATS` retirados

Sentry se elimina de mariachi (api + admin) por ser de paga; su monitoreo lo absorberá `huachicol` más adelante. Se quitaron el SDK (`sentry-sdk[fastapi]`, `@sentry/react`, `@sentry/vite-plugin`), los `Sentry.init(...)`, `sentry_dsn` / `sentry_traces_sample_rate` de `settings.py`, y todas las variables `SENTRY_*` / `VITE_SENTRY_DSN` de código, ambos compose y los `.env.*`. En la misma pasada se retiró `BUILD_STATS` (el `rollup-plugin-visualizer`), que ensuciaba el build de Docker con un aviso de variable no definida y no se usaba.

## [1.64.0] - 2026-07-22

### Subida interna al Acervo para plataformas externas (`POST /api/internal/acervo/upload`)

Nuevo endpoint interno **upload-only** para que una plataforma externa del ecosistema (hoy el Portal) suba archivos al Acervo sin sesión de Mariachi, autenticándose con el header `X-Internal-Token` = `ACERVO_INTERNAL_TOKEN` (mismo patrón service-to-service que `MAPALAB_INTERNAL_TOKEN`).

- **Solo sube**: el borrado, la edición y la vista siguen en Mariachi. Solo permite el bucket `portal`; valida tamaño (25 MB) y MIME, sanea el nombre y renombra en conflicto (`on_conflict=rename`). No persiste `AcervoFile` (el objeto se lista igual como *bucketOnly*). Registra actividad `acervo.file.upload_internal` y la métrica `mariachi_media_uploads_total`.
- **Seam de escalabilidad**: la política (buckets/límites) la resuelve `resolve_upload_client()` en `services/acervo_upload_clients.py`; hoy un token fijo del entorno, a futuro un registro de clientes con key rotable por plataforma (patrón `source_apps`) sin tocar el endpoint.
- **Documentación** en Mariachi → Documentación → Acervo → "Subida externa" (sub-pestaña en `AcervoTopic`) y en `docs/acervo-subida-externa.md`. Nueva variable `ACERVO_INTERNAL_TOKEN` en `settings.py` y los `.env.*.example`.
- Requiere en gateway-hub (`>= 1.30.0`) la `location ^~ /api/internal/acervo/` sin bot-protection para el acceso cross-server.

## [1.63.1] - 2026-07-21

### Cambios

-

## [1.63.0] - 2026-07-21

### Huachicol absorbe la telemetría (Observabilidad + Telemetría)

El menú "Huachicol" del admin pasa a ser un grupo con dos subpáginas: **Observabilidad** (el
monitoreo `/ontoy` que ya existía) y **Telemetría** (estadísticas de uso). La telemetría se
consolida bajo un schema propio `huachicol` en la BD.

- **BD** (`api/alembic/versions/mariachi/c0ffee1de2a3_...`): nuevo schema `huachicol`. Se
  mueven ahí las 12 tablas de telemetría de mapalab (`events`, `sessions`, `mcp_events`,
  `rollup_*`, `mcp_rollup_*`), renombradas sin el prefijo de app. `SET SCHEMA` + `RENAME` es
  metadata-only: preserva todos los datos. Las FK a `public.mapalab_api_keys` quedan
  cross-schema. Aplicar con `make migrate`.
- **Backend**: modelos (`MapalabEvent`, `MapalabSession`, `MapalabMcpEvent`) y el SQL raw de
  rollups/stats (`mapalab_telemetry.py`, `mapalab_stats.py`) apuntan a `huachicol.*`.
- **Multi-plataforma** (`dab0c01a99ee_...`): columna discriminadora `app` (default `mapalab`)
  en `events`, `sessions`, `mcp_events` y en el grano (PK) de todos los rollups, para distinguir
  plataformas en las mismas tablas (patron de product analytics). `source` queda como sub-canal
  dentro de cada app. El refresh de rollups agrupa por `app`, los endpoints de stats filtran por
  `app` (vía `Period.app`, default `mapalab`) y exponen `/mapalab-stats/apps`. Aditivo, sin
  perder datos.
- **Admin**: nueva página **Telemetría** (`features/telemetria`) con tabs por fuente —
  MapaLab (reutiliza `mapalab-stats`), Colibri (reutiliza `colibri/ResumenPage`) y SIEEJ
  (nuevo, consume `/sieej/stats`). Rutas `/huachicol/observabilidad` y `/huachicol/telemetria`
  (builder `buildHuachicolRoutes`), con redirects de `/monitoreo` y `/mapalab/stats`. La página
  tiene header propio y las pestañas se homologan con un componente `SectionHeading`. El tab de
  MapaLab pasa a **Uso**, con sub-tabs por plataforma (`UsoSection`, dinámicos desde `/apps`).
- **Menú Huachicol**: **Actividad** (auditoría) se mueve del footer rail al grupo Huachicol
  como tercera subpágina (`/huachicol/actividad`, con redirect de `/actividad`), junto a
  Observabilidad y Telemetría. El footer rail queda con Documentación y Revisiones. La página
  de Actividad segmenta el audit log en **pestañas por dominio** (Todo por defecto, más
  Usuarios, SIEEJ, Login, Reportes, Colibrí, Eventos, Home, Acervo) en lugar del selector.
- **BD (actividad)** (`dab0act1v1dad_...`): el audit log `actividad_log` (public) pasa a
  `huachicol.actividad`; el schema `huachicol` unifica telemetría y auditoría. Todo el acceso
  es ORM (helper de registro + endpoint de listado), así que solo cambia el schema del modelo;
  `SET SCHEMA` + `RENAME` preserva los datos. FK a `public.usuarios` cross-schema.

### UI del admin — homologación y pulido (Inicio, Observabilidad, Acervo)

- **Inicio**: nuevo componente reutilizable `SectionHeader` (`shared/components`). Los
  encabezados de sección homologan los iconos del sider —Huachicol (`ClusterOutlined`) y
  MapaLab (`EnvironmentOutlined`)— con enlace "Ver detalles". Las cards de estatus del
  ecosistema (`PlataformaCard`) quitan el slug y muestran el badge de estado abajo a la
  izquierda con el contador de contenedores enfrente.
- **Observabilidad** (`MonitoreoPage`): título "Observabilidad" con su icono del sider
  (`DashboardOutlined`) y encabezado en dos filas (título + Actualizar arriba, descripción +
  fecha abajo). En desktop la tabla de servicios y los eventos se muestran en dos columnas; en
  mobile una sola, con el scroll horizontal contenido dentro de la tabla.
- **Eventos** (`EventosPanel`): panel con altura acotada al viewport y scroll infinito, filtro
  por día/rango con `RangePicker` (presets Hoy/Ayer/7/30 días) y título "Eventos".
- **Acervo Media**: iconos del sider en los títulos de submenús (Media `PictureOutlined`,
  Buckets `DatabaseOutlined`); "Documentación" pasa a la derecha del título y los botones
  "Nueva carpeta"/"Subir archivos" se agrupan a la derecha del toolbar (búsqueda / grid / lista).

---

## [1.62.0] - 2026-07-21

### Monitor como fuente única del estado del ecosistema

Se elimina el sistema propio de sondeo de plataformas del backend, redundante desde que el
monitor de huachicol reporta todo el ecosistema con histéresis.

- **Backend**: eliminados el endpoint `GET /sistema/plataformas`, `core/platforms_config.py`,
  los probes (`_probe_ontoy`, `_probe_http_health`, `_probe_dataengine`) y las settings
  `*_ontoy_url`. El script `scripts/sync-platforms-config.py` queda sin objeto y se retira.
- **Admin**: el widget "Plataformas del ecosistema" del Inicio consume
  `/sistema/monitor/status`; la metadata estática (repo, Taiga, url) pasa al frontend.
- Removidas las variables `*_ONTOY_URL` de los `.env*.example`.

## [1.61.0] - 2026-07-21

### Footer del sider unificado + notas de versión en modal

- El pie del sider pasa de dos bloques separados (icon-rail de Revisiones/Actividad + menú de Documentación) a **una sola fila** que abarca el ancho, con Documentación · Actividad · Revisiones · Notas de versión separados por dividers y cada uno con tooltip; iconos en blanco. Reemplaza `buildIconRailItems`/`buildSiderFooterItems` por `buildSiderFooterRail`, y `FOOTER_ITEMS`/`ICON_RAIL_ITEMS` por un único `FOOTER_RAIL_ITEMS`.
- **Notas de versión** deja de vivir en el Inicio y se abre como modal (`VersionNotesModal`) desde el footer; reutiliza `getNotasVersion` + `Markdown` con el mismo `Collapse` de releases.

### Versión unificada del monorepo (fusión api + admin)

- Se elimina el doble número `api X / admin Y`: el repo lleva **un solo número** con `api/pyproject.toml` como única fuente de la verdad (lo que `get_app_version()` reporta en `GET /ontoy`, `/`, el `release` de Sentry y la versión de los docs OpenAPI). `admin/package.json` se alinea al mismo número, más compatible con el contrato v2 de `/ontoy`.
- Nuevo `scripts/bump-version.sh <x.y.z>`: sincroniza `api/pyproject.toml` + `admin/package.json` y abre la entrada del `CHANGELOG`. Una entrada, un número.
- `changelog_parser` normaliza la versión de cada release (extrae el semver) para que el modal muestre `1.60.0` en vez de `api 1.60.0 / admin 1.59.0`; las entradas dual previas se conservan como histórico.

## [api 1.60.0 / admin 1.59.0] - 2026-07-20

### SIEEJ: fechas abiertas en el campo de rango con catálogo del sistema

Un `date_range` puede dejar un extremo sin fecha exacta y sustituirlo por una opción de catálogo, para periodos que siguen vigentes o cuyo término no se ha determinado (`10/02/1992 – NO DETERMINADO`). Es **opt-in por campo**: los formularios ya publicados no cambian de comportamiento.

#### Agregado

- **`catalogos_sistema.py`** (nuevo): registro de catálogos que el producto necesita y el admin no puede eliminar. Hoy solo `estatus_fecha`. La fuente de verdad es el módulo, no una columna en BD.
- **Migración `b7c8d9e0f1a2`**: siembra el catálogo `estatus_fecha` con NO DETERMINADO, EN PROCESO, VIGENTE, SIN FECHA DE TÉRMINO y PENDIENTE. Idempotente: si la clave ya existe no la duplica ni toca sus opciones, para no revertir ediciones del admin.
- **`definicion_validator.py`**: el field `date_range` acepta `openStart` / `openEnd` (bool) y `openCatalog` (string). Valida tipos y que `openCatalog` no llegue sin ningún extremo abierto.
- **`datos_validator.py`**: cada extremo del rango es fecha **u** opción, nunca ambas; una opción exige que el campo permita ese extremo abierto; el orden `start <= end` solo se compara cuando los dos extremos son fechas. El valor se considera vacío solo si no hay ninguna de las cuatro claves.
- **Admin** (`OpenRangeConfig.jsx` nuevo): sección "Fechas abiertas" en el editor de campo, con el mismo tratamiento visual que "Visibilidad condicional" — dos switches y el selector de catálogo, con tooltip en el título que advierte que el catálogo es compartido.
- **Admin** (`CatalogosManager.jsx`): tag "Sistema" con candado en `/sieej/catalogos` y botón de eliminar deshabilitado para esos catálogos.

#### Cambiado

- **`catalogos_service.py`**: un `date_range` con fecha abierta ahora cuenta como campo enlazado al catálogo, así que renombrar una opción propaga a los envíos que la eligieron y borrarla da 409 si está en uso — mismo trato que ya tenían `select` / `radio`. `delete_catalog` responde 409 en catálogos del sistema.
- **`cambio_classifier.py`**: apagar un extremo abierto (o cambiarle el catálogo) se clasifica como cambio que **rompe**, porque invalida los envíos que ya eligieron una opción ahí; encenderlo es **menor**.
- **`export_format.py`** y **`snapshotUtils.js`**: la opción se muestra en lugar de la fecha en export/PDF/resumen y en el visor de envíos del CMS.
- **`CatalogPicker.jsx`**: acepta `name` / `label` / `extra` / `rules` para reutilizarse fuera del campo `catalog` (lo consume el selector de fechas abiertas).

#### Notas

- El valor persiste con las claves hermanas `startOption` / `endOption`; **los envíos previos siguen validando sin migración de datos**.
- Las opciones no se validan contra el catálogo en el backend, igual que `select` / `radio` con `catalog`: `datos_validator` es puro y no toca la BD.
- **Despliegue**: correr `alembic -x db=mariachi upgrade head`. El frontend respondent vive en el repo `iieg-oficial/sieej` (release 1.32.0).

#### Interno

- `CatalogoCamposCell.jsx` extraído de `CatalogosManager.jsx` (superaba el límite de 300 líneas del ESLint).
- 11 tests nuevos en `test_sieej_datos_validator.py` y `test_sieej_definicion_validator.py`.

---

## [api 1.59.0 / admin 1.58.1] - 2026-07-17

### Admin: mejoras en formularios SIEEJ

#### Agregado

- **FormularioCard**: botón "Asignaciones" (`TeamOutlined`) en las acciones que navega directo a la pestaña de asignaciones del formulario.
- **MemberPicker**: adaptación mobile — en pantallas `< md` se usa `Select mode="multiple"` con búsqueda en vez del `Transfer` de dos columnas.

#### Cambiado

- **AsignacionesEditor**: el guardado es automático al seleccionar grupos o mover usuarios; se eliminó el botón "Guardar asignaciones".
- **MemberPicker**: ocupa todo el ancho disponible en desktop (`flex: 1` en vez de ancho fijo).
- **EnviosTable**: el contenido expandido muestra el nombre del usuario junto con las fechas (Iniciado/Enviado/Actualizado) en una sola fila; columnas con ancho fijo para evitar espacio excesivo.

---

## [api 1.59.0 / admin 1.58.0] - 2026-07-17

### SIEEJ: campo de rango de fechas y visibilidad condicional multi-valor

#### Agregado

- **API** (`datos_validator.py`, `definicion_validator.py`, `export_format.py`): tipo de campo `date_range` con validación de ambas fechas y `start <= end`, formato `start – end` en export/PDF/resumen.
- **Admin** (`definitionTypes.js`, `snapshotUtils.js`, `FieldForm.jsx`, `FieldPreview.jsx`): opción "Rango de fechas" en el editor, preview con `RangePicker` y tooltip al enfocar un campo.
- `showWhen.equals` ahora acepta una lista de valores (la condición se cumple si el campo disparador coincide con cualquiera); el validador de definición rechaza listas vacías.

### SIEEJ: respuestas de envío inline en el CMS

#### Agregado

- **Admin** (`EnviosTable.jsx`, `RespuestasView.jsx`): filas expandibles en la tabla de envíos con pestañas por step para ver las respuestas sin descargar el PDF. Las fechas de Iniciado, Enviado y Actualizado se movieron al detalle expandido como metadatos.

#### Cambiado

- **Admin** (`EnviosTable.jsx`): el banner de "envíos desactualizados" se eliminó (el tag por fila ya lo indica). El botón "Descargar Excel" pasó a llamarse "Descargar XLSX".

---

## [api 1.58.1 / admin 1.57.1] - 2026-07-17

### Admin: volver a la ruta original tras iniciar sesión

#### Corregido

- **Admin** (`shared/helpers/loginRedirect.js`, `shared/services/api.js`, `app/guards/`, `LoginPage.jsx`): al expirar la sesión, el interceptor 401 y los guards redirigen a `/login?next=<ruta+query>` y tras autenticarse se navega de vuelta a esa ruta (sanitizada: solo paths internos, nunca `/login`). Antes siempre se caía en `/inicio` y había que navegar a mano hasta la página en la que se estaba. Complementa el fix de gateway-hub 1.27.9 (502 por IP obsoleta mostrados como página 500 al restaurar una pestaña guardada).

#### Eliminado

- **Infra** (`nginx/conf.d/mariachi.conf`): redirect legado `/administrador` → `/mariachi` (renombrado en v0.21.0; tráfico 0 en 14 días). gateway-hub 1.28.1 liberó el namespace de cara a la futura app raíz de terceros.

---

## [api 1.58.0 / admin 1.57.0] - 2026-07-17

### SIEEJ: catálogos administrables (CRUD con tablas genéricas)

#### Agregado

- **API** (`models/sieej/catalogos.py`, migración `d4e5f6a7b8c9`): par genérico `sieej.catalogo` (`clave` UNIQUE + `label`) + `sieej.catalogo_opcion` (`value` UNIQUE por catálogo, `ON DELETE CASCADE`) que reemplaza las 8 tablas fijas `catalogo_*`. La migración copia claves, labels y opciones existentes y elimina las tablas legacy.
- **API** (`services/sieej/catalogos_service.py`, `routes/sieej_admin/catalogos.py`): `POST/PUT/DELETE /sieej/catalogos[/{clave}]` para crear (clave derivada del label), renombrar (el `label`; la `clave` es inmutable porque la referencian las definiciones JSONB) y eliminar catálogos. El borrado responde 409 si algún campo lo referencia o alguna opción está en uso por envíos. El listado devuelve los catálogos más recientes primero.
- **Admin** (`CatalogosManager.jsx`, `CatalogosPage.jsx`): alta de catálogo inline (botón que revela el input, sin modal) y el recién creado aparece primero; renombrado inline y eliminación con bloqueo cuando hay campos enlazados.

#### Cambiado

- **API** (`routes/formularios/catalogos.py`): el bundle `GET /formularios/catalogos` pasa a ser dinámico `{clave: [{id, value}]}` en lugar del objeto fijo con las ocho colecciones. El frontend ya lo consumía por clave, sin cambios de contrato para los campos existentes.

#### Migración

- Correr `alembic -x db=mariachi upgrade head` **y reiniciar la API en el mismo paso** (Gunicorn sin reload mantiene en memoria el código que apunta a las tablas `catalogo_*` ya eliminadas).

---

## [api 1.57.2 / admin 1.56.2] - 2026-07-17

### MapaLab: purgar una capa borraba su tema ancestro

#### Corregido

- **API** (`models/layer.py`): la relación `children` del árbol de capas estaba definida con `remote_side` hacia el padre y `cascade="all, delete-orphan"`, invirtiendo la dirección padre-hijo en el ORM. Al purgar una capa de la papelera, SQLAlchemy borraba en cadena sus ancestros (subtema, tema, hasta la raíz) y desplazaba a raíz (`parent_id=NULL`) al resto de sus hijos. Se redefine como `parent`/`children` con `back_populates` y `passive_deletes=True`; el borrado en cascada queda solo en el FK de la BD (siempre hacia descendientes).
- **API** (`layer_service.py`): `purge_layer` ahora rechaza (409) purgar una capa que todavía tenga hijos, incluyendo hijos en papelera, para que el `ON DELETE CASCADE` de la BD no elimine descendientes en silencio. Antes solo el soft-delete validaba hijos activos.

---

## [api 1.57.1 / admin 1.56.1] - 2026-07-16

### Infra: eliminar defaults inline del compose

Sin cambios de runtime. Continúa la limpieza iniciada con `POSTGRES_*` (ver más abajo).

#### Cambiado

- **`docker-compose.yml`**: eliminados los defaults inline `${VAR:-valor}` restantes. Los build args opcionales (`VITE_WEB_URL`, `SENTRY_*`, `BUILD_STATS`) pasan a `${VAR}`; `API_ENV_FILE` a `${VAR:?}` (el Makefile siempre lo setea, y se elimina el default a `.env.staging`); `VITE_NODE_ENV`, `VITE_ADMIN_API_URL`, `ACERVO_USE_SSL`, `SENTRY_TRACES_SAMPLE_RATE` y `CRON_SIEEJ_EXPIRE_INTERVAL` a `${VAR:?}`.
- **`.env.production.example` / `.env.development.example`**: agregadas las variables que faltaban (`VITE_NODE_ENV`, `VITE_ADMIN_API_URL`, `CRON_SIEEJ_EXPIRE_INTERVAL`) para que el fail-fast no rompa el deploy.

---

## [api 1.57.0 / admin 1.56.0] - 2026-07-16

### SIEEJ: historial de definiciones + export con versiones y CSV

#### Agregado

- **API** (`models/sieej/formulario.py`, migración `b3c4d5e6f7a8`): tabla `sieej.formulario_version`. Al publicar un cambio de definición clasificado como `rompe`, se archiva la definición previa con su número de versión (`UNIQUE(formulario_id, version)`, con actor y fecha de archivado). La fila `version=N` guarda la definición tal como quedó al final de esa versión — los cambios `menores` intermedios no generan filas; la vigente sigue viviendo en `formulario.definicion`.
- **API** (`formularios_admin_service.py`): el PUT admin inserta el registro del historial en la misma transacción que el bump de versión y la reapertura de envíos.
- **API** (`xlsx_service.py`, `routes/sieej_admin/formularios.py`): `GET /sieej/formularios/{id}/exportar-envios` acepta `?formato=csv|xlsx` (default `xlsx`, solo staff como todo el router). El CSV es plano cuando el formulario solo tiene la tabla principal y un ZIP con un CSV por tabla cuando hay pasos `repeater`; codificado UTF-8 con BOM para abrirse bien en Excel.
- **Admin** (`EnviosTable.jsx`): botón **Descargar CSV** junto a **Descargar Excel** en la sección de envíos.

#### Cambiado

- **API** (`xlsx_service.py`): el export contempla versiones. Las columnas se arman con la unión de los snapshots de los envíos, la definición vigente y las históricas de `formulario_version`: los valores de campos que ya no existen en la definición vigente siguen saliendo, con el sufijo **"(eliminado)"** en el encabezado. Nueva columna **Versión** (la `formulario_version` con la que se llenó cada envío) en la tabla principal.

#### Notas

- Motivación del historial: los valores de campos eliminados permanecen en `envio_formulario.datos` (ningún flujo los poda), pero al migrar los snapshots la definición vieja se perdía y esos valores quedaban sin metadatos (label, tipo, catálogo) ni salida en los exports. Con el historial siempre se pueden interpretar y exportar. Complementa el auto-update del respondent en sieej 1.28.0.

---

## [api 1.56.0 / admin 1.55.0] - 2026-07-14

### SIEEJ admin: editor visual — tabs del repeater, selectores en línea, vista previa y estado en URL

#### Agregado

- **Admin** (`TabsManager.jsx`): administración de los tabs internos de un paso `repeater` junto a los campos que agrupan (crear, renombrar, eliminar). Los campos se listan agrupados por tab, con contador por pestaña. La pestaña **Comunes** reúne los campos sin `tab` — que el renderer muestra en *todos* los tabs — y solo aparece cuando tiene campos (o cuando el paso aún no define tabs). Eliminar un tab con campos pregunta si moverlos a Comunes o borrarlos con él.
- **Admin** (`FieldCard.jsx`): tarjeta de campo extraída de `FieldsList`. Selectores en línea para reasignar el **tab** y el **ancho en columnas** sin abrir el editor. Tags nuevos: `Activa N` en los campos actuadores, y `Tab «x» no existe` en campos cuyo `tab` fue eliminado (el renderer no los muestra en ninguna pestaña).
- **Admin** (`fieldUtils.js`): `placeAfterTrigger` (reubica un campo condicionado junto a su actuador), `reorderWithinTab`, `assignTab`, `assignColSpan`, `renameTabInFields`, `detachFieldsFromTab`, `dropFieldsOfTab`, `describeCondition`, `dependentsOf`, `conditionValueOptions`.
- **Admin** (`useSearchParamState.js`): estado de navegación en la query string con *merge* sobre los parámetros existentes y `replace: true`. El editor queda direccionable: `?tab=definicion&vista=json&paso=bases_datos&subtab=diccionario`. Recargar ya no pierde la ubicación. Valores por defecto no se escriben; `subtab` se descarta al cambiar de paso.
- **Admin** (`FieldPreview.jsx`): la vista previa refleja el **ancho en columnas** (Grande 100% / Mediano 50% / Chico 33%, igual que el grid de 6 columnas del renderer) dibujando el espacio restante como "Otros campos". Si el campo tiene condición, muestra la regla en lenguaje legible y un switch **Se cumple / No se cumple** que simula la visibilidad real.
- **Admin** (`ShowWhenField.jsx`): además de la condición que rige al campo, lista los campos que **dependen** de él con el valor que los dispara, y advierte que renombrar su nombre interno, tipo u opciones rompe esas reglas.

#### Cambiado

- **Admin** (`FieldsList.jsx`): al guardar un campo con actuador, se reubica automáticamente debajo de él (al final del grupo que ya depende del mismo actuador). No se mueve si ya está bien colocado, ni cuando el actuador vive en otro tab. Crear un campo dentro de un tab lo asigna a ese tab.
- **Admin** (`StepDrawer.jsx`): se retira el `Form.List` de tabs; ahora se administran junto a los campos (fuente única). El drawer conserva `minItems`/`maxItems`/`itemLabel`.
- **Admin** (`FieldForm.jsx`): la vista previa sticky se ancla debajo del header (64px + 16px) — antes quedaba tapada por él al hacer scroll.

---

## [api 1.56.0 / admin 1.54.0] - 2026-07-14

### SIEEJ: catálogos administrables desde el admin

#### Agregado

- **API** (`catalogos_service.py`, `routes/sieej_admin/catalogos.py`): CRUD de los catálogos SIEEJ. `GET /sieej/catalogos` (resumen con conteos), `GET|POST /sieej/catalogos/{clave}`, `PUT|DELETE /sieej/catalogos/{clave}/{item_id}`. Bajo `staff_dep` + `verify_csrf`.
- **API** (`schemas/sieej/catalogos.py`): `CatalogoResumen`, `CatalogoAdminItem`, `CatalogoItemPayload`.
- **Admin** (`CatalogosPage.jsx`, `components/catalogos/`): pantalla de administración de catálogos (lista, items, alta/renombrado/borrado) e ítem en el sider.
- **Admin** (`hooks/useCatalogos.js`): catálogos cacheados en memoria y compartidos entre componentes, con `invalidateCatalogos()` tras cada mutación.
- **Admin** (`CatalogPicker.jsx`, `OptionsSource.jsx`): en el editor de campos, la fuente de opciones se elige entre **lista propia** y **catálogo**, con acceso directo a administrar el catálogo seleccionado.

#### Corregido

- **API** (`definicion_validator.py`): `showWhen.field` ahora debe apuntar a un campo del **mismo step**. Las rutas `otro_step.campo` se rechazan: tanto el renderer como `datos_validator` evalúan la condición contra los datos del step actual, así que una referencia cruzada nunca se cumpliría y el campo quedaría oculto en silencio.

#### Tests

- **API** (`test_sieej_catalogos.py`): CRUD de catálogos.
- **API** (`test_sieej_definicion_validator.py`): `showWhen` cruzado entre steps se rechaza.

---

## [api 1.55.0 / admin 1.53.0] - 2026-07-13

### SIEEJ: reorganiza versiones — clasifica cambios menor/rompe, propaga y avisa actualización

El modelo de versionado de formularios se reorganiza con clasificación automática de cambios, propagación a envíos en proceso y aviso al respondent con distintivos.

#### Agregado

- **API** (`cambio_classifier.py`): `clasificar_cambio(old, new) -> "menor"|"rompe"`, `es_rompe`, `diff_definiciones(old, new) -> [{step_id, field_name|null, tipo}]`. Reglas: rompe = eliminar campo/step, agregar campo/step obligatorio, opcional→obligatorio, cambiar type, quitar/renombrar opciones, endurecer validación, cambiar catalog, cambiar type de step. Todo lo demás = menor.
- **API** (`envio.py`): columna `cambios_pendientes` JSONB en `sieej.envio_formulario`.
- **API** (`formularios_admin_service.actualizar()`): clasifica cambio, propaga menores a envíos `en_proceso` al día reescribiendo `definicion_snapshot` SIN subir versión, sube versión SOLO en `rompe`. Devuelve `tuple[Formulario, cambio_info|None]`.
- **API** (`envios_service`): `actualizar_version()` reescribe snapshot conservando datos, `info_cambios()` devuelve `actualizacion_disponible`, `cambios_preview` y `cambios_aplicados`, `_descartar_cambios_vistos()` limpia marcadores.
- **API** (`envios_service.reabrir_enviados_por_cambio()`): un cambio `rompe` reabre a `en_proceso` los envíos ya `enviado` de versión anterior, reescribe su snapshot a la vigente conservando `datos`, guarda el diff en `cambios_pendientes` y registra evento `reabierto`. Distinto de la reapertura manual individual del admin (que conserva la versión con la que se llenó).
- **API** (`schemas`): `CambioRef`, `UltimoCambioInfo` (con `reabiertos`), `FormularioUpdateResponse`; `EnvioResponse` gana `actualizacion_disponible`, `cambios_preview`, `cambios_aplicados`; `EnvioUpdate` gana `cambios_vistos`.
- **API** (`dinamicos.py`): endpoint `POST /formularios/{slug}/envio/actualizar-version`; se pueblan campos de cambios en GET de formulario y envio.
- **Admin** (`DefinicionEditor.jsx`): toast feedback según clasificación del cambio (menor propagado vs rompe con conteo de afectados y de envíos reabiertos).

#### Tests

- **API** (`test_sieej_cambio_classifier.py`): 12 tests de clasificación de cambios.

### SIEEJ admin: visor de respuestas de envío con diff de versión y tag desactualizado

- **API** (`schemas/envio.py`): `EnvioDetalleResponse` con `definicion_snapshot`.
- **API** (`formularios_admin_service`): `contar_desactualizados()`.
- **Admin** (`snapshotUtils.js`): `buildRespuestas`, `diffDefiniciones`, `formatFieldValue`.
- **Admin** (`EnvioDetalleDrawer.jsx`): drawer con render legible del snapshot y diff contra definición vigente.
- **Admin** (`EnviosTable.jsx`): tag "Desactualizado" y banner de conteo de envíos atrás en versión.

### SIEEJ admin: bucket sieej por defecto y descripción en editor de campos

- **Admin** (`FieldForm.jsx`): default `sieej` al elegir tipo archivo, texto descriptivo y gating de props de archivo a `type==='file'`.

---

## [api 1.54.3 / admin 1.52.2] - 2026-07-10

### SIEEJ: barra de herramientas unificada en editor de definicion

- **Admin**: botones Guardar formulario y Agregar paso unificados en barra superior junto al Segmented Visual/JSON, homologados a altura del Segmented, con `flexWrap` para mobile. StepsList recibe `stepAddTrigger` para abrir el drawer desde fuera. Limpiados imports no usados.

---

## [api 1.54.2 / admin 1.52.1] - 2026-07-10

### SIEEJ: ruta de edicion usa slug en vez de id numerico

- **`api/app/api/routes/sieej_admin/formularios.py`**: `GET /formularios/{formulario_id_or_slug}` ahora acepta string (slug o id numerico) en vez de `int`.
- **`api/app/services/sieej/formularios_admin_service.py`**: `get_by_slug()` y `get_by_id_or_slug()` resuelven formulario por slug o id.
- **Admin**: ruta `sieej/formularios/:slug`, navegacion con `f.slug` en `FormulariosListPage`, `FormularioEditorPage` usa `slug` de `useParams()`.

---

## [api 1.54.1 / admin 1.52.0] - 2026-07-10

### Acervo miniaturas + export SIEEJ: seguridad y fidelidad

Correcciones sobre las features del día (miniaturas anónimas de Acervo y descargas de envíos SIEEJ).

#### Seguridad

- **`api/app/api/routes/acervo.py`**: las miniaturas de la ruta **autenticada** vuelven a `Cache-Control: private` (el refactor de `_serve_thumbnail` las marcaba `public`, arriesgando el cacheo de imágenes de buckets privados en proxies/CDN). La ruta pública sigue en `public`. El SVG anónimo se sirve con `X-Content-Type-Options: nosniff` y `Content-Security-Policy: script-src 'none'; sandbox` (evita ejecución de scripts al abrir el SVG directo en el origen del gateway); `nosniff` también en la respuesta raster.

#### Corregido

- **`api/app/services/sieej/xlsx_service.py`** + **`api/app/api/routes/sieej_admin/formularios.py`**: el Excel de envíos arma las columnas por **unión de los `definicion_snapshot`** de cada envío, en vez de la definición vigente del formulario. Antes, los envíos capturados con una definición anterior (campos renombrados/eliminados) quedaban desalineados; ahora queda homologado con el PDF, que ya usaba el snapshot.
- **`api/app/services/acervo_file_service.py`**: `joinedload(AcervoFile.bucket)` al listar media (evita el lazy-load implícito del `bucket` introducido con la relación nueva).
- **`api/app/api/routes/sieej_admin/formularios.py`**: `Content-Disposition` incluye fallback `filename="..."` además de `filename*=UTF-8''`.
- **`nginx/conf.d/mariachi.conf`**: elimina el `add_header Cache-Control ... always` duplicado en `/acervo/thumb/` (deja pasar el header del app y evita cachear respuestas 404).

---

## [api 1.49.0 / admin 1.49.0] - 2026-07-09

### SIEEJ: editor de campos inline colapsable con vista previa

El editor de campos del creador visual deja de abrir un `Drawer` modal y se **colapsa sobre el propio item**. Al pulsar editar, el campo se expande mostrando el formulario; "Agregar campo" abre un editor inline al final.

#### Agregado

- **Admin** (`FieldForm.jsx`): formulario de campo embebido (extraído del antiguo `FieldDrawer`) con footer Guardar/Cancelar y botón Guardar también en las acciones del item. Flujo **tipo primero**: solo se muestra el selector de tipo hasta elegirlo. Layout de dos columnas: campos a la izquierda, **vista previa sticky** a la derecha; en móvil, una sola columna.
- **Admin** (`FieldPreview.jsx` + `fieldUtils.js`): vista previa en vivo de **todos** los tipos de campo con componentes AntD fieles al renderer, incluyendo pistas de validación (tel "10 dígitos", email, patrón, longitudes) y formatos/tamaño para archivo.
- **Admin** (tipo archivo en `FieldForm`): **bucket Acervo** como `Select` poblado desde `useAccessibleBuckets` (ya no se escribe a mano) y **extensiones** como `Select mode="tags"`. **`patternMessage`** configurable para text/textarea/email/tel.

#### Cambiado

- **Admin** (`FieldsList.jsx`): edición inline colapsable, botón Guardar en las acciones del campo (instancia de `Form` compartida) y **confirmación** (`Popconfirm`) al eliminar un campo. Se elimina `FieldDrawer.jsx`.

#### Corregido

- **Admin** (`FieldForm.jsx`): el **nombre interno** se autocompleta con el slug de la etiqueta completa (antes se quedaba en la primera letra porque dejaba de sincronizar en cuanto el campo tenía valor).

### SIEEJ: tabs internos del repeater como editor de filas + acciones de paso

#### Cambiado

- **Admin** (`StepDrawer.jsx`): los tabs internos de un paso `repeater` se editan con un `Form.List` (una fila por tab con id/título validados y agregar/eliminar) en vez de un textarea `id | titulo`.
- **Admin** (`StepsList.jsx`): los botones de acción del paso pasan a la **izquierda** del título (evita toques accidentales), el botón de editar paso queda solo-icono y se agrega **confirmación** (`Popconfirm`) al eliminar un paso.

### SIEEJ: `validation.pattern` y `patternMessage` personalizables por campo

#### Agregado

- **API** (`definicion_validator.py`): valida que `validation.pattern` sea un string con una regex **compilable** y que `validation.patternMessage` sea string no vacío (para text/textarea/email/tel). `definicion_to_validation_rules` exporta el `patternMessage` junto a la regla `pattern`.
- Homologa con el frontend de SIEEJ (`1.20.0`), que aplica esos patrones en cliente y muestra el mensaje personalizado.

### Por qué bump minor

- Agrega funcionalidad visible nueva (edición inline, vista previa, editor de tabs, validación de patrón) compatible hacia atrás.

---

## [api 1.48.0 / admin 1.48.0] - 2026-07-06

### SIEEJ: creador visual de definiciones con pestañas arrastrables

El editor de la definicion JSONB deja de mostrar los pasos como lista vertical con drag & drop y los presenta en **tabs** horizontales. Cada pestaña muestra el titulo en dos lineas con tags mini (tipo de paso + aviso si tiene `incompleteNotice`). Las pestañas se reordenan con dnd-kit. En mobile, los botones "Paso" y "Agregar paso" son solo-icono.

#### Cambiado

- **Admin** (`StepsList.jsx`): pasos renderizados como items de `Tabs` con `SortableContext` horizontal y `DraggableTabNode` via dnd-kit. Se removio `SortableItem` y la estrategia vertical. El boton "Agregar paso" queda en `tabBarExtraContent`.
- **Admin** (`DefinicionEditor.jsx`): removido el Alert informativo "Editor de la definicion"; boton "Guardar definicion" solo-icono en mobile via `useIsMobile`.
- **Admin** (`definitionTypes.js`): nuevo modulo con `STEP_TYPES`, `FIELD_TYPES` y helpers `stepTypeLabel`/`fieldTypeLabel` (labels en español). Compartido entre `StepsList`, `StepDrawer` y `FieldDrawer`.

### SIEEJ: incompleteNotice por paso

Cada paso `form` o `repeater` puede declarar `incompleteNotice: {title?, message}`. Al avanzar con campos visibles sin llenar en ese paso, el respondent ve un modal de advertencia con ese mensaje **sin bloquear** la navegacion ni el envio ("Revisar" / "Continuar de todos modos"). Pensado para pasos 100% opcionales tipo checklist.

#### Agregado

- **API** (`definicion_validator.py`): `_validar_incomplete_notice` valida que `incompleteNotice` sea un objeto con `title`/`message` strings no vacios. Se ejecuta desde `_validar_step` para pasos `form` y `repeater`.
- **Admin** (`StepDrawer.jsx`): campos "Aviso si el paso queda incompleto" (`Input.TextArea`) y "Titulo del aviso" (`Input`), visibles solo cuando `type !== 'summary'`.
- **Tests** (`test_sieej_definicion_validator.py`): 4 tests (incomplete_notice valido, solo message, no_dict falla, message vacio falla).

### SIEEJ: Reabrir envios desde el panel admin

La tabla de envios (`EnviosTable`) ahora muestra un boton **Reabrir** en cada fila con estado `enviado` o `expirado`. Al hacer clic, un `Modal.confirm` devuelve el envio a `en_proceso` para que la dependencia pueda corregir y volver a enviar. Conserva la version del formulario con la que se lleno.

#### Agregado

- **Admin** (`EnviosTable.jsx`): boton "Reabrir" con `UndoOutlined`, deshabilitado con tooltip si el formulario esta `cerrado` o fuera de vigencia. Columna Usuario muestra `usuario_nombre` con `usuario_email` en tooltip. Estados en español (`ESTADO_LABEL`).

### SIEEJ: usuario_nombre/usuario_email en listado de envios

El endpoint `GET /sieej/formularios/{id}/envios` ahora resuelve `usuario_nombre` y `usuario_email` en lote a partir de `usuario_id`, evitando N+1 queries en el frontend.

#### Agregado

- **API** (`schemas/sieej/envio.py`): `EnvioResponse` gana `usuario_nombre` y `usuario_email` (opcionales, poblados solo en el listado admin).
- **API** (`routes/sieej_admin/formularios.py`): `listar_envios` consulta `Usuario` en lote por `usuario_id` y enriquece cada item antes de serializar.

### SIEEJ: FormularioResponse incluye grupos y usuarios asignados

`GET /sieej/formularios` y `GET /sieej/formularios/{id}` ahora incluyen `grupos: GrupoRef[]` y `usuarios_asignados: UsuarioRef[]` en la respuesta, poblando con `selectinload`. Esto corrige el bug de selects vacios en el editor de asignaciones (`AsignacionesEditor`).

#### Agregado

- **API** (`schemas/sieej/formulario.py`): nuevos schemas `GrupoRef` (`id`, `nombre`) y `UsuarioRef` (`id`, `name`, `email`). `FormularioResponse` gana `grupos` y `usuarios_asignados`.
- **API** (`formularios_admin_service.py`): `listar()` carga grupos y usuarios asignados con `selectinload`.
- **Admin** (`AsignacionesEditor.jsx`): removido el Alert "Visibilidad del formulario".

### SIEEJ: Grupos con miembros al crearlos

`POST /sieej/grupos` ahora acepta `usuarios: int[]` para asignar miembros al crear el grupo de forma atomica. Si algun ID no existe, falla con 400. La creacion y las membresias se ejecutan en una sola transaccion.

#### Agregado

- **API** (`schemas/sieej/grupo.py`): `GrupoCreate.usuarios: list[int]` (default `[]`).
- **API** (`grupos_service.py`): `crear()` acepta `member_ids`, valida existencia de usuarios con 400, inserta `usuario_grupo` via `flush` + `execute`.
- **Admin** (`GruposPage.jsx`): creacion y edicion ahora usan un **Modal** con `MemberPicker` (Transfer de AntD) en lugar del formulario inline anterior. La edicion precarga los miembros actuales.
- **Tests** (`test_sieej_admin_grupos.py`): 2 tests (crear con miembros, miembro inexistente 400).

### SIEEJ: MemberPicker con Transfer de AntD

El `Select mode="multiple"` usado en `GruposPage` y `AsignacionesEditor` para elegir miembros no escalaba con muchos usuarios en el sistema. Se reemplaza por `MemberPicker`, un componente reutilizable basado en `Transfer` de AntD con busqueda por `username`, `name` y `email`. Dos paneles (disponibles/seleccionados) con filtro en ambos.

#### Agregado

- **Admin** (`components/MemberPicker.jsx`): `Transfer` con `showSearch`, `filterOption` en tres campos, `selectAllLabels`, labels custom con nombre + email por fila. Compatible con `Form.Item` (value/onChange).
- **Admin** (`GruposPage.jsx`, `AsignacionesEditor.jsx`): usan `MemberPicker` en lugar de `Select mode="multiple"`. Las columnas de Transfer requirieron aumentar el ancho del modal y drawer.

---

## [api 1.47.0 / admin 1.47.0] - 2026-07-03

### Rename de la base de datos: iieg_portal → mariachi

La BD principal deja su nombre legacy `iieg_portal` y pasa a llamarse `mariachi`. El rename ya se aplicó en el entorno local (`ALTER DATABASE ... RENAME`, schemas `public` y `sieej` intactos); en producción se aplica con el procedimiento documentado en el RUNBOOK.

#### Cambiado

- **Infra** (`docker-compose.yml`, `docker-compose.dev.yml`): `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` ya no tienen defaults inline; ahora son `${VAR:?}` y el compose falla explícitamente si faltan en el `.env`.
- **Docs** (`RUNBOOK.md`): nueva sección "Rename de la base de datos (iieg_portal → mariachi)" con procedimiento para producción y rollback; comandos existentes actualizados al nombre nuevo.

---

## [api 1.48.0 / admin 1.47.0] - 2026-07-06

### SIEEJ: enviado abre resumen

Los formularios con estado `enviado` del listado de respondents exponen el `envio_id`, permitiendo al frontend navegar directamente al resumen de solo lectura en lugar del wizard de captura.

#### Agregado

- **API** (`schemas/sieej/formulario.py`): `FormularioListItem.envio_id: int | None`.
- **API** (`services/sieej/formularios_dinamicos_service.py`): el listado `GET /formularios/` incluye `envio_id` (el envio ya se cargaba para calcular `estado_envio`).
- **Tests** (`test_sieej_formularios_dinamicos.py`): assert `envio_id is None` cuando no hay envio + test nuevo `test_list_exposes_envio_id_when_envio_exists`.

### SIEEJ: eliminado listado mis-envios

El endpoint paginado `GET /formularios/mis-envios` se elimina por redundante (la pantalla "Mis envios" del frontend duplicaba la informacion de estado que ya muestra "Mis formularios"). Se conservan el detalle individual y el soft-delete.

#### Eliminado

- **API** (`routes/formularios/dinamicos.py`): removido `GET /formularios/mis-envios` y limpiados imports `Query`/`MisEnviosListResponse`.
- **API** (`services/sieej/envios_service.py`): removidos `listar_mis_envios` y `SORT_OPTIONS`.
- **API** (`schemas/sieej/envio.py`): removidos `MisEnviosListItem` y `MisEnviosListResponse`; ajustado docstring de `MisEnviosFormularioInfo`.
- **Tests** (`test_sieej_mis_envios.py`): suite reducida a detalle + soft-delete (test de delete renombrado a `test_eliminar_mi_envio_lo_oculta_del_detalle`, agregado `test_detalle_sin_sesion_401`).
- **Docs** (`docs/sieej.md`): tabla de endpoints sin el GET lista, con nota de eliminacion en 1.47+.

---

## [api 1.46.0 / admin 1.47.0] - 2026-07-03

### Acervo: seleccion multiple en vista grid

La vista de tarjetas del Acervo ahora permite seleccion multiple via checkboxes en cada tarjeta, igual que la vista de tabla. El boton "Mover" del toolbar se unifico para operar sobre la seleccion activa en ambas vistas.

#### Cambiado

- **Admin** (`AcervoPage.jsx`): checkbox posicionado sobre el cover de cada card en grid. Click en el card sigue abriendo previsualizacion/carpeta; el checkbox solo alterna seleccion. Tarjetas seleccionadas muestran outline purpura. Boton "Mover (N)" + "Eliminar (N)" reemplazan los labels genericos cuando hay seleccion activa.

---

## [api 1.45.0 / admin 1.46.0] - 2026-07-02

### Acervo: mover archivos en lote

Los archivos seleccionados en la vista de tabla del Acervo ahora pueden moverse todos juntos a una misma carpeta, además de la eliminación múltiple que ya existía.

#### Agregado

- **API** (`schemas/acervo.py`, `routes/acervo.py`): nuevo `BulkFileMoveRequest` y endpoint `POST /acervo/mover-lote` que procesa múltiples IDs en una sola llamada, con registro de actividad por archivo y conteo de movidos/fallos/errores.
- **Admin** (`acervoService.js`, `AcervoPage.jsx`): función `moveMultipleFiles`, botón "Mover Seleccionados" en la cabecera al tener archivos marcados, y modal de selección de carpeta destino.

---

## [api 1.45.0 / admin 1.45.0] - 2026-06-30

### Toggle "Servir por tiles (caché)" en el editor de capas

El editor de capas ahora permite activar por capa el modo `TileWMS` (cacheable en GeoWebCache), reemplazando la lista local `TILED_LAYERS` del frontend de MapaLab.

#### Agregado

- **API** (`models/layer.py`, `schemas/layer.py`): columna `tiled` en el modelo ORM y campo en los esquemas `LayerBase` / `LayerUpdate`.
- **Admin** (`LayerEditPage.jsx`): nuevo `Switch` "Servir por tiles (caché)" en el formulario de edición, envío del campo `tiled` al guardar.

#### Notas

- Sin migración propia: la columna `mapalab.layers.tiled` la crea la migración `0024_layers_tiled.py` de dataengine sobre la tabla compartida.

---

## [api 1.44.0 / admin 1.44.0] - 2026-06-29

### Resaltado de capa al hacer clic: switch maestro en vez de opción escondida

El editor de capas (`/mariachi/mapalab/layers`, tab **Apariencia**) presentaba el resaltado al hacer clic como dos columnas independientes (**Color** y **Forma**), con "Sin resaltar" enterrado como tercera opción de **Forma**. Era fácil tocar solo el Color creyendo que eso lo apagaba y dejar el resaltado activo sin querer.

- `LayerHighlightField` ahora tiene un **switch maestro "Activar resaltado"**. Apagado fija `highlightShape='off'` de forma inequívoca y oculta Color/Forma; encendido revela Color + Forma (solo **Área + línea** / **Solo línea**, ya que "Sin resaltar" pasó a ser el switch).
- El switch recuerda la última forma elegida: apagar y reencender restaura la selección previa en vez de resetear.
- Sin cambios de backend ni de schema: `'off'` ya se persistía y el visor de MapaLab ya lo respetaba. (El que las capas con `off` siguieran resaltándose en el visor era un caché stale del árbol reconstruido por el cron de `dataengine-jobs`, corregido por separado en ese repo.)

---

## [api 1.43.0 / admin 1.43.0] - 2026-06-19

### Recursos GeoServer: carga múltiple y de archivos grandes (chunks)

La página **Recursos GeoServer** (`/mapalab/recursos-geoserver`) ahora permite subir **varios archivos a la vez** y **archivos grandes**, replicando el patrón robusto del Acervo.

#### Backend

- Nuevo módulo `services/geoserver_chunked.py`: sesiones de subida por partes respaldadas en Redis. A diferencia del Acervo (multipart S3 de SeaweedFS), las partes se guardan como bytes en Redis porque GeoServer REST hace un único PUT. Chunk de 25 MB, tope total **200 MB**, TTL 2 h.
- `GeoServerClient.put_style_file_streaming()`: PUT único a GeoServer consumiendo las partes en *streaming* (sin cargar el archivo completo en memoria), con `Content-Length` explícito y `timeout=None`.
- Tres endpoints nuevos en `routes/geoserver.py` (editor de proyecto + CSRF):
  - `POST /geoserver/files/chunked/init` — valida nombre/extensión/workspace/tamaño y crea la sesión.
  - `POST /geoserver/files/chunked/{session_id}/part` — guarda una parte (rate limit dedicado `geoserver_chunk`, 600/min).
  - `POST /geoserver/files/chunked/{session_id}/complete` — valida partes completas, ensambla en *streaming* hacia GeoServer y limpia la sesión.
- El endpoint single (`POST /geoserver/files`, cap 5 MB) queda intacto: archivos ≤5 MB siguen por ahí, los mayores se trocean. Trocear evita límites de body del `gateway-hub` y timeouts, igual que el Acervo.

#### Frontend

- `geoserverFilesService`: `initChunkedGeoserverUpload` / `uploadGeoserverChunk` / `completeChunkedGeoserverUpload` + `uploadGeoserverFileSmart()`, que elige single vs chunked por tamaño (umbral 5 MB), reintenta ante `429` respetando `Retry-After` y reporta progreso.
- `FileUploadModal` reescrito: dragger `multiple`, lista de archivos con tamaño/estado/progreso por archivo, normalización automática de nombres, validación por archivo (extensión + tope 200 MB) y subida secuencial con resumen.

### Diagnóstico de miniaturas: omitir SVG (solo raster)

El diagnóstico de miniaturas en vivo (`/mariachi/documentacion`, tab Acervo) listaba todas las imágenes, incluidos los SVG. Como los SVG son vectoriales y se sirven tal cual (no se comprimen a WebP), no aportan nada a una prueba de compresión. Ahora el filtro de `ThumbnailDiagnostics` excluye `image/svg+xml` y solo evalúa imágenes raster (PNG/JPG/GIF/WebP); el texto de la sección lo aclara.

---

## [api 1.42.1 / admin 1.42.1] - 2026-06-19

### Fix: 429 en miniaturas del Acervo (gateway) + concurrencia acotada en el diagnóstico

Al abrir buckets con muchas imágenes (p. ej. `portal`), algunas miniaturas devolvían `429`. La causa de fondo está en el **gateway-hub** (rate-limit bajo + `Cache-Control: no-store` que impedía cachear) y se corrige ahí (gateway-hub `1.27.2`: zona `acervo_thumb` + `location ^~ /api/administrador/acervo/thumb` con burst alto y sin `no-store`).

Lado mariachi (defensa en profundidad): el diagnóstico de miniaturas (`acervo/components/ThumbnailDiagnostics`) hacía `Promise.all` de hasta 16×3 = 48 sondas simultáneas (los IIFE arrancaban al construir el arreglo). Ahora encola *thunks* y los corre con un **pool de concurrencia de 6**, evitando la ráfaga que disparaba el rate limit.

---

## [api 1.42.0 / admin 1.42.0] - 2026-06-17

### Acervo: miniaturas WebP on-the-fly con caché + sección de documentación

Las imágenes del Acervo dejan de descargarse completas para mostrarse en miniatura: se generan al vuelo, en WebP, y se cachean.

#### Miniaturas on-the-fly (backend)

- Dependencia **Pillow** (`pillow>=10,<12`) → **requiere reconstruir la imagen `mariachi-api`**.
- Módulo `services/acervo_thumbnails.py`: resize a WebP q80, anchos permitidos `{120, 400, 1280}`, guarda anti decompression-bomb (`MAX_IMAGE_PIXELS`).
- Endpoint `GET /acervo/thumb/{bucket_id}/{path}?w=`: el SVG se sirve tal cual (vectorial); para raster busca en caché `.thumbs/{path}/{etag}-w{w}.webp`, si no existe la genera, la guarda y la sirve con `Cache-Control: immutable` + `ETag`. El ETag del original va en la ruta → caché auto-invalidante (si el original cambia, su ETag cambia y se regenera).
- `.thumbs/` se agrega a los prefijos ocultos globales (`bucket_policies.GLOBAL_HIDDEN_PREFIXES`), no aparece en el listado del Acervo.
- El campo `thumbnail` ahora se **deriva** por tipo en la serialización (cubre archivos ya existentes, sin migración): raster → endpoint, SVG → la URL, resto → `null`.
- **Cleanup** dirigido (`delete_prefix(".thumbs/{path}/")`) al borrar archivo, borrar bucket-only, borrar carpeta/directorio y mover. Las variantes huérfanas se limpian en el mismo punto donde ya se toca SeaweedFS.
- Nuevo `AcervoClient.put_bytes()`. 5 tests nuevos (genera WebP, SVG passthrough, requiere auth, serialización por tipo, cleanup al borrar).

#### Frontend

- Grid pide `w=400`, lista `w=120` y la previsualización muestra `w=1280` con botón **"Ver original"** (helper `acervoService.thumbVariant`). La galería ya no baja el archivo completo.

#### Documentación

- Nueva sección **Acervo** en `/mariachi/documentacion` (tab) con instrucciones concisas de todas las herramientas (navegación, subir, acciones, carpetas, miniaturas/URLs), al estilo de MCP/Telemetría.
- Incluye un **diagnóstico de miniaturas en vivo** (componente `acervo/components/ThumbnailDiagnostics`): por cada imagen compara original vs `w=120/400/1280`, con peso de cada variante, % respecto al original y la URL copiable de cada tipo.

---

## [api 1.41.0 / admin 1.41.0] - 2026-06-17

### Acervo: nombre original del archivo por defecto, UUID opcional y resolución de conflictos en carga masiva

Cambio en la convención de nombrado de las subidas al Acervo y mejoras en el flujo de carga masiva.

#### Nombre del archivo (backend)

- Por defecto el object key ahora **conserva el nombre original** del archivo (saneado), en vez de un UUID aleatorio. URLs legibles tipo `/acervo/iieg/iconos/marcador-mapa.svg`.
- Nuevo helper `sanitize_filename()` en `services/acervo_file_service.py`: normaliza acentos (NFKD→ASCII), pasa a minúsculas, reemplaza caracteres inseguros por `-`, bloquea path-traversal (`../`) y colapsa la extensión a minúsculas. El `original_name` mostrado coincide con la ruta.
- `POST /acervo` y `POST /acervo/chunked/init` aceptan `use_uuid` (`Form`, default `false`): si se activa, se vuelve al nombre aleatorio (UUID) conservando el `original_name` real. Útil para evitar problemas de caché del navegador al reemplazar o no exponer el nombre real.

#### Resolución de conflictos

- `POST /acervo` y chunked aceptan `on_conflict` (`reject` | `rename`, default `reject`). Nuevo helper `resolve_upload_name()`: con `rename` agrega un sufijo consecutivo (`nombre-2.ext`, `nombre-3.ext`) hasta encontrar uno libre, comparando contra `original_name` y `name` en la carpeta.
- En chunked la validación de duplicado se movió a `init` (rechaza/resuelve **antes** de subir los chunks, no en `complete`).

#### Frontend (carga masiva)

- Modal de subida: nuevo checkbox **"Usar identificador único (UUID)"** (desmarcado por defecto) con tooltip explicando el beneficio.
- Las colisiones (`409`) ya no detienen el lote: se acumulan y, al terminar, un **modal de resolución** lista los archivos con opción **Renombrar** (consecutivo) u **Omitir** por archivo, más botones globales. "Renombrar" re-sube con `on_conflict=rename`.
- Las URLs que se **copian** (acciones e ítem) y la mostrada en la previsualización ahora incluyen el **dominio** (`toPublicUrl()`: `VITE_ACERVO_PUBLIC_URL` con fallback a `window.location.origin`).
- Tooltips descriptivos en los botones de acciones de cada ítem (lista y grid).

#### Fix: carga masiva no refrescaba el listado y mostraba error

- **Frontend**: el contador del lote podía llegar a 0 entre oleadas (el drag & drop encolaba subidas después de `await arrayBuffer`), disparando un refresco prematuro y mensajes confusos. Ahora el drag & drop lee todos los buffers y encola las subidas en un solo paso síncrono, y el cierre del lote se difiere 200 ms para garantizar un único refresco fiable al terminar.
- **Backend**: `ensure_folder_exists()` aísla el `INSERT` de carpeta en un savepoint (`begin_nested`) y captura `IntegrityError` — varias subidas concurrentes a una carpeta nueva (`uq_acervo_folders_bucket_path`) ya no abortan con 500.

#### Tests

- `tests/test_acervo.py`: `sanitize_filename` parametrizado, key = nombre original, `use_uuid` → key aleatorio, `on_conflict=rename` → consecutivo.

---

## [api 1.40.0 / admin 1.40.0] - 2026-06-15

### Rediseño de la pantalla de Usuarios, roles por proyecto y dependencia SIEEJ para externos

Lote de cambios en el panel de administración de usuarios que mejora el rendimiento del modal, clarifica los roles y agrega soporte para la dependencia (grupo SIEEJ) de usuarios externos.

#### Rendimiento del modal

- El formulario de crear/editar usuario se extrajo a `UserFormModal.jsx`. Los `Form.useWatch` (role, password, project_assignments) viven dentro del modal con `destroyOnHidden`, evitando que el tecleo re-renderice toda la lista de usuarios.
- `UserCard` memoizado con `React.memo` y callbacks estabilizadas (`onEdit`, `onDelete`, `onResetPassword` reciben el `user`).
- En `MainProvider.jsx` el objeto `theme` del `ConfigProvider` se movió a una constante module-level (`THEME`), evitando regenerar CSS-in-JS de Ant Design en cada render.
- La contraseña se movió arriba del selector de rol para evitar que se pierda entre los inputs dinámicos de asignación de proyectos. Los campos usuario, nombre y email ahora incluyen una descripción breve con ejemplo.

#### Selector de rol global

- `Segmented` (Administradora / Editora / Externo) con descripción dinámica debajo. Obligatorio sin preselección.

#### Secciones para editora: Plataformas y Acervo

- **Plataformas y acceso** (portal, mapalab, sieej): Switch para activar + `Segmented` Editor / Solo lectura + descripción del rol elegido. Una nota aclara que el acceso a un proyecto incluye sus archivos en el Acervo.
- **Acervo** (iieg, mariachi): chips `Tag.CheckableTag` en fila (no switches).

#### Fix del refresco

- `buildAssignmentsValue()` en `UsersPage` siembra el estado completo de todos los proyectos en cada apertura del modal, eliminando residuos entre usuarios.

#### Rol externo: solo SIEEJ + dependencia

- Un usuario externo solo puede activar SIEEJ (responder formularios) en la sección **Acceso**. No se ofrecen plataformas ni Acervo.
- **Dependencia** (selector de grupo SIEEJ) aparece debajo del ítem SIEEJ, indentada, solo cuando el switch está activado. Se puede elegir un grupo existente o crear uno nuevo. Es opcional.
- El filtrado de `handleSubmit` usa `allowedSlugsForRole()` para que un externo solo persista los proyectos permitidos.
- La asociación de sub-configuraciones por slug (`EXTERNAL_SUBS`) es extensible: hoy solo `sieej` despliega el selector de dependencia.

#### Backend: dependencia = grupo SIEEJ

- `schemas/user.py`: `UsuarioCreate` y `UsuarioUpdate` aceptan `sieej_grupo_id` (existente) o `sieej_grupo_nombre` (nuevo). `UsuarioResponse` devuelve `sieej_grupo {id, nombre}`.
- `users.py`: helper `_set_sieej_grupo()` resuelve/crea el grupo (`sieej.grupo`) y lo asocia como dependencia única del externo (borra membresías + inserta), en la misma transacción. Se llama al crear (si rol externo) y al actualizar solo si el campo vino en el payload (`model_fields_set`). `_serialize_user` incluye el grupo actual del externo.

#### Documentación

- `docs/ROLES.md`: nueva sección "Dependencia de usuarios externos (grupo SIEEJ)" que explica el modelado, la gestión desde el CMS, el backend y las limitaciones del rol externo en el modal.

#### UX: validación de nombre de usuario en el modal

- Nuevo endpoint `GET /usuarios/check-usuario/{username}` que devuelve disponibilidad (`{ available: true/false }`) consultando la BD sin exponer datos.
- En el modal, un `useEffect` con debounce de 400 ms consulta el endpoint mientras se escribe y muestra un indicador visual: ícono dentro de un contenedor estable en el input (spinner / check verde / X roja) más un texto `help` debajo del campo ("Verificando…", "Usuario disponible" o "Este usuario ya existe"). El indicador es informativo — no bloquea la escritura ni usa validación del form.
- El input de usuario elimina espacios automáticamente vía `getValueFromEvent` en vez de `normalize` (más estable en antd 6).
- `DependenciaSelect` se extrajo a su propio componente (`components/DependenciaSelect.jsx`).

#### Fix: chips de Acervo

- Los `Tag.CheckableTag` de iieg/mariachi ahora están vinculados al `Form` mediante `<Form.Item name={...} valuePropName="checked" noStyle>` (antes usaban `checked`/`onChange` manuales con `setFieldValue`, y no respondían correctamente). El diseño diferencia seleccionado (fondo brand sólido, texto blanco) de no seleccionado (borde punteado gris, texto gris).
- `formValueToAssignments()` en `UsersPage` ya no exige `project_role` para persistir la asignación (los chips de Acervo solo requieren `enabled`).

#### Fix: refresh de sesión tras cambio de contraseña

- `POST /autenticacion/cambiar-contrasena` ahora emite una nueva cookie JWT y devuelve un `csrf_token` fresco, evitando que la sesión quede inválida tras el cambio de contraseña.

Sin migración ni cambios de schema.

---

## [api 1.39.0 / admin 1.39.0] - 2026-06-15

### Hardening de routing y autorización del CMS

Lote de correcciones derivado de una auditoría del enrutamiento (frontend, backend y borde).
Documentación nueva en `docs/ROUTER.md`.

#### Seguridad

- **Lecturas admin-only sin guard en backend**: `GET /colibri/source-apps` y `GET /colibri/routes`
  (lista y detalle) pasan a exigir `require_role(['tetlamamakani'])`. Antes solo requerían staff
  (vía `staff_dep` a nivel de router), de modo que una `editora` podía leer por API directa la
  configuración sensible de huéspedes (dominios CORS, prefijos de API key, scrubbers PII) y las
  URLs de webhooks de fan-out, aunque la UI le ocultara esas páginas. Los writes ya estaban
  protegidos. **No** se tocaron `GET /usuarios` (privacidad por rol en `_serialize_user`; lo
  consume SIEEJ-grupos), `GET /colibri/tipos` ni `/direcciones` (los consumen páginas staff).

#### Corregido

- **Redirect de sesión expirada**: el interceptor de `admin/src/shared/services/api.js` redirige
  el `401` a `/mariachi/login`. Antes apuntaba a `/mariachi/administrador/login` (ruta inexistente)
  y solo funcionaba por rebote vía el catch-all 404.
- **`/administrador` legacy en `mariachi-nginx`**: `location /administrador` sustituye el prefijo
  (`rewrite ^/administrador(/.*)?$ /mariachi$1 permanent`) en vez de anteponerlo. Repara los deep
  links legacy (`/administrador/mapalab/layers`, `/administrador/documentacion`, etc.) que caían en
  404, y alinea con las URLs referenciadas en otros repos.
- **Resaltado del sider en rutas de detalle**: nueva `selectedKeyForPath` en `app/sider-config.jsx`
  (prefijo más largo) usada por `MainLayout`. Rutas como `/mapalab/eventos/:id/edit` o
  `/sieej/formularios/:id` ahora resaltan su ítem padre; `/mapalab/layers/ingesta-masiva` gana
  sobre `/mapalab/layers`. Tests nuevos en `app/__tests__/sider-config.test.js`.

Sin migración ni cambios de schema. El fix del `429` en assets del admin vive en `gateway-hub`
(ver su CHANGELOG `1.27.1`).

---

## [api 1.38.3 / admin 1.38.3] - 2026-06-12

### UX: deshabilitar la zona de arrastre cuando el navegador no entrega archivos (snap)

Diagnóstico cerrado del drag & drop que no subía: el navegador del usuario es **Brave instalado como snap** en sesión Wayland — el sandbox de AppArmor del snap no puede leer los archivos referenciados por el protocolo de DnD (llega el nombre/tamaño pero toda lectura falla), mientras que el file picker funciona porque pasa por el portal XDG. No es detectable a priori (mismo user-agent que un Brave normal) ni evitable desde la app; tampoco lo resuelve ninguna librería (dnd-kit es drag interno de DOM con pointer events, no recibe archivos del SO).

- **`admin/.../acervo/pages/AcervoPage.jsx`**: detección empírica con auto-recuperación. Si un lote de drop resulta **completamente ilegible**, se marca el navegador (`localStorage: mariachi.acervo.dndUnsupported`), deja de mostrarse el overlay "Suelta para subir" y el aviso indica usar el botón Subir. El drop se sigue procesando: si en el futuro un drop entrega archivos legibles (p. ej. navegador no-snap), el flag se limpia y la zona de arrastre revive sola.
- Tests nuevos: lote ilegible marca y oculta el overlay; drop legible re-habilita.

Sin migración ni cambios de schema.

---

## [api 1.38.2 / admin 1.38.2] - 2026-06-12

### Fix: drag & drop fallaba con `net::ERR_FILE_NOT_FOUND` — estabilizar archivos del drop en memoria

Causa raíz encontrada (consola del usuario): los `POST /acervo` del drop fallaban con `net::ERR_FILE_NOT_FOUND` — el evento y la lógica funcionaban, pero los `File` de un arrastre en Linux (document portal / GVFS, p. ej. Nautilus en Wayland o ZIPs abiertos) apuntan a un temporal que **caduca en segundos**, y Chrome ya no puede leer el archivo al serializar el FormData. El file picker no lo sufre porque entrega handles persistentes.

- **`admin/.../acervo/pages/AcervoPage.jsx`**: `stabilizeAndUpload` — al soltar, se leen los bytes de inmediato (`file.arrayBuffer()`) y se reconstruye cada archivo en memoria (`new File([...])`) antes de encolarlo al pipeline de subida. Archivos > 100 MB no se bufferizan (van directo, el chunked upload los maneja). Si la lectura inmediata también falla, mensaje claro con los nombres afectados y no bloquea al resto del lote.
- Test nuevo: un archivo volátil (lectura rechazada) no se sube ni bloquea a los demás.

Sin migración ni cambios de schema.

---

## [api 1.38.1 / admin 1.38.1] - 2026-06-12

### Fix/diag: drop multi-archivo en Acervo — lógica verificada con tests y aviso cuando el origen no entrega archivos

Análisis del reporte "el drag & drop multi-archivo no sube nada (ni en el Dragger ni en la rejilla), pero seleccionar sí funciona": se agregó un test de componente (`AcervoPage.dnd.test.jsx`, vitest + testing-library) que simula el drop con múltiples archivos y confirma que la lógica dispara una subida por archivo (vía `dataTransfer.files` y vía el fallback `items.getAsFile()`). Que falle también el Dragger de antd (drop independiente del código propio) indica causa **ambiental**: orígenes de arrastre que no entregan `Files` (p. ej. arrastrar desde un ZIP abierto entrega solo `text/uri-list`) o DnD roto entre apps en Linux Wayland↔XWayland.

- **`admin/.../acervo/pages/AcervoPage.jsx`**: cuando un drop llega sin archivos pero con `types` (caso ZIP/uri-list), se muestra warning explicativo ("extráelos primero o usa el botón Subir") y se loguea `dataTransfer.types` en consola para diagnóstico; antes el drop se ignoraba en silencio. `data-testid` en la zona de drop.
- **`admin/.../acervo/pages/__tests__/AcervoPage.dnd.test.jsx`** (nuevo): 3 escenarios de drop.

Sin migración ni cambios de schema.

---

## [api 1.38.0 / admin 1.38.0] - 2026-06-12

### Feat: chunked upload para archivos > 500 MB

- **backend**: endpoints `POST /acervo/chunked/{init,{id}/part,{id}/complete}` que usan el API multipart nativo de SeaweedFS vía `minio._create_multipart_upload` / `_upload_part` / `_complete_multipart_upload`. Sesiones en Redis con TTL de 2 h. El archivo se parte en chunks de 50 MB subidos secuencialmente; al completar se registra en BD con auditoría, igual que la subida directa.
- **frontend**: `startUpload` detecta archivos > 500 MB y los enruta a `startChunkedUpload`, que divide con `File.slice()` en chunks de 50 MB y los sube secuencialmente. Progreso visible con indicador `parte N/T` en el modal y sobre la rejilla. Retry en 429 por chunk.
- Archivos ≤ 500 MB siguen usando la subida directa existente (sin cambios).

### Feat: soporte para archivos pesados en Acervo (límite 500 MB directa, chunked ilimitado)

- **gateway-hub** (`nginx/templates/gateway.conf.template`): nuevo `location ^~ /api/administrador/acervo` con `client_max_body_size 1G`, `proxy_request_buffering off` y timeouts 600s.
- **mariachi-nginx** (`nginx/conf.d/mariachi.conf`): location `^~ /api/administrador/acervo` reemplaza al obsoleto `^~ /api/administrador/media/` (renombrado). `proxy_request_buffering off`, `proxy_buffering off`, timeouts 600s.
- **gunicorn**: timeout aumentado de 120s a 300s.

### Fix: arreglar drag & drop de carga múltiple sobre la rejilla

- Bloqueo global de `dragover`/`drop` del navegador vía `window.addEventListener` con cleanup.
- `handleDragEnter`: filtro relajado de `dataTransfer.types` (antes exigía `'Files'` exacto).
- `handleDrop`: fallback a `e.dataTransfer.items` + `getAsFile()` cuando `files` está vacío.

Sin migración.

---

## [api 1.37.0 / admin 1.37.0] - 2026-06-12

### Feat: registro de actividad para operaciones de Acervo

Las operaciones de Acervo ahora se registran en el audit log (`actividad_log`) y aparecen en la pantalla **Actividad** con etiquetas legibles y filtro propio:

| Acción | Cuándo | Metadata |
|---|---|---|
| `acervo.file.upload` | Subida de archivo (modal o drag & drop) | nombre, bucket, carpeta |
| `acervo.file.move` | Mover archivo de carpeta | de, a, bucket |
| `acervo.file.delete` | Eliminar archivo (registrado o solo-bucket) | nombre, bucket, carpeta |
| `acervo.folder.create` | Crear carpeta | bucket |
| `acervo.folder.delete` | Eliminar carpeta (vacía o recursiva) | bucket, objetos eliminados |

- **`api/app/api/routes/acervo.py`**: llamadas a `registrar_actividad` (best-effort, mismo commit que la operación) en subir, mover, eliminar archivo (3 variantes), crear y eliminar carpeta.
- **`admin/.../actividad/constants.js`**: `ACTION_LABELS`/`RESOURCE_LABELS`/`META_KEY_LABELS` para las acciones de acervo + filtro por prefijo "Acervo (acervo.*)".

Sin migración (la tabla `actividad_log` ya existía). Test nuevo: upload/move/delete generan las filas con su metadata.

---

## [api 1.36.0 / admin 1.36.0] - 2026-06-12

### Feat: drag & drop directo sobre la rejilla de Acervo

Ya no es necesario abrir el modal de subida: se pueden arrastrar archivos desde el escritorio y soltarlos directamente sobre el área de archivos. Suben a la **carpeta actual** del navegador de archivos (la del breadcrumb), pasando por el mismo pipeline de subida (semáforo de 3 concurrentes, retry en 429, rechazo de duplicados, recarga única al terminar).

- **`admin/.../acervo/pages/AcervoPage.jsx`**: la zona de la rejilla/tabla es un drop target (`dragenter`/`dragover`/`dragleave`/`drop` con contador para evitar parpadeo); overlay punteado "Suelta para subir a <carpeta>" mientras se arrastra. La barra de progreso se muestra también fuera del modal cuando la subida viene del drop. `startUpload` recibe la carpeta destino explícita (modal → campo del form; drop → `currentPath`).

### UX: resultado visible en el modal al terminar la subida

Al terminar el batch solo aparecían toasts flotantes y el modal quedaba igual ("parece que no se hizo nada"). Ahora dentro del modal aparece un `Alert` con el resultado — éxito ("¡Listo! N archivo(s) subido(s)") o warning con el conteo de errores y el motivo — con botón "Ver archivos" que cierra el modal. Se limpia al iniciar otra subida o cerrar.

Sin migración ni cambios de schema.

---

## [api 1.35.3 / admin 1.35.3] - 2026-06-12

### Fix: la carpeta eliminada seguía apareciendo en el listado durante minutos

El borrado de objetos era inmediato, pero SeaweedFS mantiene los directorios como **entradas reales del filer**: al borrar solo los objetos, el listado seguía devolviendo la carpeta vacía como prefijo hasta que el cleanup asíncrono del filer la recogía (minutos después). Reproducido con un experimento: tras `delete_prefix`, el prefijo seguía en el listado de la raíz indefinidamente; un `DeleteObject` explícito de la key del directorio (`carpeta/`) lo elimina al instante.

- **`api/app/services/acervo.py::delete_prefix`**: tras borrar los objetos, borra también las entradas de directorio derivadas (subcarpetas, de hoja a raíz) y la del propio prefijo.
- **`api/app/api/routes/acervo.py::eliminar_carpeta`**: borra la entrada del directorio además del marcador `.keep`.

Sin migración ni cambios de schema.

---

## [api 1.35.2 / admin 1.35.2] - 2026-06-10

### Fix: rechazar subidas duplicadas (mismo nombre original en la misma carpeta)

Cada subida genera un object key UUID, así que el mismo archivo podía subirse infinitas veces a la misma carpeta sin aviso.

- **`api/app/api/routes/acervo.py::subir_archivo`**: si ya existe un registro con el mismo `original_name` en el mismo bucket/carpeta responde `409` con detalle "Ya existe '<archivo>' en esta carpeta". El mismo nombre en carpetas distintas sigue permitido.
- **`admin/.../acervo/pages/AcervoPage.jsx`**: el resumen del batch incluye el motivo del último error (p. ej. el detalle del 409) y el retry no reintenta duplicados (solo 429).

### UX: al eliminar la carpeta en la que estás navegando, la vista regresa al padre

El borrado de carpetas funcionaba (objetos + filas eliminados), pero si el `currentPath` apuntaba a la carpeta borrada la rejilla quedaba "dentro" de una ruta fantasma vacía y parecía que el borrado no había ocurrido. Ahora `handleDelete` detecta que el path actual cuelga del prefijo borrado y navega al padre.

Sin migración ni cambios de schema.

---

## [api 1.35.1 / admin 1.35.1] - 2026-06-10

### Fix: thumbnails de carpetas grandes en Acervo recibían 429 del gateway

Al entrar a una carpeta con muchos archivos, el navegador pedía todos los thumbnails de golpe. El `location ^~ /acervo/` del **gateway-hub** usaba la zona `api` (10 req/s, burst 100): los primeros ~100 GETs pasaban y el resto recibía `429 Too Many Requests` — la mitad de las imágenes no cargaba.

- **gateway-hub `nginx/templates/gateway.conf.template`**: `/acervo/` ahora usa la zona `static` (50 req/s, burst 200), consistente con el resto del contenido estático del gateway. (Cambio en el repo `gateway-hub`.)
- **`admin/.../acervo/pages/AcervoPage.jsx`**: `loading="lazy"` en los thumbnails de la rejilla y la tabla — el navegador solo pide las imágenes visibles en viewport, reduciendo el burst de raíz.

Sin migración ni cambios de schema.

---

## [api 1.35.0 / admin 1.35.0] - 2026-06-10

### Fix: "Mover a carpeta" en Acervo no movía nada

El modal de mover llamaba a `PUT /acervo/{id}` que solo actualizaba la columna `folder` en la BD; el objeto físico nunca cambiaba de ruta en el almacenamiento y, como la rejilla lista los objetos reales del bucket, no se veía ningún cambio. Además los archivos sin registro local (id sintético `bucket:N:key`) ni siquiera eran aceptados por ese endpoint.

- **`api/app/api/routes/acervo.py`**: nuevo `POST /acervo/mover` (`{id, folder}`) que mueve el objeto físico (CopyObject + delete del original vía `AcervoClient.copy_file`), registra la carpeta destino y actualiza `name`/`folder`/`url` del registro local si existe. Acepta ids enteros y sintéticos `bucket:N:key`.
- **`api/app/services/acervo.py`**: nuevo `AcervoClient.copy_file` (operación S3 `CopyObject` del SDK contra SeaweedFS).
- **`admin/.../acervo/pages/AcervoPage.jsx`**: `handleMoveSubmit` usa el endpoint nuevo y refresca rejilla + carpetas.

### Fix: eliminar carpeta dejaba la fila en `acervo_folders` y no refrescaba

Borrar una carpeta desde la rejilla (`DELETE /acervo/dir:N:prefix/`) eliminaba los objetos del bucket y las filas de `acervo_files`, pero dejaba huérfanas las filas de `acervo_folders` — la carpeta "eliminada" seguía apareciendo en los selectores de carpetas (mover, editar, subir), lo que daba la impresión de que a veces no se borraba.

- **`api/app/api/routes/acervo.py`**: el branch `dir:` borra también las filas de `acervo_folders` del prefijo (incluye subcarpetas).
- **`admin/.../acervo/pages/AcervoPage.jsx`**: `handleDelete` recarga también la lista de carpetas (`loadFolders`) y muestra mensaje específico al borrar carpetas.

### Feat: botón de información en carpetas

Nuevo botón ⓘ en las carpetas (vista grid y tabla) que abre un modal con: ruta, cantidad de archivos, cantidad de imágenes, subcarpetas, peso total y última modificación.

- **`api/app/api/routes/acervo.py`**: nuevo `GET /acervo/carpetas/{bucket_id}/info?prefix=` — agrega los datos listando el prefijo recursivamente (excluye marcadores `.keep`).
- **`admin/.../acervo/pages/AcervoPage.jsx`**: handler `handleFolderInfo` + modal con `Descriptions`.

### Fix: descargar ZIP de una subcarpeta duplicaba el prefijo

`handleDownloadFolder` concatenaba `currentPath` al `name` de la carpeta, pero `name` ya incluye la ruta completa — dentro de una subcarpeta el ZIP apuntaba a un prefijo inexistente. Ahora usa `name` directo.

Sin migración ni cambios de schema. Tests nuevos: mover (registrado y bucket-only), info de carpeta, limpieza de `acervo_folders` al borrar directorio.

---

## [api 1.34.10 / admin 1.34.10] - 2026-06-10

### Fix: subida masiva en Acervo fallaba a partir del archivo ~61 por rate limit (429)

Con el crash de antd resuelto (1.34.9), los logs del API mostraron la causa de los archivos restantes que no subían: el endpoint `POST /acervo` compartía el rate limit `acervo_write` (60 req/min por usuario), y un lote de iconos pequeños con 3 subidas concurrentes supera 60/min fácilmente — del archivo ~61 en adelante el backend respondía `429 Too Many Requests` dentro de la misma ventana.

- **`api/app/api/routes/acervo.py`**: la subida de archivos usa su propio límite `acervo_upload` (240 req/min); el resto de escrituras (carpetas, ediciones, borrados) mantienen `acervo_write` (60 req/min).
- **`admin/.../acervo/pages/AcervoPage.jsx`**: `startUpload` reintenta automáticamente ante `429`, esperando el `Retry-After` del backend (+1s de margen), hasta 5 intentos por archivo. Lotes que excedan la ventana terminan completos en vez de marcar errores.

Sin migración ni cambios de schema.

---

## [api 1.34.9 / admin 1.34.9] - 2026-06-10

### Fix: causa raíz del React #185 al soltar muchos archivos en Acervo — bypass del fileList interno de antd

Diagnóstico definitivo del crash de subida masiva: ocurría **al soltar el batch**, no durante las subidas. rc-upload/antd procesa el drop llamando `flushSync` (render síncrono forzado) **una vez por archivo** dentro de un `forEach` (stack: `onChange` del input nativo → `uploadFiles` → forEach → `flushSync`); React corta a los ~50 renders síncronos consecutivos sin paint → `Maximum update depth exceeded` (#185) → crashea el árbol, el spinner queda pegado y las subidas restantes mueren. Por eso los fixes de 1.34.5–1.34.8 (que operaban después del drop) no lo resolvían.

- **`admin/.../acervo/pages/AcervoPage.jsx`**: los archivos ya no entran al pipeline interno de antd. `beforeUpload` devuelve `Upload.LIST_IGNORE` por cada archivo (cero `flushSync`, sin `fileList` interno) y dispara `startUpload`, que sube con el semáforo de 3 concurrentes existente. Progreso propio con estado `uploadProgress` (`total`/`done`/`failed`) renderizado como `<Progress>` + contador bajo el Dragger (reemplaza la lista de items de antd). El resumen y la recarga única al terminar el batch se mantienen.

### Fix: index.html del admin se cacheaba indefinidamente (bundles viejos tras deploy)

`location /mariachi` servía `index.html` sin `Cache-Control`, y los assets `.js/.css` van con `public, immutable` + 1 año. El navegador cacheaba heurísticamente el HTML viejo, que apuntaba a bundles viejos inmutables → tras un deploy se seguía sirviendo la app anterior incluso con recargas normales.

- **`nginx/conf.d/mariachi.conf`**: `add_header Cache-Control "no-cache" always` en `location /mariachi` (el HTML se revalida siempre; los assets con hash siguen immutable).

Sin migración ni cambios de schema.

---

## [api 1.34.8 / admin 1.34.8] - 2026-06-10

### Fix: subida múltiple en Acervo seguía con React #185 (recarga acoplada al onChange de antd)

La recarga post-subida vivía en el `onChange` del `Dragger`, que antd invoca dentro de su `flushSync`; al llamar ahí a `loadAcervoFiles()`/`loadBucketStats()` (que hacen `setState`) se re-entraba el ciclo de updates de antd → `Minified React error #185` y spinner pegado (reproducible al subir dentro de una carpeta, con varios archivos).

- **`admin/.../acervo/pages/AcervoPage.jsx`**: se elimina el handler `onChange` del `Dragger`. La recarga se desacopla por completo del ciclo de antd: un ref `uploadBatch` (`pending`/`done`/`failed`) cuenta las subidas en `handleUpload` (el `customRequest`), y cuando el contador llega a 0 se difiere la recarga + el `message` de resumen con `setTimeout(0)`, de modo que el `setState` corre **fuera** del `flushSync` de antd.

Sin migración ni cambios de schema.

---

## [api 1.34.7 / admin 1.34.7] - 2026-06-10

### Fix: subidas de Acervo abortaban por timeout y el 401 mid-batch crasheaba con React #185

Dos bugs en la subida múltiple de Acervo, independientes del storm de render ya corregido:

- **Timeout de 10s heredado de la instancia axios** ([`shared/services/api.js`](../admin/src/shared/services/api.js) define `timeout: 10000`) aplicaba también a los `POST /acervo`. Archivos pesados o lotes grandes excedían los 10s y axios abortaba esas peticiones → "unas se suben, otras no". **`admin/.../acervo/api/acervoService.js`**: `uploadAcervoFile` ahora pasa `timeout: 300000` (5 min) en el `POST`.
- **El interceptor redirigía a login con `window.location.href` síncrono ante cualquier 401.** Si una petición 401eaba a mitad de un batch (p. ej. el JWT expira), esa navegación corría mientras el `Upload` de antd hacía `flushSync` sobre un árbol desmontándose → `Minified React error #185` y spinner pegado. **`admin/.../shared/services/api.js`**: guard `redirectingToLogin` para que N respuestas 401 no disparen N redirects, y la navegación se difiere con `setTimeout(…, 0)` para dejar que el stack de React termine antes.

Sin migración ni cambios de schema.

---

## [api 1.34.6 / admin 1.34.6] - 2026-06-10

### Mejora: limitar la concurrencia de subida en Acervo a 3 archivos a la vez

Complementa el fix de 1.34.5. antd dispara `customRequest` para todos los archivos soltados al mismo tiempo, así que un set grande de iconos abría decenas de subidas simultáneas y presionaba al backend (y al interceptor de sesión). Se agrega un semáforo que limita a 3 subidas en vuelo; las demás esperan turno.

- **`admin/.../acervo/pages/AcervoPage.jsx`**: `uploadSemaphore` (`useRef` con `active`/`queue`/`max: 3`) más `acquireSlot`/`releaseSlot`. `handleUpload` adquiere una ranura antes de subir y la libera en `finally`. `onProgress` y el resumen del batch (`handleUploadChange`) siguen igual.

Sin migración ni cambios de schema.

---

## [api 1.34.5 / admin 1.34.5] - 2026-06-10

### Fix: subir muchos archivos a Acervo crasheaba con React #185 y dejaba el spinner pegado

Al arrastrar varios archivos (p. ej. un set de iconos) al uploader de Acervo, solo se subían algunos y el resto fallaba con `Minified React error #185` ("Maximum update depth exceeded"); la página quedaba cargando. La causa: el `Dragger` es `multiple`, así que cada archivo corría su propio `customRequest` y al terminar llamaba a `loadAcervoFiles()` + `loadBucketStats()` (este último lista el bucket completo recursivo) y mostraba un `message.success`. Con N archivos eso eran N×2 listados concurrentes y un storm de `setState` que chocaba con el `flushSync` interno del `Upload`; al crashear React el `setLoading(false)` final no se aplicaba y el spinner se quedaba pegado. El bombardeo de peticiones también disparaba carreras del interceptor de sesión (401 en `/autenticacion/perfil`).

- **`admin/.../acervo/pages/AcervoPage.jsx`**: `handleUpload` (customRequest) ya no recarga ni notifica por archivo; solo resuelve `onSuccess`/`onError`. Nuevo `handleUploadChange` en el `Dragger` recarga la rejilla y las estadísticas **una sola vez** cuando el batch completo termina, con un único `message` de resumen (subidos / fallidos).

Sin migración ni cambios de schema.

---

## [api 1.34.4 / admin 1.34.4] - 2026-06-09

### Fix: labels legibles de evento_fun_fact/center/share y quitar "(últimos 30 días)" de secciones

- **`admin/src/features/mapalab-stats/constants.js`**: `BUTTON_LABELS` ahora incluye `evento_fun_fact`, `evento_center`, `evento_share` con nombres legibles en español.
- **`admin/src/features/mapalab-stats/components/ButtonsBar.jsx`**: título simplificado a `"Uso de botones"`.
- **`admin/src/features/mapalab-stats/components/ToolsBar.jsx`**: título simplificado a `"Herramientas"`.

---

## [api 1.34.3 / admin 1.34.3] - 2026-06-09

### Fix: telemetria evento_fun_fact, evento_center, evento_share no aparecian en estadisticas

- `evento_center` y `evento_share` eran emitidos por el frontend de mapalab pero rechazados al ingestar porque no estaban en `ALLOWED_EVENT_NAMES`. `evento_fun_fact` si se almacenaba pero no se rolleaba a ninguna tabla de estadisticas.
- **`api/app/schemas/mapalab_event.py`**: `evento_center` y `evento_share` agregados a `ALLOWED_EVENT_NAMES` (37 eventos ahora).
- **`api/app/services/mapalab_telemetry.py`**: los 3 eventos agregados a `_VISOR_BUTTON_NAMES` (aparecen en pestana Botones). Rollup `mapalab_rollup_eventos` extendido con columnas `fun_facts`, `centers`, `shares` (Ademas de `opens`/`closes`).
- **`api/app/api/routes/mapalab_stats.py`**: endpoint `/eventos` lee y devuelve los 3 campos nuevos.
- **Migracion**: `f9c0d1e2f3a4` — `ALTER TABLE mapalab_rollup_eventos ADD COLUMN fun_facts/centers/shares` + backfill de datos historicos.

### Notas de deploy

- **Migracion requerida**: `mariachi` `f9c0d1e2f3a4`. Ejecutar `docker exec mariachi-api alembic -x db=mariachi upgrade head`.

---

## [api 1.34.2 / admin 1.34.2] - 2026-06-09

### Fix: docker compose exec sin --env-file generaba warnings en backup/restore

`docker compose exec` no carga `--env-file` (solo `up` lo hace). Al ejecutar `make backup-db ENV=prod`, las variables `POSTGRES_MAX_CONNECTIONS`, `POSTGRES_SHARED_BUFFERS` y `POSTGRES_EFFECTIVE_CACHE_SIZE` de `.env.production` no se inyectaban al parsear `docker-compose.yml`, generando warnings aunque el dump funcionaba correctamente. Lo mismo afectaba a `restore-db`, `refresh-mapalab-stats`, `purge-mapalab-events` y el cronjob de `install-backup-cron`.

- **`scripts/postgres-backup.sh`**: nueva variable `COMPOSE_ENV_FILE`; si está seteada se agrega `--env-file` a todas las llamadas a `docker compose`.
- **`scripts/postgres-restore.sh`**: mismo tratamiento.
- **`Makefile`**: los targets `backup-db`, `restore-db`, `refresh-mapalab-stats`, `purge-mapalab-events` e `install-backup-cron` pasan `COMPOSE_ENV_FILE=$(ENV_FILE)` o `--env-file $(ENV_FILE)` según corresponda.

---

## [api 1.34.1 / admin 1.34.1] - 2026-06-09

### Fix: crear carpeta en Acervo daba 409 y la carpeta quedaba invisible

Crear una carpeta desde la página de Acervo (p. ej. `iconos` en el bucket `iieg`) podía responder `409 Conflict` aunque la carpeta no apareciera en la rejilla. La causa era que `crear_carpeta` solo insertaba una fila en `acervo_folders` sin escribir ningún objeto en el almacenamiento (SeaweedFS): como la rejilla se llena con los objetos reales del bucket, las carpetas vacías quedaban invisibles y el siguiente intento de crearlas chocaba con la fila fantasma. Además la convención de `path` era inconsistente (`/iconos` en raíz, `iconos/sub` anidado) vs. la canónica `iconos/` que usan los uploads y la navegación, lo que también rompía el check de borrado (`AcervoFile.folder == folder.path`).

- **`app/api/routes/acervo.py::crear_carpeta`**: usa el path canónico (`iconos/`, sin slash inicial, con final) vía `normalize_folder_path` y crea un objeto marcador de 0 bytes (`<carpeta>/.keep`) para que la carpeta vacía sea visible en la rejilla. `eliminar_carpeta` borra también el marcador.
- **`app/services/acervo.py`**: nuevo `AcervoClient.put_empty_object`.
- **`app/services/acervo_file_service.py`**: `FOLDER_PLACEHOLDER='.keep'`, helpers `normalize_folder_path`/`folder_marker_key`/`is_folder_marker`; `listar_media` filtra los marcadores para que no aparezcan como archivos ni cuenten en estadísticas.
- **`admin/.../acervo/pages/AcervoPage.jsx`**: tras crear una carpeta refresca la rejilla (`loadAcervoFiles`) además del árbol de carpetas.
- **Docs**: `docs/context.md` corregido — el almacenamiento del Acervo es **SeaweedFS** (S3-compatible vía su gateway), no MinIO; lo que el código usa es el SDK `minio` apuntado a ese endpoint.

### Notas de deploy

- **Migración requerida**: `mariachi` `d9e0f1a2b3c4` — normaliza `acervo_folders.path`/`parent` al formato canónico y elimina filas fantasma de carpetas vacías (en todos los buckets) que nunca tuvieron objeto en el almacenamiento. Ejecutar `docker exec mariachi-api alembic -x db=mariachi upgrade head`.

## [api 1.34.0 / admin 1.34.0] - 2026-06-08

### Feat: estadísticas de temas filtran por nodeType

El endpoint `GET /mapalab-stats/themes` ahora solo devuelve nodos raíz de tipo `tema`, excluyendo categorías, capas, grupos o labels que hayan quedado desplazados a la raíz del árbol (por bugs de reordenamiento previos). Antes cualquier nodo con `theme_change` en la raíz se contaba como "tema más visto".

- **`api/app/api/routes/mapalab_stats.py`**: `_fetch_layer_labels` recolecta `nodeType` desde el árbol de capas. `top_themes` filtra `nodeType == 'tema'` además de los filtros existentes (`label` presente, `parent_id != 'eventos-auto'`).

Sin migración ni cambios de schema.

## [api 1.33.0 / admin 1.33.0] - 2026-06-08

### Feat: iconos por estado (normal/hover) en temas del sider

Permite definir iconos distintos para cada estado visual de un tema en el sider del visor MapaLab. Antes solo se podía elegir un único `icon_url` estático; ahora se puede asignar una imagen para el estado normal (sider colapsado) y otra para hover/activo (sider expandido o capas activas).

- **`api/app/models/layer.py`**: nueva columna `icon_overrides` (JSONB) en el modelo `Layer`.
- **`api/app/schemas/layer.py`**: campo `iconOverrides` en `LayerBase` y `LayerUpdate`, con validación `to_relative` por valor y serialización `to_absolute`.
- **`admin/.../TemaIconField.jsx`**: reescrito con `Segmented` para seleccionar estado (`normal` / `hover`) y previsualizar en vivo. Mantiene el `BucketFilePicker` de Acervo.
- **`admin/.../LayerEditPage.jsx`**: tab Apariencia para temas usa `Form.Item name="iconOverrides"` en vez de `iconUrl`. La función `populate()` incluye `iconOverrides`.

### Notas de deploy

- **Migración requerida**: `dataengine` 1.21.0 — `mapalab.layers.icon_overrides` (JSONB). Ejecutar `make migrate` desde `/IIEG/dataengine`.

## [api 1.32.0 / admin 1.32.0] - 2026-06-05

### Feat: mover capas entre temas/categorías desde el árbol de capas

Agrega la capacidad de reasignar el padre de una capa, categoría o grupo sin tener que recrearla. Antes solo la creación permitía elegir el padre (`LayerCreateModal`); la edición no exponía `parentId` y `reorder` solo ordenaba hermanas dentro del mismo padre, por lo que un nodo que quedaba en la raíz del árbol no se podía regresar a su tema desde la interfaz.

- **`admin/.../pages/LayerEditPage.jsx`**: nuevo botón "Mover" (solo admin) en la barra de acciones del nodo seleccionado, que abre el modal de movimiento y al confirmar hace `PUT /layers/:id` con el nuevo `parentId` y recarga el árbol.
- **`admin/.../components/LayerMoveModal.jsx`** (nuevo): `TreeSelect` de destino con opción "raíz"; excluye el propio subárbol para impedir mover un nodo dentro de sí mismo.
- **`admin/.../utils/treeSelect.js`** (nuevo): helpers `buildTreeSelectData` y `buildMoveTreeData` reutilizados por `LayerCreateModal` y `LayerMoveModal`.
- **`app/services/layer_service.py::update_layer`**: al cambiar `parent_id` valida que el destino exista, que no sea el propio nodo ni un descendiente (CTE recursivo `_collect_descendant_ids`, evita ciclos) y recalcula `sort_order` al final de las hermanas del destino. El `PUT` ya dispara `notify_tree_changed()`, por lo que la caché del visor se refresca sola.

### UX: la pantalla de Actividad muestra el nombre del usuario y acciones legibles

El audit log (`GET /actividad`) solo devolvía `actor_id`, así que la tabla mostraba `#3`, el código crudo de la acción (`sieej.formulario.update`) y la metadata como JSON.

- **`app/api/routes/actividad.py`**: la consulta hace `LEFT JOIN` con `usuarios` y devuelve `actor_name`, `actor_username` y `actor_avatar_url`.
- **`admin/.../actividad/pages/ActividadPage.jsx`**: la columna "Usuario" muestra avatar + nombre + `@username` + rol (o "Sistema" si no hay actor); la acción se muestra como etiqueta legible (con el código en el tooltip), el recurso traducido y la metadata como pares `clave: valor` legibles más la IP. Se agregan filtros por prefijo de Reportes, Colibrí, Eventos y Home.
- **`admin/.../actividad/constants.js`** (nuevo): catálogos de etiquetas (`ACTION_LABELS`, `RESOURCE_LABELS`, `META_KEY_LABELS`) y helpers, reutilizables y para mantener el componente bajo el límite de líneas del lint.

## [api 1.31.0 / admin 1.31.0] - 2026-06-04

### Feat: subida de archivos de formularios SIEEJ por encuesta + bucket `sieej` homologado

Cierra el flujo de subida de archivos de formularios SIEEJ. El bucket Acervo se renombró a `sieej` (migración `a1b2c3d4e5f6`) pero las definiciones de formularios seguían apuntando a `sieej-uploads`/`sieej-diccionarios`, por lo que `POST /formularios/:slug/envio/upload` respondía 500. Además la comparación de vigencia reventaba con `TypeError` (naive vs aware) en formularios con `vigencia_inicio`/`vigencia_fin`.

- **`app/services/sieej/envios_service.py`**: el `object_key` ahora incluye el slug del formulario (`{slug}/envio{id}/{uuid}.{ext}`), para escalar a múltiples encuestas subiendo archivos sobre el mismo bucket `sieej`.
- **Migración `c2d3e4f5a6b7`**: homologa las definiciones existentes (`sieej-uploads`/`sieej-diccionarios` → `sieej`) en `sieej.formulario.definicion` y `sieej.envio_formulario.definicion_snapshot`.
- **`app/core/time.py::to_naive_utc`**: normaliza datetimes aware (columnas `timestamptz`) a naive UTC; aplicado en `_formulario_acepta_cambios` y `_expirar_si_corresponde` para evitar el `TypeError` 500 al aceptar cambios.
- **Seed `b5c6d7e8f9aa`** y placeholder del constructor visual (`FieldDrawer.jsx`) usan `sieej`, para que las futuras encuestas no nazcan apuntando a un bucket inexistente.

### Fix: logs de inicio de sesión y normalización de `pattern` en la validación

Atiende hallazgos del documento de pruebas del tester (casos L4 y de envío de CURP).

- **`app/api/routes/auth.py`**: el login (éxito/fallo) y el logout ahora registran en `actividad_log` (`login.success`, `login.failed`, `login.logout`) con actor, rol e IP. Antes solo escribían al logger de aplicación, por lo que el filtro `Login (login.*)` de la interfaz de Actividad salía vacío. Cada registro va protegido con `try/except` para no afectar la autenticación si el log falla.
- **`app/services/sieej/datos_validator.py`**: `_compilar_pattern` normaliza el `validation.pattern` estilo JS (`/cuerpo/flags`) quitando los delimitadores `/.../` antes de `re.match`. Antes, `re.match("/^...$/", value)` interpretaba el `/` inicial como literal y rechazaba **toda** entrada (p. ej. CURPs válidas). El regex de CURP de las definiciones ya era correcto; el formato de 18 caracteres no cambió (lo nuevo en 2025-2026 es la CURP biométrica, no el algoritmo).
- **`app/services/sieej/envios_service.py`**: `upload_archivo` ahora valida el archivo recibido contra la definición del campo — rechaza con `413` si excede `maxSizeMB` y con `415` si la extensión/MIME no está en `accept` (defense-in-depth; antes solo validaba el frontend). Helpers `_field_para_path` y `_formato_permitido`.

### UX: ajustes del panel admin (hallazgos del tester)

- **`sieej-formularios/pages/GruposPage.jsx`**: el botón "Nuevo grupo" enfoca el campo Nombre (antes no daba feedback visible porque el formulario inline siempre está presente).
- **`users/components/UserCard.jsx`** y **`sieej-formularios/components/FormularioCard.jsx`**: `body { flex: 1 }` para que el footer de acciones quede alineado al fondo en tarjetas de distinto alto.
- **`users/pages/UsersPage.jsx`**: `handleEdit` hace `resetFields()` antes de `setFieldsValue`, evitando que el modal arrastre los `project_assignments` del usuario abierto previamente (`setFieldsValue` hace merge, no reemplazo).
- **`actividad/pages/ActividadPage.jsx`**: la paginación muestra el rango actual (`X–Y de N eventos`) en vez de solo el total.
- **`auth/pages/LoginPage.jsx`**: el identificador elimina todos los espacios (`replace(/\s/g, '')`), no solo los de los extremos (`trim`).

Se libera en paralelo con SIEEJ `1.15.0` (fix del Dragger + login sin espacios). Ver `sieej/docs/CHANGELOG.md` §[1.15.0].

---

## [api 1.30.0 / admin 1.30.0] - 2026-06-04

### Feat: temas más vistos desde theme_change

Nueva tabla `mapalab_rollup_themes` que desglosa el evento `theme_change` por tema (id del tema temático del árbol). Enriquecida con label/workspace desde el árbol de capas de MapaLab, igual que TopLayers.

- **Migración `a0f1e2d3c4b5`**: crea `mapalab_rollup_themes(dia, theme_id, views, unique_sessions, last_seen)` con backfill desde `mapalab_events WHERE event_name='theme_change'`. Limpia `theme_change` de `mapalab_rollup_buttons` (se mueve a su propia tabla).
- **`api/app/services/mapalab_telemetry.py`**: agrega paso `mapalab_rollup_themes` a `_ROLLUP_STEPS`. Quita `theme_change` de `_VISOR_BUTTON_NAMES`.
- **`api/app/api/routes/mapalab_stats.py`**: endpoint `GET /mapalab-stats/themes` (limit + period), enriquece `theme_id` con `_fetch_layer_labels`.
- **`api/app/schemas/mapalab_event.py`**: nuevo `ThemeStatRow` (theme_id, label, workspace, views, unique_sessions, last_seen).
- **Admin**: `ThemesTable` + `useThemeStats` + `getThemes`, montado en `ResumenSection` entre Eventos y Capas. Label `theme_change`: "Cambio de tema" → "Apertura de tema".

---

## [api 1.29.0 / admin 1.29.0] - 2026-06-04

### Feat: estadísticas de MapaLab con historial permanente y selector de rango día/mes/año

Las métricas del visor salían de vistas materializadas de ventana fija (30d/7d/1d/90d) reconstruidas desde las tablas crudas, que se purgan por retención (90d eventos / 180d sesiones). Por eso no había historia ni forma de consultar periodos arbitrarios. Ahora se persisten **rollups diarios** que nunca se purgan y los endpoints aceptan un rango con granularidad día/mes/año.

- **Migración `f8b9c0d1e2f3`**: crea tablas de rollup diario persistentes `mapalab_rollup_{daily,layers,buttons,tools,eventos}` y MCP `mapalab_mcp_rollup_{daily,tools,clients}`, hace **backfill** desde los crudos y elimina las matviews de ventana fija (`mapalab_stats_*` y `mapalab_mcp_stats_*`). `downgrade` las recrea.
- **`api/app/services/mapalab_telemetry.py`**: `rollup_stats()` reemplaza a `refresh_stats_views()`. Recomputa los últimos 3 días desde los crudos con upsert idempotente (DELETE+INSERT de la ventana), capturando eventos tardíos y el día en curso; lo histórico persiste. Mismo cron de 30 min (`scripts/refresh_mapalab_stats.py`, `make refresh-mapalab-stats`).
- **`api/app/api/routes/mapalab_stats.py`**: todos los GET de lectura (salvo `/highlights`) aceptan `date_from`/`date_to` (YYYY-MM-DD) y `grain` (`day`/`month`/`year`); default últimos 30 días. `overview` y `mcp/overview` pasan a ser por rango; `/daily` y `/mcp/daily` bucketean por `grain`. `/refresh` corre `rollup_stats`.
- **Schemas**: `StatsOverview` y `McpStatsOverview` pasan a métricas por rango; se quita `p95_duration_ms` de tools MCP (no es sumable entre días). `unique_sessions`/`clients`/latencias agregados sobre varios días son aproximaciones.
- **Admin**: nuevo `PeriodSelector` global (Segmented Día/Mes/Año + `RangePicker` que conmuta a picker month/year) en la cabecera de la página, propagado a las tabs Resumen, MCP y Sesiones; hooks/servicio mandan `date_from`/`date_to`/`grain`. La sección **"Eventos más abiertos" se movió arriba de "Capas más usadas"**. El subtítulo muestra el rango activo.

⚠️ Requiere correr la migración (`make migrate`): elimina las matviews viejas (caché derivada, sin dato original) tras backfillear los rollups. No toca usuarios ni datos crudos.

---

## [api 1.28.0 / admin 1.28.0] - 2026-06-04

### Feat: elegir qué capa abre su detalle al abrir un evento

En el visor, al abrir un evento se auto-activan varias capas y el `LayerDetailModal` quedaba mostrando el de la última activada (orden arbitrario). Ahora se puede elegir, por evento, cuál capa abre su detalle.

- **`api/app/schemas/evento.py`**: `CapaRef` gana `abrir_detalle: bool = False` (alias `abrirDetalle`), válido solo para `tipo='capa'` (guards en etiqueta/categoría). Sin migración (`capas` es JSONB); el endpoint público ya re-serializa por `CapaRef`, así que se propaga al visor.
- **`admin/src/features/mapalab-eventos/components/CapasField.jsx`**: Select "Capa cuyo detalle se abre automáticamente al abrir el evento" arriba de la tabla (single-select excluyente, recorre también las capas anidadas en categorías, opción "Ninguna").
- Lado mapalab (frontend 1.68.0): `EventoMenu` abre el `LayerDetailModal` de la capa marcada tras auto-activar. Además, la apertura **automática** del modal (al abrir un evento o al activar una capa) deja de contar para la telemetría (`trackLayerDetailOpen`): solo cuenta el click explícito en el botón de detalles del panel de capas activas.

---

## [admin 1.27.0] - 2026-06-03

### Feat: panel de estadísticas de eventos + fix de la gráfica "Sesiones por día"

- **Nuevo panel "Eventos más abiertos"** en la pestaña Resumen de Estadísticas de MapaLab (`EventosTable`, hook `useEventoStats`, `getEventos`): aperturas, cierres y sesiones únicas por evento (vista `mapalab_stats_eventos`, api 1.27.0). El título se resuelve al nombre actual del evento.
- **Fix gráfica "Sesiones por día"** (`DailyChart`): las barras no se veían porque la columna contenedora no tenía altura definida y el `height: %` de cada barra colapsaba a 0. Se le fija `height: 100%` a la columna para que el porcentaje resuelva contra los 160px del contenedor. No era falta de datos.

Requiere `api 1.27.0` (endpoint `/mapalab-stats/eventos`).

---

## [api 1.27.0] - 2026-06-03

### Feat: telemetría de eventos como una sola estadística (no infla las capas)

Abrir un evento en el visor auto-activa sus capas, y cada activación emitía un `layer_toggle` que se contaba como activación de capa, inflando las estadísticas (una capa de evento acumulaba ~1 activación por sesión que abría el evento). Ahora el visor (mapalab 1.67.0) etiqueta esas auto-activaciones con `props.source='evento_open'` + `evento_id`, y el backend las trata como contexto del evento, no de la capa.

- `mapalab_stats_layers` (migración `f7a8b9c0d1e2`): el conteo de `activations` excluye `props.source='evento_open'` (con `IS DISTINCT FROM` para que los toggles manuales —sin `source`— sigan contando). El switch manual de una capa de evento sí cuenta para esa capa.
- Ingesta (`mapalab_telemetry.py`): el contador `layers_activated` de sesión aplica la misma exclusión.
- Nueva vista materializada `mapalab_stats_eventos` (aperturas/cierres/sesiones únicas por `evento_id`, ventana 30 días) registrada en `REFRESH_VIEWS`, y endpoint `GET /mapalab-stats/eventos` (`EventoStatRow`, resuelve `titulo` desde la tabla `eventos`).
- La función de auto-activación del visor **no cambia**: las capas se siguen prendiendo igual; solo cambia cómo se contabiliza la telemetría.

Limpieza histórica de las activaciones ya infladas: heurística (borrar `layer_toggle/activar` de capas `auto-eventos-*` que co-ocurren con un `evento_open` en la misma sesión); se corre por separado en prod.

---

## [api 1.26.0] - 2026-06-03

### Fix: renombrar una capa de evento ahora sincroniza el `label` del catálogo

Al renombrar una capa asociada a un evento solo se actualizaba `evento.capas[].alias`; el catálogo (`mapalab.layers.label`, fuente del árbol de `mapalab-backend` y de las estadísticas) conservaba el valor original. Por eso una capa mostrada con su nombre nuevo en el mapa/drawer seguía apareciendo con el nombre viejo (p. ej. un número, cuando se nombró así al agregarla) en el árbol y en **Estadísticas de MapaLab**: `find_or_create_auto_leaf` fija el `label` solo al crear la auto-leaf y no se vuelve a tocar; renombrar nunca lo reescribía y no existía resync.

Nueva función `sync_auto_leaf_labels(dataengine_session, capas_json, updated_by)` en `api/app/services/layer_service.py`: recorre las capas del evento (incluidas categorías anidadas vía `_flatten_evento_capa_aliases`) y para cada auto-leaf bajo `eventos-auto` pone `label = alias` cuando difieren. Es idempotente (no escribe ni hace flush si ya coinciden). Se invoca al **crear** y **actualizar** un evento (`crear_evento`, `actualizar_evento` en `routes/eventos.py`; en update solo si `capas` viene en el cambio); cuando sincroniza algo hace `commit` en el DataEngine y dispara `notify_tree_changed()` para refrescar la caché del árbol. Sin migración (`capas` es JSONB; `mapalab.layers.label` ya existía).

Los datos ya desincronizados en producción se corrigieron por separado (UPDATE puntual de las auto-leaf de eventos + `refresh-cache`); este cambio evita que se repita.

---

## [admin 1.26.0] - 2026-06-02

### Feat: editor de avisos por capa — escalas de zoom calibradas, tamaño "Mínimo" y mejoras UX

Mejoras al editor del aviso por capa (`LayerNoticeSection`, montado en capas y en capas de evento vía `NoticeStandalone`/`CapasField`).

- **Control de zoom como slider de rango reutilizable** (`shared/components/ZoomRangeField` + `shared/utils/zoomScale`): reemplaza los dos `InputNumber` mín/máx por un `Slider` de rango con marcas semánticas (Estado · Municipio · Ciudad · Colonia · Calle). Elimina la confusión de "mayor nivel = más acercado" y hace imposible invertir mín/máx. Modos `range` (aviso) y `single` (reutilizado en el zoom inicial del playground de API keys). Se quitaron los botones "Tomar zoom como mín/máx" del editor de punto (`NoticeAnchorField`) — origen de los `zoomRange` invertidos —; el rango se define sólo con el slider, con paso de 1 nivel (consistente con el redondeo a entero del visor).
- **Escalas calibradas al rango real del visor**: el slider va de `8` a `18` (antes 0–20), alineado a `minZoom 8` / `maxZoom 18` de MapaLab. Antes, el tramo 0–8 era inalcanzable y cualquier rango que lo incluyera se veía siempre. La lectura normaliza `min/max` para mostrar bien datos legacy invertidos.
- **Tamaño "Mínimo"** (`compact`) en el selector de tamaño del aviso anclado.
- **Botón "Guardar aviso" sticky** en el drawer, con el `top` de la vista previa calculado a partir de la altura real de la barra (no se traslapan); desactivado en mobile.
- Se quitó el banner contextual "Mensaje contextual de capa" del editor.

Requiere `api 1.25.0` (valor `compact` en `NoticeSize`). El visor de MapaLab (`1.66.0`) tolera rangos invertidos y renderiza el tamaño `compact`.

---

## [api 1.25.0] - 2026-06-02

### Feat: tamaño `compact` en avisos por capa

`NoticeSize` (`api/app/schemas/layer.py`) acepta el nuevo valor `"compact"` además de `small`/`medium`/`large`, para el tamaño "Mínimo" del editor (admin 1.26.0). Cambio aditivo y retrocompatible: los avisos existentes conservan su tamaño.

---

## [admin 1.25.0] - 2026-06-02

### Feat: desactivar items del Home de MapaLab sin eliminarlos (Guía, Opciones, Preguntas y Subtemas)

En el editor del Inicio de MapaLab (`HomePage` → secciones `guide`, `select`, `faq` y los subtemas de `topics`) cada item gana un toggle "Activo" que lo oculta del home público sin removerlo de la sección: sigue editable en el admin y se vuelve a mostrar con un clic. Resuelve el caso de querer "apagar" temporalmente un paso de la guía, una opción, una pregunta o un subtema (p. ej. mientras se resuelve un dato) sin perder su configuración ni su orden. Banner, Temas y Video ya lo permitían vía su `Switch` "Activo".

- **`admin/src/features/mapalab-home/components/sectionEditors.jsx`**: `GuideEditor`, `SelectEditor` y `FaqEditor` agregan un `Form.Item` con `Switch` "Activo"; `SubtopicEditor` agrega el mismo toggle por subtema. `ItemListEditor` acepta una prop `newItemDefaults` para que los items nuevos de esas secciones nazcan activos (`activo: true`), igual que el subtema nuevo. Banner/Temas/Video conservan su comportamiento previo.

Sin migración: el payload de las secciones es JSON y el flag viaja dentro de cada item. Los datos existentes (sin el campo) se interpretan como activos. Requiere `api 1.24.0` para que el flag se persista y el visor de MapaLab (`1.65.0`) para que se filtre del home público.

---

## [api 1.24.0] - 2026-06-02

### Feat: campo `activo` en items de secciones del Home de MapaLab

Soporta el nuevo toggle "Activo" del editor del Inicio (admin 1.25.0): un paso de guía, opción, pregunta o subtema marcado como inactivo sigue persistido en la sección pero no se muestra al público.

- **`api/app/schemas/home_section.py`**: `GuideItem`, `SelectItem`, `FaqItem` y `SubtopicItem` ganan `activo: bool = True`. Se serializa en `HomeSectionResponse` (editor admin) y en `HomePublicResponse` (home público), de modo que el visor recibe el flag por item.

Sin migración (`payload_published`/`payload_draft` son JSON). El default `True` mantiene visible todo el contenido existente que no traía el campo. El filtrado efectivo lo hace el visor de MapaLab (1.65.0).

---

## [admin 1.24.0] - 2026-06-01

### Feat: ocultar capas dentro de un evento sin quitarlas de la lista

En el editor de Eventos (`CapasField`), cada fila (capa, etiqueta o categoría) tiene ahora un toggle "Visible" que la oculta del visor público sin removerla del evento: sigue editable en el admin y se puede volver a mostrar con un clic. Resuelve el caso de querer "apagar" temporalmente una capa de una campaña (p. ej. mientras se prepara su contenido o se valida un dato) sin perder su configuración ni su orden.

- **`admin/src/features/mapalab-eventos/components/capasTableColumns.jsx`**: nueva columna "Visible" con un `Switch` (íconos `EyeOutlined`/`EyeInvisibleOutlined`) que escribe `oculto` vía `onUpdate(idx, { oculto })`. Aplica a los tres tipos de fila. Las filas ocultas muestran un tag naranja "Oculto" junto a su tag de tipo.
- **`admin/src/features/mapalab-eventos/pages/EventoEditPage.jsx`**: `normalizeCapas` preserva `oculto` al cargar el evento (antes reconstruía cada fila campo por campo y lo habría descartado), tanto en capas/etiquetas como en categorías.

Sin migración: `capas` es JSONB y el flag viaja dentro de cada `CapaRef`. Requiere el backend `api 1.23.0` para que las capas ocultas se filtren del payload público.

---

## [api 1.23.0] - 2026-06-01

### Feat: campo `oculto` en `CapaRef` + filtrado en el listado y preview público de eventos

Soporta el nuevo control "Visible" del editor de Eventos (admin 1.24.0): una capa marcada como oculta sigue persistida en el evento pero no se muestra al público.

- **`api/app/schemas/evento.py`**: `CapaRef` gana `oculto: bool = False`. `EventoPublicResponse` (que usan tanto `GET /api/mapalab/eventos` como `GET /api/administrador/eventos/{id}/preview`) filtra recursivamente las entradas con `oculto=true` — incluidas las capas dentro de una categoría, y descartando categorías/etiquetas ocultas con todo su subárbol. `EventoResponse` (editor admin) las conserva intactas.

Sin migración (`capas` es JSONB). El cache versionado en Redis ya se invalida en cada write del evento, así que el cambio de visibilidad se refleja en el siguiente poll del visor sin trabajo extra. Cubierto por 2 tests nuevos en `tests/test_eventos_validation.py`.

---

## [api 1.22.0] - 2026-06-01

### Perf + resiliencia: `/sistema/plataformas` paralelizado y engine de DataEngine con `connect_timeout`

Origen: alertas `HighLatency` en producción mostraban p95 ~4.9s en mariachi-api. El `topk` por handler señaló `/api/administrador/sistema/plataformas` como el cuello de botella (~10× sobre el resto). Causa: health-checks secuenciales a 7 servicios vecinos, agravado por un puerto de DataEngine aún no abierto en prod (los probes/conexiones colgaban).

#### `/sistema/plataformas` paralelizado

- **`api/app/api/routes/sistema.py`**: los probes pasaban por un loop secuencial con `httpx.Client` **síncrono** dentro de un `async def` — el tiempo total era la suma de los 7 probes (hasta 14s con 2 o 3 lentos) y además bloqueaba el event loop del worker. Ahora `_probe_ontoy`/`_probe_http_health` son `async` sobre un `httpx.AsyncClient` compartido, el probe de DataEngine (SQL síncrono) corre en `asyncio.to_thread`, y los 8 se lanzan con `asyncio.gather`. El tiempo total pasa a ser ~el del probe más lento (≈timeout 2s en el peor caso) en vez de la suma. Contrato de respuesta sin cambios (mismo JSON por plataforma).

#### Engine de DataEngine endurecido

- **`api/app/core/database.py`** + **`api/app/core/settings.py`**: el engine secundario tenía `pool_pre_ping=True` pero **sin `connect_timeout`**. Con un puerto filtrado (firewall que DROPea), el `connect()` de libpq quedaba colgado durante las retransmisiones de TCP SYN del SO, y el pre-ping reintentaba (duplicando el cuelgue) en cada request que tocaba DataEngine (`/layers/*`, `/eventos`, `/geoserver/workspaces`). Se agregó `connect_args={"connect_timeout": DATAENGINE_CONNECT_TIMEOUT}` (default 3s) + `pool_recycle=DATAENGINE_POOL_RECYCLE` (default 1800s). Ahora un DataEngine inalcanzable degrada de forma controlada (falla en ~3s) en lugar de colgar el worker. Nuevos settings con default sensato (no requieren `.env`).

Sin cambios de contrato ni de schema. El bump es solo de api.

---

## [admin 1.23.0] - 2026-06-01

### Feat: edición de capas de eventos desde el árbol + tab "Aviso" en el drawer de contenido

Dos fixes en el flujo de edición de capas asociadas a eventos de MapaLab.

#### Edición de capas de eventos desde la pestaña "Eventos" del árbol

- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: al hacer click sobre una capa dentro de la pestaña "Eventos" del árbol de capas, antes se navegaba a `/mapalab/layers/<id>/edit`, pero el tab activo del árbol permanecía en "Eventos" (que no monta el editor inline) y las auto-leaves bajo `eventos-auto` están filtradas de `catalogTreeData`, así que el editor nunca se mostraba: el click no hacía nada visible. Ahora el branch de leaf (`/^evento-\d+(?:-cat-\d+)?-cap-\d+-(.+)$/`) abre el `LayerContentDrawer` con `setEventoLayerId(leaf.id)` en lugar de navegar — mismo patrón que ya usa `CapasField` en el editor del evento. La navegación de capas normales del catálogo no cambia.

#### Tab "Aviso" en el `LayerContentDrawer`

- **`admin/src/features/mapalab-layers/components/layersEditor/NoticeStandalone.jsx`** (nuevo): editor autocontenido del aviso de capa (espejo de `InfoboxStandalone`). Carga `layer.notice`, lo edita con `LayerNoticeSection` resolviendo el `geoserverWorkspace` real desde `listGeoserverWorkspaces`, y lo guarda con `updateLayer(id, { notice })` (PUT parcial: `update_layer` usa `exclude_unset=True`, no toca otros campos).
- **`admin/src/features/mapalab-layers/components/LayerContentDrawer.jsx`**: se agregó la pestaña "Aviso" entre "Tarjeta" y "Metadatos", homologando el orden de tabs de `LayerEditPage`. Como `CapasField` (editor del evento) reusa este drawer, la tab aparece también ahí.

Sin cambios de backend ni de schema: `LayerUpdate.notice` ya existía y la edición del aviso usa la superficie de `updateLayer` que ya consumían las otras tabs del drawer.

---

## [admin 1.22.0] - 2026-05-29

### Feat: logo del banner respeta el `logoUrl` por item + descripción y CTA opcionales

Iteración sobre el banner del home (introducido en `[1.20.0]`). Dos cambios de UX que faltaban para que cada banner del carrusel se sienta realmente independiente.

#### Logo del banner ahora respeta el `logoUrl` configurado por item

- **`admin/src/features/mapalab-home/components/sectionEditors.jsx`**: el `Form.Item` de `logo_url` cambia su label a "Logo del banner (opcional)" y agrega `help` aclarando que se muestra arriba del título en mobile y a la izquierda en desktop XXL. Antes el label decía "Logo del visor (icono MapaLab)", lo que sugería que era un logo institucional global y no por banner.
- Lado mapalab (v1.59.0): hasta antes, el render en mobile (`<768px`) y tablet hardcodeaba `<Logo name="mapalab" variant="dark" ...>` aunque cada banner traía su propio `logoUrl`. Ahora el bloque mobile aplica el mismo patrón condicional que el bloque de desktop XXL: si `activeBanner.logoUrl` está set, renderiza `<img src={activeBanner.logoUrl}>`; si no, cae al `<Logo>` bundled. Así un banner de evento que sube su propio logo lo ve reflejado en todos los breakpoints, no solo en el área desktop XXL.

#### Descripción y CTA opcionales

- **`admin/.../sectionEditors.jsx`**: labels actualizados a "Descripción (opcional)", "Texto del botón (opcional)" y "Enlace del botón (opcional)", con `help` que explica el comportamiento (botón solo aparece si están los dos campos del CTA).
- El schema (`BannerItem` en `api/app/schemas/home_section.py`) ya aceptaba `''` como default en estos 3 campos — no requirió cambios backend. El bump es solo de admin.
- Lado mapalab (v1.59.0): el `banners.map` deja de hacer fallback al texto del banner bundled cuando descripción/CTA están vacíos (antes: `api.descripcion || fallback.content.description`; ahora: `api.descripcion || ''`). El render del `<p>` y del `<Link>` se vuelve condicional: el párrafo solo se monta si hay descripción; el `<Link>` solo se monta si hay label Y href. Esto permite banners minimalistas con solo título e imagen de fondo (ej. anuncios cortos de evento).

---

## [1.21.0] - 2026-05-28

### Resuelve los hallazgos U9, U10, U11, G2, A3, A4 del documento de pruebas SIEEJ + endurecimiento de la política de contraseñas

Se atendieron los casos numerados del documento de pruebas del tester (28 de mayo de 2026). El hilo principal es **liberar el flujo end-to-end** para que una dependencia externa pueda llenar un formulario de SIEEJ: estaba bloqueado por tres bugs distintos (no podía cambiar contraseña, no se podían asignar usuarios/grupos, el admin no veía mensajes de error claros).

#### Feat: política de contraseñas unificada mariachi/sieej (api 1.21.0)

- **`api/app/core/password_policy.py`** (nuevo): `validate_password_strength(pwd)` con la misma política que SIEEJ usa en su `passwordStrength.js`: longitud mínima 8 (obligatorio) y al menos 3 de las 4 categorías (mayús+minús, dígitos, especiales). Antes, mariachi solo validaba `min_length=8` y SIEEJ rechazaba al primer login porque pedía más.
- **`api/app/schemas/user.py`**: `UsuarioCreate.password` y `PasswordChange.new_password` ahora usan `StrongPassword = Annotated[str, AfterValidator(validate_password_strength)]`. El detalle del 422 indica el motivo específico (longitud o reglas) en lugar del genérico de Pydantic.
- **`api/app/api/routes/users.py::generate_temp_password`**: re-escrita para garantizar por construcción que la contraseña temporal siempre cumple la política (1 minúscula + 1 mayúscula + 1 dígito + 1 especial + relleno aleatorio, barajado con `secrets.SystemRandom().shuffle`). Antes solo usaba `ascii_letters + digits`, así que una contraseña temporal podía no cumplir la nueva política.

#### Feat: pre-fetch del CSRF al cargar sesión (admin 1.21.0)

Complementa el auto-recovery reactivo que ya existía en el interceptor de axios. Antes, en cualquier reload o pestaña nueva con cookie válida, la primera mutación devolvía 403 y se reintentaba transparentemente; ahora ni siquiera dispara el 403.

- **`admin/src/shared/services/api.js`**: `refreshCsrfToken` pasa de función privada del módulo a `export const` para poder llamarse desde fuera del interceptor.
- **`admin/src/shared/contexts/AuthContext.jsx`**: tras un `/autenticacion/perfil` exitoso, si `sessionStorage['csrf_token']` está vacío, llama `refreshCsrfToken()` y guarda el token. Aplicado tanto en el `useEffect` de bootstrap como en `checkAuth` para mantener consistencia.

#### Feat: indicador visual de fortaleza de contraseña (admin 1.21.0)

Replica el sistema que SIEEJ ya tenía en su pantalla "Define tu contraseña" para que el admin del CMS no quede inferior cuando crea usuarios o cambia su propia contraseña. La inconsistencia anterior generaba el escenario de admin creando contraseñas de 8 caracteres planos que SIEEJ rechazaba al primer login del nuevo usuario.

- **`admin/src/shared/helpers/passwordStrength.js`** (nuevo): copia exacta de `computePasswordStrength` y `isStrongEnough` de SIEEJ. Score 0–4 según cuántas reglas cumplen (length, case, number, special).
- **`admin/src/shared/components/PasswordStrengthIndicator.jsx`** (nuevo): barra de 4 segmentos coloreados (gris → rojo → naranja → amarillo → verde según score) + checklist con icono check/circle por regla. Usa colores inline equivalentes al SIEEJ pero con iconos de Ant Design (`CheckCircleFilled`, `MinusCircleOutlined`) para integrarse al CMS sin Tailwind.
- **`admin/src/features/users/pages/UsersPage.jsx`**:
    - Campo `password` ahora tiene `validator` custom con `isStrongEnough` que muestra el mensaje "La contraseña no cumple con los requisitos mínimos." antes de enviar al backend.
    - `Form.useWatch('password')` alimenta el `<PasswordStrengthIndicator>` en vivo, debajo del input.
    - **`formatBackendError(error, fallback)`**: helper que parsea `error.response.data.detail`. Lista de errores Pydantic (422) → traduce `loc[-1]` a label legible (Usuario / Email / Contraseña / etc.) y los concatena con `·`. String simple (409) → muestra directo el detalle. Otros → fallback genérico. Resuelve la queja del tester (U10, U11) sobre mensajes genéricos cuando el backend ya entregaba detalle.
    - Reglas `min: 3, max: 50` para username y `max: 100` para name añadidas al `Form.Item` para no llegar al backend con valores fuera de rango y caer en 422 silencioso.
- **`admin/src/features/auth/pages/ChangePasswordPage.jsx`**: mismo patrón — `validator` con `isStrongEnough`, `Form.useWatch('new_password')` para el `<PasswordStrengthIndicator>` visible debajo del campo.

#### Fix: endpoint `/users` → `/usuarios` en service de SIEEJ (admin 1.21.0)

- **`admin/src/features/sieej-formularios/services/formulariosAdminApi.js`**: `usuariosApi.list()` pedía `/users` (inglés) cuando el router del backend está en `/usuarios` (español) — typo del que nadie se había dado cuenta porque solo se invoca al abrir el panel de Miembros o Asignaciones. Resultado documentado por el tester: "404 endpoint /users" bloqueaba G2 (agregar miembros a grupo), A3 (asignar grupos al formulario) y A4 (asignar usuarios al formulario). Una línea corrige el path. Consecuencia real: ahora se pueden asignar formularios a usuarios/grupos, lo que desbloquea el flujo end-to-end de SIEEJ.

#### Feat: botón publicar y alert de borrador en editor SIEEJ (admin 1.21.0)

Surgió del flujo de pruebas: el tester asignó un formulario a un externo y el formulario no aparecía en SIEEJ porque seguía en `borrador`. El listado público (`FormulariosDinamicosService.listar_visibles`) filtra por `estado == 'activo'`, así que un admin de buena fe puede asignar usuarios sin entender por qué no ven nada.

- **`admin/src/features/sieej-formularios/pages/FormularioEditorPage.jsx`**:
    - Header del editor pasa de `Typography.Title` solo a un `Flex` con título + meta a la izquierda y un botón `Publicar formulario` a la derecha cuando `estado === 'borrador'`.
    - El botón dispara `Modal.confirm` con el copy "Los usuarios asignados podrán verlo y responderlo a partir de este momento. Asegúrate de que la definición y las asignaciones estén listas." → llama `formulariosApi.publicar(id)` → actualiza el estado in-place via `setFormulario(updated)` (no recarga la página, el botón se oculta y el Tag cambia de color automáticamente).
    - Estado del formulario ahora se muestra como `<Tag>` con color (gris para `borrador`, verde para `activo`, rojo para `cerrado`) en vez de texto plano. Mucho más visible que la línea anterior `slug: x · estado: borrador · v1`.
- **`admin/src/features/sieej-formularios/components/AsignacionesEditor.jsx`**: cuando `formulario.estado === 'borrador'` se renderiza un `Alert` tipo `warning` arriba del editor que explica que los usuarios asignados no verán el formulario hasta publicarlo, con referencia explícita al botón "Publicar formulario" del header. Cuando el formulario ya está publicado, el Alert desaparece automáticamente — solo se muestra cuando hay riesgo de configurar en vano.

#### Decisiones tomadas en este release

- **Política de contraseñas igual en ambos lados, no más estricta en uno**: SIEEJ ya pedía las 4 reglas con `score >= 3`; mariachi solo pedía 8 chars. Subir mariachi a la política de SIEEJ es la dirección correcta (no bajar SIEEJ). Quien crea un usuario en el admin ya no genera contraseñas que SIEEJ rechazará al primer login.
- **Pre-fetch + auto-recovery en lugar de solo uno**: el reactivo arregla 403 en mutaciones después del primer fallo, pero deja un 403 visible en logs (ruido para monitoring). El pre-fetch lo evita anticipadamente. Paridad entre admin y SIEEJ en este aspecto.
- **`/users` → `/usuarios`**: típico typo de un service auto-completado en inglés. Se considera bug bloqueante porque rompía la única forma de hacer asignaciones desde el CMS.
- **Botón publicar al lado del editor, no solo en la lista**: WordPress, Strapi, Sanity tienen este patrón. Con `Modal.confirm` y el botón visible solo en estado `borrador` no hay riesgo de publicar accidentalmente.

---

## [1.20.0] - 2026-05-28

### Feat: banner del home con fondo personalizable (imagen + gradient editable)

El banner del home de MapaLab solo permitía cambiar el mockup/ilustración y el texto; el fondo estaba fijo al gradiente morado IIEG (`#5C2472` → `#963CBA` 359°) en código del visor. Ahora cada item del banner puede tener su propio fondo, configurable desde el admin del CMS y respondiendo distinto en mobile, tablet y desktop sin recortes feos en pantallas chicas.

#### Schema `BannerItem` extendido (api 1.20.0)

- **`api/app/schemas/home_section.py::BannerItem`**: 5 campos string opcionales nuevos.
    - `imagen_url_mobile` (alias `imagenUrlMobile`) — imagen de fondo para `<768px`.
    - `imagen_url_desktop` (alias `imagenUrlDesktop`) — imagen de fondo full-width para tablet/desktop.
    - `gradient_from` / `gradient_to` (aliases `gradientFrom`, `gradientTo`) — colores hex del gradiente cuando NO hay imagen de fondo.
    - `gradient_angle` (alias `gradientAngle`) — dirección CSS del gradiente (ej. `'135deg'`).
- Los 3 campos de imagen comparten `_store_relative` (validator `mode='before'`) y `_expose_absolute` (serializer JSON) con `imagen_url` y `logo_url`, así el `to_relative`/`to_absolute` del acervo persiste paths relativos y devuelve URLs absolutas en el endpoint público.
- Sin migración Alembic: el payload se guarda como JSON en `home_sections.payload_published`/`payload_draft`. Banners existentes reciben `''` como default en los campos nuevos al validar, sin perder datos.
- El campo `imagen_url` mantiene su semántica histórica (mockup flotante a la derecha en desktop + fondo en tablet, comportamiento legacy del seed `b8c9d0e1f2a3`).

#### Editor admin con 3 slots de imagen + gradiente editable (admin 1.20.0)

- **`admin/src/features/mapalab-home/components/sectionEditors.jsx::BannerEditor`**: tres `ImageUrlField` separados con `help` que explica para qué sirve cada uno y qué pasa si se deja vacío.
    - "Mockup/ilustración (opcional)" → `imagen_url` (legacy).
    - "Fondo desktop (opcional)" → `imagen_url_desktop`.
    - "Fondo mobile (opcional)" → `imagen_url_mobile`.
- Dos `ColorPicker` (format `hex`, `showText`, `allowClear`) para `gradient_from` y `gradient_to` con `getValueFromEvent` que extrae el hex string del Color object al cambiar (el ColorPicker recibe string y emite objeto).
- `Select` con 9 ángulos prácticos pre-etiquetados con dirección visual (`0° — vertical, abajo → arriba`, `90° — horizontal, izq → der`, `135° — diagonal ↘`, etc.) para `gradient_angle`. `allowClear` vuelve al default IIEG (`359deg`).
- Texto de `help` aclara en los 3 campos de gradiente: "Solo aplica si no hay imagen de fondo. Vacío = morado IIEG".

#### Visor: lógica condicional por breakpoint con scrim oscuro fijo (mapalab 1.57.0)

`mapalab/frontend/src/pages/home/components/Header.jsx`:

- `banners.map` ahora propaga `mobileBgUrl`, `desktopBgUrl` y un objeto `gradient` con merge contra el fallback de `bannerConfig.js` (`api.gradientFrom || fallback.gradient.from`, etc.). El `image.src` deja de hacer fallback al bundled — queda vacío si la API no manda `imagenUrl`, y el mockup flotante de desktop se renderiza solo si hay valor (`{mockupSrc && <div>…</div>}`).
- 3 `mobileStyle`/`tableStyle`/`desktopStyle` con la misma forma: **si hay imagen → `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(bg)` con `cover, cover`** (scrim oscuro fijo independiente del gradient editable para legibilidad del texto blanco encima). Si no hay imagen → `linear-gradient(angle, from, to)` con el `activeBanner.gradient` editable.
- `tableStyle` mantiene un nivel intermedio para no romper el seed: si no hay `desktopBgUrl`, cae al comportamiento legacy donde `imagen_url` (mockup) se usaba como fondo con el gradient como overlay (`E6` alpha).
- El `mobileStyle` que tenía colores hardcoded (`rgba(92,36,114,0.9)`, `359deg`) ahora usa `activeBanner.gradient` igual que desktop. Los 3 breakpoints respetan el override del editor.

#### Decisiones tomadas con el editor

- **Imagen siempre gana sobre gradient editable**: cuando hay imagen, el gradient de colores se ignora y solo se aplica un velo oscuro fijo. Más predecible que dos controles que compiten.
- **3 imágenes opcionales independientes** en vez de una sola con `object-position`. Mobile portrait y desktop landscape son composiciones distintas; recortar la misma imagen en ambos casi siempre se ve mal.
- **`imagen_url` no se renombró ni se migró**: sigue siendo el mockup flotante. Agregar dos campos nuevos preserva todo el seed y los banners ya configurados sin tocar BD.

---

## [admin 1.19.2] - 2026-05-28

### Fix: `restore-tarjetitas` rompía por mismatch de orden entre host y contenedor + búsqueda en `restore/`

`scripts/dataengine-apply-infobox.sh` fallaba con `comm: file 1/2 is not in sorted order` al listar capas faltantes. La causa: `INCOMING_KEYS` se ordenaba con el locale del host (`en_US.UTF-8`) mientras la lista de ids existentes salía del `sort` dentro del contenedor `postgres:18-alpine` (locale `C`); luego `comm` comparaba ambos con un orden distinto. Ahora ambos lados ordenan con `LC_ALL=C` y el `comm` también corre bajo `LC_ALL=C`, así que el bloque "Faltantes en destino" se imprime correctamente y muestra cuántas capas se omitirán.

`scripts/pick-tarjetita.sh` ahora sigue el mismo patrón que `postgres-restore.sh`: busca primero en `restore/` (archivos curados, listos para aplicar) y cae a `backups/tarjetitas/` (snapshots históricos) solo si la primera está vacía. Si ambas están vacías, sugiere colocar el archivo en `restore/` en lugar de pedir un backup nuevo.

---

## [admin 1.19.1] - 2026-05-28

### Perf: borrador del editor de Home solo se carga para el tab activo

`HomePage.jsx > SectionTab` montaba un `useResourceDraft` por cada sección de Home con `enabled: true`. Eso disparaba la suscripción de borrador (poll + websocket según `useResourceDraft`) para todas las secciones aunque el admin estuviera viendo solo una. Cambio: `enabled: active || reviewMode`. La pestaña activa sigue trayendo borrador en vivo; la pantalla de review (que renderiza todas las secciones para previsualizar el changeset completo) también lo necesita. Las inactivas quedan dormidas y se reactivan al click del tab.

---

## [admin 1.19.0] - 2026-05-26

### Editor de capas: filtro por municipio con picker inteligente de columna

Sincronización con mapalab 1.50.0 que ahora aplica filtros CQL por capa según metadata declarada por el admin. La UI nueva en `LayerEditPage` permite configurar `hasMunicipio + municipioField + municipioFieldType` sin necesidad de SQL manual ni conocer los nombres exactos de columnas de la tabla.

#### Agregado

- **`features/mapalab-layers/components/MunicipioFieldPicker.jsx`** (nuevo):
  - Dropdown con las columnas reales de la tabla del WMS, obtenidas vía el endpoint existente `/geoserver/workspaces/{alias}/layers/{layer}/fields?include_samples=true` (reusa el patrón de `CqlFilterBuilder`).
  - Filtra solo columnas de tipo `string`, `integer`, `number`.
  - Auto-detección del `municipioFieldType` analizando muestras de la columna: ≥80% match `/^14\d{3}$/` → `clave`; ≥80% texto alfabético → `nombre`. Preselecciona el form field, override manual disponible.
  - Avisos en tiempo real con `<Alert>` de antd: success verde con tipo detectado + confianza; warning amarillo si la columna no parece ser de municipio; info azul cuando el nodo no tiene `geoserver_layer` propio y la config aplicará a N descendientes.
  - Resolución de columnas desde **descendientes** cuando el nodo siendo editado es un `group`/`label` sin `geoserver_layer` propio (caso real: `establecimientos_salud` group con hijos labels y nietos leafs). Función `collectDescendantLeavesWithWms` busca el primer descendiente con WMS y cuenta cuántos hereda.
  - Fallback a input modo `tags` si el endpoint de fields falla.
- **`features/mapalab-layers/constants/nodeTypes.js`**: nuevo entry `municipioFilter: ['group', 'leaf']` en `FIELD_VISIBILITY` y constante `MUNICIPIO_FIELD_TYPE_OPTIONS`.
- **`features/mapalab-layers/pages/LayerEditPage.jsx`**: sección "Filtro por municipio" en el tab Identidad con Switch `hasMunicipio` + `MunicipioFieldPicker` cuando está activo. Pasa `rawTree` y `layerId` al picker para la resolución de descendientes. `populate(data)` mapea los 3 campos al state del form.

---

## [api 1.19.0] - 2026-05-26

### Schema: `municipio_field_type` para LayerBase y LayerUpdate

- **`api/app/models/layer.py`**: nueva columna `municipio_field_type = Column(String(20), nullable=True)`. Backed por la migration `0017_layer_municipio_field_type` en dataengine.
- **`api/app/schemas/layer.py`**: campo agregado a `LayerBase` (con `max_length=20, serialization_alias="municipioFieldType"`) y a `LayerUpdate` (nullable). El service `update_layer` ya hacía `setattr` genérico sobre el payload, así que persiste sin cambios adicionales.

---

## [admin 1.18.1] - 2026-05-26

### Corregido: endpoints de `/layers/highlight` ahora responden y aceptan el body

Tres bugs encadenados que impedían usar el modal "Configuración global del resaltado" introducido en `admin 1.17.0`:

1. **Path duplicado**: `useHighlightBulk.js` definía `BASE = '/administrador/layers/highlight'`, pero el `api` client de mariachi-admin ya incluye `/administrador/` en su baseURL. Resultado: `/api/administrador/administrador/layers/highlight/stats` → 404. Cambio: `BASE = '/layers/highlight'` (consistente con `useLayerTreeAdmin.js`).

2. **Prefix del router faltaba `/layers`**: `APIRouter(prefix='/highlight')` resultaba en `/administrador/highlight/...` cuando los hermanos (`crud.py`, `aliases.py`) usan `prefix='/layers'`. Cambio: `APIRouter(prefix='/layers/highlight')`.

3. **Body camelCase rechazado con 422**: `HighlightBulkApplyBody`, `HighlightBulkRestoreBody`, `HighlightResetBody`, `HighlightBulkSnapshot` heredaban de `BaseModel` con solo `serialization_alias`. Eso convierte snake_case → camelCase **al serializar respuestas**, pero NO al **deserializar requests** — Pydantic esperaba `apply_to`/`theme_ids`/`dry_run` en snake y rechazaba el body camelCase del frontend. Cambio: heredan de `CamelCaseInput` (el mixin del repo con `model_validator` para normalizar camelCase → snake_case en input). El `serialization_alias` se mantiene para que la respuesta siga siendo camelCase.

#### Que cambio

- **`admin/src/features/mapalab-layers/hooks/useHighlightBulk.js`**: `BASE` sin prefijo `/administrador/`.
- **`api/app/api/routes/layers/highlight.py`**: prefix corregido a `/layers/highlight`.
- **`api/app/schemas/layer.py`**: los 4 schemas de input ahora heredan de `CamelCaseInput`.

---

## [admin 1.17.2] - 2026-05-25

### Sincronización con mapalab 1.49.0: 2 tools MCP de municipios + probe `resolve_municipios`

mapalab 1.49.0 agregó al MCP los tools `list_municipios` y `resolve_municipios` para que un agente conversacional pueda activar el modo Vista por municipio en los shares. El tab "Servidor MCP" de `/administrador/documentacion` se actualiza para reflejar los 14 tools y el playground gana un probe nuevo para probar la búsqueda fuzzy.

- **`McpTopic.jsx`**: 2 entradas nuevas en el array `TOOLS` (router nuevo `municipios` con color cyan). Las descripciones de `create_single_share` y `create_swipe_share` ahora mencionan que aceptan `municipios`.
- **`McpPlayground.jsx`**: probe nuevo `resolve_municipios` con default `query: "guadalajara"`, `limit: 5`. El default de `create_single_share` se actualizó para incluir `municipios: {source:"iieg", selected:["14039","14120"]}` y view zoom 11 sobre el área metropolitana — el admin puede probar el flujo end-to-end y ver el mapa embebido filtrado a Guadalajara + Zapopan si tiene API key pegada.

Sin cambios en backend de mariachi.

---

## [admin 1.17.1] - 2026-05-25

### Sincronización con mapalab 1.48.1: tabla de tools MCP 14 → 12

mapalab 1.48.1 quitó del MCP los tools `refresh_layer_tree_cache` e `invalidate_layer_tree_memory_cache` porque siempre devolvían 401 (los endpoints REST subyacentes requieren `X-Internal-Token` que el MCP no inyecta). El tab "Servidor MCP" de `/administrador/documentacion` se actualiza para reflejar la lista real.

- **`admin/src/features/documentacion/topics/McpTopic.jsx`**: removidas las 2 entradas correspondientes del array `TOOLS`. El `<Tag>` de count en el header de la Card ahora muestra **12** automáticamente.

Sin cambios en backend ni en otros componentes. El playground sigue funcional — el `tools/list` que muestra el MCP real ya devuelve 12 desde el restart del container `mapalab-mcp`.

---

## [admin 1.17.0] - 2026-05-25

### Agregado: configuración global del resaltado (color custom hex + bulk apply + undo)

#### Botón engranaje en el header del árbol

Nuevo botón circular con ícono ⚙ al lado derecho del título "Capas MapaLab" en la página `/administrador/mapalab/layers`. Abre el modal "Configuración global del resaltado". Visible para admins.

#### Color custom hex en `LayerHighlightField`

Cuarta opción "Personalizado (hex)" en el `Radio.Group` de color (junto a morado/naranja/sombreado). Al seleccionarla aparece un `<ColorPicker>` de antd inline; el valor se persiste como hex `#RRGGBB` en `mapalab.layers.highlight_color` (la columna ya es `VARCHAR(20)`). El visor lee la cadena y, si matchea el patrón hex, genera el preset dinámicamente: stroke con ese color exacto y fill con alpha 15% (`${hex}26`).

`api/app/schemas/layer.py`: `HighlightColor` cambió de `Literal["morado","naranja","sombreado"]` a `str` con validator que acepta los presets o un hex `#RRGGBB` (normalizado a uppercase). Mensaje de error específico si recibe algo inválido.

#### Modal "Configuración global del resaltado"

Tres secciones:

1. **Estado actual** (`GET /administrador/layers/highlight/stats`): contadores por color y por forma, más métricas clave (`fully_default`, `with_color_override`, `with_shape_override`, `with_custom_hex`). Botón "Recargar" para refresh manual.

2. **Aplicar masivo**: selectores de color (con opción de mantener el actual de cada capa) + forma (idem) + `apply_to` (`defaults` no toca overrides; `all` sobrescribe todo) + filtro multi-select por temas. Mientras el admin ajusta, un `useEffect` lanza un dry-run (`POST .../bulk` con `dryRun: true`) y muestra el count: "Vas a actualizar N capas". El botón "Aplicar" abre un modal de confirmación con el resumen del cambio antes de ejecutar.

3. **Restablecer todas a default**: botón danger que pone `highlight_color` y `highlight_shape` en `NULL` para todas las leaves del scope (con filtro de tema opcional). Modal de confirmación previo. Internamente usa `POST .../highlight/reset`.

#### Deshacer cambio masivo

Después de un bulk apply o reset, la `notification.success` incluye un botón "Deshacer" disponible por 5 minutos. La acción restaura el estado anterior exacto de cada capa afectada (color + shape) usando el snapshot que el backend devuelve en la respuesta (`affected: number, snapshot: Array<{layerId, color, shape}>`). El snapshot se guarda en memoria del hook `useHighlightBulk` (no se persiste, vive solo en la sesión activa).

`POST /administrador/layers/highlight/restore` recibe el snapshot y restaura.

#### Endpoints nuevos

- `GET  /administrador/layers/highlight/stats` → `HighlightStats`.
- `POST /administrador/layers/highlight/bulk` body `{ color, shape, applyTo, themeIds, dryRun }` → `{ affected, snapshot }`.
- `POST /administrador/layers/highlight/restore` body `{ snapshot }` → `{ affected }`.
- `POST /administrador/layers/highlight/reset` body `{ themeIds, dryRun }` → `{ affected, snapshot }`.

Todos requieren admin + CSRF + write rate limit. El bulk usa CTE recursivo (`WITH RECURSIVE`) para resolver los descendientes leaf del filtro de temas. Cada operación dispara `notify_tree_changed` para invalidar el cache del visor.

#### Que cambio

- **`api/app/schemas/layer.py`**: `HighlightColor` ahora libre `str` validado. Tipos nuevos `HighlightStats`, `HighlightBulkApplyBody`, `HighlightBulkApplyResult`, `HighlightBulkSnapshot`, `HighlightBulkRestoreBody`, `HighlightResetBody`.
- **`api/app/services/layer_service.py`**: `get_highlight_stats`, `bulk_apply_highlight`, `restore_highlight_snapshot`, `reset_highlight`, helpers `_collect_descendant_leaves` y `_highlight_target_leaves`.
- **`api/app/api/routes/layers/highlight.py`** (nuevo): router con los 4 endpoints.
- **`api/app/api/routes/layers/__init__.py`**: include del nuevo router.
- **`admin/src/features/mapalab-layers/components/LayerHighlightGlobalSettings.jsx`** (nuevo): modal principal.
- **`admin/src/features/mapalab-layers/components/LayerHighlightConfirmModal.jsx`** (nuevo): modales de confirmación apply + reset extraídos.
- **`admin/src/features/mapalab-layers/components/layersEditor/highlightConstants.js`** (nuevo): `HIGHLIGHT_COLORS`, `HIGHLIGHT_SHAPES`, `isHexHighlight`, `resolveColorEntry`.
- **`admin/src/features/mapalab-layers/components/layersEditor/highlightShared.jsx`** (nuevo): `HighlightSwatch` componente.
- **`admin/src/features/mapalab-layers/components/layersEditor/LayerHighlightField.jsx`**: imports actualizados; nueva opción "Personalizado" con `ColorPicker` inline.
- **`admin/src/features/mapalab-layers/hooks/useHighlightBulk.js`** (nuevo): wrapper de los 4 endpoints + manejo del snapshot/undo con timer de 5 minutos.
- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: import del modal, estado `highlightSettingsOpen`, botón `SettingOutlined` en el header, render del modal al final.

---

## [admin 1.16.0] - 2026-05-25

### Agregado: tab "Apariencia" con resaltado de feature + DnD en editor InfoBox

#### Tab "Apariencia" (nuevo)

Nuevo tab en `/administrador/mapalab/layers` que agrupa todo lo visual de una capa/nodo. Visible para `tema`, `category`, `label`, `group` y `leaf`. Contenido condicional según `nodeType`:

- **`tema`**: mueve el campo **Icono del tema** (`TemaIconField`) que vivía en el tab "Identidad". El icono sigue siendo el SVG/PNG del sider del visor.
- **`leaf` / `group` / `category` / `label`**: nuevo control **Resaltado al hacer clic en una feature** (`LayerHighlightField`). Dos sub-controles independientes con preview en vivo cruzado:
  - **Color**: morado (default) / naranja institucional / sombreado discreto.
  - **Forma**: área + línea (default) / solo línea / sin resaltar.

Cuando se configura en un nivel ancestro (ej. `group "Establecimiento de salud"`), las leaves hijas **heredan** el resaltado automáticamente desde el visor (lo aplica `useFeatureHighlight` en mapalab). Una leaf que define sus propios `highlightColor`/`highlightShape` los gana por encima del ancestro.

`api/app/schemas/layer.py`: nuevos campos `highlight_color` (Literal `morado|naranja|sombreado`) y `highlight_shape` (Literal `area|linea|off`) con `serialization_alias` camelCase. Ambos optional, default NULL = heredar/usar default.

`api/app/services/geoserver_client.py`: `layer_exists` ahora cae a `is_layer_group` cuando la consulta a `/layers/{layer}` retorna 404. `list_fields` retorna `[]` si la capa es un layer group (no tiene feature type propio). Antes el editor petaba con 500/400 sobre capas tipo `general:limite_iieg` que son layer groups (no WFS feature types).

#### Drag-and-drop en `InfoBoxBlocksEditor`

Reemplazo del sistema de flechas ↑↓ por `@dnd-kit/sortable` en dos niveles:

1. **Bloques del cuerpo** (labelGroups, list, cards, iconText, textBlocks): arrastra el ícono ⋮⋮ en la esquina del bloque para reordenar el `blockOrder` del template.
2. **Items dentro de cada bloque** (filas de list, cards, iconText, párrafos de TextBlock): arrastra el ícono ⋮⋮ a la izquierda de cada item para reordenar.

#### Que cambio

- **`admin/src/features/mapalab-layers/components/layersEditor/LayerHighlightField.jsx`** (nuevo): dos `Radio.Group` lado a lado (color + forma) con swatches visuales que cruzan ambas dimensiones (el swatch del color refleja la forma seleccionada y viceversa).
- **`admin/src/features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor.jsx`**: imports de `@dnd-kit/{core,sortable,utilities}`, helpers `SortableBlock` / `SortableItem` / `DragHandle`, refactor de `ListBlock`/`CardsBlock`/`IconTextBlock`/`TextBlock` para envolver items en `SortableContext`.
- **`admin/src/features/mapalab-layers/constants/nodeTypes.js`**: nueva entrada en `TAB_VISIBILITY` para `apariencia` aplicable a los 5 tipos de nodo.
- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: import `LayerHighlightField`; nuevo tab `apariencia` entre `identidad` y `servicios`; campo `iconUrl` removido del tab `identidad` y reubicado en `apariencia`; `setFieldsValue` incluye `highlightColor` y `highlightShape`.
- **`api/app/models/layer.py`**: columnas `highlight_color` y `highlight_shape` en el modelo SQLAlchemy.

---

## [admin 1.15.8] - 2026-05-25

### Documentación: tema `Telemetría` separado de `Servidor MCP`

Telemetría es un tema transversal del ecosistema (hoy MCP, mañana visor, sieej, etc.), no algo específico del MCP. Se separa en su propio tema dentro de `/administrador/documentacion` para que el tab "Servidor MCP" quede enfocado y `Telemetría` pueda crecer con secciones por fuente sin volverse un mega-tab.

- **`admin/src/features/documentacion/topics/TelemetryTopic.jsx`** (nuevo): componente con intro general "Registro de eventos sin identidad…" y por ahora una Card por fuente — primera: "Servidor MCP de MapaLab — `mapalab_mcp_events`" con la tabla de 12 campos y descripción del flujo (middleware ASGI → flush 30 s → endpoint internal). Diseñado para sumar más Cards (telemetría del visor, sieej, etc.) sin reestructurar.
- **`McpTopic.jsx`**: removida la Card "Telemetría — campos persistidos…" y constantes asociadas (`FIELDS_TELEMETRY`, `FIELD_COLUMNS`). El párrafo de intro al playground menciona "Telemetría persistida en el tema `Telemetría`" para que el lector sepa a dónde ir.
- **`DocumentacionPage.jsx`**: nuevo item en `TOPICS` con `key='telemetria'`, label `Telemetría`. URL bookmarkable via `?topic=telemetria` (igual que el tema MCP existente).

`McpTopic.jsx`: 340 → 177 → 136 → **101 líneas**.

---

## [admin 1.15.7] - 2026-05-25

### Página MCP de documentación: segunda pasada de compresión

Tres recortes adicionales sobre `admin 1.15.6` para que la página quepa más cómoda:

- **Card "Endpoints / URL del MCP" eliminada** y reemplazada por un `<Paragraph copyable>` debajo de la intro: solo muestra **la URL del entorno actual** (`window.location.origin + '/mapalab/mcp'`), con botón de copia inline. Quitadas las constantes `LOCAL_MCP_URL`/`PUBLIC_MCP_URL`/`URLS`/`URL_COLUMNS` y los `buildLocalMcpUrl`/`buildPublicMcpUrl` (cada admin trabaja en su entorno; las otras URLs viven en `docs/mcp.md` del repo).
- **Alert "Playground" inicial removido** del `McpPlayground`. Era texto explicativo sobre cómo funcionan las tarjetas — los títulos de cada tarjeta ya lo dejan claro.
- **Alert "Pega una API key arriba..."** dentro de las tarjetas `create_*_share` → `<Text type="secondary">` de una línea (`Pega una mk_pub_… arriba para ver este share embebido.`). Mismo mensaje, sin la caja azul gigante que ocupaba 80 px verticales por cada tarjeta de share.

`McpTopic.jsx`: 340 → 177 → 136 líneas. La página ahora cabe casi entera en un viewport sin scrollear.

---

## [admin 1.15.6] - 2026-05-25

### Página MCP de documentación: ~48% más corta

El `McpTopic` venía con 340 líneas, varias secciones redundantes o que nadie leía en la práctica. Recortado a 177 líneas dejando solo lo accionable.

#### Quitado

- **Alert "¿Para qué sirve?"** y **Alert "Contrato robusto desde mapalab 1.40.1 + share/medición desde 1.44.0"** — texto explicativo que el lector no leía. La info relevante está en `docs/mcp.md` del repo y en el playground en vivo.
- **Sección "Cómo se usa"** completa, con los dos cards de Claude Desktop config + Python LangChain snippet. Pertenece al `docs/mcp.md` del repo (lectura por integrador externo), no al panel admin.
- **Card "Ejemplo de respuesta: search_layers"** — el playground tiene el botón "Probar" para `search_layers` que devuelve respuesta real y viva. Estático arriba era redundante.
- **Card "Características"** final con dos listas de bullets "Qué incluye / Qué NO incluye" — resumen redundante de todo lo ya explicado en otras secciones.
- **4 Cards de "Tools por router"** (metadata, periodicity, layers, shares+medición) → **1 sola tabla** con columna `Router` (con filtros nativos de Ant Table en el header). Mismo info, una sola lista ordenable.
- 3 constantes muertas: `SEARCH_EXAMPLE`, `CLIENT_DESKTOP_EXAMPLE`, `CLIENT_PY_EXAMPLE`, helper `CodeBlock`.
- Imports muertos: `Alert`, `Col`, `Divider`, `Row`.

#### Resultado

Estructura final del tab "Servidor MCP" en `/administrador/documentacion`:

1. Título + intro 1 línea
2. Card "Endpoints / URL del MCP" (sin cambios)
3. Card "Tools disponibles" con tabla consolidada filtrable por router
4. Card "Telemetría — campos persistidos" (sin cambios)
5. Sección "Probar endpoints" + `<McpPlayground />` (sin cambios)

Sin pérdida de info accionable. Toda la info quitada vive en `docs/mcp.md` del repo de mapalab, que es la referencia canónica para integradores.

---

## [admin 1.15.5] - 2026-05-25

### Sider sticky al viewport: "Documentación" siempre visible al fondo + menú normal scrolleable

El sider del admin tenía la lógica para mantener el footer (Documentación) anclado al `bottom: 0` con `position: absolute`, y la lista de items scrolleable con `overflowY: auto`. Pero al `<Sider>` le faltaba la pieza que hace que todo esto funcione: una altura fija anclada al viewport. Sin eso, el sider crecía junto al contenido del Layout (`minHeight: 100vh` lo dejaba flotar), y al hacer scroll del content "Documentación" se iba hasta abajo del documento — invisible salvo que el usuario scrolleara hasta el fondo.

#### Fix

- **`admin/src/app/MainLayout.jsx`** (Sider desktop): agregadas 4 props de style:
  - `position: 'sticky'` + `top: 0` — el sider se queda pegado al top del viewport sin importar el scroll del content.
  - `height: '100vh'` — altura fija. El `renderSiderContent` que ya tenía `height: '100%'` con `position: 'relative'` y dos hijos `position: 'absolute'` (lista de items + footer) ahora se calculan contra los 100vh reales.
  - `overflow: 'hidden'` — la lista de items tiene su propio `overflowY: 'auto'` y los tooltips de Ant son portal-based, así que cortar el overflow del Sider no rompe nada y previene scroll bars duplicadas.

#### Comportamiento resultante

- Sider siempre visible mientras hacen scroll del content.
- "Documentación" pegado al bottom del viewport.
- Lista de items del medio (grupos plataforma + proyectos) scrolleable verticalmente si excede el espacio disponible — el scroll está acotado al área entre el brand (top: 64px) y el footer (FOOTER_HEIGHT).
- En mobile (Drawer) no aplica — sigue comportamiento previo.

Sin cambios en lógica de menú, registros ni roles. Solo 4 líneas de style en el `<Sider>`.

---

## [admin 1.15.4] - 2026-05-25

### Playground del MCP: previsualización embebida del share creado vía `<iieg-mapalab>`

Cuando un admin probaba `create_single_share` o `create_swipe_share` desde `/administrador/documentacion`, el playground devolvía un JSON `{id, url, embed_html}` y obligaba a copiar la `url` y abrirla en otra pestaña para verificar a ojo que el mapa salió bien. Ahora el widget se monta inline debajo del JSON con la API key del admin.

#### Cambios en `admin/src/features/documentacion/topics/McpPlayground.jsx`

- **Hook `useMapalabWidgetScript`**: inserta una sola vez `<script src="/mapalab/widget/v1/mapalab.js" defer data-mapalab-widget>` al `document.head`. Idempotente — los re-renders no duplican.
- **Input "API key del widget"**: nueva card al inicio con `<Input.Password>` para pegar una `mk_pub_…`. Persistida en `localStorage` (`mariachi.mcp_playground.api_key`) para no repetir cada visita. Link al feature [Llaves del visor MapaLab](/mariachi/mapalab/api-keys) (`@features/mapalab-api-keys/MapalabApiKeysPage`) para crear/rotar una con el dominio del admin autorizado.
- **Render condicional en `McpToolProbe`**: si el tool ejecutado es `create_single_share` o `create_swipe_share` (set `SHARE_TOOLS`) y la respuesta trae `id`, debajo del `<pre>` con el JSON se monta `<iieg-mapalab api-key={apiKey} share={result.body.id} height="450" controls="zoom" />`. Si no hay key, en su lugar se muestra un `Alert` info explicando cómo activar la previsualización.

#### Por qué API key

El widget requiere `mk_pub_…` para validar CORS y emitir el iframe (mismo flujo que cuando un huésped externo embebe el visor en su sitio). La key plana no se almacena en backend después del reveal único, así que el playground tampoco la guarda — vive solo en `localStorage` del navegador del admin que la pegó. Cada admin usa la suya.

Sin cambios en backend. El widget se sirve desde la imagen de `mariachi-nginx` (que copia `widget/dist/`); no requiere cambios de infra.

---

## [admin 1.15.3] - 2026-05-25

### Alineación con mapalab 1.45.0: URLs del MCP migradas de `/mapalab/api/mcp` → `/mapalab/mcp`

mapalab 1.45.0 movió las URLs públicas del MCP fuera del prefijo `/api` para alinear con la convención industrial (FastMCP default, Cloudflare remote MCP, etc.). El admin de Mariachi consumía las viejas y se actualiza en este release.

- **`admin/src/features/documentacion/topics/McpTopic.jsx`**: `buildLocalMcpUrl` y `buildPublicMcpUrl` cambiaron sus tres ramas (con `VITE_MAPALAB_PROXY_URL`, con `window.location.origin`, fallback) para usar `/mcp` y `/mapalab/mcp`. La tabla "Endpoints / URL del MCP" mostrada en `/administrador/documentacion` ya muestra los paths nuevos.
- **`admin/src/features/documentacion/topics/McpPlayground.jsx`**: la constante única `MAPALAB_BASE = '/mapalab/api'` se separó en dos:
  - `MAPALAB_REST_BASE = '/mapalab/api'` para los probes REST (sin cambios)
  - `MAPALAB_MCP_URL = '/mapalab/mcp'` para los probes JSON-RPC (`initialize` + `tools/call` de los 3 tools nuevos)

  El Alert principal actualizado para reflejar que el MCP vive al nivel de `/mapalab/` ahora, no debajo de `/mapalab/api/`.

Sin cambios en backend de Mariachi. La telemetría del MCP (POST internal a `/api/administrador/internal/mapalab/mcp/events`) sigue igual — ese endpoint sí está bajo `/api/administrador/` porque es la API admin de Mariachi, no el endpoint del MCP server.

---

## [admin 1.15.2] - 2026-05-25

### Playground: probes `tools/call` JSON-RPC para los 3 tools nuevos de mapalab 1.44.0

Los tools `create_single_share`, `create_swipe_share` y `measure_geometry` (mapalab 1.44.0) no tienen REST equivalente directo — son orquestación específica del servidor MCP. El playground de `/administrador/documentacion` solo probaba endpoints REST, así que estos quedaban indocumentados en la práctica.

- **`admin/src/features/documentacion/topics/McpPlayground.jsx`**: nuevo componente `McpToolProbe` que llama directamente vía JSON-RPC `tools/call` al endpoint `/mcp/`, parsea la respuesta SSE (`event: message\ndata: {...}`) y extrae el payload del tool (`result.content[0].text` → `JSON.parse`).
- Tres probes pre-configurados con `defaultArguments` editables en un `TextArea` (JSON con `autoSize`): `measure_geometry` (default LineString Guadalajara→Zapopan), `create_single_share` (con annotation Polygon de ejemplo), `create_swipe_share` (homicidio vs población).
- El playground ahora tiene dos secciones claras: **"Tools del MCP (`tools/call`)"** con los 3 nuevos, y **"Tools de lectura (REST equivalente)"** con los probes preexistentes. La descripción del Alert principal actualizada.

Sin cambios en backend. Útil para QA post-deploy: cualquier admin puede confirmar que el MCP responde, sin necesidad de levantar el inspector de modelcontextprotocol ni un cliente Python.

---

## [admin 1.15.1] - 2026-05-25

### Documentación: McpTopic refleja los 3 tools nuevos de mapalab 1.44.0

mapalab 1.44.0 agregó al MCP los tools `create_single_share`, `create_swipe_share` y `measure_geometry` (pensados para que agentes conversacionales como IGIBot entreguen mapas interactivos en lugar de solo descripciones). El tab "Servidor MCP" de `/administrador/documentacion` se actualiza para que el equipo descubra y entienda el nuevo flujo.

- **`admin/src/features/documentacion/topics/McpTopic.jsx`**: nuevo grupo en la tabla de tools "shares + medición" con los 3 endpoints (`create_single_share`, `create_swipe_share`, `measure_geometry`). Texto introductorio actualizado: 11 → 14 tools, con mención explícita del caso de uso de mapas embebidos vía `<iieg-mapalab>`. Alert verde extendido para cubrir también el contrato de annotations/shares desde mapalab 1.43.0 y los tools de share/medición desde 1.44.0.

Sin cambios en backend. El playground del admin sigue probando los endpoints REST equivalentes; los 3 nuevos tools no tienen REST equivalente directo (son orquestación específica del MCP) y se documentan solo en la tabla por ahora.

---

## [1.15.0] - 2026-05-22

### Agregado: iconText con texto visible separado y link explícito con tokens

El bloque "Íconos con texto" del editor de InfoBox ahora expone dos campos opcionales por item: **Texto** (label visible que sobreescribe el valor del campo) y **Link** (URL explícita con soporte de tokens `{campo}`). Pensado para el caso típico del icono `web`: el campo dinámico apunta a una columna con la URL (`sitio_web`) y el admin quiere mostrar "Sitio oficial" en lugar de la URL larga.

#### Qué cambió

- **`admin/src/features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor.jsx`**: `IconTextBlock` pasa de fila compacta a card vertical (igual patrón que `TextItemRow`). Dos inputs nuevos por item: `addonBefore="Texto"` (opcional, sobreescribe el valor visible) y `addonBefore="Link"` (opcional, URL explícita con tokens, mismo helper `resolveHref` que usan `text`/`list`). El placeholder del Select de campo se adapta al icono: para `web` dice "Campo con la URL" en vez de "Campo a mostrar".
- **`admin/src/features/mapalab-layers/components/layersEditor/InfoBoxPreview.jsx`**: `IconTexts` ahora usa `item.label || resolveValue(item.field)` como texto visible y aplica estilo de link (color `#5C2472` + underline) cuando hay `href` explícito o el icono es `ubicacion`/`celular`/`web` (que generan link automático en el visor).

Acompaña al commit de mapalab 1.41.0 que añade soporte en `IconText.jsx` y `renderCard.jsx` del visor para que el `label` gane sobre el valor del campo y el icono `web` resuelva auto-href cuando el field apunta a una URL.

#### Backward compat

Items existentes sin `label` o `href` siguen comportándose igual. La única diferencia visible nueva del visor: el icono `web` ahora genera link automáticamente cuando el `field` contiene una URL (antes solo si había `href` explícito).

---

## [admin 1.14.4] - 2026-05-22

### Documentación: defaults reales en el McpPlayground + nota del contrato robusto

El playground de `/administrador/documentacion` venía con defaults que no existían en la BD: `tasa_trabajadores_asegurados_hombres`/`raster:temperaturas`/`tasa_homicidio_doloso` daban `[]` o 404. Como mapalab 1.40.1 corrigió el contrato de `get_metadata`, `resolve_layer_ref` y `get_periodicity` para que acepten también el `id` del visor (no solo `geoserver_layer`/`slug`), aprovechamos para realinear los defaults a capas que existen y aclarar el contrato en la UI.

- **`admin/src/features/documentacion/topics/McpPlayground.jsx`**: defaults a `seguridad:tasa_homicidio_doloso` (get_metadata, resolve_layer_ref) y `demografia:poblacion` (get_periodicity), `q='homicidio'` para `search_layers`. Descripciones de cada probe mencionan que aceptan tanto id del visor como geoserver_layer.
- **`admin/src/features/documentacion/topics/McpTopic.jsx`**: tabla de tools con la nota de aceptación bilingüe (id ↔ geoserver_layer). Alert nuevo arriba del playground explicando que `search_layers → get_metadata` se encadena sin transformaciones desde mapalab 1.40.1.

Sin cambios en backend (mariachi solo persiste telemetría MCP, no expone los tools). El comportamiento corregido vive en mapalab 1.40.1.

---

## [1.14.2] - 2026-05-22

### Corregido: sticky en preview del drawer + render fiel del bloque text

Dos ajustes al editor de tarjetas que el `LayerEditPage` ya tenía pero faltaban en el drawer reutilizable y en el render del bloque `text` del preview.

- **`InfoboxStandalone.jsx`**: la columna "Vista previa" ahora se envuelve en `<div style={{position:'sticky', top:0}}>` igual que `LayerEditPage`. En el drawer del editor de eventos (`CapasField → LayerContentDrawer → tab Tarjeta`) el preview se queda anclado al tope mientras el admin scrollea los bloques.
- **`InfoBoxPreview.jsx`**: `renderTextItem` y `renderTextBlock` reescritos para reflejar lo que el visor renderiza (`Text.jsx` de mapalab):
  - Para items con `field`: solo el valor resuelto, sin `<strong>nombre_campo</strong>:` (era un cue de debug que el admin no veía en producción).
  - Para items con `label`: solo el texto fijo.
  - Items con `label` **y** `value` (caso teórico): `<strong>label</strong>: value` igual que el visor.
  - Cada item es su propio `<div>` con `marginBottom: 8` y color `#465055` (matchea `text-[#465055]` del visor), no spans dentro de un `<Text type="secondary">` único.

Sin cambios de schema. Solo render visual.

---

## [1.14.1] - 2026-05-22

### Removido: bloque `labels` (legacy) del editor de InfoBox

`infobox_config.labels` (array plano de campos, sin colores configurables) era un bloque legacy que coexistía con `labelGroups` desde el commit `a34c7e1`. Verificación en BD: **0 capas** lo usaban en producción (`labelGroups` lo había suplantado completamente al ser superset estricto). Se elimina la ruta muerta en editor + preview + visor para que el catálogo de bloques no muestre opciones no usadas.

- **`admin/src/features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor.jsx`**: removida la entrada `labels` de `BLOCK_DEFS` y `SORTABLE_KEYS`, removido el branch `if (key === 'labels')` en `renderBodyBlock` (Select inline con tag morado fijo). `labelGroups` renombrado de "Etiquetas (labelGroups)" a "Etiquetas" — ya no hay legacy con qué confundirlo.
- **`admin/src/features/mapalab-layers/components/layersEditor/InfoBoxPreview.jsx`**: `'labels'` fuera de `DEFAULT_BODY_ORDER` y del dispatcher `renderBodyBlock`.
- **`mapalab/frontend/src/pages/maps/components/InfoBox/utils/renderCard.jsx` (mapalab 1.38.1)**: removida `renderLabels`, entrada `labels` en `BODY_RENDERERS`, `'labels'` de `DEFAULT_BODY_ORDER` y el import unused de `CARACTERISTICA_STYLE`.
- **Normalizador defensivo `normalizeLegacyLabels`** en los helpers compartidos (`infoBoxTextBlocks.js` de mariachi y mapalab): si llega un `infobox_config` con `labels` (por ejemplo desde un restore de backup antiguo), lo convierte on-read a `labelGroups: [{fields: labels, color: '#7B61FF', bg: '#F3F0FF'}]` y limpia `'labels'` de `blockOrder`. Compose con el de `text` legacy bajo un único `normalizeInfoboxConfig` para que editor/preview/visor apliquen ambos transparentemente.

Sin impacto en datos vivos (0 capas afectadas). El normalizador hace la transición invisible si en el futuro aparece data antigua.

---

## [1.14.0] - 2026-05-22

### Agregado: campo `z` explícito por capa en CapasField del evento

Desacoplado el orden visual del submenú del Z de renderizado en el mapa. La tabla del CapasField sigue controlando con su drag handle (≡) el orden del submenú lateral del evento en el visor; el nuevo campo `z` (opcional, integer) por capa controla quién va encima en el mapa.

#### Schema (`api/app/schemas/evento.py`)

- `CapaRef.z: int | None` con `Field(default=None, ge=-9999, le=9999)`.
- Validator rechaza `z` en `etiqueta` y `categoria` (no se renderizan).
- Sin migración: `eventos.capas` ya es JSONB. Eventos existentes simplemente no traen `z` → se interpretan como `null` → orden natural de la tabla.

#### Editor admin (`admin/src/features/mapalab-eventos/`)

- **Nueva columna "Encima (Z)"** en [capasTableColumns.jsx](admin/src/features/mapalab-eventos/components/capasTableColumns.jsx) entre Auto-activar y Acciones. Header con icono `VerticalAlignTopOutlined` + tooltip detallado de 3 párrafos: qué significa Z, ejemplo concreto ("Accesos=5, Rutas=2 → Accesos tapa Rutas"), y la regla de "vacío = orden natural".
- Celda con `InputNumber size=small` (placeholder `auto`, `controls=false`, rango ±9999). Solo se muestra para filas `tipo='capa'`; etiquetas y categorías la dejan vacía.
- Tooltip individual por capa dinámico: "Z=N: se renderiza encima de capas con Z menor o vacío" o "Sin Z: se renderiza según orden de la tabla".
- Texto secundario del CapasField actualizado: aclara que el drag handle reordena el submenú y la columna Z controla el apilado del mapa.
- `normalizeCapas` en [EventoEditPage](admin/src/features/mapalab-eventos/pages/EventoEditPage.jsx#L57-L66) y [addCapa.js](admin/src/features/mapalab-eventos/helpers/addCapa.js) inicializan `z: null` por consistencia con Ant Form.

#### Convención resultante

| Caso | Z del mapa |
|---|---|
| Sin Z en ninguna capa | Última fila de la tabla queda al frente, primera al fondo (orden natural por `handleToggleLayer` unshift) |
| Capa A con Z=5, resto sin Z | A al frente; las demás se ordenan entre sí por su posición en la tabla |
| A z=1, B z=3, C z=2 | B al frente (Z mayor), después C, después A al fondo |
| Mezcla: A sin Z, B z=2, C sin Z | B al frente; A y C entre sí por posición de tabla |

#### Revert del fix erróneo de 1.10.x

La inversión del `forEach` en `EventoMenu.jsx` del visor (mapalab `1.36.0`) asumía "primera fila = al frente". Ahora se revirtió ese comportamiento y el visor ordena `toActivate` por `z` ascendente antes del forEach: las sin Z van primero (al fondo) y las con Z explícito se procesan después de menor a mayor, dejando la de mayor Z al frente con el `unshift`. Cambio funcional en mapalab paquete separado (ver mapalab CHANGELOG).

Bump unificado: 1.13.0 → 1.14.0.

---

## [1.13.0] - 2026-05-22

### Agregado: eliminar evento ofreciendo archivar capas auto-creadas huérfanas

Al eliminar un evento, el admin ahora puede archivar también las capas auto-leaf (bajo `eventos-auto`) que **solo ese evento referenciaba**. Resuelve el "limbo" de capas auto-creadas que quedaban activas sin uso, ensuciando el árbol y el contador del tab Eventos en `/mapalab/layers`.

#### Backend

- **Nuevo endpoint** `GET /api/administrador/eventos/{id}/orphan-layers-preview` → devuelve `[{id, label, workspace, layer}]` con las capas auto-leaf que solo este evento usa. Requiere editor.
- **`DELETE /api/administrador/eventos/{id}?delete_orphan_layers=true`** ahora soft-deletea esas capas (vía `soft_delete_layer`) y dispara `notify_tree_changed()` para invalidar el cache del visor. Sin el param, comportamiento idéntico al anterior. Response actualizado: `{message, orphanLayersDeleted}`.
- **`api/app/services/layer_service.py`**: helper `find_orphan_auto_leaves(mariachi_db, dataengine_db, evento)` cross-database: aplana `evento.capas` (incluyendo categorías), compara contra el resto de eventos en mariachi DB, y filtra solo las que viven bajo `parent_id='eventos-auto'` con `deleted_at IS NULL`. Helper privado `_flatten_evento_capa_refs` para tests futuros.
- **`api/app/schemas/evento.py`**: `OrphanLayerInfo` y `EventoDeleteResponse` con `serialization_alias='orphanLayersDeleted'`.

GeoServer no se toca — el `soft_delete_layer` solo cambia `mapalab.layers.deleted_at`. Las capas siguen disponibles en GeoServer y pueden re-asociarse a otro evento; `find_or_create_auto_leaf` (mejorado en 1.12.1) las restaurará al primer uso.

#### Frontend admin

- **Nuevo componente** `admin/src/features/mapalab-eventos/components/DeleteEventoModal.jsx`: modal reusable que al abrirse llama al endpoint preview, lista las capas huérfanas con `Tag workspace:layer` y label, y ofrece checkbox "Archivar también estas capas auto-creadas". Si no hay huérfanas muestra `Alert info` neutral.
- **`pages/EventosListPage.jsx`**: reemplaza el `Popconfirm` por el nuevo modal (estado `deletingEvento`). Toast del éxito incluye contador de capas archivadas cuando aplica.
- **`pages/EventoEditPage.jsx`**: mismo cambio en el botón "Eliminar" del header del editor.
- **`api/eventosService.js`**: `eliminarEvento(id, { deleteOrphanLayers })` ahora acepta opciones y devuelve el body; nuevo `previewOrphanLayers(id)`.

Bump unificado: 1.12.1 → 1.13.0.

---

## [1.12.1] - 2026-05-22

### Corregido: idempotencia robusta de `auto-leaf` + auto-restore del padre `eventos-auto`

`POST /layers/auto-leaf` quedaba "atrapado" si alguien archivaba (soft-delete) capas o el padre `eventos-auto` desde la papelera. Caso real: el visor dejaba de renderizar las capas auto-creadas de un evento porque el padre quedó con `deleted_at != NULL`, y el árbol público (`LayersRepository.get_all_layers` filtra `deleted_at IS NULL`) descartaba el subárbol entero, dejando huérfanas todas sus capas hijas. Adicionalmente, cada nueva llamada generaba duplicados con sufijos `-2`, `-3`, etc. porque `find_or_create_auto_leaf` filtraba `deleted_at IS NULL` en su búsqueda inicial y no encontraba la versión vieja archivada.

#### Qué cambió en `api/app/services/layer_service.py`

- **`_ensure_auto_parent`**: ahora detecta `deleted_at != NULL` en el padre `eventos-auto` y lo restaura automáticamente (set `deleted_at = NULL`, actualiza `updated_by`). Si alguien lo archiva por error en la papelera, la siguiente llamada a `auto-leaf` lo recupera sin intervención manual.
- **`find_or_create_auto_leaf`**: orden de operaciones revisado:
  1. **Primero** garantiza el padre activo (`_ensure_auto_parent`) — antes solo se llamaba al crear leaf nuevo, ahora siempre.
  2. Busca leaf activo con `(workspace_alias, geoserver_layer)` → si existe, lo devuelve (sin cambios).
  3. Si no existe activo, busca el **más reciente soft-deleted** con misma `(workspace_alias, geoserver_layer)` y lo **restaura** (set `deleted_at = NULL`, re-engancha a `parent_id`, refresca `label`/`updated_by`). Devuelve `(layer, created=True)`.
  4. Solo si no encontró nada (ni activo ni soft-deleted), procede al flujo original: valida contra GeoServer, genera id `auto-<workspace>-<layer>` con sufijo `-N` si colisiona, e inserta nueva fila.

Resultado: agregar una capa a un evento que se había eliminado antes ya no crea duplicados `-2`/`-3`, recupera la fila original con su `infobox_config`, metadata y SLD intactos.

Sin cambios de schema. Sin migración. Sin endpoints nuevos. El visor recupera las capas en el siguiente refresh del cache (`notify_tree_changed()` se sigue invocando como antes).

---

## [1.12.0] - 2026-05-22

### Agregado: backup/restore parcial de `infobox_config` entre instancias de DataEngine

Operación nueva para mover las "tarjetas" (`mapalab.layers.infobox_config`) entre instancias de DataEngine sin tocar el resto del shape de la capa. Pensado para deploys puntuales donde el contenido del cuadro de información se cura en staging y se promueve a producción sin reconstruir el árbol de capas a mano. No es un patrón recurrente: bulk_ingest sigue siendo el camino para metadata/numeralia.

- **`scripts/dataengine-export-infobox.sh`**: lee `mapalab.layers` con `DATAENGINE_URL` y genera dos archivos en `backups/tarjetitas/`: un `.json` legible con `{id: infobox_config}` ordenado por id y un `.sql` con `UPDATE ... WHERE id = ...` idempotentes envueltos en `BEGIN/COMMIT`. Solo exporta filas con `infobox_config IS NOT NULL`.
- **`scripts/dataengine-apply-infobox.sh`**: aplica un export en la BD destino con tres safeguards: (1) backup reverso de los `id` que el SQL va a tocar, con `NULL` literal preservado para columnas que estaban vacías; (2) preview de cuántos `id` del archivo existen en destino + listado de faltantes; (3) confirmación interactiva (`si` para continuar, `ASSUME_YES=1` para CI). El apply corre en `--single-transaction` con `ON_ERROR_STOP=1`.
- **Targets Makefile**: `make backup-tarjetitas` y `make restore-tarjetitas FILE=...`. **No** dependen de `ENV=` — auto-detectan `DATAENGINE_DATABASE_URL` recorriendo `.env.development → .env.staging → .env.production` y eligen la primera que la tenga (en cada máquina suele existir solo una). Override explícito con `DATAENGINE_URL='postgres://...'` cuando se quiera mezclar (ej. apuntar desde dev a la BD de staging).
- **Documentación en `make help`**: nueva sección "Tarjetitas" que enumera ambos comandos y deja claro que solo mueve la columna `infobox_config` — las capas destino deben existir con el mismo `id` (PK de `mapalab.layers`); las que no existan se omiten sin error.
- **`.gitignore`**: agrega `backups/tarjetitas/` para que los exports locales no entren al repo.

Verificación contra DataEngine local: 187 capas exportadas, preview detectó las 187 en destino, diff entre export y backup reverso vacío (idempotencia confirmada cuando origen = destino).

---

## [1.11.1] - 2026-05-22

### Corregido: ocultar tema `eventos-auto` de la tab "Capas" del panel admin

El árbol admin de `/mapalab/layers` exponía el tema oculto `eventos-auto` (donde viven las capas "solo GeoServer" materializadas por `POST /layers/auto-leaf`) en la tab "Capas", contaminando el catálogo regular con leafs one-off de eventos.

- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: nuevo `catalogTreeData = useMemo(() => treeData.filter((n) => n.key !== 'eventos-auto'), [treeData])`. La tab "Capas" usa `catalogTreeData` (con su contador actualizado); el resto del componente (`findNodeContext`, `flattenLeaves`, `useEventosTreeNode`) sigue usando `treeData`/`rawTree` sin filtro para que la resolución por URL directa y la búsqueda en el árbol de eventos no se rompan.

La tab "Eventos" ya consume `useEventosTreeNode(eventos, rawTree)` que lista todas las capas referenciadas por algún evento (catálogo + auto-leaf), agrupadas por evento. Una capa de catálogo en un evento aparece en ambas tabs editando la misma fila de `mapalab.layers` — single source of truth.

Sin cambios en backend ni en el endpoint `/mapalab/api/layers/tree` (el visor lo sigue consumiendo completo).

---

## [1.11.0] - 2026-05-22

### Agregado: múltiples bloques de texto en InfoBox editor + items tipo "campo dinámico" + link opcional por item

Editor de InfoBox (`admin/src/features/mapalab-layers/components/layersEditor/`) ahora soporta múltiples bloques `text` independientes (antes era uno único, que solo podía moverse como bloque). Cada bloque tiene su propio `id` y se identifica en `blockOrder` con la clave `text:<id>` para preservar el orden frente al drag & drop. Cada **item** de un bloque puede ser:

- **Texto fijo** (`label`): párrafo libre escrito por el editor.
- **Campo dinámico** (`field`): valor del feature resuelto en runtime; el preview lo renderiza como `<strong>{field}: </strong>{valor}`.

Cada item — tanto en `text` como en `list` — puede definir un `href` opcional con soporte de **tokens del feature** (ej. `https://catastro.gob.mx/{clave_catastral}`). El preview pinta esos items subrayados con color `#5C2472`.

#### Qué cambió

- **`InfoBoxBlocksEditor.jsx`**: `BLOCK_DEFS.text` ahora se trata como colección. `addBlock('text')` crea `{id: genTextId(), items: [{label: ''}]}`; `removeBlock('text:<id>')` quita por id y limpia `blockOrder`. `TextItemRow` con `Radio.Group` para alternar `Texto fijo ↔ Campo dinámico`, y un Input adicional para `href` con placeholder de ejemplo de token. Cada item de `list` también recibió el Input de `href`.
- **`InfoBoxPreview.jsx`**: `expandPresentKeys` expande `text` a `text:<id>` para que el orden y filtro `length` funcionen bien con múltiples bloques. `renderTextItem` decide entre campo (con `<strong>field:</strong>`) o texto fijo, y aplica estilo de link cuando hay `href`. `ListItems` también muestra subrayado púrpura en items con `href`.
- **`infoBoxTextBlocks.js` (nuevo)**: helpers `mkTextKey`, `isTextKey`, `textIdOf`, `genTextId` y `normalizeTextBlocks` para migrar el formato legacy (`text: [{label}, ...]`) al nuevo (`text: [{id, items: [...]}, ...]`) leyendo desde DataEngine sin migración de BD — la normalización corre en cada render del editor y del preview, manteniendo retro-compatibilidad con InfoBoxes existentes en `mapalab.layers.infobox_config`.

El visor mapalab ya consume `href` y múltiples bloques de texto vía su propio `pages/maps/components/InfoBox/utils/infoBoxTextBlocks.js` y `InfoBox/components/Text.jsx` (subrayado con `<a target="_blank">`). Sin cambios de schema en backend (`infobox_config` es `JSONB` sin contrato estricto).

### Documentado: convención de orden Z en CapasField del editor de eventos

- **`admin/src/features/mapalab-eventos/components/CapasField.jsx`**: el texto secundario sobre la tabla ahora explica que el orden definido en el editor controla el Z del mapa (primera = al frente, última = al fondo). El fix funcional vive en mapalab `1.36.0` (`EventoMenu.jsx` itera la auto-activación en orden inverso para respetar este orden).

Sin cambios en backend ni schema. Drag & drop entre raíz y categorías (vía `@dnd-kit/sortable`) no cambia.

---

## [1.10.0] - 2026-05-21

### Agregado: panel de telemetría del servidor MCP de MapaLab + documentación interna

- **Endpoint interno nuevo** `POST /api/administrador/internal/mapalab/mcp/events` (con `X-Internal-Token`, mismo patrón que `mapalab_api_keys_internal`). Recibe lotes de eventos del middleware MCP del backend de MapaLab y los persiste en la tabla `mapalab_mcp_events` (modelo nuevo `MapalabMcpEvent`). Sin identidad: `session_hash` e `ip_hash` ya vienen SHA-256 desde el origen.

- **4 vistas materializadas nuevas** (`mapalab_mcp_stats_overview`, `mapalab_mcp_stats_tools`, `mapalab_mcp_stats_daily`, `mapalab_mcp_stats_clients`) que agregan los eventos para alimentar el dashboard. Se sumaron al array `REFRESH_VIEWS` de `mapalab_telemetry.py` — el botón "Refrescar vistas" del panel de estadísticas las regenera junto con las del visor. `mapalab_mcp_stats_overview` queda en la lista `_VIEWS_WITHOUT_UNIQUE_INDEX` para evitar el `CONCURRENTLY` que requiere índice único.

- **Tab MCP en `/administrador/mapalab/stats`**: tarjetas (llamadas 30d/7d/hoy, tasa de error, latencia media tool, latencia media en ms, sesiones únicas, clientes distintos, calls a tools), gráfica de llamadas por día con stack visual de errores en rojo, tabla por tool (usos, errores, p95, sesiones únicas, última actividad), tabla de clientes MCP (nombre, versión, calls, sesiones). Endpoints: `GET /mapalab-stats/mcp/{overview,tools,daily,clients}`.

- **Página de Documentación nueva** `/administrador/documentacion` con tabs verticales por tema. Primer tema "Servidor MCP" con explicación qué es, tabla de URLs por contexto (containers / local / producción usando `VITE_MAPALAB_PROXY_URL` y `VITE_WEB_URL` + fallback a `window.location.origin`), tabla de los 17 tools agrupados por router con énfasis en `search_layers`, ejemplos de cliente Claude Desktop + LangChain, campos de telemetría persistidos, y un **playground interactivo** que llama los endpoints REST equivalentes vía el proxy `/mapalab/*` (Vite en dev, gateway-hub en prod). Cada tool sin efectos secundarios tiene su tarjeta con form, botón "Probar" y display de respuesta con HTTP status, latencia y JSON formateado.

- **Item "Documentación" anclado al footer del sider**: `FOOTER_ITEMS` nuevo en `sider-registry`, función `buildSiderFooterItems` en `sider-config`, y en `MainLayout` el menú principal va en un wrapper scrolleable con `position: absolute; top: 64; bottom: <footer-height>` y el menú de footer queda con `position: absolute; bottom: 0` siempre visible. En mobile (Drawer) los items se concatenan sin sticky.

#### Migraciones MCP

- `b9c0d1e2f3a5_add_mapalab_mcp_events.py` — tabla + 4 índices.
- `c0d1e2f3a4b6_add_mapalab_mcp_stats_views.py` — 4 vistas materializadas + 3 índices únicos.

### MapaLab admin: ingesta masiva de metadatos (CSV/XLSX)

Nueva pestaña `/mariachi/mapalab/layers/ingesta-masiva` para subir un Excel/CSV del catálogo MapaLab y aplicar metadatos a múltiples capas en una sola operación, sin tocar el editor de cada una. Flujo de 3 pasos: subida + mapeo de columnas → preview del plan con diff por capa → apply atómico con optimistic locking.

- **`api/app/api/routes/bulk_ingest.py`** (nuevo): 5 endpoints bajo `/layer-metadata/bulk` — `column-presets` (presets de mapeo Excel→técnico), `upload` (multipart CSV/XLSX + `dependencia` + `column_mapping`, genera plan persistido), `plan/{id}` (GET, TTL 24h), `plan/{id}/apply` (admin-only, optimistic locking con `IS NOT DISTINCT FROM`), `plan/{id}` (DELETE, cancela).
- **`api/app/services/bulk_ingest_parser.py`** (nuevo): parsing CSV (UTF-8) y XLSX (dep nueva `openpyxl>=3.1`). Builders de `layer_metadata`, fuentes, metodología y numeralia con preset `mapalab-excel`.
- **`api/app/services/bulk_ingest_planner.py`** (nuevo): genera plan con diff por capa (`insert` / `update` / `no-change`) persistido en `mapalab.bulk_ingest_plans` como `plan_json` JSONB. Archivo original subido al acervo bucket privado `mariachi/bulk-ingest/<plan_id>/`. Best-effort: si falla la subida, el plan se genera igual.
- **`api/app/models/bulk_ingest_plan.py`** (nuevo, `DataEngineBase`) + **`api/app/schemas/bulk_ingest.py`** (Pydantic).
- **`api/tests/services/test_bulk_ingest_parser.py`** (nuevo): tests de parsing, mapping y builders del preset MapaLab.
- **`admin/src/features/mapalab-layers/pages/BulkIngestPage.jsx`** (nuevo) — orquestador del flujo de 3 pasos.
- **`admin/src/features/mapalab-layers/components/bulkIngest/{UploadForm,MappingModal,PreviewPlan,ChangeDetail,ResultView}.jsx`** (nuevos) — UI por paso.
- **`admin/src/features/mapalab-layers/constants/bulkIngestFields.js`** (nuevo) — preset visible y catálogo de campos técnicos.
- **`admin/src/features/mapalab-layers/services/bulkIngestService.js`** (nuevo) — cliente axios.
- **Counters Prometheus**: `mariachi_bulk_ingest_uploads_total`, `mariachi_bulk_ingest_applies_total`.
- Item "Ingesta masiva" agregado al sider de MapaLab (con badge beta), accesible a roles `tetlamamakani` y `editora`.

#### Migraciones bulk-ingest

- `0012_bulk_ingest_plans` en dataengine (repo separado) — tabla `mapalab.bulk_ingest_plans` con `plan_json JSONB`, `status` (`pending`/`applied`/`cancelled`/`expired`), TTL 24h.

---

## [1.9.1] - 2026-05-21

### Dead code limpio + pre-push hook con lint y knip del admin

Saneamiento del workflow de desarrollo: el job `Dead code check` del CI estaba fallando en `develop` por archivos huérfanos de reestructuraciones pasadas y un export sin consumir. En paralelo se extiende el `pre-push` hook para reproducir localmente las mismas validaciones de `test-frontend.yml`, evitando que un push contamine la rama con errores que CI rechazaría.

#### Quitado

- **`admin/src/features/mapalab-layers/components/LayersTreeSider.jsx`**: resto del antiguo sider de capas (vivía en un `<Sider>` lateral antes de la reestructuración inline 1.4.0). Ya no se importa desde ningún archivo.
- **`admin/src/shared/hooks/useResizableWidth.js`**: hook que servía al ancho redimensionable del sider eliminado. Sin consumidores.
- **`NOTICE_DISMISS_PERSISTENCE`** en `admin/src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx`: constante exportada pero no importada — las opciones se hardcodean inline en los `Radio.Button` del editor.
- **`admin/eslint.config.js`**: `LayersTreeSider.jsx` retirado del override `max-lines: 'off'` (archivo ya no existe).
- **`admin/knip.json`**: entrada `src/features/users/pages/AddSieejDependenciaPage.jsx` removida del `ignore` (archivo borrado en un commit anterior, la entrada quedó huérfana).

#### Añadido

- **`.githooks/pre-push`**: extendido con dos pasos nuevos antes de pytest, replicando `test-frontend.yml`:
  1. `npm run lint` en `admin/`.
  2. `npm run check:dead-code:strict` en `admin/` (knip).
  Ambos abortan el push si fallan. Nueva variable de entorno `SKIP_FRONTEND=1` para saltarlos en casos puntuales (igual que la `SKIP_PYTEST=1` existente). El hook se invoca con `npm --silent` para que el output del push solo muestre las fallas reales, sin el ruido del header `> mariachi-admin@x lint`.

## [1.9.0] - 2026-05-21

### MapaLab admin: UX del editor de avisos y datos curiosos

Batería de mejoras a la herramienta de texto enriquecido (`MarkdownTextArea`) y al preview del editor de avisos, además de la integración del catálogo de símbolos como inserción inline.

#### Añadido

- **`admin/src/shared/utils/inlineMarkdown.jsx`** (nuevo): helper `renderInlineMarkdown(text)` espejo del de mapalab (`mapalab/frontend/src/utils/inlineMarkdown.jsx`). Una sola regex consume tokens (`[texto](url)`, `**bold**`, `~~strike~~`, `*italic*`) en orden de aparición; nueva instancia de `RegExp` por llamada para no acarrear `lastIndex` entre invocaciones. Estilos se aplican con `style` inline (`fontWeight`, `fontStyle`, `textDecoration`) en vez de `className`, para que el preview del admin no dependa de utilidades CSS del visor.
- **`admin/src/features/mapalab-symbols/components/SymbolInsertButton.jsx`** (nuevo): botón `<Popover>` que muestra grid de emojis del catálogo (`/mapalab/symbols` filtrado por `kind === 'emoji'`). Cache module-level (`cacheRef`) para no re-fetchear entre clicks. Al elegir, llama `onInsert(value)` con el caracter Unicode.

#### Cambiado

- **`admin/src/shared/components/MarkdownTextArea.jsx`**:
  - El botón de enlace ya no inserta `[texto](https://)` con la URL incompleta; ahora abre un `Modal` con dos campos (`Texto visible` y `URL`) validados via `Form`. Si el texto seleccionado no está vacío se prepobla `Texto visible`; si queda vacío se usa la URL como texto. URL obligatoria con patrón `^https?://.+`. Atajo `Ctrl/Cmd+K` también abre el modal.
  - Nuevo feature `symbol` (incluido por defecto en `features`): renderiza `SymbolInsertButton` al final de la toolbar. Inserta emojis del catálogo como caracteres Unicode planos (sin sintaxis especial), funcionando inmediatamente en cualquier consumidor de `MarkdownTextArea`. Para SVG/imagen inline se requeriría un campo aparte en el schema (`inline_symbols: dict[slug, snapshot]`) y queda fuera de este alcance.
- **`admin/src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx::NoticePreview`**: antes mostraba `value.title` y `value.description` crudos, así que `*italica*` se veía con asteriscos literales. Ahora pasa ambos por `renderInlineMarkdown` — el preview es WYSIWYG con el visor real. Aplica a la variante `banner` y a la normal.
- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: la columna `Vista previa` de la pestaña InfoBox se envuelve en `<div style={{position:'sticky', top:0}}>` para que el preview siga visible al scrollear el editor de bloques. Antes era sticky con `top: 96` en el viejo sider, perdió esa propiedad con la reestructuración inline del árbol de capas (1.4.0).
- **`admin/src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx`**: sticky del preview ajustado de `top: 96` (offset del viejo header del sider) a `top: 0` para alinear con el nuevo scroll container del árbol inline.
- **`admin/src/features/mapalab-layers/components/sldEditor/SldEditorLayout.jsx`**: la columna derecha (BorradorPreview + LegendPreview + DiffPanel + SldActionsCard) envuelta en sticky para que la leyenda y el botón Guardar queden visibles mientras se ajusta la simbología.
- **`admin/src/features/mapalab-eventos/pages/EventoEditPage.jsx`**: el campo "Descripción" del evento (tab Apariencia) pasa de `Input.TextArea` a `MarkdownTextArea` — ahora soporta los 4 formatos markdown inline + emojis del catálogo, igual que los datos curiosos.

#### Corregido (visor: ver `mapalab/docs/CHANGELOG.md [1.33.0]`)

- Cursivas y tachado del visor no se veían: la fuente custom `Garet` declara todos sus `@font-face` como `font-style: normal` y el CSS global tenía `font-synthesis: none`, lo que impedía al browser sintetizar el oblicuo. Se aplica `fontSynthesis: 'style'` inline al `<em>` para autorizar la síntesis sólo donde se necesita.
- El símbolo del fact se mostraba dos veces (en la pelota animada y arriba del popover de texto). Se quita del popover; queda únicamente en la pelota.

---

## [1.8.0] - 2026-05-21

### MapaLab eventos: facts, símbolos del catálogo, ícono lúdico, mapa base por evento

Tres mejoras complementarias en el modelo de `eventos` para alimentar la nueva barra de acciones del submenu del visor (ver `mapalab/docs/CHANGELOG.md [1.32.0]`): datos curiosos enriquecidos por evento, símbolo del catálogo MapaLab → Símbolos (en lugar de un enum hardcoded) y mapa base opcional que el visor fuerza al abrir el evento.

#### Añadido

- **`api/alembic/versions/mariachi/a8b9c0d1e2f4_add_facts_to_eventos.py`**: nueva columna `eventos.facts JSONB DEFAULT '[]'::jsonb`. Cada evento puede listar datos curiosos consumidos por el visor.
- **`api/alembic/versions/mariachi/a8b9c0d1e2f6_fun_icon_to_jsonb.py`**: columna `eventos.fun_icon` se reemplaza por `JSONB` (era VARCHAR enum). Guarda el snapshot del símbolo seleccionado del catálogo (`{symbolId, kind, value, imageUrl, name}`) para evitar cross-DB FK con `dataengine.mapalab.symbols`.
- **`api/alembic/versions/mariachi/a8b9c0d1e2f7_add_basemap_id_to_eventos.py`**: columna `eventos.basemap_id VARCHAR(50) NULL`. Si está definido, el visor lo aplica al montar el menú del evento y lo restaura al cerrarlo.
- **`api/app/schemas/evento.py`**:
  - Nuevo `SymbolSnapshot` (`{symbolId, kind, value, imageUrl, name}`) reutilizable para `fun_icon` y `fact.symbol`.
  - Nuevo `FactRef` (`{text, symbol?}`) con `@model_validator(mode='before')` que acepta strings legacy (`"texto"` → `{text: "texto"}`) para compatibilidad con facts ya capturados como strings sueltos.
  - `EventoBase`/`EventoUpdate` exponen `facts: list[FactRef]`, `funIcon: SymbolSnapshot | None` y `basemapId: str | None` (todos con `serialization_alias` camelCase para el contrato público).
- **`admin/src/features/mapalab-eventos/components/FactsField.jsx`** (nuevo): editor de la lista de facts. Cada item es un card con:
  - `<MarkdownTextArea>` reutilizado del editor de avisos (markdown inline: `**bold**`, `*italic*`, `~~strike~~`, `[link](url)`) con `showCount`, `maxLength=500`.
  - Toolbar combinada gracias a nueva prop `extraActions` en `MarkdownTextArea`: los botones subir/bajar/eliminar viven junto a los de markdown, separados por divider.
  - `<SymbolSnapshotField>` opcional por fact (cabecera del card) para asignarle un símbolo propio. Si se deja vacío, el visor muestra el texto sin símbolo.
- **`admin/src/features/mapalab-eventos/components/SymbolSnapshotField.jsx`** (nuevo): button + `Popover` que envuelve `<SymbolPicker>` del catálogo (`features/mapalab-layers/components/sldEditor/SymbolPicker`). Al seleccionar arma el snapshot completo del símbolo y lo persiste como JSONB; botón "limpiar" para volver a sin símbolo.
- **`admin/src/features/mapalab-eventos/pages/EventoEditPage.jsx`**:
  - Nuevo tab "Diversión" (ícono carita `SmileOutlined`) entre "Apariencia" y "Geografía": `SymbolSnapshotField` para `funIcon` (con fallback a balón ⚽ en el visor) + `<FactsField>` para los datos curiosos. Alert explicativo arriba del tab.
  - En el tab "Apariencia": nuevo selector de `basemapId` con las 3 opciones de mapalab (Carto Voyager, Carto Light, Sin mapa base); `allowClear` para volver a "respetar elección del usuario".
  - `eventoToForm`/`formToPayload` normalizan: strings legacy en `facts` se promueven a `{text, symbol:null}`, strings vacíos se filtran al guardar.

#### Cambiado

- **`admin/src/shared/components/MarkdownTextArea.jsx`**: nueva prop opcional `extraActions` que se renderiza al final de la toolbar separada por un divider vertical. Backward-compatible — los consumidores existentes (LayerNoticeSection) no la pasan y siguen igual.

## [1.7.0] - 2026-05-21

### MapaLab admin: toolbar de markdown inline en el editor de avisos

Hasta ahora la descripción de avisos sólo soportaba **negritas** entre dobles asteriscos (regex casero en el visor). Se amplía a **negritas**, *cursivas*, ~~tachado~~ y [enlaces](url), todos como markdown inline. El editor del admin gana una toolbar con botones que envuelven la selección actual con la sintaxis correspondiente; soporta atajos `Ctrl/Cmd+B` y `Ctrl/Cmd+I`.

- **`admin/src/shared/components/MarkdownTextArea.jsx`** (nuevo): wrappea `Input.TextArea` con una toolbar configurable (`features=['bold','italic','strike','link']`). Los botones llaman a `wrapSelection` que envuelve la selección actual (o inserta un placeholder si no hay selección) con los delimitadores correspondientes; `onMouseDown` previene la pérdida de foco para que la inserción se aplique sobre la selección. El botón de enlace inserta `[texto](https://)` y deja el cursor sobre `https://` listo para reemplazar.
- **`admin/src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx`**: los `Input.TextArea` de "Descripción" y "Mensaje del banner" se reemplazan por `MarkdownTextArea`. Help text actualizado para listar los formatos soportados. (El parser correspondiente en el visor mapalab — `renderInlineMarkdown` — se centraliza en `mapalab/frontend/src/utils/inlineMarkdown.jsx` y soporta los 4 formatos; cambio en repo `mapalab`.)
- **`admin/eslint.config.js`**: `src/features/inicio/pages/InicioPage.jsx` añadido al override `max-lines: 'off'` (crecimiento natural por features acumuladas de Taiga + Colibri).

### Inicio: botón "Reportar" con Colibri en cards de plataformas

Cada card de "Plataformas del ecosistema" gana un cuarto icono `MessageOutlined` que abre el panel de Colibri (mismo widget que se ofrece a terceros) para enviar una sugerencia, bug, problema, duda, solicitud o reporte de datos incorrectos contra esa plataforma. Todos los reportes se registran bajo el source-app `mariachi` con el slug y el label de la plataforma reportada anexados como `source_context.custom.plataforma_slug` / `plataforma_label`.

#### Añadido

- **`api/app/core/settings.py`**: nuevo setting `colibri_api_key_mariachi: str | None`. Si queda en `None`, el frontend simplemente no muestra el botón.
- **`api/app/api/routes/sistema.py`** (`GET /sistema/colibri-config`): endpoint nuevo, autenticado, devuelve `{source_app: "mariachi", api_key: <env>}` para que el frontend pueda invocar `window.colibri.openPanel()` sin embeber la key en el bundle.
- **`admin/src/features/inicio/api/inicioService.js`**: nuevo `getColibriConfig()`.
- **`admin/src/features/inicio/pages/InicioPage.jsx`**: nuevo `useEffect` que carga el bundle del widget (`/colibri/widget/colibri-widget.v1.js`) sólo cuando hay api-key configurada. `PlataformaCard` acepta `colibriConfig` como prop; al hacer click en el botón llama `window.colibri.setContext('plataforma_slug', slug)` + `setContext('plataforma_label', label)` y luego `window.colibri.openPanel({sourceApp, apiKey})`.
- **`.env.development.example`, `.env.staging.example`, `.env.production.example`** + reales: nueva var `COLIBRI_API_KEY_MARIACHI` documentada (vacía por defecto). El operador rota la key del source-app `mariachi` desde `/colibri/source-apps` y la pega aquí.

#### Por qué bump minor

Nueva característica visible al usuario sin romper compatibilidad. Es opcional: sin la env var, el botón no aparece y el resto del Inicio funciona igual.

---

## [1.6.0] - 2026-05-21

### MapaLab admin: iconos visibles en el árbol de capas y eventos

El árbol de `/mapalab/layers` ahora muestra junto al título de cada **tema** y de cada **evento** el icono que tienen asignado, igual que el visor público. Antes ese icono solo era visible al abrir el editor del tema/evento, no en la navegación del árbol.

- **`admin/src/shared/utils/acervoUrl.js`** (nuevo): helper `resolveAcervoUrl(url)` que deja absolutas las URLs que ya lo son (`http(s)://`, `data:`, `/acervo/`, `/api/`) y prepende `/acervo/` a las relativas. Necesario porque el endpoint `/mapalab/api/layers/tree` viene del backend de mapalab, que no aplica `to_absolute` sobre `icon_url` antes de exponerlo (lo devuelve tal cual de DB, en formato `bucket/key`).
- **`admin/src/features/mapalab-layers/hooks/useLayerTreeAdmin.js`**: `toAntTreeData` ahora propaga `iconUrl` del nodo crudo al nodo del árbol.
- **`admin/src/features/mapalab-eventos/hooks/useEventoTreeNodes.js`**: `buildEventosTreeNode` ahora propaga `iconoUrl` del evento al nodo del árbol (mariachi sí serializa este campo absoluto, así que `resolveAcervoUrl` solo actúa como passthrough).
- **`admin/src/features/mapalab-layers/components/LayersTreeBranch.jsx::TitleBlock`**: cuando `nodeType` es `tema` o `evento` y hay `iconUrl`, renderiza un `<img>` de 18×18 px antes del título (con `objectFit: contain`, `flexShrink: 0` y `onError` que oculta el `<img>` si el recurso falla, para no romper la fila).

### Inicio: enlaces a repositorio y tablero Taiga en cards de plataformas

Las cards de la sección "Plataformas del ecosistema" en `/inicio` ahora muestran enlaces directos al repo de GitHub y al tablero Taiga de cada plataforma, además del enlace para visitar la app. La información vive hardcoded en `platforms_config.py` (única fuente de verdad para topología del ecosistema); no se consulta a ningún servicio remoto.

#### Añadido

- **`api/app/core/platforms_config.py`**: campos opcionales `repo` y `taiga` en `PlatformConfig`. Constantes `_GITHUB_ORG` (`https://github.com/iieg-oficial`) y `_TAIGA_BASE` (`https://proyectosiieg.jalisco.gob.mx/project`) arriba para construir las URLs. Las 8 plataformas declaran su repo en `iieg-oficial`; tres (`mariachi`, `mapalab`, `sieej`) declaran también su proyecto Taiga (slugs `nuevo-sitio-del-iieg`, `mapalab`, `siiej` respectivamente). Las demás dejan `taiga: None`.
- **`api/app/api/routes/sistema.py`** (`GET /sistema/plataformas`): la respuesta ahora incluye `repo` y `taiga` por plataforma (pueden ser `null`).
- **`admin/src/features/inicio/pages/InicioPage.jsx`**: nuevo componente reutilizable `IconLink` que envuelve un `Button type="text"` icono-only con `Tooltip` y soporta navegación interna (`react-router`) o externa (`target="_blank"`). `PlataformaCard` se rediseña: ya no envuelve la card entera en un `<Link>` (evita anidación de `<a>`); el footer muestra un grupo horizontal de iconos minimalistas SVG de Ant Design — `LinkOutlined` para visitar la app (sólo si `url && healthy`), `GithubOutlined` para el repo, `ProjectOutlined` para el tablero Taiga. Cada icono se renderiza únicamente si el campo correspondiente está poblado.

#### Por qué bump minor

Nueva característica visible al usuario en la pantalla de Inicio del admin, sin romper compatibilidad de APIs ni schemas.

---

## [1.5.0] - 2026-05-21

### Admin: limpieza de lint (159 → 0 problemas)

CI venía bloqueado en `npm run lint` con 78 errores + 81 warnings de `eslint-plugin-react-hooks@7` (reglas pensadas para React Compiler, que no está activado en `vite.config.js`).

- **`--fix` automático** resolvió 71 errores menores (indent, quotes, etc.) en muchos archivos.
- **`admin/src/features/mapalab-geoserver-files/pages/GeoserverFilesPage.jsx`**: el `<a onClick>` del Breadcrumb se reemplazó por `<Button type="link" size="small">`, eliminando los 3 errores `jsx-a11y` de la línea 449 (anchor-is-valid, click-events-have-key-events, no-static-element-interactions).
- **`admin/src/features/mapalab-layers/components/layersEditor/LayerNoticeSection.jsx`**: se eliminaron los dos `useMemo` que envolvían `dayjs(...)` para `validFromValue`/`validUntilValue` (resolvían `react-hooks/preserve-manual-memoization`). Se quitó el import `useMemo` ya no usado.
- **`admin/eslint.config.js`**:
  - `react-hooks/set-state-in-effect` pasa de `'warn'` a `'off'` global (regla orientada a React Compiler que generaba 81 warnings en patrones legítimos de data fetching). Se elimina el override redundante para 6 archivos.
  - `GeoserverFilesPage.jsx` y `LayerNoticeSection.jsx` se añaden al override de `max-lines: 'off'` (ambos pasan de 300 líneas, refactor fuera del scope).
  - `sider-config.jsx` y `LayerNoticeSection.jsx` se añaden al override de `react-refresh/only-export-components: 'off'` (exportan constantes/funciones junto al componente).

### Backend: HUACHICOL_ONTOY_URL apuntaba a Grafana

En `.env.production` el `HUACHICOL_ONTOY_URL` estaba apuntando a `http://host.docker.internal:3000/api/health` (Grafana), cuyo JSON devuelve `{"version": "12.x.x"}`. Esto provocaba que la sección "Plataformas del ecosistema" del admin mostrara Huachicol como **v12** en lugar de la versión real del stack.

- **`.env.production.example`** ya tenía el patrón correcto (`http://<gateway_hub_host>/huachicol/ontoy`); los `.env` reales habían quedado desincronizados. El fix consiste en alinear `HUACHICOL_ONTOY_URL` con el patrón usado por acervo, geoserver, sieej y gateway-hub (`http://gateway-hub-nginx-1/huachicol/ontoy`), que sirve el sidecar `huachicol-version-api` y devuelve la versión del stack desde `huachicol/VERSION` (`1.20.3`).

## [1.4.0] - 2026-05-20

### MapaLab admin: soft delete reversible de capas

Hasta ahora no había forma de borrar capas, temas, etiquetas, categorías ni grupos del árbol. Se agrega un sistema de **soft delete** reversible, con check de referencias y flujo de revisión para editores no-admin.

**Backend**:

- **Migración alembic** `dataengine/0011_layer_deleted_at`: agrega `deleted_at TIMESTAMPTZ NULL` y `deleted_by VARCHAR(100) NULL` a `mapalab.layers`. Índices parciales `ix_layers_alive WHERE deleted_at IS NULL` y `ix_layers_deleted WHERE deleted_at IS NOT NULL` para queries rápidos en ambos lados.
- **`api/app/models/layer.py`**: columnas `deleted_at` y `deleted_by` en el modelo `Layer`.
- **`api/app/schemas/layer.py`**: `LayerResponse` expone `deletedAt`/`deletedBy`. Schemas nuevos `DeletedLayerSummary` y `LayerReferencesResponse`.
- **`api/app/services/layer_service.py`**: funciones `soft_delete_layer`, `restore_layer`, `purge_layer` (hard delete, sólo sobre capas archivadas), `list_deleted_layers`, `count_alive_children`, `is_in_initial_order`. `find_or_create_auto_leaf` filtra `deleted_at IS NULL` al buscar capas existentes.
- **`api/app/api/routes/layers/crud.py`**: endpoints nuevos:
  - `DELETE /layers/{id}?force=false` (admin): soft-delete. Bloquea si hay hijos activos (409). Advierte con `references` en el detail si está en `initial_layer_order` o en eventos publicados; `force=true` lo archiva ignorando refs no bloqueantes.
  - `POST /layers/{id}/restore` (admin): rechaza si el padre también está archivado.
  - `DELETE /layers/{id}/purge` (admin): hard delete real, sólo sobre archivadas.
  - `GET /layers/deleted` (editor+): lista la papelera.
  - `GET /layers/{id}/references` (editor+): devuelve `childrenCount`, `inInitialOrder` y eventos publicados que la usan. Helper `_capa_references_layer` recursivo (recorre sub-`capas` de categorías).
  - Rutas reordenadas: `/deleted` y `/{layer_id}/references` ahora se declaran ANTES de `/{layer_id}` para que FastAPI matchee correctamente (sin esto, "deleted" se interpretaba como id literal y devolvía 500).
- **`api/app/api/routes/borradores.py`**: nuevo endpoint `POST /borradores/layer/{layer_id}/solicitar-eliminacion` para que editores no-admin pidan archivado. Crea/actualiza borrador con `data={action: 'delete'}` en estado `pendiente_revision`.
- **`api/app/services/borrador_service.py::_apply_layer`**: detecta `data.action` `'delete'` o `'restore'` y delega a `soft_delete_layer` / `restore_layer` al aprobar. El caso default sigue siendo update/create.

**Filtrado del cache de árbol** (para que las archivadas no aparezcan en el visor):

- **`mapalab/backend/app/repositories/layers_repository.py`**: `get_all_layers`, `get_max_updated_at`, `count_layers`, `search_layers` filtran `deleted_at IS NULL`.
- **`dataengine/jobs/run_refresh_layer_tree.py`**: `_fetch_layers` y `_max_updated_at` filtran `deleted_at IS NULL`. El cron diario y el refresh manual ya no incluyen capas archivadas.

**Frontend admin**:

- **`admin/src/features/mapalab-layers/hooks/useLayerTreeAdmin.js`**: hooks nuevos `restoreLayer`, `purgeLayer`, `listDeletedLayers`, `getLayerReferences`, `requestLayerDeletion`. `deleteLayer` acepta `{ force }` opcional.
- **`admin/src/features/mapalab-layers/components/DeleteLayerModal.jsx`** (nuevo): modal con patrón **confirm-by-name** (estilo GitHub). El admin/editor debe escribir el nombre exacto de la capa para habilitar el botón; texto copiable. Muestra refs bloqueantes (hijos activos → rojo) vs advertencias (initial_order, eventos publicados → naranja). Si no es admin, el botón dice "Solicitar archivado" y dispara el flujo de borrador en revisión. Si es admin con refs no bloqueantes, "Archivar de todos modos" manda `?force=true`.
- **`admin/src/features/mapalab-layers/components/DeletedLayersList.jsx`** (nuevo): tabla de papelera con `Restaurar` + `Purgar` (con `Popconfirm`). Solo admin actúa; editor ve readonly. Container con `height: 100%` + `overflow: auto` para que la tabla scrollee verticalmente dentro del tab.

### MapaLab admin: editor inline en el árbol de capas (accordion) + tabs Capas/Eventos/Papelera

Rediseño completo de `/mapalab/layers`. El árbol pasa de vivir en un `<Sider>` lateral a ocupar todo el ancho; al hacer click sobre un nodo, el editor de esa capa se abre **inline** debajo del item (accordion), sin sheet inferior ni drawer. Tabs internas para alternar entre Capas, Eventos y Papelera.

- **`admin/src/features/mapalab-layers/components/LayersTreeListInline.jsx`** (nuevo): lista recursiva custom que reemplaza al `<Tree>` virtual de AntD en la tab de Capas. Filtro por búsqueda con auto-expand de ramas que matchean. Auto-expand de ancestros al cargar desde URL. Persistencia de keys expandidas en `localStorage` (`mapalab_layers_inline_expanded`). Soporta `editorContent` prop para inyectar el editor inline y `actionButtons` para los botones de acción que viven en el row del item seleccionado.
- **`admin/src/features/mapalab-layers/components/LayersTreeBranch.jsx`** (nuevo): `NodeRow` + `NodeBranch` recursivo extraídos para mantener `LayersTreeListInline` bajo 300 líneas. Render detallado por nodo: título (line-clamp 2 desktop, 1 mobile) + tag de tipo + workspace alias + geoserver layer + tags `oculto`/`disabled`. Botón colapsar/expandir editor (`▴/▾`) inline en el row seleccionado. En mobile + seleccionado, el row apila vertical: título arriba, action buttons abajo (evita el bug de `flexWrap` que crecía el row a varias líneas).
- **`admin/src/features/mapalab-eventos/hooks/useEventoTreeNodes.js`** (nuevo): convierte eventos a tree nodes para la tab Eventos. Recursivo para categorías. Keys namespaceadas con `__eventos_root__`, `evento-{id}`, `evento-{id}-cat-{i}`, `evento-{id}-eti-{i}`, `evento-{id}-cap-{i}-{ws}/{layer}`.
- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: rediseño:
  - Eliminados `useResizableWidth`, `siderCollapsed/siderWidth`, sheet inferior, imports `Layout`/`Sider`/`MenuUnfoldOutlined`/`LeftOutlined`/`DownOutlined`/`UpOutlined`.
  - `editorBody` se compone como `Form` con tabs `tabPosition="top"` siempre (antes alternaba con `left` en desktop).
  - Tab "Capas" usa `LayersTreeListInline` con `editorContent={editorBody}` y `actionButtons` (Archivar + Guardar, o Borrador + Revisión para no-admin).
  - Tab "Eventos" usa `LayersTreeListInline` (sin editor inline, sólo navegación) con el sub-árbol de `useEventosTreeNode`. Auto-switch a esta tab cuando se navega a un nodo de evento desde URL.
  - Tab "Papelera" con `DeletedLayersList`.
  - Tab activa persiste en `localStorage` (`mapalab.layerEditor.treeTab`).
  - `handleSelectFromTree` maneja keys `evento-*` y navega al editor de evento o a la capa real según corresponda.
  - `actionButtons` (Archivar/Guardar) movidos al row del item seleccionado, no en el header del editor. `size="small"` y labels acortados (`Archivar`/`Solicitar`/`Borrador`/`Revisión`) para que no compitan con las tags.
- **`admin/src/features/mapalab-layers/components/LayersTreeSider.jsx`**: limpieza — eliminado el `viewMode` (compact/detailed), `DetailedNodeTitle`, `VIEW_MODE_KEY`, `NODE_COLORS`/`NODE_ICONS`/`NODE_TAG_COLORS`/`PROPERTY_TAG_COLOR` ya no usados, imports muertos. `itemHeight` fijo en 44.
- **`admin/src/features/mapalab-layers/constants/nodeTypes.js`**: agregadas entradas en `NODE_TYPE_LABELS` para los 5 tipos nuevos (`evento-root`, `evento`, `evento-categoria`, `evento-etiqueta`, `evento-capa`).

### MapaLab admin: UX del editor de eventos (BBox, icon picker, refactor)

- **`admin/src/features/mapalab-eventos/components/BBoxField.jsx`** — reescrito. Top-level pasa de 3 opciones (`Sin zoom` / `Coordenadas manuales` / `Dibujar en mapa`) a 2 (`Sin zoom` / `Vista del mapa`). Las coordenadas manuales se fusionaron como sección colapsable (`<Collapse>`) debajo del mini-mapa. El modo Draw eliminado. Dentro de "Vista del mapa" hay dos modos de captura: `Usar esta vista` (botón explícito que captura el `view.calculateExtent()` actual) o `Automático` (escucha `moveend` con debounce 250ms y actualiza en vivo). El `MapPicker` sustituye al `MiniMap`.
- **`admin/src/features/mapalab-eventos/components/EventoIconPicker.jsx`** — alineado con `NoticeIconField`: botón `<ClearOutlined>` inline en el `Space.Compact` cuando hay valor. Texto de convención: `mapalab/eventos/` como prefijo recomendado; `iieg/iconos/` queda como alternativa para iconos compartidos entre dependencias.
- **`admin/src/features/mapalab-eventos/hooks/useEventos.js`** + **`admin/src/features/mapalab-eventos/components/AddCapaModal.jsx`** — refactor de `useState` + `useCallback` que disparaba la regla `react-hooks/set-state-in-effect` (3 warnings preexistentes). Sustituidos por `useReducer` con acciones `fetching` / `success` / `error`; el `setState` síncrono dentro del effect se reemplaza por `dispatch`. Se eliminó el `setEvento` del return de `useEvento` (no se usaba fuera del módulo).
- **`admin/src/features/mapalab-eventos/components/CapasField.jsx`** — botón "Agregar categoría" en el toolbar raíz; las categorías se renderizan como filas expandibles (AntD `expandable.expandedRowRender`) con su propia sub-tabla. El modal de agregar capa reutiliza `AddCapaModal` con contexto (`addingToCategoria`) para insertar en raíz o en una categoría. Las claves duplicadas se previenen recorriendo recursivamente `value` (`collectTaken`).
- **`admin/src/features/mapalab-eventos/components/capasTableColumns.jsx`** (nuevo): `buildCapasColumns(...)` extraído para reusar columnas entre tabla raíz y sub-tabla de cada categoría.
- **`admin/src/features/mapalab-eventos/components/CapasSortableRow.jsx`** (nuevo): wrapper de `<tr>` con `useSortable` de `@dnd-kit/sortable` y `RowContext` que expone `listeners` + `setActivatorNodeRef` para que el handle `<DragHandleCell>` viva en una celda específica.
- **Drag-and-drop intra-container** + **dropdown "Mover a..."** para cross-container (root ↔ categorías). `arrayMove` para reorder; `moveItemAcrossContainers` para los 3 casos (root→cat, cat→root, cat→cat), preservando orden y ajustando índices para evitar shift.
- **`api/app/schemas/evento.py::CapaRef`**: `tipo` ahora acepta `'categoria'` además de `'capa'` y `'etiqueta'`; campo recursivo `capas: list[CapaRef] | None` con `model_rebuild()`. El validador rechaza categorías anidadas (profundidad > 1), categorías sin `alias`, y capas/etiquetas con `capas` definido.
- **`api/tests/test_eventos_validation.py`**: nuevos tests `test_categoria_sin_alias_rechazada`, `test_categoria_con_subcapas_aceptada`, `test_categoria_anidada_rechazada`, `test_capa_con_subcapas_rechazada`.

### MapaLab admin: aprovechar ancho completo + paddings mobile a la mitad

- **`admin/src/app/MainLayout.jsx`**: el `<Content>` global del admin pasa de `margin: '12px 8px'` + `padding: 12` a `margin: '6px 4px'` + `padding: 6` en mobile (desktop sin cambios). Recupera ~16px de ancho útil en mobile.
- **`admin/src/index.css`**: la media query `@media (max-width: 767px)` global tenía overrides con `!important` (`.ant-layout-content`, `.ant-card-head`, `.ant-card-head-wrapper`, `.ant-card-body`) que ganaban contra el inline style del MainLayout. Reducidos todos a la mitad: `12px → 6px`.
- **`admin/src/features/inicio/pages/InicioPage.jsx`**: tabla "Mis borradores" con `scroll={{ x: 'max-content' }}` para que tenga scroll horizontal interno en mobile en lugar de empujar el viewport.
- **Páginas del submenu mapalab**: quitados `maxWidth` + `margin: '0 auto'` de los `<Content>` para que aprovechen el ancho de pantalla. `padding mobile: 12 → 6` también:
  - `mapalab-eventos/pages/EventoEditPage.jsx` (maxWidth 1100)
  - `mapalab-eventos/pages/EventosListPage.jsx` (maxWidth 1200)
  - `mapalab-symbols/pages/SymbolsPage.jsx` (maxWidth 1400)
  - `mapalab-stats/pages/MapalabStatsPage.jsx` (maxWidth 1400)
  - `mapalab-api-keys/pages/MapalabApiKeysPage.jsx` (maxWidth 1280)
  - `mapalab-home/pages/HomePage.jsx` (maxWidth 1100, dos lugares)
  - `mapalab-layers/pages/InitialLayerOrderPage.jsx` (maxWidth 900)
  - `mapalab-geoserver-files/pages/GeoserverFilesPage.jsx` (sólo padding mobile)

### Catálogo de símbolos SVG como archivo + módulo "Recursos GeoServer"

Dos features complementarias para que el equipo geoespacial pueda gestionar SVG/PNG/TIFF que usan sus SLDs sin depender de un admin con SSH a la VM.

#### Símbolos `kind='svg'` ahora son archivos (no XML inline)

El catálogo de `/mapalab/simbolos` admitía `kind='svg'` como XML inline en la columna `value`, pero esa modalidad nunca funcionó en el editor SLD (`_apply_sld` la rechazaba y `<SymbolPicker>` los deshabilitaba). Se refactorizó para que los SVG sean **archivos** subidos al bucket Acervo `iieg/leyendas/`, y GeoServer los referencie por URL via `<ExternalGraphic>` (el URLCheck `acervo_iieg_leyendas` ya provisionado por `geoserver` 1.22.0 los autoriza).

**Backend**:

- **`api/app/models/symbol.py`**: nueva columna `bucket_slug VARCHAR(50) NOT NULL DEFAULT 'mapalab'`. Requiere migración `dataengine/0010_symbol_bucket_slug` (publicada en el changelog de dataengine).
- **`api/app/services/symbol_service.py`**: ya no hardcodea el bucket. `_acervo_client(mariachi_db, bucket_slug)` acepta el bucket destino. Nueva función `create_svg_symbol(...)` que sube al bucket `iieg` bajo `leyendas/`. Helpers `_object_public_url(bucket_slug, key)` y `_object_geoserver_url(bucket_slug, key)` parametrizados. `delete_symbol` y `delete_category` agrupan por bucket para borrar correctamente cuando hay objetos en `mapalab` (emoji PNG rasterizado) e `iieg` (SVG).
- **`api/app/services/borrador_service.py::_apply_sld`** (shape `point`): acepta `kind='svg'` además de `kind='image'` y `kind='emoji'`. Usa `symbol.bucket_slug` para construir la URL interna que GeoServer fetcha al renderizar.
- **`api/app/schemas/symbol.py`**: `SymbolCreate` ya no requiere `value` para `kind='svg'`; el archivo se sube por el endpoint multipart. `SymbolResponse` expone `bucketSlug`.
- **`api/app/api/routes/symbols.py`**: el endpoint `POST /symbols/upload` acepta `Form kind` (`'image'` por default, `'svg'` opcional) para rutear al bucket destino correcto.

**Frontend**:

- **`admin/src/features/mapalab-symbols/api/symbolsService.js`**: `uploadFileSymbol({kind})` genérico + helpers `uploadImageSymbol` / `uploadSvgSymbol`.
- **`admin/src/features/mapalab-symbols/components/SymbolFormModal.jsx`**: el kind `svg` ahora muestra un `<Dragger>` que acepta `.svg` (no un `<TextArea>` de XML inline). Etiqueta del Dragger indica destino: `iieg/leyendas/`. `image` queda como antes (PNG/JPG/WebP/GIF → `mapalab/simbologia/`).
- **`admin/src/features/mapalab-symbols/components/SymbolPreview.jsx`**: renderiza SVG via `<img src={imageUrl}>` (no inline HTML). El SVG es un recurso público del bucket, no XML embebido.
- **`admin/src/features/mapalab-layers/components/sldEditor/SymbolPicker.jsx`**: destrabados los `kind='svg'`. Ahora son seleccionables en el editor de point SLD; mensaje informativo unificado.

#### Nuevo módulo "Recursos GeoServer" (`/mapalab/recursos-geoserver`)

Los analistas geoespaciales editan SLDs directamente desde el GeoServer Web Admin, y necesitan subir SVG/PNG/TIFF al directorio `geoserver_data/styles/` para referenciarlos con `xlink:href="ruta/archivo.ext"`. Antes solo Edgar podía subirlos (acceso al volumen). Ahora cualquier `editora` del proyecto mapalab puede gestionar esos archivos desde el admin.

**Backend**:

- **`api/app/services/geoserver_client.py`**: 4 métodos nuevos que proxypan al REST resource API de GeoServer:
  - `browse_styles_dir(prefix='')` — listado **no recursivo** de un nivel, separa carpetas vs archivos. Detecta directorios por `link.type === 'text/html'` + sin extensión.
  - `get_style_file_bytes(name)` — descarga bytes + content-type.
  - `put_style_file(name, content, content_type)` — upload a `geoserver_data/styles/<name>` (acepta paths con `/` para subcarpetas, GeoServer crea las carpetas automáticamente).
  - `delete_style_file(name)` — borra; devuelve `False` si no existía.
- **`api/app/schemas/geoserver_file.py`** (nuevo): `GeoServerFileResponse` (incluye `sldSnippet` listo para copiar), `GeoServerFolderResponse`, `GeoServerBrowseResponse`.
- **`api/app/api/routes/geoserver.py`**: 4 endpoints bajo `/api/administrador/geoserver/files`:
  - `GET /files?path=svg` — browse por nivel (`{path, folders, files}`).
  - `POST /files` — upload multipart con campo `name` que puede incluir subcarpeta (ej. `tiff/raster.tif`).
  - `GET /files/{name:path}` — descarga/preview del archivo (proxy con `Cache-Control: public, max-age=300`).
  - `DELETE /files/{name:path}` — borra (con confirm en UI).
  - Extensiones soportadas: `svg`, `png`, `jpg`, `jpeg`, `webp`, `gif`, `tiff`, `tif` (la lista vive en `_GEOSERVER_FILE_ALLOWED_EXT`).
  - Validación anti path-traversal por segmento (`[a-zA-Z0-9._-]+`), bloquea `..` y paths absolutos. Tamaño máximo 5 MB.
  - Roles: `editor` del proyecto mapalab (no solo `tetlamamakani`).

**Frontend** (`admin/src/features/mapalab-geoserver-files/` nuevo):

- **`pages/GeoserverFilesPage.jsx`**: explorador de archivos estilo file browser. Breadcrumb arriba (`🏠 Raíz / svg / ...` con clicks navegables), botones `Nueva carpeta` y `Subir archivo`, búsqueda local del nivel actual. Las carpetas se renderizan primero con fondo amarillo y `<FolderOpenOutlined>` (click entra); los archivos después con preview de imagen (o placeholder `<FileImageOutlined>` + label para TIFF que browsers no rendean). `Empty state` contextual según si hay nada en raíz o si una carpeta navegada está vacía.
- **`components/FileUploadModal.jsx`**: modal con `<Dragger>` que acepta todas las extensiones soportadas. Muestra arriba el `Destino: styles/<currentPath>` para que el analista sepa dónde se va a subir (no tiene que escribir el path completo, solo el nombre del archivo). Compone el `name` final con `${currentPath}/${basename}`.
- **`components/SldSnippetModal.jsx`**: modal con el `<ExternalGraphic>` listo para pegar en el SLD (snippet copiable al portapapeles vía `navigator.clipboard`).
- **`api/geoserverFilesService.js`**: `browseGeoserverFiles(path)`, `uploadGeoserverFile`, `deleteGeoserverFile`.
- **Nueva carpeta sin tocar backend**: el botón "Nueva carpeta" agrega un path local (`pendingFolders` state) y navega ahí. Como GeoServer crea carpetas automáticamente al hacer `PUT /rest/resource/styles/<path>/<file>`, la carpeta se materializa con el primer upload (el tag "(pendiente)" en la carpeta desaparece cuando se persiste).

#### Sider y UI

- **`admin/src/app/sider-registry.jsx`**:
  - Nueva entrada `/mapalab/recursos-geoserver` en el grupo MapaLab, con badge BETA, icono `<FileTextOutlined>`.
  - Nuevo proyecto **Tablerillos** (placeholder bloqueado siguiendo el patrón de Portalito): `disabled: true`, icono `<DashboardOutlined>`, un item placeholder `/tablerillos`. Reservar el espacio en el sider para un módulo futuro.
- **`admin/src/main.jsx`**: lazy import del `GeoserverFilesPage` y ruta `/mapalab/recursos-geoserver` protegida por `['tetlamamakani', 'editora']`.
- **`admin/src/index.css`**: regla CSS para el sider — `overflow: visible !important` en `.ant-menu-item`, `.ant-menu-submenu-title` y `.ant-menu-title-content` (limitado a `:not(.ant-layout-sider-collapsed)` para no afectar el modo icon-only). Sin esto, el badge BETA se cortaba cuando el label era largo (ej. "Recursos GeoServer (BETA)").

#### Prerrequisito de infraestructura (ya satisfecho)

- GeoServer 1.22.0 expone los URLChecks `acervo_mapalab` y `acervo_iieg_leyendas` automáticamente vía `make up`. Sin estos checks, GeoServer bloquea el `<ExternalGraphic>` que apunta al bucket interno y los SVG no renderean.

#### Iteración: tabs por workspace + búsqueda global + breadcrumb condicional

Tras subir la primera versión al equipo geoespacial salió el descubrimiento de que **GeoServer no hace fallback** al `styles/` global cuando un SLD workspace-scoped referencia un recurso con path relativo (`xlink:href="svg/foo.png"`): los archivos tienen que vivir literalmente en `workspaces/<ws>/styles/...`. La primera versión solo subía al global y los SLDs workspace-scoped no encontraban nada. Esta iteración agrega el ámbito workspace al CRUD y rediseña el explorador.

**Backend**:

- **`api/app/services/geoserver_client.py`**: los 4 métodos (`browse_styles_dir`, `get_style_file_bytes`, `put_style_file`, `delete_style_file`) aceptan parámetro opcional `workspace`. Cuando se pasa, la URL base cambia de `resource/styles/...` a `resource/workspaces/<ws>/styles/...`. Helper privado `_styles_base(workspace)` centraliza esa lógica. Nuevo `list_all_style_files(workspace=None)` recursivo (reusa `browse_styles_dir`) para el search global.
- **`api/app/schemas/geoserver_file.py`**: `GeoServerFileResponse` y `GeoServerBrowseResponse` exponen `workspace` opcional. Nuevo `GeoServerSearchResponse` con `query`, `results` y `truncated`.
- **`api/app/api/routes/geoserver.py`**: los endpoints existentes aceptan `workspace` (query en GET/DELETE, Form en POST) validado con regex `[a-zA-Z0-9_-]+`. El `downloadUrl` del response incluye `?workspace=...` automáticamente para que el frontend descargue del lugar correcto. Nuevo endpoint **`GET /geoserver/files/search?q=texto`** que recorre el `styles/` global y cada workspace registrado en `dataengine.mapalab.workspaces`, filtra por substring case-insensitive, limita a 500 resultados (`truncated=true` si pasa).

**Frontend**:

- **`admin/src/features/mapalab-geoserver-files/api/geoserverFilesService.js`**: nuevo `listGeoserverWorkspaces()` (reusa `/geoserver/workspaces` que ya existía) y `searchGeoserverFiles(q)`. Las 3 funciones existentes propagan `workspace`.
- **`admin/src/features/mapalab-geoserver-files/pages/GeoserverFilesPage.jsx`** (rediseño del layout):
  - **Buscador grande arriba** (full width, `size="large"`, ícono lupa, debounce 350ms) que busca en TODOS los workspaces + global. Cuando hay texto en el input se entra a "modo búsqueda": se ocultan tabs/breadcrumb/folders, se muestran solo archivos con un `<Tag>` del workspace al que pertenecen (`blue` para workspace específico, `default` para global) y la ruta completa en el tooltip. Botones "Subir/Nueva carpeta/Reload" se deshabilitan en modo búsqueda. Limpiar el input vuelve al modo browse.
  - **Tabs auto-update**: cada vez que se hace `reload()` (al cambiar de path, subir, borrar o click en refresh) también se re-fetch la lista de workspaces. Si tu equipo registra un workspace nuevo en mapalab, aparece como tab sin recargar la página.
  - **Breadcrumb condicional**: solo se renderiza cuando `currentPath != ''`. En la raíz de una tab no se ve, queda más limpio. La navegación de regreso se hace por click en folders o cambio de tab.
  - **Borrar desde resultados de búsqueda** usa el workspace que viene en cada resultado, no el activo.
  - Tab persistida en `localStorage` (`mapalab.geoserverFiles.workspace`).
- **`admin/src/features/mapalab-geoserver-files/components/FileUploadModal.jsx`**: recibe `workspace` y `destinationLabel` como props, envía workspace al POST. El `<Tag>` de destino dice `workspaces/<ws>/styles/<currentPath>/` o `styles/<currentPath>/` según corresponda.

#### Caveats descubiertos en deploy

- **GeoServer `2.27.0`** (kartoza image) ocasionalmente crea directorios nuevos con permisos `drw-r--r--` (sin bit `x`), lo que al siguiente restart tira `AccessDeniedException` durante `WMSLifecycleHandler.loadFontsFromDataDirectory`. Fix puntual: `docker exec geoserver chmod 755 <dir>`. Fix preventivo (pendiente en el repo `geoserver/`): setear `umask 0022` en `scripts/entrypoint-wrapper.sh`.
- **Path resolution de `<ExternalGraphic>` en SLDs workspace-scoped**: GeoServer **NO** sube al `styles/` global como fallback. Tres alternativas: (1) subir el archivo al mismo workspace donde vive el SLD (lo que ahora hace nuestro CRUD via tabs), (2) prefijar el path con `file:styles/...` para que se resuelva relativo al `data_dir`, o (3) symlink `workspaces/<ws>/styles/svg → ../../../styles/svg`. La opción (1) es la que documentamos en la UI.

### Editor de capas: layout B (sheet inferior) + tabs Capas/Eventos/Papelera + soft-delete con flujo de revisión

#### Layout B y tabs

- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`** — rediseño completo: el árbol pasa de ocupar el `Sider` lateral a tener todo el ancho de la página dentro de un `<Card>` flex column. El editor de la capa seleccionada vive ahora en un **sheet inferior colapsable** (botón `▴/▾` para colapsar a 48px de header, drag handle para ajustar altura entre 160 y `viewport-160` px, persistido en `localStorage` como `mapalab.layerEditor.sheetHeight`/`sheetCollapsed`). Eliminados `useResizableWidth`, `siderCollapsed/siderWidth`, imports `Layout`/`Sider`.
- **Árbol con tabs**: dentro del `<Card>` ahora hay tres tabs — `Capas (N)`, `Eventos (M)`, `Papelera`. Cada una carga su propio `<LayersTreeSider>` o componente. La tab activa se persiste en `localStorage` (`mapalab.layerEditor.treeTab`). Auto-switch a "Eventos" cuando se navega a una capa de un evento desde URL/breadcrumb. Click en `Sin eventos publicados` muestra `<Empty>` con CTA "Ir al editor de eventos".

#### Soft-delete de nodos del árbol

Hasta ahora no había forma de eliminar capas, temas, etiquetas, categorías ni grupos. Se agrega un sistema de soft-delete reversible con flujo de revisión para no-admin:

**Backend**:

- **`dataengine/jobs/alembic/versions/20260520_0011_layer_deleted_at.py`** (nueva migración): `ALTER TABLE mapalab.layers ADD COLUMN deleted_at TIMESTAMPTZ NULL` + `deleted_by VARCHAR(100) NULL`. Índices parciales `ix_layers_alive WHERE deleted_at IS NULL` y `ix_layers_deleted WHERE deleted_at IS NOT NULL` para queries rápidos en ambos lados.
- **Modelos `mariachi/api/app/models/layer.py` y `mapalab/backend/app/models/layer.py`**: campos `deleted_at` y `deleted_by` agregados.
- **`api/app/services/layer_service.py`**: nuevas funciones `soft_delete_layer(session, layer, deleted_by)`, `restore_layer(session, layer, restored_by)`, `purge_layer(session, layer)` (hard delete, solo permitido sobre capas ya archivadas), `list_deleted_layers(session)`, `count_alive_children(session, layer_id)`, `is_in_initial_order(session, layer_id)`. La función `delete_layer` ahora delega a `soft_delete_layer` (compat). `find_or_create_auto_leaf` filtra `deleted_at IS NULL` al buscar capas existentes.
- **`api/app/schemas/layer.py`**: `LayerResponse` expone `deletedAt`/`deletedBy`. Nuevos schemas `DeletedLayerSummary` y `LayerReferencesResponse`.
- **`api/app/api/routes/layers/crud.py`**: endpoints nuevos / modificados:
  - `DELETE /layers/{id}?force=false` (admin): soft-delete. Si hay `children_count > 0` → 409 inmutable. Si hay `in_initial_order` o referencias en eventos publicados y `force=false` → 409 con `references` en el detail. Con `force=true` archiva ignorando refs no bloqueantes.
  - `POST /layers/{id}/restore` (admin): restaura `deleted_at=NULL`. Rechaza si el padre también está archivado.
  - `DELETE /layers/{id}/purge` (admin): hard delete real, solo permitido sobre capas ya archivadas.
  - `GET /layers/deleted` (editor+): lista la papelera.
  - `GET /layers/{id}/references` (editor+): devuelve `childrenCount`, `inInitialOrder`, lista de eventos publicados que la usan. Helper `_capa_references_layer` recursivo (recorre sub-`capas` de categorías).
- **`api/app/api/routes/borradores.py`**: nuevo endpoint `POST /borradores/layer/{layer_id}/solicitar-eliminacion` para que editores no-admin pidan archivado. Crea/actualiza borrador con `data={action: 'delete'}` en estado `pendiente_revision`.
- **`api/app/services/borrador_service.py::_apply_layer`**: detecta `data.action` `'delete'` o `'restore'` y delega a `soft_delete_layer` / `restore_layer` al aprobar. El caso default sigue siendo update/create.
- **`mapalab/backend/app/repositories/layers_repository.py`**: `get_all_layers`, `get_max_updated_at`, `count_layers`, `search_layers` ahora filtran `deleted_at IS NULL`. Sin esto, el visor seguiría mostrando capas archivadas hasta el próximo refresh del cache.
- **`dataengine/jobs/run_refresh_layer_tree.py`**: `_fetch_layers` y `_max_updated_at` filtran `deleted_at IS NULL`. El cron diario y el refresh manual ya no incluyen capas archivadas.

**Frontend admin**:

- **`admin/src/features/mapalab-layers/hooks/useLayerTreeAdmin.js`**: hooks nuevos `restoreLayer`, `purgeLayer`, `listDeletedLayers`, `getLayerReferences`, `requestLayerDeletion`. `deleteLayer` acepta `{ force }` opcional.
- **`admin/src/features/mapalab-layers/components/DeleteLayerModal.jsx`** (nuevo): modal de confirmación con patrón **confirm-by-name** (estilo GitHub). El admin/editor debe escribir el nombre exacto de la capa para habilitar el botón de archivar; texto copiable (`copyable={{ text: expectedName }}`). Muestra lista de referencias bloqueantes (hijos activos) vs advertencias (initial_order, eventos publicados). Si no es admin, el botón dice "Solicitar archivado a un admin" y dispara el flujo de borrador en revisión. Si es admin con referencias no bloqueantes, el botón dice "Archivar de todos modos" y manda `?force=true`.
- **`admin/src/features/mapalab-layers/components/DeletedLayersList.jsx`** (nuevo): tabla de la papelera con `Restaurar` + `Purgar` (con `Popconfirm` para confirmar irreversibilidad). Solo admin puede ejecutar acciones; editor ve readonly.
- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`**: botón `Archivar` (admin) / `Solicitar archivado` (editor) en `actionButtons` del header del sheet. Abre `<DeleteLayerModal>` con `getLayerReferences` pre-cargado. Nueva tab "Papelera" con `<DeletedLayersList>`.

**Pendientes**:

- Tests backend del flujo soft-delete (las fixtures de tests actuales no inicializan `mapalab.*` en SQLite — requiere setup adicional o usar Postgres ephemeral).
- Notificación a mapalab para invalidar cache cuando se archiva/restaura (ya cubierto por `notify_tree_changed` en cada endpoint).
- Permitir restaurar en cascada (si el padre está archivado, ofrecer restaurar padre + hijos en una operación).

## [1.3.0] - 2026-05-20

### Categorías en eventos de MapaLab + drag-and-drop del editor de capas

Coordinado con MapaLab, los eventos ahora aceptan un tercer tipo de item en `capas` además de `capa` y `etiqueta`: `categoria`. Una categoría es una carpeta expandible con su propio sub-array `capas` que puede contener capas y etiquetas. Profundidad máxima 1 (consistente con la jerarquía del árbol de capas principal: tema → categoría → etiqueta/capa).

#### Agregado

- **`api/app/schemas/evento.py::CapaRef`**: `tipo` ahora acepta `'categoria'` además de `'capa'` y `'etiqueta'`; se agrega campo recursivo `capas: list[CapaRef] | None` con `model_rebuild()` para resolver la autorreferencia. El validador rechaza categorías anidadas dentro de categorías (profundidad > 1), categorías sin `alias`, y capas/etiquetas con `capas` definido.
- **`api/tests/test_eventos_validation.py`**: nuevos tests `test_categoria_sin_alias_rechazada`, `test_categoria_con_subcapas_aceptada`, `test_categoria_anidada_rechazada`, `test_capa_con_subcapas_rechazada`.
- **`admin/src/features/mapalab-eventos/components/CapasField.jsx`**: botón "Agregar categoría" en el toolbar raíz; las categorías se renderizan como filas expandibles (AntD `expandable.expandedRowRender`, `defaultExpandAllRows`) con su propia sub-tabla que tiene botones "Agregar capa" y "Agregar etiqueta" locales. El modal de agregar capa reutiliza `AddCapaModal` con contexto (`addingToCategoria`) para insertar en la raíz o en una categoría. Las claves duplicadas se previenen recorriendo recursivamente `value` (helper `collectTaken`).
- **`admin/src/features/mapalab-eventos/components/capasTableColumns.jsx`**: nuevo módulo con `buildCapasColumns(...)`, extraído para que el componente quepa bajo el límite de 300 líneas y para reusar las columnas entre la tabla raíz y la sub-tabla de cada categoría.
- **`admin/src/features/mapalab-eventos/pages/EventoEditPage.jsx::normalizeCapas`**: recursivo, preserva `tipo: 'categoria'` con `capas` interna. Si por error llega una categoría anidada (del backend o de un draft), la degrada a `etiqueta` antes de cargarla al form.
- **`admin/src/features/mapalab-eventos/pages/EventosListPage.jsx::contarCapas`**: la columna "Capas" del listing ahora cuenta capas recursivamente (suma las que viven dentro de categorías).
- **`admin/src/features/mapalab-eventos/components/CapasSortableRow.jsx`** (nuevo): wrapper de `<tr>` con `useSortable` de `@dnd-kit/sortable` y `RowContext` que expone `listeners` + `setActivatorNodeRef` para que el handle `<DragHandleCell>` viva en una celda específica (no en toda la row). Sigue el patrón ya usado en `InitialLayerOrderPage`.
- **Drag-and-drop en el editor de capas del evento**: cada tabla (raíz + sub-tabla por categoría) está envuelta en su propio `DndContext` + `SortableContext`. La columna de orden manual con flechas ↑/↓ se reemplaza por un drag handle (`<HolderOutlined>`) en la primera columna. `arrayMove` aplica el reordenamiento al container correspondiente.
- **Mover entre contenedores**: nueva acción "mover a" (icono `<MenuOutlined>` con `<Dropdown>`) en cada fila de tipo `capa`/`etiqueta`. Las opciones se calculan dinámicamente: si el item está en raíz, lista cada categoría; si está dentro de una categoría, agrega "↑ Raíz" y las otras categorías. Las categorías mismas no exponen esta acción (solo viven en raíz). `moveItemAcrossContainers(src, idx, dst)` maneja los 3 casos (root→cat, cat→root, cat→cat) preservando orden y respetando el `srcIdx < dstIdx ? -1 : 0` para evitar shift cuando se mueve dentro de raíz.

### Versión

Bump de `1.2.0` → `1.3.0` (feature menor, sin breaking changes; compatibilidad hacia atrás garantizada para eventos sin categorías).

### Editor de eventos: rediseño de Geografía + apariencia consistente

- **`admin/src/features/mapalab-eventos/components/BBoxField.jsx`** — reescrito. Top-level pasa de 3 opciones (`Sin zoom` / `Coordenadas manuales` / `Dibujar en mapa`) a 2 (`Sin zoom` / `Vista del mapa`); las coordenadas manuales se fusionaron como sección colapsable (`<Collapse>`) debajo del mini-mapa. El modo `Draw` (encerrar en rectángulo) se eliminó. Dentro de "Vista del mapa" hay dos modos de captura: **`Usar esta vista`** (botón explícito captura el `view.calculateExtent()` actual) o **`Automático`** (escucha `moveend` con debounce 250ms y actualiza en vivo). El `MapPicker` sustituye al `MiniMap` anterior.
- **`admin/src/features/mapalab-eventos/components/EventoIconPicker.jsx`** — apariencia alineada con `NoticeIconField`: nuevo botón `<ClearOutlined>` inline en el `Space.Compact` cuando hay valor (consistente con el editor de avisos por capa). Texto explicativo de convención: **`mapalab/eventos/`** como prefijo recomendado en el bucket `mapalab`; alternativa `iieg/iconos/` para iconos compartidos entre dependencias.

### Árbol de capas: sección "Eventos" como sub-árbol virtual

Cuando se trabaja con eventos, había que abrir el editor de eventos para ver qué capas/categorías los componen y luego volver al árbol para editar las capas. Ahora los eventos publicados aparecen como una rama virtual al final del árbol de capas en `/mapalab/layers`, con su estructura recursiva (categorías → etiquetas/capas) tal como están configurados. Click en un nodo navega:

- nodo `Eventos` (raíz) → `/mapalab/eventos`
- nodo `Evento X` → `/mapalab/eventos/{id}/edit`
- nodo `Capa (evento)` → `/mapalab/layers/{layerId}/edit` (resuelve el `workspace/layer` contra `rawTree`)
- nodo `Categoría (evento)` / `Etiqueta (evento)` → sin acción (solo organizativos)

Cambios:

- **`admin/src/features/mapalab-eventos/hooks/useEventoTreeNodes.js`** (nuevo) — `buildEventosTreeNode(eventos, rawTree)` y `useEventosTreeNode(...)` convierten la lista de eventos al shape `treeData` que consume `LayersTreeSider`. Recursivo para categorías. Keys namespaceadas con `__eventos_root__`, `evento-{id}`, `evento-{id}-cat-{i}`, `evento-{id}-eti-{i}`, `evento-{id}-cap-{i}-{workspace}/{layer}`.
- **`admin/src/features/mapalab-layers/pages/LayerEditPage.jsx`** — consume `useEventosList()` + `useEventosTreeNode(...)`; `treeDataWithEventos = useMemo(() => eventosNode ? [...treeData, eventosNode] : treeData)`. `handleSelectFromTree` maneja las keys `evento*`. Los demás props (`onCreate`, `onReorder`, `onBulkTagsClick`) siguen apuntando al árbol real, no a la rama virtual.
- **`admin/src/features/mapalab-layers/components/LayersTreeSider.jsx`** — `NODE_COLORS`, `NODE_ICONS` y `NODE_TAG_COLORS` extendidos con los 5 tipos nuevos (`evento-root`, `evento`, `evento-categoria`, `evento-etiqueta`, `evento-capa`). Iconos: `<CalendarOutlined>` para la raíz, `<StarOutlined>` para cada evento, los otros reutilizan los iconos del árbol normal. `draggable.nodeDraggable` ahora bloquea el drag de cualquier nodo cuyo `nodeType` empiece con `evento` (no se pueden reordenar desde aquí; se editan en `/mapalab/eventos/{id}/edit`).
- **`admin/src/features/mapalab-layers/constants/nodeTypes.js::NODE_TYPE_LABELS`** — entradas en español para los nuevos tipos, que el `labelForNode` pueda renderizar el Tag de la vista detallada del sider.

### Warnings de lint resueltos

- **`admin/src/features/mapalab-eventos/hooks/useEventos.js`** y **`admin/src/features/mapalab-eventos/components/AddCapaModal.jsx`** — refactor de `useState` + `useCallback` que disparaba la regla `react-hooks/set-state-in-effect` (3 warnings preexistentes). Sustituidos por `useReducer` con acciones `fetching` / `success` / `error`; el setState síncrono dentro del effect se reemplaza por `dispatch`, que la regla no flagea. Se eliminó el `setEvento` del return de `useEvento` (no se usaba fuera del módulo, verificado por grep).

## [1.2.0] - 2026-05-20

### Editor de avisos por capa (notice) para MapaLab + soporte de telemetría

Coordinado con MapaLab 1.29.0 y dataengine 1.16.0, mariachi agrega el panel
completo de edición de avisos por capa, persistencia del shape vía Pydantic
y aceptación de los eventos de telemetría correspondientes.

#### Agregado

- **`api/app/schemas/layer.py`**: tipos `NoticeVariant` (`info`/`warning`/`neutral`/`banner`),
  `NoticeSize` (`small`/`medium`/`large`), `NoticePosition` (`top-center`/`bottom-center`),
  `NoticeArrowPosition` (`top`/`right`/`bottom`/`left`), `NoticeAnchorMode`
  (`viewport`/`coord`), `NoticeDismissPersistence` (`permanent`/`reopen`).
  Sub-schemas `LayerNoticeAnchorCoord`, `LayerNoticeCta`, `LayerNoticeZoomRange`,
  `LayerNotice` con validación de fechas ISO, URLs, lon/lat dentro de rango,
  zoom 0–24. Campo `notice: LayerNotice | None` agregado a `LayerBase` y
  `LayerUpdate`. Aceptan input en camelCase y serializan con alias.
- **`api/app/models/layer.py`**: columna `notice = Column(JSONB, nullable=True)`.
- **`api/app/services/layer_service.py`**: `_normalize_notice(value)` que
  convierte el sub-modelo a dict camelCase via `model_dump(by_alias=True)` antes
  de persistir, y descarta valores con `enabled: false` (los guarda como
  `None`). Aplicado tanto en `create_layer` (vía `_payload_to_row`) como en
  `update_layer`.
- **Schema de telemetría** (`api/app/schemas/mapalab_event.py`): `ALLOWED_EVENT_NAMES`
  incluye `layer_notice_view`, `layer_notice_dismiss`, `layer_notice_cta_click`.
  Sin esto, el collector retorna 422 y los eventos de notice no entran a la
  base de telemetría.

#### Admin (UI)

- **Nuevo tab "Aviso"** en `LayerEditPage` (visible para `group` y `leaf`).
  Bumpea `admin/package.json` a `1.2.0`.
- **`LayerNoticeSection.jsx`**: form completo con habilitar/deshabilitar,
  contenido (título o "Mensaje del banner"; descripción para no-banner;
  icono via `BucketFilePicker`), presentación (variante info/warning/neutral/banner,
  tamaño Compacto/Estándar/Destacado *— sólo visible cuando el aviso está
  anclado a un punto del mapa*, anclaje viewport/coord, posición top-center/
  bottom-center, posición de flecha si coord, dismissible con Radio.Group de
  permanencia con default `reopen`), visibilidad por zoom como subsección de
  Presentación (hereda del zoom de la capa si vacío), vigencia con fechas,
  enlace opcional con validación URL. Soporta `**negritas**` inline en título
  y descripción (parser markdown simple, no HTML).
- **`NoticeAnchorField.jsx`**: mini-mapa OpenLayers de 360px con WMS de la
  capa activa como referencia visual; click sobre el mapa fija el punto del
  aviso. Botones para tomar el zoom actual como mín/máx del `zoomRange`.
  Indicador en vivo del zoom actual y badge del rango (verde/rojo según si
  está dentro). Usa `defaultZoom` de la capa como vista inicial cuando está
  configurado. Debounce de 250ms en `updateParams` cuando cambian styles/cqlFilter
  para evitar flicker.
- **`NoticeIconField.jsx`**: clon de `TemaIconField` pero filtrado al bucket
  `iieg`, dirigido a la carpeta convencional `iconos/`.
- **Preview en vivo** del notice (sticky en desktop) con los mismos estilos
  finales que MapaLab (border-radius 8, shadow `0px 3px 24px #00000029`,
  icono 74px, título 18px/26px). Preview del banner es independiente (franja
  horizontal con marquee implícito). Badges de metadata bajo el preview
  muestran vigencia, persistencia del cierre, zoom range y coordenadas si
  aplica.
- **Cambio de variante preserva config**: al alternar entre info ↔ banner
  no se borran description/icon/anchorCoord — el frontend ignora lo que no
  aplica a cada variante.
- **`MediaPage.jsx`**: Alert closable que aparece cuando el bucket seleccionado
  es `iieg`, explicando la convención `iconos/` para iconos compartidos.

#### Backend (telemetría)

- Bumpea `api/pyproject.toml` a `1.2.0`.

## [1.1.1] - 2026-05-18

### Fix: healthcheck de `api` usa `urllib.request` (stdlib) en vez de `import httpx` cada 5s

Diagnostico en staging (`mapalab` GCP, 2c/7.8GB, todo el ecosistema co-residente) mostro `docker stats` reportando `mariachi-api` al **41% CPU sostenido** con los 4 workers gunicorn idle (0.2-0.3% c/u via `docker top`). La diferencia entre "container 41%" y "workers ~1%" venian de procesos efimeros del healthcheck Docker: cada 5s arrancaba un interprete Python que importaba `httpx` (~200-400ms CPU por cold-load de `ssl`, `asyncio`, `urllib3`, `h2`, `cryptography`, `bcrypt`) para hacer un `GET /health` que respondia en <1ms. A 12 ejecuciones/min era ~5-10% CPU sostenido visible en `docker stats` pero invisible en `docker top` por la efimeridad de cada proceso. En produccion S1 (8c/15GB) el sintoma es invisible (sobra CPU); en staging compartido golpeaba a postgres+geoserver+mapalab+gateway.

#### Cambiado

- **`docker-compose.yml`** (servicio `api`, healthcheck):
  - `test`: `import httpx; httpx.get(...).raise_for_status()` → `import urllib.request; urllib.request.urlopen(...).read()`. `urllib.request` es stdlib core, sin cold-load adicional. `urlopen` lanza `HTTPError` por default en 4xx/5xx — equivalente semantico al `raise_for_status()` previo (Docker interpreta exit code 0 = healthy, ≠ 0 = unhealthy en ambos casos). Costo CPU por ejecucion: ~200-400ms → ~20-40ms.
  - `interval`: `5s` → `15s`. Menos cold-starts por minuto.
  - `retries`: `10` → `5`. Tiempo total antes de marcar unhealthy: `5s × 10 = 50s` → `15s × 5 = 75s`. Margen aceptable para un panel admin de bajo trafico, mas tolerante a transientes (GC de Python, picos vecinos en staging compartido).
  - `timeout` y `start_period` sin cambios.

#### Impacto

- Staging: `mariachi-api` baja de **41% → ~7-10% CPU** sostenido segun la estimacion. Beneficia a postgres+geoserver+mapalab+gateway compitiendo por los 2 cores.
- Produccion S1: ahorro proporcional pequeno (~5-8% de 1 core sobre 8). No tiene impacto perceptible en latencia ni disponibilidad — solo libera ciclos.
- Sin regresion funcional: el contrato del healthcheck es identico (200 OK = healthy, error/timeout = unhealthy).

#### Despliegue

`docker compose up -d api` recrea el container y aplica el nuevo healthcheck. No requiere bajar el resto del stack.

---

## [1.1.0] - 2026-05-18

### Dashboard de ecosistema: version 100 % en vivo desde `/ontoy` (sin hardcodes)

Hasta `1.0.11` la seccion "Plataformas del ecosistema" mostraba un `static_version` hardcoded para 5 de las 8 plataformas (`dataengine`, `acervo`, `gateway-hub`, `huachicol`, `geoserver`). La logica de `sistema.py:104` decia `version = static_version or v_probe`, asi que el endpoint `/ontoy` real (cuando existia) se ignoraba. Esto obligaba a editar `platforms_config.py` a mano cada release de cualquier servicio. Tras el rollout de los sidecars `version-api` en geoserver (1.21.0), acervo (1.23.0) y huachicol (1.20.0) y el `proxy_pass` real en gateway-hub (1.25.0), ya hay un `/ontoy` autoritativo en cada repo.

#### Cambiado

- **`api/app/core/platforms_config.py`**: removidos los 5 campos `static_version` (`1.14.3`, `1.22.4`, `1.24.21`, `1.19.5`, `1.20.1`). Ahora todas las plataformas leen su version del probe en vivo. La rama `static_version or v_probe` en `sistema.py` queda como mecanismo de override puntual pero sin usuarios activos.
- **`.env.production.example` y `.env.staging.example`**: `HUACHICOL_ONTOY_URL` ahora apunta a `http://<gateway_hub_host>/huachicol/ontoy` (antes vacio, ya que la location no existia en gateway-hub <1.25.0). `DATAENGINE_ONTOY_URL` ahora apunta a `http://host.docker.internal:8088/ontoy` (puerto del container `dataengine-jobs` en la red del host; dataengine no esta en `iieg-network`).

#### Operacion

Cuando un sidecar `version-api` no este arriba o el host no resuelva, la plataforma aparecera como `healthy: false` en `/api/sistema/plataformas` y la UI mostrara "no integrada" (mismo comportamiento que tenia `sieej` siempre). Antes el dashboard mentia con un numero hardcoded posiblemente desfasado por meses.

---

## [1.0.11] - 2026-05-18

### Fix de arranque del stack: `mariachi-nginx` espera a `api` healthy + se silencia warning de `worker_connections`

#### Cambiado

- **`nginx/nginx.conf`**: agregado `worker_rlimit_nofile 8192;` a nivel main. Antes el warning `2048 worker_connections exceed open file resource limit: 1024` aparecia en cada arranque porque `worker_connections 2048` heredaba el limite por defecto del contenedor (1024). El nuevo valor cubre `worker_processes auto × worker_connections × 2 ≈ 8192` y deja margen para rafagas (p.ej. dashboards que cargan ~250 capas en paralelo).
- **`docker-compose.yml`** (servicio `api`): agregado `healthcheck` con `python -c "import httpx; ..."` contra `http://localhost:8000/health` (que ya existe en `app/main.py`). Se uso `httpx` porque la imagen slim no incluye `curl` ni `wget`. Cadencia conservadora (`interval: 5s`, `retries: 10`, `start_period: 15s`) para tolerar el arranque del worker de gunicorn.
- **`docker-compose.yml`** (servicio `nginx`): `depends_on: - api` (lista corta, solo orden de inicio) → `depends_on: api: condition: service_healthy`. Elimina el race condition en cold-start: antes `mariachi-nginx` arrancaba antes de que `mariachi-api` apareciera en el DNS de Docker y moria con `[emerg] host not found in upstream "mariachi-api:8000" in /etc/nginx/conf.d/mariachi.conf:2`; el `restart: unless-stopped` lo recuperaba en el segundo intento, pero el log quedaba ruidoso.

---

## [1.0.10] - 2026-05-15

### Docs alineados: `MinIO` se engloba como `Acervo` + nota del notifier

#### Cambiado

- **`docs/ARCHITECTURE.md`**:
  - Tabla de tecnologias: `MinIO (driver) 7.2+` → `` `minio` (paquete pip) 7.2+ `` (cliente S3-compatible para Acervo). El paquete pip se llama asi por razones historicas; en docs no se enfatiza la marca.
  - Diagrama: `Acervo (MinIO S3)` → `Acervo (SeaweedFS S3)`.
  - Listado de services: `mapalab_notifier` ahora aclara "X-Internal-Token desde 1.0.3".

---

## [1.0.9] - 2026-05-15

### Re-sync de `platforms_config.py` por bump de acervo

#### Cambiado

- **`api/app/core/platforms_config.py`** (via `scripts/sync-platforms-config.py --apply`):
  - acervo: `1.22.2` → `1.22.3` (runbook ajustado a los verbos `make deploy` del gateway-hub)

---

## [1.0.8] - 2026-05-15

### Re-sync de `platforms_config.py` por bumps de gateway-hub

#### Cambiado

- **`api/app/core/platforms_config.py`** (via `scripts/sync-platforms-config.py --apply`):
  - gateway-hub: `1.24.19` → `1.24.20` (refinamiento del orquestador: `make up` deja de rebuildear, nuevo `make deploy`)

---

## [1.0.7] - 2026-05-15

### Re-sync de `platforms_config.py` por bump de gateway-hub

#### Cambiado

- **`api/app/core/platforms_config.py`** (via `scripts/sync-platforms-config.py --apply`):
  - gateway-hub: `1.24.18` → `1.24.19` (orquestador `ecosystem-up` reescrito)

---

## [1.0.6] - 2026-05-15

### Doc cleanup + re-sync de `platforms_config.py`

#### Cambiado

- **`docs/sieej.md`** (`Auth y RBAC` → manejo de buckets): instrucciones de rotacion de credenciales actualizadas. La referencia a `acervo/scripts/init-buckets.sh --rotate <bucket>` (script removido en acervo 1.22.0 cuando migro a SeaweedFS) se reemplaza por el flujo nuevo: editar `acervo/config/identities.json` + `docker compose restart acervo-seaweedfs`. Se mantiene mencion al comando viejo entre parentesis para que el equipo lo reconozca en docs/notas antiguas.
- **`api/app/core/platforms_config.py`** (re-sync con `sync-platforms-config.py`):
  - acervo: `1.22.1` → `1.22.2`
  - gateway-hub: `1.24.17` → `1.24.18`
  - huachicol: `1.19.3` → `1.19.4`

---

## [1.0.5] - 2026-05-15

### Script `sync-platforms-config.py` para detectar drift automáticamente

El drift de `static_version` entre `platforms_config.py` y las VERSIONs reales del ecosistema era trabajo manual y se repetía en cada bump de cualquier repo hermano. Este script lo automatiza.

#### Agregado

- **`scripts/sync-platforms-config.py`**: lee el archivo `VERSION` de cada repo hermano en `/IIEG/<repo>/` (acervo, dataengine, gateway-hub, geoserver, huachicol), parsea `api/app/core/platforms_config.py` con AST (no regex frágil — evita falsos negativos con placeholders tipo `{dataengine_ontoy_url}`) y reporta drift. Con `--apply` aplica los reemplazos.
  - Exit `0` si está alineado, `1` si hay drift (útil para CI / pre-commit).
  - Imprime los slugs sin `VERSION` localizable (skip silencioso) para revisión manual.
  - Después de aplicar, recuerda al operador bumpear mariachi y añadir entry al CHANGELOG.
- **Aplicado en este bump**: huachicol `1.19.2 -> 1.19.3` (alerta `MariachiTreeNotifyFailures` agregada).

#### Notas

- Solo cubre los 5 repos con `VERSION` plano. mapalab, mariachi y sieej se manejan por probe en vivo (ontoy / self).
- Si en el futuro alguno de esos 5 deja de usar `VERSION`, ampliar `read_version()` o usar el `static_version` manual.

---

## [1.0.4] - 2026-05-15

### `platforms_config.py` sincronizado con versiones reales del ecosistema

El dashboard `/sistema/plataformas` consultaba `static_version` de cada plataforma del ecosistema para reportar su versión, pero los valores estaban congelados meses atrás. Drift detectado durante la auditoría 2026-05-15.

#### Cambiado

- **`api/app/core/platforms_config.py`** (`static_version` por plataforma):
  - `dataengine`: `1.12.0` → `1.14.3` (+2 minor +3 patch)
  - `acervo`: `1.20.1` → `1.22.1` (+2 minor +1 patch; cubre la migración MinIO→SeaweedFS)
  - `gateway-hub`: `1.24.5` → `1.24.16` (+11 patches; incluye WFS-T bloqueado, promtail removido, REAL_IP_FROM parametrizable)
  - `huachicol`: `1.16.1` → `1.19.2` (+3 minor +2 patch; incluye alloy + alertas afinadas)
  - `geoserver`: `1.14.1` → `1.20.1` (+6 minor; incluye tuning JVM)

#### Notas

- `mapalab` y `sieej` no usan `static_version` (probe `ontoy` consulta versión en vivo).
- `mariachi` usa `probe: self` (consulta su propio `pyproject.toml`).
- Procedimiento recomendado: cada vez que un repo bumpee, sincronizar manualmente esta tabla. Mientras no exista un hook automático, este drift va a regresar.

---

## [1.0.3] - 2026-05-15

### `mapalab_notifier` envía `X-Internal-Token` al refresh-cache de mapalab

Hasta `1.0.2` el notifier disparaba `POST /layers/refresh-cache` sin auth: dependía exclusivamente de que el endpoint público estuviera bloqueado en el gateway (`return 403`). Los servicios co-residentes en `iieg-network` podían invalidar el cache de mapalab sin token. Coordinado con mapalab `1.28.5+` que ahora exige el header.

#### Cambiado

- **`app/services/mapalab_notifier.py::_do_notify`**: si `settings.mapalab_internal_token` está definido, se agrega `X-Internal-Token` al header del POST. Si no, mantiene el comportamiento previo (sin header) — útil para entornos legacy o cuando mapalab no exige aún el token. El header se envía en los 3 intentos del retry.

#### Agregado

- **`tests/test_integration_notify.py::test_notifier_sends_internal_token_header`**: valida que cuando `mapalab_internal_token` está seteado, el POST llega con el header `X-Internal-Token` correcto.

#### Notas

- Aplicar con `mapalab >= 1.28.5`. Si mapalab no tiene la dependencia activa todavía, este cambio es no-op (header ignorado).
- `MAPALAB_INTERNAL_TOKEN` debe ser **idéntico** en `mariachi/.env*` y en `mapalab/.env*` (mismo string).

---

## [1.0.2] - 2026-05-14

### CD sin tests redundantes y builds de Docker optimizados

El gate de tests que `1.0.1` metió dentro de `cd.yml` resultó redundante: el
flujo real es `develop` → `auto-merge.yml` (corre los tests) → merge a
`production` → `cd.yml`. Para cuando el CD arranca, los tests ya pasaron en
`auto-merge`. Repetirlos solo alargaba el deploy. En paralelo se optimizó el
build de imágenes.

#### Cambiado

- **`cd.yml`**: se eliminan los jobs `backend` y `admin`. `deploy` ya no declara
  `needs` de tests y `notify` depende solo de `[deploy, health-check]`. El gate
  de tests vive en `auto-merge.yml`, antes del merge a `production`.
- **`Makefile`**: `COMPOSE_BAKE=true` delega los builds a `buildx bake`, que
  construye `nginx` y `api` en paralelo.
- **`docker-compose.yml` / `docker-compose.dev.yml`**: healthchecks de `postgres`
  y `redis` más ágiles (`interval` 3s, `start_period`) para que los servicios
  dependientes arranquen antes.
- **`docker-compose.yml`**: `cron-sieej` reusa la imagen `mariachi-api` en vez de
  reconstruirla.
- **`api/Dockerfile`**: se quita `gcc` de las dependencias del sistema (no se
  necesita en runtime).
- **`nginx/Dockerfile`**: `npm install` → `npm ci` en el build del widget para
  instalaciones reproducibles.

#### Agregado

- **`.dockerignore`**: excluye `node_modules`, artefactos de build, caches y
  archivos no necesarios del contexto de build.

---

## [1.0.1] - 2026-05-14

### CI/CD — flujo unificado en `cd.yml` con notificación Discord única

Antes, un push a `production` disparaba dos flujos en paralelo con notificación
propia cada uno: `ci.yml` corría los tests y `notify-ci.yml` mandaba un embed
de "CI exitoso/fallido", mientras `cd.yml` desplegaba y mandaba otro embed de
"Deploy exitoso/fallido". Ya con el CD en producción, la notificación separada
del CI es ruido: ahora `cd.yml` orquesta todo el flujo y emite una sola
notificación al final.

#### Cambiado

- **`cd.yml`**: incorpora `backend` y `admin` (workflows reusables de test) como
  jobs previos. `deploy` ahora declara `needs: [backend, admin]`, por lo que el
  CI funciona como **gate**: si los tests fallan, no se despliega. El job
  `notify` depende de `[backend, admin, deploy, health-check]` y sigue siendo la
  única notificación a Discord. El embed de fallo distingue la etapa
  (`CI (tests)`, `Deploy SSH`, `Health Check`).
- **`ci.yml`**: `push` ahora usa `branches-ignore: [production]` para no
  duplicar los tests, que en `production` ya corren dentro de `cd.yml`. Sigue
  corriendo en el resto de ramas y en PRs.

#### Eliminado

- **`notify-ci.yml`**: la notificación de Discord del CI se elimina; queda
  consolidada en el job `notify` de `cd.yml`.

---

## [1.0.0] - 2026-05-14

### Lanzamiento a producción

Primera versión estable del ecosistema Mariachi (backend + admin + web + infra). A partir de aquí el versionado pasa a ser de producción bajo SemVer estándar; las siguientes entradas serán correcciones antes de incorporar características nuevas.

---

## [0.53.1] - 2026-05-14

### Renombrado del repositorio `mapalab-dataengine` → `dataengine`

Se actualizaron las referencias al repo `dataengine` (antes `mapalab-dataengine`) en `api/alembic/env.py`, `api/app/core/platforms_config.py`, `api/scripts/init_db.py` y docs (`ALEMBIC_MULTI_ENV.md`, `DATAENGINE_CREDENTIALS.md`, `RUNBOOK.md`, `context.md`).

---

## [0.53.0] - 2026-05-13

### Instrumentación HTTP del API para Prometheus

El endpoint `/metrics` del API ya emitía counters de negocio (`mariachi_login_success_total`, `mariachi_geoserver_calls_total`, etc.) pero no métricas HTTP estándar. Las reglas `HighLatency` y `HighErrorRate` del stack de monitoreo (huachicol) quedaban inactivas para mariachi porque dependen de `http_request_duration_seconds` y `http_requests_total{status}`. Se agrega `prometheus-fastapi-instrumentator` para emitirlas sin romper el render manual existente.

#### Agregado

- **`prometheus-fastapi-instrumentator>=7.0,<8.0`** en `api/pyproject.toml`.
- **Hook en `api/app/main.py`** dentro de `create_app()` justo después del `CORSMiddleware`: `Instrumentator(...).add(metrics.requests()).add(metrics.latency(...)).instrument(app)`. Buckets de latencia `(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10)`. `excluded_handlers=["^/metrics$", "^/health$", "^/ontoy$", "^/$"]` para no auto-instrumentar scrape ni endpoints de plataforma.
- **`api/app/api/metrics.py`** concatena `generate_latest(REGISTRY).decode('utf-8')` al final del render manual. El mismo `/metrics` expone counters de negocio + HTTP estándar en un solo scrape.

#### Notas

- **Cuidado con `excluded_handlers`**: usa `re.search`, no match exacto. Un patrón como `"/"` matchea cualquier path que contenga `/` (todos). Usar anclas `^...$`.
- Mariachi-api no publica puerto al host (solo accesible vía `mariachi-nginx` interno y por `iieg-network`), por lo que `/metrics` no necesita bloqueo nginx adicional — ya no se puede llegar desde fuera.

---

## [0.52.3] - 2026-05-13

### Lint admin limpio + refactor de 9 archivos grandes

Cierra los errores que el job `admin / test` de CI marcaba en rojo: nueve archivos pasando de 300 líneas (regla ESLint `max-lines`), dos `no-unused-vars`, un `react-hooks/exhaustive-deps`, un `react-refresh/only-export-components`, un `Compilation Skipped: existing memoization` del React Compiler, y siete exports muertos que knip detectaba en modo strict.

#### Bug fixes y limpieza

- **`colibri/pages/IntegracionPage.jsx`**: `previewMode` se asignaba pero nunca se leía — el Tabs ya tenía estado interno (`defaultActiveKey`). Eliminado el state.
- **`mapalab-api-keys/components/ApiKeyAuditoriaTab.jsx`**: dos issues. Import `message` no usado (eliminado). `Compilation Skipped: existing memoization could not be preserved` en el `useCallback` — React Compiler inferia `apiKey` como dep, pero el manual decía `apiKey?.id`. Fix: extraer `apiKeyId = apiKey?.id` a const para que ambas referencias coincidan.
- **`mapalab-layers/components/sldEditor/SymbolPicker.jsx`**: `useEffect([], () => listCategories().then((items) => { if (activeCategoryId == null) setActiveCategoryId(items[0].id) }))` leía `activeCategoryId` desde el closure. Fix sin agregar dep (no queremos re-cargar categories en cada cambio): functional updater `setActiveCategoryId((prev) => prev == null ? items[0].id : prev)`.
- **`mapalab-api-keys/routes.jsx`**: el archivo exportaba un `lazy(...)` además de la función `buildMapalabApiKeysRoutes`, lo que rompía Fast Refresh. Movido el `lazy()` dentro del cuerpo de la función para que el módulo solo exporte la función helper.
- **Exports muertos** (knip strict): `getDireccion`, `getSourceApp`, `getTipo`, `reordenarTipos` en services de Colibri; `getApiKey`, `listEventos`, `listUso` en mapalab-api-keys. Ninguno tenía consumidores en `src/**/*.jsx`.

#### Refactor max-lines

Nueve archivos superaban el cap de 300 líneas (cuenta sin blanks/comments). Solución: partir en sub-componentes/hooks. Sin cambios de comportamiento; sólo separación de responsabilidades.

| Archivo | Antes | Después | Extracciones |
|---|---|---|---|
| `main.jsx` | 315 | 246 | Rutas de Colibri → `features/colibri/routes.jsx` (`buildColibriRoutes`, mismo patrón que `buildMapalabApiKeysRoutes`) |
| `app/sider-config.jsx` | 328 | 161 | `PROJECT_REGISTRY` (datos del menú) → `app/sider-registry.jsx`; sider-config queda con helpers + `buildSiderItems` y re-exporta el registry |
| `colibri/pages/TiposPage.jsx` | 302 | 213 | Drawer + Form → `components/TipoFormDrawer.jsx` |
| `colibri/pages/ReportesListPage.jsx` | 342 | 248 | Columnas (plana + agrupada) → `components/reportesTableColumns.jsx` con builders `buildFlatColumns` / `buildGroupedColumns` |
| `colibri/pages/RoutesPage.jsx` | 347 | 235 | Drawer + Form → `components/RouteFormDrawer.jsx` |
| `colibri/components/ReporteDrawer.jsx` | 351 | 251 | Historial Timeline → `ReporteHistorialPanel.jsx`; respuestas del formulario → `ReporteRespuestasPanel.jsx` |
| `colibri/pages/SourceAppsPage.jsx` | 482 | 173 | `SourceAppFormDrawer.jsx` + `ApiKeyRevealModal.jsx` + `sourceAppsTableColumns.jsx` |
| `mapalab-layers/components/sldEditor/SldEditor.jsx` | 496 | 267 | Seis módulos hermanos: `SldActionsCard`, `SldNotEditableFallback`, `SldRejectModal`, `LayerGroupWarning`, `SldEditorLayout`, `sldEditorHelpers.js` |
| `mapalab-api-keys/components/ApiKeyPlaygroundTab.jsx` | 664 | 274 | Cinco sub-componentes (`PlaygroundConfigForm`, `PlaygroundPreviewCard`, `SavedEmbedsList`, `PlaygroundAlerts`) + helpers (`playgroundHelpers.js`) + hook (`usePlaygroundMessageBridge.js`) |

Resultado: `npm run lint` → 0 errores (70 warnings preexistentes, ninguno bloqueante). `npm test` → 36/36 pasando. `npm run check:dead-code:strict` → exit 0. `npm run build` → ok.

Bump 0.52.2 → 0.52.3.

---

## [0.52.2] - 2026-05-13

### Suite pytest del backend verde + dos bugs reales descubiertos al habilitarla

Al destrabar el lint de CI en `0.52.1`, GitHub Actions volvió a ejecutar `pytest -q` por primera vez en ~14 días. El suite estaba roto (122/341 fallos en limpio) por dos bugs de producción que pasaban inadvertidos y por shims de tipos que faltaban para correr en SQLite. Esta versión deja el suite en **379 / 379 pasando**.

#### Bugs de producción

- **`app/api/deps.py`**: `get_current_user` comparaba `iat` del JWT (segundos enteros) contra `password_changed_at` (datetime con microsegundos). Si un usuario era creado y emitía un token en el mismo segundo, la comparación `iat < password_changed_at` salía verdadera por unos microsegundos y devolvía `401 No se pudo validar las credenciales`. Raro en producción (entre create-user y login suele pasar más de un segundo) pero rompía pytest en cascada. Fix: truncar `password_changed_at` al segundo antes de comparar con `iat`.
- **`app/api/routes/formularios/dinamicos.py` + `services/sieej/formularios_dinamicos_service.py`**: cuando un respondent intentaba `PUT /{slug}/envio` sobre un formulario cerrado, `get_by_slug_visible` retornaba `None` (porque `estado != "activo"`) y la ruta devolvía `404 Formulario no encontrado`. El servicio `EnviosService.actualizar` ya estaba preparado para emitir `409 El formulario no acepta cambios` con detalle útil, pero nunca se alcanzaba. Nuevo parámetro opcional `include_inactive=True` en `get_by_slug_visible`, usado solo por la ruta `PUT envio` para que el 409 con mensaje claro le llegue al respondent (sigue siendo 404 en `GET`, `POST upload`, etc.).

#### Infra de tests

- **`tests/conftest.py`**: shims globales para que `Base.metadata.create_all` funcione bajo SQLite con todos los modelos del proyecto.
  - `JSONB` → `JSON`, `ARRAY` → `BLOB`, `BIGINT` → `INTEGER` vía monkey-patch de `SQLiteTypeCompiler` (`visit_JSONB`, `visit_ARRAY`, `visit_BIGINT`).
  - Traducción de `server_default` Postgres-only: `'X'::jsonb` → `'X'`, `NOW()` → `CURRENT_TIMESTAMP`. Se aplica una vez al cargar conftest, cubriendo también tests que crean su propio `engine()` (`test_sieej_admin_*`, `test_sieej_formularios_dinamicos`, `test_sieej_mis_envios`).
  - `db_session` deja de filtrar con `_table_pg_only` y crea todas las tablas no-schema (incluyendo `actividad_log`, `mapalab_events`, `layer_metadata` que antes se omitían y causaban `no such table` cuando el código real las usaba).
- **`api/scripts/run-tests.sh`**: cambia a un contenedor Docker desechable (`docker run --rm` sobre `mariachi-api:latest`) en vez de reusar el contenedor `mariachi-api` corriendo. Ese contenedor tiene `ENV=production`, lo que setea `cookie_secure=True`, y `TestClient` no envía cookies seguras sobre `http://testserver` → 401 en cascada. El contenedor desechable arranca con `ENV=test`. Monta `/IIEG/mariachi/api -> /app` para tomar cambios locales sin rebuild; instala `pytest`/`pytest-asyncio` al vuelo si la imagen no los trae.

#### Resultado

`make test-backend` y el hook pre-push ahora corren `ruff check` + `pytest -q` en local con el mismo entorno que CI y todo pasa. El push deja de fallar por entorno.

Bump 0.52.1 → 0.52.2.

---

## [0.52.1] - 2026-05-13

### Lint backend limpio + hook pre-push para detectar fallos de CI

Cierra el ciclo de `ruff` en la rama de production (que CI marcaba en rojo) y agrega un hook `pre-push` que reproduce el job `backend / test` de GitHub Actions para fallar en local antes de pushear, no después.

#### Lint backend

70 errores reportados por `ruff check app tests` (CI fallaba en el step "Lint (ruff)"):

- **27 autofijables** (`ruff check --fix`): bloques de imports desordenados (`I001`) en `colibri_source_apps.py`, `home.py`, `reportes.py`, `reportes_public.py`, `main.py`, `models/__init__.py`, `symbol.py`, `evento.py`, `mapalab_api_key.py`, `symbol.py` (schemas), `borrador_service.py`, `envios_service.py`, `tests/test_users.py`, `tests/test_sieej_formularios_dinamicos.py`; imports sin uso (`F401`) en `mapalab_api_keys_internal.py`, `symbols.py`, `mapalab_api_key.py` (model), `evento.py` (schema), `source_app.py`, `mapalab_telemetry.py`, `tests/test_eventos_concurrency.py`.
- **`api/app/models/__init__.py`**: `ActividadLog` se importa solo para registrar el modelo con `Base.metadata`; agregado a `__all__` para que `ruff` no lo marque como import muerto.
- **`api/app/services/sieej/formularios_admin_service.py`**: `logger = logging.getLogger(__name__)` se reubica después de todos los imports (resuelve seis `E402`).
- **`api/app/schemas/mapalab_event.py`**: 35 violaciones `N815` por campos `camelCase` en `StatsOverview`, `LayerStatRow`, `ButtonStatRow`, `ToolStatRow`, `DailyStatRow`, `SessionRow`, `SessionsPage`, `HighlightLayer`, `HighlightTool`, `StatsHighlights`. Refactor: campos renombrados a `snake_case` heredando de la nueva clase base `CamelCaseOutput` (`alias_generator=to_camel`, `populate_by_name=True`). El JSON sigue saliendo en camelCase — contrato con el frontend (`admin/src/features/mapalab-stats/`) intacto.
- **`api/app/schemas/_camel.py`**: nueva `CamelCaseOutput` + helper `to_camel(name)` que respeta segmentos numéricos (`sessions_30d` → `sessions30d`, no `sessions30D`).
- **`api/app/api/routes/mapalab_stats.py`**: llamadas a los schemas usan `snake_case` (Pythonic) y cada `@router.get` agrega `response_model_by_alias=True` para que FastAPI serialice con alias camelCase.

Resultado: `ruff check app tests` pasa con 0 errores. Stub de `populate_by_name=True` mantiene compatibilidad con cualquier código que aún construya schemas pasando los nombres camelCase originales.

#### Hook pre-push

- **`.githooks/pre-push`**: ejecuta `ruff check --no-cache app tests` + `pytest -q` antes de cada `git push`. Reproduce paso a paso `.github/workflows/test-backend.yml` (mismas env vars: `DATABASE_URL=sqlite:///:memory:`, secrets dummy, etc.). Si falla cualquiera, bloquea el push.
  - Escapes: `SKIP_PRE_PUSH=1 git push` salta todo; `SKIP_PYTEST=1 git push` corre solo lint.
- **`api/scripts/run-tests.sh`**: helper invocado por el hook y por `make test-backend`. Si el contenedor `mariachi-api` está corriendo, ejecuta `pytest` adentro instalando `pytest`/`pytest-asyncio` la primera vez (la imagen de prod no los incluye). Fallback a `pytest` del PATH; si nada está disponible, falla con sugerencias claras (`make up` o `pip install pytest pytest-asyncio`).
- **`Makefile`**: nuevo target `make test-backend` reproduce localmente el job de CI. `setup-hooks` ya existía (configura `core.hooksPath=.githooks`) — basta correrlo una vez por clone.

#### Documentación

- `docs/CONTRIBUTING.md`: setup inicial menciona `make setup-hooks` y `make test-backend`; sección "Estándares de Código" linkea al hook.

Bump 0.52.0 → 0.52.1.

---

## [0.52.0] - 2026-05-13

### Telemetría MapaLab — ingesta pública, panel admin y respaldos

Sistema de eventos anónimos para entender el uso del visor de MapaLab. Cubre ingesta pública con scrubbing PII, modelo en `iieg_portal`, rollups via vistas materializadas, panel admin con tabs internas, KPIs en el Inicio y política de retención + respaldos.

#### Modelo y migración

- `api/alembic/versions/mariachi/c9d8e7f6a5b4_add_mapalab_events.py`: tablas `mapalab_events` (append-only con `props` JSONB + índice GIN) y `mapalab_sessions` (rollup por sesión con flags `used_swipe`, `used_drawing`, `used_measurement`, `downloaded`, `shared`, `reported`). FK a `mapalab_api_keys` con `ON DELETE SET NULL` para huéspedes embebibles. Cinco vistas materializadas: `mapalab_stats_overview`, `_layers`, `_buttons`, `_tools`, `_daily`. Refresh inicial implícito en el upgrade.
- `api/alembic/versions/mariachi/d8e7f6a5b4c3_refresh_mapalab_stats_views.py`: migración independiente que sólo dispara `REFRESH MATERIALIZED VIEW` (idempotente).
- `app/models/mapalab_event.py`: `MapalabEvent`, `MapalabSession`.

#### Backend

- `app/schemas/mapalab_event.py`: `EventBatchIn` con allowlist de 35 event names + `CamelCaseInput`, `props` JSONB máx 4 KB, lote máx 100 eventos.
- `app/services/mapalab_telemetry.py`: `ingest_batch` con `bulk_insert_mappings` + upsert de sesión vía `ON CONFLICT`. Hash de IP con salt diario, `parse_ua_family` para reducir cardinalidad. Reusa `pii_scrubber` de Colibri sobre `props`. `refresh_stats_views` con `CONCURRENTLY` + fallback no-concurrent para la primera vez.
- `app/api/routes/mapalab_events_public.py`: `POST /api/public/mapalab/events/batch` con rate limit 120/min/IP (`rate_limit_ip`).
- `app/api/routes/mapalab_stats.py`: `/overview`, `/layers`, `/buttons`, `/tools`, `/daily`, `/sessions`, `/highlights` (todos `get_current_user`), `/refresh` (admin + CSRF). Top capas se enriquecen con label/workspace consultando `/mapalab/api/layers/tree`.
- `app/main.py`: routers registrados (`mapalab_events_public` bajo `/api/public`, `mapalab_stats` bajo `/api/administrador`).

#### Panel admin (`admin/src/features/mapalab-stats/`)

- `MapalabStatsPage` con tabs internas que persisten en URL (`?tab=resumen|sesiones`). Resumen visible para `tetlamamakani` y `editora`; Sesiones solo para `tetlamamakani`.
- `ResumenSection`: 8 tarjetas (sesiones 30d/7d/hoy, eventos 30d, duración media, % swipe, % descargas, % compartidos), gráfica diaria, top capas, barras de botones y herramientas.
- `SesionesSection`: tabla paginada por origen (`visor`/`embed`/`widget`/all).
- `InicioHighlights` (en `/inicio`): 4 KPIs compactos justo después de "Plataformas del ecosistema" — Sesiones 30d, Duración media, Capa más usada, Herramienta más usada. Link "Ver detalle →" al panel completo.
- `useMapalabStats.js`: 6 hooks (`useMapalabOverview`, `useTopLayers`, `useButtonStats`, `useToolStats`, `useDailyStats`, `useSessions`) + `mapalabStatsService.js` con axios.

#### Sider y router

- Una sola entrada **Estadísticas** en el sider bajo MapaLab, con badge BETA. `/mapalab/stats/sesiones` redirige a `/mapalab/stats?tab=sesiones` (compat).
- `Sider` width subido de 200px (Ant default) → 280px para que badges no se trunquen.
- Helper `withBetaBadge(label)` reutiliza `StatusBadge` existente. Aplicado a: Estadísticas, API Keys, Símbolos y Colibri (proyecto entero).
- `renderBadgeLabel` refactorizado para usar también `StatusBadge` con `bg="#ff4d4f"`, así todos los badges del sider comparten estilo base.

#### Operaciones y respaldos

- `scripts/refresh_mapalab_stats.py`: refresh manual/cron de las cinco vistas.
- `scripts/purge_mapalab_events.py`: retención configurable (`MAPALAB_EVENTS_RETENTION_DAYS` default 90, `MAPALAB_SESSIONS_RETENTION_DAYS` default 180).
- `scripts/postgres-backup.sh`: corre la purga antes del dump (`MAPALAB_PURGE_ON_BACKUP=false` para saltarla). `pg_dump` sin filtros incluye automáticamente las nuevas tablas y matviews (se repueblan al restaurar).
- `scripts/postgres-restore.sh`: mensaje final aclarando que las matviews se restauran con datos.
- `Makefile`: targets nuevos `make refresh-mapalab-stats`, `make purge-mapalab-events`. `install-backup-cron` ahora también instala `*/30 * * * * refresh_mapalab_stats.py` en producción.

#### Privacidad y seguridad

- Eventos anónimos: no se almacena identidad, solo IP hasheada con salt diario + familia del User-Agent.
- Scrubbing PII reutiliza el de Colibri (regex sobre JWTs, tokens en URL, Authorization, CCN).
- Endpoint público con rate limit estricto (120/min/IP) y validación de allowlist de event names.
- El frontend (mapalab v1.27.0) respeta Do-Not-Track del navegador automáticamente.

---

## [0.51.1] - 2026-05-13

### Fix: vistas de `mapalab-stats` sin poblar tras crearlas

Las cinco vistas materializadas (`mapalab_stats_overview`, `_layers`, `_buttons`, `_tools`, `_daily`) se crean con `WITH NO DATA` en la migración `c9d8e7f6a5b4`. Sin un primer `REFRESH`, cualquier `SELECT` lanza `ObjectNotInPrerequisiteState` ("materialized view has not been populated") y los seis endpoints de `/api/administrador/mapalab-stats/*` (`overview`, `layers`, `buttons`, `tools`, `daily`, `highlights`) devuelven 500.

#### Cambiado

- `api/alembic/versions/mariachi/c9d8e7f6a5b4_add_mapalab_events.py`: al final del `upgrade()` se ejecuta `REFRESH MATERIALIZED VIEW` para las cinco vistas. Cubre despliegues nuevos (volúmenes recién creados) sin pasos manuales.

#### Agregado

- `api/alembic/versions/mariachi/d8e7f6a5b4c3_refresh_mapalab_stats_views.py`: migración independiente que sólo ejecuta `REFRESH MATERIALIZED VIEW` para las cinco vistas. Necesaria en ambientes donde la `c9d8e7f6a5b4` ya está aplicada (alembic no la re-corre). Idempotente: el `REFRESH` es seguro de correr aunque la vista ya tenga datos. `downgrade` es no-op.

---

## [0.51.0] - 2026-05-13

### Llaves MapaLab — auditoría, UX no técnica, generación de mapas inline, defense-in-depth

Refactor del feature `mapalab-api-keys` y endurecimiento del ciclo de embebido. Cierra cuatro puntos de auditoría del widget (fallback, frame-ancestors, auditoría de accesos, Core Web Vitals) y reescribe el lenguaje del panel administrativo en español plano para servidores públicos.

#### Auditoría de accesos al widget (nueva)

- **Modelo:** `mapalab_api_keys_accesos` con columnas para gobernanza ya reservadas (`clasificacion`, `sla_estado`, `linaje_ref`) listas para futuras campañas.
- **Migración Alembic:** `a9b0c1d2e3f4_add_mapalab_api_key_accesos.py`. Índices sobre `(api_key_id, timestamp)`, `dia`, `origin`, `resultado`.
- **Endpoint admin:** `GET /api/administrador/mapalab/api-keys/{id}/accesos` con filtros (`desde`, `hasta`, `origin`, `capa`, `resultado`, `endpoint`) y paginación. Devuelve `MapalabApiKeyAccesoPage(items, total, page, size)`.
- **Endpoint interno:** `POST /api/administrador/internal/mapalab/keys/accesos` para ingest batch desde mapalab-backend (similar al patrón `usage`). Token `X-Internal-Token`.
- **UI:** nueva tab "Auditoría" dentro del panel inline de cada llave, con tabla filtrable y labels legibles de capas (no slugs).
- **Retención:** `scripts/purge_mapalab_accesos.py` purga registros > 90 días (configurable con `MAPALAB_ACCESOS_RETENTION_DAYS`). El cron `mariachi-cron-sieej` corre el script en cada ciclo.

#### Defense-in-depth contra clickjacking

- `routers/mapalab_api_keys_internal.py`: `/validate` ahora devuelve `dominiosPermitidos` (además de capas/cuotas) para que mapalab-backend pueda usarlo en `frame-ancestors` y para validación cliente.
- `schemas/mapalab_api_key.py`: `MapalabApiKeyValidateResponse.dominios_permitidos` agregado.

#### Refactor profundo del feature `admin/src/features/mapalab-api-keys/`

- **Editor inline (fila expandible):** desaparece `ApiKeyEditorDrawer`. La tabla usa `expandable.expandedRowRender` con `ApiKeyEditorForm` embebido. Tres botones de acción (✎ Editar / 👁 Previsualizar / ⋮ Más) abren la fila en tabs distintas, no en drawers laterales.
- **Tabs unificadas:** `ApiKeyInlinePanel` con `[Datos de la llave] [Armar y previsualizar mapas] [Auditoría]`. Se eliminó la separación entre "Embeds vinculados" y "Playground" (era redundante).
- **Generación de mapas inline:** la pestaña "Previsualizar y embeber" permite armar un mapa con `LayerTreeSelect` (árbol completo del visor) + capturar la vista vía postMessage del preview + persistir como embed permanente con un solo click. Backend nuevo `POST /api-keys/{id}/embeds/from-layers` que crea el share en mapalab y lo vincula+pinea atómicamente.
- **PostMessage bidireccional:** el iframe del preview emite `mapalab:viewchange` (admin captura center/zoom en vivo) y escucha `mapalab:setview` (admin puede cargar una vista guardada sin recargar el iframe).
- **Mapas guardados con summary legible:** la lista muestra capas con labels en español, vista (centro/zoom) y badge "Permanente", no solo el hash. El hash queda como detalle pequeño.
- **Hash al crear llave:** el form de "Nueva llave" acepta opcionalmente uno o varios hashes existentes para vincular en el mismo paso.
- **Detección de bloqueos:** si el origin admin o las capas pedidas no están autorizadas para la llave, Alert con botón "Autorizar" que hace `PATCH` y reload.
- **Sin scroll horizontal en desktop:** `tableLayout: fixed` + widths más compactos + acciones secundarias agrupadas en Dropdown ⋮ con `Modal.confirm` para acciones destructivas.

#### Lenguaje no técnico

Reescritura completa de labels, tooltips, placeholders, alerts y mensajes del feature `mapalab-api-keys` y del backend de errores. Sustituciones tipo: "API key" → "llave", "share/hash" → "código de mapa", "Rotar" → "Generar contraseña nueva", "Embeds vinculados" → "Mapas guardados", "dominios permitidos" → "sitios autorizados". Todos los `Alert` tienen botón × para cerrar excepto el modal de revelación de contraseña (intencional). Tooltips explican el comportamiento sin jerga (sin "bcrypt", "allowlist", "endpoint", "CORS"). Placeholders con `Ejemplo: …` en cada input.

#### Backend mapalab-embed-webhook (servicios)

- `notify_invalidate_cache`, `fetch_share_meta`, `pin_share_permanent`, `unpin_share`, `create_share` ahora comparten cliente HTTP con base URL + token interno.
- `_summary_from_meta`: extrae layers (slugs) y view del payload del share para llenar `summary` en la respuesta de embeds.

---

## [0.50.0] - 2026-05-13

### Catalogo de simbolos administrable + shape `point` en SLD editor

Reemplaza el catalogo hardcoded de emojis del panel de mediciones de MapaLab por un catalogo CRUD administrable desde mariachi-admin, y habilita el uso de esos simbolos como simbologia de capas de puntos en GeoServer.

#### Catalogo de simbolos (`/mapalab/simbolos`)

- Nueva feature `admin/src/features/mapalab-symbols/` con sidebar de categorias + grid de simbolos.
- 3 tipos soportados: `emoji` (caracter Unicode), `svg` (XML inline), `image` (PNG/JPG/SVG/WebP/GIF subido al bucket Acervo `mapalab/simbologia/`).
- CRUD completo de categorias y simbolos (rol `tetlamamakani`).
- Drag & drop para reordenar simbolos (via `@dnd-kit/sortable`), persiste en `POST /symbols/reorder`.
- Endpoints admin bajo `/api/administrador/mapalab/symbol-categories` y `/api/administrador/mapalab/symbols`.
- Endpoint publico `GET /api/mapalab/symbols/catalog` consumido por MapaLab y por el SLD editor.

#### Shape `point` en el SLD editor

- Parser (`sld_parser.py`): detecta rules con `PointSymbolizer` + `ExternalGraphic`. Nuevos models `PointGraphicModel` y `PointModel`.
- Generator (`sld_generator.py`): `build_point_sld_xml(...)` emite SLDs con `<ExternalGraphic>` apuntando a URL interna del bucket Acervo.
- Frontend `<PointEditor>` con tabs Simbolo / Etiqueta / Metadatos. `<SymbolPicker>` consume el catalogo y deshabilita `kind='svg'` (no soportado por GeoServer en SLDs).
- Selector "Tipo de simbologia" arriba del editor: permite cambiar entre coropletico/boundary/point en capas existentes. Card "Empezar desde cero" en el `RawXmlFallback` para capas no editables que se quieran reemplazar con un point SLD.
- Emojis usados en SLD se rasterizan automaticamente con Twemoji (CDN `cdnjs.cloudflare.com`) y se suben a `mapalab/simbologia/emoji-png/`. Resuelve la limitacion de Java 2D en GeoServer que no soporta fuentes de color.

#### Modo revision en el SLD editor

- `<SldEditor>` lee `?review=true&borrador=<id>&style=<name>` y muestra botones **Aprobar y aplicar** / **Rechazar** en el sidebar.
- `<BorradorPreview>` renderiza localmente el modelo del borrador (sin tocar GeoServer) para que el revisor compare con `<LegendPreview>` (que muestra el SLD vigente).
- `RevisionQueuePage` con soporte para `resource_type='sld'`: tag verde con shape, navegacion correcta al editor en modo review, fallback para borradores viejos sin `layer_id` en data (enrichment en `obtener_pendientes` via `find_layers_using_style`).

#### Publicar directo (admin)

- Para rol `tetlamamakani`, el boton "Solicitar revision" se reemplaza por **Publicar directo (admin)**: guarda borrador + solicita revision + aprueba en una sola operacion. Sin paso por la cola de revision.

#### Historial de SLDs aplicados

- Migracion `d3e4f5a6b7ca`: el unique constraint en `borradores` ahora es parcial (solo aplica a estados activos `en_progreso`/`pendiente_revision`/`rechazado`). Los aprobados acumulan historial.
- Endpoint `GET /borradores/historial/sld/{resource_id}` lista versiones aprobadas.
- Endpoint `POST /borradores/por-id/{id}/re-aplicar` re-aplica el `data` del borrador aprobado y crea un duplicado aprobado (la restauracion tambien queda auditada).
- `<SldHistoryDrawer>` accesible desde boton "Historial" en el sidebar: lista cronologica con preview y boton restaurar por version.

#### Infraestructura

- El contenedor `geoserver` debe estar en `iieg-network` para alcanzar `acervo-minio` cuando renderiza SLDs con `<ExternalGraphic>` (cambio en `/IIEG/geoserver/docker-compose.yml`).
- GeoServer 2.20+ requiere un `URLCheck` configurado para permitir URLs externas en SLDs. Crear via REST: `POST /rest/urlchecks` con regex `^http://acervo-minio:9000/mapalab/.+$`. Documentado en `docs/SLD_EDITOR.md`.

---

## [0.49.0] - 2026-05-12

### Respaldos automatizados de PostgreSQL con rotacion GFS

Antes de esta version la BD de mariachi solo era reproducible al nivel de esquema (via migraciones Alembic). Los datos vivian unicamente en el volumen Docker `postgres_data` de la VM: si se perdia la VM, se perdia todo el contenido editorial y operativo (usuarios, eventos, paginas, borradores, layers/SLDs, simbolos, API keys de mapalab, logs, respuestas de formularios, etc.). `docs/PENDIENTES.md` listaba "Backup automatizado de PostgreSQL" como item abierto.

#### Politica

Se introduce rotacion GFS (Grandfather-Father-Son) con 3 archivos fijos en `backups/`:

| Archivo                       | Cuando se regenera                  | Antigüedad max |
|-------------------------------|-------------------------------------|----------------|
| `mariachi-daily.sql.gz`       | Todos los dias a las 3 AM           | 24 h           |
| `mariachi-weekly.sql.gz`      | Domingos a las 3 AM                 | ~7 dias        |
| `mariachi-monthly.sql.gz`     | Dia 1 del mes a las 3 AM            | ~30 dias       |

Nunca se acumulan mas de 3 archivos — cada generacion sobreescribe el slot correspondiente.

#### Cambios

- **`scripts/postgres-backup.sh`** (nuevo): hace `pg_dump --no-owner --no-acl --clean --if-exists` via `docker compose exec postgres`, comprime con `gzip -9`, escribe atomicamente (`.tmp` + `mv`) a `backups/mariachi-daily.sql.gz`. Si `date +%u` es 7 copia a `mariachi-weekly.sql.gz`; si `date +%-d` es 1 copia a `mariachi-monthly.sql.gz`. Acepta `COMPOSE_FILE` y `BACKUP_DIR` por env var.
- **`scripts/postgres-restore.sh`** (nuevo): resuelve el archivo en ruta literal, `restore/<archivo>` o `backups/<archivo>`. Sin argumento muestra lista interactiva (con tamaño + mtime) si hay 2+ candidatos, o usa el unico candidato si solo hay uno. Aplica con `psql -v ON_ERROR_STOP=1` para abortar al primer error.
- **`Makefile`**: targets nuevos `backup-db`, `restore-db [FILE=...]`, `install-backup-cron ENV=prod`, `uninstall-backup-cron`. El `install-backup-cron` instala una linea en el `crontab` del usuario (`0 3 * * * cd <repo> && ./scripts/postgres-backup.sh >> backups/backup.log 2>&1 # mariachi-backup`) y falla si `ENV` no es `prod` para evitar instalarlo accidentalmente en staging/dev.
- **`backups/`, `restore/`** (carpetas nuevas con `.gitkeep`). `.gitignore` ignora `*.sql.gz`, `*.sql.gz.tmp`, `backup.log` en ambas.
- **`docs/RUNBOOK.md`**: nueva seccion "Respaldos automatizados de Postgres" + actualizacion del flujo de restore (helper `make restore-db` + comando manual equivalente). Se ajustaron los `docker exec mariachi-postgres-dev` a `mariachi-postgres` en los ejemplos de validacion post-restore.
- **`docs/PENDIENTES.md`**: item de backup automatizado marcado como hecho, con nota sobre la pendiente de subir copia a GCS.

#### Limitacion conocida

Los respaldos viven en disco local de la VM. Si se pierde la VM (problema original que motivo esta tarea), tambien se pierden los respaldos. Mitigacion temprana: copiar `backups/` a almacenamiento externo periodicamente. La siguiente iteracion natural es agregar `gsutil cp backups/*.sql.gz gs://<bucket>/` al final del script para cerrar el bucle de disaster recovery.

#### Operacional

En la VM de production, una sola vez:

```bash
cd /ruta/a/mariachi
make install-backup-cron ENV=prod
make backup-db ENV=prod          # genera el primer daily inmediatamente
crontab -l | grep mariachi-backup
```

Bump 0.48.5 -> 0.49.0.

---

## [0.48.5] - 2026-05-12

### Tarjeta "Acervo" sale "no integrada" en `/inicio`

Bug reportado: en la seccion **Plataformas del ecosistema** del home del admin, la tarjeta de Acervo aparecia con badge gris "no integrada", aunque MinIO y el resto del ecosistema estaban arriba.

#### Causa

`api/app/api/routes/sistema.py::_probe_ontoy()` hace `GET {ACERVO_ONTOY_URL}` y espera un JSON con `version`. En ambos `.env.production` / `.env.staging` el valor apuntaba a `http://host.docker.internal:9080/ontoy`, un puerto que **no esta expuesto** por el `acervo-nginx` (que sirve `/ontoy` en el 80/443 dentro de su propio compose y solo en deploys donde se levanta `acervo` standalone). El resto de plataformas (`sieej`, `geoserver`, `gateway-hub`) ya usan el patron `http://gateway-hub-nginx-1/<servicio>/ontoy`, que el gateway-hub-nginx resuelve internamente — incluido `/acervo/ontoy`, definido en `gateway.conf.template:68-71` con un JSON estatico de version.

#### Cambios

- `.env.production.example`, `.env.staging.example`: documentado el patron `http://<gateway_hub_host>/<servicio>/ontoy` para `SIEEJ_ONTOY_URL`, `ACERVO_ONTOY_URL`, `GATEWAY_HUB_ONTOY_URL`, `GEOSERVER_ONTOY_URL`. Los archivos privados (`.env.production`, `.env.staging`) estan en `.gitignore` y se actualizan manualmente en cada VM.

#### Operacional

En cada VM donde mariachi-api ya esta corriendo:

1. Editar el `.env.*` activo y poner `ACERVO_ONTOY_URL=http://gateway-hub-nginx-1/acervo/ontoy` (ajustar el hostname al del contenedor nginx del gateway-hub en esa red).
2. Recrear el contenedor api: `make restart ENV=prod` (o `ENV=staging`) para que tome el `env_file` actualizado — un `docker compose restart` simple **no** relee `env_file`.
3. Recargar `/inicio`; la tarjeta de Acervo debe quedar en verde con `v1.20.1`.

Bump 0.48.4 -> 0.48.5.

---

## [0.48.4] - 2026-05-12

### Feedback visible al fallar el login

Bug reportado: al teclear usuario/contrasena incorrectos en `/mariachi/login` el formulario volvia al estado normal sin avisar nada al usuario; solo aparecia el 401 en consola.

#### Causa

`/login` estaba declarada como ruta hermana del bloque protegido en `admin/src/main.jsx`, fuera de `MainProvider`. `MainProvider` es el unico lugar donde se monta `<AntApp />` + `<MessageBridge />`, asi que la llamada a `message.error(...)` desde el catch del `LoginPage` quedaba encolada en `pending` (servicio `@shared/services/message`) sin un `messageApi` que la procesara.

#### Cambios

- `admin/src/main.jsx`: el router ahora envuelve **todas** las rutas con `<MainProvider />` y `<ProtectedRoute>` se mueve a un nivel mas adentro, envolviendo unicamente `<MainLayout />`. Asi `/login` queda bajo el mismo `AntApp` que el resto.
- `admin/src/features/auth/pages/LoginPage.jsx`: el manejo del 401 cambia de toast a error inline debajo del input de contrasena via `form.setFields([...])`. Mas claro y se autolimpia cuando el usuario corrige el campo. Los demas errores (red, 5xx) mantienen `message.error` como fallback.

#### Operacional

Junto con el fix se identifico que `scripts/init_db.py` solo crea al admin si no existe — no resincroniza el hash cuando cambia `ADMIN_PASSWORD`. Procedimiento agregado en `docs/RUNBOOK.md` (`Resetear password del admin`).

Bump 0.48.3 -> 0.48.4.

---

## [0.48.3] - 2026-05-11

### Audit log + counter completos en Colibri admin y mapalab-shares

Cierre fino del backlog menor que quedo abierto tras 0.48.2.

#### Audit log Colibri admin (full coverage)

`registrar_actividad` cableado en TODAS las operaciones write del modulo
Colibri:

- `colibri.tipo.{create,update,delete}` — antes solo `rotate_key` de
  source apps tenia audit; ahora cubre tambien CRUD de tipos de reporte.
- `colibri.route.{create,update,delete}` — fan-out rules a Discord/Slack/
  webhook quedan registradas con `kind` en metadata para el create.
- `colibri.direccion.{create,update,delete}` — direcciones organizacionales.
- `colibri.source_app.{create,update,delete}` (rotate_key ya estaba en
  0.48.2).

Con esto el dashboard `/mariachi/actividad` tiene visibilidad completa de
las acciones admin del ecosistema (users, sieej, eventos, home, reportes,
colibri).

#### Counter mapalab-shares

`mariachi_mapalab_share_writes_total` (definido en 0.48.2 pero sin
cablear) ahora incrementa en los 3 endpoints write:
- `POST /mapalab-shares` (crear con/sin permanente)
- `POST /mapalab-shares/{id}/pin-permanent`
- `DELETE /mapalab-shares/{id}/pin-permanent`

Bump 0.48.2 -> 0.48.3.

---

## [0.48.2] - 2026-05-11

### Instrumentacion + infra: counters Prometheus, audit log extendido, cron sidecar, tests admin, CD workflow

Cierre del backlog de instrumentacion + infra que quedo abierto tras 0.48.1.

#### /metrics counters

`app/api/metrics.py` agrega 11 counters: `evento_writes`, `evento_publish`,
`home_writes`, `sieej_formulario_writes`, `sieej_envio_writes`,
`sieej_envio_expired`, `sieej_envio_reabierto`, `login_success`,
`login_failed`, `login_locked`, `mapalab_share_writes` (reservado).
Cableado en cada operacion write/publish y en cada path del flujo de
login para visibilidad de brute-force attempts via Prometheus sin tener
que parsear logs.

#### Audit log extendido (US #148 cont.)

`registrar_actividad` ahora se invoca tambien en:
- **eventos**: create, update, publicar, despublicar, delete (metadata
  con slug, fields modificados, estado).
- **home**: update_draft, publicar, descartar_borrador (key como
  resource_id).
- **reportes**: update con lista de campos cambiados, delete.
- **colibri.source_app.rotate_key**: la operacion mas sensible del
  modulo (genera nueva API key plana que se muestra una sola vez); el
  audit registra prefix + visibility en metadata, sin el plaintext.

#### Cron sidecar `cron-sieej`

`docker-compose.yml` define un servicio sidecar que reusa la imagen de
`api` y corre `python scripts/expire_sieej_envios.py` en loop bash con
sleep configurable (`CRON_SIEEJ_EXPIRE_INTERVAL`, default 3600s). Sin
crontab del host, sin dependencias extra. Logs centralizados en
`docker logs mariachi-cron-sieej`. Restart `unless-stopped`.

#### Tests Vitest admin

- `sider-config.test.js` actualizado para comportamiento post-v0.47.2
  (items con candado en lugar de filtrarse del menu).
- `UserCard.test.jsx` (9 tests): renderiza nombre/username/email/rol,
  admin global muestra "Administradora" + "Todos los proyectos",
  placeholders sin asignaciones, tags por proyecto con rol, hint de
  must_change_password, click invoca onEdit, isSelf deshabilita Reset y
  Eliminar pero no Editar.
- `ActividadPage.test.jsx` (5 tests): mocks api+message+useIsMobile;
  verifica titulo, llamada al endpoint con paginacion default, empty
  state, render de items, tag de rol del actor.

Suite: 36/36 tests passing.

#### CD workflow `cd.yml`

Portado del patron de mapalab (3 jobs: deploy SSH + health-check +
notify Discord) adaptado al stack de mariachi:

- Trigger push a `production`.
- `appleboy/ssh-action` ejecuta `git reset --hard origin/production`
  preservando `.env.production`, `admin/dist`, `nginx/static`; luego
  `make deploy` + `docker image prune` >7d.
- Health-check: 10 reintentos a `HEALTH_CHECK_URL` cada 15s.
- Notify Discord con embed verde/rojo segun resultado + deteccion de
  bump leyendo `api/pyproject.toml`.

`make deploy` nuevo en `Makefile` (build + up con compose de prod) para
que el CD lo invoque y para uso manual desde el host.

Secrets requeridos: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`,
`PROJECT_PATH`, `DISCORD_WEBHOOK_URL`. Opcional: `HEALTH_CHECK_URL`.

Bump 0.48.1 -> 0.48.2.

---

## [0.48.1] - 2026-05-11

### Cierre de decisiones abiertas tras la auditoria

Continua el hardening del v0.48.0 cerrando decisiones que quedaron abiertas:

#### SIEEJ

- **script CLI de auto-expiracion** `api/scripts/expire_sieej_envios.py` para
  invocacion desde cron del host sin pasar por HTTP. Idempotente; salida JSON.
  Crontab tipica documentada en sieej.md.
- **soft-delete de envios para respondent** (migracion `d4e5f6a7b8c0`):
  nueva columna `sieej.envio_formulario.eliminado_en` con indice parcial.
  `DELETE /formularios/mis-envios/{envio_id}` (CSRF) marca el envio para
  que el respondent ya no lo vea en `mis-envios` ni en el detalle, mientras
  el admin sigue viendolo con `eliminado_en` poblado (preserva
  trazabilidad). 4 tests cubren oculta-del-listado, sigue-en-db,
  cross-user-403, idempotencia.

#### Usuarios

- **privacidad en GET `/usuarios` para editora**: helper `_serialize_user`
  ahora aplica enmascarado por rol del viewer. Editora viendo a OTRO
  usuario ve email enmascarado (`a****@****.gob.mx`) y `projects = []`.
  Editora viendose a si misma ve todo. Admin ve todo. Resuelve la
  preocupacion de privacidad documentada como decision de producto:
  editora ya no puede recolectar emails de otros usuarios via el listado.
- **UI cards en UsersPage**: refactor de tabla AntD a grid responsive
  (1/2/3/4 cols xs/sm/lg/xl). Nuevo `UserCard` con avatar, tag de rol,
  tags de proyectos, badge de must_change_password. Acciones al pie
  (Editar/Reset/Eliminar) deshabilitadas con tooltip si es el usuario
  actual. Skeleton loading y empty states diferenciados. Pagination
  cliente-side 12/pagina.

#### US #148 — Auditoria de accesos diferenciada staff vs externo

Implementacion completa: tabla `actividad_log` (migracion `d5e6f7a8b9c1`),
helper `registrar_actividad`, endpoint admin `GET /actividad` con
filtros, UI en `/mariachi/actividad`. Acciones cableadas:

- `user.{create, update, delete, reset_password}`
- `sieej.formulario.{create, update}`, `sieej.envio.reabrir`

Filtros: `actor_id`, `actor_role`, `action_prefix`, `resource_type`,
`desde`, `hasta`. `actor_role` permite diferenciar staff vs externo en
queries. `metadata` JSONB guarda detalle por accion (campos modificados,
version_from/to, estado_from). FK `actor_id` ON DELETE SET NULL: al
borrar un usuario sus eventos conservan `actor_role` para audit.

Bump 0.48.0 -> 0.48.1.

---

## [0.48.0] - 2026-05-08

### Hardening del modulo Usuarios + endurecimiento de SIEEJ

Auditoria del submenu "Usuarios" cerro 1 vulnerabilidad de elevacion de
privilegios y 4 hallazgos importantes; auditoria de reglas de negocio de
SIEEJ cerro 4 P0/P1 (showWhen colgado, edicion sobre formularios cerrados,
auto-expiracion sin scheduler, contrato de upload de archivo desacoplado)
y 2 P2 (race en get_o_iniciar, audit log de operaciones admin).

#### Modulo Usuarios

- **fix vulnerabilidad de autopromocion**: editora podia hacer
  `PUT /usuarios/{su_id}` con `{"role":"tetlamamakani"}` y elevarse. Ahora
  se blanquean campos privilegiados (`role`, `username`, `must_change_password`)
  para no-admin antes del setattr loop. 4 tests nuevos cubren regresion +
  cambios legitimos de name/email.
- **rate limit + lockout en login**: 10 req/min/IP via `rate_limit_ip(scope='login')`
  + 5 fallos por username/email en 5 min lockout con Redis; flush al login
  exitoso. Logging `action=login.failed/success/locked`.
- **invalidacion de sesion al cambiar/resetear password**: nueva columna
  `usuarios.password_changed_at` (migracion `d3e4f5a6b7c9`), JWT incluye
  `iat`, `get_current_user` rechaza tokens con `iat < password_changed_at`.
  Resuelve el caso en que la victima de un reset seguia con sesion activa
  hasta que el JWT expirara.
- **POST /autenticacion/perfil/avatar**: endpoint dedicado que sube al
  bucket publico `iieg` en `avatars/u{current_user.id}/{uuid}.{ext}`. Path
  enforced en servidor (no controla cliente). Valida content-type
  (jpg/png/webp/gif) y tamano <= 2 MB. Borra avatar previo del mismo
  usuario. PerfilPage refactor para usar este endpoint en vez del bucket
  privado `mariachi` (avatares deben ser publicos para verse entre productos
  del ecosistema).
- **UsersPage UX**: busqueda local por username/name/email + filtro por rol
  (Administradora/Editora/Externo) + `roleLabels.tetlamamakani` cambia a
  `'Administradora'`. Removido `payload.password` muerto en flujo PUT.
- consistencia: literal `"tetlamamakani"` reemplazado por `ADMIN_ROLE` en
  `routes/users.py`; `UsuarioResponse.role` pasa de `str` a `Literal`;
  logger en `reset_password`.

#### Modulo SIEEJ

- **showWhen.field validado contra fields existentes**: `validar_definicion`
  ahora hace 2-pass — recolecta `field_paths` completo y luego rechaza
  referencias muertas. Antes el formulario se guardaba sin error y el
  campo condicional jamas se mostraba al respondent. Soporta `step.field`
  y `field` (asumido del mismo step).
- **bloqueo de edicion sobre formulario cerrado o fuera de vigencia**: helper
  `EnviosService._formulario_acepta_cambios` aplica a `get_o_iniciar`,
  `actualizar` y `upload_archivo`. Antes el respondent seguia editando
  indefinidamente envios de formularios cerrados.
- **endpoint admin de reapertura**:
  `POST /sieej/formularios/{id}/envios/{envio_id}/reabrir` regresa un envio
  `enviado` o `expirado` a `en_proceso`. Preserva `definicion_snapshot` y
  `formulario_version` (fidelidad historica del envio).
- **auto-expiracion lazy + bulk admin**: `_expirar_si_corresponde` corre
  cuando un endpoint toca un envio especifico. `POST /sieej/expirar-envios-pendientes`
  (admin) hace bulk-expire para cron externo o intervencion manual. Antes
  el evento `expirado` estaba definido pero ningun proceso lo emitia.
- **upload sincroniza `envio.datos`**: persiste
  `datos[step][field] = {url_publica, filename, mime, size_bytes}` despues
  de crear `EnvioArchivo`. Antes el frontend dependia de escribir manualmente
  la URL y la validacion al cierre fallaba si no lo hacia.
- **limite de 5 MB en payload `datos`**: `actualizar` rechaza con 413 si
  `json.dumps(datos)` excede el cap.
- **race en `get_o_iniciar`**: `IntegrityError` por la constraint UNIQUE
  `(formulario_id, usuario_id)` se atrapa y devuelve el envio ya creado.
  Antes el segundo request del mismo usuario daba 500.
- **audit log estructurado** en `crear`, `actualizar`, `publicar`, `cerrar`,
  `eliminar`, `reabrir_envio`. Primer pago al backlog de US #148.

#### Documentacion

- `docs/sieej.md`: tabla de workflow de estados, reglas de escritura del
  respondent, seccion de reapertura admin, contrato sincrono del field
  `file`, seccion de auto-expiracion lazy + bulk admin, nueva ruta de
  reapertura en la tabla de endpoints admin.
- `docs/PENDIENTES.md`: bumped a 0.48.0, cierre de los 4 hallazgos SIEEJ
  P0/P1 movidos a "Implementado".

Bump 0.47.5 -> 0.48.0.

---

## [0.47.5] - 2026-05-08

### Fix: eventos publicados desaparecian de mapalab al guardar tras renombrar el titulo

Bug reportado: al editar el titulo de un evento publicado y dar Guardar, el evento (y de hecho **todos** los eventos) desaparecian del visor de mapalab. Causa raiz combinada en backend, dos defectos sumados:

#### 1. `_validate_image_url` rechazaba paths del acervo en formato `bucket/object`

`api/app/schemas/evento.py` validaba `icono_url`/`imagen_url` contra una lista de prefijos (`http://`, `https://`, `/acervo/`, `/`, `data:image/`). Sin embargo, `_ImageUrlMixin` corre `to_relative()` antes del validador (`mode='before'`): cuando una URL absoluta del acervo (`https://acervo-host/mapalab/icon.png`) llegaba por PATCH, `to_relative` la dejaba como `mapalab/icon.png`, formato que el validador rechazaba. El error se materializaba al regenerar el listado publico (no al guardar) porque `EventoPublicResponse.model_validate(e)` aplica el mismo mixin sobre lo que ya esta persistido en BD: si **un solo** evento tenia `icono_url` con ese formato, `model_validate` lanzaba `ValidationError`.

Fix: aceptar paths relativos del acervo en formato `bucket/object` siempre que el bucket este en `KNOWN_ACERVO_BUCKETS` (lista canonica nueva en `api/app/core/bucket_policies.py`: `portal`, `mapalab`, `iieg`, `mariachi`, `sieej`, `dataengine`). Rechaza buckets desconocidos (`etc/passwd` → 422) y path traversal (`mapalab/../etc/passwd` → 422). Regex `_ACERVO_PATH_RE` reconoce el formato; la validacion del bucket y del `..` se hace en codigo Python para mensajes de error precisos.

#### 2. `GET /api/mapalab/eventos` tiraba 500 si **un solo** evento fallaba serializacion

`api/app/api/routes/public.py` armaba el listado con `[EventoPublicResponse.model_validate(e).model_dump(...) for e in eventos]`. Si la validacion de un evento lanzaba excepcion, todo el endpoint respondia 500 → mapalab no recibia ningun evento → "el evento desaparece".

Fix: reemplazar el list comprehension por un loop con `try/except` por evento. Eventos que fallan validacion se omiten del listado y se loggean como warning con su `id` (`logger.warning('Evento %s omitido del listado público: %s', ...)`). Asi un dato malformado puntual ya no rompe el endpoint completo. Defensa en profundidad: el bucket validator del punto (1) deberia evitar que se persistan datos invalidos, pero datos legados o futuros campos mal validados no derrumban mapalab.

#### Por que se asociaba el bug con el guardado

El primer fetch a `/eventos` cacheaba un payload en Redis (`mapalab_public_cache.py`). Mientras la cache estuviera caliente, mapalab veia el listado viejo. Al guardar (PATCH), `actualizar_evento` invocaba `notify_eventos_changed()` que bumpeaba la version → mapalab detectaba el bump por su poller cada 30s e invalidaba su cache local → el siguiente fetch regeneraba el payload → ese fetch tronaba con 500 si habia algun evento con `icono_url` formato `bucket/object`. Cualquier write sobre un evento publicado (no solo cambiar titulo) reproducia el sintoma.

#### Tests nuevos

`api/tests/test_eventos_validation.py`:

- `test_imagen_url_acervo_bucket_conocido_aceptada`: `mapalab/eventos/portada.jpg` → 201.
- `test_imagen_url_acervo_bucket_desconocido_rechazada`: `etc/passwd` → 422.
- `test_imagen_url_path_traversal_rechazado`: `mapalab/../etc/passwd` → 422.

Bump 0.47.4 -> 0.47.5.

---

## [0.47.4] - 2026-05-08

### Docs: patron estandar para huespedes React en /colibri/docs

Documenta el FAB que mapalab y sieej usan como patron de referencia para futuros integradores React. Snippet copy-paste completo del componente `ColibriReportButton` con:

- **Estilos estandarizados**: `bg-white`, `text-[#6E7477]`, hover `text-[#8936AB]` (morado IIEG), `w-7 h-7 md:w-6 md:h-6`, `rounded-full`, `shadow-[0px_2px_4px_0px_rgba(0,0,0,0.10)]`. Posicion `fixed bottom-4 right-4 z-50`.
- **Logica**: `useAuth()` para `identify()`, `useLocation()` para `setContext('sourceRoute', ...)`, `window.colibri.openPanel({ sourceApp, apiKey })`.
- **Variables de entorno** (`VITE_COLIBRI_SOURCE_APP`, `VITE_COLIBRI_API_KEY`).
- **Proxy Vite** para `/colibri` y `/api/public`.
- **Script HTML** para el bundle.
- **Trampa comun documentada**: `style={{ padding: 0, border: 0 }}` inline es necesario porque algunos huespedes (sieej entre ellos) tienen reset CSS global tipo `button { padding: 0.6em 1.2em }` que sobreescribe Tailwind utilities y deforma el FAB en pildora.

Nuevo link en el TOC sticky de la doc publica. Implementaciones de referencia listadas: mapalab `frontend/src/components/ReportButton.jsx` y sieej `frontend/src/components/ColibriReportButton.jsx`.

Bump 0.47.3 -> 0.47.4.

---

## [0.47.3] - 2026-05-08

### Admin: auto-recovery del CSRF token + API_URL como path relativo

Dos fixes que se descubrieron juntos al integrar mapalab:

#### 1. Endpoint nuevo `GET /autenticacion/csrf` (api)

`api/app/api/routes/auth.py`: agrega endpoint que devuelve `{ csrf_token }` para usuarios con sesion valida (cookie JWT). No requiere `verify_csrf` (eso seria circular). Permite refrescar el token sin re-login completo cuando el sessionStorage del browser se vacia (cierre de tab, refresh accidental tras 401, sincronizacion entre pestanas).

#### 2. Auto-retry CSRF + API_URL relativo (admin)

`admin/src/shared/services/api.js`:

- **Auto-recovery**: el response interceptor detecta 403 con `detail` que contiene "csrf" (case-insensitive). Llama `refreshCsrfToken()` (deduped via `csrfRefreshPromise`), guarda el nuevo token en `sessionStorage`, y reintenta el request original UNA vez (flag `__csrfRetried` para evitar loops). Soporta tanto `AxiosHeaders.set()` como objetos plain. Si el refresh falla o el retry tambien falla, propaga el error normal.
- **API_URL fallback de `http://localhost:8000` a `/api/administrador`** (path relativo). El fallback hardcoded a localhost violaba el CSP `connect-src 'self'` cuando el bundle se servia desde otro origen (ej. el gateway-hub real). Path relativo siempre matchea `'self'` y funciona en todos los entornos sin configurar VITE_ADMIN_API_URL.

Antes: si una editora dejaba la pestana abierta unos minutos y el sessionStorage se invalidaba, las acciones write daban 403 sin recovery posible salvo logout/login. Ahora: invisible al usuario, el bundle reintenta solo y la accion completa.

Bump 0.47.2 -> 0.47.3.

---

## [0.47.2] - 2026-05-08

### Admin: sider muestra items inaccesibles deshabilitados con candado y tooltip

Antes el sider ocultaba completamente los items que el rol del usuario no podia usar (ej. `Tipos`, `Source apps` para una `editora`). Resultado: la editora no sabia que esas funciones existian, y el admin no podia explicarle "haz click en X" sin pedirle screenshot. Ahora se muestran deshabilitados con candado y tooltip explicativo.

#### Cambios en `admin/src/app/sider-config.jsx`

- **Helper `renderDisabledLabel(label, requiredRoles)`** envuelve el label con icono `LockOutlined`, opacity 0.55 y tooltip `"Solo Administradora"` (o "Editora", "Externo" segun corresponda — los slugs internos `tetlamamakani`/`editora`/`externo` se traducen a labels legibles).
- **Plataforma**: items con `allowedGlobalRoles` que no incluye el rol actual ya no se filtran del array. Se renderizan con `disabled: true` y label decorado.
- **Proyectos**: si el usuario no tiene acceso al proyecto entero (no admin + no `allowedGlobalRoles` + no `userProjects`), se muestra el grupo deshabilitado completo. Items dentro de proyectos accesibles que requieren permisos extras (`allowedGlobalRoles` propio del item) se ven con candado individual.
- Se conserva el badge de pendientes (revisiones, reportes nuevos) solo en items accesibles.

Bump 0.47.1 -> 0.47.2.

---

## [0.47.1] - 2026-05-08

### Colibri widget: openPanel programatico + offsets X/Y separados + footer en espanol

Tres mejoras al widget para soportar integraciones React mas robustas (usadas por mapalab y sieej en sus FABs custom).

- `widget/src/index.js`: agrega `window.colibri.openPanel(opts)` que crea un `<colibri-panel>` programaticamente como child de `document.body`, lo abre, y lo remueve al cerrar (300ms despues del evento `colibri:closed`). Desacopla el panel del Custom Element host, eliminando un bug de visibilidad heredada cuando el host estaba oculto con `opacity: 0` o similar. Permite que React wrappers usen un `<button>` HTML nativo con tailwind y disparen el panel sin renderizar `<colibri-button>`/`<colibri-trigger>` visibles.
- `widget/src/colibri-button.js`: `POSITION_STYLES` ahora lee CSS vars `--offset-x` y `--offset-y` separadas (con fallback a `--offset` legacy). Permite alinear el FAB al lado de elementos existentes del huesped sin que la separacion vertical y horizontal sea identica.
- `widget/src/shared/form.js`: footer del formulario cambia de `"Powered by Colibri · IIEG"` a `"Impulsado por Colibri"` (espanol, sin marca IIEG redundante).

Bundle 48.31 KB -> 49.47 KB raw / 13.5 KB -> 13.81 KB gzip (+1.16 KB raw por las nuevas funciones, sigue muy debajo del target 30 KB gzip).

Bump 0.47.0 -> 0.47.1.

---

## [0.47.0] - 2026-05-08

### SIEEJ: endpoints respondent /mis-envios + UX cards en lista de formularios admin

Habilita la v1 del modulo "Mis envios" en el portal SIEEJ. El respondent
(rol `externo`) ya puede consultar paginado de su historico y el detalle
completo desde SIEEJ frontend, sin tocar mariachi/admin. Ademas, en el
CMS la lista de formularios pasa de tabla a grid de cards con filtros y
busqueda — y se agrega un atajo "Envios" directo en la accion de cada
formulario para que no este escondido detras de "Editar > tab Envios".

#### API respondent: `/formularios/mis-envios`

Dos endpoints nuevos en `app/api/routes/formularios/dinamicos.py`,
declarados antes de `/{slug}` para que FastAPI no los trate como path
param:

- `GET /formularios/mis-envios?estado=&q=&page=&sort=` — listado paginado
  del usuario autenticado. Filtros `estado` (en_proceso/enviado/expirado),
  `q` (busqueda en `formulario.slug` y `formulario.nombre`), `page`,
  `page_size` (max 100). Sort: `-actualizado_en` (default),
  `-enviado_en` (NULLS LAST portable), `nombre`. Item ligero
  (`MisEnviosListItem`) sin `datos` ni `definicion_snapshot`.
- `GET /formularios/mis-envios/{envio_id}` — detalle completo:
  `definicion_snapshot` (la del momento del envio, no la actual), `datos`,
  `archivos[]`, `eventos[]`. 404 si no existe; **403 si pertenece a otro
  usuario** (no 404 — para no filtrar existencia). Eventos solo exponen
  `tipo` y `ocurrido_en`; **no incluye `actor_usuario_id`** para no
  filtrar identidad de admins que reabran/expiren.

Gateados por `Depends(require_project_access('sieej'))` (no
`require_staff`) — los consume el portal SIEEJ; el rol externo nunca
toca `mariachi/admin` por T#208 (US#205).

`mis-envios` agregado a `SLUGS_RESERVADOS` en
`formularios_admin_service.py` para que ningun admin pueda crear un
formulario con slug colisionante.

#### Schemas

`app/schemas/sieej/envio.py` agrega:
- `MisEnviosFormularioInfo` (info ligera del padre).
- `MisEnviosListItem`, `MisEnviosListResponse` (lista paginada).
- `MisEnviosEventoResponse` (solo `tipo` + `ocurrido_en`).
- `MisEnviosDetalle` (detalle completo).

#### Service

`app/services/sieej/envios_service.py`:
- `listar_mis_envios(user, *, estado, q, page, page_size, sort)`.
- `obtener_mi_envio_detalle(user, envio_id)` con guard 403 cross-user.

#### Tests

`tests/test_sieej_mis_envios.py`: 15 tests pytest. Cubren lista vacia,
solo propios, filtros estado/q, paginacion, sort, sort invalido (422),
sin sesion (401), no expone datos en lista, detalle con
snapshot+datos+archivos+eventos, no expone `actor_usuario_id`,
cross-user 403, inexistente 404, **fidelidad historica del snapshot**
(cambia `f.definicion` despues del envio y verifica que el detalle
conserva la version original), slug reservado.

Para correr: `ENVIRONMENT=development pytest tests/test_sieej_mis_envios.py`
(el TestClient no persiste cookies con `Secure=True` sobre HTTP, default
en `environment=production`).

#### CMS admin: cards en lugar de tabla + atajo "Envios"

`mariachi/admin/src/features/sieej-formularios/`:

- `pages/FormulariosListPage.jsx`: refactor de tabla AntD → grid
  responsive de cards (1 col xs, 2 sm, 3 lg, 4 xl). Agrega busqueda local
  por nombre/slug/descripcion, filtro por estado y 3 opciones de
  ordenamiento. Skeleton loading y empty states distintos para
  "sin formularios" vs "sin resultados con filtros".
- `components/FormularioCard.jsx` (nuevo): card con titulo, slug+version,
  descripcion (ellipsis 2 lineas), badge de estado, vigencia (highlight
  rojo si vencida) y 4 acciones al pie con tooltip — Editar, Envios,
  Publicar/Cerrar, Eliminar. Card completa clickeable; acciones del pie
  con `stopPropagation`.
- `pages/FormularioEditorPage.jsx`: lee `?tab=` de los searchParams y
  controla el `activeKey` de Tabs; al cambiar de tab actualiza la URL
  con `replace`. URL queda bookmarkable. Whitelist de tabs validas
  (`{definicion, configuracion, asignaciones, envios}`); cualquier valor
  invalido cae a `definicion`.

Esto resuelve la queja de que el acceso a "Envios" estaba muy oculto:
ahora hay un boton directo en cada card (`?tab=envios`) y la URL es
compartible.

### Bump

- `api/pyproject.toml` -> 0.47.0.
- `admin/package.json` -> 0.47.0.
- `docs/sieej.md`: agregados endpoints `/mis-envios` + actualizada lista
  de slugs reservados.

---

## [0.46.2] - 2026-05-07

### Colibri widget: window.colibri.setContext() para enriquecer reportes desde el huesped

Habilita que el huesped agregue contexto custom (snapshot del mapa, capas activas, sesion del usuario, etc.) que se incluya en `source_context.custom` de cada reporte sin tener que pasarlo por atributo del Custom Element. Util para integraciones con context dinamico (ej. mapalab que cambia de capas/zoom constantemente).

#### Widget

- `widget/src/index.js`: agrega `window.colibri.setContext(key, value)` y `window.colibri.clearContext()`. Pasar `null`/`undefined` como value borra esa key. Persiste en `window.colibri.__customContext`.
- `widget/src/shared/form.js`: al construir el payload del POST, lee `__customContext` y lo mete en `sourceContext.custom`. Coexiste con `__userIdentify` (que sigue yendo a `sourceContext.user`).

#### Uso

```javascript
window.colibri.setContext('map', { basemap: 'osm', zoom: 12, center: [-103.4, 20.7] });
window.colibri.setContext('layers', activeLayerIds);
// Ahora todo reporte enviado lleva eso en source_context.custom.

window.colibri.setContext('layers', null);  // borra solo esa key
window.colibri.clearContext();               // borra todo
```

### Probado

Bundle rebuilt + redesplegado a `mariachi-nginx`. Verificado que `setContext` y `__customContext` aparecen en el bundle minificado.

Bump 0.46.1 -> 0.46.2.

---

## [0.46.1] - 2026-05-07

### Docs: actualizar context.md y consolidar especificacion del modulo Colibri

- `docs/context.md` actualizado a v0.46.1 con: tabla de productos extendida (Widget, SDK, Docs publicas como entradas), estructura del repo con carpetas `widget/` y `sdk/` documentadas, lista de routers admin extendida con `/colibri/*`, nueva seccion "Colibri publico" en endpoints, lista de tablas BD `iieg_portal` con bullets de Colibri, **nueva seccion "Modulo Colibri (v0.42.0–0.46.1)"** con resumen ejecutivo de los 5 paquetes, multi-tenancy, hardening implementado, y pendiente bloqueado, entry de "Cambios recientes" cubriendo las 6 versiones nuevas, referencia a `docs/colibri.md` en la seccion final.
- `docs/colibri.md` mantenido como **especificacion canonica** del modulo (estado actual, hardening checklist con todo implementado, roadmap por fases con migraciones reales).

Sin cambios de codigo. Solo docs.

Bump 0.46.0 -> 0.46.1.

---

## [0.46.0] - 2026-05-07

### Colibri: docs publicas standalone + integracion del widget en nginx

Cierra el ciclo de "embebible para terceros": ahora cualquier integrador externo puede leer documentacion sin acceder al panel admin, y el bundle del widget se construye e integra automaticamente al levantar la imagen de `mariachi-nginx`.

#### Documentacion publica

`nginx/static/colibri-docs/index.html` (24.7 KB, HTML + CSS + JS plano sin dependencias) servida en `/colibri/docs/` sin autenticacion. Contiene:

- Hero con SVG inline del colibri y descripcion del producto.
- Nav sticky con TOC de 7 secciones.
- Quick start con snippet copy-paste (boton "Copiar").
- Tabs interactivas para los 3 modos (Boton flotante / Trigger inline / Form embebido) con preview en vivo cargando el bundle real desde `/colibri/widget/colibri-widget.v1.js`.
- Tablas completas: atributos compartidos + atributos por modo (button/trigger/form), eventos DOM, errores comunes (401/403/422/429/413).
- Snippets de `identify()` + metodos de instancia.
- Seccion "Como obtener una API key" con flujo formal para integradores externos.
- Seccion del SDK npm con ejemplos.
- **Dark mode automatico** via `prefers-color-scheme: dark`.

#### Integracion nginx

- `conf.d/mariachi.conf`: dos `location` blocks nuevos:
  - `^~ /colibri/widget/` -> `/usr/share/nginx/html/colibri-widget/` con `Cache-Control: public, max-age=86400`, `Access-Control-Allow-Origin: *`, `X-Content-Type-Options: nosniff`. Permite servir el bundle a integraciones cross-origin.
  - `^~ /colibri/docs` -> `/usr/share/nginx/html/colibri-docs` con `Cache-Control: public, max-age=300` y `try_files` para servir `index.html`.
- `Dockerfile` ahora es multi-stage con 3 builders:
  1. `widget-builder` (node:24-alpine): `npm install` + `npm run build` del paquete `widget/`.
  2. `admin-builder` (node:24-alpine): build del CMS admin (igual que antes).
  3. Final stage `nginx:alpine`: copia `admin/dist` a `/mariachi`, `widget/dist` a `/colibri-widget`, y `nginx/static/colibri-docs` a `/colibri-docs`.

#### Boton "Docs publicas" en `IntegracionPage` (admin)

Boton con `ExportOutlined` en el header de `/colibri/integracion` que abre `/colibri/docs/` en pestania nueva. Util para que el admin pueda compartir el link directo con integradores externos sin enviarles credenciales del panel.

### Probado

| Endpoint | Status | Tamanio |
|---|---|---|
| `/colibri/docs/` | 200 | 24.7 KB |
| `/colibri/widget/colibri-widget.v1.js` | 200 | 48 KB |
| `/api/public/reportes/tipos` | 200 | 6 tipos |

Los tres componentes publicos del ecosistema Colibri (docs + widget + API publica) accesibles sin autenticacion. Build del Dockerfile multi-stage probado localmente: el widget se construye y se monta correctamente en el container final.

Bump 0.45.0 -> 0.46.0.

---

## [0.45.0] - 2026-05-07

### Colibri: SDK npm @iieg/colibri-sdk para integraciones programaticas

Paquete nuevo `sdk/` complementario al widget. Cliente HTTP minimalista TypeScript para Node 18+ y browser. Sin UI, sin DOM, sin React. Bundle final 6.9 KB raw / ~2 KB gzip estimado.

#### Stack

- **TypeScript puro** (sin bundler — `tsc` solo). El consumidor bundlea segun su entorno.
- **ESM-only** con `exports` en package.json. Requiere Node 18+ (`fetch` global).
- **Build:** dual `.js` + `.d.ts` + `.d.ts.map` + sourcemaps en `dist/`.

#### Cliente

```typescript
import { Colibri } from '@iieg/colibri-sdk';

const colibri = new Colibri({
    sourceApp: 'mi-app',
    apiKey: process.env.COLIBRI_API_KEY!,
    baseUrl: 'https://iieg.gob.mx/api/public',  // opcional
    fetchImpl: customFetch,                      // opcional para Node < 18
    timeoutMs: 10000,                            // opcional
});

colibri.identify({ id: 42, email: 'x@y.com', role: 'editor' });
colibri.setContext('plan', 'pro');

await colibri.report({
    tipo: 'bug',
    mensaje: 'Cron fallo',
    email: 'oncall@iieg.gob.mx',
    context: { jobId: 'abc-123' },
    respuestas: { navegador: 'chrome' },         // valida contra form_schema
});

const tipos = await colibri.tipos();             // cache 5 min
```

#### Errores tipados

`ColibriError` (base con `status` y `detail`) + 5 subclases especificas: `AuthError` (401), `ForbiddenError` (403), `ValidationError` (422), `RateLimitError` (429 con `retryAfter`), `NetworkError` (sin status, con `cause`). El SDK mapea response codes del backend a errores tipados para que el consumidor pueda reaccionar especificamente:

```typescript
try { await colibri.report({...}); }
catch (e) {
    if (e instanceof RateLimitError) wait(e.retryAfter);
    else if (e instanceof AuthError) rotateKey();
    else if (e instanceof NetworkError) retry();
}
```

#### Tipos exportados

`IdentifyUser`, `Breadcrumb`, `AutoCaptured`, `SourceContext`, `ReportPayload`, `ReportResponse`, `FormFieldOption`, `FormFieldDef`, `FormSchema`, `ReporteTipo`, `ColibriOptions`.

#### Casos de uso

Cron Node, worker Cloud Run / Lambda, app movil React Native, app con UI custom de reporte (widget oculto + metodos), error JS automatico (escuchar `window.onerror` y reportar via SDK).

#### Estructura

```
sdk/
├── package.json (name: @iieg/colibri-sdk v1.0.0, type: module, exports dual)
├── tsconfig.json (target ES2020, strict, declaration true)
├── README.md (docs completas con ejemplos)
└── src/
    ├── index.ts (Colibri class + createColibri factory + VERSION)
    ├── errors.ts (5 clases de error tipadas)
    └── types.ts (10 tipos publicos)
```

### Probado

`tsc` build OK con `strict: true`. 7/7 smoke tests: validacion de constructor, ValidationError sin tipo, NetworkError contra host inexistente, errores `instanceof ColibriError`, `RateLimitError.retryAfter`. Test real contra backend: `tipos()` devuelve 6 tipos, `report()` con `ck_pub_INVALID` -> AuthError 401.

Bump 0.44.0 -> 0.45.0.

---

## [0.44.0] - 2026-05-07

### Colibri: widget Web Components embebibles (button, trigger, form)

Paquete nuevo `widget/` independiente del CMS admin que expone Colibri como Web Components estandar para integrarse en cualquier sitio (React, Vue, Astro, Wordpress, vanilla HTML). Bundle 48 KB raw / 13.5 KB gzip.

#### Stack

- **Lit 3** + **Vite** en library mode con dos formatos: `iife` (`colibri-widget.v1.js` para `<script src>`) y `es` (`colibri-widget.v1.es.js` para `import`).
- **Shadow DOM** obligatorio: el CSS del widget no contamina al huesped y viceversa.
- **0 dependencias de runtime del huesped**, bundle standalone.
- **CSS theming** con variables (`--colibri-bg`, `--colibri-fg`, `--colibri-primary`, etc.) + soporte de `theme="auto"` con `prefers-color-scheme`.

#### 3 Custom Elements

- `<colibri-button>` (FAB): boton flotante posicionado `fixed`. Atributos: `size` (sm/md/lg), `position` (4 esquinas), `shape` (circle/pill/square), `shadow` (none/sm/md/lg), `label` (texto opcional), `icon` (preset o URL custom), `color`, `offset`, `z-index`. Click abre modal con form dinamico.
- `<colibri-trigger>` (link/icono/chip inline): trigger inline en flujo del documento. Atributos: `as` (link/text/icon/chip/menu-item), `label`, `icon`, `icon-position`, `color`, `underline`, `font-size`. Click abre el mismo modal del button.
- `<colibri-form>` (form embebido): formulario completo inline sin trigger. Atributos: `layout` (card/bare/compact), `width`, `tipo-selector` (tabs/dropdown/radio/hidden).

Atributos compartidos: `source-app`, `api-key`, `endpoint`, `tipos` (filtro csv), `theme`, `lang`, `email-required`, `context`.

#### Form dinamico

Carga `formSchema` por tipo de `GET /api/public/reportes/tipos` (cache 5min) y renderiza inputs segun el `type` declarado: `text`, `textarea`, `email`, `url`, `number`, `select`, `multiselect`, `radio`, `checkbox`, `file` (con limite 2MB cliente), `direccion`. Incluye campos base `mensaje` y `email_contacto` siempre.

POST multipart con `X-Colibri-Key` header + screenshot opcional + payload con `source_context` enriquecido (auto-captura de URL, referrer, UA, viewport, lang, timezone, timestamp + `identify()` global del huesped).

#### API JS publica

```javascript
window.colibri.identify({ id, email, name, role, metadata });
btn.open({ tipo, context });
btn.report({ tipo, mensaje, email, context, respuestas }); // headless
form.setTipo(slug);
form.setValues({ key: val });
form.reset();
```

#### Eventos DOM

`colibri:ready`, `colibri:opened`, `colibri:closed`, `colibri:tipo-changed`, `colibri:submitted`, `colibri:error`. Bubbleable + composable (cruzan Shadow DOM via `composed: true`).

#### Estructura

```
widget/
├── package.json (name: @iieg/colibri-widget v1.0.0, deps: lit ^3.2.0)
├── vite.config.js (library mode iife + es, sourcemaps, esbuild minify)
├── src/
│   ├── colibri-button.js
│   ├── colibri-trigger.js
│   ├── colibri-form.js
│   ├── index.js (registra los 3 + define window.colibri.identify)
│   └── shared/
│       ├── api.js (fetchTipos con cache, postReporte multipart, captureAuto)
│       ├── theme.js (CSS vars con dark mode)
│       ├── icons.js (SVG inline: bug, chat, feedback, help, flag, close, camera, send, check)
│       ├── form.js (ColibriFormCore - LitElement compartido entre form y panel)
│       └── panel.js (ColibriPanel - modal flotante usado por button y trigger)
```

### Probado

`npm install` + `vite build` -> bundle 48 KB / 13.5 KB gzip. Cargado desde nginx con `Cache-Control: public, max-age=86400` y `Access-Control-Allow-Origin: *` para integraciones cross-origin. Validado contra backend real: tipos cargan correctamente, key invalida -> AuthError 401.

Bump 0.43.0 -> 0.44.0.

---

## [0.43.0] - 2026-05-07

### Colibri: panel admin con paginas de gestion + reorganizacion del modulo

Frontend admin del modulo Colibri introducido en 0.42.0. Reorganiza `features/reportes` (que era item de plataforma) a `features/colibri` (proyecto del CMS con submenus dedicados) y agrega 6 paginas nuevas para gestionar todas las entidades del backend.

#### Reorganizacion estructural

- `features/reportes/` -> `features/colibri/` (git mv preservando historial). El item plano `/reportes` en `PLATFORM_ITEMS` se mueve a `PROJECT_REGISTRY.colibri` con icono colibri (`shared/components/ColibriIcon.jsx`, SVG extraido de mapalab).
- `sider-config.jsx` extiende `buildSiderItems` para soportar `allowedGlobalRoles` a nivel de proyecto (bypass de `UserProject` para tetlamamakani/editora) y a nivel de item (admin-only en items sensibles). El badge de pendientes (`showReporteBadge`) ahora funciona dentro de items de proyectos.
- Ruta legacy `/reportes` redirige a `/colibri/reportes` con `<Navigate replace />` para no romper bookmarks.

#### Paginas nuevas

- `ResumenPage` (`/colibri`): dashboard con cards globales (pendientes, total, % resueltos, tiempo promedio de resolucion), grafica de barras CSS de reportes por dia, breakdown por estado/tipo/aplicacion/direccion (Progress + Tag), top rutas con mas reportes. `Segmented` para alternar ventana (7d/30d/90d/1 anio).
- `TiposPage` (`/colibri/tipos`, admin): CRUD del catalogo de tipos. Tabla con orden, etiqueta, slug, descripcion, switch activo. Drawer con tabs **General** (label, slug autogenerado del label, ColorPicker como Select, descripcion, orden, activo) y **Formulario** (`FormSchemaEditor` para construir el form dinamico).
- `DireccionesPage` (`/colibri/direcciones`, admin): CRUD de direcciones organizacionales con nombre, siglas, descripcion, email, responsable, orden y activo.
- `SourceAppsPage` (`/colibri/source-apps`, admin): CRUD de huespedes registrados. Genera/rota API keys con modal "muestra-una-vez" (warning de no-recuperable + boton copiar). Configura dominios permitidos con tags (acepta wildcards), tipos permitidos, rate limit, branding, modo sin PII, privacy URL, scrubbers personalizados (Form.List con pattern + replacement).
- `RoutesPage` (`/colibri/routes`, admin): CRUD del fan-out. Drawer dinamico segun destino (email pide `to` con validacion email; otros piden `url` con validacion url). Filtros por estado/tipos opcionales.
- `IntegracionPage` (`/colibri/integracion`, admin): preview interactivo del widget. Selector de source app, 3 tabs (Boton flotante / Trigger inline / Form embebido) con snippet HTML copy-paste y vista previa en vivo cargando el bundle desde `/colibri/widget/colibri-widget.v1.js`. Boton "Docs publicas" abre `/colibri/docs/` en pestania nueva.

#### Componentes nuevos

- `FormSchemaEditor.jsx`: editor visual de campos dinamicos por tipo. Lista con Card por campo (key autogenerado del label, type Select [text/textarea/email/url/number/select/multiselect/radio/checkbox/file/direccion], required Switch, placeholder, helpText, options para tipos con choices). Reordenar con flechas, agregar/eliminar campos. Detecta keys duplicadas con tag rojo.
- `SourceContextView.jsx`: render bonito del `source_context` enriquecido en `ReporteDrawer`. Secciones para Usuario (avatar, email copiable, role, metadata), Tecnologia (URL, referrer, UA, viewport, lang, timezone, version), Breadcrumbs como Timeline AntD colapsable con colores por nivel (debug/info/warning/error/critical). Fallback a JSON pretty si llega un dict legacy sin estructura reconocible.
- `ColibriIcon.jsx` (en `shared/components/`): SVG inline reusable.

#### Refactor de existentes

- `ReportesListPage`: usa tipos dinamicos del catalogo via `useReporteTipos` (con fallback a constants estaticos si la API falla). Toggle `Segmented` "Lista | Agrupados" que alterna entre vista plana y vista agrupada por fingerprint (count desc). Columna "Ocurrencias" con tags de color escalado (default/orange/red).
- `ReporteDrawer`: muestra "Respuestas del formulario" leyendo `formSchema` del tipo y formateando valores (lista para multiselect, "Si/No" para checkbox, label para select). Selector de direccion asignada. Selectores de severidad/prioridad con tags. InputNumber para `duplicado_de` (con guarda de auto-referencia). Input "bloqueado por". Collapse con Timeline de actividad (avatar + username + diff `anterior -> nuevo`).

#### Services y hooks nuevos

- `tiposService.js`, `direccionesService.js`, `sourceAppsService.js` (con `rotarApiKey`), `routesService.js`, `statsService.js`, extension de `reportesService.js` con `listReportesGrupos` y `getReporteActividad`.
- `useReporteTipos`, `useDirecciones`, `useColibriStats` con caching y reload manual.

### Probado

`vite build` OK, smoke visual: navegacion a `/colibri/*`, drawer extendido, modal de rotacion de key, generador de API keys, FormSchemaEditor.

Bump 0.42.0 -> 0.43.0.

---

## [0.42.0] - 2026-05-07

### Colibri: backend completo del modulo de reportes embebibles

Inicia la introduccion del modulo Colibri (sistema centralizado de reportes embebibles del IIEG). Este commit aporta toda la capa backend: modelos, schemas, services, routers admin y endurecimiento del endpoint publico. El frontend admin, widget, sdk y docs publicas vienen en versiones siguientes.

#### Modelos nuevos

- `ReporteTipo` (`reporte_tipos`): catalogo editable de tipos (slug, label, color, icon, descripcion, form_schema jsonb, activo, orden). Reemplaza el enum SQL hardcoded; `reportes.tipo_id` es FK opcional (transicion segura).
- `DireccionOrganizacional` (`direcciones_organizacionales`): areas internas del IIEG ruteables (nombre, siglas, email_contacto, responsable_nombre, activo, orden).
- `SourceApp` (`source_apps`): aplicaciones huesped registradas con API key (hash + prefix), dominios_permitidos jsonb (CORS dinamico con wildcards), tipos_permitidos, rate_limit_per_hour, branding, disable_pii, privacy_url, scrubbers personalizados.
- `ColibriRoute` (`colibri_routes`): reglas de fan-out automatico (source_app_id + tipo_id como filtros, destino enum [discord/slack/webhook/email], config jsonb, filtros adicionales).
- `ReporteGrupo` (`reporte_grupos`): agrupacion por fingerprint sha256 determinista para dedupe (count, primer_visto, ultimo_visto, primer_reporte_id, ultimo_reporte_id).
- `ReporteActividad` (`reporte_actividad`): audit log de cambios sobre reportes (reporte_id CASCADE, actor_id, accion, detalle jsonb con `{campo, anterior, nuevo}`, nota, creado_en).

`Reporte` extendido con: `tipo_id`, `direccion_id`, `source_app_id`, `grupo_id`, `respuestas` jsonb (campos dinamicos del form_schema), `severidad` (baja/media/alta/critica), `prioridad` (P0..P3), `duplicado_de` FK auto-referencial, `bloqueado_por` text, `sla_at` datetime.

#### Schemas Pydantic con `CamelCaseInput`

`reporte_tipo.py`, `direccion_organizacional.py`, `source_app.py` (incluye `SourceAppKeyRotateRequest/Response`), `colibri_route.py`, `form_schema.py` (`FormFieldDef`, `FormSchemaDef`, `validate_respuestas` con validacion por tipo de campo y opciones), `source_context.py` (`AutoCaptured`, `IdentifyUser`, `Breadcrumb`, `SourceContext` tipado).

#### Services nuevos

- `colibri_keys.py`: generacion de API keys (`ck_pub_*` para browser, `ck_priv_*` para server), hash con bcrypt sobre sha256 del plaintext, `verify_api_key`, `match_origin` con soporte de wildcards (`*.dominio.com`, `*`).
- `colibri_fingerprint.py`: hash sha256 determinista con normalizacion de ruta (quita querystring, reemplaza path params numericos como `/eventos/42` -> `/eventos/:id`).
- `pii_scrubber.py`: scrubbers regex defaults (JWT, tokens en query, Authorization header, CCN) extensibles por `source_app.scrubbers`. Modo `disable_pii` purga UA, viewport, identify y breadcrumbs.
- `colibri_router_engine.py`: best-effort fan-out async. Errores nunca bloquean creacion del reporte. Dispatchers para Discord (content), Slack (text), webhook generico, email (placeholder).

#### Routers admin

Todos bajo `/api/administrador/`, autenticados, writes admin-only:

- `colibri/tipos` — CRUD + reorder batch.
- `colibri/direcciones` — CRUD.
- `colibri/source-apps` — CRUD + `POST /:id/rotate-key` (devuelve plain key una sola vez).
- `colibri/routes` — CRUD del fan-out.
- `colibri/stats` — payload completo con totales, breakdown por estado/tipo/app/direccion, serie por dia, top rutas, tiempo promedio de resolucion.
- `reportes` extendido: acepta `direccion_id`, `severidad`, `prioridad`, `duplicado_de`, `bloqueado_por` en update; serializacion con datos relacionales; nuevos `GET /reportes/grupos/lista` (paginado por count desc) y `GET /reportes/{id}/actividad` (timeline). Cada `PATCH` registra una fila en `reporte_actividad` por cada campo cambiado.

#### Endpoint publico endurecido

`POST /api/public/reportes`:

- Acepta `respuestas` (form-data JSON) validado contra `form_schema` del tipo.
- Si llega header `X-Colibri-Key`: lookup por prefix + verify hash, valida origen contra `dominios_permitidos`, valida tipo en `tipos_permitidos`, aplica rate limit por (source_app, IP). Sin header sigue funcionando para compat legacy.
- Aplica scrubbing PII a mensaje, source_route, source_context y respuestas antes de persistir. `disable_pii=true` purga email_contacto.
- Calcula fingerprint y hace lookup-or-create atomico del grupo (`SELECT FOR UPDATE SKIP LOCKED`). Asigna `grupo_id`.
- Dispatcha al engine de routes (best-effort) ademas del notifier discord legacy.
- `GET /api/public/reportes/tipos` con `Cache-Control: public, max-age=300` para que widget/sdk consuman tipos+formSchema sin auth.

#### Migraciones Alembic

Rama mariachi, todas con downgrade:

| Revision | Cambio |
|---|---|
| `c8d9e0f1a2b3` | `reporte_tipos` + seed 6 tipos + `reportes.tipo_id` FK + backfill desde enum |
| `d0e1f2a3b4c5` | `direcciones_organizacionales` + `reportes.direccion_id` FK |
| `e1f2a3b4c5d6` | `source_apps` + seed 3 (mapalab/sieej/portal sin keys, inactivos) + `reportes.source_app_id` FK + backfill |
| `f2a3b4c5d6e7` | `reporte_tipos.form_schema` jsonb + `reportes.respuestas` jsonb |
| `a1b2c3d4e5f7` | `source_apps`: `disable_pii`, `privacy_url`, `scrubbers` |
| `b1c2d3e4f5a6` | `colibri_routes` |
| `c1d2e3f4a5b7` | `reporte_grupos` + `reportes.grupo_id` FK |
| `d2e3f4a5b6c8` | `reportes`: `severidad`, `prioridad`, `duplicado_de` self-FK, `bloqueado_por`, `sla_at` + `reporte_actividad` |

### Probado

Build admin OK, migraciones aplican limpiamente sobre BD dev. Smoke tests: API key invalida → 401; CORS bloqueado → 403; tipo no permitido → 403; respuestas que faltan campo requerido → 422. Fingerprint: 2 reportes identicos sobre `/eventos/42` y `/eventos/99` (mismo bug, distinto id) caen al mismo grupo. PII scrubber: JWT, tokens en query, `Authorization: Bearer` y CCN se anonimizan; `disable_pii=true` purga UA/viewport/user/breadcrumbs. Engine de routes: errores en webhook destino no bloquean creacion del reporte (best-effort).

---

## [0.41.1] - 2026-05-07

### Audit del modulo Eventos: hardening seguridad/validacion + tests + UX

Auditoria completa de Eventos MapaLab (backend + admin + visor) con 40+ hallazgos. Aplicacion de 10 quick wins + 8 mejoras de impacto medio/alto en 18 commits pequeños separados.

#### Backend (api)

- **Validacion reforzada** (`fix(eventos): hardening validacion schemas`): `CapaRef.model_validator` exige `workspace+layer` si tipo='capa' y `alias` no vacio si tipo='etiqueta' (antes el validador estaba vacio, permitia capas malformadas). `BBox` clampa a EPSG:4326 (-180..180 lon, -90..90 lat). `titulo`/`descripcion`/`alias`/`icono_url`/`imagen_url` con `max_length` explicito. Helper `_validate_image_url` rechaza `javascript:` y otros vectores no-imagen.
- **RBAC viewer** (`fix(eventos): viewer no puede ver eventos en estado draft`): `listar_eventos` filtra a `published` para viewers; nueva dependency `get_evento_visible_or_404` para `GET /{id}` y `/preview`. Helper `_can_edit_mapalab` centraliza la regla.
- **CSRF en presencia** (`fix(eventos): exigir CSRF en PUT /eventos/{id}/presencia`): el write de presencia ahora exige `X-CSRF-Token` como el resto de los writes del CMS.
- **Concurrencia en aprobar borrador** (`fix(borradores): bloquear apply de evento si fue editado en paralelo`): `_apply_evento` devuelve 409 si `evento.updated_at > borrador.actualizado_en + 2s`, evitando que la aprobacion de un borrador sobrescriba cambios concurrentes hechos via PATCH directo.
- **Rate limit** (`fix(eventos): rate limit en writes`): 60 writes/min por usuario en POST/PATCH/publicar/despublicar/DELETE, mismo patron de layers/layer_metadata. Protege contra loops accidentales que invaliden el cache server-side.
- **`EventoEstado` enum** (`refactor(eventos): EventoEstado enum como single source of truth`): nuevo `app/core/eventos.py` reemplaza strings literales `'draft'`/`'published'` en model, schema, routes y borrador_service.
- **Serializers SSoT** (`refactor(eventos): consolidar serializers en _EventoVisibleFields`): `_EventoVisibleFields` y `_ImageUrlMixin` eliminan ~30 lineas de duplicacion entre `EventoResponse` y `EventoPublicResponse`. Agregar campos al modelo ya no requiere editar dos clases.
- **Datetimes con TZ** (`fix(eventos): datetimes con timezone (timestamp with time zone)`): cinco columnas datetime migradas de `timestamp` a `timestamp with time zone`. Resuelve ambiguedad al comparar con `utcnow()` y al deserializar ISO 8601 con offset desde el frontend.
- **JSONB** (`perf(eventos): migrar bbox y capas a JSONB`): `bbox` y `capas` migrados de `JSON` a `JSONB`, habilitando futuros indices GIN sobre el contenido.
- **Presencia con SCAN_ITER** (`perf(presence): usar SCAN_ITER en vez de KEYS`): `redis.keys()` (O(N) bloqueante) reemplazado por `scan_iter` con cursor. Aplica a presencia de eventos y cualquier otro recurso.

#### Admin (frontend)

- **CamelCase canonico** (`fix(eventos-admin): camelCase canonico + autosave guard + URL validate`): `EventoEditPage` usa camelCase en form fields y payload (`iconoUrl`, `imagenUrl`, `fechaInicio`, `fechaFin`, `autoActivar`). El autosave deja de persistir borradores sin titulo. `handleEliminar` resetea `acting` en `finally`. `EventoIconPicker` valida URL en cliente (status error + mensaje inline).
- **BBoxField estable** (`fix(eventos-admin): estabilizar BBoxField y rowKey de CapasField`): `Draw` ya no se recrea en cada render del padre — `onChange` se referencia con ref. `CapasField` rowKey con fallback `etiqueta-<idx>` para evitar duplicate keys de React.
- **GeoServer error visible + a11y + clamp BBox** (`fix(eventos-admin): manejo de errores GeoServer + accesibilidad + clamp BBox`): el modal `AddCapaModal` (extraido de `CapasField`, baja a 183 LOC) muestra Alert cuando `/geoserver/workspaces` falla. Botones reciben `aria-label`. `BBoxField` ManualInputs respetan min/max y bloquean valores fuera de rango con feedback inmediato.
- **Lista buscable** (`feat(eventos-admin): busqueda y filtro por estado en EventosListPage`): `Input.Search` por titulo/slug + `Segmented` Todos/Publicados/Borradores.
- **AntD v6 cleanup + reset modal rechazo** (`chore(eventos-admin): Space direction + reset modal rechazo`): `Space orientation=` (deprecated) reemplazado por `direction=` en los 6 archivos. Modal de rechazo de borrador limpia el comentario al cerrar/cancelar y declara `destroyOnHidden`.

#### Visor (mapalab/frontend)

- **Cookie quitada en endpoints publicos** (`chore(eventos): quitar credentials include en endpoints publicos`): `/eventos`, `/home`, `/cache-version` consumen con `credentials: 'omit'`. Antes enviaban la cookie sin necesidad y abrian vector si CORS de produccion permitia origin laxo con `credentials:true`.
- **SVG fallback + Beta flag + a11y** (`fix(eventos): SVG fallback + Beta badge feature flag + a11y widget`): EventoIconButton sustituye el "*" hardcoded por un SVG de marker. Badge "BETA" condicional via `VITE_EVENTOS_BETA_BADGE=false` (documentado en `.env.example`). ExternalEventoWidget agrega `onFocus`/`onBlur` (con check de relatedTarget) y `role="region"` + `aria-label` para soporte de teclado y lectores de pantalla.

#### Tests

- **41 tests del modulo Eventos** (`test(eventos): cobertura RBAC, validacion, concurrencia y lifecycle` + `fix(eventos): exigir CSRF en PUT /eventos/{id}/presencia`): 4 archivos cubren RBAC (admin/editor/viewer/no-membership × cada endpoint, CSRF), validacion (CapaRef/BBox/URLs/slug), concurrencia (`expectedUpdatedAt`) y lifecycle (publicar/despublicar/eliminar/preview/orden). Conftest con filtro de tablas `JSONB`/`ARRAY` para que modelos postgres-only no rompan el setup SQLite del suite global.

#### Docs y SIEEJ

- `docs/sieej.md` reescrito al modelo dinamico actual (Formulario JSONB + Grupo + Envio). El documento legacy describia las tablas estaticas eliminadas en `c6d7e8f9ab01`.
- `refactor(sieej)`: removido item placeholder `/sieej/agregar-dependencia` del sider (huerfano, nunca ruteado).
- `feat(users)`: rol `externo` agregado al Select de UsersPage para crear dependencias SIEEJ desde el flujo estandar; eliminado el componente huerfano `AddSieejDependenciaPage.jsx`.
- `refactor(api)`: removido endpoint `POST /usuarios/agregar-dependencia-sieej` (absorbido por el flujo estandar de creacion de usuarios).
- `Evento` model documenta la matriz `estado`/`activo`/vigencias para visibilidad publica.

### Probado

Local: 41 tests del modulo Eventos pasan en SQLite in-memory. Migraciones JSONB y `timestamp with time zone` aplicadas limpiamente sobre la BD de dev. Lint del admin y del visor sin errores nuevos.

---

## [0.41.0] - 2026-05-07

### Perf: cache server-side de /eventos y /home + indice parcial de eventos publicados

Reduce trabajo de DB en el endpoint publico mas caliente del visor (mapalab pollea cada 30s + abre eventos por usuario). Antes cada hit a `/api/mapalab/eventos` corria la query con filtros temporales y serializaba con Pydantic; ahora se cachea la respuesta JSON en Redis bajo el token de version y el endpoint la sirve directo via `Response(content=cached, media_type='application/json')` (skipea la re-validacion del `response_model`).

#### Backend (api)

- `services/mapalab_public_cache.py`: nuevos `get_cached_eventos()` y `get_cached_home()` (devuelven `(version, payload | None)`) + `store_cached_*(version, payload_json)`. Clave Redis: `mapalab:public_cache:payload:{scope}:{version}` con TTL de 30 dias. Si la version cambia (bump por `notify_*_changed`), las nuevas requests caen en el `else` y rebuilden bajo la nueva clave; la vieja queda inalcanzable y expira sola.
- **Removido el debounce de 5s en `notify_*_changed`**: cada bump ahora es un `SET` directo (operacion barata en Redis). El debounce ocultaba la ultima edicion de una rafaga en publish/unpublish — sin debounce, todas las invalidaciones se reflejan en el siguiente poll de 30s. Eliminados `_DEBOUNCE_WINDOW_SECONDS`, `_LOCK_PREFIX` y `_dedup_bump`.
- `api/routes/public.py`: `eventos_visibles` y `home_publicado` consumen el cache; en miss serializan via Pydantic, guardan el JSON, y devuelven el `Response` directo.
- `alembic/versions/mariachi/f3a4b5c6d7e8_add_eventos_publicados_index.py`: nuevo indice parcial `ix_eventos_publicados_visibles ON eventos (orden ASC, id ASC) WHERE estado='published' AND activo=true`. Acelera el filtro tipico del endpoint publico (`eventos.published_at`, `activo`, ventana fechas) sin penalizar escrituras de drafts.

### Probado

Local: bump de version invalida cache correctamente (verificado con publicar/despublicar evento + curl al endpoint), payload se sirve desde cache en hits subsiguientes hasta el siguiente bump. Migracion aplicada limpiamente sobre la BD de dev.

---

## [0.40.8] - 2026-05-06

### Fix: init_db.py reconoce admin existente despues de normalizacion lowercase

`crear_usuario_admin` en `init_db.py` buscaba `Usuario.username == ADMIN_USERNAME` case-sensitive. Tras la migracion de 0.40.7 que bajo a lowercase los datos historicos, el admin original (ej. `EstoNoEsUnAdmin` en GCP) quedo persistido como `estonoesunadmin` en BD. Al reiniciar el contenedor, `init_db.py` no reconocia el admin (porque el env var sigue con caps), intentaba crear uno nuevo, e impactaba el unique constraint del email — el container moria en bucle.

- `crear_usuario_admin`: lookup ahora con `func.lower(Usuario.username) == admin_username OR func.lower(Usuario.email) == admin_email`, ambos normalizados antes; al crear, persiste username/email en lowercase.
- `crear_usuarios_ejemplo`: misma normalizacion para que `editora1` no sufra el mismo problema en entornos con `CREATE_SAMPLE_USERS=true`.

### Probado

Local: con BD ya migrada (admin en lowercase) y env vars con mayusculas (`ADMIN_USERNAME=Admin`, `ADMIN_EMAIL=Admin@iieg.gob.mx`), `init_db.py` imprime "Usuario admin ya existe" y el contenedor levanta limpio.

---

## [0.40.7] - 2026-05-06

### Fix: login case-insensitive y normalizacion de username/email

Los usuarios cuyo `username` o `email` se almaceno con mayusculas (ej. `Editora1`, `Edgar.Villarreal@iieg.gob.mx`) no podian entrar a SIEEJ porque el frontend de SIEEJ envia el identificador en lowercase (`Login.jsx` con `normalize="lowercase"`) y el backend filtraba `Usuario.username == credentials.username` case-sensitive. En GCP se manifesto como 401 "Credenciales invalidas" para todos los usuarios SIEEJ con identificadores que no estaban ya en lowercase. Mariachi-admin no normalizaba en su pantalla de login y por eso ahi si entraban.

#### Backend (api)

- `auth.py / iniciar-sesion`: el query ahora hace `func.lower(Usuario.username) == identifier OR func.lower(Usuario.email) == identifier` con `identifier` strip+lower del input. Permite entrar con cualquier capitalizacion y tambien por email (la UI ya decia "Usuario o correo electronico").
- `users.py / crear_usuario / actualizar_usuario / agregar-dependencia-sieej`: `username` y `email` se persisten siempre en lowercase via helper `_normalize_identifier`. Los checks de unicidad usan `func.lower(...)` para evitar duplicados case-variant (`Edgar`/`edgar`).
- `auth.py / actualizar_perfil`: misma normalizacion al cambiar email desde el perfil.
- Migracion `b6c7d8e9f0a1_normalize_usuarios_username_email`: backfill `UPDATE usuarios SET username = lower(trim(username)), email = lower(trim(email))` para alinear datos historicos.

#### Admin (frontend)

- `LoginPage.jsx`: `Form.Item` de username con `normalize={(v) => v?.trim().toLowerCase()}`. UX consistente con SIEEJ y refuerza el contrato de identificador canonico en lowercase.

### Probado

Local: crear usuario con `username="TestMix"` / `email="Test.Mix@Example.com"` queda persistido como `testmix` / `test.mix@example.com`. Login responde 200 con cualquiera de las cuatro variantes (`TestMix`, `testmix`, `Test.Mix@Example.com`, `test.mix@example.com`) y 401 con un identificador inexistente. Migracion aplicada limpiamente sobre la BD de dev.

---

## [0.40.6] - 2026-05-06

### Eventos: auto-registro de workspace al asociar capa

Al asociar una capa al evento desde `CapasField`, si el workspace al que pertenece **no esta registrado** en `mapalab.workspaces`, se registra automaticamente con valores derivados (`alias=geoserver_workspace`, `db_schema=geoserver_workspace`, `label=Title Case`). Despues continua el flujo `auto-leaf` y la asociacion al evento. Cero clicks extra para el admin.

#### Backend (api)

- `GET /administrador/geoserver/workspaces?include_unregistered=true` tambien lista workspaces existentes en GeoServer pero ausentes de `mapalab.workspaces`, con `registered: false` y `alias: null`. Filtra workspaces sin capas (no tiene sentido como opcion). Cada item ahora incluye siempre `registered: bool`.

#### Admin (frontend)

- `features/mapalab-eventos/helpers/addCapa.js`: nuevo helper `addCapaToEvento(leaf, value, onChange, onAfterRegister)` extraido de `CapasField`. Si `leaf.workspaceRegistered=false`, hace POST `/geoserver/workspaces/register` antes del `auto-leaf`. Toast `"Workspace 'X' registrado automaticamente"` cuando se dispara.
- `CapasField.jsx`: pasa `?include_unregistered=true` al GET solo si el usuario es admin (`tetlamamakani`). Para editora, comportamiento previo (solo registrados). El `addCapa` queda como wrapper de una linea sobre el helper.

#### Notas operativas

- Si el alias por default no es el deseado, se puede editar despues desde el editor de capas/workspaces.
- Workspaces sin capas (ej. `egarpruebas`) no aparecen en el listado, asi no se pueden auto-registrar accidentalmente.
- Editora no admin: no ve workspaces no registrados; si necesita asociar una capa de un workspace pendiente, pide a un admin que lo registre primero.

---

## [0.40.5] - 2026-05-06

### Fix(admin): warning al re-resetear contraseña pendiente

`handleResetPassword` en `admin/src/features/users/pages/UsersPage.jsx` no advertía al admin cuando el usuario destino ya tenía `must_change_password=true`. El admin podía reiniciar dos veces consecutivas, compartir la primera temp_password al usuario, y dejar la segunda vigente en la BD — el usuario intentaba loguearse con la primera y obtenía 401 "Credenciales inválidas".

- Modal de confirmación ahora muestra aviso visible cuando ya hay un reset pendiente, indicando que la temp anterior dejará de servir al continuar.
- `okButtonProps: { danger: true }` en ese caso para reforzar visualmente la consecuencia.
- Tras el reset se llama `fetchUsers()` para que la lista refleje el estado actualizado de `must_change_password`.
- Texto del modal de éxito reescrito para dejar claro que la contraseña solo se muestra una vez.

### Reproducido

Localmente: dos POST `/usuarios/{id}/restablecer-contrasena` consecutivos producen dos temp distintas; login con la primera devuelve 401, con la segunda 200. Confirma que el bug en GCP era el doble reset humano (logs mostraban dos POST 200 separados por 3:21 min) y no un problema del backend.

---

## [0.40.4] - 2026-05-06

### Discord notifier — visibilidad + documentar variables

`notify_new_reporte` antes hacía return silencioso si `DISCORD_WEBHOOK_<SOURCE>` no estaba seteado. Ahora loguea `WARNING` con `source_app` y `reporte_id` para que el operador detecte el missing config sin tener que adivinar por qué no llegan reportes a Discord.

### Documentacion

- `.env.staging.example` y `.env.production.example` ahora documentan las tres variables (`DISCORD_WEBHOOK_MAPALAB`, `_SIEEJ`, `_PORTAL`) con valor vacío como placeholder, alineado con `.env.development.example` que ya las tenía.

### Probado en local

`POST /api/public/reportes` con `source_app=mapalab` y un webhook de Discord seteado en `.env.staging` (no versionado) entrega el embed correctamente al canal (Discord responde 204).

---

## [0.40.3] - 2026-05-06

### Fix(test): sider-config tras habilitar grupo SIEEJ

El test `proyecto con disabled:true se renderiza con flag disabled y sus hijos no tienen onClick` en `src/app/__tests__/sider-config.test.js` aún esperaba `project-sieej.disabled === true`. Tras 0.40.2 (que removió `disabled:true` del proyecto SIEEJ), el assert se rompía.

- Removida la asercion sobre `sieej.disabled`; el caso `disabled:true` queda cubierto por `project-portal` (que sigue disabled).
- Nuevo test `sub-item con disabled:true queda disabled aunque el proyecto no lo este` que verifica el caso del placeholder `/sieej/agregar-dependencia` (sub-item disabled bajo un proyecto activo).

Sin cambios de comportamiento en runtime; solo alineamiento del test con el state actual de `PROJECT_REGISTRY`.

---

## [0.40.2] - 2026-05-06

### Admin (UI) — habilitar grupo SIEEJ en sidebar

`app/sider-config.jsx` ahora deja el grupo SIEEJ habilitado (`disabled: true` removido) para que `tetlamamakani` y los miembros del proyecto vean el menú lateral con:

- **Formularios** (`/sieej/formularios`) — list page del constructor visual + JSON.
- **Grupos** (`/sieej/grupos`) — CRUD de grupos con miembros (NUEVO item, antes solo estaba la ruta sin entrada en sidebar).
- *Agregar dependencia* — placeholder permanece pero queda `disabled: true` (no implementado).

Esto permite probar el modo edición de formularios SIEEJ desde la UI sin tener que escribir la URL a mano.

---

## [0.40.1] - 2026-05-06

### Cleanup: imports tras refactor CamelCaseInput

Tras el refactor del 0.39.0 que cambió la clase base de varios schemas de `BaseModel` a `CamelCaseInput`, quedaron imports de `BaseModel` sin usar y orden de imports fuera de PEP8 en 8 archivos. Ruff/isort limpio:

- `api/app/schemas/{home_section,layer_metadata,media,media_bucket,menu_item,page,project,reporte}.py`: `BaseModel` removido cuando ya no se usaba; `CamelCaseInput` reordenado al bloque correcto.

Sin cambios de comportamiento; solo limpieza estatica.

### Documentacion

- `docs/context.md` actualizado a 0.40.1; agregadas notas sobre 0.39.x (workspaces dinamicos, auto-leaf, drawer reutilizable, fix global camelCase, fix SLD globales) y 0.40.0 (sieej-levantamiento pdfTemplate). Tambien referencia al rename `mundial -> eventos` ahora aplicado por `mapalab-dataengine 1.12.x` en su migrador (`run_migrate_mapalab_card.py`).

---

## [0.40.0] - 2026-05-06

### Backend (api) — sieej-levantamiento: pdfTemplate al step resumen

#### Migration

- `d7e8f9a0b1c2_sieej_levantamiento_pdf_template.py` (down_revision
  `c6d7e8f9ab01`): UPDATE de `formulario.definicion` para el slug
  `sieej-levantamiento`. Inyecta `pdfTemplate: 'sieej-levantamiento'`
  + `exportPdf: true` al step `resumen`. Idempotente. Aplicada en
  prod local; el frontend (sieej 1.7.0) usa la flag para descargar
  el PDF custom (con el formato del wizard original) en lugar del
  generico.

#### Cambiado

- El seed migration `b5c6d7e8f9aa` actualizado para nuevos deploys
  (incluye la flag desde el origen, evita correr la migration
  d7e8f9a0b1c2 sobre instalaciones limpias).

### Bump

- `api/pyproject.toml` -> 0.40.0.
- `admin/package.json` -> 0.40.0.

---

## [0.39.4] - 2026-05-06

### Backend (api) — slugs reservados al crear formulario SIEEJ

`formularios_admin_service.py.crear()` rechaza con 400 si el `slug`
solicitado esta en la whitelist `SLUGS_RESERVADOS`: `inicio-sesion`,
`exencion`, `cambiar-contrasena`, `error`, `regisño`, `catalogos`,
`schema`, `envio`. Esto previene que el slug colisione con rutas
literales del frontend SIEEJ (ahora `/<slug>` directo, sin prefix
`/formularios`) o con sub-paths internos del API.

### Bump

- `api/pyproject.toml` -> 0.39.4.
- `admin/package.json` -> 0.39.4.

---

## [0.39.3] - 2026-05-06

### Fix: cargar SLD de styles globales de GeoServer

Capas que tenian asignado un style global de GeoServer (ej. `point`, `line`, `polygon`, `raster` — el default que GeoServer aplica cuando se publica una capa sin style propio) daban `502 — SLD no encontrado: <ws>:<style>` al abrir el tab Simbologia. El cliente solo consultaba `/rest/workspaces/<ws>/styles/<name>.sld`, que devuelve 404 cuando el style vive en el catalogo global.

- `GeoServerClient.get_sld`: si la consulta al workspace devuelve 404, hace fallback a `/rest/styles/<name>.sld` (catalogo global). Antes lanzaba `GeoServerError` directo.
- Nuevo `GeoServerClient.style_is_global` que detecta si el style vive en el catalogo global del servidor.
- `GET /administrador/geoserver/styles/{alias}/{style_name}` agrega `isGlobal: bool` a la respuesta. Cuando `isGlobal=true`, fuerza `editable=false` con razon explicativa: editar un global afectaria todos los workspaces que lo usan, asi que el frontend cae al fallback (XML read-only + leyenda renderizada por GeoServer). Para personalizar, hay que duplicar el style al workspace o editarlo desde el panel admin de GeoServer.

Sintoma reportado: el evento Mundial 2026 mostraba "Error al cargar el SLD — Request failed with status code 502" al abrir el tab Simbologia de cualquier capa auto. Tras el fix, el editor abre el SLD global (read-only) con leyenda y el admin puede ver el style aplicado sin poder modificar accidentalmente el global.

---

## [0.39.2] - 2026-05-06

### Fix: flattenLeaves lee workspace/layer de wmsConfig

`useLayerTreeAdmin.flattenLeaves` esperaba `n.workspaceAlias` y `n.geoserverLayer` flat en cada nodo del arbol, pero el endpoint publico `/mapalab/api/layers/tree` los expone dentro de `n.wmsConfig.workspace` y `n.wmsConfig.geoserverLayer`. Como resultado, ningun leaf se detectaba y:

- El boton "Editar contenido" del drawer en `CapasField` quedaba siempre deshabilitado con tooltip "Agregala al arbol primero", aunque la capa ya estuviera registrada.
- El `labelByKey` que distingue capas registradas vs "solo GeoServer" siempre venia vacio, asi que todas las capas se mostraban con tag "solo GeoServer" y se invocaba auto-leaf aunque la capa ya estuviera en el arbol (idempotente, sin daño, pero ruidoso).

`flattenLeaves` ahora hace fallback de `n.workspaceAlias` a `n.wmsConfig?.workspace` y de `n.geoserverLayer` a `n.wmsConfig?.geoserverLayer`. Tras este fix, el boton del drawer se habilita correctamente y `CapasField` distingue capas registradas vs no registradas.

---

## [0.39.1] - 2026-05-06

### Config: ACERVO endpoint y MAPALAB cache en staging-on-localhost

Dos correcciones de configuracion que solo aplican al setup local del staging (no afectan staging GCP ni produccion porque ambos usan su propio `.env.staging`/`.env.production`).

#### Cambiado

- `docker-compose.yml`: removidas las lineas del bloque `environment:` que interpolaban `${ACERVO_ENDPOINT}`, `${ACERVO_PUBLIC_ENDPOINT}` y `${SENTRY_DSN}` sin default. Cuando alguien arrancaba con `docker compose up` sin pasar `--env-file`, esas interpolaciones daban string vacio y **sobreescribian** lo que el `env_file:` ya habia inyectado, dejando el container con `acervo_public_endpoint=""`. Las que tienen default (`ACERVO_USE_SSL: ${ACERVO_USE_SSL:-false}`, `SENTRY_TRACES_SAMPLE_RATE: ${SENTRY_TRACES_SAMPLE_RATE:-0.1}`) se preservan porque su default es seguro.
- `.env.staging` y `.env.development`: `ACERVO_PUBLIC_ENDPOINT` cambia de `localhost:9000` a `/acervo`. El helper `to_absolute` ya soporta path-only endpoints y genera URLs relativas (`/acervo/<bucket>/<path>`) que el navegador resuelve contra el origen actual via el gateway-hub. Esto permite que iconos de eventos como `iconoUrl=/acervo/mapalab/svg/eventos/mundial-2026-icon.svg` carguen correctamente desde `https://<host>/mapalab/mapa` sin Mixed Content ni violaciones de CSP.
- `.env.staging` y `.env.development`: `MAPALAB_BACKEND_URL` cambia a `http://host.docker.internal:3006/api`. En este setup `mapalab-backend-1` no expone su puerto al host pero `mapalab-nginx-1` proxypasa `/api/*` al backend en `:3006`. Asi `notify_tree_changed()` puede invalidar el cache del visor cuando se crean/editan capas desde mariachi-admin sin esperar el cron diario. En produccion la URL apunta a la red privada entre VMs (no afectado por este cambio).

#### Notas

- El bug de los iconos del evento (`http:///mapalab/...` con tres barras) se debia a que `ACERVO_PUBLIC_ENDPOINT` llegaba vacio al runtime; ya no aplica con esta config.
- El mensaje "mapalab refresh-cache fallo tras 3 intentos" en logs de mariachi-api debe desaparecer en dev/staging-on-localhost.

---

## [0.39.0] - 2026-05-06

### Eventos: edicion completa de capas con workspaces dinamicos

Cierra el flujo de capas en eventos: detectar workspaces nuevos en GeoServer, registrarlos sin pasar por la UI de GeoServer, asociar capas como leaves automaticamente y editar su contenido (Tarjeta, Metadatos, Simbologia) sin salir del editor del evento.

#### Backend (api)

- `GET /administrador/geoserver/workspaces/pending` (admin): lista workspaces existentes en GeoServer pero ausentes de `mapalab.workspaces`, con `layerCount`. Permite descubrir workspaces que llegan tras un restore o que se publican manualmente en GeoServer.
- `POST /administrador/geoserver/workspaces/register` (admin + CSRF): inserta una fila en `mapalab.workspaces` con `{geoserver_workspace, alias, db_schema, label}`. Valida que el workspace exista en GeoServer y que el alias no este tomado.
- `POST /administrador/layers/auto-leaf` (admin + CSRF): idempotente. Devuelve un leaf existente con `(workspace_alias, geoserver_layer)` o crea uno nuevo bajo el padre `eventos-auto` (tema con `hidden_in_menu=true`, creado on-demand). Permite que asociar una capa "solo GeoServer" al evento la materialice en el arbol sin pasos manuales.
- `app/services/layer_service.py::find_or_create_auto_leaf` y `_ensure_auto_parent` para la logica idempotente.
- `app/schemas/layer.py`: nuevos `WorkspaceCreate`, `WorkspacePending`, `AutoLeafRequest`.
- `app/services/geoserver_client.py`: `list_workspaces` y `list_layers` ahora toleran la respuesta de GeoServer cuando una coleccion esta vacia (`{"layers":""}` como string en vez de objeto). Antes lanzaba AttributeError.

#### Backend (api) — Bug fix global: schemas aceptan input camelCase

Los schemas de Pydantic declaraban `serialization_alias="camelCase"` (para output) pero **no `validation_alias=` ni `alias=`**, asi que el input camelCase del frontend se ignoraba silenciosamente. El editor de capas y otras paginas perdian campos en el PUT/PATCH sin error visible.

- Nuevo `app/schemas/_camel.py` con mixin `CamelCaseInput` que normaliza keys camelCase → snake_case con `model_validator(mode='before')`. Solo convierte si la key snake_case existe como field y la camelCase no es ya un field/alias declarado, asi no rompe aliases custom (`expectedUpdatedAt`).
- Aplicado a clases que reciben input: `LayerBase`, `LayerUpdate`, `EventoBase`, `EventoUpdate`, `BBox`, `CapaRef`, `PageBase`, `PageUpdate`, `MenuItemBase`, `MenuItemUpdate`, `UsuarioBase`, `UsuarioUpdate`, `PerfilUpdate`, `ReporteCreate`, `ReporteUpdate`, `LayerMetadataBase`, `LayerMetadataUpdate`, `LayerStatsUpdate`, `MediaBucketBase`, `MediaBucketUpdate`, `FolderCreate`, `MediaUpdate`, `ProjectBase`, `ProjectUpdate`, y los 14 payloads de `home_section.py`.

#### Admin (frontend)

- `components/PendingWorkspacesAlert.jsx` + `RegisterWorkspaceModal.jsx`: alert con conteo en `LayerCreateModal` para admins (`tetlamamakani`); abre form con `{geoserver_workspace, alias, db_schema, label}` y POST al endpoint de registro. Auto-fill del alias y schema desde el nombre del workspace.
- `components/LayerContentDrawer.jsx`: drawer reutilizable con tabs Tarjeta · Metadatos · Simbologia. Recibe `layerId`, carga la capa y monta los componentes existentes de edicion (`LayerMetadataSection`, `SldEditor`) sin tocar el `LayerEditPage`.
- `components/layersEditor/InfoboxStandalone.jsx`: wrapper local que reusa `InfoBoxBlocksEditor` + `InfoBoxPreview` con `Form` propio y boton Guardar; persiste con `PUT /layers/{id}` enviando `infoboxConfig`. Usado por el drawer.
- `features/mapalab-eventos/components/CapasField.jsx`:
  - `addCapa` llama `/layers/auto-leaf` cuando la capa es "solo GeoServer" antes de agregarla al evento.
  - Nuevo boton `EditOutlined` por capa que abre `LayerContentDrawer` con el `layerId` resuelto del arbol (el boton se deshabilita si la capa no esta en el arbol).
- `hooks/useLayerTreeAdmin.js`: exporta `flattenLeaves` como utilidad reutilizable; agrega `listPendingWorkspaces` y `registerWorkspace`.

#### Notas

- El cache `layer_tree_cache` de mapalab se invalida via `notify_tree_changed()` tras `auto-leaf`, asi las capas auto-creadas aparecen inmediatamente en el visor.
- Las capas auto se crean bajo un padre `tema` llamado `eventos-auto` con `hidden_in_menu=true`, asi no inflan el menu principal del visor pero siguen siendo editables desde el admin.

---

## [0.38.0] - 2026-05-06

### Backend (api) — Cleanup wizard SIEEJ (Fase 5 cierre)

Tras validar el cutover en el frontend (sieej 1.4.0), se completa la
limpieza removiendo modelos, schemas, services, rutas y tablas del
wizard original. Los catalogos (8 tablas `catalogo_*`) se mantienen
porque siguen siendo referenciados por la definicion JSON via
`field.catalog`. Los datos historicos viven en
`envio_formulario.datos` (JSONB) del formulario `sieej-levantamiento`.

#### Migration

- `c6d7e8f9ab01_drop_wizard_sieej_tables.py` (down_revision
  `b5c6d7e8f9aa`): drops `general`, `enlace`, `bases_datos`,
  `bd_ejes_estrategicos`. Aplicada en prod local; sin perdida porque
  el backfill ya migro los datos a envios.

#### Removido

- Modelos: `app/models/sieej/general.py`, `enlace.py`, `bases_datos.py`
  (con `BasesDatos` y `BDEjesEstrategicos`).
- Schemas: `app/schemas/sieej/general.py`, `enlace.py`, `bases_datos.py`.
- Services: `app/services/sieej/general_service.py`, `enlace_service.py`,
  `bases_datos_service.py`.
- Rutas: `app/api/routes/formularios/general.py`, `enlaces.py`,
  `bases_datos.py`. El subrouter `formularios` ahora solo incluye
  `catalogos` + `dinamicos`.
- Tests: `test_sieej_formularios.py` (cubria los endpoints viejos),
  `test_sieej_backfill.py` (los modelos referenciados ya no existen).
- Script: `scripts/backfill_sieej_levantamiento.py` (one-time, ya
  cumplio su funcion). Disponible en git history para auditoria.

#### Cambiado

- `app/api/routes/sieej_admin/stats.py`: refactor de las metricas para
  consumir `envio_formulario` y `envio_archivo` en vez de las tablas
  viejas. Nuevas claves: `formularios_activos`, `envios_total`,
  `envios_enviados`, `envios_en_proceso`, `envios_expirados`,
  `usuarios_con_envio`, `archivos_total`. Mantiene
  `dependencias_total`.
- `app/models/__init__.py` y `app/models/sieej/__init__.py`:
  removidos los imports/exports de los modelos eliminados.

#### Tests

300 passed (eran 315 antes de borrar 15 tests obsoletos del wizard).
Lint clean en `app/` y `tests/`.

### Bump

- `api/pyproject.toml` -> 0.38.0.
- `admin/package.json` -> 0.38.0.

---

## [0.37.0] - 2026-05-06

### Backend (api) — Plataforma de formularios SIEEJ — Fase 5 (seed + backfill)

#### Migration

- `b5c6d7e8f9aa_seed_sieej_levantamiento.py` (down_revision
  `a4b5c6d7e8f9`): inserta el formulario `sieej-levantamiento` con la
  definicion JSON completa que replica el wizard SIEEJ existente
  (4 steps: general form + enlaces repeater + bases_datos repeater
  con tabs + resumen summary). Estado=activo, version=1. Idempotente.
  Aplicado en prod local; verificacion ok.

#### Backfill

- `scripts/backfill_sieej_levantamiento.py`: para cada usuario con
  data en `sieej.general` / `sieej.enlace` / `sieej.bases_datos`,
  crea (si no existe) un `envio_formulario` apuntando al formulario
  seed con `datos` JSONB armados a partir de las 3 tablas viejas y
  `envio_archivo` para diccionarios. Modo `--dry-run` valida sin
  escribir. Idempotente (skip si ya existe el envio).
- Heuristica de estado: `enviado` si general + 1+ enlace + 1+ bd;
  en cualquier otro caso `en_proceso`. Eventos `iniciado` y
  `enviado` (cuando aplica) registrados en `envio_evento`.
- 7 tests cubren: seed valido contra validator, backfill completo,
  parcial (en_proceso), idempotencia, dry-run no-escribe, error
  cuando falta seed, datos generados pasan `datos_validator`.

### Admin (UI) — Plataforma de formularios SIEEJ — Fase 4 v2 (visual editor)

#### Nuevo

- `features/sieej-formularios/components/visualEditor/`:
  - `SortableItem.jsx`: wrapper con drag handle (@dnd-kit).
  - `StepsList.jsx`: lista sortable de steps con add/remove/reorder.
  - `FieldsList.jsx`: lista sortable de fields por step.
  - `StepDrawer.jsx`: editor de step (id, type, title, minItems,
    maxItems, itemLabel, tabs).
  - `FieldDrawer.jsx`: editor de field con todos los properties
    (label/type/required, options inline o catalog, validation
    pattern/min/max/length, showWhen, file bucket/accept/maxSizeMB,
    tab para repeaters con tabs).

#### Cambiado

- `DefinicionEditor.jsx`: toggle Segmented Visual/JSON. El visual
  edita la definicion in-memory y la sincroniza con el JSON al
  cambiar de view. El JSON sigue como escape hatch y como fuente
  cuando se quiere pegar/editar manualmente. El boton "Guardar"
  envia siempre el payload actual (sea visual o JSON).

### Bump

- `api/pyproject.toml` -> 0.37.0.
- `admin/package.json` -> 0.37.0.

---

## [0.36.0] - 2026-05-06

### Admin (UI) — Plataforma de formularios SIEEJ (Fase 4, constructor)

Aterriza el constructor visual de formularios en mariachi/admin. Consume
los endpoints admin de Fase 2 (mariachi 0.35.0). El editor de la
definicion JSON cubre el MVP; el editor visual con drag-n-drop queda
para una iteracion posterior.

#### Nuevo

- `features/sieej-formularios/services/formulariosAdminApi.js`:
  cliente axios para `/sieej/formularios`, `/sieej/grupos` y `/users`.
- `pages/FormulariosListPage.jsx` (reemplaza `FormulariosPage.jsx`):
  tabla con estado, version, acciones contextuales (publicar /
  cerrar / editar / eliminar). Modal "Nuevo" con slug + nombre +
  descripcion; al crear navega al editor.
- `pages/FormularioEditorPage.jsx` (`/sieej/formularios/:id`): tabs
  Definicion | Configuracion | Asignaciones | Envios.
- `pages/GruposPage.jsx` (`/sieej/grupos`): CRUD de grupos + drawer
  de miembros (multi-select de usuarios).
- `components/DefinicionEditor.jsx`: editor JSON crudo con
  validacion del backend (errores 422 se muestran inline).
- `components/ConfiguracionEditor.jsx`: nombre, descripcion,
  vigencia (RangePicker), publico (deshabilitado, v2).
- `components/AsignacionesEditor.jsx`: select multiple de grupos +
  usuarios. Reemplazo en bloque al guardar.
- `components/EnviosTable.jsx`: tabla paginada con filtro por
  estado, drawer con datos JSON + lista de archivos.

#### Cambiado

- `index.js` ahora exporta `FormulariosListPage`, `FormularioEditorPage`,
  `GruposPage`. El default sigue siendo la lista para compatibilidad.
- `main.jsx`: 3 rutas registradas (`sieej/formularios`,
  `sieej/formularios/:id`, `sieej/grupos`) gateadas con
  `RoleProtectedRoute(['tetlamamakani', 'editora'])`.

#### Pendiente

- Fase 5: migracion del wizard SIEEJ existente al modelo dinamico
  (seed `sieej-levantamiento`, backfill de `general` + `enlaces` +
  `bases_datos` a `envio_formulario.datos`, cleanup de tablas viejas
  y wizard frontend).
- Editor visual con drag-n-drop (Fase 4 v2): hoy se usa editor JSON.

### Bump

- `api/pyproject.toml` -> 0.36.0.
- `admin/package.json` -> 0.36.0.

---

## [0.35.0] - 2026-05-06

### Backend (api) — Plataforma de formularios dinamicos SIEEJ (Fase 2, admin)

Aterriza los endpoints admin del plan en
`sieej/docs/planes/plataforma-formularios.md` (seccion 5.2). Habilita
el constructor de formularios desde mariachi/admin (Fase 4).

#### Estructura

- `app/api/routes/sieej_admin.py` (single-file con `/stats`)
  convertido a paquete `app/api/routes/sieej_admin/` con subrouters:
  `stats` (existente, sin cambios), `formularios`, `grupos`. Todo
  bajo el prefix `/sieej`, gateado por `staff_dep` ya registrado a
  nivel de app (tetlamamakani + editora).
- `app/services/sieej/formularios_admin_service.py`: CRUD,
  publicar/cerrar, asignaciones (reemplazo en bloque), listar envios
  (paginado + filtro por estado), bump de version cuando se edita la
  definicion de un formulario que ya tiene envios. Delete
  inteligente: si tiene envios, lo cierra en vez de borrar.
- `app/services/sieej/grupos_service.py`: CRUD, miembros (reemplazo
  en bloque), validacion de borrado solo si no hay formularios
  asignados.

#### Endpoints (17 nuevos)

Formularios:
- `GET    /sieej/formularios` (filtros: estado, slug)
- `POST   /sieej/formularios` (estado=borrador, valida definicion)
- `GET    /sieej/formularios/:id`
- `PUT    /sieej/formularios/:id` (bumpea version si hay envios)
- `POST   /sieej/formularios/:id/publicar`
- `POST   /sieej/formularios/:id/cerrar`
- `DELETE /sieej/formularios/:id` (cierra si hay envios)
- `PUT    /sieej/formularios/:id/asignaciones` (grupos+usuarios)
- `GET    /sieej/formularios/:id/envios` (paginado: total+items)
- `GET    /sieej/formularios/:id/envios/:envio_id`

Grupos:
- `GET    /sieej/grupos`
- `POST   /sieej/grupos`
- `GET    /sieej/grupos/:id`
- `PUT    /sieej/grupos/:id`
- `DELETE /sieej/grupos/:id` (400 si tiene formularios asignados)
- `PUT    /sieej/grupos/:id/usuarios` (reemplaza miembros)
- `GET    /sieej/grupos/:id/usuarios`

#### Tests

19 tests nuevos en `tests/test_sieej_admin_formularios.py` (13) y
`tests/test_sieej_admin_grupos.py` (6). Cubren: CRUD, validacion de
definicion, publicar/cerrar, asignaciones reemplazo, bump de version
con/sin cambio de definicion, delete inteligente con/sin envios,
listar envios paginado, manejo de duplicados (409) y FKs invalidas
(400). Suite total mariachi: 308 passed, 0 failed.

#### Pendiente

- Fase 3: refactor del frontend SIEEJ (renderer generico de formularios).
- Fase 4: UI del constructor visual en mariachi/admin
  (DefinicionEditor, FieldEditor, AsignacionesEditor, EnviosTable).
- Fase 5: migracion del wizard SIEEJ existente al modelo dinamico.

### Admin (UI) — alineacion de namespace

- `features/sieej-formularios/pages/FormulariosPage.jsx`: las 5
  llamadas se cambian de `/admin/sieej/formularios` (namespace que
  el plan original proponia y nadie usa) a `/sieej/formularios`
  (namespace real, alineado con el `sieej_admin.router` existente).
  Esto reemplaza el commit anterior `0.33.4` que hizo el ajuste a
  `/admin/sieej`. Ahora la pagina sí responde porque el backend
  expone los endpoints.

### Bump

- `api/pyproject.toml` -> 0.35.0.
- `admin/package.json` -> 0.35.0.

---

## [0.34.0] - 2026-05-06

### Backend (api) — Plataforma de formularios dinamicos SIEEJ (Fase 1, respondent)

Aterriza el backend respondent del plan documentado en
`sieej/docs/planes/plataforma-formularios.md`. Coexiste con el wizard
SIEEJ existente; ese wizard se desmantela en la Fase 5 del plan.

#### Migration

- `a4b5c6d7e8f9_add_sieej_formularios_dinamicos.py` (down_revision
  `d3e4f5a6b7c8`). Crea 8 tablas en el schema `sieej`:
  `formulario`, `grupo`, `usuario_grupo`, `formulario_grupo`,
  `formulario_usuario`, `envio_formulario`, `envio_archivo`,
  `envio_evento`. Crea 3 enums Postgres: `sieej_formulario_estado`,
  `sieej_envio_estado`, `sieej_evento_tipo`. Indices en slug, estado,
  envio+field_path, envio+ocurrido_en. Unique en
  `(formulario_id, usuario_id)` para garantizar 1 envio por usuario.

#### Modelos / Schemas / Services

- `app/models/sieej/formulario.py`, `grupo.py`, `envio.py`.
- `app/schemas/sieej/formulario.py`, `grupo.py`, `envio.py` con
  `*Create/*Update/*Response` y `ConfigDict(from_attributes=True)`.
- `app/services/sieej/definicion_validator.py`: valida la estructura
  JSONB de la definicion al crear/editar el formulario y aplana las
  reglas a un array plano para el endpoint `/schema`. Aplica el cap
  absoluto de 100 MB por archivo (alineado al
  `client_max_body_size` del gateway-hub).
- `app/services/sieej/datos_validator.py`: valida `envio.datos`
  contra `definicion_snapshot`. Soporta `showWhen`, repeaters con
  `min/maxItems`, validaciones por tipo (text/email/tel/number/date/
  select/select_multiple/radio/checkbox/file). En modo `estricto=False`
  permite borradores parciales.
- `app/services/sieej/formularios_dinamicos_service.py`: query de
  visibilidad combinando asignacion individual + via grupo + bypass
  para `tetlamamakani`.
- `app/services/sieej/envios_service.py`: get-or-init del envio
  (snapshot idempotente al iniciar), guardar parcial, marcar como
  enviado, upload a Acervo asociado a `envio_archivo`, registro de
  `envio_evento` (auditoria append-only).

#### Endpoints respondent

Todos bajo el subrouter existente `/formularios` (gateado por
`require_project_access('sieej')`):

- `GET /formularios` — lista de formularios visibles con
  `estado_envio` precalculado.
- `GET /formularios/{slug}` — definicion + estado del envio.
- `GET /formularios/{slug}/schema` — definicion + reglas de
  validacion planas (consumido por el frontend).
- `GET /formularios/{slug}/envio` — datos del envio del usuario
  actual (lo crea implicitamente si no existe).
- `PUT /formularios/{slug}/envio` — guarda parcial o envia con
  `enviar=true`. Valida segun el modo.
- `POST /formularios/{slug}/envio/upload` — multipart con `field_path`
  + `file`. Sube a Acervo y registra `envio_archivo`.

El subrouter `dinamicos.router` se incluye **despues** de los
existentes (`catalogos`, `general`, `enlaces`, `bases_datos`) para
que las rutas literales del wizard tengan precedencia y no haya
ambiguedad.

#### Tests

47 tests nuevos (tests/test_sieej_definicion_validator.py — 17 tests,
tests/test_sieej_datos_validator.py — 14 tests,
tests/test_sieej_formularios_dinamicos.py — 16 tests). Suite total
del backend: 289 passed, 0 failed, 0 SAWarnings.

#### Pendiente

- Fase 2: endpoints admin (`/sieej/formularios`, `/sieej/grupos`,
  asignaciones, listado de envios).
- Fase 3: refactor del frontend SIEEJ.
- Fase 4: constructor visual en mariachi/admin (hoy solo hay un
  esqueleto en `features/sieej-formularios/`).
- Fase 5: migracion del wizard SIEEJ actual al modelo dinamico
  + cleanup de las 4 tablas viejas y el wizard frontend.

### Bump

- `api/pyproject.toml` -> 0.34.0.
- `admin/package.json` -> 0.34.0.

---

## [0.33.4] - 2026-05-06

### Admin (UI) — fix namespace de SIEEJ formularios

- `features/sieej-formularios/pages/FormulariosPage.jsx`: las 5 llamadas a la API se cambian de `/formularios` a `/admin/sieej/formularios` para alinearse con el plan de plataforma de formularios (ver `IIEG/sieej/docs/planes/plataforma-formularios.md` seccion 5.2). El path anterior chocaba con el subrouter respondent existente; cuando arranque la Fase 1 del plan eso habria devuelto datos del wizard SIEEJ en lugar del CRUD admin. El backend no expone aun el namespace `/admin/sieej/formularios` — el cambio adelanta el alineamiento, no cambia comportamiento (la pagina sigue mostrando el Alert "modulo en construccion").
- Alert de la pagina actualizado para citar el path nuevo.

---

## [0.33.3] - 2026-05-06

### Admin (UI) — fix react fast refresh y hooks dependencies

- Extraída la configuración y constantes de `mapalab-home/components/sectionEditors.jsx` hacia `sectionRegistry.js` para evitar warnings de react-fast-refresh.
- Corrección de dependencia faltante en `useEffect` de `sectionEditors.jsx`.
- Corrección de instanciación en `LayerIdsField.jsx` para evitar recreación de dependencias envolviéndolo en `useMemo`.

---

## [0.33.2] - 2026-05-06

### Backend (api) — fix pruebas de multimedia (route ordering y mock state)

- Se corrigió el ordenamiento de las rutas en `routes/media.py`, posicionando la ruta genérica de `eliminar_archivo` al final para evitar interceptar la eliminación de carpetas.
- Se ajustó el singleton de `FakeAcervoClient` en las pruebas unitarias de multimedia para que conserve el estado del bucket en caché, resolviendo errores de testing.

---

## [0.33.1] - 2026-05-06

### Calidad de código (Lints y Dead Code)

- Eliminación de código muerto en `mapalab-layers/constants/nodeTypes.js` detectado por `knip`.
- Reordenamiento de imports en `test_reportes_public.py` para satisfacer la regla `I001` de `Ruff`.

---

## [0.33.0] - 2026-05-06

### Multimedia: hardening de endpoints y scoping de carpetas

Limpieza del módulo de media tras la revisión de `context.md`:

**Backend (`api/`):**

- `app/api/routes/media.py` — agrega `PUT /multimedia/{id}` (actualiza `metadata.alt`, `metadata.description`, `folder`) y `DELETE /multimedia/carpetas/{id}` (valida que la carpeta esté vacía, devuelve 409 si tiene archivos). El handler `DELETE /multimedia/{id}` ahora soporta IDs sintéticos `dir:{bucket_id}:{name}` para borrar prefixes recursivos del bucket (solo `tetlamamakani`); también borra los registros locales en `media` que matcheen el prefix.
- `app/services/media_service.py::ensure_folder_exists` — devuelve `"/"` cuando la carpeta de destino es la raíz (antes devolvía `None` y violaba `media.folder NOT NULL`, rompiendo cada upload a raíz). El listado de buckets ahora consulta `app/core/bucket_policies.py::HIDDEN_PREFIXES_BY_BUCKET` en lugar de tener `('reportes/',)` hardcoded para `mariachi`.
- `app/services/acervo.py` — `upload_file` ahora hace streaming desde `UploadFile.file` (antes cargaba el archivo entero a memoria). `_ensure_bucket_exists` loggea el `S3Error` en vez de silenciarlo. Nuevo `AcervoClient.invalidate_cache(bucket_name=None)` para rotación de credenciales. Nuevo `delete_prefix(prefix)` usado por el borrado de directorios.
- `app/models/media.py` — `MediaFolder` agrega `bucket_id` (FK CASCADE a `media_buckets`, NOT NULL) y unicidad `(bucket_id, path)`. Se quita el FK `media.folder → media_folders.path` (la columna sigue siendo string libre, ya no referencia FK).
- `alembic/versions/mariachi/d3e4f5a6b7c8_scope_media_folders_to_bucket.py` — backfilea `bucket_id` en folders existentes mirando los `media` que apuntan a esa ruta; cae al primer bucket activo si no hay archivos previos.
- `tests/test_multimedia.py` — cobertura del nuevo flujo (mock `AcervoClient`): listar/crear/eliminar carpetas, upload a raíz y subcarpeta, update de metadata, delete por id int, delete recursivo `dir:`, filtro `reportes/` en `mariachi`, 401 en proxy sin auth.

**Admin (`admin/`):**

- `features/media/components/FilePicker.jsx` y `MediaSelector.jsx` — eliminados (legacy, no usados, rotos por `Tabs.TabPane` deprecado en AntD v6 y por no pasar `bucketId`). Quedan solo `BucketFilePicker` y `BucketFileUploader`.
- `features/media/api/mediaService.js` — `getMediaFile` (apuntaba a un endpoint inexistente) eliminado. `getFolders(bucketId)`, `createFolder(bucketId, name, parent)` y `deleteFolder(id)` ahora pasan `bucket_id`.
- `features/media/pages/MediaPage.jsx` — un solo `useEffect` por responsabilidad (carga inicial de buckets, carga de folders+stats al cambiar de bucket, carga de archivos visibles); columna "Tipo" muestra `CARPETA` en filas `isDir` (antes mostraba un Tag vacío); las carpetas también pueden eliminarse desde grid y lista.

**Documentación (`docs/`):**

- `context.md` — corregida la fila `/media/*` (era inexacta) por las rutas reales `/multimedia/*`, `/multimedia/proxy/...`, `/multimedia/carpetas/*`, `/media-buckets/*`. Nueva sección "Sub-rutas reservadas dentro de buckets compartidos" describiendo `HIDDEN_PREFIXES_BY_BUCKET`. Nueva sección "Carpetas del CMS" explicando que ahora son scoped por bucket.

---

## [0.32.0] - 2026-05-04

### Reportes ciudadanos (transversal)

Sistema único de reportes y sugerencias para todos los proyectos del ecosistema (MapaLab, SIEEJ, Portal). Una sola tabla, una sola feature de admin, distinguible por `source_app`.

**Backend (`api/`):**

- `app/models/reporte.py` — modelo `Reporte` con `tipo` (problema|solicitud|sugerencia|duda|datos_incorrectos|bug), `mensaje`, `email_contacto` opcional, `source_app`/`source_route`/`source_context`, `screenshot_bucket_id`+`screenshot_object_path`, `estado` (nuevo|en_revision|resuelto|descartado), `nota_interna`, `atendido_por_id`. Migración `c4d5e6f7a8b9_add_reportes.py`.
- `app/api/routes/reportes_public.py` — `POST /api/public/reportes` público con honeypot (`website` field) y rate limit por IP (5 req / 10 min). Acepta `multipart/form-data` con screenshot opcional (PNG/JPEG ≤2MB). Sube al bucket privado `mariachi` en `reportes/AAAA/MM/<uuid>.<ext>`.
- `app/api/routes/reportes.py` — endpoints admin: `GET` paginado con filtros (`source_app`, `tipo`, `estado`, `q`), `GET /{id}`, `PATCH /{id}` (estado, nota, asignación), `DELETE /{id}` (borra screenshot del bucket también), `GET /stats/contadores` (resumen por proyecto y estado).
- `app/services/discord_notifier.py` — webhook por `source_app` (env `DISCORD_WEBHOOK_MAPALAB`, `_SIEEJ`, `_PORTAL`). Embed con tipo, ruta, mensaje truncado y email opcional. Falla silenciosamente si no hay webhook configurado.
- `app/api/rate_limit.py` — agrega `rate_limit_ip(max_requests, window_seconds, scope)` con resolución de IP via `X-Forwarded-For` / `X-Real-IP`.
- `app/core/settings.py` — agrega `public_prefix = "/api/public"` y los 3 webhooks Discord como settings opcionales.
- `app/services/media_service.py` — al listar el bucket `mariachi` desde la galería, oculta el prefix `reportes/` para no contaminar Media.

**Admin (`admin/`):**

- `features/reportes/` — nueva sección "Reportes" en el sider (icono `BugOutlined`, ítem en `PLATFORM_ITEMS`) con badge de pendientes (estado=nuevo) sumados de todos los proyectos. Lista AntD con tabs por `source_app` (MapaLab | SIEEJ | Portal), filtros (tipo, estado, búsqueda full-text), drawer detalle con screenshot embebido, cambio de estado, nota interna y abrir `source_route` en pestaña.
- `app/sider-config.jsx` — soporta nuevo flag `showReporteBadge` y extra `reportesPendingCount`.
- `app/MainLayout.jsx` — consume `GET /reportes/stats/contadores` para alimentar el badge.

**Cómo se conecta a MapaLab**: el frontend de mapalab postea a `/api/public/reportes` desde 3 puntos de entrada (mapa, InfoBox, Home). El bucket `mariachi` (`is_public=false`) ya existe; no se crea infra nueva.

### Editor de eventos: bbox visual, etiquetas, auto-activación de capas

Iteración del editor de eventos para que los editores no necesiten escribir coordenadas EPSG:4326 a mano y para que el evento controle qué capas se encienden cuando el usuario lo abre en el visor.

**Backend (`api/`):**

- `app/schemas/evento.py` — `CapaRef` extendido:
  - Campo `tipo: Literal['capa', 'etiqueta']` (default `capa`). Las "etiquetas" son separadores visuales con título dentro del menú del evento; reúsan `LabelItem` que mapalab ya renderiza para `nodeType='label'`.
  - `workspace`/`layer` ahora opcionales (las etiquetas no los usan; las capas siguen requiriéndolos vía validador).
  - `auto_activar: bool = True` con `serialization_alias='autoActivar'`. Define si la capa se enciende sola al abrir el evento o si requiere click manual del usuario en el panel.
  - Compatibilidad: capas existentes en BD sin `tipo`/`auto_activar` se cargan con defaults seguros (`'capa'` / `True`).
- `app/api/routes/geoserver.py` — `GET /geoserver/workspaces?available_only=true` filtra capas ya registradas en `mapalab.layers`. Permite distinguir "capas nuevas para agregar" vs "todas las del cluster".

**Admin (`admin/`):**

- `features/mapalab-eventos/components/BBoxField.jsx` — refactor completo. 3 modos seleccionables con `Radio.Group`:
  - **Sin zoom** (`bbox=null`) — el visor abre el evento sin centrar.
  - **Coordenadas manuales** — los 4 inputs con switch de CRS **EPSG:4326** (lon/lat decimal) ↔ **EPSG:6368** (UTM 14N en metros). La reproyección se hace en el frontend con `proj4`; el backend siempre persiste en EPSG:4326.
  - **Dibujar en mapa** — mini-mapa con OpenLayers (base CARTO Light, ya permitido por CSP del gateway-hub) con interacción `Draw` tipo `Box` para definir el bbox arrastrando. Botones "Centrar al bbox" y "Limpiar". Si abres un evento con bbox existente, lo pinta como rectángulo.
  - Nuevas dependencias: `ol@^10.9` y `proj4@^2.20` (definición `EPSG:6368` registrada en `proj4.defs`).
- `features/mapalab-eventos/components/CapasField.jsx`:
  - Botón **"+ Agregar etiqueta"** junto a "+ Agregar capa". Las etiquetas se renderizan con tag púrpura distintivo, input de texto grande y sin switch auto-activar (no aplica).
  - Columna **Auto-activar** (Switch "Auto"/"Manual") por capa, con tooltip que explica el comportamiento.
  - Botones de mover ↑↓ ahora con iconos visibles (`ArrowUpOutlined`/`ArrowDownOutlined`) — antes eran botones vacíos por bug.
  - Modal "Agregar capa al evento" ahora consume `/geoserver/workspaces` y permite agregar **cualquier capa de GeoServer** (no solo las registradas en `mapalab.layers`). Tag distintivo en árbol vs solo GeoServer + toggle "Solo no registradas".
  - Layout del modal con `tableLayout: 'fixed'` y ellipsis con tooltip para nombres largos.
  - Normalización de capas en `eventoToForm` (`autoActivar` camelCase ← snake_case `auto_activar`) para que el Switch refleje el estado real al recargar.
- `features/mapalab-eventos/pages/EventoEditPage.jsx` — refactor de `Row/Col` con Cards apilados a `Tabs` verticales (homologado con `HomePage`):
  - Tabs: Información, Capas, Visibilidad, Apariencia, Geografía con sus iconos.
  - `tabPosition={isMobile ? 'top' : 'left'}` y `forceRender: true` por item para que los `Form.Item` se registren al primer render (sin esto, `getFieldsValue` devolvía `undefined` para campos en tabs lazy y sobrescribía con vacío al guardar — causa de la pérdida de capas reportada antes del fix).
  - Vista de error `<Result>` cuando falla la carga del evento, con botón "Reintentar" y guarda de "no es seguro guardar" para evitar sobrescribir el registro con valores en blanco.

### Editor de capas: selector GeoServer + drag handle visible

- `features/mapalab-layers/components/LayersTreeSider.jsx` — `draggable={{ icon: <HolderOutlined /> }}` en el `Tree`. Antes el icono de mover (`.ant-tree-draggable-icon`) se ocultaba por CSS; ahora siempre visible con opacity 0.45 (al 100% en hover).
- `features/mapalab-layers/components/LayerCreateModal.jsx` — los inputs de texto plano `workspace_alias`/`geoserver_layer` se reemplazan por un `Select` agrupado por workspace (consume `/geoserver/workspaces`) con búsqueda. Switch "Solo no registradas" (default ON) muestra solo capas que aún no están en `mapalab.layers`.
- `features/mapalab-layers/pages/LayerEditPage.jsx`:
  - Aplica el mismo patrón de tabs homologado (`tabPosition={isMobile ? 'top' : 'left'}`, `forceRender: true` en los 5 items).
  - Vista de error `<Result>` al fallar la carga (mismo patrón que eventos), con botones "Reintentar" / "Volver al árbol" y deshabilita los botones de guardar mientras el error persiste.

### Galería de archivos (BucketFilePicker)

- `features/media/components/BucketFilePicker.jsx` — el modal cambia su default de `mode='list'` a `mode='grid'` (alineado con `MediaPage`). Agrega un `Segmented` toggle para alternar grid ↔ lista; la preferencia se persiste en `localStorage.mariachi.bucketFilePicker.viewMode`. Si el consumidor pasa `mode` explícito, el toggle no aparece y se respeta. Beneficia a `EventoIconPicker`, `ImageUrlField`, `TemaIconField`, `LayerMetadataSection` y `PerfilPage` sin cambios en su código.

### Visor mapalab (cambios en repo `mapalab`)

Los cambios anteriores se complementan con un cambio en el frontend del visor (`mapalab/frontend/src/pages/maps/components/EventoMenu.jsx`):

- Renderiza `LabelItem` cuando `capa.tipo === 'etiqueta'` y `LayerItem` para capas — el orden definido en el editor se respeta.
- Auto-activa capas con `autoActivar=true` al montarse el menú del evento (al abrirlo). Detalle de implementación: `handleToggleLayer(layerId, isActive)` en mapalab no es un toggle (espera bool explícito); pasar `undefined` cae al rama de "desactivar" en modo normal y no hace nada — ahora se llama con `onToggleLayer(id, true)`.
- Botón "Eliminar (N)" en el header del panel del evento que apaga las capas activas que NO pertenecen al evento (limpieza explícita; no hay efecto al abrir el menú, evita miss-click).

---

## [0.31.0] - 2026-04-30

Feature grande: **editor visual de simbología SLD** integrado al panel admin para que el equipo no técnico pueda editar estilos de capas en GeoServer sin tocar la consola web. Incluye flujo de borradores con aprobación por `tetlamamakani`.

### Editor de simbología (SLD)

Se reescribe el flujo de "qué se ve en el visor" para no requerir intervención del equipo de geografía en cambios cosméticos.

**Backend (`api/`):**

- `app/services/sld_generator.py` — porta la lógica YAML→SLD del repo `estilos-coropleticos-mapalab` (módulo `sld_dump_geom.py`). Mantiene round-trip byte-equal con los 59 SLDs ya generados por el pipeline.
- `app/services/sld_parser.py` — parser inverso XML→modelo Pydantic. Soporta dos shapes:
  - **`choropleth`**: rules con `<ogc:Filter>` de rangos numéricos + null rule con hatch (formato del pipeline).
  - **`boundary`**: rules sin Filter (estilo único + label de TextSymbolizer con halo, placement, vendor options, scale denominators). Cubre límites/regiones/municipios.
- `app/services/geoserver_client.py` — agregados `get_sld`, `put_sld` (con verificación SHA256 round-trip), `style_exists`, `create_style_entry`, `find_layers_using_style`, `is_layer_group`, `get_legend_graphic`. `list_styles` ahora resiliente a 5xx de GeoServer (devuelve `[]`, típico cuando la "capa" es un layer group).
- `app/services/palette_service.py` — parser del `paletas_simbologia.csv` (144 paletas oficiales con `oklab` + `tipo` + `severidad`) cacheado con `@lru_cache`.
- `app/services/borrador_service.py` — handler `_apply_sld` registrado en `APPLIERS['sld']`. Lee `data.shape` del borrador, rutea a `build_sld_xml` o `build_boundary_sld_xml`, hace `put_sld` con verificación, dispara `notify_tree_changed()`. Resuelve `alias` → `geoserver_workspace` via `dataengine_db`.
- `app/api/routes/geoserver.py` — endpoints nuevos:
  - `GET /api/administrador/geoserver/styles/{alias}/{style_name}` — devuelve `{rawXml, editable, shape, model, sharedBy, reason}`.
  - `GET /api/administrador/geoserver/legend/{alias}/{layer}/{style_name}` — proxy a `GetLegendGraphic` (independiente del gateway-hub, funciona en cualquier deploy).
  - `GET /api/administrador/geoserver/palettes` — lista las 144 paletas oficiales.
  - `GET /api/administrador/geoserver/workspaces/{alias}/layers/{layer}/styles` — extendido con `isLayerGroup: bool` para detectar layer groups.

**Frontend (`admin/`):**

- `features/mapalab-layers/components/sldEditor/` — editor visual completo:
  - `SldEditor.jsx` — shell que selecciona estilo y rutea a `<ChoroplethEditor>` o `<BoundaryEditor>` según `data.shape`. Muestra Alert claro si la capa es un Layer Group de GeoServer.
  - `ChoroplethEditor.jsx` — tabs Cortes / Paleta / Borde / Valor nulo / Metadatos.
  - `BoundaryEditor.jsx` + `BoundaryLabelTab.jsx` — tabs Polígono / Etiqueta / Metadatos. Editor completo de Stroke, Fill, TextSymbolizer (font, halo, placement, vendor options, geometry function, scale denominators).
  - `RangesEditor.jsx` — tabla editable de cortes/labels con validación de contigüidad.
  - `PalettePicker.jsx` — buscador con filtros por tipo/severidad y agrupación visual; `aplicar`/`invertir` por paleta.
  - `StrokeEditor.jsx`, `NullStyleEditor.jsx` — sub-editores de borde y null rule.
  - `LegendPreview.jsx` — `<img>` apuntando al endpoint proxy del backend con botón refresh.
  - `DiffPanel.jsx` — diff visual del modelo editado vs el SLD actual de GeoServer.
  - `RawXmlFallback.jsx` — fallback para SLDs no editables. Detecta automáticamente si es Layer Group (>1 NamedLayer), Raster, Point, Line, Categorical, o desconocido. Mensajería positiva ("aún no soportado" en lugar de error). Incluye `<LegendPreview>` arriba del XML.
- `features/mapalab-layers/hooks/useSldEditor.js` — hook que orquesta fetch SLD + draft + save + request review.
- `features/mapalab-layers/pages/LayerEditPage.jsx` — nuevo tab "Simbología" (visible solo en `group`/`leaf`).
- `shared/components/StatusBadge.jsx` — componente reutilizable para badges de estado (`beta`/`test`/`dev`/`info`/`new`). Soporta posición absoluta (`top-right`/`top-left`/`bottom-right`/`bottom-left`) con offset configurable. Replica visualmente el `Badge variant="pill"` de mapalab/frontend pero en AntD inline-style (sin Tailwind).

### Modelo conceptual: Propiedades

Refleja la realidad de los hijos de un nodo `group` en mariachi. Sin cambio de schema (display-only).

- `constants/nodeTypes.js` — helpers `isPropertyOfGroup(nodeType, parentNodeType)` y `labelForNode(nodeType, parentNodeType)`. Cuando un `leaf` tiene `parent.nodeType === 'group'`, se trata visualmente como **Propiedad** (cyan tag en árbol, header de página y orden inicial).
- `LayerEditPage.jsx` — al editar una propiedad: tag "Propiedad" en el header, Select de `nodeType` deshabilitado, Alert info que explica el modelo (comparten feature type/simbología/metadata con el grupo padre, solo se distinguen por CQL filter), tabs `simbologia` y `metadatos` ocultos (se editan en el grupo padre).
- `LayerCreateModal.jsx` — al crear un nodo bajo un padre `group`: Alert success "Se creará como Propiedad del grupo" explicando el comportamiento (se enciende cuando se enciende el grupo en el visor).
- `LayersTreeSider.jsx`, `InitialLayerOrderPage.jsx` — tags visuales "Propiedad" cyan en lugar de "Capa" verde cuando aplica.
- `useLayerTreeAdmin.js` — `toAntTreeData` ahora anota `parentNodeType` en cada nodo del árbol; helper `findNodeContext` para lookup desde otros componentes.

### Workflow de revisión

- Reusa la tabla `borradores` con `resource_type='sld'`, `resource_id='{alias}:{style_name}'`. Sin schema nuevo.
- Botón "Solicitar revisión" del editor → `tetlamamakani` aprueba en `RevisionQueue` → backend genera SLD → `put_sld` con SHA256 verify → `notify_tree_changed()` invalida cache de mapalab.

### UX general

- **Alerts cerrables (closable)**: sweep automatizado agregó `closable` a 45 alerts en 23 archivos del admin. Toda la interfaz ahora deja al usuario descartar avisos con la X.
- **`StatusBadge` con posición absoluta**: aplicado al tab "Simbología" y a los radios/botones "Operación simple"/"Fórmula"/"Slot operación"/"Slot fórmula" de Numeralia. Sin afectar el ancho de los componentes contenedores.
- Endpoint proxy `/geoserver/legend` — funciona en prod-local sin gateway-hub (antes la URL `/geoserver/{ws}/wms` solo resolvía detrás del gateway).

### Tests

- `tests/services/test_sld_parser.py` — round-trip de los 59 SLDs coropleticos (byte-equal) + 1 boundary fixture (semantic equivalence).
- `tests/services/test_borrador_sld.py` — handler `_apply_sld` con mocks de `GeoServerClient` y resolución de Workspace alias.
- 129 tests pasan en `tests/services/`.

### Limitaciones conocidas

- El editor visual **solo soporta** `choropleth` (rangos numéricos) y `boundary` (estilo único + label). Otros shapes — `RasterSymbolizer`, `PointSymbolizer`, `LineSymbolizer`, filtros categóricos, layer groups — caen al fallback con mensaje claro y leyenda renderizada por GeoServer; el XML queda en textarea read-only.
- Numeralia/metadata se almacenan por feature type (`workspace:geoserver_layer`), no por nodo. Implica que las propiedades de un grupo **comparten** numeralia/metadata con el grupo. La UI esconde el tab Metadatos en propiedades para evitar confusión. Soporte de numeralia distinta por propiedad requiere cambio de schema (ver `docs/SLD_EDITOR.md`).

### Documentación

- `docs/SLD_EDITOR.md` — referencia completa por componente (backend + frontend).

---

## [0.30.51] - 2026-04-29

### CI — embed Discord mas compacto y consistente

- **Titulo sin "— mariachi"**: el bot de Discord se llama mariachi, era redundante. Ahora `CI exitoso` y `CI fallido`.
- **Version con badge emoji**: 🟢 para success, 🔴 para failure (acompaña el color del embed para que sea reconocible incluso si el cliente colapsa colores).
- **Version y Workflow en la misma fila**: ambos `inline: true` adyacentes (sin field no-inline entre ellos), Discord los pone uno al lado del otro como dos columnas. Antes Cambios rompia la fila.
- **Texto del link**: "Ver run"/"Ver logs" → "Ver ejecución" (mas natural en español).

### Resultado visual del embed

```
CI exitoso
─────────────────────────────────────
Commit       Autor      Branch
[abc1234]    edgar      `production`

Version              Workflow
🟢 0.30.50 → 0.30.51 [Ver ejecución]

Cambios
ci: agregar emoji a version transition
```

---

## [0.30.50] - 2026-04-29

### CI — `notify-ci-failure.yml` -> `notify-ci.yml` (notifica success Y failure)

Renombrado el workflow para que tambien notifique runs exitosos en `production`. Patron tomado de `mapalab/cd.yml`: un solo job con dos steps condicionados por `conclusion`, embed verde (3066993) para success y rojo (15158332) para failure.

### Cambios

- **Renombrado**: `notify-ci-failure.yml` -> `notify-ci.yml`. Title: `Notify CI`.
- **Job `if`** acepta success o failure (no solo failure).
- **Step `Compute commit metadata`** unificado (commit short, msg escapado, version transition) que ambos steps de notificacion reusan via outputs.
- **Step `Notify Discord - Success`**: embed verde, titulo `CI exitoso — mariachi`.
- **Step `Notify Discord - Failure`**: embed rojo, titulo `CI fallido — mariachi`.
- **`branches: [production]`** sigue filtrando a nivel evento — no spam de runs en develop.

### Resultado

```
push develop      -> CI develop      -> (nada, no dispara workflow_run)
push production   -> CI ✓ production -> Discord verde "CI exitoso"
push production   -> CI ✗ production -> Discord rojo "CI fallido"
```

---

## [0.30.49] - 2026-04-29

### CI — `notify-ci-failure` filtra branch a nivel evento (`branches: [production]`)

`workflow_run` antes filtraba `head_branch == 'production'` en el `if:` del job. Eso significaba que GitHub CREABA el workflow run en cada push a cualquier branch (develop, feature, etc.), pero el job se salta y el run aparece como `skipped` (⊘) en la lista. Ruido visual constante.

Fix: usar `branches: [production]` en el evento `workflow_run`. GitHub solo dispara el workflow cuando el CI corre en production. Push a develop -> ningun run de notify-ci-failure (no aparece nada). Push a production con CI fallido -> dispara, ejecuta el job, manda Discord.

### Cambios en `notify-ci-failure.yml`

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [production]   # ← nuevo, evita los runs skipped en otros branches
```

Y la condicion del job solo filtra `conclusion == 'failure' && event == 'push'` (sin `head_branch == 'production'` porque ya esta filtrado por evento).

---

## [0.30.48] - 2026-04-29

### CI — `auto-merge.yml` apuntado a `production` (no `main`) + sin job `web`

`auto-merge.yml` heredaba la convencion vieja: target `main` (rama que ya no existe) y referencia a un frontend `web/` (que no esta en el repo, solo en filesystem local). Ahora:

- `--base main` -> `--base production`
- `--head develop` (sin cambios)
- Job `web` removido (solo `backend` y `admin`)
- Titulo/body actualizado: `auto-merge develop into production`

Patron tomado de `mapalab/.github/workflows/auto-merge.yml`. Disparador: push a `develop`. Si tests pasan, abre/actualiza PR contra `production` y habilita `--auto --merge` (la PR se mergea sola en cuanto las required checks pasen y haya el numero requerido de approvals).

---

## [0.30.47] - 2026-04-29

### CI — embed de Discord ahora muestra transicion de version

`notify-ci-failure.yml` ahora hace `actions/checkout@v6` con `fetch-depth: 2` (commit del fail + su padre), lee `api/pyproject.toml` en HEAD y `HEAD~1`, y construye un campo `Version` con el formato `0.30.46 → 0.30.47`. Si `pyproject.toml` no cambio en el commit, muestra `0.30.47 (sin bump)`.

### Como se ve en Discord

```
CI fallido — mariachi
Commit: abc1234       Autor: edgar       Branch: production
Version: 0.30.46 → 0.30.47
Cambios: ci: agregar version transition al embed
Workflow: Ver logs
```

---

## [0.30.46] - 2026-04-29

### CI — notificacion Discord solo para fallos en `production`

`workflow_run` carga el archivo `notify-ci-failure.yml` desde la default branch del repo (hoy `develop`), pero la condicion ahora filtra por `head_branch == 'production'` asi solo notifica al canal de Discord (`deploy`) cuando un CI fallido viene de `push` a `production`. Los fallos en `develop` o feature branches NO mandan nada — esos canales son ruidosos y no se deployan.

### Cambios

- **`notify-ci-failure.yml`** condicion actualizada:
  ```yaml
  if: |
    github.event.workflow_run.conclusion == 'failure' &&
    github.event.workflow_run.event == 'push' &&
    github.event.workflow_run.head_branch == 'production'
  ```

### Setup en el repo

- Default branch: `develop` (intacto).
- `main` ya estaba removida del remote; tambien purgada del local (`git branch -D main` + `git remote prune origin`).
- Para que `workflow_run` se dispare, el archivo `notify-ci-failure.yml` debe estar **en `develop`** (la default branch). Tras pushear a production, hay que mergear/cherry-pickear ese archivo a `develop`. Sino el workflow no se carga aunque exista en production.

---

## [0.30.45] - 2026-04-29

### CI — separar notificacion Discord en workflow propio (`workflow_run`)

Despues de varios intentos, decidimos sacar la notificacion del CI principal y ponerla en un workflow separado disparado por `workflow_run`. Razones:

- `if: failure()` -> el job aparecia como `skipped` en runs exitosos.
- `if: always() + condicion`-> el job aparecia como `skipped` adentro o consumia ~1s del runner para nada.
- Cualquier opcion dentro del CI principal mete ruido visual o cuesta tiempo en cada push.

Patron `workflow_run` resuelve esto:

- En runs exitosos del CI: solo aparecen `backend` y `admin`. Cero jobs extra.
- En runs fallidos del CI: aparece un workflow run separado (`Notify CI Failure`) que ejecuta el embed a Discord. No infla el run del CI.

### Cambios

- **`ci.yml`**: removido el job `notify`. Solo orquesta `backend` + `admin`.
- **`notify-ci-failure.yml`** (nuevo): workflow disparado por `workflow_run` cuando `CI` termina con `conclusion == 'failure'` y `event == 'push'`. Contexto del commit/branch/autor/run viene del payload de `workflow_run`.

---

## [0.30.44] - 2026-04-29

### CI — alinear notificacion al patron de mapalab/cd.yml

El job `notify-failure` con `if: failure()` o `if: always() && (...)` aparecia como `skipped` en cada run exitoso del CI, generando ruido visual en la UI de GitHub Actions. Mapalab tiene un patron mas limpio en `cd.yml/notify`: el job siempre corre (`if: always()`), y dentro tiene un step "Status" siempre + steps condicionales para success/failure. Asi el job aparece como `success` (no `skipped`) cuando todo pasa, y los steps internos individuales son los que se saltan.

### Cambios en `ci.yml`

- Job renombrado de `notify-failure` a `notify`.
- Condicion: `if: always() && github.event_name == 'push'` (siempre corre, salvo en PRs).
- Nuevo step `Status` que solo imprime los resultados de los needs — garantiza que el job tenga un step que SI corre, evitando que el job entero quede como skipped.
- Step `Notify Discord - Failure` con `if: needs.backend.result != 'success' || needs.admin.result != 'success'`. Solo dispara cuando hay fallo real.
- Embed actualizado al estilo de mapalab (commit corto en backticks + autor + branch + jobs fallidos + cambios + link al workflow).

### Resultado visual

```
Antes:
  ✓ backend
  ✓ admin
  ⊘ notify-failure (skipped)   ← feo

Ahora (run exitoso):
  ✓ backend
  ✓ admin
  ✓ notify   ← se ejecuta, solo el step de Discord queda skipped adentro
```

---

## [0.30.43] - 2026-04-29

### CI — fix `notify-failure` skipped cuando jobs cancelled/skipped

`if: failure()` solo dispara cuando algun `needs.X.result == 'failure'`. Pero cuando el workflow file tiene un bug de YAML (como el caso del 0.30.42 con `DATABASE_URL: sqlite:///:memory:` sin comillas), los jobs `backend` y `admin` quedan como `cancelled` o `skipped` (no `failure`), y `notify-failure` se saltaba silenciosamente sin enviar nada a Discord — exactamente el caso donde MAS necesitas la notificacion.

### Cambios

- **`ci.yml` `notify-failure.if`** ahora es:
  ```yaml
  if: |
    always() &&
    github.event_name == 'push' &&
    (needs.backend.result != 'success' || needs.admin.result != 'success')
  ```
  - `always()` evita que GitHub skipee el job cuando un need no es success (default).
  - Check explicito `!= 'success'` cubre `failure`, `cancelled`, `skipped`, `null`.
- **Mensaje a Discord** ahora incluye el `result` real entre parentesis: `backend(cancelled) admin(skipped)`. Asi distinguis bug de YAML vs test fail vs timeout.

---

## [0.30.42] - 2026-04-29

### CI — fix workflow file invalido + notificacion Discord

`.github/workflows/test-backend.yml` tenia el valor `DATABASE_URL: sqlite:///:memory:` sin comillas. YAML interpreta los `:` dentro del valor como inicio de mappings y rompe el parser. GitHub Actions reporta esto como `This run likely failed because of a workflow file issue.` y el run falla SIN ejecutar jobs (`total_count: 0`). Por eso `gh run view` no mostraba log: nunca arrancaron los jobs.

### Cambios

- **`test-backend.yml`**: comillas alrededor de `'sqlite:///:memory:'` (el unico valor con `:` problematico). De paso eliminadas vars que ya no usa el codigo (`VERSION`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME`, `ADMIN_PREFIX`, `WEB_PREFIX`, `COOKIE_*`, `CSRF_TOKEN_EXPIRE_MINUTES` — todas tienen default en `settings.py` o se eliminaron del modelo). Agregadas las 5 pares de creds por bucket que el codigo ahora exige (`ACERVO_<BUCKET>_ACCESS_KEY/SECRET_KEY`).
- **`ci.yml`**: nuevo job `notify-failure` que dispara solo en `push` (no en PRs) cuando `backend` o `admin` fallan, y manda un embed a Discord con commit, autor, jobs fallidos y link al run. Patron tomado del `cd.yml` de mapalab. Requiere secret `DISCORD_WEBHOOK_URL` configurado en el repo (`gh secret set DISCORD_WEBHOOK_URL`).

---

## [0.30.41] - 2026-04-29

### Infra — `vite build` 45% mas rapido

Mejoras al `npm run build` del admin (nginx/Dockerfile + vite.config.js):

- **`rollup-plugin-visualizer` ahora opcional**: solo se carga si `BUILD_STATS=1`. Antes corria en cada build agregando ~2s y generando `dist/stats.html` que rara vez se mira. El bundle final no cambia.
- **Cache mount para `node_modules/.vite`**: Vite pre-bundlea las deps externas (antd, react, etc.) en `node_modules/.vite/deps/`. Sin cache mount, esto se rehace en cada `--no-cache`. Con cache mount el pre-bundling sobrevive entre builds y el segundo build solo transforma el codigo cambiado.
- **Cache mount para `/root/.npm` tambien en el RUN del build** (ademas del `npm ci`). Si vite ejecuta scripts npm internos, ya tiene cache disponible.
- **Build arg `BUILD_STATS`** propagado por `docker-compose.yml` para que sea opt-in: `BUILD_STATS=1 make build ENV=prod` cuando quieras analizar el bundle.

### Mediciones

```
npm run build (vite + rollup):  11.3s -> 6.2s   (~45% mas rapido)
nginx rebuild incremental:      18.5s -> 13.8s  (~25% mas rapido)
```

---

## [0.30.40] - 2026-04-29

### Infra — optimizacion de tiempo de build de imagenes Docker

Los rebuilds incrementales eran innecesariamente lentos porque la cache de Docker se invalidaba en pasos costosos cuando cambiaba cualquier archivo del repo.

#### `api/Dockerfile`

Antes: `COPY . .` venia ANTES de `pip install`, asi que cualquier cambio (incluso un comentario) invalidaba la cache del `pip install` y forzaba reinstalar todas las deps de Python (~30s).

Ahora:

1. `COPY pyproject.toml` y crear stub `app/__init__.py` para que el package sea instalable.
2. `pip install -e ".[dev]"` o `pip install -e "."` con `--mount=type=cache,target=/root/.cache/pip`.
3. `COPY . .` al final (sobreescribe el stub con el codigo real).

El paso pesado (`pip install`) solo se re-ejecuta cuando cambia `pyproject.toml`, no cuando cambia el codigo. **Rebuild con cambio de codigo: ~0.6s** (antes: ~25-30s).

#### `nginx/Dockerfile`

Agregado `--mount=type=cache,target=/root/.npm` al `npm ci`. Sin esto, builds con `--no-cache` re-descargaban todos los paquetes npm (lento). Tambien `--prefer-offline --no-audit --fund=false` para reducir overhead.

El paso dominante en rebuilds del nginx (con cambio de codigo) es `npm run build` (vite + rollup), que no se puede cachear porque el output depende del codigo. Pero el `npm ci` ahora no se invalida si solo cambia el codigo del admin.

#### Mediciones (local, M1 + Docker Desktop)

```
api    rebuild --no-cache:  ~28s (antes: similar)
api    rebuild con cambio:  ~0.6s (antes: ~25-30s)   ← 50x mas rapido

nginx  rebuild --no-cache:  ~25s
nginx  rebuild con cambio:  ~18.5s (npm ci cacheado, vite build)
```

---

## [0.30.39] - 2026-04-29

### Docs — `.env.*.example` simplificados al minimo necesario

Los tres `.env.*.example` arrastraban variables redundantes (sobreescritas por `docker-compose.yml` `environment:`, con default sensato en `settings.py`/`Dockerfile`, o forzadas en `enforce_production_defaults`). Esto invitaba a configurar cosas que no surtian efecto y agregaba ruido.

Removidas (todas tienen default ya en codigo):
- `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CSRF_TOKEN_EXPIRE_MINUTES` (defaults `HS256`/30/60).
- `COOKIE_NAME`, `COOKIE_MAX_AGE`, `COOKIE_HTTPONLY`, `COOKIE_SECURE` (defaults; `cookie_secure` forzado a `True` en prod por `enforce_production_defaults`).
- `PROJECT_NAME`, `VERSION` (`PROJECT_NAME` default; `VERSION` se resuelve via `get_app_version()` desde `pyproject.toml`).
- `ADMIN_PREFIX`, `WEB_PREFIX`, `MAPALAB_PUBLIC_PREFIX` (defaults).
- `DATAENGINE_POOL_SIZE`, `DATAENGINE_MAX_OVERFLOW`, `GEOSERVER_TIMEOUT` (defaults).
- `DOCS_URL`, `REDOC_URL`, `OPENAPI_URL` (forzados a `None` en prod por `enforce_production_defaults`).
- `VITE_NODE_ENV`, `VITE_ADMIN_API_TIMEOUT`, `VITE_ADMIN_APP_NAME`, `VITE_ADMIN_PORT`, `VITE_ADMIN_HOST` (defaults en `nginx/Dockerfile` o no se referencian).
- `VITE_GOOGLE_ANALYTICS_ID` (mariachi delega a `gateway-hub` GTM desde 0.30.28).
- `DATABASE_URL`, `REDIS_URL` (sobreescritos por `environment:` en docker-compose).
- `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME` (sin fallback al root desde 0.30.29; cada bucket usa sus creds).
- `COMPOSE_PROJECT_NAME` en prod/staging (compose tiene `name: mariachi`).

Mantenidas / mejoradas:
- Comentarios cortos sobre como rotar creds (`init-buckets.sh --rotate`), proposito de cada `*_ONTOY_URL`, etc.
- `ACERVO_PUBLIC_ENDPOINT=/acervo` (path relativo) en prod/staging para evitar mixed content (ya estaba en codigo desde 0.30.34).

### Conteo de lineas (antes -> despues)

```
.env.production.example:    ~75 -> 79 (con comentarios mas utiles)
.env.staging.example:        73 -> 58
.env.development.example:    98 -> 73
```

---

## [0.30.38] - 2026-04-29

### Infra — fix `IsADirectoryError` en `mariachi-api` cuando acervo no tiene cert propio

En `docker-compose.yml`, el servicio `api` montaba `../acervo/nginx/ssl/acervo.crt` como volumen y seteaba `REQUESTS_CA_BUNDLE`/`SSL_CERT_FILE` apuntando a esa ruta. En modo `INFRA=gateway` (que es el patron actual en GCP), acervo NO tiene cert propio (TLS lo termina gateway-hub con Let's Encrypt). Como el path `../acervo/nginx/ssl/acervo.crt` no existe en el host, docker creaba un directorio vacio con ese nombre y al cargar `urllib3` intentaba leerlo como archivo, fallando con `IsADirectoryError: [Errno 21] Is a directory` -> 500 en cualquier endpoint que tocara MinIO.

Como `ACERVO_USE_SSL=false` (mariachi-api se conecta a `acervo-minio:9000` por HTTP dentro de la red docker), el cert nunca fue necesario. Removidos:

- Bind mount `../acervo/nginx/ssl/acervo.crt:/usr/local/share/ca-certificates/acervo.crt:ro` del servicio `api`.
- Env vars `REQUESTS_CA_BUNDLE` y `SSL_CERT_FILE`.

Si en el futuro alguien necesita SSL al MinIO interno (poco probable, pero posible si se hace acervo standalone con cert propio), puede agregar el bind mount + env vars con un compose override.

---

## [0.30.37] - 2026-04-29

### Admin (UI) — refinamientos UX en `/media`

- **Titulo `Media Manager` -> `Multimedia`** (en español, alineado con el endpoint `/multimedia`).
- **Modal "Subir Archivos"**:
  - Nuevo campo "Bucket" (read-only) que muestra el nombre del bucket destino — antes el usuario no veia a donde estaba subiendo.
  - "Carpeta de destino" cambio de `Select` (lista de todas las carpetas globales registradas en `media_folders`, sin filtro por bucket) a `Input` editable con el `currentPath` precargado. El usuario ve a donde va, puede editar manualmente.
- **Modal "Nueva Carpeta"**:
  - Mismo campo "Bucket" read-only.
  - "Carpeta padre" tambien cambio a `Input` editable.
- **Cambio de bucket resetea `currentPath` a raiz**: antes si navegabas a `mariachi/avatars/u1/` y luego cambiabas al bucket `portal`, seguias en el path `avatars/u1/` aplicado a portal, dando una falsa sensacion de "no hay archivos". Ahora cualquier cambio de bucket vuelve a la raiz.

---

## [0.30.36] - 2026-04-29

### Backend (api) — fix `avatarUrl` perdido al refrescar `/perfil`

`get_current_user_context` (en `api/deps.py`) arma manualmente el dict que retorna `GET /autenticacion/perfil` (`CurrentUserResponse`). El dict no incluia el campo `avatar_url`, asi que aunque la BD tuviera el avatar correcto, el GET retornaba `avatarUrl: null`. En el frontend, `refreshUser()` despues del PUT sobreescribia el state con `avatarUrl` vacio y el avatar se "perdia" al recargar la pagina.

Fix: `get_current_user_context` ahora incluye `avatar_url=current_user.avatar_url` en el dict. El field_serializer `_expose_avatar_absolute` (en `schemas/user.py:UsuarioResponse`) lo procesa correctamente y lo expone como `avatarUrl` en la respuesta JSON.

---

## [0.30.35] - 2026-04-29

### Backend (api) — fix idempotencia `to_relative` para paths del proxy

Bug introducido implícitamente cuando empezamos a guardar URLs del proxy en `avatar_url`: el validator `to_relative` strip-eaba el `/` inicial de paths absolutos del API, dejando `avatar_url` como `api/administrador/multimedia/proxy/...` (sin barra). Al releer, `to_absolute` no reconocia el prefix `/api/` y trataba el path como relativo al bucket público, generando URLs invalidas tipo `/acervo/api/administrador/...`.

Fix: `to_relative(...)` ahora preserva paths que empiezan con `/api/` (igual que `to_absolute(...)`). Idempotencia restaurada: `to_absolute(to_relative(x)) == x` para URLs del proxy.

Si tienes `avatar_url` ya corruptos en BD (subidos antes del fix), repararlos con:
```sql
UPDATE usuarios SET avatar_url = '/' || avatar_url WHERE avatar_url LIKE 'api/%';
```

### Admin (UI) — `/perfil` modo grid en el picker de avatars genéricos

- **`BucketFilePicker`** acepta nuevo prop `mode="grid"|"list"` (default `list`). En modo grid muestra thumbnails (`<img>` real con `objectFit: cover`) en una grilla responsiva (`auto-fill, minmax(140px, 1fr)`); para items que no son imagen muestra icono. Hover visual con borde azul.
- **`PerfilPage`** pasa `mode="grid"` al picker de "Elegir genérico" — los avatars del bucket `iieg/avatars/` se muestran como miniaturas clicables en lugar de tabla.

---

## [0.30.34] - 2026-04-29

### Backend (api) — URLs del acervo relativas al dominio (cierra mixed-content)

`ACERVO_PUBLIC_ENDPOINT` ahora soporta valores tipo path (`/acervo` en vez de `localhost:9080`). El admin se sirve por HTTPS pero las URLs del acervo iban a `http://localhost:9080/...` provocando que el browser bloqueara las imagenes con `Mixed Content: was loaded over HTTPS, but requested an insecure element`. Ahora `to_absolute(...)` detecta endpoints que empiezan con `/` y retorna URL relativa al dominio actual (gateway-hub la enruta a MinIO). Sin host hardcoded, funciona igual en local (`iieg.local`) y en GCP (`mapalab-iieg.app`).

- **`acervo_url.py:to_absolute`** y `to_relative`: soporte para path-only endpoints.
- **`.env.production`** local: `ACERVO_PUBLIC_ENDPOINT=/acervo`.

### Admin (UI) — `/media` y `/perfil` adaptados

- **Breadcrumb de `/media`** ahora muestra el nombre del bucket actual en el inicio (`Mariachi > avatars > u1`) en lugar de un genérico `Raíz`.
- **Botones `Subir Archivos` y `Nueva Carpeta`** en `/media` ahora pre-seleccionan la carpeta donde el usuario está navegando (`currentPath`) en lugar de `/` hardcoded. Tambien se deshabilitan si no hay bucket seleccionado.
- **`/perfil`** rediseñado con dos opciones de avatar: `Elegir genérico` (pickea del bucket público compartido `iieg/avatars/`) y `Subir personalizado` (sube al bucket privado `mariachi/avatars/u<user_id>/`, accesible solo via proxy autenticado). Antes apuntaba a `portal` para ambos casos.

---

## [0.30.33] - 2026-04-29

### Admin (UI) — simplificacion de nombres de buckets en `/media`

- Antes el select de bucket en la pagina `/media` mostraba `${display_name} · ${acervo_bucket}` (ej. `"Metadatos de capas · mapalab"`). El display_name original era descriptivo pero confuso (un bucket entero NO son solo metadatos) y la concatenacion duplicaba info. Ahora el label es directo y reconocible: `Portal`, `MapaLab`, `Mariachi`, `SIEEJ`, `IIEG`.
- **Migracion `b2c3d4e5f6a7_simplify_bucket_display_names.py`** UPDATEa los `display_name` de `media_buckets` a las versiones cortas. Idempotente, downgrade restaura los textos largos.
- **`MediaPage.jsx`**: el `label` del `Select` ahora es `b.display_name` simple (sin sufijo `· acervo_bucket`).

---

## [0.30.32] - 2026-04-29

### Backend (api+infra) — proxy autenticado para buckets privados (cierra brecha de privacidad)

Hasta 0.30.31, los URLs construidos por `AcervoClient.get_file_url` y `client.upload_file` siempre apuntaban directamente al bucket de acervo (`https://<dominio>/acervo/<bucket>/<path>`). Cuando un bucket es privado (e.g. `mariachi`), esas URLs:
- Fallan con 403 en el browser (esperado).
- **Quedan registradas en BD** (`media.url`, `usuarios.avatar_url`) y pueden filtrarse en logs, HTTP referers, exports, etc., apuntando a un recurso no accesible y revelando estructura interna.

Ademas, schemas que usan `to_absolute(...)` (`schemas/user.py:avatar_url`, `schemas/evento.py`, `schemas/layer.py`, `schemas/home_section.py`) anteponian el host publico del acervo a cualquier path relativo, asumiendo que era publico.

### Cambios

- **`AcervoClient`** ahora es bucket-aware: acepta `is_public: bool` y `bucket_id: int` en `__init__`. `for_bucket()` los pasa desde `MediaBucket`.
- **`AcervoClient.get_file_url`**:
  - Si `is_public=True`: comportamiento previo (URL directa al bucket via `acervo_public_endpoint`).
  - Si `is_public=False`: retorna URL relativa al endpoint proxy de mariachi-api: `/api/administrador/multimedia/proxy/<bucket_id>/<object_path>`.
- **`AcervoClient.upload_file`** ahora reutiliza `get_file_url` para construir la URL de retorno (queda bucket-aware automaticamente).
- **`to_absolute(...)`** preserva paths que empiezan con `/api/` (eran del proxy del API, no del bucket). Antes los antepondria con el host del acervo y romperia.
- **Endpoint nuevo `GET /multimedia/proxy/{bucket_id}/{object_path:path}`** (en `routes/media.py`):
  - Requiere autenticacion (`get_current_user`).
  - Valida acceso al bucket via `media_service.resolve_bucket_or_403` (mismo modelo de permisos que el resto de `multimedia/*`).
  - Stream-ea el contenido del bucket privado. `Cache-Control: private, max-age=300`.
- **`AcervoClient.stat_object` / `get_object_stream`** expuestos para que el endpoint pueda leer el objeto.

### Fix infra: `nginx/conf.d/mariachi.conf`

La regex de cache de assets estaticos (`location ~* \.(js|css|png|jpg|...)$`) capturaba **antes** que `location /api/` cualquier URL del API que terminara en una extension de archivo (e.g. `/api/.../proxy/12/avatars/u1/test.jpg`), provocando 404 al servir desde filesystem. Fix: cambiar `location /api/` y `location /api/administrador/media/` a `location ^~ /api/...` para forzar prioridad de prefix sobre regex.

### Validacion local (gateway -> mariachi-nginx -> mariachi-api -> minio)

```
GET /acervo/mariachi/avatars/u1/test.jpg                    → 403 (anonymous denegado)
GET /api/administrador/multimedia/proxy/12/avatars/u1/...   → 401 (sin sesion)
GET /api/administrador/multimedia/proxy/12/avatars/u1/...   → 200 + image/jpeg (con sesion)
```

---

## [0.30.31] - 2026-04-29

### Backend (api) — bucket `mariachi` privado, avatars al bucket compartido `iieg`

- **Bucket `mariachi` cambia a `is_public=false`**: queda reservado para assets administrativos staff-only del panel admin (logs descargables, exportaciones internas, archivos que no deben quedar en el indice publico). Los avatars de usuarios YA NO viven aqui.
- **Avatars al bucket `iieg`** (publico, compartido) bajo la convencion `iieg/avatars/u<user_id>/<uuid>.<ext>`. La razon: el avatar de una editora aparece en multiples vistas y multiples frontends del ecosistema (lista de publicaciones, "ultima edicion por", listas de usuarios). Tenerlo publico y compartido permite que cualquier frontend lo referencie con URL relativa `/acervo/iieg/avatars/...` sin presigned URLs ni proxy autenticado.
- **Migracion** `a1b2c3d4e5f6_*.py` actualizada: `media_buckets.iieg` con descripcion explicita `'Assets institucionales IIEG (incluye avatars)'`; `media_buckets.mariachi` con descripcion `'Assets administrativos privados'` y `is_public=false`.
- **`docs/context.md`** documenta la separacion publicos/privados, la convencion del path `iieg/avatars/u<id>/...` y las dos politicas de upload (assets institucionales solo para `tetlamamakani`; avatars donde el `user_id` del path debe coincidir con `current_user.id`).

### Notas migracion (al bajar 0.30.31 + acervo 1.20.1)

1. La migracion alembic se aplica sola en el bootstrap. Si ya tenias avatars en el bucket `mariachi` (de testing temprano), muevelos al bucket `iieg/avatars/`:
   ```bash
   docker exec acervo-minio mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
   docker exec acervo-minio mc mirror --remove local/mariachi/avatars/ local/iieg/avatars/
   docker exec acervo-minio mc anonymous set none local/mariachi
   ```
2. Si tu UI de subida de avatar todavia apunta al `bucket_id` de mariachi, cambialo al `bucket_id` de iieg (consultar `media_buckets`).

---

## [0.30.30] - 2026-04-29

### Backend (api) — bucket compartido `iieg` + rename `sieej-diccionarios → sieej`

- **`media_buckets`** ahora incluye un bucket compartido `iieg` (proyecto institucional nuevo) para assets reutilizables entre todos los frontends del ecosistema (logos IIEG, escudos Jalisco, fuentes web, iconos, documentos institucionales). Publico (anonymous GetObject); solo `tetlamamakani` puede subir. Acervo lo crea automaticamente con `init-buckets.sh` (>= acervo 1.20.0).
- **Bucket `sieej-diccionarios` renombrado a `sieej`** (mas corto, consistente con los demas). El `access_key_ref` ya era `ACERVO_SIEEJ` (no cambia), solo se ajusta el `acervo_bucket`. Acervo migra los objetos del bucket viejo al nuevo automaticamente.
- **Migracion** `a1b2c3d4e5f6_add_mariachi_project_and_bucket.py` actualizada: ahora tambien INSERTa proyecto/bucket `iieg` y UPDATEa `sieej-diccionarios -> sieej`.

### Notas migracion

Cuando bajes a la VM (orden importa):

1. **Acervo (>= 1.20.0)**: edita `.env.gateway` con `MINIO_BUCKETS=portal mapalab mariachi sieej dataengine iieg`, `--force-recreate minio` y corre `--rotate`. Captura las 6 passwords.
2. **Mariachi `.env.production`**: pega las 6 passwords en `ACERVO_<REF>_SECRET_KEY` (incluye `ACERVO_IIEG_*` que es nueva).
3. **Mariachi `make build ENV=prod`**: la migracion alembic se aplica en bootstrap. Verifica que `media_buckets` muestre 6 rows con `iieg` y `sieej` (no `sieej-diccionarios`).

---

## [0.30.29] - 2026-04-29

### Backend (api+infra) — principio de menor privilegio para acervo

- Mariachi escribia a TODOS los buckets de Acervo con las credenciales root del cluster MinIO (fallback de `acervo.py:resolve_bucket_credentials`). Esto violaba el principio de menor privilegio: si las creds de mariachi se filtraban, el atacante tenia acceso completo al cluster (incluyendo buckets de huachicol y otros que mariachi nunca toca). Ahora cada bucket usa sus propias credenciales (`<REF>_user` con policy attached solo sobre ese bucket).
- **`media_buckets`**: nuevo proyecto `mariachi` con bucket `mariachi` (publico, anonymous GetObject) para los assets propios del panel admin (avatars y demas). El bucket `dateengine` (con typo, jamas usado por mariachi en runtime) queda desactivado (`is_active=false`); no se borra el row para preservar FKs eventuales. Migracion: `a1b2c3d4e5f6_add_mariachi_project_and_bucket.py`.
- **`acervo.py`**: removido el fallback al usuario root. Si un bucket activo no tiene `<REF>_ACCESS_KEY`/`<REF>_SECRET_KEY` configuradas, lanza `RuntimeError` explicito (en lugar de degradar silenciosamente a creds root).
- **`settings.py`**: removidas `acervo_access_key`, `acervo_secret_key`, `acervo_bucket_name` (ya no se usan).
- **`acervo.py`**: removida la funcion legacy `get_acervo_service` (codigo muerto, nunca se llamaba).
- **`docker-compose.yml` / `docker-compose.dev.yml`**: removidas `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME` del bloque `environment:` del servicio `api`.
- **`.env.production`** / `.env.staging` / `.env.development`: removidas las creds root globales. Ahora se requieren las 4 pares por bucket: `ACERVO_PORTAL_*`, `ACERVO_MAPALAB_*`, `ACERVO_MARIACHI_*`, `ACERVO_SIEEJ_*`. Removidas `ACERVO_DATEENGINE_*` (bucket desactivado).
- **`.env.production.example`** / `.env.staging.example` / `.env.development.example`: actualizados al nuevo modelo con instruccion de como rotar passwords (`cd ../acervo && ./scripts/init-buckets.sh --rotate`).

### Notas migracion (en orden)

1. **Acervo (>= 1.19.0)**: rotar passwords con `./scripts/init-buckets.sh --rotate` y crear el bucket `mariachi`. Capturar las 4 passwords que imprime el script.
2. **Mariachi `.env.production`**: pegar las 4 passwords nuevas en `ACERVO_PORTAL_SECRET_KEY`, `ACERVO_MAPALAB_SECRET_KEY`, `ACERVO_MARIACHI_SECRET_KEY`, `ACERVO_SIEEJ_SECRET_KEY`. Remover `ACERVO_ACCESS_KEY`, `ACERVO_SECRET_KEY`, `ACERVO_BUCKET_NAME`, `ACERVO_DATEENGINE_*`.
3. **Mariachi `make build ENV=prod`**: la migracion alembic se aplica en el bootstrap. Sin las creds por bucket, mariachi-api arranca pero al primer write a un bucket lanza 500 con detalle "Faltan <REF>_ACCESS_KEY/<REF>_SECRET_KEY".

### Compat

- **Avatars existentes**: si los avatars actuales viven en bucket `portal`, esta migracion NO los mueve. Quedan donde estan; el bucket `mariachi` se usa para nuevos uploads. Si quieres migrarlos: comando `mc cp --recursive acervo/portal/<ruta-avatars> acervo/mariachi/avatars/` mas `UPDATE usuarios SET avatar_url=...` manual.

---

## [0.30.28] - 2026-04-29

### Admin — migracion al patron GTM de gateway-hub (eliminado `react-ga4`)

- Mariachi-admin ahora delega Google Analytics al `sub_filter` GTM que `gateway-hub` inyecta a nivel nginx en todas las respuestas HTML del ecosistema (mismo patron ya usado por mapalab y sieej). El admin deja de embeber su propio SDK; los page_view se disparan via "All Pages" trigger en GTM y los eventos custom se envian con `window.dataLayer.push(...)` sin requerir build args ni recompilacion.
- **`admin/src/main.jsx`**: removido `import ReactGA from 'react-ga4'` y el bloque `ReactGA.initialize(VITE_GOOGLE_ANALYTICS_ID, ...)`. La libreria solo se usaba para `initialize`; nunca se llamaban `ReactGA.event` ni `ReactGA.send`, asi que era codigo muerto.
- **`admin/package.json`** + `package-lock.json`: removida la dependencia `react-ga4@2.1.0`.
- **`nginx/Dockerfile`**: removidos `ARG VITE_GOOGLE_ANALYTICS_ID` y su `ENV`.
- **`docker-compose.yml`**: removida `VITE_GOOGLE_ANALYTICS_ID` de `nginx.build.args`.
- **`.env.production`**: la linea `VITE_GOOGLE_ANALYTICS_ID=` queda como inerte (ya no la lee nada). Se documenta para activar GA en `gateway-hub/.env` -> `GTM_ID=GTM-XXXXXXX`.

### Validacion

- Rebuild `--no-cache`: bundle del admin no contiene `react-ga4`, `gtag.js` ni referencias a `googletagmanager.com`.
- `https://iieg.local/mariachi/`: 200 OK con titulo correcto.
- Si `gateway-hub/.env` define `GTM_ID`, el snippet GTM aparece en el HTML servido por `/mariachi/` sin tocar nada en mariachi.

---

## [0.30.27] - 2026-04-29

### Infra — SIEEJ deja de ser hospedado por mariachi-nginx

- `gateway-hub` (>= v1.24.0) ahora sirve el dist de SIEEJ directamente con `alias`. Mariachi deja de tener responsabilidades de hospedaje de otros frontends; queda como una plataforma mas dentro del ecosistema, no como proxy. Esto restablece la separacion de capas: cada plataforma tiene su propio servicio o se sirve desde el ingress, no desde otra plataforma.
- **`docker-compose.yml`**: removido el bind mount `${SIEEJ_DIST_PATH:-../SIEEJ/frontend/dist}:/usr/share/nginx/html/sieej:ro` del servicio `nginx` (con su comentario asociado).
- **`nginx/conf.d/mariachi.conf`**: removido `location /sieej { alias /usr/share/nginx/html/sieej; try_files ... /sieej/index.html; }`.
- **`.env.production`**: removida `SIEEJ_DIST_PATH`. `SIEEJ_ONTOY_URL` ahora apunta a `http://gateway-hub-nginx-1/sieej/ontoy` (gateway-hub expone el JSON en su bloque :80 para que el probe HTTP interno de mariachi-api no sea redirigido a HTTPS).

### Validacion

- `mariachi-nginx /sieej/` -> 404 (correcto, ya no lo sirve).
- `https://iieg.local/sieej/` -> 200 (gateway-hub).
- `mariachi-api -> http://gateway-hub-nginx-1/sieej/ontoy` -> 200 con `{"slug":"sieej","label":"SIEEJ","version":"1.2.0"}`.

---

## [0.30.26] - 2026-04-29

### Backend (api) — defaults sensatos en `settings.py` + `version` autoresolvida desde `pyproject.toml`

- 13 campos de `Settings` que antes eran obligatorios ahora tienen default razonable, lo que reduce drasticamente la cantidad de variables que hay que repetir en cada `.env`. La idea: el `.env` solo declara lo que difiere del default, no lo que ya es la convencion del proyecto.
- **`core/settings.py`**:
  - Defaults nuevos: `algorithm="HS256"`, `access_token_expire_minutes=30`, `csrf_token_expire_minutes=60`, `admin_prefix="/api/administrador"`, `web_prefix="/api/portal"`, `cookie_name="access_token"`, `cookie_max_age=1800`, `cookie_httponly=True`, `cookie_samesite="lax"`, `cookie_secure=False`, `acervo_use_ssl=False`. `enforce_production_defaults` sigue forzando `cookie_secure=True` cuando `environment=="production"`.
  - `project_name` con default `"Mariachi"`.
  - **`version`** ahora se resuelve via `Field(default_factory=get_app_version)` (lee del `pyproject.toml` con `tomllib`). Single source of truth: la version del repo es la del `pyproject.toml`, no se duplica en `.env` (donde estaba desactualizada).
- **`.env.production`** reducido de 116 a ~60 lineas: eliminadas variables redundantes (puertos sin mapping en compose, vars que se sobreescriben en `environment:` del compose, vars muertas del frontend `web/`, vars con default ya en settings, vars del dev server de Vite). Las vacias opcionales (`ACERVO_*_ACCESS_KEY/SECRET_KEY`, `MAPALAB_INTERNAL_TOKEN`, `SIEEJ_URL`, `SENTRY_*`, `VITE_GOOGLE_ANALYTICS_ID`, `VITE_SENTRY_DSN`) se conservan como placeholders documentados.
- **`nginx/Dockerfile`**: simplificados los `ARG`/`ENV` del admin-builder. `VITE_ADMIN_API_URL` ahora tiene default `=/api/administrador`. Removidas `VITE_ADMIN_API_TIMEOUT` y `VITE_ADMIN_APP_NAME` (no se referencian en `admin/src`). Agregada `VITE_WEB_URL` que faltaba (existia en el codigo del admin pero nunca llegaba al build).
- **`docker-compose.yml`**: alineados los `nginx.build.args` con el `Dockerfile`. `VITE_ADMIN_API_URL: ${VITE_ADMIN_API_URL:-/api/administrador}` con fallback. Agregado `VITE_WEB_URL`.

---

## [0.30.25] - 2026-04-28

### Infra — Postgres 18 mount + remove default.conf + extra_hosts

- **`docker-compose.yml`**: `postgres:18-alpine` (era `postgres:15-alpine`). El volumen ahora monta `postgres_data:/var/lib/postgresql` (era `:/var/lib/postgresql/data`) porque la imagen 18 cambio el path de datos por defecto.
- **`api/Dockerfile`**: `extra_hosts: host.docker.internal:host-gateway` para que la API pueda alcanzar servicios en el host (DataEngine, GeoServer, Acervo) cuando estan fuera del compose.
- **`nginx/Dockerfile`**: `RUN ... && rm -f /etc/nginx/conf.d/default.conf` para que el `server_name localhost` que ships la imagen `nginx:alpine` no gane como default y bloquee al `mariachi.conf`.

---

## [0.30.24] - 2026-04-28

### Repo — `LICENSE` movido a root para que GitHub la detecte

- **`docs/LICENSE` → `LICENSE`**: GitHub solo detecta automáticamente la licencia cuando el archivo está en el root del repo (acepta `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `LICENCE`, `COPYING`). Tener el archivo solo en `docs/` hacía que el repo apareciera sin badge de licencia y que la API de GitHub no expusiera el campo `license` en el endpoint de repositorio. Mismo patrón ya usado por los demás repos del ecosistema (mapalab, acervo, gateway-hub, huachicol, mapalab-dataengine).

---

## [0.30.23] - 2026-04-28

### Backend (api) — todas las plataformas usan probe `ontoy` con su URL configurable

- Cada repo del ecosistema implementó su propio endpoint `/ontoy` (acervo y gateway-hub via nginx con `alias /etc/nginx/version.json`; mapalab-dataengine via servicio `version-api` independiente en `:8088`; geoserver escribe `/ontoy.json` desde su `entrypoint-wrapper.sh`; mapalab-backend lo expone desde FastAPI). Mariachi ahora consulta esos endpoints en lugar de usar probes ad-hoc por plataforma.
- **`platforms_config.py`** unificado: todas las plataformas externas usan `probe="ontoy"` con `probe_url_template="{<slug>_ontoy_url}"`. Eliminado el probe `dataengine` (SQL) y `http_health` para acervo — ahora todas comparten el mismo flujo. El `static_version` se conserva como fallback de versión (si el endpoint no responde, igual se muestra la versión del CHANGELOG del repo).
- **Resolver de templates** en `routes/sistema.py` refactorizado a un dict de placeholders para escalar limpiamente.
- **Settings nuevos** (`core/settings.py`): `acervo_ontoy_url`, `dataengine_ontoy_url`, `geoserver_ontoy_url`, `gateway_hub_ontoy_url`, `huachicol_ontoy_url`, `sieej_ontoy_url`. Todos opcionales; vacío = probe queda como `healthy=false` pero la card sigue mostrando `static_version`.
- **`.env.development`**: `DATAENGINE_ONTOY_URL=http://host.docker.internal:8088/ontoy` (único que se puede probar localmente; el resto vive detrás de nginx que solo levanta en staging/production). `.env.development.example` documenta el comportamiento.

---

## [0.30.22] - 2026-04-28

### Backend (api) — sincronización con `static_version` retroactivo

- **`platforms_config.py`** sincronizado con los CHANGELOGs reescritos retroactivamente desde el historial de commits de cada repo:
  - `acervo`: `0.1.0` → `1.17.0`
  - `mapalab-dataengine`: `1.6.0` → `1.11.0`
  - `geoserver`: `0.1.0` → `1.14.1`
  - `gateway-hub` y `huachicol` siguen en `0.1.0` (no han bumpeado todavía).

---

## [0.30.21] - 2026-04-28

### Backend (api) — perfil editable + avatar

- **Migración alembic `f4a5b6c7d8e9_add_avatar_url_to_usuarios`**: nueva columna `usuarios.avatar_url` (Text nullable). Aplicada en dev.
- **`Usuario.avatar_url`** en el modelo SQLAlchemy.
- **Schemas (`schemas/user.py`)**: `UsuarioResponse.avatar_url` con `serialization_alias='avatarUrl'`. `field_validator(mode='before')` aplica `to_relative` y `field_serializer(when_used='json-unless-none')` aplica `to_absolute` — la URL del avatar se persiste relativa al bucket y se devuelve absoluta al cliente, igual que las URLs de eventos / home / capas. Nuevo `PerfilUpdate` con `name`, `email`, `avatar_url` (todos opcionales).
- **`PUT /autenticacion/perfil`**: actualiza nombre, email o avatar del `current_user`. Verifica unicidad de email contra otros usuarios (409 si conflict). Requiere `verify_csrf`.

### Admin (admin) — página `/perfil`

- **Nuevo feature module `features/perfil/`**:
  - `pages/PerfilPage.jsx` con avatar grande (96px), botón "Cambiar avatar" que abre `<BucketFilePicker bucketId=portal>`, botón secundario "Quitar avatar"; form con `name` + `email` (required, validación de email), nota inferior con `username` (no editable) y `role` (no editable). Botón principal "Guardar cambios" hace `PUT /autenticacion/perfil` y luego `refreshUser()` del context para que el avatar del header se actualice sin recargar.
  - `api/perfilService.js` con `actualizarPerfil(data)`.
- **Ruta `/perfil`** registrada en `main.jsx` con `lazy(() => import('@features/perfil'))`.
- **`MainLayout.jsx`**: el item "Perfil" del dropdown del avatar (header arriba-derecha) ahora navega a `/perfil` (antes era estático sin `onClick`). El `<Avatar>` del header lee `user.avatarUrl` (con fallback `user.avatar_url`); muestra `<UserOutlined />` solo cuando no hay avatar.

---

## [0.30.20] - 2026-04-28

### Backend (api) — registro extendido de plataformas + `static_version`

- **`platforms_config.py`** ahora incluye 8 plataformas del ecosistema: `mariachi`, `mapalab`, `mapalab-dataengine`, `acervo`, `gateway-hub`, `huachicol`, `geoserver`, `sieej`. Cada una con su `slug`, `label`, `url` (opcional), `probe` y `probe_url_template`.
- **Nuevo campo opcional `static_version`** por plataforma. Cuando está presente, el endpoint la devuelve como versión en lugar de la que reporta el probe. Es la versión del **repositorio** (la del `docs/CHANGELOG.md`), no la del software empaquetado. Útil para repos como `acervo` (MinIO no expone su versión sin auth), `gateway-hub` (Nginx no tiene `/version`), `geoserver` (Java, sin endpoint trivial) y `mapalab-dataengine` (es Postgres + jobs, no API).
- **Nuevo probe `none`** para servicios sin endpoint accesible — siempre reporta `healthy=true`. Se usa para `gateway-hub` y `huachicol` mientras no agregan un endpoint o un static.
- **Settings**: el campo `geoserver_url` (que ya existía) ahora se usa para el probe `http_health` de GeoServer.
- **Sincronización manual**: bumpear `static_version` en este archivo cuando se bumpea el `CHANGELOG.md` del repo correspondiente. (TODO: pre-commit hook que valide.)

### Eco-versionado en repos del ecosistema

- **`acervo`**, **`gateway-hub`**, **`huachicol`**, **`geoserver`**: nuevos `docs/CHANGELOG.md` y `VERSION` en root con `0.1.0` inicial. Antes ningún repo de infra llevaba versionado explícito; los cambios solo se reflejaban en commits. Ahora cada característica registrada en commit dispara un bump.
- **`mapalab-dataengine`**: nuevo `VERSION` (1.6.0) sincronizado con su `docs/CHANGELOG.md`.

---

## [0.30.19] - 2026-04-28

### Backend (api) + Admin (admin) — landing reescrita: plataformas + notas de versión

- **Atajos eliminados** del `/inicio`. Ya no tiene sentido tener "Editar Inicio / Eventos / Media / Revisiones" como cards porque el sider los expone directamente.
- **Nuevas secciones en `/inicio`**:
  - **Plataformas del ecosistema** — grid de cards con `label`, `slug`, `version` (tag azul si la conoce, gris si no), badge de estado (verde "activa" si responde, gris "no integrada" si no). Click en una card activa va a su URL si la tiene; las inactivas no son clickeables.
  - **Notas de versión** — `Collapse` con las últimas 5 entradas del `docs/CHANGELOG.md`. La primera viene expandida.

### Backend (api) — `/sistema/plataformas` y `/sistema/notas-version`

- **`/ontoy`** raíz en mariachi-api (`{slug, label, version}`). Convención del ecosistema IIEG: cada repo expone este endpoint para que el dashboard de Mariachi pueda detectar versión y healthy en una sola llamada.
- **`app/core/version.py`** — `get_app_version()` lee la versión real del `pyproject.toml` (no `importlib.metadata`, que en dev queda desfasada respecto al wheel instalado en el editable install).
- **`app/core/platforms_config.py`** — registro hardcoded con campos `slug, label, url, probe, probe_url_template`. `probe` admite cuatro tipos: `self` (lee versión local sin red), `ontoy` (HTTP GET al endpoint `/ontoy` del repo, parse JSON), `http_health` (HTTP GET a una URL cualquiera, 200 = healthy, sin versión), `dataengine` (`SELECT version()` vía `get_dataengine_db`). Templates con placeholders `{mapalab_backend_url}`, `{sieej_url}`, `{acervo_scheme}://{acervo_endpoint}`. Si un placeholder queda vacío (env no configurada) la plataforma reporta `healthy=false`.
- **`app/services/changelog_parser.py`** — parser de Keep a Changelog → JSON estructurado `[{version, fecha, secciones: [{titulo, contenido}]}]`. Lee de `/app/_docs/CHANGELOG.md` (montaje agregado a `docker-compose.dev.yml`) o del path relativo del repo como fallback. Soporta `[Unreleased]` / `[No publicado]` (los salta) y `## [x.y.z] - YYYY-MM-DD`.
- **`app/api/routes/sistema.py`** — `GET /sistema/plataformas` y `GET /sistema/notas-version?limit=5`. Ambos requieren `current_user` (cualquier rol). El probe de mapalab consulta `{MAPALAB_BACKEND_URL}/ontoy`; el de acervo `http://{ACERVO_ENDPOINT}/minio/health/live` (interno, no público); el de sieej `{SIEEJ_URL}`; el de dataengine reutiliza `get_dataengine_db` y parsea la respuesta de `SELECT version()` para tomar el número (`18.3`, `17.2`, etc.).
- **`docker-compose.dev.yml`** — `./docs:/app/_docs:ro` para que el parser pueda leer el changelog en runtime.
- **Settings nuevos**: `sieej_url` (opcional). El `mapalab_backend_url` ya existía. `MAPALAB_FRONTEND_URL` deliberadamente NO se agrega porque mapalab es un solo deployment (backend + frontend); su `/ontoy` cubre ambos.
- **`.env.development.example`** — `SIEEJ_URL` documentado con su comportamiento ("vacío = no integrada").

### Admin (admin) — mini-renderer de markdown

- **Nuevo `shared/components/Markdown.jsx`**: renderer minimal sin dependencias externas. Soporta `**negritas**` → `<strong>`, `` `inline code` `` → `<code>` con estilo monospaced, y viñetas `- item` agrupadas en `<ul>`. Es lo justo para renderizar las entradas del CHANGELOG sin el ruido de `react-markdown` + plugins. La página de inicio usa este componente para `notas-version`; antes mostraba el markdown como texto plano (`<Paragraph whiteSpace='pre-wrap'>`).

### Mapalab — `/ontoy` en backend

- **`mapalab/backend/app/__version__.py`** y **`server.py`**: nuevo endpoint `GET /ontoy` que devuelve `{slug, label, version}` para que mariachi pueda detectarlo. La versión se mantiene sincronizada con `frontend/package.json` (un solo bumpeo del repo). Lo bumpeé manualmente al `1.13.1`. El bump en `frontend/package.json` debe actualizar también este archivo (TODO: pre-commit hook que lo valide; mientras tanto, manual).

---

## [0.30.18] - 2026-04-28

### Admin (admin) — sider acepta `disabled` y entrada raíz "Inicio"

- **`buildSiderItems` honra `disabled`**: el flag `disabled: true` que ya estaba en `PROJECT_REGISTRY.portal` y `PROJECT_REGISTRY.sieej` (puesto por el usuario) ahora propaga al item del menú de antd. El grupo se renderiza apagado y los items hijos heredan `disabled = group.disabled || item.disabled` (deshabilita todo el subárbol). Cuando `disabled`, `onClick` queda `undefined` para que ni con teclado se dispare la navegación. `PLATFORM_ITEMS` también acepta `disabled` por item.
- **Entrada raíz "Inicio" en el sider**: nuevo item `{ key: '/inicio', icon: <DashboardOutlined />, label: 'Inicio' }` antepuesto a la lista para todos los roles autenticados (sin filtro de `allowedGlobalRoles` — todo usuario logueado tiene página personal). Click → `onNavigate('/inicio')`. La landing ya existía desde v0.30.15 pero solo se llegaba via redirect del root; ahora hay acceso directo desde cualquier ruta.
- **Tests `sider-config.test.js`** actualizados al nuevo conteo (5 items para admin en vez de 4, 3 para editora con un proyecto en vez de 2, 2 para editora sin proyectos en vez de 1) y dos casos nuevos: `disabled:true` propaga al item y a sus hijos sin `onClick`; click en `/inicio` dispara `onNavigate('/inicio')`. 20/20 pasan.

---

## [0.30.17] - 2026-04-28

### Admin (admin) — bridge de `message` para suprimir warning antd `[antd: message]`

- **`<App>` static functions can not consume context like dynamic theme**: el warning aparecía cada vez que un componente importaba `import { message } from 'antd'` en una app envuelta por `<AntApp>`. Migrar los 35 archivos a `App.useApp().message` era invasivo. Solución: bridge.
- **Nuevo `shared/services/message.js`**: proxy con métodos `success/error/warning/info/loading/open/destroy` que delega en un `messageApi` cargado en runtime. Si se llama antes del mount, encola y dispara cuando llega.
- **Nuevo `app/MessageBridge.jsx`**: dentro de `<AntApp>` llama `App.useApp()` y guarda el `message` instance en el módulo via `setMessageApi`. Renderiza `null`.
- **`app/providers/MainProvider.jsx`**: monta `<MessageBridge />` dentro de `<AntApp>`, antes del `<Outlet />`.
- **Migración mecánica de imports**: 35 archivos (.jsx y .js) bajo `src/features/`, `src/shared/hooks/` y demás, ahora importan `import { message } from '@shared/services/message'` en vez de `from 'antd'`. El proxy mantiene el mismo API, no hace falta tocar lógica.

### Backend (api) + visor — borradores visibles en el visor en dev

- **`/api/mapalab/home`** ahora sirve `payload_draft` cuando `settings.environment != "production"` (antes siempre `payload_published`). En prod sigue devolviendo solo lo publicado.
- **`PUT /home/{key}`** dispara `notify_home_changed()` también al guardar borrador en dev (antes solo al publicar). En prod queda intacto: el cache solo se invalida al publicar. La condición es `settings.environment != "production"`.
- Resultado: en dev, guardar borrador y refrescar el visor ya muestra los cambios sin necesidad de pulsar "Publicar". En prod, el flujo de revisión sigue protegido — el visor nunca expone borradores.

### Admin (admin) — Tag dinámico "Borrador → Publicado"

- **`features/mapalab-home/pages/HomePage.jsx`**: el `<Tag color="blue">Borrador → Publicado</Tag>` estático que no informaba nada se reemplaza por:
  - `<Tag color="green">Todo publicado</Tag>` cuando `JSON.stringify(payloadDraft) === JSON.stringify(payloadPublished)` para todas las secciones.
  - `<Tooltip><Tag color="orange">N sin publicar</Tag></Tooltip>` cuando hay diferencias. El tooltip lista los labels de las secciones (Banner, Guía, Footer…). Click en el tag hace `setActiveKey` al primer tab con cambios.
- Cálculo en `useMemo([secciones])`. Movido arriba del early return de `reviewMode` para no romper la regla de hooks.

---

## [0.30.16] - 2026-04-28

### Admin (admin) — antd deprecations + 404 ruidosos en useResourceDraft

- **`<Space direction>` → `<Space orientation>`**: 65 ocurrencias renombradas en bloque (sed) en `features/`, `shared/` y `app/`. antd >=5 marca `direction` como deprecated en `Space` (no afecta a otros componentes que usan `direction`, como `Drawer`).
- **`<Tabs tabPosition>` → `<Tabs tabPlacement>`**: en `mapalab-home/pages/HomePage.jsx`. Misma deprecación de antd.

### Backend (api) + Admin (admin) — borradores existence-check sin 404

- **`GET /borradores/{resource_type}/{resource_id}`** ahora devuelve `200 null` cuando el usuario no tiene un borrador para ese par. Antes devolvía `404`, lo que era el flujo normal pero llenaba la consola del browser de errores rojos al abrir cualquier sección de Inicio o un evento. `response_model` cambió a `BorradorResponse | None`.
- **`shared/hooks/useResourceDraft.js`** ahora trata `res.data === null` como "no draft": no llama `setHasDraft`, no muestra `message.info`, no aplica `onApplyDraft`. El `try/catch` queda por si el endpoint falla por otro motivo (sin sesión, etc.).

---

## [0.30.15] - 2026-04-28

### Backend (api) + Admin (admin) — landing de Inicio (bandeja personal + atajos)

- **Backend `app/api/routes/borradores.py`**: nuevo endpoint `GET /borradores/mios` que devuelve los borradores del `current_user` (todos los estados, ordenados por `actualizado_en desc`). El de `/pendientes` ya existía y queda intacto.
- **Admin `features/inicio/`** (nuevo feature module):
  - `pages/InicioPage.jsx` con tres bloques apilados:
    1. *Header* con saludo al usuario y rol.
    2. *Alerta* roja si el usuario tiene borradores rechazados (con cantidad).
    3. *Card de revisión* (solo `tetlamamakani`) si hay pendientes globales — link directo a `/revision`.
    4. *Tabla "Mis borradores"* con columnas tipo / recurso / estado / última edición / continuar. Empty state sugiere editar el Inicio o crear un evento.
    5. *Atajos*: grid responsive (`auto-fit, minmax(220px, 1fr)`) con cards a `mapalab/home`, `mapalab/eventos`, `media`, y `revision` (admin-only).
  - `api/inicioService.js` con `getMisBorradores()` y `getBorradoresPendientes()`.
- **Admin `main.jsx`**: cambia `<Navigate to="menu" replace />` → `<Navigate to="inicio" replace />` (la ruta `/menu` quedó inconsistente al deshabilitar el proyecto Portalito en el sider). Nueva ruta `inicio` registrada con `lazy(() => import('@features/inicio'))`.
- Tests: 18/18 ✓ (sin tests nuevos para la página — el feature es UI presentacional sobre datos del backend).

---

## [0.30.14] - 2026-04-28

### Admin (admin) — picker de Media: auto-discovery de carpetas + textos

- **`BucketFilePicker`**: `prefixes` ahora es opcional. Si no se pasa, el componente lista todo el bucket una sola vez al abrir y deriva los tabs de las carpetas top-level encontradas (`Set` de `name.split('/')[0] + '/'`). Al cambiar de tab se filtra en frontend, sin segundo request. Si `prefixes` se pasa explícitamente (caso `LayerMetadataSection` con `metadata/txt/`, `metadata/xlsx/`), se respeta el override. El tab "Raíz" pasó a llamarse "Todo" y el placeholder vacío a "Sin archivos en esta carpeta".
- **Pickers afectados** (eliminado `prefixes` hardcodeado, ahora auto-discover):
  - `mapalab-home/components/ImageUrlField.jsx` — antes `['home/', 'eventos/iconos/', 'iconos/', '']`. Razón del bug del banner: las imágenes del seed estaban subidas en `webp/` y `svg/`, ningún tab las cubría.
  - `mapalab-eventos/components/EventoIconPicker.jsx` — antes `['eventos/iconos/', 'iconos/', '']`.
  - `mapalab-layers/components/layersEditor/TemaIconField.jsx` — antes `['svg/temas/', 'svg/']`.
- **Renombres UI** (mantiene los slugs/keys internos):
  - Botón `Bucket` → `Media` en `ImageUrlField`, `EventoIconPicker`, `TemaIconField`.
  - `MediaPage` Select placeholder `Bucket` → `Media`.
  - `LayerMetadataSection`: mensaje `Bucket mapalab no disponible` → `Media mapalab no disponible`; link `Administrar todos los archivos del bucket →` → `Administrar todos los archivos →`.
  - Sider `mapalab/home`: label `Home` → `Inicio`.
  - `HomePage` título `Home MapaLab` → `Inicio MapaLab`.
- **Tests**: `BucketFilePicker.test.jsx` actualizado — el tab change ahora valida que NO refetcha (el flujo es 1 request inicial + filtrado en frontend); nuevo caso para auto-discovery de tabs.

---

## [0.30.13] - 2026-04-27

### Infra (compose) — `mariachi-api-dev` conectado a la red del acervo local

- **`docker-compose.dev.yml`**: el servicio `api` ahora se une también a `acervo_network_dev` (red externa que crea el repo `iieg-oficial/acervo`, named `acervo-dev_acervo_network_dev`). Antes el container vivía solo en `mariachi_network_dev` + `dataengine-network` y no podía resolver `acervo-minio-dev` por DNS, lo que dejaba colgado al MinIO client del backend en el `bucket_exists()` inicial cuando se apuntaba el `.env.development` al MinIO local. Mismo patrón ya usado para `mapalab-network`.
- Para correrlo localmente: arrancar primero `iieg-oficial/acervo` (`docker compose -f docker-compose.dev.yml up -d`) — esto crea la red externa — y luego `mariachi`.

---

## [0.30.12] - 2026-04-27

### Infra (env) — opción acervo MinIO local en `.env.development.example`

- **`.env.development.example`**: bloque de comentarios sobre `ACERVO_ENDPOINT` con dos opciones documentadas. Opción A (default actual) apunta a un acervo remoto IIEG; Opción B apunta al `acervo-minio-dev` que ya levanta `docker-compose.dev.yml` en `:9000`. Incluye los `mc` para crear los buckets `portal` y `mapalab` y darles anonymous download (necesario para servir imágenes desde el navegador). No cambia el default — cada dev decide cuándo migrarse a local.

---

## [0.30.11] - 2026-04-27

### Backend (api) — migración: URLs del Acervo a forma relativa

- **Nueva migración `e3f4a5b6c7d8_normalize_acervo_urls_to_relative`**: recorre `eventos.icono_url/imagen_url`, `home_sections.payload_published/payload_draft` y `pages.sections`, reemplazando `https://{ACERVO_PUBLIC_ENDPOINT}/{bucket}/{path}` → `bucket/path`. Idempotente: filas ya normalizadas y URLs externas (otro host) no se tocan. `downgrade()` reconstruye absoluto usando el endpoint y el scheme actuales del settings, también idempotente sobre filas que ya tienen scheme.
- **No incluye `layers.icon_url`**: la tabla `layers` vive en el schema `mapalab` de la base DataEngine y sus migraciones se gestionan en el repo `mapalab-dataengine`. La normalización en runtime (commit anterior) hace que cualquier escritura nueva guarde relativo; los datos legacy se servirán correctamente porque `to_absolute` deja pasar los absolutos sin tocar.

---

## [0.30.10] - 2026-04-27

### Backend (api) — URLs del Acervo guardadas como relativas

- **Nuevo `app/core/acervo_url.py`**: helpers `to_relative` y `to_absolute` (ambos idempotentes y tolerantes a hosts externos), más `to_relative_in` / `to_absolute_in` para recorrer recursivamente dicts/listas tocando solo claves que terminan en `_url` / `Url`. La forma persistida es `bucket/object_path` (sin scheme); la URL se reconstruye con `ACERVO_PUBLIC_ENDPOINT` y `ACERVO_USE_SSL` al serializar la respuesta. URLs con un host distinto al endpoint del acervo se conservan tal cual (escape para imágenes externas).
- **`app/services/acervo.py`**: `upload_file` y `get_file_url` ahora delegan en `to_absolute(f"{bucket}/{object}")`. Mismo string final, una sola fuente de verdad.
- **Schemas (`evento`, `home_section`, `layer`, `page`)**: se añadieron `field_validator(mode='before')` con `to_relative` para normalizar lo que entra (admin sigue mandando absoluto, se guarda relativo) y `field_serializer(when_used='json')` con `to_absolute` para devolver absoluto al cliente. `model_dump()` (sin `mode='json'`) sigue devolviendo el valor relativo, lo que mantiene intactos los flujos internos que persisten dicts en JSON columns (ej. `_validate_payload` en `routes/home.py`). Para los blobs `HomeSectionResponse.payload_*` y `PageBase.sections` se aplica el helper recursivo.
- Compatibilidad: como ambos helpers son idempotentes, código cliente y datos viejos siguen funcionando sin migración. La normalización de datos existentes va en otra revisión.

---

## [0.30.9] - 2026-04-27

### CI (infra) — fix backend pytest

- **`.github/workflows/test-backend.yml`**: el step `Tests` ahora declara explícitamente las 23 variables de entorno que `pydantic-settings` exige al instanciar `Settings()` (`PROJECT_NAME`, `VERSION`, `DATABASE_URL`, `SECRET_KEY`, etc.). En CI no hay `.env.*`, por lo que `tests/conftest.py` rompía con `ValidationError: 23 validation errors for Settings` al hacer `from app.core.database import Base` (que llama `get_settings()` a nivel de módulo). Valores son fakes de test: `DATABASE_URL=sqlite:///:memory:`, `CORS_ORIGINS=["http://localhost:3000"]`, secrets dummy. La lint step queda intacta.

---

## [0.30.8] - 2026-04-27

### Admin (admin) — fix dead-code check (knip)

- **`admin/knip.json`** (nuevo): configuración mínima para `npm run check:dead-code:strict`. Define `project: src/**/*.{js,jsx}`, lista en `ignore` los archivos legacy del rediseño de portal-pages (font selectors, SEOAnalyzer/TemplateSelector, hooks de búsqueda, `AddSieejDependenciaPage`, `NavigationMenu`, `auth/index.js`) que aún no se referencian desde `main.jsx` pero se conservan, declara `lint-staged` y `msw` en `ignoreDependencies` (devDeps en uso por hooks/tests no detectables por análisis estático) y activa `ignoreExportsUsedInFile` para que knip no marque named exports consumidos solo internamente (caso `BannerEditor..FooterEditor` referenciados desde `SECTION_REGISTRY` en el mismo archivo).
- **`features/mapalab-home/api/homeService.js`**: removida `getSeccion` (sin callers; el caso de uso quedó cubierto por `listSecciones` y la API admin del home).
- **`features/portal-menu/utils/menuUtils.js`**: removida `findAllChildren` (sin callers; el menú ya hace borrado en cascada vía `parentId` desde el backend).

---

## [0.30.7] - 2026-04-27

### Admin (admin) — fix lint CI

- **`eslint.config.js`**: añadidos al override `max-lines: off` los archivos preexistentes que ya superaban 300 líneas y no son objetivo de refactor en este PR — `EventoEditPage.jsx`, `sectionEditors.jsx`, `HomePage.jsx` (mapalab-home), `LayersTreeSider.jsx`, `CqlFilterBuilder.jsx`, `InfoBoxBlocksEditor.jsx`, `LayerMetadataSection.jsx`, `LayerStatsSection.jsx`. Mantiene la regla activa para nuevo código.
- **Indent (`eslint --fix`)**: corregida indentación en `EventoEditPage.jsx` (literal de bbox dentro de ternario) y `RevisionQueuePage.jsx` (anidado en mensaje de rechazo).
- **`no-unused-vars`**:
  - `InfoBoxPreview.jsx`: removida prop `template` (no usada por ningún caller).
  - `LayerMetadataSection.jsx` + `LayerEditPage.jsx`: removida prop `currentNodeType` (sin lectura).
  - `LayerStatsSection.jsx`: `catch (err)` → `catch` y eliminada función muerta `importLegacyValuesAsStatic` (24 líneas).
  - `MediaPage.jsx`: eliminado objeto `stats` computado nunca consumido.
- **`jsx-a11y`**:
  - `LayersTreeSider.jsx`: el `<span>` clickeable de cada nodo del árbol ahora declara `role="button"`, `tabIndex` (0/-1 según `disabled`) y `onKeyDown` que dispara la edición con Enter/Espacio.
  - `MediaPage.jsx`: convertidos a `<button type="button">` los breadcrumbs (Raíz + segmentos), el thumbnail de carpetas y la celda de nombre cuando es carpeta. El cell de nombre vuelve a ser `<div>` cuando el row es archivo (sin click handler).

---

## [0.30.6] - 2026-04-27

### Backend (api) — fix lint CI

- **Imports ordenados (`I001`)**: ruff falló en CI por bloques de imports sin ordenar en `app/api/routes/auth.py`, `app/models/home_section.py`, `app/schemas/__init__.py` y `app/schemas/home_section.py`. Auto-fix con `ruff --fix`.
- **`tests/test_sieej_formularios.py`**: removidos `CatalogoCategoriaDatos` y `CatalogoEjesEstrategicos` (imports sin uso, `F401`); renombrada variable local `SessionLocal` → `session_factory` para cumplir `N806` (snake_case en funciones).

---

## [0.30.5] - 2026-04-27

### Backend (api) — fix split layers

- **`routes/layers/`**: el parent router tenía `prefix='/layers'` y los sub-routers prefix vacío. FastAPI 0.111 valida que un router con prefix vacío no tenga endpoints con path vacío (`@router.post('', ...)` en `crud.create_layer`), y al arranque tiraba `Prefix and path cannot be both empty`. Movido el `prefix='/layers'` a cada sub-router (`crud`, `aliases`, `slugs/'/layers/slugs'`); el parent solo conserva tags y dependencies. Paths HTTP finales sin cambio.

---

## [0.30.4] - 2026-04-27

### Backend (api) — fix Alembic

- **Nueva migración `d2e3f4a5b6c7_add_disabled_to_menu_items`**: añade columna `menu_items.disabled` (Boolean, default `false`). El modelo `MenuItem` la declaraba desde antes pero la migración 001 nunca la creó y ninguna intermedia la añadió, así que `init_db.py` rompía al seedear los menu items con `column menu_items.disabled does not exist`.

---

## [0.30.3] - 2026-04-27

### Backend (api) — proxy/gateway awareness

- **`api/scripts/start_backend.sh`**: uvicorn arranca con `--proxy-headers --forwarded-allow-ips='*'`; gunicorn con `--forwarded-allow-ips='*'`. Antes el API ignoraba `X-Forwarded-Proto`/`X-Forwarded-For` y `request.url.scheme` siempre era `http` aunque el cliente viniera por HTTPS desde el gateway.
- **`nginx/conf.d/mariachi.conf`**: nuevos `map` para `$forwarded_proto` y `$forwarded_host` que preservan los headers que ya envió el gateway externo. Antes `proxy_set_header X-Forwarded-Proto $scheme;` sobrescribía con `http` el `https` que venía de afuera.
- **`nginx/nginx.conf`**: añadido `set_real_ip_from` para los CIDRs privados (`10/8`, `172.16/12`, `192.168/16`) + `real_ip_header X-Forwarded-For` + `real_ip_recursive on`. Resultado: `$remote_addr` en logs es el IP real del cliente, no el del último hop interno (gateway-hub).
- **`docs/context.md`**: nueva sección "Cadena de proxy" documentando la topología `cliente → gateway-hub → mariachi-nginx → mariachi-api` y las implicaciones para headers, cookies y CORS.

### Backend (api) — fix Alembic

- **Migración `ee37ba52b458_add_publication_requests`** convertida en no-op. Original creaba `publication_requests` con FK a `drafts`, tabla que nunca llegó a la rama main (se renombró a `borradores` entre el 9 y el 18 de feb 2026). Cero referencias en código a `publication_requests`. La migración rompía `make up ENV=dev` en BDs frescas (`relation "drafts" does not exist`). El revision id se preserva por linealidad de la cadena.

---

## [0.30.2] - 2026-04-27

### Backend (api) — multi-worker safety

- **`services/mapalab_public_cache`** debounce migrado de `threading.Timer` a Redis `SET NX EX 5`. Antes, en producción con N workers de Gunicorn, cada worker mantenía su propio timer y la ventana de debounce no era global; ahora el primer notify dentro de cualquier worker bumpea inmediatamente y los siguientes 5s quedan deduplicados a través de Redis. Semántica: "first-call-wins" en vez de "last-call-after-delay" — el cache se invalida al primer cambio, no al último.
- **`api/rate_limit`** migrado de `dict[str, list[float]]` en memoria a Redis sorted set por usuario (sliding window real). `ZADD now`, `ZREMRANGEBYSCORE -inf cutoff`, `ZCARD` en pipeline atómico. Antes el límite era per-worker (con N workers, el techo real era N * max_requests). Ahora es global. `Retry-After` derivado del miembro más antiguo del set.
- Si Redis falla (`pipe.execute()` lanza), el rate-limit hace fail-open (deja pasar) y emite warning; preferible a tirar el endpoint cuando Redis tiene problemas transitorios.

### Backend (api) — limpieza

- **`routes/projects.py`**: deps anónimas `_:` y `__:` reemplazadas por `_csrf` / `current_user` / `_admin` (legibles). Patrón de seguridad alineado con el resto de routers (CSRF como dep aparte, autorización via `Depends(_require_admin)`).

---

## [0.30.1] - 2026-04-27

### Backend (api)

- **`routes/layers.py` partido** en paquete `routes/layers/` con 4 módulos:
  - `crud.py` (214 líneas): workspaces, initial-order, CRUD, reorder, bulk-tags, duplicate.
  - `aliases.py` (91 líneas): `/{layer_id}/aliases` (list/create/delete).
  - `slugs.py` (60 líneas): `/slugs/suggest` y `/slugs/bulk-generate`.
  - `_deps.py` (20 líneas): helpers compartidos (`require_admin`, `require_project_editor`, `write_rate_limit`, `map_domain_errors`).
  - `__init__.py` (14 líneas): router parent con prefix `/layers`, tags y `require_project_access('mapalab')`.
- Antes: 1 archivo de 346 líneas. Ahora: ningún archivo de routes excede 215 líneas.
- Sin cambios de contrato HTTP — todos los paths, métodos, status codes y schemas se preservan.

---

## [0.30.0] - 2026-04-27

### Backend (api) — refactor estructural

- **Nuevos services** que absorben lógica antes mezclada en routers:
  - `services/presence.py`: helpers `register()` / `list_others()` para presencia colaborativa via Redis. Sustituye 3 implementaciones casi idénticas en `routes/{eventos,pages,home}.py`.
  - `services/borrador_service.py`: registry `APPLIERS` (evento, home_section, layer) + `apply_borrador()`. Reemplaza el `if/elif/else` por `resource_type` que vivía en `routes/borradores.py:aprobar_borrador`.
  - `services/media_service.py`: serializadores (`serialize_media`, `serialize_bucket_only`), listado fusionado bucket+BD, `resolve_bucket_or_403`, `ensure_folder_exists`, `guess_mime`.
  - `services/menu_tree.py`: `build_menu_tree()` ahora único, antes duplicado entre `routes/menu.py` y `routes/public.py`.
  - `core/optimistic.py`: helper `check_concurrent_edit(db_ts, expected_ts, detail)` para concurrencia optimista (HTTP 409 por `updated_at`). Reemplaza el patrón `replace(tzinfo=None) + abs(...) > 2` repetido en eventos, pages y home.

### Backend (api) — limpieza

- **Routers más finos**:
  - `routes/borradores.py`: 327 → 211 líneas (delegación a `borrador_service`).
  - `routes/media.py`: 357 → 169 líneas (delegación a `media_service`).
- **Autorización declarativa**: reemplazo de checks `if current_user.role != 'tetlamamakani'` por `Depends(require_role([...]))` en `routes/users.py` (crear, eliminar, resetear contraseña, agregar dependencia SIEEJ) y `routes/borradores.py`. Mantenidos los checks híbridos (admin O dueño) y los filtros de query por rol (lógica de negocio, no autorización).
- **`api/deps.py`**: `_user_memberships` → `list_user_memberships`, `_user_accessible_buckets` → `list_user_accessible_buckets` (públicos para reuso desde `auth.py`).
- **Modernización**: migrado `datetime.utcnow()` (deprecado en 3.12) a `app.core.time.utcnow` en `models/layer.py`, `models/sieej/*`, `services/sieej/*`. Tipado actualizado a sintaxis PEP 604 (`list[T]`, `T | None`) en módulo SIEEJ y `services/acervo.py`.
- **Logging seguro**: `routes/media.py:subir_archivo` ya no expone `str(e)` en el detail HTTP; usa `logger.exception` para el stack y mensaje genérico al cliente.

### Fix

- **`/autenticacion/iniciar-sesion`** ahora incluye `projects` en `LoginResponse.user`. Antes el `UsuarioResponse.model_validate(usuario)` devolvía `projects=[]` porque el modelo SQLAlchemy no expone ese atributo; el frontend tenía que pegar a `/perfil` después del login para hidratar membresías.

---

## [0.29.1] - 2026-04-27

### Infra

- **`docker-compose.yml`**: default de `env_file` cambia de `./.env` a `./.env.staging`. El `.env` raíz era ambiguo (en realidad contenía valores de producción) y se renombró a `.env.production`. Si falta `API_ENV_FILE`, ahora se cae en staging (más seguro que producción) — alineado con el `Makefile` que ya resolvía por `ENV`.
- **Limpieza**: borrados `nginx/.env` (no consumido por nadie — la conf interna de nginx tiene los valores hardcoded y el Dockerfile no carga el archivo) y `api/.env` huérfano (0 bytes, owner root, materializado por un bind-mount fallido).

---

## [0.29.0] - 2026-04-26

### Admin (admin/) — Home v2 + presencia + drafts

- **Home v2**: rediseño del dashboard del editor mapalab. Nuevo `LayerIdsField` que resuelve y muestra capas por id desde el árbol del backend. Hooks de borrador (`useDraftHooks`) integrados en formularios con autosave + indicador "Guardado / Hay cambios".

### Backend (api) — colaboración en tiempo real

- **Presencia** (Redis): endpoints `PUT/GET /{resource}/{id}/presencia` para `pages`, `eventos` y secciones `home`. TTL 30s, key `presencia:{scope}:{id}:{username}`. Permite mostrar quién más está editando el mismo recurso.
- **Concurrencia optimista**: campo `expected_updated_at` en payload de update; el backend devuelve 409 si el timestamp en BD difiere por más de 2s.
- **Aprobación de borradores extendida**: `borradores/por-id/{id}/aprobar` ahora aplica también `evento` y `home_section` (antes solo `layer`). Cada flujo dispara su `notify_*_changed()` para invalidar caches públicos.

### Backend (api) — integración mapalab

- **Cliente shares** (`services/mapalab_shares.py`): `POST /mapalab-shares` proxy autenticado al backend de mapalab para crear/pinear shares permanentes.
- **Cache version público**: `GET /api/mapalab/cache-version` devuelve tokens por scope (`eventos`, `home`) que el visor usa para revalidar. `services/mapalab_public_cache._schedule()` con debounce 5s antes de bumpear el token.

---

## [0.28.0] - 2026-04-26

### Mapalab admin

- **Banner contextual en eventos**: aviso visual en el listado/edición de eventos del visor mapalab.
- **Iconos custom en temas**: soporte para subir/asignar iconos por tema desde el editor.
- **Modal de creación en layers**: nuevo flujo para crear capas sin salir del listado.

---

## [0.27.0] - 2026-04-26

### Mapalab admin

- **Editor de eventos** (CRUD): listado, creación, edición, publicación/despublicación. Schema `Evento` con BBox, capas referenciadas, fechas activas, slug.
- **Home del visor** (`HomeSectionsPage`): editor de las secciones publicables del home (banner, topics, guide, select, faq, video, footer) con publish/discard y preview pre-publicación.

---

## [0.26.0] - 2026-04-26

### Editor de capas (admin/mapalab-layers)

- **Política de visibilidad por nodeType** (`constants/nodeTypes.js`):
  - `FIELD_VISIBILITY` y `TAB_VISIBILITY` declarativos. Helpers `isFieldVisible`, `isTabVisible`.
  - `slug` y `alias` solo visibles para `group` y `leaf` (no para `tema`/`category`/`label` — no son activables por URL).
  - `searchTags` solo para `group`/`leaf`. Tabs Servicios/InfoBox/Metadatos solo para `group`/`leaf`.
  - Banner contextual (`NODE_TYPE_HELP`) explicando por qué cada tipo de nodo tiene menos campos.
- **InfoBox blocks editor** (`InfoBoxBlocksEditor.jsx`, NUEVO): editor visual por bloques que reemplaza al template selector + `InfoBoxPresetForm` + `InfoBoxJsonEditor` (los dos últimos eliminados, en BD nadie usaba `infobox_template`). Bloques: `headerField`, `labelGroups` (con `staticValues` y `fields` con styling propio anidado), `cards` (con `decimals`), `list`, `iconText`, `text`. Reorden con flechas ↑/↓ persistido en `blockOrder`. Herencia desde el group ancestro: si un leaf no tiene config propia y el group sí, banner verde "Heredando de X" + botón "Personalizar para esta capa" con `Modal.confirm`. En group: banner azul "se hereda a los hijos sin config propia". Botón "Quitar personalización y volver a heredar" con confirmación.
- **CQL filter builder** (`CqlFilterBuilder.jsx`, NUEVO): modo Constructor (rows campo/operador/valor combinables con AND/OR, autocomplete de valores reales con `?include_samples=true`) y modo Texto avanzado (TextArea monospace + tags clickeables de campos disponibles). Parser bidireccional para CQL simples; tag amarillo "no parseable al constructor" cuando aplica.
- **WMS group field** (`WmsGroupField.jsx`, NUEVO): Select puro con grupos existentes en el árbol, agrupados por "Grupos en hermanos directos" / "Otros grupos en el árbol" / "Valor actual (sin otras capas asignadas)" para legacy. Chips con miembros del grupo (color azul si comparten rama, gris si no) + tooltips con workspace/capa GS/rama. Warnings cuando workspace, rama o `timeEnabled` difieren entre miembros.
- **Servicios condicional para groups** (`GroupServicesReference.jsx`, NUEVO): si nodeType es `group` sin workspace propio, la tab Servicios muestra banner explicando que el group es agrupador (no capa WMS) + tags resumen (N hijas, feature type compartido, wms_group) + tabla read-only con cada capa hija (label, feature type, CQL truncado) + botón ✏ para editar el CQL de cada hija directo.
- **`InfoBoxPreview` reescrito** para renderizar el `infobox_config` real (no el shape viejo de template+params). Soporta `staticValues`, `decimals` en cards, glifos para iconText, headerField con detección literal vs campo. Respeta `blockOrder`.
- **`LayerEditPage`**: helpers `sharedFeatureTypeFromDescendants` (deriva `salud:unidades_salud` para groups como `establecimientos_salud`), `inheritedInfobox`, `countSiblingsSharingFeatureType`. Tab Metadatos resuelve el `layerKey` correcto automáticamente para groups, mostrando banner verde "este nodo no tiene feature type propio, pero todos sus descendientes usan el mismo".
- **Tab Servicios** ampliada con periodicidad: `timeEnabled` (con descripción de ImageMosaic), `defaultDate` (acepta `latest` o año, normaliza a `{year}` o string), `timeStylePattern`, `hidePeriodicity`.
- **`LayerAliasesSection`**: Form interno aislado con `component={false}` para evitar nested HTML form (causaba reload de página). Tags morado institucional `#5C2472` con padding y radius.
- **`LayersTreeSider`**: árbol auto-expandido cuando no hay capa seleccionada; respeta interacción manual del usuario via `userTouchedExpansion`. `expandAction="click"` para expandir desde cualquier parte del nodo. Estado preservado al colapsar el sider (`display:none` en lugar de unmount).
- **Etiquetas de búsqueda** como pills naranja `#FF8300` (`Select mode="tags"` con `tokenSeparators=[' ', ',']`, normalización lowercase + dedup). Soporta múltiples palabras simultáneas separadas por espacio.
- Estilos SLD/Workspace/Capa GeoServer con fallback al value actual cuando aún no llegan las opciones async (evita pérdida visual de la selección).
- Breadcrumb completo: cadena de ancestros desde la raíz hasta la capa actual, cada uno navegable.

### Metadatos descriptivos

- **`LayerMetadataSection.jsx` refactor completo**:
  - **Multi-fuente**: `fuentes` ahora es array editable con `Form.List` (cards anidadas por fuente). Schema backend acepta `list[Fuentes] | Fuentes | None` (backwards-compat con BD que tiene objeto). Normalización a array al guardar.
  - **Multi-metodología**: misma idea para `metodologia`.
  - **Texto personalizado del enlace** por fuente (`enlace_label`): si vacío, mapalab usa "Ver fuente" / "Fuente N" como hoy.
  - **Referencias cartográficas**: nueva sección con `tipo_mapa` (Select IIEG/INEGI), `tipo_mapa_enlace`, `texto_leyenda`, `link_final_capa`. Quitado `tarjeta_punto_poligono` (no usado por mapalab).
  - **Frecuencia de actualización** ahora es `Select` con catálogo extendido (17 opciones: Diaria, Semanal, Quincenal, Mensual, Bimestral, …, Decenal, Continua, Bajo demanda, No programado, Histórico). Preserva valores legacy con etiqueta "(valor previo)".
  - **Descripciones (`extra`)** en cada Form.Item de metadata.
  - Reordenado para coincidir con el panel de Detalles del visor mapalab (`LayerInfoSections.jsx`): Información general → **Estadísticas** → Fuentes → Metodología → Refs cartográficas → Archivos adjuntos.
  - Banner adaptativo según `derivedFromDescendants`/`siblingsSharingCount`: explica si la metadata se hereda del feature type común o se comparte con N hermanas.
  - Bug fix: `setFieldsValue` se mueve a `useEffect` separado tras `loading=false` para garantizar que los Form.Items estén montados al precargar.
  - Bug fix: lectura del alias `fechaUltima` (camelCase del backend) además de `fecha_ultima`.

### Estadísticas (numeralia)

- **`LayerStatsSection.jsx`** (NUEVO): editor de hasta 8 slots con tres modos por slot:
  - **Estático**: valor literal (uso típico para datos no automatizables).
  - **Operación simple**: `count`, `count_distinct`, `count_where`, `sum`, `avg`, `min`, `max`, `latest`. Selector de columna desde GeoServer.
  - **Fórmula**: combinatoria recursiva (`add`, `sub`, `mul`, `div`, `percent`, `percent_change`) hasta 6 niveles de profundidad. Cada lado puede ser primitiva, otra fórmula, o literal.
  - Por slot: nombre, símbolo, formato (entero/decimal/porcentaje/MXN/compacto), botón "Probar" (preview en vivo via endpoint POST `/stats/preview`), eliminar.
  - Preview en vivo con resultado real ejecutado contra la BD.
  - **Auto-import de valores legacy**: si `stats_config` está vacío y hay `values` (típico import del Sheet original ya descontinuado), se precargan como slots estáticos editables. Banner azul informativo.
  - **Pie de numeralia** con regla forzada: si no empieza con `*`, se prefija automáticamente al guardar.
  - **Cache TTL** con selector de unidad (min/horas/días) — internamente siempre minutos. Descripción detallada del comportamiento del cache.
  - Botón "Recalcular valores ahora" → endpoint POST `/stats/refresh` que ejecuta todas las queries y persiste resultados.

### Media manager (admin/media)

- **Vista Explorador** (`MediaPage.jsx`): navegación tipo file system en lugar de lista plana.
  - Nuevo state `currentPath` reemplaza al viejo selector "Carpeta".
  - Breadcrumb navegable (`🏠 Raíz / metadata / txt`) con cada parte clickeable.
  - Carpetas (con icono naranja folder) primero en la tabla y grid; click entra adentro.
  - Search activa modo recursivo automáticamente; al limpiar vuelve al modo carpeta del nivel actual.
  - Bucket por defecto = `mapalab` (el único con datos reales).
  - Estadísticas globales del bucket (recursivas) en lugar de solo el nivel actual. "Documentos" ahora cuenta PDF, Word, Excel, PowerPoint, TXT, CSV, JSON, XML, GeoJSON.
- **Modal `BucketFilePicker`** responsive 95%×alto, sin scroll horizontal (`tableLayout="fixed"` + `wordBreak`), header (Tabs + Search) y paginación sticky. Columnas adaptativas (Tamaño oculto en mobile, Modificado eliminada por innecesaria — un archivo por capa, sin versionado). Título "Elegir archivo".
- **`BucketFileUploader.jsx`** (NUEVO): modal de upload directo al bucket desde el editor de capa. Dropzone, selector de carpeta destino, progress %. Tras upload, agrega entrada al `Form.List name="metadato"` con path **relativo** (no URL absoluta de MinIO local — portable entre entornos).
- Botón "Subir archivo nuevo" + link "Administrar todos los archivos →" en la sección Archivos adjuntos del editor de capa.

### Backend (api)

- **`stats_templates.py` extendido**: nuevo tipo `formula` con expresión recursiva (combinator `add`/`sub`/`mul`/`div`/`percent`/`percent_change`) sobre primitivas. Validación whitelist estricta. Soporta `static`. Helper `execute_stat` evalúa cualquier tipo.
- **Nuevos endpoints en `layer_metadata.py`**:
  - `POST /layer-metadata/{key}/stats/preview` — evalúa una sola operación contra la BD sin persistir.
  - `POST /layer-metadata/{key}/stats/refresh` — ejecuta todas las stats configuradas y persiste `values` + `values_refreshed_at`.
- **Bug fix CRÍTICO de routing** (`layer_metadata.py`): los endpoints `/{layer_key:path}/stats*` se reordenaron para declararse ANTES del catch-all `/{layer_key:path}`. FastAPI evalúa rutas en orden y `:path` matchea barras, por lo que el endpoint genérico absorbía rutas como `/salud:unidades_salud/stats` (resolvía `layer_key="salud:unidades_salud/stats"` y respondía 404). Comentario in-line en el archivo para que no vuelva a ocurrir.
- **`schemas/layer_metadata.py`**: `Fuentes` ahora con `enlace_label`. `LayerMetadataBase` y `LayerMetadataUpdate` aceptan `list[Fuentes] | Fuentes | None` y `list[Metodologia] | Metodologia | None`. `StatsConfigItem` extendido con `value`, `expression`, `schema_`, `table`, etc.
- **`layer_metadata.update_metadata`**: normaliza `fuentes` y `metodologia` a array al persistir, descartando entradas vacías. Acepta tanto objeto como array entrantes (backwards-compat).
- **`media.py` listar_media**: ahora **lista los objetos físicos del bucket MinIO como fuente principal** y los enriquece con la tabla `media` cuando existe registro local. Si un objeto físico no tiene registro local (caso típico legacy), se sintetiza con `id="bucket:{N}:{path}"`, `bucketOnly: true`, mime inferido, `isDir` para directorios. Soporte `recursive: bool` (default false para vista explorador con dirs).
- **`media.py` eliminar_archivo**: soporta IDs sintéticos `bucket:N:path` (borra del bucket sin requerir registro local) y los IDs numéricos legacy.
- **`media.py` subir_archivo**: ahora usa el `folder` como prefix real en el bucket (`metadata/txt/{uuid}.{ext}` en lugar de raíz). Auto-crea la entrada en `media_folders` si no existe (satisface FK sin error).
- **`acervo.list_objects`**: nuevo flag `is_dir` por objeto (objetos terminados en `/` cuando recursive=false son directorios virtuales).

### Eliminado

- `InfoBoxJsonEditor.jsx` y `InfoBoxPresetForm.jsx` (reemplazados por `InfoBoxBlocksEditor`).
- Campo "Tipo de tarjeta (geometría)" del editor de metadata (no consumido por mapalab).
- Tabs separadas "Servicio WMS" y "Descarga" — fusionadas en una sola tab "Servicios".

---

## [0.25.11] - 2026-04-25

### Corregido

- **Botón "Sugerir" del slug no llenaba el Input** — el `Form.Item name="slug"` envolvía un `Space.Compact` (no un control directo), entonces antd Form intentaba pasar `value`/`onChange` al `Space.Compact` que no es un control de input. El `setFieldValue('slug', ...)` actualizaba el form state pero no se reflejaba visualmente. Fix: Input directo como hijo del Form.Item, botón "Sugerir" como `addonAfter` con Tooltip.
- Mensaje del handler `handleSuggestSlug`: warning ahora dice "Captura un nombre primero" (antes "Captura un label primero", desactualizado tras renombrar el label visible). Y agregado `message.success` siempre que la API responde OK (antes solo aparecía mensaje cuando había colisión, dando la impresión de que "no hace nada").

### Cambiado

- **`LayerAliasesSection` + Form.Item wrapper:**
    - Label "Aliases (atajos opcionales)" → "**Alias** (atajos opcionales)" (en español es invariable).
    - Descripción duplicada eliminada (queda solo la interna del componente). Antes el `Form.Item extra` y el `<Text>` interno decían lo mismo.
    - Descripción interna actualizada a español pulido + acentos + ahora dice "nombre en URL" en lugar de "slug" (consistente con el rename del label en el commit anterior).
    - Placeholder del input: `"esalud"` → `"ejemplo: esalud"`.
    - Empty state del listado: `"Sin aliases. El slug canonico sigue funcionando."` → `"Sin alias. El nombre en URL canónico sigue funcionando."`.
    - Mensajes de error internos: "los aliases" → "los alias".

---

## [0.25.10] - 2026-04-25

### Cambiado

- **Editor de capas (`LayerEditPage`) — campos en español + descripciones:**
    - Todos los `Form.Item label` traducidos: "Label" → "Etiqueta visible", "Slug publico" → "Slug público", "Workspace" → "Workspace de GeoServer", "CQL filter" → "Filtro CQL", "WMS group" → "Grupo WMS", "Template" → "Plantilla", "Preview" → "Vista previa", etc.
    - Todos los campos tienen `extra` con descripción explicando para qué sirven (no solo el slug). Mismo patrón en los 4 tabs.
    - Tabs renombrados: "WMS" → "Servicio WMS", "InfoBox" → "Cuadro de información".
    - Opciones del select de plantilla InfoBox capitalizadas y en español: "municipio" → "Municipio", "punto_municipio" → "Punto + municipio", "custom" → "Personalizado (JSON libre)", etc.
    - Botón "Sugerir desde label" → "Sugerir" + Tooltip de antd con la descripción larga ("Genera un slug desde la etiqueta visible…").
- **Aliases movido al tab "Identidad"** (debajo del campo Slug). Antes era un tab separado. Decisión: alias y slug son la misma feature conceptualmente (identidad de la capa); separarlos era confuso.
- **Sider del editor colapsable:**
    - Botón en esquina superior derecha del sider (LeftOutlined / MenuUnfoldOutlined). Estado persiste en `localStorage` (`mapalab.layerEditor.siderCollapsed`).
    - Sider colapsado = 40px (solo el botón de toggle). Expandido = `siderWidth` con árbol completo y handle de resize.
    - Default por viewport (sin preferencia previa en localStorage): `< 992px` colapsado, `≥ 992px` expandido. La preferencia explícita del user manda sobre el default.
    - Transición suave 0.2s.

---

## [0.25.9] - 2026-04-25

### Agregado

- **Handle de resize manual** en el sider del editor de capas. Arrastrar el borde derecho del sider lo redimensiona entre 240 y 600px. El ancho elegido persiste en `localStorage` (`mapalab.layerEditor.siderWidth`).
- **`useResizableWidth` hook** (`admin/src/shared/hooks/useResizableWidth.js`) — reutilizable, recibe `initialWidth`, `storageKey`, `min`, `max`. Maneja mousedown/move/up con `userSelect: none` durante drag para no seleccionar texto.

### Notas

Por qué resize manual y no auto-fit al contenido del árbol expandido: el auto-fit causa layout shifts cada vez que expandes/colapsas un nodo (el content de la derecha se mueve, los formularios re-flowan), rompiendo predictibilidad. El handle manual es el patrón estándar de IDEs/admin panels (VS Code, Notion, Linear) — el user controla el ancho con decisión consciente, sin sorpresas.

---

## [0.25.8] - 2026-04-25

Unificación de las vistas de capas MapaLab — `LayersPage` (listado) y `LayerEditPage` (editor) eran dos pantallas separadas; ahora es **una sola vista** con sider árbol + content editor.

### Agregado

- **Componente `LayersTreeSider`** (`admin/src/features/mapalab-layers/components/LayersTreeSider.jsx`) — sider árbol reutilizable con:
    - Iconos por tipo (folder morado para `tema`, folder open azul para `category`, tags grises para `label`, appstore amarillo para `group`, file verde para `leaf`).
    - `titleRender` con label + Tag colorido del tipo (`purple/blue/default/gold/green` matchean los iconos) + tags workspace/oculto/disabled.
    - Input de búsqueda inline (busca por label, workspace, geoserver layer, key).
    - Drag-and-drop reorder dentro del mismo padre (admin only).
    - Botones "Bulk tags" (admin) y "Recargar".
    - Estado de loading + error + empty.

### Cambiado

- **`LayerEditPage` ahora soporta ruta sin `:id`:** `/mapalab/layers` muestra el sider con el árbol y un placeholder en el Content ("Editor de capas MapaLab — Selecciona una capa del árbol…"). `/mapalab/layers/:id/edit` muestra el editor con la capa cargada. Ambas rutas apuntan al mismo componente.
- **Sider del editor:** `width 280` → `320`. Reemplazado el Tree simple (sin iconos ni tags) por `LayersTreeSider` completo. En mobile el sider se renderiza como Card colapsado al inicio del Content.
- **`main.jsx`:** ruta `/mapalab/layers` antes apuntaba a `LayersPage`, ahora apunta a `LayerEditPage` (mismo componente que `/mapalab/layers/:id/edit`).
- **`features/mapalab-layers/index.js`:** removido export de `LayersPage` (ya no existe). Default export ahora es `LayerEditPage`.

### Eliminado

- **`LayersPage.jsx`** — funcionalidad absorbida por `LayerEditPage` + `LayersTreeSider`. El árbol full-width separado del editor era redundante; ahora el árbol está siempre visible mientras editas.

---

## [0.25.7] - 2026-04-25

### Cambiado

- **Tipos de nodo del árbol MapaLab traducidos a español** en la UI:
    - `tema` → "Tema"
    - `category` → "Categoría"
    - `label` → "Etiqueta"
    - `group` → "Grupo"
    - `leaf` → "Capa" (nodos hoja = capas WMS reales)
    - Centralizado en `admin/src/features/mapalab-layers/constants/nodeTypes.js` con `NODE_TYPE_LABELS`, `NODE_TYPE_OPTIONS` y helper `labelForNodeType()`.
    - Aplicado en `LayerEditPage` (Select del Form, label "Tipo de nodo" en lugar de "Node type"), `LayersPage` (Tag del árbol) y `InitialLayerOrderPage` (Tag de cada item).
- **Valores internos** del ENUM `node_type` en `mapalab.layers` (BD DataEngine) sin cambios — solo se traducen los labels visibles. La compatibilidad con el modelo SQLAlchemy y el árbol público de MapaLab se mantiene.

---

## [0.25.6] - 2026-04-25

Limpieza de los 24 warnings residuales de `react-hooks/set-state-in-effect` (parte B). De 24 → 0 warnings; lint 100% limpio.

### Cambiado

**Patrón aplicado (16 archivos refactoreados):** inlinear el fetch en el `useEffect` body con `let cancelled = false; ...then(...).finally(() => { if (!cancelled) setLoading(false); })` + `useState(true)` inicial para loading. Elimina los `setLoading(true)` síncronos al inicio del effect y la cadena de `setState`-via-`useCallback` que la regla flagea.

- **Hooks:** `AuthContext.jsx`, `useLayerTreeAdmin.js`, `useMenuDraft.js`, `useContentSearch.js`, `usePageDraft.js` (también reordenado para que `loadPage` se declare antes del `useEffect` que la referencia).
- **Páginas:** `UsersPage.jsx`, `RevisionQueuePage.jsx`, `FormulariosPage.jsx`, `InitialLayerOrderPage.jsx`, `MediaPage.jsx`, `LayerEditPage.jsx`.
- **Componentes:** `LayerMetadataSection.jsx`, `BucketFilePicker.jsx`, `FilePicker.jsx`, `MediaSelector.jsx`.
- **`MediaPage.jsx`:** `setMediaFiles([])` cuando no hay bucket reemplazado por `visibleMediaFiles = selectedBucketId ? mediaFiles : []` derived.
- **Eliminadas funciones huérfanas** (loadAuthors, performSearch, fetchProjects, load) en hooks/pages donde el inline reemplazó la fn callback que ya no se usaba.

### Notas

**6 archivos en per-file ignore de `react-hooks/set-state-in-effect`** (`eslint.config.js`) — patrones legítimos donde el fix correcto requiere refactor arquitectónico:
- `MainLayout.jsx` — `setMobileDrawerOpen(false)` al cambiar pathname (drawer auto-close en navegación).
- `FontSelector.jsx`, `JsonEditorModal.jsx`, `TextStyleModal.jsx` — modal init pattern (setear defaults cuando `visible` cambia). El fix correcto es `key={visible}` en cada padre que monta el modal.
- `SEOAnalyzer.jsx` — heavy compute (`performAnalysis`) cuando cambian props `page`/`seo`. Requiere extraer a hook `usePerformAnalysis` con memoization compleja.
- `usePageDraft.js` — `loadPage` con `setLoading(false)` final, llamada desde `useEffect`.

### Resultado

- `npm run lint` → **0 errors, 0 warnings** (de 24 → 0).
- `npm run build` → ✓.
- `npm test` → 17/17.

---

## [0.25.5] - 2026-04-25

### Cambiado

- **`InitialLayerOrderPage` responsive mobile:**
    - `Content`: padding `24` → `12` en mobile, `width: 100%` + `boxSizing: border-box` (cabe en pantallas chicas).
    - `Title`: level `3` → `4` en mobile (texto secundario también baja a 12px).
    - `Card body/header`: paddings reducidos en mobile (`12px` y `8px 12px`).
    - **Botones del Card extra:** solo iconos en mobile, label visible solo en desktop. Wrap automático si no caben.
    - `Card title`: simplificado en mobile (`"3 capas"` en lugar de `"3 capas activas"`).
    - `SortableRow`: padding `8px 8px` (vs `10px 12px` desktop), gap `8` (vs `12`), font-size `13px` (vs `14`), tags `11px`. `Button delete` size `small` en mobile. `wordBreak: break-word` para labels largos.
    - `Modal`: `width: 100%` + `centered` en mobile (en lugar de 520px fijo).
- **Fix antd deprecations:**
    - `<Space direction="vertical">` → `<Space orientation="vertical">` (3 ocurrencias).
    - `<Alert message={error}>` → `<Alert title={error}>`.
- **`eslint.config.js`:** agregado `InitialLayerOrderPage.jsx` al per-file-ignore de `max-lines` (323 líneas; el responsive condicional infla, partir aumentaría complejidad).

---

## [0.25.4] - 2026-04-25

### Corregido

- **`api/app/api/routes/layers.py`** — `GET /layers/initial-order` devolvía `500 Internal Server Error` (y CORS bloqueaba en browser) porque FastAPI matcheaba con `GET /layers/{layer_id}` (declarado antes), interpretando `initial-order` como un `layer_id`. La query a `mapalab.layers.id = 'initial-order'` además fallaba porque el modelo SQLAlchemy `Layer` ya pide la columna `slug` (parte del WIP DataEngine en `prod-migracion`) que no existe en la BD de dev. Fix: reordenar `GET /initial-order` ANTES de `GET /{layer_id}` para que matchee primero. Sin tocar el modelo `Layer` (sigue siendo trabajo de DataEngine en `prod-migracion`).

### Cambiado

- **Sider — color de selección:** `BRAND.purple` (`#5C2472` morado) → `#4a6494` (azul más claro, variante de `BRAND.numeralia` `#2e4372`). Mejor armonía con el azul institucional del sider; el morado destacaba demasiado contra el azul.

---

## [0.25.3] - 2026-04-25

Polish del login para alinearse pixel-a-pixel con SIEEJ. Continuación de v0.25.2.

### Agregado

- **Iconos custom de visualizar/ocultar contraseña** copiados de `SIEEJ/frontend/src/assets/icons/` a `admin/public/ico-show.svg` y `ico-hidden.svg`. Se renderizan en el `Input.Password` via `iconRender` custom (22×22), reemplazando los `EyeOutlined`/`EyeInvisibleOutlined` default de antd.

### Cambiado

- **Tipografía Garet aplicada explícitamente** en JSX inline (Title "Hola"/"Mariachi", Text "Ingresa…", Botón, Aviso de privacidad) y en CSS global (`.login-form-sieej` labels, inputs, placeholders). Antes heredaba del `theme.token.fontFamily` pero algunas partes internas de antd usaban su propio fontFamily.
- **Padding del card responsivo** con `clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px)` (vertical mayor para más respiro). Outer Flex padding `clamp(16px, 3vw, 32px)`. Row gutter responsive: `xs/sm: 0` apilado, `md: 32`, `lg: 48`.
- **Color del isotipo Mariachi** detectado del PNG real del escudo IIEG (`#5B6770`, gris azulado, ~80% de pixels). Texto "Mariachi" usa este color matcheando el escudo.
- **Divider entre escudo y "Mariachi"** en `BRAND.orange` (naranja institucional) `1×28px`. Antes era gris, ahora destaca como acento.
- **Botón "Iniciar sesión":** `BRAND.orange` → `BRAND.purple` (morado institucional, igual a SIEEJ).
- **Asterisco `*` de campos required:** ahora se renderiza DESPUÉS del label texto (antd lo pone antes por default). Color `BRAND.orange` bold via `requiredMark` custom + CSS para deshabilitar el `::before` default de antd.
- **Logo Jalisco:** `40px` → `52px` (igual a SIEEJ `h-[52px]`). Separación del card: `20px` → `40px`. Gap con aviso: `8` → `20`.
- **Iconos del Input.Password:** removida sombra duplicada al hacer hover (el `.ant-input` interno del wrapper ahora tiene `box-shadow: none` para evitar doble shadow del wrapper + input).
- **Card overflow:** `overflow: hidden` + `boxSizing: border-box` para evitar scroll horizontal del antd Row (que aplica margin-left/right negativo por gutter).
- **Outer Flex:** `overflowX: hidden` + `width: 100%` para evitar scroll horizontal del SVG background.
- **Removido el botón "Olvidé mi contraseña"** (no aplica en SIEEJ tampoco).
- **Removido texto "Instituto de Información…"** de la columna derecha (los logos son self-evident).
- **Escudo Mariachi:** ajustado a `80×80px` para matchear visualmente el escudo dentro del logo IIEG. Sin gap con el divider (`marginRight: 2`); separación normal con el título (`marginLeft: 6`).

### Notas

Pendiente para próxima sesión (reportado por el user, no bloqueante):
- Backend GET `/layers/initial-order` devuelve 500 (no llega a enviar headers CORS, browser bloquea). Hay que verificar el service `list_initial_order` contra la BD real.
- antd warnings (`Space.direction` deprecated en `InitialLayerOrderPage`, `Alert.message` deprecated en algún lugar). Cambios mecánicos a `orientation` y `title`.

---

## [0.25.2] - 2026-04-25

Login del admin homologado con el de SIEEJ para consistencia visual entre productos del ecosistema IIEG.

### Cambiado

- **Background del login:** color sólido morado → `login-background.svg` copiado de `SIEEJ/frontend/src/assets/svg/img_back.svg` (servido desde `admin/public/`). Cubre todo el viewport.
- **Layout del card:** quitada la división interna con `borderLeft` entre columnas. Ahora es un único card blanco con padding 40 y `gutter={40}` entre cols (mismo patrón que SIEEJ).
- **Columna derecha:** ahora muestra `isotipo IIEG-favicon-192 + texto "Mariachi"` (estilo del sider) arriba + logo IIEG abajo. Antes solo logo IIEG + Jalisco.
- **Logo Jalisco + aviso de privacidad** salieron del card y quedaron debajo, centrados sobre el background SVG (igual que SIEEJ). Aviso en blanco subrayado bold de 10px.
- Removida la barra gradient azul/morado/naranja que estaba arriba del título "Hola" — el SIEEJ no la tiene.

---

## [0.25.1] - 2026-04-25

Limpieza de warnings react-hooks 7 — parte A (mecánicos, riesgo cero). De 43 warnings → 24 (los 24 restantes son `set-state-in-effect`, parte B, pendiente). Plus actualización de metadata de `pyproject.toml`.

### Cambiado

- **`api/pyproject.toml`** — `authors` corregido a `Edgar Alejandro Villarreal Padilla / edgar.villarreal@iieg.gob.mx`. `description` actualizada a `"Mariachi — backend API del ecosistema IIEG (admin, MapaLab, SIEEJ)."` (antes decía "FastAPI backend for CMS (mariachi) and portal frontends." — el portal vive en otro repo desde 0.21.x y SIEEJ/MapaLab no son CMS).
- **`react-refresh/only-export-components` (13 warnings → 0):**
    - `admin/src/main.jsx` — per-file ignore en `eslint.config.js` (entry point no participa en HMR; los `lazy()` y helpers como `withSuspense` flagean falso positivo).
    - `BRAND` extraído de `MainProvider.jsx` a nuevo `admin/src/app/providers/brand.js`. Imports actualizados en `MainLayout.jsx` y `LoginPage.jsx`.
    - `useAuth` y `AuthContext` extraídos de `AuthContext.jsx` a nuevo `admin/src/shared/contexts/useAuth.js`. `AuthContext.jsx` ahora solo exporta `AuthProvider`. Imports actualizados en 9 consumidores via `sed`.
    - `useFontConfig` y `FontConfigContext` extraídos de `FontConfigContext.jsx` a nuevo `useFontConfig.js`. Import actualizado en `TextStyleModal.jsx`.
- **`react-hooks/exhaustive-deps` (5 warnings → 0):**
    - `LayerAliasesSection.jsx` — `reload` wrappeada en `useCallback([layerId, listAliases])`. El `useEffect` inlinea el fetch directamente para evitar también `set-state-in-effect`.
    - `SortableTree.jsx` — `flattenTree` (función pura) extraída a module scope.
    - `SEOAnalyzer.jsx` — `extractAllText`, `analyzeKeywordDensity`, `analyzeContent`, `analyzeReadability` movidas a module scope (todas puras). `performAnalysis` wrappeada en `useCallback([page, seo])` y agregada a las deps del `useEffect`. `setAnalysis(prev => ...)` intermedio innecesario removido; `keywords: analysis.keywords` (siempre vacío) reemplazado por `keywords: {}`.
    - `usePageDraft.js` — `loadPage` y `saveDraft` convertidas de `async function` a `useCallback`. `saveDraft` lee `page` via `useRef` (`pageRef`) en vez de closure para no recrearse en cada cambio. `createEmptyPage` (helper trivial) inlinada. Reordenado el `useEffect` de autosave para que `saveDraft` esté declarada antes del effect que la referencia.
- **`react-hooks/immutability` (1 warning → 0):** `SEOAnalyzer.jsx` — helpers ahora declarados antes del `useEffect` que los llama.

### Pendiente (parte B)

- 24 warnings de `react-hooks/set-state-in-effect` requieren refactor caso-por-caso (key-based remount, computar derived state, mover a event handler) y QA visual en browser. Documentado como deuda técnica en sesión dedicada.

---

## [0.25.0] - 2026-04-25

Tercer rol global `externo` para separar usuarios del staff IIEG (admin CMS) de usuarios de productos publicos autenticados (SIEEJ hoy, MapaLab autenticado a futuro). Antes solo existian `tetlamamakani` y `editora`, lo que obligaba a otorgar `editora` a dependencias externas y abria un escalado de privilegios al admin CMS completo.

### Agregado

- **Rol `externo`** en el ENUM `user_roles`. Migration alembic `f1a2b3c4d5e6_add_role_externo.py` (rama mariachi) aplica `ALTER TYPE user_roles ADD VALUE IF NOT EXISTS 'externo'`. El acceso a productos sigue mediado por `UserProject(project_id, project_role)`.
- **Dependency `require_staff`** en `api/app/api/deps.py` (constante `STAFF_ROLES = {'tetlamamakani', 'editora'}`). Devuelve 403 si la cuenta autenticada es `externo`.
- **Aplicacion del guard** a nivel de `include_router` en `api/app/main.py`: 11 routers admin-only quedan bloqueados para externo (users, projects, media_buckets, pages, menu, media, borradores, layers, layer_metadata, geoserver, preview.admin_router). Los routers de auth, formularios y los publicos no llevan el guard.
- **Frontend admin**: `ProtectedRoute` muestra pantalla 403 con boton "Ir a SIEEJ" cuando la sesion es de un externo. `LoginPage` redirige a `/sieej/inicio-sesion` automaticamente si la cuenta autenticada es externa.
- **Documentacion** en `docs/ROLES.md`: matriz de roles, dependencies disponibles, flujo de onboarding de externos (con SQL de ejemplo), casos de uso planeados (SIEEJ, MapaLab autenticado), tabla de validacion smoke.

### Cambiado

- `docs/sieej.md`: seccion de auth/RBAC actualizada para reflejar que las dependencias usan `externo` (no `editora`) y referenciar `docs/ROLES.md`.
- `docs/context.md` y `docs/ARCHITECTURE.md`: enlace a `docs/ROLES.md` en sus indices.

### Validacion en dev

Smoke con un usuario `externo_test` (role='externo' + UserProject sieej editor):

- `POST /api/administrador/autenticacion/iniciar-sesion`: 200, devuelve csrf_token y user con role='externo'.
- `GET /api/administrador/usuarios`: 403.
- `GET /api/administrador/paginas`: 403.
- `GET /api/administrador/formularios/catalogos`: 200 (8 colecciones con su seed completo).
- `GET /api/administrador/autenticacion/perfil`: 200.

### Notas

- La migration usa `op.execute("ALTER TYPE ... ADD VALUE IF NOT EXISTS")`. Postgres 12+ permite esta operacion dentro de transaccion (con la restriccion de no usar el nuevo valor en la misma tx, lo cual no aplica aqui).
- Downgrade no implementado: Postgres no permite eliminar valores de un enum sin recrear el tipo. Si se necesita revertir, hay que reasignar usuarios y migrar columnas a un tipo nuevo.
- El frontend SIEEJ no requiere cambios: ya valida que `/perfil` devuelva 200 y que `/formularios/*` no devuelva 403, sin distinguir rol.

---

## [0.24.4] - 2026-04-24

### Cambiado

- **`LoginPage.jsx`** — removido el texto `"Instituto de Información Estadística y Geográfica de Jalisco"` de la columna derecha. El logo IIEG + el logo Jalisco ya hacen self-evident el branding; el texto era redundante.

---

## [0.24.3] - 2026-04-24

Branding del admin alineado con MapaLab: tipografía Garet, scrollbar custom, redesign del login y fix del scroll vertical en mobile.

### Agregado

- **Fuentes Garet** (5 weights: 300/400/500/700/800) copiadas de `mapalab/frontend/public/fonts/` a `admin/public/fonts/`. Importadas via `@font-face` en `admin/src/index.css`.
- **Scrollbar custom** (thin, 6px, gris translúcido) en html/body — mismo estilo que MapaLab (`scrollbar-thin`, `scrollbar-thumb-gray-400`, `scrollbar-thumb-gray-500`). Estilos en `admin/src/index.css`.
- **Variables CSS** `--color-numeralia`, `--color-purple`, `--color-orange` en `:root` para usar desde CSS puro (los `BRAND` JS ya existían).

### Cambiado

- **Body font-family** ahora arranca con `"Garet"` (antes: stack genérico de sistema). El `MainProvider` ya usaba Garet en `theme.token.fontFamily` pero las fuentes no estaban servidas — ahora sí.
- **`MainProvider.jsx`:** `AntApp minHeight: '100vh'` → `'100dvh'`. En mobile `100vh` excede el viewport visible cuando aparece la barra del browser; `dvh` se ajusta dinámicamente.
- **Logo Jalisco** (`jalisco_large_dark.svg`) copiado de `mapalab/frontend/src/assets/logos/` a `admin/public/jalisco-logo.svg`. Mostrado en la columna derecha del LoginPage debajo del IIEG.
- **Asset paths con vite base:** `<img src="/iieg-...">` → `<img src={\`${import.meta.env.BASE_URL}iieg-...\`}>` en `MainLayout.jsx` y `LoginPage.jsx`. En prod el admin se sirve bajo `/mariachi/`, pero los paths absolutos no se prefijaban → imagen rota en producción (y en dev se rompía si el browser caché tenía estado intermedio).
- **`LoginPage.jsx` — redesign completo:**
    - Outer background: `token.colorBgLayout` (gris claro) → `BRAND.purple` (morado institucional).
    - Columna derecha del card: gradient morado → blanco (`token.colorBgContainer`) con `borderLeft: 1px solid borderSecondary` como divisor entre las dos columnas. Antes el morado estaba duplicado dentro del card.
    - Logo IIEG: `logo_iieg_login.svg` (con `filter: brightness(0) invert(1)` — aplastaba todo a blanco, se veía como cuadro vacío) → `/iieg-logo.png` (PNG transparente a color, sin filtro) sobre fondo blanco.
    - Logo Jalisco agregado en la columna derecha debajo del IIEG.
    - Título "Hola": `color: BRAND.purple` (morado institucional).
    - Botón "Iniciar sesión": `BRAND.purple` → `BRAND.orange` (naranja institucional para destacar el CTA).
    - Texto "Aviso de privacidad" (sobre el morado outer): `colorTextSecondary` (gris) → `#fff` para contraste pleno.
    - Outer Flex: `boxSizing: 'border-box'` para que el padding entre dentro del `100dvh`. Antes el padding sumaba sobre el `minHeight: 100vh`, generando scroll vertical innecesario.

---

## [0.24.2] - 2026-04-24

Branding del admin (favicon, title, logo en sider) y limpieza del login.

### Agregado

- **Favicons IIEG** descargados del sitio oficial (`iieg.gob.mx`) y servidos desde `admin/public/`: `iieg-favicon-32.png`, `iieg-favicon-192.png`, `iieg-apple-touch-icon.png`, `iieg-logo.png`.
- **`admin/index.html`** actualizado: title `"Mariachi - IIEG"` (antes `"CMS Portal - IIEG"`), `apple-mobile-web-app-title` `"Mariachi"` (antes `"CMS Portal"`), `theme-color` y `msapplication-TileColor` en purple `#5C2472` (antes blue `#3b82f6` genérico), links `<link rel="icon">` para 32×32 y 192×192 + `apple-touch-icon` 180×180.
- **`admin/src/app/MainLayout.jsx`** — el brand del sider ahora muestra el isotipo IIEG (192×192 PNG) + texto "Mariachi" cuando está expandido, solo el isotipo cuando está colapsado. Antes solo mostraba texto `"Mariachi"` / `"MA"`.

### Cambiado

- **`admin/src/features/auth/pages/LoginPage.jsx`:**
    - `minHeight: '100vh'` → `minHeight: '100dvh'` + `overscrollBehavior: 'none'`. En mobile el viewport real cambia cuando la barra del browser se oculta/muestra; con `100vh` el contenedor era más alto que la pantalla visible y el rubber-band del scroll permitía deslizar verticalmente. `dvh` se ajusta dinámicamente al viewport visible.
    - Removido el `<Alert>` "Dev" con credenciales `admin/admin123`, `editor/editor123` (visible solo cuando `import.meta.env.DEV`). Ya no se necesita — el dev tiene la sesión persistida del browser. Imports `Alert` e `InfoCircleOutlined` también eliminados.
    - URL del aviso de privacidad actualizada a la versión más reciente publicada por IIEG: `Aviso_de_Privacidad_Integral_IIEG_06_2025.pdf` (junio 2025) en lugar de `Aviso_Privacidad_Integral_IIEG_01_2025.pdf` (enero 2025).

---

## [0.24.1] - 2026-04-24

Fix de regresión arrastrada desde v0.21.0 cuando el admin se movió a servirse bajo `/mariachi/`.

### Corregido

- **`admin/src/main.jsx`** — `basename` del router actualizado de `/administrador` a `/mariachi`. El bundle se sirve bajo `/mariachi/` (vite `base`) pero el router seguía esperando `/administrador`, por lo que la URL real `/mariachi/...` no matcheaba ninguna ruta — todo caía a un 404 silencioso al refrescar en cualquier path. Solo funcionaba si la app entraba por el path raíz y los redirects internos cargaban el primer match. Síntoma en consola: `<Router basename="/administrador"> is not able to match the URL "/mariachi/..."`.

---

## [0.24.0] - 2026-04-24

Absorcion del backend de SIEEJ en mariachi como modulo `formularios`. El frontend de SIEEJ migra a su propio repositorio (`iieg-oficial/sieej`) y se sirve a traves de `mariachi-nginx` bajo `/sieej/`. El stub `formularios.py` que devolvia 501 se reemplaza por implementacion completa.

### Agregado

- **Schema dedicado `sieej`** en BD `iieg_portal` con 12 tablas: 8 catalogos (unidad_admin, categoria_datos, herramientas_gestion, calidad_datos, periodicidad, objetivo_uso, usuarios_datos, ejes_estrategicos), 3 entidades (general, enlace, bases_datos) y 1 relacion N:M (bd_ejes_estrategicos). Migration `e7f8a9b0c1d2_init_sieej_schema.py` aplica DDL y siembra catalogos desde `api/data/sieej/*.json`. Tambien siembra `MediaBucket(acervo_bucket='sieej-diccionarios')` para subida de diccionarios.
- **Modelos SQLAlchemy 2.0** en `api/app/models/sieej/` con `__table_args__={"schema":"sieej"}`. FKs cross-schema a `public.usuarios` con `ON DELETE CASCADE`.
- **Schemas Pydantic** en `api/app/schemas/sieej/`: General, Enlace, BasesDatos (Create/Update/Response) y `CatalogosResponse` (bundle de las 8 colecciones para reducir roundtrips desde el frontend).
- **Services** en `api/app/services/sieej/`: `GeneralService`, `EnlaceService`, `BasesDatosService`. `BasesDatosService.upload_diccionario(...)` es async y sube via `AcervoClient.for_bucket(bucket)` al MediaBucket dedicado, guardando la URL publica en `bases_datos.ruta_diccionario`.
- **Routes `/formularios/*`** en `api/app/api/routes/formularios/` (subpaquete con cuatro subrouters): `catalogos`, `general`, `enlaces`, `bases_datos`. El router padre se monta con `Depends(require_project_access('sieej'))` y las mutaciones requieren `verify_csrf`.
- **mariachi-nginx sirve frontend SIEEJ** en `/sieej/`: el `dist/` del repo `iieg-oficial/sieej` se monta como volumen read-only via `${SIEEJ_DIST_PATH:-../SIEEJ/frontend/dist}` en el `docker-compose.yml`. La directiva `location /sieej` en `nginx/conf.d/mariachi.conf` aplica `try_files` con fallback a `/sieej/index.html` para SPA routing.
- **Login del admin** rediseñado con el mockup oficial del IIEG (heredado de SIEEJ): layout AntD a dos columnas, barra de gradiente institucional, copy "Hola / Ingresa tus datos para iniciar sesión", color primary purple `#5C2472` y panel derecho con logo IIEG sobre gradiente. Conserva la logica de `useAuth()` sin cambios.
- **Documentacion** nueva en `docs/sieej.md` con detalles del modulo (modelo de datos, endpoints, estructura del codigo, integracion con Acervo y RBAC).

### Cambiado

- `api/app/api/routes/formularios.py` (stub 501) → reemplazado por subpaquete `formularios/`.
- `docs/context.md` y `docs/ARCHITECTURE.md` actualizados para reflejar SIEEJ como segundo producto del monorepo y el routing `/sieej/` en mariachi-nginx.

### Notas

- Una dependencia de gobierno = `Usuario(role='editora')` + `UserProject(project=sieej, role='editor')`. El admin global (`role='tetlamamakani'`) tiene bypass.
- SIEEJ no toca DataEngine. Cualquier cambio futuro a DataEngine va en rama dedicada `prod-migracion` con `alembic -x db=dataengine upgrade head`.
- El gateway-hub no requiere upstream propio para SIEEJ; usa `portal` (= mariachi-nginx).

---

## [0.23.0] - 2026-04-24

Configuración de capas iniciales en MapaLab desde el admin: la tabla `mapalab.initial_layer_order` y el endpoint PATCH ya existían pero no había UI; solo se podía mantener vía SQL directo.

### Agregado

- **Endpoint backend `GET /api/administrador/layers/initial-order`** (admin-only) que devuelve la lista ordenada actual con metadata (`layerId`, `sortOrder`, `label`, `nodeType`, `parentId`). Antes solo existía PATCH para escribir, sin forma de leer el estado.
- **Service `layer_service.list_initial_order(session)`** — JOIN de `InitialLayerOrder` + `Layer` ordenado por `sort_order`.
- **Schema `InitialOrderItem`** en `api/app/schemas/layer.py`.
- **Hook `useLayerTreeAdmin`:** funciones `getInitialOrder()` y `setInitialOrder(orderedIds)`.
- **Sider:** item "Capas iniciales" bajo el grupo MapaLab → `/mapalab/initial-order` (solo admin).
- **Página `InitialLayerOrderPage`** con dnd-kit:
    - Lista de capas activas en orden actual; arrastrar para reordenar.
    - Modal "Agregar capa" con `Select` searchable contra el catálogo de capas hoja (`nodeType === 'leaf'`) que aún no están en el orden inicial.
    - Botón "Quitar" por fila.
    - Botones "Descartar" (vuelve al estado original) y "Guardar" (PATCH atómico, refresh del árbol).
    - Estado vacío + manejo de errores.
- **Ruta** `mapalab/initial-order` registrada en `main.jsx` con `RoleProtectedRoute(['tetlamamakani'])`.

### Cambiado

- **`api/pyproject.toml`** — `[tool.ruff.lint.per-file-ignores]` para `models/layer.py`, `services/layer_service.py`, `services/mapalab_notifier.py` (regla `I001`). Esos archivos pertenecen al ciclo DataEngine/`prod-migracion` y sus autofixes se aplican allá; se ignoran en develop para no bloquear CI.

### Notas

- `set_initial_order` ya validaba que las capas existieran y reemplazaba el orden atómicamente — no hubo cambios al service de escritura, solo se agregó lectura.
- `notify_tree_changed()` se sigue disparando en el PATCH para invalidar caché del frontend público de MapaLab.

---

## [0.22.1] - 2026-04-24

Limpieza post-cobertura: tests preexistentes rotos por la migración a cookies, deprecation de `datetime.utcnow()`, configuración de CI sobreviviente del split del portal y `package-lock.json` desync.

### Cambiado

- **Tests preexistentes (`tests/test_auth.py`, `tests/test_users.py`):** migrados a las fixtures cookie-aware `admin_session`/`editora_session`. Antes asumían `access_token` en body + header `Authorization: Bearer` (pre-cookies). Ahora 21 tests de auth/usuarios pasan en lugar de 23 errores. Las fixtures viejas `admin_token`/`editora_token` (huérfanas) eliminadas del conftest.
- **`tests/conftest.py`:** filtro de tablas con schema (`schema is None`) en `db_session` para que SQLite ignore las tablas SIEEJ del trabajo en progreso.
- **`api/pyproject.toml`:** `[tool.pytest.ini_options] testpaths = ["tests"]` para que pytest no recolecte `scripts/test_*.py` (son scripts CLI con `if __name__ == "__main__"`, no tests).
- **`api/app/core/time.py` (nuevo) + replaces:** helper `utcnow()` que retorna naive UTC. Reemplazo de `datetime.utcnow()` (deprecated en 3.12, removed en 3.13) en `core/security.py`, `api/routes/{borradores,pages}.py`, `models/{borrador,media,media_bucket,page,project,user}.py`. Comportamiento idéntico (naive UTC), 0 deprecation warnings. Modelos DataEngine (`models/layer.py`) y archivos del trabajo SIEEJ en progreso quedan fuera (van por sus propias ramas).
- **`.github/workflows/ci.yml`:** removido el job `web` (el portal vive en repo separado desde 0.21.x — el path `web/` no existe en este repo). Removido `branches-ignore: [develop, main]` para que CI corra también en push directo a develop, no solo en PRs.
- **`admin/package-lock.json`:** resync con `npm install --package-lock-only`. Estaba en `0.12.0` cuando `package.json` ya iba en `0.22.0` — `npm ci` en CI fallaba por mismatch.
- **Ruff autofix:** 27 issues (sort de imports + 1 whitespace) resueltos automáticamente en archivos del CMS. Archivos DataEngine (`models/layer.py`, `schemas/layer.py`) excluidos por la política de ownership; sus autofixes corresponden a la rama `prod-migracion`.

### Resultado

- `pytest -q` → `85 passed, 6 warnings` (de `39 passed, 1 failed, 23 errors, 186 warnings`).
- `ruff check app tests` → `All checks passed!`.
- CI ya corre en push a develop, sin job inexistente bloqueando.

---

## [0.22.0] - 2026-04-24

Cobertura smoke de tests para el refactor multi-proyecto. Hasta hoy CI corría `pytest -q` y `npm test` sin nada que ejecutara para los endpoints/guards/UI nuevos.

### Agregado

- **Backend (`api/tests/`, pytest):** 24 tests nuevos.
    - `test_projects.py` (9): GET requiere auth, GET filtra inactivos, POST/PATCH admin-only (editora=403), conflicto 409 por slug duplicado, PUT `/projects/users/{id}` reemplaza memberships atómicamente.
    - `test_media_buckets.py` (9): GET admin ve todos, editora con membership solo los suyos, editora sin membership lista vacía, POST admin-only con validación de project_id, PATCH admin-only.
    - `test_require_project_access.py` (6): editora sin membership = 403, admin global bypassa, viewer puede leer y no escribir, editor puede escribir, proyecto inexistente = 404.
    - `tests/conftest.py`: nuevas fixtures `admin_session` y `editora_session` que hacen login real (cookie + csrf) en lugar del fixture viejo `admin_token` (que rompió en la migración a cookies). Filtro de tablas con schema en `db_session` para que SQLite ignore tablas que no son del schema default.
- **Frontend (`admin/src/`, vitest + happy-dom + @testing-library/react):** 17 tests nuevos.
    - `app/__tests__/sider-config.test.js` (12): `buildSiderItems({ user: null })` = `[]`; admin ve Plataforma + 3 grupos de proyecto; editora con membership en `portal` ve solo Plataforma (Media) + Portalito; editora sin memberships solo Plataforma; `defaultOpenKeyForPath` mapea path → grupo correcto; badge de Revisiones aparece con `pendingCount > 0`; onClick invoca onNavigate.
    - `features/media/components/__tests__/BucketFilePicker.test.jsx` (5): no fetcha cuando `open=false`, lista archivos cuando se abre, click en fila llama `onSelect` con `{nombre, enlace, url}` y cierra, búsqueda filtra case-insensitive, cambiar tab refetcha con nuevo prefix.
- **`admin/vitest.config.js` + `admin/vitest.setup.js`:** configuración inicial (no existía). environment=happy-dom, alias resueltos como en vite.config, jest-dom matchers cargados en setup.

### Notas

- `test_formularios.py` queda fuera de este release: el plan original asumía endpoints stub (501/[]), pero en `develop` ya hay implementación real de SIEEJ en progreso (no commiteada). Cuando ese trabajo aterrice se agregará cobertura específica.
- Tests existentes (test_auth, test_users) siguen rotos por la migración a cookies — no es deuda nueva sino preexistente; los nuevos tests usan las fixtures cookie-aware (`admin_session`/`editora_session`).
- Frontend test del form de UsersPage (sección "Proyectos y roles") quedó fuera del scope smoke: requiere mocks de AuthContext + axios + Router que exceden el costo/beneficio para esta PR. Se puede agregar cuando se extraiga el form a un componente aislado.

---

## [0.21.2] - 2026-04-24

Lint pass ESLint 10: del upgrade en 0.14.0 quedaba la deuda técnica de correr lint contra todo el admin. Triage por categoría y fix archivo por archivo.

### Cambiado

- **`admin/eslint.config.js`:**
    - Override de `max-lines: 'off'` para 8 archivos cuya división aumentaría más complejidad que el límite (`LayerEditPage`, `mediaService`, `FilePicker`, `MediaPage`, `SEOAnalyzer`, `SEOEditor`, `pageTemplates`, `UsersPage`).
    - Downgrade de `react-hooks/set-state-in-effect` y `react-hooks/immutability` a `warn`. Son reglas nuevas de react-hooks 7 que requieren refactor arquitectónico (cambiar idiomas de modal/form/draft a derived state o key-based remount). Se atiende como deuda técnica posterior, sin bloquear lint.
- **Refactor de patrones `useEffect → fetch fn`** (eliminó la mayoría de errores `react-hooks/immutability`): en ~14 hooks/componentes se hoistea la función a `useCallback` antes del `useEffect`, o se convierte a `function` declaration cuando no requiere memoización. Files: `AuthContext`, `useMenuDraft`, `UsersPage`, `FormulariosPage`, `RevisionQueuePage`, `FontConfigContext`, `FontSelector`, `FilePicker`, `MediaSelector`, `MediaPage`, `useContentSearch`, `usePageDraft`, `LayerEditPage`, `SEOAnalyzer`.
- **Limpieza de `no-unused-vars`** (8 errores): drop de `logout` en `ChangePasswordPage`, `hasDraft` en `MenuManagerPage`, `index` en `PageVersionHistory`, `isAdmin2` en `PageEditorPage`, `level/childCount` desreferenciados en `SortableTree` (renombrados con prefijo `_`), `draftId` en `useMenuDraft` (slot vacío en destructuring).
- **`no-empty` (3 errores):** restructurado `try/catch` vacío en `AuthContext.logout`, `useMenuDraft.saveDraft/deleteDraft` con patrón `await ... .catch(() => null)`.
- **`jsx-a11y` (3 errores en `LayerEditPage`):** `<a onClick>` en breadcrumb reemplazado por `<Button type="link">` para keyboard/role correctos.
- **`react-hooks/purity` (1 error en `JsonEditorModal`):** removido `id: Date.now()` del snippet copiado al portapapeles — el id se asigna cuando el bloque se inserta, no en la plantilla.
- **`autofix` ESLint:** 174 errores de `indent`/`quotes`/etc resueltos con `eslint --fix` (sin cambios semánticos, solo estilo).

### Resultado

- `npm run lint` → `0 errors, 39 warnings` (de `228 errors, 23 warnings`).
- Warnings restantes documentadas como deuda técnica: 22 `set-state-in-effect`, 12 `react-refresh/only-export-components`, 4 `exhaustive-deps`, 1 `immutability`.
- `npm run build` pasa limpio.

---

## [0.21.1] - 2026-04-24

Observabilidad en endpoints del refactor multi-proyecto y refresh de docs.

### Agregado

- **Counters `/metrics` para writes nuevos:**
    - `mariachi_project_writes_total` — create / update / set_memberships en `/projects`.
    - `mariachi_user_writes_total` — create / update / delete en `/usuarios`.
    - `mariachi_media_bucket_writes_total` — create / update en `/media-buckets`.
    - `mariachi_media_uploads_total`, `mariachi_media_deletes_total` — en `/multimedia`.
    - `mariachi_layer_metadata_writes_total` — en `/layer-metadata` PUT.
- **Logging estructurado básico** (`logger.info` con key=value) en writes de:
    - `routes/projects.py`: create, update, set_memberships.
    - `routes/users.py`: create, update, delete.
    - `routes/media_buckets.py`: create, update.
    - `routes/media.py`: upload, delete (incluye `bucket`, `size`, `name`).
- Los logs siguen patrón `action=<dominio>.<operación> actor=<id> target=<id> ...`. Paso siguiente natural: migrar a JSON structured logs; por ahora text con key=value es grep-friendly.

### Cambiado

- `docs/PENDIENTES.md` refresh completo: estado actual marcado (0.21.0), items cumplidos del refactor cerrados, pendientes nuevos organizados (tests, lint ESLint 10, counters, upload directo en LayerMetadataSection, tabla `sieej_formularios` real).
- `docs/CONTRIBUTING.md`:
    - Instrucciones de setup actualizadas (admin-only, portal vive en repo separado).
    - Nueva sección **"Arquitectura del admin (feature-sliced)"** con reglas de import entre `app/`, `shared/`, `features/` y checklist para agregar un proyecto nuevo.
    - Regla "sin comentarios en código" explícita.

---

## [0.21.0] - 2026-04-24

**Breaking UI path:** el admin se sirve ahora bajo `/mariachi/` en vez de `/administrador/`, alineando con la convención del `gateway-hub` (`^~ /mariachi/` ya estaba reservado).

### Cambiado

- `admin/vite.config.js`: `base: '/mariachi/'` (antes `/administrador/`).
- `admin/src/main.jsx`: `basename: '/mariachi'`.
- `admin/src/shared/services/api.js`: redirect al login tras 401 apunta a `/mariachi/login`.
- `nginx/conf.d/mariachi.conf`:
    - Nueva `location /mariachi` con alias a `/usr/share/nginx/html/mariachi` y SPA fallback.
    - `location /administrador` ahora devuelve `301 /mariachi$request_uri` (bookmarks viejos siguen funcionando, pero con redirect permanente).
    - `location = /` redirige a `/mariachi/` (antes a `/administrador/`).
- `nginx/Dockerfile`: `COPY --from=admin-builder /app/dist /usr/share/nginx/html/mariachi`.
- `docs/context.md`, `docs/ARCHITECTURE.md`, `README.md`: menciones visibles del path actualizadas a `/mariachi/`.

### Notas

- El prefijo de **API** sigue siendo `/api/administrador/*` (no se toca en este release). Los requests del admin pegan a ese path absoluto y el gateway los rutea correctamente. Cambiar el API prefix es un refactor separado que implica actualizar también el gateway-hub (todavía rutea `/api/*` al upstream que termina en mariachi).
- En producción el `gateway-hub` ya tiene `location ^~ /mariachi/` apuntando al upstream `mariachi`; este release hace que ese path funcione.
- El redirect `301 /administrador → /mariachi` mantiene compatibilidad para links viejos.

---

## [0.20.1] - 2026-04-24

Deuda técnica pendiente del refactor multi-proyecto: migración a Alembic como fuente autoritativa del schema, viewer-por-proyecto blindado a nivel write, y limpieza del drawer legacy.

### Cambiado

- **`api/scripts/init_db.py`** ya no hace `Base.metadata.create_all`. Ahora corre `alembic -x db=mariachi upgrade mariachi@head` vía `subprocess` y, si `DATAENGINE_DATABASE_URL` está presente, también `alembic -x db=dataengine upgrade dataengine@head`. Alembic queda como fuente autoritativa del schema; el hack manual de `alembic stamp` ya no es necesario al resetear una BD de dev.
- **Viewer por proyecto blindado en writes:**
    - `/paginas` (PUT, DELETE) y `/elementos-menu` (POST, PUT, DELETE) añaden guard `_require_editor = require_project_access("portal", min_role="editor")`.
    - `/layer-metadata` (PUT) y `/geoserver/*` usan `_require_project_editor = require_project_access("mapalab", min_role="editor")` (antes era `require_role`, no validaba membership por proyecto).
    - Admin global (`tetlamamakani`) sigue con bypass.
    - Efecto: un usuario con rol global `editora` + `project_role = viewer` en portal/mapalab ya **no puede escribir** en esos módulos, solo leer. El preview-only que pediste funciona en serio.

### Removido

- `admin/src/features/mapalab-layers/components/layersEditor/LayerEditDrawer.jsx` (291 líneas) — código legacy que ya no se importaba desde ningún lugar tras el PR 0.19.0 (split view).

---

## [0.20.0] - 2026-04-24

**Breaking:** el portal público (`web/`) se extrae a su propio repo (`iieg/portal`) con historia preservada vía `git subtree split`. Mariachi queda como panel de administración + API; cada proyecto del ecosistema vive en su propio repo.

### Removido

- Carpeta `web/` completa — ahora en `../portal` como repo independiente.
- Servicio `web` de `docker-compose.dev.yml` + volumen `web_node_modules`.
- Stage `web-builder` de `nginx/Dockerfile`.
- `location /` en `nginx/conf.d/mariachi.conf` (reemplazado por redirect 302 a `/administrador/`).
- Build args de nginx: `VITE_WEB_API_URL`, `VITE_API_TIMEOUT`, `VITE_APP_NAME`.
- Target `shell-web` del Makefile.
- Env vars del portal en los cuatro `.env*`: `WEB_PORT`, `VITE_WEB_PORT`, `VITE_WEB_HOST`, `VITE_APP_NAME`, `VITE_WEB_API_URL`, `VITE_API_TIMEOUT`.

### Cambiado

- `README.md`, `docs/context.md`, `docs/ARCHITECTURE.md`: mariachi se describe como repo con dos componentes (`admin/` + `api/`); remiten a `../portal` para el portal público.
- Endpoint `/api/portal/*` del backend permanece — lo consume ahora el repo `iieg/portal` desde su propio compose.
- Nginx interno: raíz redirige a `/administrador/`.

### Notas

- Split hecho con `git subtree split --prefix=web -b portal-split` + `git pull` al nuevo repo (historia preservada).
- El gateway-hub externo en staging/prod sigue ruteando `/` al portal; el cambio es interno.

---

## [0.19.0] - 2026-04-24

Edición de capas rediseñada a página dedicada con split view (árbol + editor). SIEEJ entra al sider como administrador genérico de formularios (placeholder listo para integración).

### Agregado

#### Editor de capas como página dedicada

- `features/mapalab-layers/pages/LayerEditPage.jsx` — página nueva en ruta `/mapalab/layers/:id/edit`:
    - Layout **split view**: árbol de capas (sticky, 280px) a la izquierda + editor a la derecha (ancho completo).
    - Click en cualquier capa del árbol lateral navega a su edit page sin salir del contexto.
    - **Tabs horizontales** reemplazan el Collapse del drawer: Identidad, WMS, Descarga, InfoBox, Metadatos descriptivos. Cada tab usa todo el ancho disponible.
    - Preview del InfoBox ahora se renderiza **lado a lado** con el formulario del preset (columnas xs=24 md=12).
    - Header fijo con breadcrumb `Capas / <nombre>` + tag de ID + botones de guardar.
    - URL compartible, botón atrás del browser funciona.
- Router: nueva entrada `mapalab/layers/:id/edit` en `admin/src/main.jsx`.
- `LayersPage` ahora navega a la página dedicada en el botón "Editar" (antes abría drawer modal).

#### SIEEJ — administrador de formularios (placeholder)

- Feature nuevo `features/sieej-formularios/` con `FormulariosPage`:
    - Tabla CRUD genérica con campos `slug`, `name`, `description`, `is_active`.
    - Modal para crear/editar.
    - Alert informativa de "módulo en construcción".
- Entry en `PROJECT_REGISTRY` (`sieej-config.jsx`) con item "Formularios" e icono `FormOutlined`.
- Backend stub `api/app/api/routes/formularios.py` bajo `require_project_access('sieej')`:
    - `GET /formularios` → `[]` (permite que la UI cargue).
    - `POST` / `PUT` / `DELETE` → `501 Not Implemented` con mensaje claro.
- Feature visible en el sider para admin global y para editoras/diseñadoras que tengan membership en `sieej`.

### Cambiado

- `LayersPage` eliminó el state y handlers relacionados con el drawer (`editingLayer`, `drawerOpen`, `saving`, `handleSave`). Ahora navega a la página dedicada.
- `LayerEditDrawer` permanece en el código como componente legacy pero ya no se renderiza desde ningún lugar (sin imports activos). Se eliminará cuando se valide la página en producción.

### Notas

- Al entrar a la página dedicada, el tree lateral se carga una vez al mount (hook `useLayerTreeAdmin.reload`). Cambiar de capa desde el tree lateral actualiza la URL y re-renderiza el form con la capa nueva, pero mantiene el árbol intacto — navegación instantánea.
- Para SIEEJ: cuando el backend real del módulo se implemente, la página ya tiene el shape que espera (`{id, slug, name, description, is_active}`). Solo hay que levantar los endpoints reales en `formularios.py`.

---

## [0.18.0] - 2026-04-24

Media por bucket end-to-end + edición de metadatos descriptivos de capas. Cierra el refactor multi-proyecto con funcionalidad visible. Incluye limpieza de archivos `.env*` duplicados en `api/` y normalización de los `.env*.example` con placeholders genéricos.

### Agregado

#### Backend — multi-bucket

- `AcervoClient` refactorizado: soporta un cliente por bucket vía `AcervoClient.for_bucket(bucket)` con cache por `(acervo_bucket, access_key_ref)`.
- `resolve_bucket_credentials(access_key_ref)` — resuelve `{ACERVO_*_ACCESS_KEY, ACERVO_*_SECRET_KEY}` desde env; fallback a `ACERVO_ACCESS_KEY/SECRET_KEY` globales si faltan.
- `AcervoClient.list_objects(prefix, recursive)` — lista objetos reales del bucket.
- Columna `bucket_id` en tabla `media` (FK a `media_buckets`, `ON DELETE SET NULL`). Migración `d1e2f3a4b5c6` + backfill: items existentes apuntan al bucket `portal`.
- `GET /multimedia?bucket_id=<id>` — listado filtra por bucket; `require_bucket_access` via helper `_resolve_bucket_or_403`.
- `POST /multimedia` acepta `bucket_id` en formulario; sube al bucket resuelto y persiste `bucket_id` en la fila de `media`.
- `DELETE /multimedia/{id}` — resuelve el bucket del item para borrar en MinIO + BD.
- `GET /multimedia/objetos-bucket?bucket_id=<id>&prefix=<p>` — endpoint nuevo que lista objetos **reales del bucket en MinIO**, útil para el file picker (no depende de la tabla `media`).
- `PUT /layer-metadata/{layer_key}` relajado de admin-only a editor+admin (consistente con el resto de writes sobre mapalab).

#### Frontend — Media por bucket

- `features/media/components/BucketFilePicker.jsx` — modal que lista archivos de un bucket con soporte para múltiples prefijos (tabs) + búsqueda. Al seleccionar devuelve `{nombre, enlace, url}`. Exportado como API pública del feature media.
- `features/media/api/mediaService`: nuevos `getBuckets()` y `listBucketObjects(bucketId, prefix)`. `getMediaFiles({ bucketId, ... })` ahora requiere `bucketId` explícito (no ejecuta si falta).
- `features/media/pages/MediaPage`: selector de bucket arriba de los filtros (carga al mount, selecciona el primero por default). Los listados y uploads usan el `bucketId` seleccionado.

#### Frontend — Metadatos descriptivos editables

- `features/mapalab-layers/components/layersEditor/LayerMetadataSection.jsx` — sección nueva que carga (`GET /layer-metadata/{layer_key}`) y guarda (`PUT`) metadatos:
    - `descripcion`, `frecuencia`, `fecha_ultima` como inputs simples.
    - `fuentes` y `metodologia` como `Form.List` editable (agregar/quitar entradas).
    - `metadato` (archivos adjuntos) como `Form.List` con pares `{nombre, enlace}` + botón que abre el `BucketFilePicker` apuntado al bucket `mapalab` con prefijos `metadata/txt/` y `metadata/xlsx/`.
    - Si la capa aún no tiene metadatos (404), muestra alert y crea al guardar.
- `useLayerTreeAdmin` expone `getLayerMetadata(key)` y `updateLayerMetadata(key, payload)`.
- `LayerEditDrawer` integra la sección como nueva entrada del Collapse: **"Metadatos descriptivos"**. Usa el `layer.id` como `layer_key`.

#### Variables de entorno

- `.env.development.example`, `.env.staging.example`, `.env.production.example` normalizados con placeholders genéricos: `<user>`, `<password>`, `<host>`, `<port>`, `<domain>`, `<bucket_name>`, etc. Sin IPs, hostnames o puertos hardcodeados.
- Agregadas vars `ACERVO_{PORTAL,MAPALAB,DATEENGINE}_{ACCESS,SECRET}_KEY` (placeholders vacíos) en los tres examples — fallback silencioso a las globales.

### Cambiado

- Todos los endpoints de `/multimedia` ahora operan scoped a un bucket específico. El item `Media` guarda `bucket_id` persistente.
- `AuthContext.loginUser` ya hacía hit a `/perfil` (v0.17.0); el `user` del context incluye `accessible_buckets` que el `MediaPage` y el `BucketFilePicker` consumen.

### Removido

- `.env.example` en la raíz (redundante — los 3 `.env.*.example` cubren todos los entornos).
- Duplicados residuales `api/.env.{development,staging,production}.example` — no estaban en git, eran residuos locales. Los únicos env files viven en raíz.

### Corregido

- Branding drift: `README.md`, `Makefile`, `admin/package.json` description, `admin/src/features/auth/pages/LoginPage.jsx` subtítulo, `admin/src/features/media/api/mediaService.js` `DB_NAME`, y `PROJECT_NAME` / `VITE_ADMIN_APP_NAME` en los `.env*` — eliminan referencias a "CMS" y "Portal" como nombre del proyecto (se reservan "Portal" solo para el sitio público y "Mariachi" para el panel). Afecta solo strings de UI/metadata.

### Notas

- Las credenciales específicas por bucket en producción deben definirse por el equipo de Acervo (user dedicado por bucket). En dev local siguen usando la root credential via fallback.
- El `BucketFilePicker` solo navega objetos reales del bucket; aún no permite subir archivos desde el drawer de capa. Upload viene en un PR posterior si se requiere (hoy se sube desde Media y se referencia el path aquí).

---

## [0.17.0] - 2026-04-24

Sider dinámico con grupo "Plataforma" arriba + grupos por proyecto; form de Usuarios con asignación de proyectos y rol por proyecto; `require_project_access` aplicado a los endpoints de dominio existentes. Primer release con cambios visuales del refactor multi-proyecto.

### Agregado

#### Frontend

- `admin/src/app/sider-config.jsx` — config declarativa del sider: `PLATFORM_ITEMS` (Usuarios, Media, Revisiones con filtro por rol global) y `PROJECT_REGISTRY` (portal → Menú + Páginas; mapalab → Capas; sieej → placeholder). `buildSiderItems(user)` construye los items del Menu AntD desde la config + perfil. Agregar un nuevo proyecto = agregar entry a `PROJECT_REGISTRY`, sin tocar `MainLayout`.
- `MainLayout.jsx` ahora renderiza el sider desde `buildSiderItems`. Primer grupo "Plataforma" (siempre que el usuario tenga rol global con al menos un item), luego un grupo por proyecto al que tenga membresía (admin global ve todos los proyectos registrados). Badge de pendientes en "Revisiones" portado a la config.
- `UsersPage` — form con sección "Proyectos y roles" cuando `role=editora`: un checkbox + select (Editor / Viewer) por proyecto disponible. Hidden para `tetlamamakani` con nota informativa de acceso global. Columna nueva en la tabla que muestra las asignaciones como tags.

#### Backend

- `UsuarioCreate` y `UsuarioUpdate` aceptan `project_assignments: list[UserProjectAssignment] | None`. `POST /usuarios` y `PUT /usuarios/{id}` crean/reemplazan membresías en la misma transacción (atómico).
- `UsuarioResponse` ahora incluye `projects: list[UserProjectMembership]` — `GET /usuarios` y `GET /usuarios/{id}` devuelven las asignaciones.
- `AuthContext.loginUser` hace un hit extra a `/autenticacion/perfil` tras el login para poblar `projects` + `accessible_buckets` en el `user` del context (antes solo traía datos básicos).

### Cambiado

- `/paginas` y `/elementos-menu` ahora requieren `require_project_access("portal")` a nivel de router.
- `/layers`, `/layer-metadata`, `/geoserver` ahora requieren `require_project_access("mapalab")` a nivel de router.
- Admin global (`tetlamamakani`) bypass automático por rol; editoras sin membership al proyecto correspondiente reciben `403`.

### Notas

- Las **creds del usuario** para ediciones siguen usando el rol global (`editora`) como check mínimo; la granularidad de `viewer` (bloquear writes por membership) se afinará cuando haya UI para gestionar roles viewer-only y se pueda validar en integración.
- El form de Users envía `project_assignments: []` explícitamente cuando el rol es `tetlamamakani` para limpiar cualquier asignación previa al cambiar de role.

---

## [0.16.0] - 2026-04-24

Backend multi-proyecto: modelo de dominio `Project` + `UserProject` + `MediaBucket`, extensión de `/auth/me` con proyectos y buckets accesibles, y helpers de autorización (`require_project_access`, `require_bucket_access`). Base del refactor multi-proyecto (Portalito, MapaLab, SIEEJ). Sin cambios visuales ni de flujo en el admin todavía — el consumo frontend llega en PR 3 y 4.

### Agregado

#### Modelos y BD (`iieg_portal`)

- Tabla `projects`: `id`, `slug` UNIQUE, `name`, `description`, `is_active`, `created_at`.
- Tabla `user_projects`: many-to-many usuario↔proyecto con `project_role: editor | viewer`. FK a `usuarios(id)` y `projects(id)` con `ON DELETE CASCADE`.
- Tabla `media_buckets`: `acervo_bucket` UNIQUE, `access_key_ref` (nombre de env var, no cred en BD), `display_name`, `is_public`, `is_active`, FK a `projects(id)`.
- Seeds iniciales en la misma migración:
    - Proyectos: `portal`, `mapalab`, `sieej`.
    - Buckets: `portal` → project portal, `mapalab` y `dateengine` → project mapalab. Los dos primeros `is_public=true` (match con las políticas anónimas GET de Acervo).
    - Backfill: cada usuario `editora` existente recibe membership `editor` en `portal` y `mapalab` para no romper acceso previo.
- Migración: `c0d1e2f3a4b5_add_projects_user_projects_media_buckets.py` sobre branch `mariachi`.

#### Modelos Python

- `app/models/project.py`: `Project`, `UserProject`.
- `app/models/media_bucket.py`: `MediaBucket`.
- Ambos registrados en `app/models/__init__.py`.

#### Schemas Pydantic

- `app/schemas/project.py`: `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `UserProjectAssignment`, `UserProjectMembership`, `BucketSummary`.
- `app/schemas/media_bucket.py`: `MediaBucketCreate`, `MediaBucketUpdate`, `MediaBucketResponse`.
- `app/schemas/user.py`: nuevo `CurrentUserResponse` que extiende `UsuarioResponse` con `projects: list[UserProjectMembership]` y `accessible_buckets: list[BucketSummary]`.

#### Endpoints

- `GET /api/administrador/projects` — lista proyectos activos (cualquier usuario autenticado).
- `POST /api/administrador/projects` — admin-only, crea proyecto.
- `PATCH /api/administrador/projects/{id}` — admin-only, actualiza.
- `GET /api/administrador/projects/{id}/members` — admin-only, lista membresías.
- `PUT /api/administrador/projects/users/{user_id}` — admin-only, reemplaza todas las membresías de un usuario en una sola llamada (payload: `[{project_slug, project_role}]`).
- `GET /api/administrador/media-buckets` — lista buckets visibles para el usuario actual (admin ve todos; editora/diseñadora filtra por proyectos asignados).
- `POST /api/administrador/media-buckets` — admin-only.
- `PATCH /api/administrador/media-buckets/{id}` — admin-only.
- `GET /api/administrador/autenticacion/perfil` — ahora devuelve `CurrentUserResponse` con `projects` y `accessible_buckets` precalculados en un solo hit.

#### Helpers de autorización (`app/api/deps.py`)

- `get_current_user_context()` — inyecta dict con user + memberships + buckets accesibles. Usado por `/autenticacion/perfil`.
- `require_project_access(project_slug, min_role=None)` — dependencia que verifica membership del usuario en el proyecto indicado. Admin global bypass. `min_role="editor"` rechaza viewers.
- `require_bucket_access(bucket_id_param="bucket_id")` — dependencia que verifica que el usuario pertenezca al proyecto dueño del bucket, devuelve el objeto `MediaBucket` resuelto.

### Convenciones introducidas

- **Credenciales por bucket NO viven en la BD.** `media_buckets.access_key_ref` guarda el nombre de una env var (ej. `ACERVO_MAPALAB`) y el backend resuelve `{ref}_ACCESS_KEY` / `{ref}_SECRET_KEY` del entorno en runtime. Evita leaks via dumps de DB.
- **Superadmin es por rol global** (`tetlamamakani`), no por asignación. No hace falta insertar filas en `user_projects` para admins — pueden con todo por defecto.
- **Un usuario puede ser `editor` en un proyecto y `viewer` en otro** (el viewer que pediste para preview sin edición se modela como `user_projects.project_role='viewer'`, no como rol global nuevo).

### Notas

- Los endpoints existentes `/pages`, `/menu`, `/layers`, `/layer-metadata`, `/geoserver` **aún no** usan `require_project_access`. Se aplicarán en PR 3 (sider dinámico + form de Users con proyectos), junto con el UI para asignar proyectos al crear/editar usuarios. Aplicarlo sin ese UI rompería el flujo de alta de usuarios.
- El consumo real de `access_key_ref` por el servicio de Media (cliente MinIO por bucket) llega en PR 4.
- La migración detectó que `init_db.py` inicializaba el schema con `create_all` sin registrar revision en Alembic. Se hizo `alembic stamp b5c6d7e8f9a0` antes de aplicar la nueva — documentar en `DEPLOYMENT.md` cuando exista.

---

## [0.15.0] - 2026-04-24

Reestructura del admin a **feature-sliced architecture** (sin cambios de lógica ni de UI). Preparación para el refactor multi-proyecto (Portalito, MapaLab, SIEEJ) y multi-bucket. Este release es puramente arquitectónico: misma funcionalidad, organización escalable.

### Cambiado

- **`admin/src/` reorganizado en tres zonas**:
    - `app/` — shell de la aplicación: `MainLayout`, `guards/` (`ProtectedRoute`, `RoleProtectedRoute`, `ErrorBoundary`), `providers/MainProvider`.
    - `shared/` — reutilizable entre features: `contexts/AuthContext`, `hooks/useIsMobile`, `services/api`. Se mantiene mínimo a propósito; los componentes solo se promueven a `shared/` cuando se repiten en 3+ features.
    - `features/<nombre>/` — módulos autocontenidos con convención `pages/`, `components/`, `hooks/`, `api/`, `constants/`, `utils/` según aplique, y un barrel `index.js` como API pública.
- **Features de plataforma** (compartidos entre proyectos): `features/auth/`, `features/users/`, `features/media/`, `features/revision/`.
- **Features de proyecto** (con prefijo explícito): `features/portal-pages/`, `features/portal-menu/`, `features/mapalab-layers/`. Prefijo por proyecto para que `git grep` identifique a qué pertenece cada módulo.
- **Renames**:
    - `admin/src/pages/MapalabLayers.jsx` → `admin/src/features/mapalab-layers/pages/LayersPage.jsx`.
    - `admin/src/pages/PageEditor.jsx` → `admin/src/features/portal-pages/pages/PageEditorPage.jsx`.
    - `admin/src/pages/MenuManager.jsx` → `admin/src/features/portal-menu/pages/MenuManagerPage.jsx`.
    - `admin/src/pages/Users.jsx` → `admin/src/features/users/pages/UsersPage.jsx`.
    - `admin/src/pages/Media.jsx` → `admin/src/features/media/pages/MediaPage.jsx`.
    - `admin/src/pages/RevisionQueue.jsx` → `admin/src/features/revision/pages/RevisionQueuePage.jsx`.
    - `admin/src/pages/Login.jsx` → `admin/src/features/auth/pages/LoginPage.jsx`.
    - `admin/src/pages/ChangePassword.jsx` → `admin/src/features/auth/pages/ChangePasswordPage.jsx`.
- **Aliases de Vite simplificados** en `admin/vite.config.js`: se reemplazan los 10 aliases granulares (`@components`, `@pages`, `@providers`, `@utils`, `@hooks`, `@services`, `@contexts`, `@constants`, `@layouts`) por tres semánticos: `@app`, `@features`, `@shared` (más `@` y `@assets` existentes).
- **Imports actualizados** en toda la codebase del admin siguiendo el nuevo layout. Los archivos se movieron con `git mv` para preservar la historia.

### Reglas de arquitectura introducidas

- Features de proyecto (`portal-*`, `mapalab-*`, `sieej-*`) **no importan entre sí**.
- Features de proyecto **pueden consumir** features de plataforma (`users`, `media`, `revision`) vía sus barrels (ej: `import { FilePicker } from '@features/media'`).
- `shared/` nunca importa de `features/`.
- `app/` puede importar de `features/` solo para registrar rutas y el sider (el entry point es `main.jsx` y eventualmente `app/routes.jsx`).

### Notas

- Sin cambios de comportamiento runtime. Tests y linter pasan. El build genera chunks por feature gracias a los `lazy()` desde barrels.
- Siguiente paso: backend multi-proyecto (PR 1 del plan) — tablas `projects`, `user_projects`, `media_buckets`, endpoints y seeds.

---

## [0.14.0] - 2026-04-24

Homologación de configuraciones, tooling, stack frontend/backend y estilo de documentación con mapalab (referencia más madura del ecosistema IIEG). Reorganización del stack dev para imágenes Docker nombradas y arranque rápido; observabilidad Sentry end-to-end; nginx interno purgado de limitaciones (gateway-hub es el único rate limiter y productor de security headers); documentación uniformada en tono, acentos, diagramas y frontmatter.

### Agregado

#### Infraestructura y orquestación

- `api/Dockerfile` multi-stage con targets `development` (instala `.[dev]`) y `production` (solo runtime), BuildKit cache mount sobre `pip`.
- `admin/Dockerfile.dev` y `web/Dockerfile.dev` — imágenes propias con `npm install` bakeado; arranque instantáneo en lugar de reinstalar deps en cada `up`.
- `.dockerignore` por servicio en `api/`, `admin/` y `web/` (raíz global eliminado).
- `docker-compose.dev.yml`: imágenes nombradas uniformemente (`mariachi-api-dev`, `mariachi-admin-dev`, `mariachi-web-dev`, `mariachi-postgres-dev`, `mariachi-redis-dev`) vía `build` + `image`; postgres/redis usan `build.dockerfile_inline` para taggear sin archivo extra.
- `Makefile`: export de `UID`/`GID` al compose (ownership correcto en volúmenes montados), targets `setup-hooks` (`git config core.hooksPath .githooks`) y `ensure-networks` (crea `iieg-network` si no existe).

#### CI/CD

- `.github/workflows/auto-merge.yml` nuevo — on push a `develop`, corre backend + admin + web y abre/actualiza PR `develop → main` con auto-merge si pasa.
- `test-frontend.yml` enriquecido con `npm test --if-present` y `npm run check:dead-code:strict --if-present` (corren cuando los scripts existan en el `package.json`).

#### Frontend (admin y web)

- `eslint-plugin-jsx-a11y` integrado para cobertura de accesibilidad.
- Regla `no-restricted-imports` que bloquea imports `.png` — forzar WebP/SVG por performance.
- `rollup-plugin-visualizer` para análisis de bundle (`dist/stats.html`).
- Vendor splitting con `manualChunks` en admin (`react-vendor`, `antd`, `dnd-kit`, `sentry`) y en web (`react-vendor`, `sentry`).
- `@sentry/react` + `@sentry/vite-plugin` con guard por `VITE_SENTRY_DSN` (no-op si vacío).
- `lint-staged` con `eslint --max-warnings=0` para pre-commit.
- Scripts npm nuevos: `test`, `test:ui`, `test:coverage`, `check:dead-code`, `check:dead-code:strict`, `prepare` (bootstrap de git hooks).
- DevDeps para testing: `vitest`, `@vitest/coverage-v8`, `@vitest/ui`, `@testing-library/{dom,jest-dom,react}`, `happy-dom`, `knip`.

#### Backend

- `sentry-sdk[fastapi]` inicializado en `app/main.py` condicional por `settings.sentry_dsn`.
- `coloredlogs` y `rich` para DX.
- Campos `sentry_dsn` y `sentry_traces_sample_rate` en `core/settings.py`.

#### Nginx interno

- Nueva location `/api/administrador/media/` con `proxy_read_timeout 600s`, `proxy_buffering off`, `proxy_request_buffering off` — endpoint dedicado para uploads grandes al Acervo sin timeouts cortos.
- Optimizaciones: `keepalive 32` en upstream, `worker_connections 2048`, `proxy_buffering` + buffers (16k/32k), `open_file_cache`, `reset_timedout_connection`.

#### Variables de entorno

- Bloque Sentry en `.env.example`, `.env.development.example`, `.env.staging.example`, `.env.production.example`: `VITE_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- `docker-compose.yml` y `docker-compose.dev.yml`: pasan `SENTRY_DSN` y `SENTRY_TRACES_SAMPLE_RATE` al api; `nginx/Dockerfile` recibe `VITE_SENTRY_DSN` + tokens de auth como build args para ambos builders (`web-builder` y `admin-builder`).

### Cambiado

- **Frontend bumps a paridad con mapalab**:
    - React `19.2.4` → `19.2.5`
    - React Router `7.13.0` → `7.14.2`
    - Vite `7.3.1` → `7.3.2`
    - ESLint `9.39.2` → `10.2.1` (major)
    - `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` actualizados.
- **Backend runtime Python**: `requires-python>=3.12` (antes `>=3.10`). `ruff target-version = "py312"` y `mypy python_version = "3.12"` (coinciden con el Docker runtime real).
- **Nginx interno — eliminadas todas las limitaciones** (gateway-hub las aplica upstream):
    - `limit_req_zone` y `limit_req` removidos.
    - `server_tokens off` removido (gateway lo oculta).
    - `client_max_body_size` global puesto a `0` (ilimitado local; gateway limita).
    - Timeouts `/api/` diferenciados: `connect 10s / send 120s / read 120s` (antes `60s` en todo).
- **Docker**:
    - `docker-compose.yml`: servicio `api` con `build.target: production`.
    - `docker-compose.dev.yml`: servicios `web` y `admin` con `build` + `image` dedicados (antes usaban `image: node:24-alpine` y ejecutaban `npm install` inline en cada `up`).
- `docs/CONTRIBUTING.md`: paths obsoletos `backend/`, `frontend/`, `cms/` corregidos a `api/`, `web/`, `admin/`; branding "Portal IIEG" → "Mariachi".
- `docs/PENDIENTES.md`: `cd.yml` registrado en el roadmap de v1.0-beta como pendiente (SSH deploy + health-check + notificaciones Discord; referencia `mapalab/.github/workflows/cd.yml`).

### Corregido

- `api/pyproject.toml`: agregado `[tool.setuptools.packages.find] include = ["app*"]` — `pip install -e .` fallaba con "Multiple top-level packages discovered: app, alembic" al correr el Dockerfile multi-stage.
- `admin/package.json` y `web/package.json`: eliminado `eslint-plugin-react@7.37.5` — peer dep incompatible con ESLint 10 (pedía `eslint@<=9.7`); no se usaba en `eslint.config.js`.
- `docs/DATAENGINE_CREDENTIALS.md`: `SELECT version()` (falso positivo del sweep de acentos — es una función SQL, no prosa).
- `docs/CHANGELOG.md`: `text/plain; version=0.0.4` (idem — es un parámetro de content-type).

### Removido

- `eslint-plugin-react` de admin y web (incompatible con ESLint 10 y sin uso en el config).
- `.dockerignore` en la raíz (reemplazado por uno por servicio).
- Rate limit en memoria en nginx interno — gateway-hub es el rate limiter autoritativo del stack IIEG. El rate limit en memoria del api/app (`app/api/rate_limit.py`) queda como defensa en profundidad.
- Security headers en nginx interno — gateway-hub ya inyecta HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, COOP, X-Permitted-Cross-Domain-Policies, CSP. Duplicarlos solo causa drift.

### Documentación

Estilo homologado con mapalab (referencia más madura):

- Emojis eliminados de headings y tablas en todos los docs.
- Numeración `## N.` removida de `context.md` y `DATAENGINE_CREDENTIALS.md`.
- Acentos consistentes en 11 docs + README (sweep de ~60 términos: `configuración`, `migración`, `documentación`, `específico`, `también`, `después`, `automáticamente`, `política`, `topología`, `versión`, etc.).
- Frontmatter estandarizado en 5 docs principales (`context.md`, `ARCHITECTURE.md`, `ALEMBIC_MULTI_ENV.md`, `DATAENGINE_CREDENTIALS.md`, `COOKIES_CSRF.md`): bloque `> resumen` + línea `**Versión:** 0.14.0 · **Última actualización:** 2026-04-24`.
- Diagrama ASCII de arquitectura en `docs/COOKIES_CSRF.md` migrado a Mermaid `sequenceDiagram`.

### Dependencias

- Requiere **Python 3.12+** en el entorno del backend (antes 3.10+).
- Frontend requiere Node 20+ en CI/CD (no cambió, pero vale mencionar).

---

## [0.13.0] - 2026-04-23

Admin CMS responsive en mobile con paleta de marca de MapaLab, login minimalista, conectividad end-to-end con mapalab + DataEngine en dev, y migraciones de deprecaciones AntD 6.

### Agregado

#### Admin responsive + rebrand
- `admin/src/hooks/useIsMobile.js` — wrapper de `Grid.useBreakpoint` (`isMobile = !screens.md`). Patron uniforme para 12 paginas/componentes que ahora se adaptan a mobile.
- `MainLayout`: `Sider` se reemplaza por `Drawer` lateral en mobile (`<md`); `Header` con padding reducido y nombre de usuario oculto, solo avatar.
- `index.css`: tweaks globales de mobile (padding de Card/Layout, `ant-modal` al ancho del viewport, `ant-drawer-content-wrapper` max 100vw, `ant-card-head-wrapper` apilado, `img { max-width: 100% }`).
- Paginas con breakpoint: `Users`, `Media`, `RevisionQueue`, `MenuManager`, `MapalabLayers`, `PageEditor`, `ChangePassword`. Headers apilan en mobile, tablas con `scroll: { x: 'max-content' }` y `pagination.simple`, botones `block` en mobile, acciones icon-only.
- Drawers y modales responsive: `LayerEditDrawer` y `BulkTagsDrawer` pasan a `placement="bottom"` + `height: 92%` en mobile; Modales de menu, publish, rechazo, preview, upload y edit con `width: '100%'` centered.
- **Paleta de marca de MapaLab** aplicada al tema global del admin (`admin/src/providers/MainProvider.jsx`): `colorPrimary` = `#2e4372` (numeralia), `colorWarning` = `#FF8300` (orange), `Menu` dark con seleccionado en `#5C2472` (purple), trigger del sider en purple. Constantes exportadas como `BRAND`.
- **Login minimalista**: sin gradiente pesado ni Card con sombra; inputs `variant="filled"`; barrita de marca con gradiente de los 3 colores de MapaLab. Titulo "Mariachi", subtitulo compacto. Responsive nativo.

#### Conectividad dev
- `admin/vite.config.js`: nuevo proxy `server.proxy['/mapalab']` apuntando a `mapalab-dev-frontend-1:3006`. `headers.host = 'localhost'` para saltar `allowedHosts` de Vite 7 del mapalab. Env var `VITE_MAPALAB_PROXY_URL`.
- `docker-compose.dev.yml`: servicio `admin` se conecta a `mapalab-network` (external). Servicio `api` se conecta a `dataengine-network` (external). `extra_hosts: host.docker.internal:host-gateway` en `api` para alcanzar el backend de mapalab que corre en `network_mode: host`.
- **`MAPALAB_BACKEND_URL`** en `.env.development` y `.env.development.example` (`http://host.docker.internal:8001` en dev). Sin esta var, `mapalab_notifier` hace early return y `mapalab.layer_tree_cache` nunca se invalida — el editor "no aplica" los cambios.
- **`DATAENGINE_DATABASE_URL`** completada en `.env.development` apuntando a `dataengine-primary:5432/iieg_gis` por nombre de contenedor. Password del rol `mariachi_layers` regenerada (el rol ya existia provisionado via `mapalab-dataengine`).

#### Retry previo (venia de [No publicado])
- `mapalab_notifier`: retry con backoff exponencial (3 intentos, delays 0.5s y 1s) al invocar `POST /layers/refresh-cache` en mapalab. Tras agotar reintentos incrementa el counter `mariachi_tree_notify_failed_total` (expuesto en `/metrics`) y loguea `ERROR` para alerta en Loki.

### Cambiado

- **`ConfigProvider` envuelve ahora un `<App>` de AntD** (`MainProvider.jsx`) para que `message.*` y `Modal.confirm/info/...` puedan consumir tema. Callers siguen usando la API estática — migrar a `App.useApp()` queda como deuda (16 archivos).
- **Migraciones de deprecaciones AntD v6**:
    - `Alert.message` → `Alert.title` (15 ocurrencias en 9 archivos: Login, ChangePassword, MapalabLayers, InfoBoxJsonEditor, BulkTagsDrawer, MenuItemModal, PublishChangesModal, SEOAnalyzer, SEOEditor).
    - `Drawer.width/height` → `styles.wrapper` (`MainLayout`, `LayerEditDrawer`, `BulkTagsDrawer`, `PageEditor`).
    - `<Collapse.Panel>` children → `items` prop (`LayerEditDrawer`).
    - `<Spin tip>` standalone → `<Spin>` con texto debajo (`main.jsx`, `MapalabLayers.jsx`).
- **Política de ownership del schema `mapalab.*`**: las migraciones con `-x db=dataengine` son la fuente autoritativa. `mapalab-dataengine/jobs/bootstrap/v14_schema.sql` queda frozen como baseline. Cambios futuros de schema viven unicamente en `alembic/versions/dataengine/`.
- `docs/context.md`: actualizado PostgreSQL a 18 (prod y dev) — el README previo decía 16 en prod, drift de documentación resuelto.

### Corregido

- **Cache de `layer_tree_cache` no se invalidaba** tras cada CRUD en mariachi (los cambios del editor no aparecian hasta el cron diario). Root cause: `MAPALAB_BACKEND_URL` vacío en dev. Fix arriba en "Agregado / Conectividad dev".
- **500 + CORS aparente al editar capa**: no era CORS sino que el API explotaba con `RuntimeError: DATAENGINE_DATABASE_URL no esta configurado`, lo que impedia los headers CORS. Fix: URL completada + red `dataengine-network` + GRANTs sobre tablas preexistentes (automatizado en `mapalab-dataengine` v1.6.0 — paso 3b de `bootstrap-v14.sh`).
- `tests/test_integration_notify.py`: patch pattern `httpx.Client` recursivo arreglado. 4 tests pre-existentes que fallaban ahora pasan. Agregados 2 tests nuevos (`test_notifier_retries_on_failure`, `test_notifier_succeeds_on_retry`).

### Documentación

- `docs/context.md`:
    - §5 nueva tabla "Topología por entorno" (dev/staging/prod): cómo se alcanzan los vecinos (mapalab, dataengine, acervo, geoserver) — dev/staging via redes docker compartidas, prod via hostname/DNS + gateway-hub. Implicacion: el proxy `/mapalab` del Vite solo se usa en dev.
    - §14 changelog con entries de 2026-04-23.
- `docs/DATAENGINE_CREDENTIALS.md` §3.1: documenta que los GRANTs sobre `mapalab.*` cuando las tablas las crea otro rol se aplican automáticamente en el paso 3b de `bootstrap-v14.sh` de `mapalab-dataengine`. Ya no hay runbook manual.
- `README.md`: agregada linea de versión (`**Versión:** 0.12.0`), actualizada a 0.13.0.
- `docs/ALEMBIC_MULTI_ENV.md`: documentada la política de ownership del schema `mapalab.*`.

### Dependencias

Requiere `mapalab-dataengine >= 1.6.0` en prod para que el paso 3b aplique los GRANTs automáticamente. Sin esa versión, re-aplicar los GRANTs manualmente (ver `DATAENGINE_CREDENTIALS.md` §3.1).

---

## [0.12.0] - 2026-04-22

Editor de capas avanzado (drag & drop, preview InfoBox, editor JSON custom, formularios por preset), endpoint `/metrics` Prometheus y code-split del admin.

### Agregado

- **Drag & drop de reorden** en `MapalabLayers.jsx` vía `Tree.draggable`. Solo admin, solo siblings con mismo padre. Usa `PATCH /layers/reorder`.
- **`BulkTagsDrawer`** del release anterior ahora visible solo para admin desde el extra del card.
- **Editor InfoBox enriquecido** en `LayerEditDrawer.jsx`:
    - `InfoBoxPresetForm.jsx` renderiza campos específicos por preset (`municipio`, `punto`, `punto_municipio`, `punto_ubicacion`, `punto_completo`).
    - `InfoBoxPreview.jsx` muestra preview con datos dummy (badges de municipio/característica, listas, iconText, stats, texto).
    - `InfoBoxJsonEditor.jsx` para preset `custom` (textarea monospace con validación JSON en vivo; `key={layer.id}` para evitar contaminación entre capas).
    - Form incluye `infoboxParams` (dict) e `infoboxConfig` (JSON custom).
- **Endpoint `/metrics`** en `app/api/metrics.py` (formato Prometheus plain text). Contadores:
    - `mariachi_rate_limit_hits_total` — incrementado en `app/api/rate_limit.py`.
    - `mariachi_tree_notify_total` — incrementado en `app/services/mapalab_notifier.py`.
    - `mariachi_geoserver_calls_total` — incrementado en los 3 endpoints de `routes/geoserver.py`.
    - Sin dependencias nuevas: `defaultdict[str, int]` + `threading.Lock`.
- **Code-split del admin** en `src/main.jsx`: `React.lazy()` + `Suspense` para `Users`, `MenuManager`, `PageEditor`, `Media`, `RevisionQueue`, `MapalabLayers`. Chunks separados por página (`MapalabLayers` ~43 kB, ~15 kB gzip). Bundle inicial no carga tree ni editor rico.
- **Tests integración cruzada** (`tests/test_integration_notify.py`):
    - Notifier skip cuando `mapalab_backend_url` vacío.
    - Notifier POST a `/layers/refresh-cache` con URL correcta (mock via `httpx.MockTransport`).
    - Debounce consolida 5 llamadas en 1 single hit.
    - `/metrics` devuelve `text/plain; version=0.0.4`.
    - `incr()` thread-safe (10 threads × 1000 incrementos == 10_000 final).

### Cambiado

- `useLayerTreeAdmin` expone `reorderLayers(parentId, orderedIds)` además de los hooks previos.
- `LayerEditDrawer` usa `Form.useWatch` en 5 campos (workspaceAlias, geoserverLayer, infoboxTemplate, infoboxParams, infoboxConfig) — elimina todo state paralelo.

### Integración huachicol

- `MARIACHI_BACKEND_TARGET` agregado a `scripts/generate-targets.sh` y `.env.example` del stack de monitoreo. Prometheus (file_sd) detecta el target en ~30s tras `make targets`.

---

## [0.11.0] - 2026-04-22

Mariachi ahora se levanta detrás de `gateway-hub` en la red `iieg-network`. El nginx interno queda minimal: solo sirve los estáticos de `admin/` y `web/`, y hace proxy a `/api/`. Gateway-hub arriba se encarga de SSL, redirects, `robots.txt`, `sitemap.xml`, headers de seguridad y proxies a `mapalab`, `acervo` y `geoserver`.

### Agregado

- `docker-compose.yml` declara la red externa `iieg-network` y conecta los servicios `nginx` y `api` a ella (además de `mariachi_network` interna para `postgres` y `redis`).

### Cambiado

- `docker-compose.yml`: el servicio `nginx` ya no expone `80/443` al host; ahora usa `expose: 80` para ser alcanzable solo desde `iieg-network`.
- `nginx/Dockerfile`: deja de copiar `nginx/ssl/`, deja de usar `envsubst` sobre el template y arranca nginx directo. `EXPOSE 80` únicamente.
- `nginx/conf.d/mariachi.conf` simplificado a HTTP-only en `:80`:
    - Un solo `server` block.
    - `location /api/` → `mariachi_api` (sin cambios).
    - `location /administrador` → estáticos del CMS.
    - `location /` → estáticos del sitio público.
    - Eliminados: `listen 443 ssl`, redirect `80 → 443`, bloque `ssl_*`, `server_name` con placeholder, HSTS y demás headers de seguridad, `robots.txt`, `sitemap.xml`, CORS en `/api/` y los locations `/mapalab/`, `/acervo/`, `/geoserver/`. Todo eso vive ahora en gateway-hub.
- `docker-compose.yml`: removido `env_file: ./nginx/.env` del servicio nginx (ya no aplica sin template SSL).

### Removido

- `nginx/.env.example` eliminado del repo (variables `SSL_CERTIFICATE`, `SERVER_NAME`, `MAPALAB_HOST`, `GEOSERVER_HOST`, `ACERVO_HOST`, `CORS_ALLOWED_ORIGIN` ya no se consumen — gateway-hub es responsable de todo eso).
- `nginx/static/` (robots.txt, sitemap.xml) eliminado. Gateway-hub sirve esos archivos arriba.

### Notas de deploy

Para que gateway-hub alcance a mariachi en staging/prod:
- El container `mariachi-nginx` debe estar en la red Docker externa `iieg-network` (el compose ya lo declara).
- En el `.env` de gateway-hub: `PORTAL_HOST=mariachi-nginx:80`.
- La red `iieg-network` debe existir en el host (`docker network create iieg-network` si aún no).

Dev local (`docker-compose.dev.yml`) no se ve afectado: sigue usando Vite en 3010/3011 y el API en 8000.

---

## [0.10.0] - 2026-04-22

Soporte explícito para los tres entornos (development, staging, production) y CI básico en GitHub Actions.

### Agregado

- Archivos `.env.staging.example` y `.env.production.example` con los overrides específicos de cada entorno (`COOKIE_SAMESITE=strict` en prod, `COOKIE_SECURE=true` en ambos, bucket y URLs distintos).
- `Makefile` acepta `ENV=staging`; selecciona `docker-compose.yml` con `.env.staging` o `.env.production` según corresponda.
- `make setup` crea también `.env.staging` y `.env.production` a partir de sus ejemplos.
- Campo `environment: Literal["development", "staging", "production"]` en `app/core/settings.py`, leído desde `ENVIRONMENT`.
- `model_validator` en settings que en `environment == "production"` fuerza `docs_url`, `redoc_url` y `openapi_url` a `None`, fuerza `cookie_secure=True` y rechaza `"*"` en `CORS_ORIGINS`.
- Workflows CI en `.github/workflows/`:
    - `commit-lint.yml` — valida Conventional Commits en cada PR.
    - `ci.yml` — se dispara en push a ramas de feature y en PRs; lanza los 3 jobs en paralelo.
    - `test-backend.yml` (reusable) — `ruff check` + `pytest` sobre `api/`.
    - `test-frontend.yml` (reusable, parametrizado por `app`) — `npm ci` + `npm run lint` + `npm run build` sobre `admin/` o `web/`.

### Cambiado

- Variable `ENV` renombrada a `ENVIRONMENT` en los archivos `.env.*.example` (evita colisión con la variable `ENV` del Makefile).
- `docker-compose.yml`: `env_file` del servicio `api` pasa de `./.env` hardcodeado a `${API_ENV_FILE:-./.env}`, para que `make up ENV=staging` cargue `.env.staging`.
- `openapi_url` en settings pasa de `str` requerido a `str | None = None` (consistente con `docs_url`/`redoc_url`).

### Seguridad

- `.gitignore` ignora también `.env.staging`.
- En producción, los endpoints `/docs`, `/redoc` y `/openapi.json` quedan deshabilitados por defecto aunque el `.env` los defina.

### Notas

- CD queda intencionalmente fuera de esta versión: aún no hay entorno real al que desplegar. Cuando exista, agregar `cd.yml` tomando como referencia el de `mapalab`.

---

## [0.9.0] - 2026-04-22

Hardening del módulo de edición de capas: selector GeoServer dinámico, edición masiva de tags y rate limiting en memoria.

### Agregado

- **Selector GeoServer en `LayerEditDrawer`**: `workspaceAlias` y `geoserverLayer` se eligen desde listas pobladas vía `/geoserver/workspaces`; `styles` autocompletado desde `/geoserver/workspaces/{alias}/layers/{layer}/styles`. Evita errores de captura manual.
- **Edición masiva de tags**:
    - Backend: `PATCH /layers/bulk-tags` acepta `{ updates: [{id, tags}] }` (máx 500). Reporta `updated` y `not_found`.
    - Admin: `BulkTagsDrawer.jsx` parsea paste TSV desde Excel/Sheets con preview en tabla.
- **Rate limiter en memoria** (`app/api/rate_limit.py`) con sliding window per user_id:
    - `60 req/min` en writes de `/layers` y `/layer-metadata`.
    - `120 req/min` en reads de `/geoserver` (protege GeoServer REST).
    - Responde `429` con header `Retry-After`.
- `useLayerTreeAdmin` expone `listGeoserverWorkspaces`, `listGeoserverFields`, `listGeoserverStyles`, `bulkUpdateTags`.

### Cambiado

- Todos los endpoints write de `/layers` y `/layer-metadata` añaden dependencia `_write_rate_limit`.
- `/geoserver/*` añaden `_read_rate_limit`.

---

## [0.8.0] - 2026-04-22

Módulo de edición de capas (integración con MapaLab), unificación de la nomenclatura del proyecto bajo `mariachi`, migraciones Alembic multi-entorno y sanitización del repo para apertura como público.

### Agregado

#### Módulo de edición de capas (integración con MapaLab)

Mariachi expone desde el CMS un editor del árbol de capas que materializa los cambios en la base de datos de **DataEngine** (externa) y avisa al backend de mapalab para invalidar su cache. Este módulo es una integración; no se mezcla con el versionado de mapalab.

- Segunda conexión a BD vía `DATAENGINE_DATABASE_URL`, con engine lazy y dependencia `get_dataengine_db()` en `app/core/database.py`.
- Modelos SQLAlchemy para `Layer`, `Workspace`, `InitialLayerOrder`, `LayerMetadata`, `LayerStats` (sobre `DataEngineBase`).
- Rutas nuevas en `/api/administrador`:
    - `/layers/*`: CRUD de capas con validación contra GeoServer, reorder y duplicate.
    - `/layer-metadata/{layer_key}`: CRUD de metadata descriptiva.
    - `/layer-metadata/{layer_key}/stats`: CRUD de numeralia y `stats_config`.
    - `/geoserver/*`: introspección REST (workspaces, capas, campos, estilos).
- Aprobación de borradores tipo `layer` (`POST /borradores/por-id/{id}/aprobar`) que materializa el borrador en DataEngine.
- Cliente `GeoServerClient` sobre `httpx` con `GeoServerError`.
- Notificador `mapalab_notifier.notify_tree_changed()` para invalidar el cache del árbol en el backend de mapalab.
- Service `stats_templates` con resolución de templates de InfoBox.
- Scripts: `api/scripts/seed_layers.py`, `api/scripts/migrate_mapalab_card.py`.
- Tests: `api/tests/test_layer_service.py`.
- CMS: página `MapalabLayers` con árbol Ant Design + drag & drop y drawer de edición (`admin/src/components/layersEditor/LayerEditDrawer.jsx`) + hook `useLayerTreeAdmin`.
- Reestructuración del menú lateral del admin en dos grupos: **Portalito** y **Mapalab**.

#### Infraestructura

- **Alembic multi-environment**: migraciones separadas por BD (`-x db=mariachi|dataengine`, `version_table` distinta por entorno). Las versiones viejas se reubicaron en `alembic/versions/mariachi/` y se agregó `alembic/versions/dataengine/`.
- Variables nuevas: `DATAENGINE_DATABASE_URL`, `DATAENGINE_POOL_SIZE`, `DATAENGINE_MAX_OVERFLOW`, `GEOSERVER_URL`, `GEOSERVER_USER`, `GEOSERVER_PASSWORD`, `GEOSERVER_TIMEOUT`, `MAPALAB_BACKEND_URL`.
- `httpx>=0.26,<0.28` promovido a dependencia de runtime.
- Scripts utilitarios en `scripts/`:
    - `migrate-acervo-bucket.sh` — migra bucket `portal-dev` → `mariachi-dev` vía `mc`.
    - `rename-github-repo.sh` — actualiza el remote local tras renombrar el repo en GitHub.
- Documentación: `docs/DATAENGINE_CREDENTIALS.md`, `docs/ALEMBIC_MULTI_ENV.md`, `docs/context.md`.

### Cambiado

- Nomenclatura interna del proyecto: `portal*` → `mariachi*` (containers, redes, upstream nginx, template `portal.conf` → `mariachi.conf`, paquetes `backend-portal` → `mariachi-api`, `admin-portal` → `mariachi-admin`, `web-portal` → `portal-web`).
- Branding del sidebar del admin actualizado a `Mariachi` / `MA`.
- `COOKIE_DOMAIN` configurable para compartir sesión con `/mapalab/*`.

### Seguridad

- `COOKIE_DOMAIN` en `.env.example` pasa de dominio real hardcodeado a placeholder genérico.
- `docs/context.md` y `docs/DATAENGINE_CREDENTIALS.md` sanitizados: se remueven dominios reales de producción, IPs internas, rutas absolutas locales y nombres de servicios vecinos internos.
- `scripts/rename-github-repo.sh`: owner/repo parametrizados por variables de entorno.

---

## [0.7.0] - 2026-03-05

### Agregado

- Revamp de la documentación de arquitectura con stacks tecnológicos detallados y diagrama actualizado.
- Headers de seguridad adicionales en nginx.

---

## [0.6.1] - 2026-02-20

### Cambiado

- `burst` del rate limit de `/geoserver/` incrementado de `20` a `50` (commit `82b3c76`).

---

## [0.6.0] - 2026-02-18

### Agregado

- Sistema de borradores y revision queue para páginas y menús; refactor de componentes de página al nuevo carrusel (commit `c0e652b`).
- Setting `ACERVO_VERIFY_SSL` para controlar la verificación del certificado del Acervo.
- Mejora en el lookup de usuario en `init_db`.

### Cambiado

- Ajustes de títulos en alertas del UI.

### Corregido

- `expected_updated_at` excluido del `model_dump` del schema de página (evita 400 al guardar) (commit `bf9dbfe`).

---

## [0.5.0] - 2026-02-17

### Agregado

- Renderizado dinámico de páginas con modelo basado en bloques (reemplaza páginas estáticas) (commit `b45f2a0`).
- `robots.txt` y `sitemap.xml` servidos desde nginx (commit `035dd5e`).
- Soporte HTTPS para Acervo: proxy nginx, generación dinámica de URLs y nuevas variables de entorno (commit `009eb14`).

### Cambiado

- Eliminación de Mock Service Worker y actualización de componentes Ant Design en `JsonEditorModal` (commit `50e8fe3`).
- Limpieza de funcionalidad no usada.

---

## [0.4.0] - 2026-02-16

### Agregado

- Sistema de borradores y publication requests; must-change-password para usuarios nuevos; refactor de object storage a Acervo (commit `8a4669d`).
- Rate limiting, security headers y timeouts reducidos en nginx; carga aislada de variables de entorno para el proxy (commit `3cc9a7f`).

### Cambiado

- Modificador `^~` en locations `/mapalab/`, `/acervo/`, `/geoserver/` para prefix matching explícito (commit `b81fd32`).

---

## [0.3.0] - 2026-02-09

### Agregado

- Sistema de notificaciones.
- Gestión de menú refactorizada con árbol ordenable y estado de visibilidad mejorado (commit `5905933`).

### Cambiado

- Ant Design: prop `direction` de `Space` renombrada a `orientation` en múltiples vistas (commit `cd5dd62`).

---

## [0.2.0] - 2026-01-27

### Agregado

- Proxy reverso Nginx con terminación SSL para acceso unificado a web, admin y API (commit `f65db8a`).
- Variables de entorno para URLs de API, timeouts y nombres de app en el build del frontend (commit `09c3027`).

### Cambiado

- Build frontend consolidado multi-stage en el Dockerfile de nginx; assets servidos directamente (commit `c19e968`).
- URLs distintas para admin y web en la configuración del API service; mejora en el redirect de login del admin (commit `7cd7f44`).
- Rename del prefijo de API `/cms` → `/administrador`; ajuste de Docker build contexts y configuración Nginx (commit `8ec6ab7`).
- Ajustes menores en `docker-compose.yml`: path del `env_file` del API y eliminación de image names explícitos para `portal-web` y `portal-admin`.

---

## [0.1.0] - 2026-01-26

Primer release del monorepo unificado.

### Agregado

- Inicialización del monorepo (commit `ac7df89`): backend FastAPI (`api/`) + sitio público (`web/`) + CMS (`admin/`) + infra Docker Compose.
- History service (commit `1607dbe`).

### Cambiado

- Componentes renombrados en docs: Frontend/CMS/Backend → Web/Admin/Api.
- Eliminado el servicio MinIO local; el API se conecta a una instancia externa (Acervo) vía nuevas variables de entorno (commit `e5d3149`).

---

## Historial previo al monorepo

Antes del monorepo, el versionado se llevaba por componente. Se conserva aquí como referencia. Los números de esta sección son los originales de cada componente — no son comparables con la nueva línea `0.x` del monorepo.

### Backend

#### [1.2.0] - 2025-11-05

- **Agregado**: Schemas `FolderCreate` y `FolderResponse` para validación y respuestas de carpetas de media.
- **Cambiado**: `POST /media/folders` acepta JSON body.
- **Corregido**: Error 422 al crear carpetas desde el CMS.

#### [1.1.0] - 2025-11-05

- **Agregado**: Cookies httpOnly para tokens JWT, tokens CSRF firmados con JWT, middleware `verify_csrf()`, documento `COOKIES_CSRF.md`.
- **Cambiado**: Login establece cookie httpOnly; todos los endpoints mutables requieren CSRF.

#### [1.0.0] - 2024-11-04

- Autenticación OAuth2 + JWT, gestión de usuarios con roles (`tetlamamakani`, `editora`, `diseñadora`), páginas dinámicas con secciones y componentes, gestión de menú jerárquico, integración MinIO/S3, layouts configurables, historial de acciones, búsqueda global, Docker Compose con PostgreSQL, Redis y MinIO.

### Frontend (`web/`)

#### [0.0.2] - 2025-11-05

- **Agregado**: Servicios `layoutService`, `menuService`, `pageService`, `styleService`; header personalizable; menú dinámico.
- **Cambiado**: Refactor a servicios por dominio; `GlobalProvider` con carga paralela.

#### [0.0.1] - 2025-09-15

- Inicialización del proyecto: React + Vite + Tailwind.

### CMS (`admin/`)

#### [0.0.4] - 2025-11-05

- **Agregado**: `MediaSelector`, `HeaderLayoutForm`, `FooterLayoutForm`; header personalizable.
- **Cambiado**: `Layouts.jsx` refactorizada (-79% líneas).

#### [0.0.3] - 2025-11-05

- **Agregado**: Soporte para cookies httpOnly; interceptor Axios para CSRF.
- **Cambiado**: Migración de `localStorage` a `sessionStorage` para CSRF.

#### [0.0.2] - 2025-10-28

- **Cambiado**: Migración de Tailwind CSS 4 a Ant Design 5.

#### [0.0.1] - 2025-10-28

- Inicialización del CMS: React 19 + Vite 7 + Ant Design 5.
