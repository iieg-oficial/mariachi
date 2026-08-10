# Plugin de QGIS de MapaLab

Agrega el catálogo de capas del visor dentro de QGIS: árbol de temas, buscador, alta de capas
como WMS y descarga a GeoPackage. Solo lectura.

## Requisitos

- QGIS 3.40 LTR. No funciona en versiones anteriores.
- Acceso al dominio del IIEG desde la máquina.

## Instalación

1. Descargar el ZIP del plugin.
2. En QGIS: `Complementos` → `Administrar e instalar complementos` → `Instalar a partir de ZIP`.
3. Elegir el archivo y pulsar `Instalar complemento`.
4. En la pestaña `Instalados`, verificar que **MapaLab** tenga la casilla marcada.

Aparece un icono en la barra de herramientas y la entrada en `Complementos` → `Web`.

## Configuración inicial

1. Pulsar el icono de MapaLab. Se abre el panel a la derecha.
2. En el campo `Servidor`, escribir la dirección del IIEG con `https://` y sin barra final.
3. Pulsar `Guardar`.

El árbol de temas se llena solo. La dirección queda guardada; no se vuelve a pedir.

## Uso

| Acción | Cómo |
|---|---|
| Buscar una capa | Escribir en el buscador. Ignora acentos |
| Abrir un tema | Un clic sobre el nombre |
| Agregar al mapa | Seleccionar la capa y pulsar `Agregar al mapa`, o doble clic |
| Descargar vectorial | Seleccionar la capa y pulsar `Descargar vectorial`. Pide carpeta y baja un GeoPackage |
| Actualizar el catálogo | Icono de recarga en la esquina superior derecha del panel |

Las capas se agregan con la simbología del visor y su metadata institucional, visible en
`Propiedades` → `Metadatos`.

La capa llega completa: las subdivisiones que el visor muestra por separado (por ejemplo cada
institución de salud) se filtran en QGIS por atributo.

## Problemas frecuentes

**No aparece en la lista de complementos.** Cerrar QGIS por completo y volver a abrirlo; los
complementos se leen al arrancar.

**El panel no carga el catálogo.** El mensaje al pie del panel indica la causa: dirección
incorrecta, certificado sin aceptar o servidor sin responder.

**Error de certificado.** Solo ocurre en entornos de prueba con certificado autofirmado. Aceptar
la excepción cuando QGIS la ofrezca, o agregarla en `Configuración` → `Opciones` →
`Autenticación` → `Configuraciones SSL de servidor`.

**Los iconos o el logo no se actualizan.** Se guardan en caché. Borrar la carpeta
`mapalab/assets` del perfil de QGIS y volver a abrir el panel.
