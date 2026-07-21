import { lazy, Suspense } from 'react';
import { Spin, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router';
import SieejStatsSection from '@features/telemetria/components/SieejStatsSection';
import UsoSection from '@features/telemetria/components/UsoSection';

const { Title, Text } = Typography;

const ColibriResumenPage = lazy(() => import('@features/colibri/pages/ResumenPage'));

const fallback = <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;

export default function TelemetriaPage() {
    const [searchParams, setSearchParams] = useSearchParams();
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
            label: 'Colibri',
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
            <div style={{ padding: '20px 24px 0' }}>
                <Title level={2} style={{ margin: 0 }}>Telemetría</Title>
                <Text type="secondary">
                    Estadísticas de uso del ecosistema IIEG, agrupadas por plataforma.
                </Text>
            </div>
            <Tabs
                activeKey={fuente}
                onChange={handleChange}
                items={items}
                destroyInactiveTabPane
                tabBarStyle={{ paddingInline: 24, marginBottom: 0 }}
            />
        </div>
    );
}
