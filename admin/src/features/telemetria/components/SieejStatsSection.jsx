import { useEffect, useState } from 'react';
import { Card, Col, Empty, Row, Spin, Statistic } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import useIsMobile from '@shared/hooks/useIsMobile';
import { getSieejStats } from '@features/telemetria/api/sieejStatsService';

const CARDS = [
    { key: 'dependencias_total', label: 'Dependencias' },
    { key: 'formularios_activos', label: 'Formularios activos' },
    { key: 'envios_total', label: 'Envíos totales' },
    { key: 'envios_enviados', label: 'Enviados' },
    { key: 'envios_en_proceso', label: 'En proceso' },
    { key: 'envios_expirados', label: 'Expirados' },
    { key: 'usuarios_con_envio', label: 'Usuarios con envío' },
    { key: 'archivos_total', label: 'Archivos' },
];

export default function SieejStatsSection() {
    const { isMobile } = useIsMobile();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getSieejStats()
            .then((data) => { if (!cancelled) setStats(data); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <PageHeading
                icon={<FormOutlined />}
                title="SIEEJ"
                description="Formularios, envíos y archivos del sistema SIEEJ."
                level={isMobile ? 4 : 3}
            />
            {loading ? (
                <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
            ) : error || !stats ? (
                <Empty description="No se pudieron cargar las estadísticas de SIEEJ" style={{ padding: 48 }} />
            ) : (
                <Row gutter={[16, 16]}>
                    {CARDS.map((c) => (
                        <Col key={c.key} xs={12} sm={8} md={6}>
                            <Card size="small">
                                <Statistic title={c.label} value={stats[c.key] ?? 0} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}
