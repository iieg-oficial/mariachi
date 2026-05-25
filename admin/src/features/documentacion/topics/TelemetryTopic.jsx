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


export default function TelemetryTopic() {
    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Telemetría</Title>
                <Text type="secondary">
                    Registro de eventos sin identidad de los servicios del ecosistema. Cada fuente persiste sus propios campos; las estadísticas agregadas viven en el dashboard de Estadísticas correspondiente.
                </Text>
            </div>

            <Card
                title={<>Servidor MCP de MapaLab — <Text code>mapalab_mcp_events</Text></>}
                size="small"
            >
                <Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12, fontSize: 12 }}>
                    Middleware ASGI en el container <Text code>mapalab-mcp</Text> intercepta cada request al endpoint <Text code>/mcp/</Text>, parsea el JSON-RPC y empuja al buffer. Flush async cada 30 s a <Text code>POST /api/administrador/internal/mapalab/mcp/events</Text>. Sin identidad: <Text code>session_hash</Text> e <Text code>ip_hash</Text> son SHA-256 + salt del token interno. Dashboard en el tab MCP de <Text code>/administrador/mapalab/stats</Text>.
                </Paragraph>
                <Table
                    rowKey="campo"
                    size="small"
                    pagination={false}
                    dataSource={MCP_FIELDS}
                    columns={FIELD_COLUMNS}
                />
            </Card>
        </Space>
    );
}
