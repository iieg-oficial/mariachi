# SLD Editor — referencia por componente

Editor visual de simbología (SLD) en mariachi-admin. Documenta solo lo que cada pieza hace y sus props/estado. Para arquitectura general de capas ver `repos/mariachi/contexto.md` §Capas en el repo de contexto.

Ubicación: `admin/src/features/mapalab-layers/components/sldEditor/` (frontend) y `api/app/services/sld_*.py` (backend).

## Shapes soportados

El editor detecta automáticamente el "shape" del SLD y rutea al editor visual apropiado:

| Shape | Cuándo aplica | Editor |
|---|---|---|
| `choropleth` | Rules con `<ogc:Filter>` de rangos numéricos + opcional null rule | `<ChoroplethEditor>` |
| `boundary` | Rules sin Filter con PolygonSymbolizer (estilo único + label) | `<BoundaryEditor>` |
| `point` | Rules con PointSymbolizer + ExternalGraphic (símbolo del catálogo + label) | `<PointEditor>` |
| Otros | Raster/Line, categóricos, layer groups, etc. | `<RawXmlFallback>` (read-only + leyenda live) |

---

## Backend

### `app/services/sld_generator.py`

Compila modelos → SLD XML. Portado de `estilos-coropleticos-mapalab/scripts/utils/sld_dump_geom.py` para la parte coroplética.

Funciones públicas:

- `build_sld_xml(*, layer_name, style_title, style_abstract, attribute, cortes, labels, colors, stroke, null_style) -> str` — coroplético rangos. Genera reglas con `<ogc:And>` (`PropertyIsGreaterThanOrEqualTo` + `PropertyIsLessThan`/`PropertyIsLessThanOrEqualTo` para la última regla cuando `upper` no es `None`). Soporta regla `null` con dos `PolygonSymbolizer` (fill sólido + GraphicFill con hatch). Geometría dinámica via `env(geom, geom_iieg)`.
- `build_boundary_sld_xml(*, layer_name, style_title, polygon, label) -> str` — estilo único + label. Genera 0-1 PolygonSymbolizer + 0-1 TextSymbolizer (con halo, placement, vendor options, scale denominators).
- `build_point_sld_xml(*, layer_name, style_title, point, label) -> str` — capa de puntos. Genera 0-1 PointSymbolizer con `<ExternalGraphic>` (href + Format + Opacity + Size + Rotation) + 0-1 TextSymbolizer. `point.graphic_url` debe estar resuelto (URL pública del bucket Acervo).

### `app/services/sld_parser.py`

Parser inverso XML → modelo Pydantic. Detecta shape orquestando `_parse_choropleth` primero y `_parse_boundary` después. Si ambos fallan, devuelve `editable=False` con razón compuesta.

Modelos:

- `StrokeModel` — color/width/opacity/linejoin
- `HatchModel` — well_known_name/color/size/stroke_width/opacity (size es `int | float` para preservar formato del original)
- `NullStyleModel` — enabled/label/background_color/stroke/hatch
- `ChoroplethModel` — layer_name/style_title/style_abstract/units/attribute/cortes/labels/colors/stroke/null_style
- `FontModel` — family/size/style/weight
- `HaloModel` — radius/color
- `LabelPlacementModel` — anchor_x/anchor_y
- `LabelStyleModel` — field/geometry_function/geometry_property/font/fill_color/halo/placement/vendor_options/min_scale/max_scale
- `PolygonStyleModel` — fill_color/fill_opacity/stroke/rule_name/min_scale/max_scale
- `BoundaryModel` — layer_name/style_title/polygon/label
- `PointGraphicModel` — graphic_url/graphic_format/size/rotation/opacity/symbol_id
- `PointModel` — layer_name/style_title/point/label
- `ParseResult` — `editable: bool`, `shape: 'choropleth' | 'boundary' | 'point' | None`, `model`, `raw_xml`, `reason`

Función pública: `parse_sld(xml_text) -> ParseResult`.

Para `shape='point'`, el endpoint GET enriquece `model.point.symbol_id` haciendo lookup inverso de `graphic_url` contra `mapalab.symbols` (sufijo `image_object_key` o `png_object_key`) — así el frontend puede preseleccionar el símbolo en el `<SymbolPicker>`.

### `app/services/palette_service.py`

Lee `app/data/paletas_simbologia.csv` (144 paletas oficiales) con `@lru_cache`.

Función pública: `load_palettes() -> list[dict]` — devuelve cada paleta con `name/tipo/severidad/n_classes/colors[]` ordenada por step.

### `app/services/geoserver_client.py` (extensiones del editor)

