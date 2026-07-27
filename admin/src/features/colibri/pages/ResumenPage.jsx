import { useState } from 'react';
import {
    Alert,
    Card,
    Col,
    Empty,
    Layout,
    List,
    Progress,
    Row,
    Segmented,
    Space,
    Spin,
    Statistic,
    Tag,
    Typography,
} from 'antd';
import { useNavigate } from 'react-router';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useColibriStats } from '@features/colibri/hooks/useColibriStats';
import useIsMobile from '@shared/hooks/useIsMobile';
import ColibriIcon from '@shared/components/ColibriIcon';
import PageHeading from '@shared/components/PageHeading';
import { ESTADO_COLORS, ESTADO_LABELS } from '@features/colibri/constants';

const { Content } = Layout;
const { Title, Text } = Typography;

const WINDOW_OPTIONS = [
    { value: 7, label: '7 días' },
    { value: 30, label: '30 días' },
    { value: 90, label: '90 días' },
    { value: 365, label: '1 año' },
];


function DailyBars({ data }) {
    if (!data || data.length === 0) {
        return <Empty description="Sin reportes en la ventana seleccionada" />;
    }
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, paddingTop: 8 }}>
            {data.map((d) => {
                const heightPct = (d.count / max) * 100;
                return (
                    <div
                        key={d.fecha}
                        title={`${d.fecha}: ${d.count} reporte(s)`}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4, minWidth: 4 }}
                    >
                        <div
                            style={{
                                width: '100%',
                                background: '#1677ff',
                                borderRadius: 2,
                                height: `${heightPct}%`,
                                minHeight: d.count > 0 ? 2 : 0,
                                transition: 'height 0.3s',
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}


export default function ResumenPage() {
    const { isMobile } = useIsMobile();
    const navigate = useNavigate();
    const [days, setDays] = useState(30);
    const { stats, loading, error } = useColibriStats({ days });

    if (loading || !stats) {
        return (
            <Content style={{ padding: 24, textAlign: 'center' }}>
                {error ? <Alert type="error" message={error} showIcon /> : <Spin size="large" />}
            </Content>
        );
    }

    const maxTipoCount = Math.max(...(stats.porTipo || []).map((t) => t.count), 1);
    const maxAppCount = Math.max(...(stats.porApp || []).map((a) => a.count), 1);

    return (
        <Content style={{ width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <PageHeading
                    icon={<ColibriIcon size={24} />}
                    title="Colibrí"
                    description="Centraliza reportes y sugerencias del ecosistema IIEG."
                    level={isMobile ? 4 : 3}
                    marginBottom={0}
                    extra={(
                        <Segmented
                            options={WINDOW_OPTIONS}
                            value={days}
                            onChange={setDays}
                            size={isMobile ? 'small' : 'middle'}
                        />
                    )}
                />

                <Row gutter={[16, 16]}>
                    <Col xs={12} md={6}>
                        <Card hoverable onClick={() => navigate('/colibri/reportes')}>
                            <Statistic
                                title="Pendientes"
                                value={stats.pendientes}
                                suffix={<Text type="secondary" style={{ fontSize: 12 }}>nuevo + en revisión</Text>}
                                valueStyle={{ color: '#cf1322' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic
                                title="Total reportes"
                                value={stats.total}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic
                                title="% Resueltos"
                                value={stats.porcentajeResueltos}
                                suffix="%"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card>
                            <Statistic
                                title="Tiempo prom. resolución"
                                value={stats.tiempoResolucionPromedioHoras ?? '—'}
                                suffix={stats.tiempoResolucionPromedioHoras != null ? 'h' : null}
                                valueStyle={{ fontSize: 22 }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card title={`Reportes por día (últimos ${days} días)`} size="small">
                    <DailyBars data={stats.porDia || []} />
                </Card>

                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Card title="Por estado" size="small">
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                {Object.entries(stats.porEstado).map(([estado, count]) => {
                                    const max = Math.max(...Object.values(stats.porEstado), 1);
                                    const pct = stats.total ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={estado}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Tag color={ESTADO_COLORS[estado]}>{ESTADO_LABELS[estado]}</Tag>
                                                <Text>{count} <Text type="secondary" style={{ fontSize: 11 }}>({pct.toFixed(1)}%)</Text></Text>
                                            </div>
                                            <Progress
                                                percent={(count / max) * 100}
                                                showInfo={false}
                                                strokeColor="#1677ff"
                                                size="small"
                                            />
                                        </div>
                                    );
                                })}
                            </Space>
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card title="Por tipo" size="small">
                            {(stats.porTipo || []).length === 0 ? (
                                <Empty description="Sin datos" />
                            ) : (
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {stats.porTipo.map((t) => (
                                        <div key={t.slug}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Tag color={t.color}>{t.label}</Tag>
                                                <Text>{t.count}</Text>
                                            </div>
                                            <Progress
                                                percent={(t.count / maxTipoCount) * 100}
                                                showInfo={false}
                                                strokeColor={t.color === 'default' ? '#999' : undefined}
                                                size="small"
                                            />
                                        </div>
                                    ))}
                                </Space>
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card title="Por aplicación" size="small">
                            {(stats.porApp || []).length === 0 ? (
                                <Empty description="Sin datos" />
                            ) : (
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {stats.porApp.map((a) => (
                                        <div key={a.sourceApp}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text strong>{a.sourceApp}</Text>
                                                <Text>{a.count}</Text>
                                            </div>
                                            <Progress
                                                percent={(a.count / maxAppCount) * 100}
                                                showInfo={false}
                                                size="small"
                                            />
                                        </div>
                                    ))}
                                </Space>
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} md={12}>
                        <Card title="Por dirección asignada" size="small">
                            {(stats.porDireccion || []).length === 0 && stats.sinDireccionCount === 0 ? (
                                <Empty description="Sin direcciones registradas" />
                            ) : (
                                <List
                                    size="small"
                                    dataSource={[
                                        ...stats.porDireccion,
                                        ...(stats.sinDireccionCount > 0
                                            ? [{ id: null, nombre: 'Sin asignar', siglas: null, count: stats.sinDireccionCount }]
                                            : []),
                                    ]}
                                    renderItem={(d) => (
                                        <List.Item key={d.id ?? 'none'} extra={<Text strong>{d.count}</Text>}>
                                            <Space>
                                                <Text>{d.nombre}</Text>
                                                {d.siglas && <Text type="secondary" code style={{ fontSize: 11 }}>{d.siglas}</Text>}
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>
                </Row>

                <Card title="Top rutas con más reportes" size="small">
                    {(stats.topRutas || []).length === 0 ? (
                        <Empty description="Sin rutas registradas" />
                    ) : (
                        <List
                            size="small"
                            dataSource={stats.topRutas}
                            renderItem={(r) => (
                                <List.Item
                                    key={r.sourceRoute}
                                    extra={<Text strong>{r.count}</Text>}
                                    actions={[
                                        <a
                                            key="abrir"
                                            href={r.sourceRoute}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ArrowRightOutlined />
                                        </a>,
                                    ]}
                                >
                                    <Text code ellipsis style={{ maxWidth: '100%', display: 'block' }}>
                                        {r.sourceRoute}
                                    </Text>
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </Space>
        </Content>
    );
}
