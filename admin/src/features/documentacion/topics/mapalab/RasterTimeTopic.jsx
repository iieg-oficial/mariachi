import { Card, Space, Table, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

const PASOS = [
    {
        paso: '1. Archivos',
        donde: 'sextante · data dir',
        que: 'Un directorio por mosaico con los .tif planos y la fecha en el nombre: <capa>_2025-06-01.tif. Va en geoserver-raster/<tema>/<mosaico>/ o bajo su workspace; se sube desde Recursos GeoServer.',
    },
    {
        paso: '2. Configuración',
        donde: 'sextante · el mismo directorio',
        que: 'indexer.properties y timeregex.properties junto a los .tif, antes de publicar. El regex captura la fecha del nombre y debe corresponder al TimeFormat. Se editan con el lápiz de Recursos.',
    },
    {
        paso: '3. Publicación',
        donde: 'sextante · REST',
        que: 'PUT del directorio como coveragestore imagemosaic, y luego PUT al coverage para habilitar la dimensión TIME con estrategia MAXIMUM.',
    },
    {
        paso: '4. Verificación',
        donde: 'sextante · REST',
        que: 'La GetCapabilities del workspace anuncia <Dimension name="time"> en la capa. Si no, revisar que el índice .dbf tenga la columna ingestion.',
    },
    {
        paso: '5. Catálogo',
        donde: 'Mariachi · Editor de capas',
        que: 'Activar timeEnabled y poner Tipo de geometría en Ráster. Las fechas ya no se capturan: el visor las toma de GeoServer.',
    },
];

const PASO_COLUMNS = [
    { title: 'Paso', dataIndex: 'paso', key: 'paso', width: 150, render: (v) => <Text strong>{v}</Text> },
    { title: 'Dónde', dataIndex: 'donde', key: 'donde', width: 220 },
    { title: 'Qué se hace', dataIndex: 'que', key: 'que' },
];

const GOTCHAS = [
    {
        gotcha: 'El índice se construye una sola vez',
        detalle: 'Editar el regex de un mosaico ya publicado no cambia nada: las fechas viejas siguen en el .dbf. Hay que borrar el índice y recargar.',
    },
    {
        gotcha: 'Reemplazar los .tif deja la capa en negro',
        detalle: 'Si los archivos nuevos conservan los nombres, el índice viejo sigue apuntando a rutas válidas y GeoServer mosaicea contra el ColorModel de sample_image.dat. No hay error en el log y el reset no lo arregla: hay que borrar el índice.',
    },
    {
        gotcha: 'Properties subidos después de publicar',
        detalle: 'El índice se arma sin la columna ingestion: la capa pinta pero no anuncia TIME. Se corrige con Reindexar mosaico en Recursos.',
    },
    {
        gotcha: 'Reindexar no activa la dimensión',
        detalle: 'Son dos pasos. Tras reindexar hay que habilitar TIME en el coverage, con la misma configuración que ndvi.',
    },
    {
        gotcha: 'La periodicidad capturada gana',
        detalle: 'Si rasterPeriodicity tiene valor, el visor lo usa en vez de GeoServer y no ve los meses nuevos. Dejarlo vacío.',
    },
    {
        gotcha: 'El tipo de geometría no se llena solo',
        detalle: 'Una capa nueva queda sin ícono de ráster en capas activas hasta capturarlo en el editor.',
    },
    {
        gotcha: 'temperatura/mosaic_time no es plantilla',
        detalle: 'Su regex no casa con sus propios archivos y sirve por inercia del índice viejo. Copiar precipitacion/mosaic_time.',
    },
    {
        gotcha: 'Un solo grupo de dígitos',
        detalle: 'Si el nombre trae números además de la fecha, el regex tiene que anclarse al final o captura el prefijo.',
    },
];

const GOTCHA_COLUMNS = [
    { title: 'Gotcha', dataIndex: 'gotcha', key: 'gotcha', width: 280, render: (v) => <Text strong>{v}</Text> },
    { title: 'Qué implica', dataIndex: 'detalle', key: 'detalle' },
];

const PIEZAS = [
    { pieza: 'geoserver-raster/<tema>/<mosaico>/', repo: 'sextante', nota: 'Los .tif y sus dos properties. El data dir es per-host: no se versiona.' },
    { pieza: 'mapalab.layers.raster_periodicity', repo: 'dataengine', nota: 'Opcional. Vacío, el visor usa la dimensión TIME de GeoServer.' },
    { pieza: 'Editor de capas', repo: 'mariachi', nota: 'Switch timeEnabled y tipo de geometría.' },
    { pieza: 'Recursos GeoServer', repo: 'mariachi', nota: 'Subir los .tif, editar los properties y reindexar el mosaico.' },
    { pieza: 'rasterPeriodicityFallback', repo: 'mapalab', nota: 'Completa las fechas desde la GetCapabilities al cargar el árbol. Requiere mapalab 1.172.1 o posterior.' },
    { pieza: 'useWMSFilterUpdater', repo: 'mapalab', nota: 'Manda el valor como TIME= en el GetMap, en vez de CQL_FILTER.' },
];

const PIEZA_COLUMNS = [
    { title: 'Pieza', dataIndex: 'pieza', key: 'pieza', width: 300, render: (v) => <Text code>{v}</Text> },
    { title: 'Repo', dataIndex: 'repo', key: 'repo', width: 140, render: (v) => <Tag color="purple">{v}</Tag> },
    { title: 'Qué aporta', dataIndex: 'nota', key: 'nota' },
];

const INDEXER = `TimeAttribute=ingestion
Schema=*the_geom:Polygon,location:String,ingestion:java.util.Date
PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](ingestion)
TimeFormat=yyyy-MM-dd`;

const TIMEREGEX = 'regex=.*([0-9]{4}-[0-9]{2}-[0-9]{2}).*';

const PRE_STYLE = {
    margin: 0,
    padding: 12,
    background: '#F5F5F5',
    borderRadius: 6,
    fontSize: 12,
    overflowX: 'auto',
};

export default function RasterTimeTopic() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={4} style={{ marginTop: 0 }}>Rásters con dimensión TIME</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Una serie de GeoTIFFs —uno por mes— se publica como <strong>una sola capa</strong> que
                    cambia de periodo con el parámetro WMS <Text code>TIME</Text>. La fecha se extrae
                    del <strong>nombre del archivo</strong>, no del contenido del ráster.
                </Paragraph>
            </div>

            <Card size="small" title="Los cinco pasos">
                <Table
                    dataSource={PASOS}
                    columns={PASO_COLUMNS}
                    rowKey="paso"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="Los dos properties">
                <Paragraph style={{ marginBottom: 4 }}><Text code>indexer.properties</Text></Paragraph>
                <pre style={PRE_STYLE}>{INDEXER}</pre>
                <Paragraph style={{ marginTop: 16, marginBottom: 4 }}><Text code>timeregex.properties</Text></Paragraph>
                <pre style={PRE_STYLE}>{TIMEREGEX}</pre>
            </Card>

            <Card size="small" title="Lo que muerde">
                <Table
                    dataSource={GOTCHAS}
                    columns={GOTCHA_COLUMNS}
                    rowKey="gotcha"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="Dónde vive cada pieza">
                <Table
                    dataSource={PIEZAS}
                    columns={PIEZA_COLUMNS}
                    rowKey="pieza"
                    pagination={false}
                    size="small"
                />
            </Card>
        </Space>
    );
}
