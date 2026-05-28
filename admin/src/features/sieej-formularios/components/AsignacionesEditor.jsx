import { useEffect, useState } from 'react';
import { Alert, Button, Select, Space, Spin, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formulariosApi, gruposApi, usuariosApi } from '../services/formulariosAdminApi';

const { Paragraph } = Typography;

export default function AsignacionesEditor({ formulario }) {
    const [grupos, setGrupos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [grupoIds, setGrupoIds] = useState([]);
    const [usuarioIds, setUsuarioIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const [g, u] = await Promise.all([gruposApi.list(), usuariosApi.list()]);
                if (cancel) return;
                setGrupos(g);
                setUsuarios(u);
                setGrupoIds(formulario?.grupos?.map((x) => x.id) ?? []);
                setUsuarioIds(formulario?.usuarios_asignados?.map((x) => x.id) ?? []);
            } catch {
                message.error('Error al cargar grupos o usuarios');
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, [formulario]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await formulariosApi.asignaciones(formulario.id, {
                grupos: grupoIds,
                usuarios: usuarioIds,
            });
            message.success('Asignaciones guardadas');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>;

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {formulario.estado === 'borrador' && (
                <Alert
                    type="warning"
                    showIcon
                    message="Este formulario está en borrador"
                    description={
                        <Paragraph style={{ margin: 0 }}>
                            Los usuarios y grupos que asignes aquí no verán el formulario en SIEEJ
                            hasta que lo publiques. Puedes publicarlo desde el botón <strong>Publicar formulario</strong>
                            {' '}en la parte superior de esta página.
                        </Paragraph>
                    }
                />
            )}
            <Alert
                type="info"
                showIcon
                message="Visibilidad del formulario"
                description={
                    <Paragraph style={{ margin: 0 }}>
                        Un usuario puede acceder al formulario si esta asignado individualmente
                        o si pertenece a uno de los grupos asignados. El admin global ve todos los
                        formularios sin necesidad de asignacion.
                    </Paragraph>
                }
            />
            <div>
                <Typography.Text strong>Grupos asignados</Typography.Text>
                <Select
                    mode="multiple"
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Selecciona grupos"
                    value={grupoIds}
                    onChange={setGrupoIds}
                    optionFilterProp="label"
                    options={grupos.map((g) => ({ value: g.id, label: g.nombre }))}
                />
            </div>
            <div>
                <Typography.Text strong>Usuarios asignados (individual)</Typography.Text>
                <Select
                    mode="multiple"
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Selecciona usuarios"
                    value={usuarioIds}
                    onChange={setUsuarioIds}
                    optionFilterProp="label"
                    options={usuarios.map((u) => ({
                        value: u.id,
                        label: `${u.username} (${u.name})`,
                    }))}
                />
            </div>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                Guardar asignaciones
            </Button>
        </Space>
    );
}
