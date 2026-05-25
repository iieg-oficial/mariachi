import { Card, Space, Table, Tag, Typography } from 'antd';
import McpPlayground from '@features/documentacion/topics/McpPlayground';

const { Title, Paragraph, Text } = Typography;


const PROXY_URL = import.meta.env.VITE_MAPALAB_PROXY_URL || '';
const WEB_URL = import.meta.env.VITE_WEB_URL || '';

const buildLocalMcpUrl = () => {
    if (PROXY_URL) {
        return `${PROXY_URL.replace(/\/+$/, '')}/mcp`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/mapalab/mcp`;
    }
    return 'http://<host>:<port>/mcp';
};

const buildPublicMcpUrl = () => {
    if (WEB_URL && /^https?:\/\//i.test(WEB_URL)) {
        return `${WEB_URL.replace(/\/+$/, '')}/mapalab/mcp`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/mapalab/mcp`;
    }
    return 'https://<dominio>/mapalab/mcp';
};

const LOCAL_MCP_URL = buildLocalMcpUrl();
const PUBLIC_MCP_URL = buildPublicMcpUrl();


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
    { router: 'layers', tool: 'refresh_layer_tree_cache', route: 'POST /layers/refresh-cache', desc: 'Regenera la cache materializada. Requiere X-Internal-Token.' },
    { router: 'layers', tool: 'invalidate_layer_tree_memory_cache', route: 'POST /layers/invalidate-cache', desc: 'Invalida solo memoria del worker. Requiere X-Internal-Token.' },
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


const FIELDS_TELEMETRY = [
    { campo: 'timestamp', tipo: 'datetime', origen: 'reloj del backend al recibir el request' },
    { campo: 'dia', tipo: 'date', origen: 'fecha de timestamp (para particionar consultas)' },
    { campo: 'method', tipo: 'string', origen: 'JSON-RPC: initialize, tools/list, tools/call, notifications/initialized' },
    { campo: 'tool', tipo: 'string | null', origen: 'params.name cuando method = "tools/call"' },
    { campo: 'status', tipo: 'ok | error', origen: 'ok si HTTP < 400; error si ≥ 400' },
    { campo: 'error_code', tipo: 'int | null', origen: 'status HTTP cuando hay error' },
    { campo: 'duration_ms', tipo: 'int', origen: 'time.monotonic() antes/después del downstream' },
    { campo: 'bytes_out', tipo: 'int', origen: 'suma de chunks del response (incluye SSE)' },
    { campo: 'session_hash', tipo: 'sha-256', origen: 'salt + mcp-session-id (no se guarda en claro)' },
    { campo: 'ip_hash', tipo: 'sha-256', origen: 'salt + IP del cliente' },
    { campo: 'client_name', tipo: 'string | null', origen: 'params.clientInfo.name del initialize' },
    { campo: 'client_version', tipo: 'string | null', origen: 'params.clientInfo.version del initialize' },
];

const FIELD_COLUMNS = [
    { title: 'Campo', dataIndex: 'campo', key: 'campo', render: (v) => <Text code>{v}</Text> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo' },
    { title: 'Origen', dataIndex: 'origen', key: 'origen' },
];


const URLS = [
    { contexto: 'Entre containers', url: 'http://mapalab-mcp:8000/mcp' },
    { contexto: 'Local / dev (puerto publicado)', url: LOCAL_MCP_URL },
    { contexto: 'Producción / staging', url: PUBLIC_MCP_URL },
];

const URL_COLUMNS = [
    { title: 'Contexto', dataIndex: 'contexto', key: 'contexto', width: 220 },
    { title: 'URL', dataIndex: 'url', key: 'url', render: (v) => <Text code>{v}</Text> },
];


export default function McpTopic() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Servidor MCP</Title>
                <Text type="secondary">
                    El servidor MCP de MapaLab expone el catálogo de capas y operaciones de share/medición como tools que un agente LLM (Claude Desktop, IGIBot, etc.) puede consultar. Vive en un container dedicado <Text code>mapalab-mcp</Text>.
                </Text>
            </div>

            <Card title="Endpoints / URL del MCP" size="small">
                <Table
                    rowKey="contexto"
                    size="small"
                    pagination={false}
                    dataSource={URLS}
                    columns={URL_COLUMNS}
                />
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Pega la URL <strong>sin slash final</strong> en la configuración del cliente MCP. Para <Text code>curl</Text> usa <Text code>-L</Text> o agrega el slash (<Text code>/mcp/</Text>) para evitar el 307 redirect.
                </Paragraph>
            </Card>

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

            <Card title="Telemetría — campos persistidos en mapalab_mcp_events" size="small">
                <Table
                    rowKey="campo"
                    size="small"
                    pagination={false}
                    dataSource={FIELDS_TELEMETRY}
                    columns={FIELD_COLUMNS}
                />
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Buffer en memoria, flush async cada 30 s a <Text code>POST /api/administrador/internal/mapalab/mcp/events</Text>. Sin identidad: session id e IP se guardan hasheados con SHA-256. Estadísticas agregadas en el tab MCP de Estadísticas.
                </Paragraph>
            </Card>

            <div>
                <Title level={4} style={{ marginBottom: 4 }}>Probar endpoints</Title>
                <Text type="secondary">
                    Llama los tools del MCP vía JSON-RPC o los endpoints REST equivalentes. Las tarjetas <Text code>create_*_share</Text> embeben el mapa resultante si pegas una API key arriba.
                </Text>
            </div>

            <McpPlayground />
        </Space>
    );
}
