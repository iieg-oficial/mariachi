import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card, Space, Spin, Statistic, Tooltip, Typography } from 'antd';
import {
    BarChartOutlined,
    PartitionOutlined,
    ToolOutlined,
    ClockCircleOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { getHighlights } from '@features/mapalab-stats/api/mapalabStatsService';

const { Text } = Typography;

const TOOL_NICE_NAMES = {
    LineString: 'Línea',
    Polygon: 'Polígono',
    Freehand: 'Mano alzada',
    Select: 'Selección',
    Circle: 'Círculo',
    Text: 'Texto',
    Emoji: 'Símbolo',
    Texto: 'Texto',
    Linea: 'Línea',
    Poligono: 'Polígono',
    ManoAlzada: 'Mano alzada',
    Seleccion: 'Selección',
    Circulo: 'Círculo',
    unknown: '—',
};

const formatDuration = (seconds) => {
    if (!seconds || seconds < 1) return '—';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
};

const KpiCard = ({ icon, title, value, subtitle, color }) => (
    <Card size="small" hoverable styles={{ body: { padding: 16 } }}>
        <Space align="start" size={12}>
            <span style={{ fontSize: 22, color: color || '#5C2472' }}>{icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
                <Statistic value={value} valueStyle={{ fontSize: 22, color: color || undefined, lineHeight: 1.2 }} />
                {subtitle && (
                    <Tooltip title={subtitle}>
                        <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180, display: 'inline-block' }}>
                            {subtitle}
                        </Text>
                    </Tooltip>
                )}
            </div>
        </Space>
    </Card>
);

export default function InicioHighlights() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getHighlights()
            .then((res) => { if (!cancelled) setData(res); })
            .catch(() => { if (!cancelled) setData(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const cards = (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
        }}>
            <KpiCard
                icon={<UserOutlined />}
                title="Sesiones (30 días)"
                value={data?.sessions30d ?? 0}
            />
            <KpiCard
                icon={<ClockCircleOutlined />}
                title="Duración media"
                value={formatDuration(data?.avgDurationSec)}
                color="#FF8300"
            />
            <KpiCard
                icon={<PartitionOutlined />}
                title="Capa más usada"
                value={data?.topLayer?.activations ?? 0}
                subtitle={data?.topLayer?.label || data?.topLayer?.layerId || '—'}
            />
            <KpiCard
                icon={<ToolOutlined />}
                title="Herramienta más usada"
                value={data?.topTool?.uses ?? 0}
                subtitle={TOOL_NICE_NAMES[data?.topTool?.tool] || data?.topTool?.tool || '—'}
                color="#5C2472"
            />
        </div>
    );

    return (
        <div>
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChartOutlined style={{ fontSize: 20, color: '#5C2472' }} />
                    <Text strong style={{ fontSize: 18 }}>MapaLab — Uso</Text>
                </div>
                <Link to="/mapalab/stats">
                    <Text type="secondary" style={{ fontSize: 12 }}>Ver detalle →</Text>
                </Link>
            </Space>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : cards}
        </div>
    );
}
