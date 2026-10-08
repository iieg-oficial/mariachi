export const TIPOS_FECHA = [
    { tipo: 'date', sirve: 'Si, el canonico', nota: 'Lo que se debe usar siempre' },
    { tipo: 'timestamp', sirve: 'Si, con reparo', nota: 'Arrastra una hora que nadie consume' },
    { tipo: 'timestamptz', sirve: 'No', nota: 'La BD corre en America/Mexico_City: medianoche UTC extrae el dia anterior' },
    { tipo: "varchar ISO  '2026-08-31'", sirve: 'Funciona por el cast', nota: '4 relaciones asi hoy, todas en economia' },
    { tipo: "varchar  '2026'  ·  '2026-08'", sirve: 'No', nota: 'invalid input syntax for type date' },
    { tipo: "varchar  '31/08/2026'", sirve: 'No', nota: 'date/time field value out of range' },
    { tipo: 'integer  2026', sirve: 'No', nota: 'cannot cast type integer to date' },
];

export const GRANULARIDAD = [
    { caso: 'Diaria', guarda: '2026-08-31', capas: '26' },
    { caso: 'Mensual', guarda: '2026-08-01  (dia 1)', capas: '30' },
    { caso: 'Anual', guarda: '2026-01-01  (enero, dia 1)', capas: '46' },
];

export const EJEMPLOS = [
    { columna: 'fecha', formato: 'date siempre. Nombre exacto: minusculas, singular', ejemplo: '2026-08-31  ·  anual va como 2026-01-01' },
    { columna: 'clave_municipio', formato: 'varchar(5), con prefijo de estado', ejemplo: "'14039'  (Guadalajara)" },
    { columna: 'clave_geo', formato: 'Igual. Es el nombre en el catalogo territorial', ejemplo: "'14039', el mismo valor" },
    { columna: 'geom', formato: 'geometry(..., 6368). El BBOX quema el nombre', ejemplo: 'MULTIPOLYGON(((651950.83 2258445.04, ...)))' },
    { columna: 'geom_3857', formato: 'Reproyeccion materializada, para capas pesadas', ejemplo: 'ST_Transform(geom, 3857)' },
    { columna: 'geom_iieg / geom_inegi', formato: 'Las dos geometrias de una capa municipalizada', ejemplo: 'ENV=geom:geom_iieg' },
    { columna: 'fid', formato: 'Entero unico y no nulo. Sin el, el WFS no pagina', ejemplo: 'row_number() OVER ()  ->  1, 2, 3 ...' },
    { columna: 'layer_key', formato: 'varchar(300). espacio:capa, con dos dialectos', ejemplo: "'salud:unidades_salud'" },
    { columna: 'municipio_field_type', formato: 'Solo dos valores', ejemplo: "'clave'  |  'nombre'" },
    { columna: 'geometry_type', formato: 'Cuatro valores, sin traducir en visor ni QGIS', ejemplo: "'point' | 'line' | 'polygon' | 'raster'" },
    { columna: 'columnas.formato', formato: 'Cinco valores, o NULL', ejemplo: "'moneda'" },
    { columna: 'slug', formato: 'CHECK ^[a-z0-9-]+$, maximo 60', ejemplo: "'unidades-de-salud'" },
    { columna: 'created_at / updated_at', formato: 'timestamptz DEFAULT NOW()', ejemplo: '2026-08-31 14:03:22.117+00' },
    { columna: 'deleted_at', formato: 'Borrado logico. El catalogo filtra IS NULL', ejemplo: 'NULL mientras la capa viva' },
    { columna: 'celda multivalor', formato: "Separador '; ', nunca coma", ejemplo: "'Guadalajara; Zapopan; Tlaquepaque'" },
    { columna: 'fecha.inicio / .fin', formato: 'Parametro de la numeralia, no columna', ejemplo: "'2026-01-01'" },
];

export const NO_CONTRATO = [
    { columna: 'nombre', porque: 'En trece capas es el nombre del elemento, no del municipio' },
    { columna: 'clave_entidad', porque: 'Pasa tal cual desde el ETL; ningún código nuestro la valida' },
    { columna: 'fecha_ultima', porque: 'Formato libre por diseno. Ahi si vale un anio suelto: 42 de 130 filas lo usan' },
];

export const QUIEN_BUSCA_FECHA = [
    {
        pieza: 'refresh_layer_periodicity()',
        como: "WHERE a.attname = 'fecha'",
        rompe: 'La capa no entra a layer_periodicity y el selector de fechas sale vacío',
    },
    {
        pieza: 'El visor, al filtrar',
        como: "generateCQLFilter(…, 'fecha')",
        rompe: 'El CQL apunta a una columna que no existe',
    },
    {
        pieza: 'El visor, al releer un enlace',
        como: 'parseCQLToSelections, con /fecha/ quemado',
        rompe: 'El filtro se aplica pero el selector abre en blanco',
    },
    {
        pieza: 'El job del hexbin',
        como: "('fecha', 'anio', 'ano', 'fecha_hecho')",
        rompe: 'El conteo queda sin desglose por año',
    },
];