- `get_sld(workspace, style_name) -> str` — `GET /rest/workspaces/{ws}/styles/{name}.sld`
- `find_layers_using_style(workspace, style_name) -> list[str]` — recorre layers del workspace para detectar cuáles usan este style
- `style_exists(workspace, style_name) -> bool` — `GET .../styles/{name}.xml?quietOnNotFound=true`
- `create_style_entry(workspace, style_name)` — POST de la entrada del style si no existe
- `put_sld(workspace, style_name, xml) -> str` — sube el SLD vía `PUT .../styles/{name}?raw=true` con `Content-Type: application/vnd.ogc.sld+xml`. Verifica SHA256 round-trip y lanza `GeoServerError` si no coincide. Devuelve hash.
- `is_layer_group(workspace, name) -> bool` — chequea `/rest/workspaces/{ws}/layergroups/{name}.json` y `/rest/layergroups/{name}.json`. Detecta layer groups (workspace-scoped o globales).
- `get_legend_graphic(workspace, layer, style_name, width, height) -> tuple[bytes, str]` — proxy a `GetLegendGraphic` del WMS de GeoServer. Devuelve `(content, content_type)`.
- `list_styles(workspace, layer)` — resiliente a 5xx (devuelve `[]`, típico cuando la "capa" es un layer group y GeoServer falla).

### `app/services/borrador_service.py` — handler `_apply_sld`

Registrado en `APPLIERS['sld']`. Al aprobar un borrador con `resource_type='sld'`:

1. Valida `resource_id == 'alias:style_name'`
2. Lee `data.shape` ('choropleth' | 'boundary' | 'point')
3. Para `point`: lee `point.symbol_id`, lookup en `mapalab.symbols`. Si `kind='emoji'` invoca `symbol_service.ensure_emoji_png(symbol_id)` para rasterizar via Twemoji y obtener `png_object_key` (siempre en bucket `mapalab`). Si `kind='image'` o `kind='svg'` usa `image_object_key` + `bucket_slug` del símbolo (bucket `mapalab` para image, bucket `iieg` para svg). Construye URL pública con el bucket correspondiente (`http://acervo-minio:9000/<bucket>/<key>`) y la pasa a `build_point_sld_xml`.
4. Llama `build_sld_xml` / `build_boundary_sld_xml` / `build_point_sld_xml` según shape
5. Resuelve `alias` → `geoserver_workspace` via `dataengine_db.query(Workspace)`
6. `GeoServerClient().put_sld(...)` con verificación SHA256 round-trip
7. `notify_tree_changed()` para invalidar cache de mapalab

### Endpoints HTTP

Bajo `/api/administrador/`:

- `GET /geoserver/styles/{alias}/{style_name}` — devuelve `{workspace, styleName, rawXml, editable, shape, reason, model, sharedBy}`
- `GET /geoserver/legend/{alias}/{layer}/{style_name}?width=20&height=20` — proxy a `GetLegendGraphic` que devuelve los bytes PNG
- `GET /geoserver/palettes` — devuelve `{palettes: [...]}`
- `GET /geoserver/workspaces/{alias}/layers/{layer}/styles` — devuelve `{styles, isLayerGroup}` (el `isLayerGroup` solo se calcula si styles está vacío)
- `PUT /borradores/sld/{alias}:{style_name}` — guarda borrador (genérico, ya existía)
- `POST /borradores/sld/{alias}:{style_name}/solicitar-revision` — pasa borrador a `pendiente_revision`
- `POST /borradores/por-id/{id}/aprobar` — materializa el borrador en GeoServer

---

## Frontend

### `hooks/useSldEditor.js`

Hook que orquesta fetch + estado + escritura del borrador.

Firma:

```js
useSldEditor({ workspace, styleName }) → {
    loading, error, data, draft,
    reload, saveDraft, requestReview, deleteDraft
}
```

- `data` — respuesta del endpoint GET (model + rawXml + sharedBy + editable + **shape**)
- `draft` — borrador actual del usuario (`null` si no hay)
- `saveDraft(modelWithShape)` — `PUT /borradores/sld/{alias}:{name}`. El frontend agrega `{ ...model, shape }` antes de mandarlo.
- `requestReview()` — solicita revisión y recarga
- `deleteDraft()` — `DELETE /borradores/sld/{alias}:{name}`

Helpers exportados aparte:

- `fetchPalettes()` — `GET /geoserver/palettes`
- `fetchStylesForLayer(workspaceAlias, layerName)` — `GET /geoserver/workspaces/{ws}/layers/{layer}/styles`. Devuelve `{ styles, isLayerGroup }`.

### `components/sldEditor/SldEditor.jsx`

