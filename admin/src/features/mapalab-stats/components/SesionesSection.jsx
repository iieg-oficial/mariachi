import { useState } from 'react';
import { Card, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useSessions } from '@features/mapalab-stats/hooks/useMapalabStats';
import { SOURCE_LABELS } from '@features/mapalab-stats/constants';

const { Text } = Typography;

const formatDuration = (sec) => {
    if (!sec || sec < 1) return '—';
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
};

const SOURCE_OPTIONS = [
    { value: 'all', label: 'Todos' },
    { value: 'visor', label: 'Visor' },
    { value: 'embed', label: 'Embebido' },
    { value: 'widget', label: 'Widget' },
];

export default function SesionesSection({ isMobile = false }) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [source, setSource] = useState('all');
    const { data, loading } = useSessions({ page, pageSize, source });

    const columns = [
        { title: 'Sesión', dataIndex: 'sessionId', key: 'sessionId', width: 140,
            render: (id) => <Text code style={{ fontSize: 11 }}>{String(id).slice(0, 8)}…</Text> },
        { title: 'Inicio', dataIndex: 'startedAt', key: 'startedAt',
            render: (ts) => new Date(ts).toLocaleString('es-MX', { hour12: false }) },
        { title: 'Última actividad', dataIndex: 'lastSeenAt', key: 'lastSeenAt',
            render: (ts) => new Date(ts).toLocaleString('es-MX', { hour12: false }) },
        { title: 'Origen', dataIndex: 'source', key: 'source',
            render: (s) => <Tag color={s === 'visor' ? 'purple' : s === 'embed' ? 'orange' : 'blue'}>{SOURCE_LABELS[s] || s}</Tag> },
        { title: 'Eventos', dataIndex: 'eventsCount', key: 'eventsCount', width: 80, align: 'right' },
        { title: 'Duración', dataIndex: 'durationSec', key: 'durationSec', width: 100, align: 'right',
            render: (s) => formatDuration(s) },
        { title: 'Capas', dataIndex: 'layersActivated', key: 'layersActivated', width: 80, align: 'right' },
        { title: 'Acciones', dataIndex: 'features', key: 'features', width: 240,
            render: (_, row) => (
                <Space size={4} wrap>
                    {row.usedSwipe && <Tag color="orange">Swipe</Tag>}
                    {row.usedDrawing && <Tag color="purple">Dibujo</Tag>}
                    {row.downloaded && <Tag color="green">Descarga</Tag>}
                    {row.shared && <Tag color="blue">Compartió</Tag>}
                    {row.reported && <Tag color="red">Reportó</Tag>}
                </Space>
            ) },
        { title: 'UA', dataIndex: 'uaFamily', key: 'uaFamily', width: 80 },
    ];

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <Text type="secondary">
                    Cada sesión es una visita anónima al visor. Se identifica por UUID en sessionStorage del navegador hasta cerrar la pestaña o pasar 4 horas.
                </Text>
                <Segmented
                    options={SOURCE_OPTIONS}
                    value={source}
                    onChange={(v) => { setSource(v); setPage(1); }}
                    size={isMobile ? 'small' : 'middle'}
                />
            </div>
            <Card size="small">
                <Table
                    rowKey="sessionId"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={data.items}
                    pagination={{
                        current: page,
                        pageSize,
                        total: data.total,
                        showSizeChanger: true,
                        pageSizeOptions: [25, 50, 100],
                        onChange: (p, s) => { setPage(p); setPageSize(s); },
                        showTotal: (total) => `${total} sesiones`,
                    }}
                    scroll={{ x: true }}
                />
            </Card>
        </Space>
    );
}
