import { Alert, Card, Col, Divider, Row, Space, Table, Tag, Typography } from 'antd';
import McpPlayground from '@features/documentacion/topics/McpPlayground';

const { Title, Paragraph, Text } = Typography;


const PROXY_URL = import.meta.env.VITE_MAPALAB_PROXY_URL || '';
const WEB_URL = import.meta.env.VITE_WEB_URL || '';

const buildLocalMcpUrl = () => {
    if (PROXY_URL) {
        return `${PROXY_URL.replace(/\/+$/, '')}/api/mcp`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/mapalab/api/mcp`;
    }
    return 'http://<host>:<port>/api/mcp';
};

const buildPublicMcpUrl = () => {
    if (WEB_URL && /^https?:\/\//i.test(WEB_URL)) {
        return `${WEB_URL.replace(/\/+$/, '')}/mapalab/api/mcp`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/mapalab/api/mcp`;
    }
    return 'https://<dominio>/mapalab/api/mcp';
};

const LOCAL_MCP_URL = buildLocalMcpUrl();
const PUBLIC_MCP_URL = buildPublicMcpUrl();


const TOOLS_BY_ROUTER = {
    metadata: [
        { tool: 'get_metadata', route: 'GET /metadata/', desc: 'Metadata completa de una capa (descripción, fuentes, downloadable, URLs TXT/XLSX).' },
        { tool: 'get_sources_batch', route: 'GET /metadata/sources', desc: 'Fuentes de varias capas en lote ("workspace:layer" separadas por coma).' },
    ],
    periodicity: [
        { tool: 'get_periodicity', route: 'GET /periodicity/', desc: 'Fechas disponibles year/month/day de una capa temporal.' },
        { tool: 'get_periodicities_batch', route: 'GET /periodicity/batch', desc: 'Periodicidad de varias capas en una sola llamada.' },
    ],
    layers: [
        { tool: 'get_layer_tree', route: 'GET /layers/tree', desc: 'Árbol jerárquico completo (temas → categorías → capas).' },
        { tool: 'get_initial_order', route: 'GET /layers/initial-order', desc: 'Capas activas al cargar el visor.' },
        { tool: 'get_workspaces', route: 'GET /layers/workspaces', desc: 'Workspaces con alias + schema en DataEngine.' },
        { tool: 'search_layers', route: 'GET /layers/search', desc: 'Busca por label, tags o id. Devuelve label + path jerárquico.', highlight: true },
        { tool: 'resolve_layer_ref', route: 'GET /layers/resolve', desc: 'Slug o alias público → capa.' },
        { tool: 'refresh_layer_tree_cache', route: 'POST /layers/refresh-cache', desc: 'Regenera la cache materializada. Requiere X-Internal-Token.' },
        { tool: 'invalidate_layer_tree_memory_cache', route: 'POST /layers/invalidate-cache', desc: 'Invalida solo memoria del worker. Requiere X-Internal-Token.' },
    ],
};

