import { Card, Space, Table, Tag, Typography } from 'antd';
import McpPlayground from '@features/documentacion/topics/McpPlayground';

const { Title, Paragraph, Text } = Typography;


const MCP_URL = (() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/mapalab/mcp`;
    }
    return 'https://<dominio>/mapalab/mcp';
})();


const ROUTER_COLOR = {
    metadata: 'purple',
    periodicity: 'magenta',
    layers: 'geekblue',
    municipios: 'cyan',
    shares: 'volcano',
    geo: 'orange',
};

const TOOLS = [
    { router: 'metadata', tool: 'get_metadata', route: 'GET /metadata/', desc: 'Metadata completa de una capa.' },
    { router: 'metadata', tool: 'get_sources_batch', route: 'GET /metadata/sources', desc: 'Fuentes de varias capas en lote.' },
    { router: 'periodicity', tool: 'get_periodicity', route: 'GET /periodicity/', desc: 'Fechas year/month/day de una capa temporal.' },
    { router: 'periodicity', tool: 'get_periodicities_batch', route: 'GET /periodicity/batch', desc: 'Periodicidad de varias capas.' },
    { router: 'layers', tool: 'get_layer_tree', route: 'GET /layers/tree', desc: 'Árbol jerárquico completo.' },
    { router: 'layers', tool: 'search_by_theme', route: 'filtra árbol cacheado', desc: 'Capas hoja de un tema. Ej: "seguridad".', highlight: true },
    { router: 'layers', tool: 'get_initial_order', route: 'GET /layers/initial-order', desc: 'Capas activas al cargar el visor.' },
    { router: 'layers', tool: 'get_workspaces', route: 'GET /layers/workspaces', desc: 'Workspaces con alias + schema.' },
    { router: 'layers', tool: 'search_layers', route: 'GET /layers/search', desc: 'Busca por label, tags o id.', highlight: true },
    { router: 'layers', tool: 'resolve_layer_ref', route: 'GET /layers/resolve', desc: 'Slug/alias/id → capa.' },
    { router: 'municipios', tool: 'list_municipios', route: 'GET /municipios/', desc: '125 municipios con clave INEGI.' },
    { router: 'municipios', tool: 'resolve_municipios', route: 'substring sobre list', desc: 'Nombre/clave → matches. Ej: "guadalajara".', highlight: true },
    { router: 'shares', tool: 'create_single_share', route: 'POST /shares (single)', desc: 'Share con capas, annotations, fecha y municipio. Basemap: voyager.', highlight: true },
    { router: 'shares', tool: 'create_swipe_share', route: 'POST /shares (swipe)', desc: 'Comparador A|B. Annotations globales, misma API de filtros.' },
    { router: 'shares', tool: 'compare_years', route: 'atajo create_swipe_share', desc: 'Swipe año A vs año B con municipio opcional. Una llamada.', highlight: true },
    { router: 'shares', tool: 'get_layer_stats', route: 'mapalab.layer_stats', desc: 'Numeralia: totales, ranking, promedios.' },
    { router: 'geo', tool: 'measure_geometry', route: 'PostGIS geography', desc: 'Longitud/área geodésica en m/m² reales.' },
    { router: 'geo', tool: 'query_wfs', route: 'GeoServer WFS GetFeature', desc: 'Features de capa del visor con CQL. Reproyección PostGIS.' },
];

const TOOL_COLUMNS = [
    {
        title: 'Router',
        dataIndex: 'router',
        key: 'router',
        width: 140,
        filters: Object.keys(ROUTER_COLOR).map((r) => ({ text: r, value: r })),
        onFilter: (value, row) => row.router === value,
        render: (value) => <Tag color={ROUTER_COLOR[value]}>{value}</Tag>,
    },
    {
        title: 'Tool',
        dataIndex: 'tool',
        key: 'tool',
        render: (value, row) => (
            <Text code style={row.highlight ? { color: '#5C2472', fontWeight: 600 } : undefined}>
                {value}
            </Text>
        ),
    },
    { title: 'Endpoint REST equivalente', dataIndex: 'route', key: 'route', render: (v) => <Text code>{v}</Text> },
    { title: 'Qué hace', dataIndex: 'desc', key: 'desc' },
];


export default function McpTopic() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Servidor MCP</Title>
                <Text type="secondary">
                    El servidor MCP de MapaLab expone el catálogo de capas y operaciones de share/medición como tools que un agente LLM (Claude Desktop, IGIBot, etc.) puede consultar.
                </Text>
                <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }} copyable={{ text: MCP_URL }}>
                    URL del entorno actual: <Text code>{MCP_URL}</Text>
                </Paragraph>
            </div>

            <Card
                title={<>Tools disponibles <Tag style={{ marginLeft: 8 }}>{TOOLS.length}</Tag></>}
                size="small"
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Filtra por router en el header</Text>}
            >
                <Table
                    rowKey="tool"
                    size="small"
                    pagination={false}
                    dataSource={TOOLS}
                    columns={TOOL_COLUMNS}
                />
            </Card>

            <div>
                <Title level={4} style={{ marginBottom: 4 }}>Probar endpoints</Title>
                <Text type="secondary">
                    Llama los tools del MCP vía JSON-RPC o los endpoints REST equivalentes. Las tarjetas <Text code>create_*_share</Text> embeben el mapa resultante si pegas una API key arriba. Telemetría persistida en el tema <Text code>Telemetría</Text>.
                </Text>
            </div>

            <Card title="Guía rápida para agentes" size="small" style={{ marginTop: 0 }}>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                    <li><Text strong>Basemaps:</Text> <Text code>voyager</Text> (recomendado) o <Text code>position</Text>. No usar <Text code>osm</Text>.</li>
                    <li><Text strong>Filtros de fecha:</Text> obtener años con <Text code>get_periodicity</Text>, luego CQL: <Text code>{'(fecha >= \'2025-01-01\' AND fecha < \'2026-01-01\')'}</Text>. Se pasa como <Text code>{'filters: {date: "..."}'}</Text> en el objeto de capa.</li>
                    <li><Text strong>Anotaciones:</Text> <Text code>LineString</Text>, <Text code>Polygon</Text>, <Text code>Emoji</Text> (<Text code>textLabel: "📍"</Text>), <Text code>Text</Text>. En swipe son globales (ambos lados).</li>
                    <li><Text strong>Municipios:</Text> <Text code>resolve_municipios("Guadalajara")</Text> → clave, luego <Text code>municipios: {'{source:"iieg", selected:["14039"]}'}</Text>.</li>
                    <li><Text strong>Flujo típico:</Text> <Text code>search_layers → get_periodicity → resolve_municipios → measure_geometry → create_single_share</Text></li>
                </ul>
            </Card>

            <McpPlayground />
        </Space>
    );
}
