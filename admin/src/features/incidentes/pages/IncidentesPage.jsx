import { useCallback, useEffect, useState } from 'react';
import {
    Button, Card, Collapse, Empty, Layout, Segmented, Space, Spin, Table, Tag, Tooltip, Typography,
} from 'antd';
import { AlertOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import useIsMobile from '@shared/hooks/useIsMobile';
import { getIncidentes } from '@features/incidentes/api/incidentesService';
import SerieGolpes from '@features/incidentes/components/SerieGolpes';
import DetalleGrupo from '@features/incidentes/components/DetalleGrupo';
import { COLUMNAS_GRUPOS, COLUMNAS_TOPES, claveGrupo } from '@features/incidentes/components/columnas';

const { Content } = Layout;
const { Title, Text } = Typography;

const REFRESH_MS = 30000;

const VENTANAS = [
    { label: '15 min', value: 15 },
    { label: '1 h', value: 60 },
    { label: '6 h', value: 360 },
    { label: '24 h', value: 1440 },
];

export default function IncidentesPage() {
    const { isMobile } = useIsMobile();
    const [minutos, setMinutos] = useState(60);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const cargar = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        try {
            setData(await getIncidentes(minutos));
            setError(false);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [minutos]);

    useEffect(() => {
        cargar();
        const id = setInterval(() => cargar(true), REFRESH_MS);
        return () => clearInterval(id);
    }, [cargar]);

    const enAlerta = data?.en_alerta ?? 0;
    const degradado = data?.estado_alerta === 'degraded';

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <Space align="center" size={12}>
                        <AlertOutlined style={{ fontSize: 24, color: '#5C2472' }} />
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Incidentes</Title>
                        <Tooltip title="Rechazos por rate limit (429) y sesiones cerradas por un refresco fallido. Las IP se guardan como huella, nunca en claro.">
                            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                        </Tooltip>
                    </Space>
                    <Space size={8} wrap>
                        <Segmented options={VENTANAS} value={minutos} onChange={setMinutos} shape="round" />
                        <Button shape="round" icon={<ReloadOutlined />} onClick={() => cargar()} loading={loading}>
                            {isMobile ? '' : 'Actualizar'}
                        </Button>
                    </Space>
                </div>

                {error && !data && <Empty description="No se pudieron leer los incidentes" />}

                {loading && !data && <div style={{ textAlign: 'center', padding: 64 }}><Spin size="large" /></div>}

                {data && (
                    <>
                        <Card size="small">
                            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                                <Space size={12} wrap>
                                    <Text>
                                        Últimos {data.ventana_alerta_minutos} min:{' '}
                                        <Text strong type={degradado ? 'warning' : undefined}>{enAlerta}</Text>
                                        <Text type="secondary"> / {data.umbral}</Text>
                                    </Text>
                                    <Tag color={degradado ? 'warning' : 'success'}>{degradado ? 'Degradado' : 'Normal'}</Tag>
                                    <Text type="secondary">
                                        {data.total}{data.truncado ? '+' : ''} en la ventana
                                    </Text>
                                </Space>
                                <SerieGolpes serie={data.serie} />
                            </Space>
                        </Card>

                        <Table
                            rowKey={claveGrupo}
                            size="small"
                            dataSource={data.grupos}
                            columns={COLUMNAS_GRUPOS}
                            scroll={{ x: 820 }}
                            pagination={{ pageSize: 20, hideOnSinglePage: true }}
                            expandable={{
                                expandedRowRender: (row) => <DetalleGrupo grupo={row} />,
                                expandRowByClick: true,
                            }}
                            locale={{ emptyText: <Empty description="Sin incidentes en la ventana" /> }}
                        />

                        <Collapse
                            size="small"
                            items={[{
                                key: 'topes',
                                label: `Topes configurados (${data.topes.length})`,
                                children: (
                                    <Table
                                        rowKey={(r) => `${r.tipo}|${r.scope}`}
                                        size="small"
                                        dataSource={data.topes}
                                        columns={COLUMNAS_TOPES}
                                        pagination={false}
                                    />
                                ),
                            }]}
                        />
                    </>
                )}
            </Space>
        </Content>
    );
}
