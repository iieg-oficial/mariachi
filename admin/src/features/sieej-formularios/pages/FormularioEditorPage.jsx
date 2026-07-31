import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, Button, Flex, Spin, Tabs, Tag, Typography } from 'antd';
import { PlayCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import useSearchParamState from '../hooks/useSearchParamState';
import useFormularioAcciones from '../hooks/useFormularioAcciones';
import { formulariosApi } from '../services/formulariosAdminApi';
import DefinicionEditor from '../components/DefinicionEditor';
import ConfiguracionEditor from '../components/ConfiguracionEditor';
import AsignacionesEditor from '../components/AsignacionesEditor';
import EnviosTable from '../components/EnviosTable';
import PeriodosPanel from '../components/PeriodosPanel';
import PresenciaEditores from '../components/PresenciaEditores';
import usePresenciaFormulario from '../hooks/usePresenciaFormulario';

const ESTADO_COLOR = { borrador: 'default', activo: 'green', cerrado: 'red' };

const VALID_TABS = new Set(['definicion', 'configuracion', 'periodos', 'asignaciones', 'envios']);

export default function FormularioEditorPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tabFromUrl, setTab] = useSearchParamState('tab', 'definicion');
    const [formulario, setFormulario] = useState(null);
    const [loading, setLoading] = useState(true);

    const activeTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'definicion';
    const editores = usePresenciaFormulario(formulario?.id, activeTab);
    const acciones = useFormularioAcciones(setFormulario);

    const handleTabChange = (key) => {
        setTab(key, { paso: null, subtab: null });
    };

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const data = await formulariosApi.get(slug);
                if (!cancel) setFormulario(data);
            } catch {
                message.error('Formulario no encontrado');
                navigate('/sieej/formularios');
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, [slug, navigate]);

    if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
    if (!formulario) return null;

    const items = [
        {
            key: 'definicion',
            label: 'Definición',
            children: <DefinicionEditor formulario={formulario} onSaved={setFormulario} />,
        },
        {
            key: 'configuracion',
            label: 'Configuración',
            children: <ConfiguracionEditor formulario={formulario} onSaved={setFormulario} />,
        },
        ...(formulario.periodicidad
            ? [{
                key: 'periodos',
                label: 'Periodos',
                children: <PeriodosPanel formulario={formulario} />,
            }]
            : []),
        {
            key: 'asignaciones',
            label: 'Asignaciones',
            children: <AsignacionesEditor formulario={formulario} />,
        },
        {
            key: 'envios',
            label: 'Envíos',
            children: <EnviosTable formulario={formulario} />,
        },
    ];

    const currentTab = items.some((i) => i.key === activeTab) ? activeTab : 'definicion';

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        title: 'Formularios',
                        onClick: () => navigate('/sieej/formularios'),
                        className: 'cursor-pointer',
                    },
                    { title: formulario.nombre },
                ]}
                style={{ marginBottom: 12 }}
            />
            <Flex justify="space-between" align="flex-start" gap={12} wrap="wrap">
                <div style={{ minWidth: 0, flex: 1 }}>
                    <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4 }}>
                        {formulario.nombre}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                        slug: <code>{formulario.slug}</code> ·
                        {' '}
                        <Tag color={ESTADO_COLOR[formulario.estado] || 'default'} style={{ marginInline: 4 }}>
                            {formulario.estado}
                        </Tag>
                        · v{formulario.version}
                    </Typography.Text>
                </div>
                <PresenciaEditores editores={editores} seccionActual={activeTab} size="default" />
                {formulario.estado === 'borrador' && (
                    <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => acciones.publicar(formulario)}
                    >
                        Publicar formulario
                    </Button>
                )}
                {formulario.estado === 'cerrado' && (
                    <Button
                        type="primary"
                        icon={<UndoOutlined />}
                        onClick={() => acciones.reabrir(formulario)}
                    >
                        Reabrir formulario
                    </Button>
                )}
            </Flex>
            <Tabs
                items={items}
                activeKey={currentTab}
                onChange={handleTabChange}
                style={{ marginTop: 16 }}
                destroyOnHidden
            />
        </div>
    );
}