Shell del editor. Recibe `layer` (objeto del nodo) y opcional `derivedFeatureType`. Hace:

1. Verifica que tenga `workspaceAlias` + `geoserverLayer` (propios o derivados de descendientes para grupos sin feature type propio)
2. Llama `fetchStylesForLayer` y muestra `<Select>` para escoger qué estilo editar. Si la respuesta dice `isLayerGroup` y no hay styles, muestra Alert claro y no procede.
3. Renderiza `<SldEditorBody>` con el style seleccionado

`SldEditorBody`:

- Llama `useSldEditor`
- Mantiene `model` (estado editable, hidratado de `draft.data` o `data.model`)
- Si `data.editable === false` → `<RawXmlFallback>`
- Si `data.shape === 'boundary'` → `<BoundaryEditor>`
- Si `data.shape === 'point'` → `<PointEditor>`
- Caso contrario → `<ChoroplethEditor>`
- Layout: editor a la izquierda, sidebar derecho con `<LegendPreview>`, `<DiffPanel>` (solo choropleth) y botones (Guardar/Solicitar revisión/Recargar)

### `components/sldEditor/ChoroplethEditor.jsx`

Editor visual del shape `choropleth`. Tabs: Cortes/Etiquetas, Paleta, Borde, Valor nulo, Metadatos.

Props: `model`, `onChange(model)`.

### `components/sldEditor/BoundaryEditor.jsx`

Editor visual del shape `boundary`. Tabs: Polígono, Etiqueta, Metadatos.

Props: `model`, `onChange(model)`, `availableFields`.

`PolygonTab` (interno) — toggle "Renderizar polígono", relleno (toggle + color + opacity), borde (toggle + StrokeEditor reusado), visibilidad por escala.

Etiqueta delegada a `<BoundaryLabelTab>` (archivo separado por límite de 300 líneas).

### `components/sldEditor/PointEditor.jsx`

Editor visual del shape `point`. Tabs: Símbolo, Etiqueta, Metadatos.

Props: `model`, `onChange(model)`, `availableFields`.

`SymbolTab` (interno) — toggle "Renderizar símbolo de punto" + `<SymbolPicker>` + sliders de tamaño/rotación + InputNumber de opacidad.

Etiqueta reusa `<BoundaryLabelTab>`. Metadatos: título del estilo.

### `components/sldEditor/SymbolPicker.jsx`

Selector de símbolo del catálogo de `mapalab.symbol_categories` / `mapalab.symbols` administrado en `/mapalab/simbolos`.

Props: `value: number | null` (symbol_id), `onChange(symbolId, symbol)`.

- Carga categorías con `listCategories()` y muestra `<Segmented>` arriba.
- Carga símbolos de la categoría activa con `listSymbols(categoryId)`.
- Renderiza grid con `<SymbolPreview>`.
- Los tres kinds (`emoji`, `image`, `svg`) son seleccionables. `svg` desde v0.x vive en bucket `iieg/leyendas/` y GeoServer lo lee via Batik renderer.

### `components/sldEditor/BoundaryLabelTab.jsx`

Editor del TextSymbolizer. Props: `value`, `onChange`, `availableFields`.

Toggle "Mostrar etiqueta de texto". Cuando activo:

- Selector de campo del feature (dropdown con `availableFields`)
- Tipografía (familia, tamaño, estilo, peso, color)
- Halo (toggle + radio + color)
- Posicionamiento (anchor X/Y)
- Geometría opcional (función + propiedad, ej. `interiorPoint(geom)`)
- Vendor options (group, spaceAround, maxDisplacement)
- Visibilidad por escala (min/max scale denominator)

### `components/sldEditor/RangesEditor.jsx`

Tabla editable de cortes/labels para choropleth.

Props: `cortes: (number | null)[]` (`len = labels.length + 1`), `labels: string[]`, `onChange({ cortes, labels })`.

Lower y upper son `<InputNumber>` (acepta `null` para extremos abiertos). Botón "Agregar clase" anexa al final con `upper = lastUpper + 1`. No permite eliminar la última clase.

### `components/sldEditor/PalettePicker.jsx`

Selector de paleta con búsqueda y filtros.

Props: `colors: string[]`, `nClasses: number`, `onChange(colors[])`.

Filtros: búsqueda por nombre, multi-select por `tipo` (divergente/secuencial/comparativa/cualitativa) y por `severidad`, toggle "Solo paletas de N clases" (default `true`). Renderiza paletas agrupadas por tipo con preview de chips. Botones `Aplicar`/`Invertir` por paleta. Paleta actual resaltada con fondo naranja soft. `<ColorChips>` permite editar colores individualmente con `<input type="color">`.

