import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, Button, Flex, Modal, Spin, Tabs, Tag, Typography } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import useSearchParamState from '../hooks/useSearchParamState';
import { formulariosApi } from '../services/formulariosAdminApi';
import DefinicionEditor from '../components/DefinicionEditor';
import ConfiguracionEditor from '../components/ConfiguracionEditor';
import AsignacionesEditor from '../components/AsignacionesEditor';
import EnviosTable from '../components/EnviosTable';

const ESTADO_COLOR = { borrador: 'default', activo: 'green', cerrado: 'red' };

const VALID_TABS = new Set(['definicion', 'configuracion', 'asignaciones', 'envios']);

export default function FormularioEditorPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [tabFromUrl, setTab] = useSearchParamState('tab', 'definicion');
    const [formulario, setFormulario] = useState(null);
    const [loading, setLoading] = useState(true);

    const activeTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'definicion';

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

    const handlePublicar = () => {
        Modal.confirm({
            title: '¿Publicar formulario?',
            content: 'Los usuarios asignados podrán verlo y responderlo a partir de este momento. Asegúrate de que la definición y las asignaciones estén listas.',
            okText: 'Publicar',
            okType: 'primary',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    const updated = await formulariosApi.publicar(formulario.id);
                    setFormulario(updated);
                    message.success('Formulario publicado');
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'Error al publicar');
                }
            },
        });
    };

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
                {formulario.estado === 'borrador' && (
                    <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={handlePublicar}
                    >
                        Publicar formulario
                    </Button>
                )}
            </Flex>
            <Tabs
                items={items}
                activeKey={activeTab}
                onChange={handleTabChange}
                style={{ marginTop: 16 }}
                destroyOnHidden
            />
        </div>
    );
}
