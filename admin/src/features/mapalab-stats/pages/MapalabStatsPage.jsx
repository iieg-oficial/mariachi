import { useMemo, useState } from 'react';
import { Layout, Space, Tabs, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/useAuth';
import ResumenSection from '@features/mapalab-stats/components/ResumenSection';
import SesionesSection from '@features/mapalab-stats/components/SesionesSection';
import McpSection from '@features/mapalab-stats/components/McpSection';
import PeriodSelector from '@features/mapalab-stats/components/PeriodSelector';

const { Content } = Layout;
const { Title, Text } = Typography;

const VALID_TABS = new Set(['resumen', 'sesiones', 'mcp']);

const unitOf = (grain) => (grain === 'day' ? 'day' : grain);

export default function MapalabStatsPage() {
    const { isMobile } = useIsMobile();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const isAdmin = user?.role === 'tetlamamakani';

    const [grain, setGrain] = useState('day');
    const [range, setRange] = useState([dayjs().subtract(29, 'day'), dayjs()]);

    const period = useMemo(() => {
        const u = unitOf(grain);
        return {
            grain,
            dateFrom: range[0].startOf(u).format('YYYY-MM-DD'),
            dateTo: range[1].endOf(u).format('YYYY-MM-DD'),
        };
    }, [grain, range]);

    const handlePeriodChange = ({ grain: g, range: r }) => {
        setGrain(g);
        setRange(r);
    };

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
            children: <ResumenSection period={period} canRefresh={isAdmin} />,
        },
        {
            key: 'mcp',
            label: 'MCP',
            children: <McpSection period={period} />,
        },
    ];
    if (isAdmin) {
        items.push({
            key: 'sesiones',
            label: 'Sesiones',
            children: <SesionesSection period={period} isMobile={isMobile} />,
        });
    }

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <Space align="center" size={12}>
                            <EnvironmentOutlined style={{ fontSize: 24, color: '#5C2472' }} />
                            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>MapaLab — Estadísticas de uso</Title>
                        </Space>
                        <Text type="secondary">
                            Telemetría anónima del visor. Datos del {period.dateFrom} al {period.dateTo}.
                        </Text>
                    </div>
                    <PeriodSelector
                        grain={grain}
                        range={range}
                        onChange={handlePeriodChange}
                        size={isMobile ? 'small' : 'middle'}
                    />
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
