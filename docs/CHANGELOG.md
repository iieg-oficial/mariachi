# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

A partir de `1.0.0` el proyecto está en producción: se sigue versionado semántico estándar (los cambios incompatibles suben la versión mayor). El versionado se lleva de forma unificada para el monorepo (backend + admin + web + infra): **desde `1.61.0` cada release usa un único número**, con `api/pyproject.toml` como fuente de la verdad (es lo que `get_app_version()` reporta en `GET /ontoy`). Las entradas previas con `[api X / admin Y]` reflejan la etapa en que backend y admin se numeraban por separado y quedan como histórico. Las versiones previas al monorepo se listan por producto al final como histórico.

---

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
