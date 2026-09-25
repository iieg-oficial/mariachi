import { Alert, Card, Space, Table, Tabs, Tag, Typography } from 'antd';
import RasterTimeTopic from '@features/documentacion/topics/mapalab/RasterTimeTopic';

const { Title, Paragraph, Text } = Typography;

const FLUJO = [
    {
        paso: '1. Entrada',
        donde: 'Catálogo · lista de capas',
        que: 'Botón de personalizar en el item, pegado a la orilla derecha, visible en hover o foco.',
    },
    {
        paso: '2. Muestra',
        donde: 'Catálogo · mapa',
        que: 'El editor necesita un registro real para previsualizar. Usa el de la tarjeta abierta o pide uno con WFS maxFeatures=1.',
    },
    {
        paso: '3. Edición',
        donde: 'Catálogo · modal',
        que: 'Campos disponibles (DescribeFeatureType) a la izquierda, tarjeta en construcción a la derecha, arrastrables y reordenables.',
    },
    {
        paso: '4. Envío',
        donde: 'Catálogo · formulario',
        que: 'Sólo un comentario opcional: la propuesta es anónima, no se pide correo ni ningún dato personal. POST público con honeypot y rate limit.',
    },
    {
        paso: '5. Moderación',
        donde: 'Mariachi · bandeja',
        que: 'El revisor ve el diff contra la configuración vigente y aprueba o rechaza con motivo.',
    },
    {
        paso: '6. Aplicación',
        donde: 'DataEngine + MapaLab',
        que: 'Al aprobar se escribe en mapalab.catalogo_capas.infobox_config y se invalida el cache del catálogo.',
    },
];

const FLUJO_COLUMNS = [
    { title: 'Paso', dataIndex: 'paso', key: 'paso', width: 150, render: (v) => <Text strong>{v}</Text> },
    { title: 'Dónde', dataIndex: 'donde', key: 'donde', width: 200 },
    { title: 'Qué pasa', dataIndex: 'que', key: 'que' },
];

const PERMITIDO = [
    { clave: 'headerField', tipo: 'string u objeto', nota: 'Campo que da el título de la tarjeta. También acepta un compose para armarlo de varias columnas.' },
    { clave: 'list', tipo: 'array (máx. 12)', nota: 'Filas etiqueta–valor. Cada una: field o compose, label, href opcional y formato «anio» opcional.' },
    { clave: 'cards', tipo: 'array (máx. 12)', nota: 'Cajas de numeralia. Cada una: field o compose, label, suffix, decimals (0–4) y op.' },
    { clave: 'compose', tipo: 'array (máx. 6)', nota: 'Une varias columnas en un valor. Cada parte: field con prefix y suffix opcionales; el pegamento es sep (por defecto «, »). Va en lugar de field, nunca junto a él.' },
    { clave: 'op', tipo: "'sum'", nota: 'Solo en cards con compose: suma las columnas numéricas en vez de unirlas como texto. Sin op, se une texto.' },
    { clave: 'text', tipo: 'array (máx. 3)', nota: 'Bloques de texto con id e items (field o compose, label, href, formato).' },
    { clave: 'blockOrder', tipo: 'array', nota: 'Orden de los bloques. Solo list, cards y text:<id>.' },
];

const PROHIBIDO = [
    { clave: 'iconText.action', razon: 'Dispara acciones internas del visor (abrir Colibrí, modal de novedades).' },
    { clave: 'headerTransform', razon: 'Transformaciones del título con semántica propia; queda para el editor de admin.' },
    { clave: 'labelGroups', razon: 'Acepta color y fondo libres; ruido visual sin aportar al caso de uso.' },
    { clave: 'cardsColumns', razon: 'Detalle de maquetación. El default (1 en escritorio, 2 en móvil) ya es correcto.' },
    { clave: 'cualquier otra', razon: 'El schema usa extra=forbid: una clave desconocida invalida toda la propuesta.' },
];

const CLAVE_COLUMNS = [
    { title: 'Clave', dataIndex: 'clave', key: 'clave', width: 180, render: (v) => <Text code>{v}</Text> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 150 },
    { title: 'Para qué sirve', dataIndex: 'nota', key: 'nota' },
];

const PROHIBIDO_COLUMNS = [
    { title: 'Clave', dataIndex: 'clave', key: 'clave', width: 180, render: (v) => <Text code>{v}</Text> },
    { title: 'Por qué no se acepta', dataIndex: 'razon', key: 'razon' },
];

