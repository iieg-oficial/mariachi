import { useEffect, useState } from 'react';
import {
    Badge, Col, Descriptions, Divider, Empty, Row, Space, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import { getMonitorServicio } from '@features/monitoreo/api/monitoreoService';
import { statusMeta } from '@features/monitoreo/constants';

const { Text, Paragraph } = Typography;


const CHECK_COLUMNS = [
    { title: 'Check', dataIndex: 'nombre', key: 'nombre', render: (v) => <Text code>{v}</Text> },
    {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (v) => {
            const meta = statusMeta(v);
            return <Badge status={meta.badge} text={meta.text} />;
        },
    },
    {
        title: 'Detalle',
        dataIndex: 'detalle',
        key: 'detalle',
        render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
];

const CONTAINER_COLUMNS = [
    { title: 'Contenedor', dataIndex: 'name', key: 'name', render: (v) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    {
        title: 'Estado',
        dataIndex: 'state',
        key: 'state',
        width: 100,
        render: (v) => <Tag color={v === 'running' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
        title: 'Salud',
        dataIndex: 'health',
        key: 'health',
        width: 100,
        render: (v) => {
            if (!v) return <Text type="secondary">—</Text>;
            const color = v === 'healthy' ? 'green' : v === 'unhealthy' ? 'red' : 'gold';
            return <Tag color={color}>{v}</Tag>;
        },
    },
];

const describeCheck = (check) => {
    const parts = [];
    if (check.used_percent != null) parts.push(`${check.used_percent}% usado`);
    if (check.free_gb != null) parts.push(`${check.free_gb} GB libres`);
    if (check.total != null) parts.push(`${check.running ?? '?'}/${check.total} corriendo`);
    if (check.port != null) parts.push(`:${check.port}`);
    if (check.detail) parts.push(check.detail);
    return parts.join(' · ');
};

const historialBar = (history) => {
    if (!history?.length) return null;
    const items = [...history].reverse();
    const colorMap = { success: '#52c41a', warning: '#faad14', error: '#ff4d4f', default: '#d9d9d9' };
    return (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {items.map((h, i) => {
                const meta = statusMeta(h.status);
                const tip = `${new Date(h.checked_at).toLocaleString()} · ${meta.text}`
                    + (h.latency_ms != null ? ` · ${h.latency_ms} ms` : '');
                return (
                    <Tooltip key={i} title={tip}>
                        <div style={{
                            width: 8,
                            height: 22,
                            borderRadius: 2,
                            background: colorMap[meta.badge] ?? colorMap.default,
                        }} />
                    </Tooltip>
                );
            })}
        </div>
    );
};


export default function ServicioDetalle({ slug }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        setLoading(true);
        getMonitorServicio(slug, 120)
            .then((res) => { if (!cancelled) setData(res); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [slug]);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>;
    }
    if (!data) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin datos del monitor para este servicio" />;
    }

    const checkRows = data.checks
        ? Object.entries(data.checks).map(([nombre, check]) => ({
            key: nombre,
            nombre,
            status: check.status,
            detalle: describeCheck(check),
        }))
        : [];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
                <Descriptions.Item label="Versión">{data.version ? `v${data.version}` : '—'}</Descriptions.Item>
                <Descriptions.Item label="Desplegado">{data.deployed_at ? new Date(data.deployed_at).toLocaleString() : '—'}</Descriptions.Item>
                <Descriptions.Item label="En este estado">{data.since_human || '—'}</Descriptions.Item>
                <Descriptions.Item label="Disponibilidad 24 h">{data.uptime_24h != null ? `${data.uptime_24h}%` : '—'}</Descriptions.Item>
                <Descriptions.Item label="Latencia">{data.latency_ms != null ? `${data.latency_ms} ms` : '—'}</Descriptions.Item>
                {data.detail && <Descriptions.Item label="Detalle">{data.detail}</Descriptions.Item>}
            </Descriptions>

            <Row gutter={[16, 16]}>
                {checkRows.length > 0 && (
                    <Col xs={24} md={data.containers?.length ? 12 : 24}>
                        <Divider orientation="left" style={{ margin: '0 0 12px' }}>Checks</Divider>
                        <Table rowKey="nombre" size="small" pagination={false} dataSource={checkRows} columns={CHECK_COLUMNS} />
                    </Col>
                )}
                {data.containers?.length > 0 && (
                    <Col xs={24} md={checkRows.length ? 12 : 24}>
                        <Divider orientation="left" style={{ margin: '0 0 12px' }}>
                            Contenedores ({data.container_summary?.running ?? 0}/{data.container_summary?.total ?? 0})
                        </Divider>
                        <Table rowKey={(r, i) => `${r.name}-${i}`} size="small" pagination={false} dataSource={data.containers} columns={CONTAINER_COLUMNS} />
                    </Col>
                )}
            </Row>

            {data.history?.length > 0 && (
                <div>
                    <Divider orientation="left" style={{ margin: '0 0 12px' }}>Historial reciente</Divider>
                    {historialBar(data.history)}
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 11 }}>
                        Cada barra es un sondeo, del más antiguo al más reciente.
                    </Paragraph>
                </div>
            )}
        </Space>
    );
}
