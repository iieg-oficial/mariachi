import { lazy, Suspense } from 'react';
import { Spin, Tabs } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import PageHeading from '@shared/components/PageHeading';
import useIsMobile from '@shared/hooks/useIsMobile';
import SieejStatsSection from '@features/telemetria/components/SieejStatsSection';
import UsoSection from '@features/telemetria/components/UsoSection';

const ColibriResumenPage = lazy(() => import('@features/colibri/pages/ResumenPage'));

const fallback = <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;

export default function TelemetriaPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { isMobile } = useIsMobile();
    const fuente = searchParams.get('fuente') || 'mapalab';

    const handleChange = (key) => {
        setSearchParams((prev) => {
            prev.set('fuente', key);
            return prev;
        }, { replace: true });
    };

    const items = [
        {
            key: 'mapalab',
            label: 'MapaLab',
            children: <UsoSection />,
        },
        {
            key: 'colibri',
            label: 'Colibrí',
            children: <Suspense fallback={fallback}><ColibriResumenPage /></Suspense>,
        },
        {
            key: 'sieej',
            label: 'SIEEJ',
            children: <SieejStatsSection />,
        },
    ];

    return (
        <div>
            <PageHeading
                icon={<BarChartOutlined />}
                title="Telemetría"
                description="Estadísticas de uso del ecosistema IIEG, agrupadas por plataforma."
                level={isMobile ? 3 : 2}
                marginBottom={0}
            />
            <Tabs
                activeKey={fuente}
                onChange={handleChange}
                items={items}
                destroyInactiveTabPane
                tabBarStyle={{ marginBottom: 0 }}
            />
        </div>
    );
}
