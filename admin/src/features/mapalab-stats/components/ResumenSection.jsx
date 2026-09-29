import { useState } from 'react';
import { Alert, Button, Col, Row, Space, Spin, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
    useButtonStats,
    useDailyStats,
    useEventoStats,
    useMapalabOverview,
    useThemeStats,
    useToolStats,
    useTopLayers,
} from '@features/mapalab-stats/hooks/useMapalabStats';
import { refreshStats } from '@features/mapalab-stats/api/mapalabStatsService';
import StatCard from '@features/mapalab-stats/components/StatCard';
import TopLayersTable from '@features/mapalab-stats/components/TopLayersTable';
import EventosTable from '@features/mapalab-stats/components/EventosTable';
import ThemesTable from '@features/mapalab-stats/components/ThemesTable';
import ButtonsBar from '@features/mapalab-stats/components/ButtonsBar';
import ToolsBar from '@features/mapalab-stats/components/ToolsBar';
import DailyChart from '@features/mapalab-stats/components/DailyChart';

const pct = (part, total) => (total ? Math.round((part / total) * 100) : 0);

export default function ResumenSection({ period, canRefresh = false }) {
    const { overview, loading: loadingOverview, error: errorOverview, reload: reloadOverview } = useMapalabOverview(period);
    const { rows: topLayers, loading: loadingLayers, reload: reloadLayers } = useTopLayers({ limit: 20, period });
    const { rows: eventoRows, loading: loadingEventos, reload: reloadEventos } = useEventoStats({ limit: 50, period });
    const { rows: themeRows, loading: loadingThemes, reload: reloadThemes } = useThemeStats({ limit: 50, period });
    const { rows: buttonRows, loading: loadingButtons, reload: reloadButtons } = useButtonStats(period);
    const { rows: toolRows, loading: loadingTools, reload: reloadTools } = useToolStats(period);
    const { rows: dailyRows, loading: loadingDaily, reload: reloadDaily } = useDailyStats(period);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshStats();
            await Promise.all([
                reloadOverview(),
                reloadLayers(),
                reloadEventos(),
                reloadThemes(),
                reloadButtons(),
                reloadTools(),
                reloadDaily(),
            ]);
            message.success('Estadísticas actualizadas');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron refrescar las estadísticas');
        } finally {
            setRefreshing(false);
        }
    };

    if (loadingOverview && !overview) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                {errorOverview ? <Alert type="error" title={errorOverview} showIcon /> : <Spin size="large" />}
            </div>
        );
    }

    const sessions = overview?.sessions ?? 0;
    const swipePercent = pct(overview?.swipeSessions ?? 0, sessions);
    const drawingPercent = pct(overview?.drawingSessions ?? 0, sessions);
    const downloadPercent = pct(overview?.downloadSessions ?? 0, sessions);
    const sharePercent = pct(overview?.shareSessions ?? 0, sessions);

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {canRefresh && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
                        Refrescar estadísticas
                    </Button>
                </div>
            )}

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}><StatCard title="Sesiones" value={sessions.toLocaleString()} /></Col>
                <Col xs={12} md={6}><StatCard title="Eventos" value={(overview?.events ?? 0).toLocaleString()} /></Col>
                <Col xs={12} md={6}>
                    <StatCard title="Duración media" value={overview?.avgDurationSec ?? 0} format="duration" hint="Por sesión" />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard
                        title="Usaron swipe"
                        value={swipePercent}
                        format="percent"
                        hint={`${overview?.swipeSessions ?? 0} de ${sessions} sesiones`}
                        color="#FF8300"
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <StatCard title="Dibujaron" value={drawingPercent} format="percent" hint={`${overview?.drawingSessions ?? 0} sesiones`} />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard title="Descargaron" value={downloadPercent} format="percent" hint={`${overview?.downloadSessions ?? 0} sesiones`} />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard title="Compartieron" value={sharePercent} format="percent" hint={`${overview?.shareSessions ?? 0} sesiones`} />
                </Col>
                <Col xs={12} md={6}>
                    <StatCard title="Reportaron" value={overview?.reportedSessions ?? 0} hint="Sesiones que abrieron Colibrí" />
                </Col>
            </Row>

            <DailyChart rows={dailyRows} loading={loadingDaily} grain={period?.grain} />

            <EventosTable rows={eventoRows} loading={loadingEventos} />

            <ThemesTable rows={themeRows} loading={loadingThemes} />

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
