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
    'shares + medición': 'volcano',
};

const TOOLS = [
    { router: 'metadata', tool: 'get_metadata', route: 'GET /metadata/', desc: 'Metadata completa de una capa. Acepta id del visor o geoserver_layer.' },
    { router: 'metadata', tool: 'get_sources_batch', route: 'GET /metadata/sources', desc: 'Fuentes de varias capas en lote ("workspace:layer" separadas por coma).' },
    { router: 'periodicity', tool: 'get_periodicity', route: 'GET /periodicity/', desc: 'Fechas year/month/day de una capa temporal. Acepta alias o geoserver_workspace + Layer.id o geoserver_layer.' },
    { router: 'periodicity', tool: 'get_periodicities_batch', route: 'GET /periodicity/batch', desc: 'Periodicidad de varias capas en una sola llamada.' },
    { router: 'layers', tool: 'get_layer_tree', route: 'GET /layers/tree', desc: 'Árbol jerárquico completo (temas → categorías → capas).' },
    { router: 'layers', tool: 'get_initial_order', route: 'GET /layers/initial-order', desc: 'Capas activas al cargar el visor.' },
    { router: 'layers', tool: 'get_workspaces', route: 'GET /layers/workspaces', desc: 'Workspaces con alias + schema en DataEngine.' },
    { router: 'layers', tool: 'search_layers', route: 'GET /layers/search', desc: 'Busca por label, tags o id. Devuelve label + path jerárquico.', highlight: true },
    { router: 'layers', tool: 'resolve_layer_ref', route: 'GET /layers/resolve', desc: 'Slug, alias público o id del visor → capa.' },
    { router: 'shares + medición', tool: 'create_single_share', route: 'POST /shares (kind=single)', desc: 'Crea share del visor con capas y annotations opcionales. Devuelve {id, url, embed_html}.', highlight: true },
    { router: 'shares + medición', tool: 'create_swipe_share', route: 'POST /shares (kind=swipe)', desc: 'Crea share en modo swipe A|B para comparación.' },
    { router: 'shares + medición', tool: 'measure_geometry', route: 'PostGIS ST_Length/ST_Area::geography', desc: 'Longitud (LineString) o área (Polygon) geodésica en metros/m² reales.' },
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

            <McpPlayground />
        </Space>
    );
}
