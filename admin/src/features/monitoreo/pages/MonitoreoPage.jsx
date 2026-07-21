import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Badge, Button, Card, Empty, Layout, Space, Spin,
    Table, Tag, Timeline, Tooltip, Typography,
} from 'antd';
import { ClusterOutlined, ReloadOutlined } from '@ant-design/icons';
import useIsMobile from '@shared/hooks/useIsMobile';
import { getMonitorStatus, getMonitorEventos } from '@features/monitoreo/api/monitoreoService';
import { eventMeta, statusMeta } from '@features/monitoreo/constants';
import ServicioDetalle from '@features/monitoreo/components/ServicioDetalle';

const { Content } = Layout;
const { Title, Text } = Typography;

const REFRESH_MS = 30000;


const COLUMNS = [
    {
        title: 'Servicio',
        dataIndex: 'label',
        key: 'label',
        render: (label, row) => (
            <Space direction="vertical" size={0}>
                <Text strong>{label}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{row.slug}</Text>
            </Space>
        ),
    },
    {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        filters: [
            { text: 'Operativo', value: 'ok' },
            { text: 'Degradado', value: 'degraded' },
            { text: 'Caído', value: 'down' },
        ],
        onFilter: (value, row) => (value === 'down' ? ['down', 'unreachable'].includes(row.status) : row.status === value),
        render: (status) => {
            const meta = statusMeta(status);
            return <Badge status={meta.badge} text={meta.text} />;
        },
    },
    {
        title: 'Versión',
        dataIndex: 'version',
        key: 'version',
        width: 100,
        render: (v) => (v ? <Tag color="blue">v{v}</Tag> : <Tag>—</Tag>),
    },
    {
        title: 'Disp. 24 h',
        dataIndex: 'uptime_24h',
        key: 'uptime_24h',
        width: 100,
        sorter: (a, b) => (a.uptime_24h ?? 0) - (b.uptime_24h ?? 0),
        render: (v) => (v != null ? `${v}%` : '—'),
    },
    {
        title: 'Contenedores',
        key: 'containers',
        width: 120,
        render: (_, row) => {
            const cs = row.container_summary;
            if (!cs?.total) return <Text type="secondary">—</Text>;
            const bad = cs.total - cs.running;
            return <Text type={bad > 0 ? 'danger' : undefined}>{cs.running}/{cs.total}</Text>;
        },
    },
    {
        title: 'Desde',
        dataIndex: 'since_human',
        key: 'since_human',
        width: 120,
        render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
];


export default function MonitoreoPage() {
    const { isMobile } = useIsMobile();
    const [status, setStatus] = useState(null);
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [expandedKeys, setExpandedKeys] = useState([]);

    const cargar = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        try {
            const [st, ev] = await Promise.all([getMonitorStatus(), getMonitorEventos(40)]);
            setStatus(st);
            setEventos(ev.events || []);
            setError(false);
            setUpdatedAt(new Date());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
        const id = setInterval(() => cargar(true), REFRESH_MS);
        return () => clearInterval(id);
    }, [cargar]);

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <div>
                        <Space align="center" size={12}>
                            <ClusterOutlined style={{ fontSize: 24, color: '#5C2472' }} />
                            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Huachicol</Title>
                        </Space>
                        <Text type="secondary">
                            Estado en vivo de cada servicio del ecosistema vía <Text code>/ontoy</Text>.
                        </Text>
                    </div>
                    <Space>
                        {updatedAt && !isMobile && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Actualizado {updatedAt.toLocaleTimeString()}
                            </Text>
                        )}
                        <Button icon={<ReloadOutlined />} onClick={() => cargar()} loading={loading}>
                            {isMobile ? '' : 'Actualizar'}
                        </Button>
                    </Space>
                </Space>

                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="No se pudo contactar al monitor"
                        description="El servicio huachicol-monitor no respondió. Verifica que esté corriendo y que HUACHICOL_MONITOR_URL esté configurada."
                    />
                )}

                {loading && !status && <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>}

                {status && (
                    <>
                        <Table
                            rowKey="slug"
                            size="small"
                            pagination={false}
                            dataSource={status.services}
                            columns={COLUMNS}
                            scroll={{ x: 720 }}
                            expandable={{
                                expandedRowKeys: expandedKeys,
                                onExpandedRowsChange: (keys) => setExpandedKeys(keys),
                                expandedRowRender: (row) => <ServicioDetalle slug={row.slug} />,
                                expandRowByClick: true,
                            }}
                        />

                        <Card size="small" title="Eventos recientes">
                            {eventos.length === 0
                                ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin eventos registrados" />
                                : (
                                    <Timeline
                                        items={eventos.map((e) => {
                                            const meta = eventMeta(e.kind);
                                            return {
                                                color: meta.color,
                                                children: (
                                                    <Space direction="vertical" size={0}>
                                                        <Space size={6}>
                                                            <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>{meta.text}</Tag>
                                                            <Text strong style={{ fontSize: 13 }}>{e.slug}</Text>
                                                        </Space>
                                                        {e.detail && <Text type="secondary" style={{ fontSize: 11 }}>{e.detail}</Text>}
                                                        <Tooltip title={new Date(e.occurred_at).toLocaleString()}>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                {new Date(e.occurred_at).toLocaleString()}
                                                                {e.notified === 0 && ' · no notificado'}
                                                            </Text>
                                                        </Tooltip>
                                                    </Space>
                                                ),
                                            };
                                        })}
                                    />
                                )}
                        </Card>
                    </>
                )}
            </Space>
        </Content>
    );
}
