import { useMemo } from 'react';
import { Alert, Card, Col, Empty, Row, Space, Spin, Table, Tag, Typography } from 'antd';
import StatCard from '@features/mapalab-stats/components/StatCard';
import {
    useMcpClients,
    useMcpDaily,
    useMcpOverview,
    useMcpTools,
} from '@features/mapalab-stats/hooks/useMapalabStats';

const { Text } = Typography;

const GRAIN_TITLE = { day: 'Llamadas por día (MCP)', month: 'Llamadas por mes (MCP)', year: 'Llamadas por año (MCP)' };


const McpDailyChart = ({ rows = [], loading, grain = 'day' }) => {
    const title = GRAIN_TITLE[grain] || 'Llamadas por periodo (MCP)';
    const series = useMemo(() => [...rows].sort((a, b) => a.dia.localeCompare(b.dia)), [rows]);
    if (!loading && series.length === 0) {
        return (
            <Card title={title} size="small">
                <Empty description="Sin llamadas registradas" />
            </Card>
        );
    }
    const max = Math.max(...series.map((d) => d.calls), 1);
    return (
        <Card title={title} size="small" loading={loading}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, paddingTop: 8 }}>
                {series.map((d) => (
                    <div
                        key={d.dia}
                        title={`${d.dia}: ${d.calls} llamadas · ${d.toolCalls} tools · ${d.errors} errores · ${d.uniqueSessions} sesiones`}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 2,
                            minWidth: 4,
                        }}
                    >
                        {d.errors > 0 && (
                            <div
                                style={{
                                    width: '100%',
                                    background: '#ff4d4f',
                                    borderRadius: '2px 2px 0 0',
                                    height: `${(d.errors / max) * 100}%`,
                                    minHeight: 2,
                                }}
                            />
                        )}
                        <div
                            style={{
                                width: '100%',
                                background: '#5C2472',
                                borderRadius: 2,
                                height: `${((d.calls - d.errors) / max) * 100}%`,
                                minHeight: d.calls > 0 ? 2 : 0,
                                transition: 'height 0.3s',
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#888' }}>
                <span>{series[0]?.dia}</span>
                <span>{series[series.length - 1]?.dia}</span>
            </div>
        </Card>
    );
};


const ToolsTable = ({ rows = [], loading }) => {
    const columns = [
        { title: 'Tool', dataIndex: 'tool', key: 'tool', render: (t) => <Text code>{t}</Text> },
        { title: 'Usos', dataIndex: 'uses', key: 'uses', align: 'right', sorter: (a, b) => a.uses - b.uses, defaultSortOrder: 'descend' },
        {
            title: 'Errores',
            dataIndex: 'errors',
            key: 'errors',
            align: 'right',
            render: (v) => v > 0 ? <Tag color="red">{v}</Tag> : <Text type="secondary">0</Text>,
        },
        { title: 'Sesiones únicas', dataIndex: 'uniqueSessions', key: 'uniqueSessions', align: 'right' },
        {
            title: 'Latencia media',
            dataIndex: 'avgDurationMs',
            key: 'avgDurationMs',
            align: 'right',
            render: (v) => `${v} ms`,
        },
        {
            title: 'Última',
            dataIndex: 'lastSeen',
            key: 'lastSeen',
            render: (v) => v ? new Date(v).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—',
        },
    ];
    return (
        <Card title="Uso por tool" size="small">
            <Table
                rowKey="tool"
                size="small"
                dataSource={rows}
                columns={columns}
                loading={loading}
                pagination={false}
                locale={{ emptyText: 'Sin llamadas a tools en el periodo' }}
            />
        </Card>
    );
};


const ClientsTable = ({ rows = [], loading }) => {
    const columns = [
        { title: 'Cliente', dataIndex: 'clientName', key: 'clientName', render: (t) => <Text>{t}</Text> },
        { title: 'Versión', dataIndex: 'clientVersion', key: 'clientVersion', render: (v) => v ? <Text code>{v}</Text> : <Text type="secondary">—</Text> },
        { title: 'Llamadas', dataIndex: 'calls', key: 'calls', align: 'right', sorter: (a, b) => a.calls - b.calls, defaultSortOrder: 'descend' },
        { title: 'Sesiones', dataIndex: 'uniqueSessions', key: 'uniqueSessions', align: 'right' },
        {
            title: 'Última',
            dataIndex: 'lastSeen',
            key: 'lastSeen',
            render: (v) => v ? new Date(v).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—',
        },
    ];
    return (
        <Card title="Clientes MCP" size="small">
            <Table
                rowKey={(r) => `${r.clientName}-${r.clientVersion}`}
                size="small"
                dataSource={rows}
                columns={columns}
                loading={loading}
                pagination={false}
                locale={{ emptyText: 'Aún no hay clientes registrados — el clientName se captura en el initialize del MCP' }}
            />
        </Card>
    );
};


export default function McpSection({ period }) {
    const { overview, loading: loadingOverview, error: errorOverview } = useMcpOverview(period);
    const { rows: tools, loading: loadingTools } = useMcpTools({ limit: 30, period });
    const { rows: daily, loading: loadingDaily } = useMcpDaily(period);
    const { rows: clients, loading: loadingClients } = useMcpClients(period);

    if (loadingOverview && !overview) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                {errorOverview ? <Alert type="error" title={errorOverview} showIcon /> : <Spin size="large" />}
            </div>
        );
    }

    const errorRate = overview?.calls
        ? Math.round((overview.errors / overview.calls) * 100)
        : 0;

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                title="Telemetría del servidor MCP de MapaLab"
                description="Cada llamada al endpoint /mcp/ se registra en mariachi con method, tool, status, latencia y bytes de salida. Sin identidad: session_id e IP se guardan hasheadas. Las estadísticas se actualizan con el botón 'Refrescar estadísticas' del tab Resumen."
            />

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <StatCard title="Llamadas" value={(overview?.calls ?? 0).toLocaleString()} />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard title="Llamadas a tools" value={(overview?.toolCalls ?? 0).toLocaleString()} />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard title="Sesiones únicas" value={(overview?.sessions ?? 0).toLocaleString()} />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard title="Clientes distintos" value={(overview?.clients ?? 0).toLocaleString()} />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Tasa de error"
                        value={errorRate}
                        format="percent"
                        hint={`${(overview?.errors ?? 0).toLocaleString()} errores`}
                        color={errorRate > 5 ? '#cf1322' : undefined}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Latencia media (tool)"
                        value={overview?.avgToolDurationMs ?? 0}
                        suffix="ms"
                    />
                </Col>
            </Row>

            <McpDailyChart rows={daily} loading={loadingDaily} grain={period?.grain} />

            <ToolsTable rows={tools} loading={loadingTools} />

            <ClientsTable rows={clients} loading={loadingClients} />
        </Space>
    );
}