const TOOL_COLUMNS = [
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


const SEARCH_EXAMPLE = `// search_layers({ q: "homicidio doloso", limit: 3 })
[
  {
    "id": "tasa_homicidio_doloso",
    "label": "Homicidio doloso (tasa)",
    "path": "Seguridad > Incidencia en delitos del fuero común > Delitos contra la vida",
    "workspace": "seguridad",
    "slug": "tasa_homicidio_doloso",
    "wmsConfig": { /* ... */ },
    "searchMeta": { /* tags, sinónimos */ }
  },
  ...
]`;

const CLIENT_DESKTOP_EXAMPLE = `// ~/.config/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "mapalab": {
      "transport": "http",
      "url": "${PUBLIC_MCP_URL}"
    }
  }
}`;

const CLIENT_PY_EXAMPLE = `# langchain_mcp_adapters
from langchain_mcp_adapters.client import MultiServerMCPClient

mcp = MultiServerMCPClient({
    "mapalab": {
        "transport": "streamable_http",
        "url": "${PUBLIC_MCP_URL}",
    }
})
tools = await mcp.get_tools()
# tools incluye search_layers, get_metadata, etc. con descripción larga`;


const CodeBlock = ({ children }) => (
    <pre
        style={{
            background: '#1f1f1f',
            color: '#f5f5f5',
            padding: '12px 16px',
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.5,
            overflow: 'auto',
            margin: 0,
        }}
    >
        <code>{children}</code>
    </pre>
);


export default function McpTopic() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Servidor MCP</Title>
                <Text type="secondary">
                    El servidor MCP de MapaLab expone el catálogo de capas como tools que un agente
                    LLM (Claude Desktop, IGIBot, etc.) puede consultar. Vive en un container dedicado
                    (<Text code>mapalab-mcp</Text> en <Text code>iieg-network</Text>), separado del
                    backend principal — comparte la imagen base y los servicios pero corre su propio
                    lifecycle. Antes del release <Text code>1.35.0</Text> de mapalab estaba embebido
                    en el backend.
                </Text>
            </div>

            <Alert
                type="info"
                showIcon
                message="¿Para qué sirve?"
                description="Un LLM con MCP puede resolver el ID de una capa a partir del nombre que conoce el usuario, traer su metadata, periodicidad y fuentes, y construir un enlace al visor — todo sin que un humano tenga que navegar el árbol manualmente."
            />

            <Card title="Endpoints / URL del MCP" size="small">
                <Table
                    rowKey="contexto"
                    size="small"
                    pagination={false}
                    dataSource={URLS}
                    columns={URL_COLUMNS}
                />
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Pega la URL <strong>sin slash final</strong> en la configuración del cliente MCP — los clientes (Claude Desktop, FastMCP, langchain-mcp-adapters) agregan el slash internamente. Si llamas con <Text code>curl</Text>, recuerda que el endpoint real es <Text code>/mcp/</Text> con slash (sin él recibes un HTTP 307 redirect que <Text code>curl -X POST</Text> no sigue por defecto; usa <Text code>-L</Text> o escribe el slash).
                </Paragraph>
            </Card>

            <Divider style={{ margin: 0 }} />

            <div>
                <Title level={4}>Tools disponibles</Title>
                <Text type="secondary">
                    11 tools manuales (<Text code>@mcp.tool()</Text> en{' '}
                    <Text code>servers/mapalab.py</Text>) agrupados por router REST equivalente. El
                    más útil para un agente es <Text code strong>search_layers</Text>: resuelve el ID
                    de una capa por su nombre visible y devuelve el path jerárquico. Los endpoints
                    REST de <Text code>shares</Text> (writes), <Text code>download</Text> (streams) y{' '}
                    <Text code>get_database_stats</Text> no se exponen al MCP — siguen disponibles
                    en REST normal.
                </Text>
            </div>

            {Object.entries(TOOLS_BY_ROUTER).map(([router, tools]) => (
                <Card key={router} title={<><Tag color="purple">{router}</Tag> <Text>Router</Text></>} size="small">
                    <Table
                        rowKey="tool"
                        size="small"
                        pagination={false}
                        dataSource={tools}
                        columns={TOOL_COLUMNS}
                    />
                </Card>
            ))}

            <Card title="Ejemplo de respuesta: search_layers" size="small">
                <CodeBlock>{SEARCH_EXAMPLE}</CodeBlock>
            </Card>

            <Divider style={{ margin: 0 }} />

            <div>
                <Title level={4}>Cómo se usa</Title>
                <Text type="secondary">
                    El MCP es público (mismo perfil que el resto del backend). Se conecta vía HTTP
                    streamable transport — cualquier cliente compatible con MCP funciona.
                </Text>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card title="Claude Desktop" size="small">
                        <CodeBlock>{CLIENT_DESKTOP_EXAMPLE}</CodeBlock>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title="Python (LangChain)" size="small">
                        <CodeBlock>{CLIENT_PY_EXAMPLE}</CodeBlock>
                    </Card>
                </Col>
            </Row>

            <Divider style={{ margin: 0 }} />

            <div>
                <Title level={4}>Telemetría</Title>
                <Text type="secondary">
                    Cada llamada se registra en mariachi vía un middleware en el backend. Sin identidad:
                    session id e IP se persisten hasheados con SHA-256 salteado con el token interno.
                </Text>
            </div>

            <Card title="Campos persistidos en mapalab_mcp_events" size="small">
                <Table
                    rowKey="campo"
                    size="small"
                    pagination={false}
                    dataSource={FIELDS_TELEMETRY}
                    columns={FIELD_COLUMNS}
                />
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Buffer en memoria, flush async cada 30 s a{' '}
                    <Text code>POST /api/administrador/internal/mapalab/mcp/events</Text> con{' '}
                    <Text code>X-Internal-Token</Text>. Las estadísticas agregadas viven en cuatro
                    vistas materializadas y se ven en el tab MCP de Estadísticas.
                </Paragraph>
            </Card>

            <Divider style={{ margin: 0 }} />

            <div>
                <Title level={4}>Probar endpoints</Title>
                <Text type="secondary">
                    Llama los endpoints REST equivalentes de los tools del MCP y mira la respuesta
                    real. Útil para entender qué devuelve cada tool antes de cablearlo a un agente.
                </Text>
            </div>

            <McpPlayground />

            <Divider style={{ margin: 0 }} />

            <Card title="Características" size="small">
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Title level={5} style={{ marginTop: 0 }}>Qué incluye</Title>
                        <ul style={{ marginTop: 0, paddingLeft: 18, color: '#444' }}>
                            <li>11 tools manuales con descripción en español</li>
                            <li>Container dedicado <Text code>mapalab-mcp</Text> (red <Text code>iieg-network</Text>)</li>
                            <li>Transporte HTTP streamable (SSE)</li>
                            <li>Telemetría → mariachi (sin identidad) vía middleware ASGI en <Text code>servers/telemetry.py</Text></li>
                            <li>Métricas Prometheus + alertas en huachicol</li>
                            <li>Dashboard /administrador/mapalab/stats?tab=mcp</li>
                            <li>Imagen base + <Text code>requirements.txt</Text> compartidos con el backend (sin duplicar deps)</li>
                        </ul>
                    </Col>
                    <Col xs={24} md={12}>
                        <Title level={5} style={{ marginTop: 0 }}>Qué NO incluye</Title>
                        <ul style={{ marginTop: 0, paddingLeft: 18, color: '#444' }}>
                            <li><Text code>download</Text> (streams de CSV)</li>
                            <li><Text code>/metrics</Text> (endpoint interno de Prometheus)</li>
                            <li>Args del tool en la telemetría (sin <Text code>q</Text>, <Text code>workspace</Text>, etc.)</li>
                            <li>Rate limit propio (usa el del gateway)</li>
                            <li>Auth — público igual que el resto del backend</li>
                        </ul>
                    </Col>
                </Row>
            </Card>
        </Space>
    );
}