### `components/sldEditor/StrokeEditor.jsx`

Editor del borde (Stroke). Props: `value: { color, width, opacity, linejoin }`, `onChange`, `label`. Color picker nativo + InputNumber + Select.

### `components/sldEditor/NullStyleEditor.jsx`

Editor de la regla para valores `null` (solo choropleth). Props: `value: NullStyleModel | null`, `onChange`. Toggle de `enabled` + label + background_color + stroke + hatch.

### `components/sldEditor/LegendPreview.jsx`

Preview de la leyenda en vivo desde GeoServer. Props: `workspace`, `styleName`, `layerName`.

Apunta al endpoint proxy del backend (`/api/administrador/geoserver/legend/...`). Funciona en cualquier deployment porque va por la misma origin que el admin (no requiere `/geoserver/*` enrutado por gateway-hub). Botón refresh incrementa `version` para bypass de cache. La preview pega contra el SLD ya en GeoServer (no contra el borrador) — refrescar tras aprobar para ver cambios.

### `components/sldEditor/DiffPanel.jsx`

Diff entre el modelo del GeoServer (baseline) y el modelo editado (current). Solo aplica para `choropleth`.

Props: `baseline`, `current`. Detecta cambios en `style_title`, `attribute`, `units`, `cortes`, `labels`, `colors`, `stroke`, `null_style`. Renderiza cada cambio con `prev → next`. Para colores muestra chip. Si no hay diferencias muestra `<Empty>` "Sin cambios".

### `components/sldEditor/RawXmlFallback.jsx`

Fallback para SLDs no parseables. Props: `rawXml`, `reason`, `workspace`, `styleName`, `layerName`.

Detecta automáticamente el "kind" del SLD inspeccionando el XML:

| Kind | Detección | Mensaje |
|---|---|---|
| `layergroup` | Más de un `<NamedLayer>` en el XML | "Esta capa es un Layer Group de GeoServer" |
| `raster` | Contiene `RasterSymbolizer` | "Capa raster" |
| `point`/`line` | Contiene `PointSymbolizer`/`LineSymbolizer` | "Capa de puntos/líneas" |
| `categorical` | Reason del parser dice "rango ni null" | "Simbología categórica" |
| `unknown` | Otro caso | "Tipo de SLD no soportado" |

Muestra Alert info (cerrable) con explicación + sugerencia. Incluye `<LegendPreview>` arriba del XML para que el usuario igual vea cómo se ve la capa actualmente. Detalle técnico (razón exacta del parser) escondido en `<details>`.

### `shared/components/StatusBadge.jsx`

Badge reutilizable. Variantes: `beta`, `test`, `dev`, `info`, `new`. Override con `text`, `color`, `bg`. Tamaños `sm` y `md`.

Posición absoluta opcional con prop `position` (`top-right`/`top-left`/`bottom-right`/`bottom-left`) y `offset` (default 4px). Cuando se usa, el badge se posiciona absolutamente sobre el contenedor padre relativo, sin ocupar ancho.

Replica visualmente el `Badge variant="pill"` de mapalab/frontend pero sin Tailwind (mariachi es solo AntD).

---

## Modelo conceptual: Propiedades

Independiente del editor SLD en sí, pero relevante porque afecta qué nodos lo muestran.

Los hijos de un nodo `group` en `mapalab.layers` son conceptualmente **propiedades** (comparten `geoserver_layer`, se diferencian solo por `cql_filter`). El schema solo tiene 5 `node_type` (sin `property`), así que se almacenan como `leaf`. La inferencia es display-only.

Helpers en `admin/src/features/mapalab-layers/constants/nodeTypes.js`:

- `isPropertyOfGroup(nodeType, parentNodeType)` — `true` si `nodeType === 'leaf' && parentNodeType === 'group'`
- `labelForNode(nodeType, parentNodeType)` — devuelve `'Propiedad'` o el label del node_type

Implicaciones en el editor SLD:

- Al editar una **propiedad**, el tab "Simbología" se **oculta** porque la propiedad comparte SLD con el grupo padre. Editarla sería redundante (todas apuntan al mismo `style_name` y `layer_name`).
- Al editar un **grupo**, el SldEditor recibe `derivedFeatureType` de los descendientes (todos sus hijos comparten `geoserver_layer`). Permite editar el SLD compartido del grupo.
- Al editar un **leaf standalone** (no propiedad), el tab "Simbología" aparece normal con el SLD propio.

---

## Flujo end-to-end

