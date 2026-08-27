import { useMemo, useState } from 'react';
import { Layout, Space, Tabs } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import PageHeading from '@shared/components/PageHeading';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/useAuth';
import ResumenSection from '@features/mapalab-stats/components/ResumenSection';
import SesionesSection from '@features/mapalab-stats/components/SesionesSection';
import McpSection from '@features/mapalab-stats/components/McpSection';
import PeriodSelector from '@features/mapalab-stats/components/PeriodSelector';

const { Content } = Layout;

const VALID_TABS = new Set(['resumen', 'sesiones', 'mcp']);

const unitOf = (grain) => (grain === 'day' ? 'day' : grain);

export default function MapalabStatsPage({ app = 'mapalab' }) {
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
            app,
            dateFrom: range[0].startOf(u).format('YYYY-MM-DD'),
            dateTo: range[1].endOf(u).format('YYYY-MM-DD'),
        };
    }, [grain, range, app]);

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
        <Content style={{ width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <PageHeading
                    icon={<EnvironmentOutlined />}
                    title="MapaLab — Estadísticas de uso"
                    description={`Telemetría anónima del visor. Datos del ${period.dateFrom} al ${period.dateTo}.`}
                    level={isMobile ? 4 : 3}
                    marginBottom={0}
                    extra={(
                        <PeriodSelector
                            grain={grain}
                            range={range}
                            onChange={handlePeriodChange}
                            size={isMobile ? 'small' : 'middle'}
                        />
                    )}
                />

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
