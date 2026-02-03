import { useState } from 'react';
import {
    Card,
    Row,
    Col,
    Statistic,
    Typography,
    Space,
    Select,
    Table,
    Progress,
    Tag,
    Alert,
    Divider,
    Button,
    DatePicker
} from 'antd';
import {
    LineChartOutlined,
    EyeOutlined,
    UserOutlined,
    GlobalOutlined,
    RiseOutlined,
    FallOutlined,
    MobileOutlined,
    DesktopOutlined,
    TabletOutlined,
    ReloadOutlined,
    DownloadOutlined,
    FireOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function Analytics() {
    const [timeRange, setTimeRange] = useState('7d');
    const [loading, setLoading] = useState(false);

    const overallStats = {
        totalVisits: 48532,
        visitsTrend: 12.5,
        pageViews: 126789,
        pageViewsTrend: 8.3,
        avgSessionDuration: '3:24',
        sessionTrend: -2.1,
        bounceRate: 42.8,
        bounceTrend: -5.2
    };

    const topPages = [
        { page: '/inicio', title: 'Página Principal', visits: 12450, pageviews: 18920, avgTime: '2:45', bounceRate: 35.2 },
        { page: '/servicios', title: 'Servicios', visits: 8920, pageviews: 14230, avgTime: '4:12', bounceRate: 28.6 },
        { page: '/nosotros', title: 'Acerca de Nosotros', visits: 6450, pageviews: 8790, avgTime: '3:08', bounceRate: 48.3 },
        { page: '/contacto', title: 'Contacto', visits: 5230, pageviews: 6120, avgTime: '1:52', bounceRate: 52.1 },
        { page: '/blog/novedades-2024', title: 'Blog: Novedades 2024', visits: 4820, pageviews: 7340, avgTime: '5:34', bounceRate: 22.4 }
    ];

    const trafficSources = [
        { source: 'Orgánico (Google)', visits: 24560, percentage: 50.6, color: '#52c41a' },
        { source: 'Directo', visits: 12230, percentage: 25.2, color: '#1890ff' },
        { source: 'Redes Sociales', visits: 7450, percentage: 15.3, color: '#722ed1' },
        { source: 'Referidos', visits: 3120, percentage: 6.4, color: '#fa8c16' },
        { source: 'Email', visits: 1172, percentage: 2.4, color: '#13c2c2' }
    ];

    const deviceBreakdown = [
        { device: 'Desktop', visits: 28120, percentage: 57.9, icon: <DesktopOutlined /> },
        { device: 'Mobile', visits: 16890, percentage: 34.8, icon: <MobileOutlined /> },
        { device: 'Tablet', visits: 3522, percentage: 7.3, icon: <TabletOutlined /> }
    ];

    const topCountries = [
        { country: 'México', visits: 42120, percentage: 86.8 },
        { country: 'Estados Unidos', visits: 3450, percentage: 7.1 },
        { country: 'España', visits: 1230, percentage: 2.5 },
        { country: 'Colombia', visits: 890, percentage: 1.8 },
        { country: 'Argentina', visits: 842, percentage: 1.7 }
    ];

    const realtimeData = {
        activeUsers: 127,
        activePages: [
            { page: '/inicio', users: 45 },
            { page: '/servicios', users: 32 },
            { page: '/blog/novedades-2024', users: 18 },
            { page: '/contacto', users: 15 },
            { page: '/nosotros', users: 17 }
        ]
    };

    const seoMetrics = {
        avgPosition: 8.4,
        positionTrend: -1.2,
        impressions: 156789,
        impressionsTrend: 15.3,
        clicks: 12450,
        clicksTrend: 18.7,
        ctr: 7.9,
        ctrTrend: 2.1
    };

    const topPagesColumns = [
        {
            title: 'Página',
            dataIndex: 'page',
            key: 'page',
            width: '30%',
            render: (page, record) => (
                <Space orientation="vertical" size="small">
                    <Text strong>{record.title}</Text>
                    <Text code type="secondary" style={{ fontSize: 11 }}>
                        {page}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Visitas',
            dataIndex: 'visits',
            key: 'visits',
            width: '15%',
            render: (visits) => (
                <Statistic value={visits} valueStyle={{ fontSize: 14 }} />
            ),
            sorter: (a, b) => a.visits - b.visits,
            defaultSortOrder: 'descend'
        },
        {
            title: 'Páginas Vistas',
            dataIndex: 'pageviews',
            key: 'pageviews',
            width: '15%',
            render: (pageviews) => (
                <Statistic value={pageviews} valueStyle={{ fontSize: 14 }} />
            )
        },
        {
            title: 'Tiempo Promedio',
            dataIndex: 'avgTime',
            key: 'avgTime',
            width: '15%'
        },
        {
            title: 'Tasa de Rebote',
            dataIndex: 'bounceRate',
            key: 'bounceRate',
            width: '15%',
            render: (rate) => (
                <Space>
                    <Text>{rate}%</Text>
                    <Progress
                        percent={rate}
                        size="small"
                        showInfo={false}
                        strokeColor={rate > 50 ? '#ff4d4f' : rate > 40 ? '#faad14' : '#52c41a'}
                    />
                </Space>
            )
        }
    ];

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    };

    return (
        <div>
            <Card>
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            <LineChartOutlined /> Analytics Dashboard
                        </Title>
                        <Space>
                            <Select
                                value={timeRange}
                                onChange={setTimeRange}
                                style={{ width: 150 }}
                            >
                                <Select.Option value="24h">Últimas 24h</Select.Option>
                                <Select.Option value="7d">Últimos 7 días</Select.Option>
                                <Select.Option value="30d">Últimos 30 días</Select.Option>
                                <Select.Option value="90d">Últimos 90 días</Select.Option>
                                <Select.Option value="custom">Personalizado</Select.Option>
                            </Select>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleRefresh}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                            >
                                Exportar
                            </Button>
                        </Space>
                    </div>

                    <Alert
                        message="Panel de Análisis"
                        description="Visualiza las métricas clave de tu sitio web. Los datos se actualizan cada hora."
                        type="info"
                        showIcon
                    />

                    <Row gutter={16}>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Visitas Totales"
                                    value={overallStats.totalVisits}
                                    prefix={<UserOutlined />}
                                    suffix={
                                        <Tag color={overallStats.visitsTrend > 0 ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                                            {overallStats.visitsTrend > 0 ? <RiseOutlined /> : <FallOutlined />}
                                            {Math.abs(overallStats.visitsTrend)}%
                                        </Tag>
                                    }
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Páginas Vistas"
                                    value={overallStats.pageViews}
                                    prefix={<EyeOutlined />}
                                    suffix={
                                        <Tag color={overallStats.pageViewsTrend > 0 ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                                            {overallStats.pageViewsTrend > 0 ? <RiseOutlined /> : <FallOutlined />}
                                            {Math.abs(overallStats.pageViewsTrend)}%
                                        </Tag>
                                    }
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Duración Promedio"
                                    value={overallStats.avgSessionDuration}
                                    suffix={
                                        <Tag color={overallStats.sessionTrend > 0 ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                                            {overallStats.sessionTrend > 0 ? <RiseOutlined /> : <FallOutlined />}
                                            {Math.abs(overallStats.sessionTrend)}%
                                        </Tag>
                                    }
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Tasa de Rebote"
                                    value={overallStats.bounceRate}
                                    suffix="%"
                                    valueStyle={{ color: overallStats.bounceRate > 50 ? '#ff4d4f' : '#52c41a' }}
                                    prefix={
                                        <Tag color={overallStats.bounceTrend < 0 ? 'success' : 'error'} style={{ marginRight: 8 }}>
                                            {overallStats.bounceTrend < 0 ? <FallOutlined /> : <RiseOutlined />}
                                            {Math.abs(overallStats.bounceTrend)}%
                                        </Tag>
                                    }
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Card
                        title={
                            <Space>
                                <FireOutlined style={{ color: '#ff4d4f' }} />
                                <Text strong>Usuarios en Tiempo Real</Text>
                            </Space>
                        }
                    >
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Usuarios Activos"
                                    value={realtimeData.activeUsers}
                                    valueStyle={{ color: '#ff4d4f', fontSize: 32 }}
                                    prefix={<UserOutlined />}
                                />
                            </Col>
                            <Col span={18}>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                    Páginas más visitadas ahora:
                                </Text>
                                <Space wrap>
                                    {realtimeData.activePages.map((page, index) => (
                                        <Tag key={index} color="blue">
                                            {page.page}: {page.users} usuarios
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                    </Card>

                    <Card
                        title={
                            <Space>
                                <GlobalOutlined style={{ color: '#1890ff' }} />
                                <Text strong>Métricas SEO (Google Search Console)</Text>
                            </Space>
                        }
                    >
                        <Row gutter={16}>
                            <Col span={6}>
                                <Statistic
                                    title="Posición Promedio"
                                    value={seoMetrics.avgPosition}
                                    precision={1}
                                    valueStyle={{ color: seoMetrics.positionTrend < 0 ? '#52c41a' : '#ff4d4f' }}
                                    suffix={
                                        <Tag color={seoMetrics.positionTrend < 0 ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                                            {seoMetrics.positionTrend < 0 ? <FallOutlined /> : <RiseOutlined />}
                                            {Math.abs(seoMetrics.positionTrend)}
                                        </Tag>
                                    }
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Impresiones"
                                    value={seoMetrics.impressions}
                                    suffix={
                                        <Tag color="success" style={{ marginLeft: 8 }}>
                                            <RiseOutlined /> {seoMetrics.impressionsTrend}%
                                        </Tag>
                                    }
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="Clics"
                                    value={seoMetrics.clicks}
                                    suffix={
                                        <Tag color="success" style={{ marginLeft: 8 }}>
                                            <RiseOutlined /> {seoMetrics.clicksTrend}%
                                        </Tag>
                                    }
                                />
                            </Col>
                            <Col span={6}>
                                <Statistic
                                    title="CTR"
                                    value={seoMetrics.ctr}
                                    suffix="%"
                                    precision={1}
                                    valueStyle={{ color: '#52c41a' }}
                                    prefix={
                                        <Tag color="success" style={{ marginRight: 8 }}>
                                            <RiseOutlined /> {seoMetrics.ctrTrend}%
                                        </Tag>
                                    }
                                />
                            </Col>
                        </Row>
                    </Card>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Card title="Fuentes de Tráfico">
                                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                                    {trafficSources.map((source, index) => (
                                        <div key={index}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text>{source.source}</Text>
                                                <Text strong>{source.visits.toLocaleString()} ({source.percentage}%)</Text>
                                            </div>
                                            <Progress
                                                percent={source.percentage}
                                                strokeColor={source.color}
                                                showInfo={false}
                                            />
                                        </div>
                                    ))}
                                </Space>
                            </Card>
                        </Col>

                        <Col span={12}>
                            <Card title="Dispositivos">
                                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                                    {deviceBreakdown.map((device, index) => (
                                        <div key={index}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Space>
                                                    {device.icon}
                                                    <Text>{device.device}</Text>
                                                </Space>
                                                <Text strong>{device.visits.toLocaleString()} ({device.percentage}%)</Text>
                                            </div>
                                            <Progress
                                                percent={device.percentage}
                                                strokeColor="#1890ff"
                                                showInfo={false}
                                            />
                                        </div>
                                    ))}
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    <Card title="Ubicación Geográfica - Top Países">
                        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                            {topCountries.map((country, index) => (
                                <div key={index}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text>{country.country}</Text>
                                        <Text strong>{country.visits.toLocaleString()} ({country.percentage}%)</Text>
                                    </div>
                                    <Progress
                                        percent={country.percentage}
                                        strokeColor="#52c41a"
                                        showInfo={false}
                                    />
                                </div>
                            ))}
                        </Space>
                    </Card>

                    <Divider />

                    <Card title="Páginas Más Visitadas">
                        <Table
                            columns={topPagesColumns}
                            dataSource={topPages}
                            rowKey="page"
                            pagination={false}
                        />
                    </Card>

                    <Alert
                        message="Integración con Google Analytics"
                        description="Para ver datos reales, conecta tu cuenta de Google Analytics 4 en la configuración del sistema."
                        type="warning"
                        showIcon
                    />
                </Space>
            </Card>
        </div>
    );
}
