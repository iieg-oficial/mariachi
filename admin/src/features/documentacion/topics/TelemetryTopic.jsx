import { Card, Space, Table, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;


const MCP_FIELDS = [
    { campo: 'timestamp', tipo: 'datetime', origen: 'reloj del backend al recibir el request' },
    { campo: 'dia', tipo: 'date', origen: 'fecha de timestamp (para particionar consultas)' },
    { campo: 'method', tipo: 'string', origen: 'JSON-RPC: initialize, tools/list, tools/call, notifications/initialized' },
    { campo: 'tool', tipo: 'string | null', origen: 'params.name cuando method = "tools/call"' },
    { campo: 'status', tipo: 'ok | error', origen: 'ok si HTTP < 400; error si ≥ 400' },
    { campo: 'error_code', tipo: 'int | null', origen: 'status HTTP cuando hay error' },
    { campo: 'duration_ms', tipo: 'int', origen: 'time.monotonic() antes/después del downstream' },
    { campo: 'bytes_out', tipo: 'int', origen: 'suma de chunks del response (incluye SSE)' },
    { campo: 'session_hash', tipo: 'null', origen: 'siempre nulo: el MCP es stateless_http' },
    { campo: 'ip_hash', tipo: 'null', origen: 'siempre nulo: el borde de producción no entrega la IP' },
    { campo: 'client_name', tipo: 'string | null', origen: 'params.clientInfo.name del initialize' },
    { campo: 'client_version', tipo: 'string | null', origen: 'params.clientInfo.version del initialize' },
];

const FIELD_COLUMNS = [
    { title: 'Campo', dataIndex: 'campo', key: 'campo', render: (v) => <Text code>{v}</Text> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo' },
    { title: 'Origen', dataIndex: 'origen', key: 'origen' },
];

const MUNICIPIO_EVENTS = [
    {
        evento: 'municipio_mode_enter',
        cuando: 'El usuario activa el modo Vista por municipio (manual, desde URL o desde share)',
        params: 'source (iieg|inegi), count (n.º de municipios), from_url (bool)',
    },
    {
        evento: 'municipio_mode_exit',
        cuando: 'El usuario sale del modo (cierra desde el panel o se desactiva por código)',
        params: 'duration_sec (segundos que duró el modo), source',
    },
    {
        evento: 'municipio_mode_change',
        cuando: 'Cambia la selección de municipios mientras el modo está activo',
        params: 'source, count, action (add | remove | set | clear)',
    },
    {
        evento: 'municipio_panel_open',
        cuando: 'El usuario abre el panel selector desde el botón "Jalisco / N municipios"',
        params: 'source, active (bool, si el modo ya estaba activo al abrir)',
    },
];

const HERRAMIENTAS_EVENTS = [
    { evento: 'view3d', cuando: 'Vista 3D: entrar, salir, levantar o aplanar una capa', params: 'action, duration_sec, layer_id' },
    { evento: 'minimapa', cuando: 'Minimapa: encender, apagar, abrir en celular o ir a un punto', params: 'action (encender | apagar | abrir | ir)' },
    { evento: 'north_reset', cuando: 'Botón del norte', params: 'modo (2d | 3d)' },
    { evento: 'tabla_open', cuando: 'Abrir la tabla de datos', params: 'layer_id' },
    { evento: 'tabla_filter', cuando: 'Poner, quitar o limpiar un filtro de la tabla', params: 'layer_id, action, columna' },
    { evento: 'tabla_download', cuando: 'Descargar lo que muestra la tabla', params: 'layer_id, format' },
    { evento: 'stats_open', cuando: 'Abrir un modo del panel de estadísticas', params: 'modo (comparar | ranking | crear)' },
    { evento: 'stats_custom_create', cuando: 'Guardar una estadística propia', params: 'layer_id, operation, filtros' },
    { evento: 'stats_detach', cuando: 'Convertir las estadísticas en panel', params: 'layer_id' },
    { evento: 'colibri_open', cuando: 'Abrir el widget de Colibrí; cuenta como sesión que reportó', params: 'motivo, tipo' },
];

const MUNICIPIO_EVENT_COLUMNS = [
    { title: 'Evento', dataIndex: 'evento', key: 'evento', render: (v) => <Text code>{v}</Text> },
    { title: 'Cuándo se dispara', dataIndex: 'cuando', key: 'cuando' },
    { title: 'Parámetros', dataIndex: 'params', key: 'params', render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
];


export default function TelemetryTopic() {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Telemetría</Title>
                <Text type="secondary">
                    Registro de eventos sin identidad de los servicios del ecosistema. Cada fuente persiste sus propios campos; las estadísticas agregadas viven en el dashboard de Estadísticas correspondiente.
                </Text>
            </div>

            <Card
                title={<>Servidor MCP de MapaLab — <Text code>huachicol.mcp_events</Text></>}
                size="small"
            >
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
                    El MCP envía lotes cada 30 s a <Text code>POST /api/mariachi/internal/mapalab/mcp/events</Text>; los crudos se purgan a los 90 días (por defecto) y lo agregado queda en <Text code>huachicol.mcp_rollup_*</Text>.
                </Paragraph>
                <Table
                    rowKey="campo"
                    size="small"
                    pagination={false}
                    dataSource={MCP_FIELDS}
                    columns={FIELD_COLUMNS}
                />
            </Card>

            <Card title="Visor MapaLab — Herramientas" size="small">
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
                    Un nombre fuera de <Text code>ALLOWED_EVENT_NAMES</Text> recibe 422; el visor descarta ese evento y reenvía el resto del lote.
                </Paragraph>
                <Table
                    rowKey="evento"
                    size="small"
                    pagination={false}
                    dataSource={HERRAMIENTAS_EVENTS}
                    columns={MUNICIPIO_EVENT_COLUMNS}
                />
            </Card>

            <Card
                title={<>Visor MapaLab — Modo Vista por municipio (beta)</>}
                size="small"
            >
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
                    Eventos emitidos por el visor cuando el usuario activa el modo Vista por municipio. Se envían vía <Text code>analyticsService.trackEvent</Text> al collector propio (Mariachi) y a GA4. La fuente <Text code>source</Text> indica si los polígonos se piden de <Text code>general:limite_municipal</Text> (iieg) o <Text code>general:limite_municipal_inegi</Text> (inegi), derivado del switch IIEG/INEGI del panel de capas activas.
                </Paragraph>
                <Table
                    rowKey="evento"
                    size="small"
                    pagination={false}
                    dataSource={MUNICIPIO_EVENTS}
                    columns={MUNICIPIO_EVENT_COLUMNS}
                />
                <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
                    Para que una capa participe del filtro, debe tener <Text code>hasMunicipio = true</Text> y un <Text code>municipioField</Text> definido en el editor de capas (tab Apariencia). El visor construye un CQL <Text code>{'{field} IN (\'014\',\'067\')'}</Text> por capa. Las capas activas que no soporten el filtro se ocultan temporalmente y se marcan como deshabilitadas en el sider.
                </Paragraph>
            </Card>
        </Space>
    );
}
