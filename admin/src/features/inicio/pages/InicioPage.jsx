import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Layout, Card, Typography, Space, Button, Alert } from 'antd';
import { AuditOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import PageHeading from '@shared/components/PageHeading';
import {
    getMisBorradores,
    getBorradoresPendientes,
    getPlataformas,
    getColibriConfig,
} from '@features/inicio/api/inicioService';
import EcosistemaTablero from '@features/inicio/components/EcosistemaTablero';
import { MapalabInicioHighlights } from '@features/mapalab-stats';

const COLIBRI_WIDGET_URL = '/colibri/widget/colibri-widget.v1.js';

const { Content } = Layout;
const { Text } = Typography;

export default function InicioPage() {
    const { user } = useAuth();
    const [misBorradores, setMisBorradores] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [plataformas, setPlataformas] = useState([]);
    const [colibriConfig, setColibriConfig] = useState(null);
    const [loadingPlataformas, setLoadingPlataformas] = useState(true);
    const isAdmin = user?.role === 'tetlamamakani';

    useEffect(() => {
        let cancelled = false;
        const tasks = [getMisBorradores()];
        if (isAdmin) tasks.push(getBorradoresPendientes());

        Promise.all(tasks)
            .then(([mios, pend]) => {
                if (cancelled) return;
                setMisBorradores(mios);
                if (pend) setPendientes(pend);
            })
            .catch(() => {});

        return () => { cancelled = true; };
    }, [isAdmin]);

    useEffect(() => {
        let cancelled = false;
        getPlataformas()
            .then((data) => { if (!cancelled) setPlataformas(data); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoadingPlataformas(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        getColibriConfig()
            .then((data) => {
                if (cancelled || !data?.api_key) return;
                setColibriConfig(data);
                if (!document.querySelector('script[data-colibri-widget]')) {
                    const script = document.createElement('script');
                    script.src = COLIBRI_WIDGET_URL;
                    script.defer = true;
                    script.dataset.colibriWidget = 'true';
                    document.head.appendChild(script);
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const rechazados = useMemo(
        () => misBorradores.filter((b) => b.estado === 'rechazado'),
        [misBorradores],
    );

    const abrirColibri = (plataforma) => {
        if (!window.colibri?.openPanel || !colibriConfig?.api_key) return;
        window.colibri.setContext('plataforma_slug', plataforma.slug);
        window.colibri.setContext('plataforma_label', plataforma.label);
        window.colibri.openPanel({
            sourceApp: colibriConfig.source_app,
            apiKey: colibriConfig.api_key,
        });
    };

    return (
        <Content style={{ width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <PageHeading
                    icon={<HomeOutlined />}
                    title={`Hola, ${user?.name || 'editor'}`}
                    description={`Bienvenida a Mariachi · ${user?.role}`}
                    marginBottom={0}
                />

                {rechazados.length > 0 && (
                    <Alert closable
                        type="error"
                        showIcon
                        message={`Tienes ${rechazados.length} borrador${rechazados.length === 1 ? '' : 'es'} rechazado${rechazados.length === 1 ? '' : 's'}`}
                        description="Revísalos desde el menú de tu avatar y aplícales los cambios solicitados antes de volver a enviar a revisión."
                    />
                )}

                {isAdmin && pendientes.length > 0 && (
                    <Card size="small">
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                            <Space>
                                <AuditOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                                <div>
                                    <Text strong>{pendientes.length} borrador{pendientes.length === 1 ? '' : 'es'} esperando tu revisión</Text>
                                    <br />
                                    <Text type="secondary">Aprueba o rechaza los cambios enviados por las editoras.</Text>
                                </div>
                            </Space>
                            <Link to="/revision">
                                <Button type="primary">Revisar ahora</Button>
                            </Link>
                        </Space>
                    </Card>
                )}

                <EcosistemaTablero
                    plataformas={plataformas}
                    loading={loadingPlataformas}
                    onReportar={colibriConfig?.api_key ? abrirColibri : null}
                />

                <MapalabInicioHighlights />
            </Space>
        </Content>
    );
}
