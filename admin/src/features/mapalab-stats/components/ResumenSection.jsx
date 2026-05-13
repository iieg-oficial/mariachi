import { useState } from 'react';
import { Alert, Button, Col, Row, Space, Spin, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
    useButtonStats,
    useDailyStats,
    useMapalabOverview,
    useToolStats,
    useTopLayers,
} from '@features/mapalab-stats/hooks/useMapalabStats';
import { refreshStats } from '@features/mapalab-stats/api/mapalabStatsService';
import StatCard from '@features/mapalab-stats/components/StatCard';
import TopLayersTable from '@features/mapalab-stats/components/TopLayersTable';
import ButtonsBar from '@features/mapalab-stats/components/ButtonsBar';
import ToolsBar from '@features/mapalab-stats/components/ToolsBar';
import DailyChart from '@features/mapalab-stats/components/DailyChart';

export default function ResumenSection({ canRefresh = false }) {
    const { overview, loading: loadingOverview, error: errorOverview, reload: reloadOverview } = useMapalabOverview();
    const { rows: topLayers, loading: loadingLayers, reload: reloadLayers } = useTopLayers({ limit: 20 });
    const { rows: buttonRows, loading: loadingButtons, reload: reloadButtons } = useButtonStats();
    const { rows: toolRows, loading: loadingTools, reload: reloadTools } = useToolStats();
    const { rows: dailyRows, loading: loadingDaily, reload: reloadDaily } = useDailyStats({ days: 30 });
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshStats();
            await Promise.all([
                reloadOverview(),
                reloadLayers(),
                reloadButtons(),
                reloadTools(),
                reloadDaily(),
            ]);
            message.success('Estadísticas actualizadas');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron refrescar las vistas');
        } finally {
            setRefreshing(false);
        }
    };

    if (loadingOverview && !overview) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                {errorOverview ? <Alert type="error" message={errorOverview} showIcon /> : <Spin size="large" />}
            </div>
        );
    }

    const swipePercent = overview?.sessions30d
        ? Math.round((overview.swipeSessions30d / overview.sessions30d) * 100)
        : 0;
    const downloadPercent = overview?.sessions30d
        ? Math.round((overview.downloadSessions30d / overview.sessions30d) * 100)
        : 0;
    const sharePercent = overview?.sessions30d
        ? Math.round((overview.shareSessions30d / overview.sessions30d) * 100)
        : 0;

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {canRefresh && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
                        Refrescar vistas
                    </Button>
                </div>
            )}

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}><StatCard title="Sesiones 30d" value={overview?.sessions30d ?? 0} /></Col>
                <Col xs={12} md={6}><StatCard title="Sesiones 7d" value={overview?.sessions7d ?? 0} /></Col>
                <Col xs={12} md={6}><StatCard title="Sesiones hoy" value={overview?.sessions1d ?? 0} color="#3f8600" /></Col>
                <Col xs={12} md={6}><StatCard title="Eventos 30d" value={(overview?.events30d ?? 0).toLocaleString()} /></Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Duración media"
                        value={overview?.avgDurationSec ?? 0}
                        format="duration"
                        hint="Por sesión, últimos 30 días"
                    />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Usaron swipe"
                        value={swipePercent}
                        format="percent"
                        hint={`${overview?.swipeSessions30d ?? 0} de ${overview?.sessions30d ?? 0} sesiones`}
                        color="#FF8300"
                    />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Descargaron"
                        value={downloadPercent}
                        format="percent"
                        hint={`${overview?.downloadSessions30d ?? 0} sesiones`}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Compartieron"
                        value={sharePercent}
                        format="percent"
                        hint={`${overview?.shareSessions30d ?? 0} sesiones`}
                    />
                </Col>
            </Row>

            <DailyChart rows={dailyRows} loading={loadingDaily} />

            <TopLayersTable rows={topLayers} loading={loadingLayers} />

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <ButtonsBar rows={buttonRows} loading={loadingButtons} />
                </Col>
                <Col xs={24} lg={10}>
                    <ToolsBar rows={toolRows} loading={loadingTools} />
                </Col>
            </Row>
        </Space>
    );
}
