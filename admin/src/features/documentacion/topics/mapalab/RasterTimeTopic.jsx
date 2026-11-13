import { Card, Space, Table, Tag, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

const PASOS = [
    {
        paso: '1. Subir',
        donde: 'Recursos GeoServer · Rásters',
        que: 'Una carpeta por mosaico con los .tif planos y la fecha al final del nombre: lluvia_2025-06-01.tif. Puede vivir en geoserver-raster/<tema>/ o bajo su workspace.',
    },
    {
        paso: '2. Publicar',
        donde: 'Recursos GeoServer · la carpeta',
        que: 'Publicar como mosaico: se elige workspace y patrón de fecha, se revisa la fecha leída de cada archivo y mariachi escribe los properties, crea el store, activa TIME y lo verifica.',
    },
    {
        paso: '3. Catálogo',
        donde: 'Mariachi · Editor de capas',
        que: 'Dar de alta la capa y encender timeEnabled. El tipo de geometría se resuelve solo y las fechas salen de GeoServer.',
    },
    {
        paso: 'Meses nuevos',
        donde: 'Recursos GeoServer · la carpeta',
        que: 'Subir el .tif y usar Cosechar nuevos: agrega solo lo que falta en el índice, sin reconstruirlo.',
    },
];

const PASO_COLUMNS = [
    { title: 'Paso', dataIndex: 'paso', key: 'paso', width: 150, render: (v) => <Text strong>{v}</Text> },
    { title: 'Dónde', dataIndex: 'donde', key: 'donde', width: 220 },
    { title: 'Qué se hace', dataIndex: 'que', key: 'que' },
];

const GOTCHAS = [
    {
        gotcha: 'Todos los .tif con el mismo patrón',
        detalle: 'GeoServer aborta el mosaico entero si un nombre no casa. La vista previa marca los que no tienen fecha y no deja publicar.',
    },
    {
        gotcha: 'La fecha se lee sin la extensión',
        detalle: 'El regex se ancla al final del nombre sin .tif. El formato va en la misma línea: regex=…,format=yyyy_MM. TimeFormat en indexer.properties no lo usa el extractor.',
    },
    {
        gotcha: 'El índice se construye una sola vez',
        detalle: 'Cambiar el patrón o reemplazar .tif con los mismos nombres no cambia nada (o deja la capa en negro): Reindexar mosaico.',
    },
    {
        gotcha: 'Reindexar no activa la dimensión',
        detalle: 'Si la franja del mosaico dice TIME sin activar, usar Activar TIME.',
    },
    {
        gotcha: 'La periodicidad capturada gana',
        detalle: 'Si rasterPeriodicity tiene valor, el visor lo usa en vez de GeoServer y no ve los meses nuevos. Dejarlo vacío.',
    },
    {
        gotcha: 'temperatura/mosaic_time no es plantilla',
        detalle: 'Su regex no casa con sus propios archivos y sirve por inercia del índice viejo.',
    },
];

const GOTCHA_COLUMNS = [
    { title: 'Gotcha', dataIndex: 'gotcha', key: 'gotcha', width: 280, render: (v) => <Text strong>{v}</Text> },
    { title: 'Qué implica', dataIndex: 'detalle', key: 'detalle' },
];

const PIEZAS = [
    { pieza: 'geoserver-raster/<tema>/<mosaico>/', repo: 'sextante', nota: 'Los .tif, sus dos properties y el índice. El data dir es per-host: no se versiona.' },
    { pieza: 'Recursos GeoServer', repo: 'mariachi', nota: 'Subir, publicar, activar TIME, cosechar y reindexar.' },
    { pieza: 'Editor de capas', repo: 'mariachi', nota: 'Switch timeEnabled.' },
    { pieza: 'mapalab.layers.raster_periodicity', repo: 'dataengine', nota: 'Opcional. Vacío, el visor usa la dimensión TIME de GeoServer.' },
    { pieza: 'rasterPeriodicityFallback', repo: 'mapalab', nota: 'Completa las fechas desde la GetCapabilities al cargar el árbol.' },
    { pieza: 'useWMSFilterUpdater', repo: 'mapalab', nota: 'Manda el valor como TIME= en el GetMap, en vez de CQL_FILTER.' },
];

const PIEZA_COLUMNS = [
    { title: 'Pieza', dataIndex: 'pieza', key: 'pieza', width: 300, render: (v) => <Text code>{v}</Text> },
    { title: 'Repo', dataIndex: 'repo', key: 'repo', width: 140, render: (v) => <Tag color="purple">{v}</Tag> },
    { title: 'Qué aporta', dataIndex: 'nota', key: 'nota' },
];

const INDEXER = `TimeAttribute=ingestion
Schema=*the_geom:Polygon,location:String,ingestion:java.util.Date
PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](ingestion)`;

const TIMEREGEX = 'regex=.*([0-9]{4}_[0-9]{2})$,format=yyyy_MM';

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

            <Card size="small" title="Los pasos">
                <Table
                    dataSource={PASOS}
                    columns={PASO_COLUMNS}
                    rowKey="paso"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="Los dos properties que escribe mariachi">
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