const DEFENSAS = [
    { capa: 'Allowlist de claves', detalle: 'extra=forbid en todos los modelos y reconstrucción explícita en to_config(): nunca se persiste el dict que llegó, sino uno armado campo por campo.' },
    { capa: 'Esquemas de href', detalle: 'Solo http, https, mailto, tel y rutas absolutas que empiecen con una sola barra. Se rechazan javascript:, data: y protocol-relative (//host).' },
    { capa: 'Campos reales', detalle: 'Cada field se compara contra las columnas de la capa resueltas con DescribeFeatureType, y lo mismo cada parte de un compose. Evita inyección y también tarjetas que apuntan a campos inexistentes.' },
    { capa: 'Topes', detalle: '8 KB por configuración, 12 filas por bloque, 3 bloques de texto, 80 caracteres por etiqueta, 500 por href, 6 partes por compose, 16 por prefix o suffix y 8 por separador.' },
    { capa: 'Anti-abuso', detalle: 'Honeypot, rate limit por IP y tope de propuestas pendientes por capa. Sin captcha: el filtro real es la aprobación humana.' },
    { capa: 'Escapado', detalle: 'El renderer no usa dangerouslySetInnerHTML en ninguna parte, así que React escapa todo valor que se muestre.' },
];

const DEFENSA_COLUMNS = [
    { title: 'Defensa', dataIndex: 'capa', key: 'capa', width: 200, render: (v) => <Text strong>{v}</Text> },
    { title: 'Cómo funciona', dataIndex: 'detalle', key: 'detalle' },
];

const PIEZAS = [
    { pieza: 'mapalab.catalogo_capas.infobox_config', repo: 'dataengine', nota: 'Migración 0029. JSONB nullable: el override del catálogo.' },
    { pieza: 'CatalogoRepository', repo: 'mapalab (backend)', nota: 'COALESCE(c.infobox_config, l.infobox_config): hereda del árbol para ver, el override manda cuando existe.' },
    { pieza: 'app/schemas/mapalab_infobox.py', repo: 'mariachi', nota: 'El validador. InfoboxPropuestaConfig + validate_fields_exist.' },
    { pieza: 'mapalab_infobox_propuestas', repo: 'mariachi', nota: 'Tabla de propuestas con estado, revisor y motivo de rechazo.' },
];

const PIEZA_COLUMNS = [
    { title: 'Pieza', dataIndex: 'pieza', key: 'pieza', width: 300, render: (v) => <Text code>{v}</Text> },
    { title: 'Repo', dataIndex: 'repo', key: 'repo', width: 160, render: (v) => <Tag color="purple">{v}</Tag> },
    { title: 'Qué aporta', dataIndex: 'nota', key: 'nota' },
];

function PropuestasInfoboxTab() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={4} style={{ marginTop: 0 }}>Propuestas de tarjeta del Catálogo</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Cualquier persona que use el Catálogo puede proponer cómo se ve la tarjeta de información de una capa:
                    qué campos aparecen y en qué orden. La propuesta no se publica sola — llega aquí para revisión, y sólo
                    al aprobarla cambia lo que ve el público.
                </Paragraph>
            </div>

            <Card size="small" title="El flujo completo">
                <Table
                    dataSource={FLUJO}
                    columns={FLUJO_COLUMNS}
                    rowKey="paso"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Alert
                type="info"
                showIcon
                title="La propuesta nunca toca el árbol de capas"
                description={
                    <>
                        Las capas del Catálogo heredan su tarjeta de <Text code>mapalab.layers</Text> cuando no tienen una
                        propia. Una propuesta aprobada se escribe siempre en <Text code>mapalab.catalogo_capas.infobox_config</Text>,
                        así que el visor principal no cambia. Esto también da tarjeta a las capas del Catálogo que no existen
                        en el árbol, que antes se quedaban sin configuración.
                    </>
                }
            />

            <Card size="small" title="Qué puede incluir una propuesta">
                <Table
                    dataSource={PERMITIDO}
                    columns={CLAVE_COLUMNS}
                    rowKey="clave"
                    pagination={false}
                    size="small"
                />
                <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 8 }}>
                    El editor ciudadano trabaja con un subconjunto seguro del formato. El editor de capas del admin
                    conserva el formato completo.
                </Paragraph>
                <Table
                    dataSource={PROHIBIDO}
                    columns={PROHIBIDO_COLUMNS}
                    rowKey="clave"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Card size="small" title="Cómo se protege el JSON">
                <Table
                    dataSource={DEFENSAS}
                    columns={DEFENSA_COLUMNS}
                    rowKey="capa"
                    pagination={false}
                    size="small"
                />
            </Card>

            <Alert
                type="warning"
                showIcon
                title="Qué revisar antes de aprobar"
                description={
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>Que las etiquetas describan el dato y no sean texto promocional o con carga.</li>
                        <li>Que los enlaces apunten a dominios institucionales o fuentes verificables.</li>
                        <li>Que la tarjeta no exponga campos internos (identificadores de sistema, claves de proceso).</li>
                        <li>Que el orden tenga sentido para quien consulta, no sólo para quien propuso.</li>
                    </ul>
                }
            />

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

export default function MapalabTopic() {
    const items = [
        { key: 'propuestas', label: 'Propuestas de tarjeta', children: <PropuestasInfoboxTab /> },
        { key: 'raster-time', label: 'Rásters con TIME', children: <RasterTimeTopic /> },
    ];

    return <Tabs items={items} defaultActiveKey="propuestas" />;
}