1. Usuario abre layer (`group` o `leaf` standalone) en `/mapalab/layers/{id}/edit`
2. Click tab "Simbología" (visible vía `TAB_VISIBILITY['simbologia'] = ['group', 'leaf']`, oculto si es propiedad)
3. `<SldEditor>` lista styles del layer. Si `isLayerGroup`, muestra Alert claro y se detiene.
4. Si hay styles, carga el primero via `useSldEditor`
5. Backend hace `GET /geoserver/styles/{ws}/{name}` → `parse_sld` → `{shape, model, rawXml, ...}`
6. Si `editable && shape === 'choropleth'` → `<ChoroplethEditor>`
7. Si `editable && shape === 'boundary'` → `<BoundaryEditor>`
8. Si no editable → `<RawXmlFallback>` con leyenda live + XML read-only
9. Usuario edita → `model` cambia en memoria → `<DiffPanel>` muestra cambios (choropleth)
10. "Guardar borrador" → `PUT /borradores/sld/{alias}:{name}` con `data: { ...model, shape }`
11. "Solicitar revisión" → save + `POST .../solicitar-revision`
12. `tetlamamakani` aprueba en RevisionQueue → `_apply_sld` corre `build_sld_xml`/`build_boundary_sld_xml` → `put_sld` (con SHA256 verify) → `notify_tree_changed`
13. Refresh `<LegendPreview>` para ver el resultado en GeoServer

---

## Tests

`api/tests/services/test_sld_parser.py` — round-trip de los 59 SLDs coropleticos del pipeline (byte-equal) + boundary fixtures (semantic equivalence — modelo equivalente tras parse → generate → parse).

`api/tests/services/test_borrador_sld.py` — handler `_apply_sld` con mocks de `GeoServerClient` y resolución de `Workspace` alias. Casos: resource_id inválido, campos faltantes, modelo SLD inválido, error de GeoServer (502), happy path.

129 tests pasan en `tests/services/`.

---

## Requisitos en GeoServer para shape `point`

Dos prerrequisitos de infraestructura deben cumplirse para que los SLDs con `<ExternalGraphic>` apuntando al bucket Acervo (símbolos del catálogo) rendereen correctamente:

1. **Red Docker compartida**: el contenedor `geoserver` debe estar en `iieg-network` para resolver el hostname `acervo-minio`. Configurado en `/IIEG/geoserver/docker-compose.yml` agregando `iieg-network` (external) a los networks del servicio.

2. **URL Checks configurados**: GeoServer 2.20+ bloquea todas las URLs externas en SLDs si no hay URL checks definidos. Hay que crear **dos** checks, uno por cada bucket destino de símbolos:

   ```bash
   # Bucket mapalab (emoji-png + image: PNG/JPG/WebP/GIF)
   curl -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
     -H 'Content-Type: application/json' -X POST \
     "$GEOSERVER_URL/rest/urlchecks" -d '{
       "regexUrlCheck": {
         "name": "acervo_mapalab",
         "description": "Acervo MinIO interno (bucket mapalab)",
         "enabled": true,
         "regex": "^http://acervo-minio:9000/mapalab/.+$"
       }
     }'

   # Bucket iieg (svg subidos por el admin a leyendas/)
   curl -u "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
     -H 'Content-Type: application/json' -X POST \
     "$GEOSERVER_URL/rest/urlchecks" -d '{
       "regexUrlCheck": {
         "name": "acervo_iieg_leyendas",
         "description": "Acervo MinIO interno (bucket iieg, prefijo leyendas/)",
         "enabled": true,
         "regex": "^http://acervo-minio:9000/iieg/leyendas/.+$"
       }
     }'
   ```

   Si en producción Acervo es accesible vía un dominio HTTPS distinto, agregar también checks con los regex correspondientes.

## Limitaciones conocidas

- El editor visual **solo soporta** `choropleth` (rangos) y `boundary` (estilo único + label). Otros shapes caen al fallback con leyenda renderizada por GeoServer + XML read-only.
- Numeralia/metadata se almacenan por feature type (`workspace:geoserver_layer`), no por nodo. Las propiedades de un grupo **comparten** numeralia/metadata con el grupo. La UI esconde el tab Metadatos en propiedades para evitar confusión. Soporte de numeralia distinta por propiedad requiere migrar `mapalab.layer_stats` y `mapalab.layer_metadata` de `layer_key` a `layer_id`.
- La verificación SHA256 de `put_sld` puede fallar si GeoServer normaliza el XML al guardarlo. Para coropleticos pasa porque generamos exactamente el formato del pipeline. Para boundary, el round-trip es semántico, no byte-equal — si SHA256 falla en producción, aflojar la verificación a comparación semántica del modelo parseado.
