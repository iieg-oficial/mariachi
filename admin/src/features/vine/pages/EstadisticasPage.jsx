import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Segmented, Space, Tabs, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';
import { getPersonas, getResumen, getRitmo, sincronizar } from '@features/vine/api/vineService';
import TabGeneral from '@features/vine/components/TabGeneral';
import TabPersonal from '@features/vine/components/TabPersonal';
import { RANGOS } from '@features/vine/constants';

const { Text } = Typography;

const PERMISO_PERSONAS = 'mariachi.vine_personas.view';

const EstadisticasPage = () => {
    const { can } = useAuth();
    const { message } = App.useApp();
    const verPersonas = can(PERMISO_PERSONAS);

    const [dias, setDias] = useState(30);
    const [resumen, setResumen] = useState(null);
    const [ritmo, setRitmo] = useState(null);
    const [personas, setPersonas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sincronizando, setSincronizando] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [r, ri] = await Promise.all([getResumen(dias), getRitmo(dias)]);
            setResumen(r);
            setRitmo(ri);
            if (verPersonas) setPersonas(await getPersonas(dias));
        } catch (e) {
            setError(e?.response?.data?.detail || 'No se pudieron cargar las estadísticas');
        } finally {
            setLoading(false);
        }
    }, [dias, verPersonas]);

    useEffect(() => { cargar(); }, [cargar]);

    const onSincronizar = async () => {
        setSincronizando(true);
        try {
            const r = await sincronizar();
            message.success(`${r.eventos_nuevos} registros nuevos y ${r.personas} personas al día`);
            await cargar();
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo leer el biométrico');
        } finally {
            setSincronizando(false);
        }
    };

    return (
        <div>
            <PageHeading
                icon={<BarChartOutlined />}
                title="Estadísticas de asistencia"
                description="Derivadas de los registros de acceso del biométrico"
            />

            <Space style={{ marginBottom: 16 }}>
                <Text type="secondary">Periodo</Text>
                <Segmented options={RANGOS} value={dias} onChange={setDias} />
                <Button icon={<ReloadOutlined />} loading={sincronizando} onClick={onSincronizar}>
                    Sincronizar
                </Button>
            </Space>

            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

            <Tabs
                defaultActiveKey="general"
                items={[
                    {
                        key: 'general',
                        label: 'General',
                        children: <TabGeneral resumen={resumen} ritmo={ritmo} loading={loading} />,
                    },
                    {
                        key: 'personal',
                        label: 'Por personal',
                        children: (
                            <TabPersonal
                                resumen={resumen}
                                personas={personas}
                                loading={loading}
                                verPersonas={verPersonas}
                            />
                        ),
                    },
                ]}
            />
        </div>
    );
};

export default EstadisticasPage;