export const OTRAS_FECHAS = [
    { nombre: 'fecha.inicio / fecha.fin', que: 'Contexto de la numeralia', formato: 'YYYY-MM-DD obligatorio' },
    { nombre: 'layer_metadata.fecha_ultima', que: 'Metadato de la ficha, VARCHAR(200)', formato: 'Libre por diseno: 2024, 2024-12, 2024-Q3, 2024-12-31' },
    { nombre: 'atributos.columnas.formato', que: 'Cómo se pinta una columna', formato: 'entero | decimal | fecha | moneda | texto' },
];

export const CLAVE_POBLADO = [
    {
        caso: 'Ya trae un código del que se deriva',
        como: 'Columna GENERATED ALWAYS … STORED, para que no se desalinee',
        ejemplo: "left(cvegeo, 5) · '14' || lpad(clave_municipio, 3, '0')",
    },
    {
        caso: 'No trae nada y es de puntos',
        como: 'Spatial join contra mapa_base.limite_municipal',
        ejemplo: 'ST_Contains(m.geom, ST_PointOnSurface(t.geom))',
    },
    {
        caso: 'Trae el nombre y no la clave',
        como: "Se declara municipio_field_type='nombre'. Puente, no destino",
        ejemplo: 'unidades_salud · centros_educativos',
    },
];

export const GEOMETRIA = [
    { columna: 'geom', que: 'La geometría, en EPSG:6368', quien: 'El fallback BBOX del visor la quema por nombre y por SRID' },
    { columna: 'geom_3857', que: 'Reproyección materializada, para capas pesadas', quien: 'Evita que GeoServer reproyecte en cada GetMap' },
    { columna: 'geom_iieg', que: 'Límite del IIEG. Es el default', quien: 'SLD, visor, descarga y el parameter filter ENV de GWC' },
    { columna: 'geom_inegi', que: 'Límite del INEGI', quien: 'Lo mismo, vía ENV=geom:geom_inegi' },
];

export const DIALECTOS = [
    {
        tabla: 'layer_metadata, layer_stats, atributos.columnas',
        llave: 'geoserver_workspace:geoserver_layer',
        identifica: 'La capa publicada',
    },
    {
        tabla: 'public.layer_periodicity',
        llave: 'db_schema:nombre_de_la_relación',
        identifica: 'La tabla',
    },
];

export const VERIFICACIONES = [
    {
        que: 'Claves que no empatan con el catálogo',
        sql: 'SELECT count(*) FROM <schema>.<tabla> t\n  LEFT JOIN mapalab.municipios m ON m.clave_geo = t.clave_municipio\n WHERE t.clave_municipio IS NOT NULL AND m.clave_geo IS NULL',
    },
    {
        que: 'Claves sin el prefijo de estado',
        sql: 'SELECT DISTINCT length(clave_municipio) FROM <schema>.<tabla>\n-- distinto de 5 es el bug de cabeceras_municipales',
    },
    {
        que: 'Nombre declarado contra municipio geográfico',
        sql: 'SELECT x.municipio AS declarado, m.nombre AS geografico, count(*) n\n  FROM <schema>.<tabla> x\n  JOIN mapalab.municipios m ON ST_Intersects(m.geom_iieg, x.geom)\n WHERE m.nombre IS DISTINCT FROM x.municipio\n GROUP BY 1,2 ORDER BY n DESC',
    },
    {
        que: 'Vistas materializadas sin fid',
        sql: "SELECT n.nspname, c.relname FROM pg_class c\n  JOIN pg_namespace n ON n.oid = c.relnamespace\n WHERE c.relkind = 'm' AND NOT EXISTS (\n   SELECT 1 FROM pg_attribute a\n    WHERE a.attrelid = c.oid AND a.attname = 'fid')",
    },
    {
        que: 'Capas vivas que no declaran municipio',
        sql: "SELECT count(*) FROM mapalab.layers\n WHERE deleted_at IS NULL AND node_type = 'leaf'\n   AND geoserver_layer IS NOT NULL AND municipio_field IS NULL",
    },
    {
        que: 'Frescura de la periodicidad',
        sql: 'SELECT max(updated_at) FROM public.layer_periodicity',
    },
];

export const SCHEMAS_EXCLUIDOS = 'information_schema, pg_catalog, pg_toast, tiger, tiger_data, topology, ogr_system_tables, prueba, public, raster';

export const CQL_FECHA = `día:  fecha = '2026-08-31'
mes:  (fecha >= '2026-08-01' AND fecha < '2026-09-01')
año:  (fecha >= '2026-01-01' AND fecha < '2027-01-01')

varias selecciones se unen con ' OR ' dentro de un paréntesis extra`;

export const CQL_BBOX = "BBOX(geom, xmin, ymin, xmax, ymax, 'EPSG:6368')";

export const DDL_FECHA = `ALTER TABLE <schema>.<tabla> ADD COLUMN fecha date;
CREATE INDEX ON <schema>.<tabla> (fecha);`;
