import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Breadcrumb, Spin, Tabs, Typography } from 'antd';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import DefinicionEditor from '../components/DefinicionEditor';
import ConfiguracionEditor from '../components/ConfiguracionEditor';
import AsignacionesEditor from '../components/AsignacionesEditor';
import EnviosTable from '../components/EnviosTable';

export default function FormularioEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formulario, setFormulario] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const data = await formulariosApi.get(id);
                if (!cancel) setFormulario(data);
            } catch {
                message.error('Formulario no encontrado');
                navigate('/sieej/formularios');
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, [id, navigate]);

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
            <Typography.Title level={2} style={{ marginTop: 0 }}>
                {formulario.nombre}
            </Typography.Title>
            <Typography.Text type="secondary">
                slug: <code>{formulario.slug}</code> · estado: {formulario.estado} · v{formulario.version}
            </Typography.Text>
            <Tabs items={items} style={{ marginTop: 16 }} destroyOnHidden />
        </div>
    );
}
