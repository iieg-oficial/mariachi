import { Layout, Space, Tabs, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/useAuth';
import ResumenSection from '@features/mapalab-stats/components/ResumenSection';
import SesionesSection from '@features/mapalab-stats/components/SesionesSection';

const { Content } = Layout;
const { Title, Text } = Typography;

const VALID_TABS = new Set(['resumen', 'sesiones']);

export default function MapalabStatsPage() {
    const { isMobile } = useIsMobile();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = user?.role === 'tetlamamakani';

    const tabFromUrl = searchParams.get('tab');
    const requestedTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'resumen';
    const activeTab = requestedTab === 'sesiones' && !isAdmin ? 'resumen' : requestedTab;

    const handleTabChange = (key) => {
        setSearchParams({ tab: key }, { replace: true });
    };

    const items = [
        {
            key: 'resumen',
            label: 'Resumen',
            children: <ResumenSection canRefresh={isAdmin} />,
        },
    ];
    if (isAdmin) {
        items.push({
            key: 'sesiones',
            label: 'Sesiones',
            children: <SesionesSection isMobile={isMobile} />,
        });
    }

    return (
        <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Space align="center" size={12}>
                        <EnvironmentOutlined style={{ fontSize: 24, color: '#5C2472' }} />
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>MapaLab — Estadísticas de uso</Title>
                    </Space>
                    <Text type="secondary">
                        Telemetría anónima del visor. Datos agregados de los últimos 30 días.
                    </Text>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    items={items}
                    destroyInactiveTabPane
                />
            </Space>
        </Content>
    );
}
