import { useEffect, useState } from 'react';
import { Alert, Select, Space, Spin, Switch, Typography } from 'antd';
import { message } from '@shared/services/message';
import { formulariosApi, gruposApi, usuariosApi } from '../services/formulariosAdminApi';
import MemberPicker from './MemberPicker';

const { Paragraph } = Typography;

export default function AsignacionesEditor({ formulario, onSaved }) {
    const [grupos, setGrupos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [grupoIds, setGrupoIds] = useState([]);
    const [usuarioIds, setUsuarioIds] = useState([]);
    const [colaborativo, setColaborativo] = useState(false);
    const [guardandoBandera, setGuardandoBandera] = useState(false);
    const [loading, setLoading] = useState(true);

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
                setColaborativo(!!formulario?.colaborativo);
            } catch {
                message.error('Error al cargar grupos o usuarios');
            } finally {
                if (!cancel) setLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, [formulario]);

    const save = async (gIds, uIds) => {
        try {
            await formulariosApi.asignaciones(formulario.id, {
                grupos: gIds,
                usuarios: uIds,
            });
            message.success('Asignaciones guardadas');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        }
    };

    const cambiarBandera = async (valor) => {
        setGuardandoBandera(true);
        try {
            const updated = await formulariosApi.update(formulario.id, { colaborativo: valor });
            setColaborativo(valor);
            onSaved?.(updated);
            message.success(valor
                ? 'Captura colaborativa activada'
                : 'Captura colaborativa desactivada');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo cambiar');
        } finally {
            setGuardandoBandera(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>;

    return (
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {formulario.estado === 'borrador' && (
                <Alert
                    type="warning"
                    showIcon
                    title="Este formulario está en borrador"
                    description={
                        <Paragraph style={{ margin: 0 }}>
                            Los usuarios y grupos que asignes aquí no verán el formulario en SIEEJ
                            hasta que lo publiques. Puedes publicarlo desde el botón <strong>Publicar formulario</strong>
                            {' '}en la parte superior de esta página.
                        </Paragraph>
                    }
                />
            )}
            <div>
                <Typography.Text strong>Grupos asignados</Typography.Text>
                <Select
                    mode="multiple"
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="Selecciona grupos"
                    value={grupoIds}
                    onChange={(ids) => { setGrupoIds(ids); save(ids, usuarioIds); }}
                    optionFilterProp="label"
                    options={grupos.map((g) => ({ value: g.id, label: g.nombre }))}
                />
            </div>
            <div>
                <Space align="center">
                    <Switch
                        checked={colaborativo}
                        disabled={!grupoIds.length || guardandoBandera}
                        loading={guardandoBandera}
                        onChange={cambiarBandera}
                    />
                    <Typography.Text strong>Captura colaborativa</Typography.Text>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
                    {grupoIds.length
                        ? 'Cada grupo asignado llena un solo envío entre todos sus miembros, y lo envía su coordinador. Los usuarios individuales de abajo siguen teniendo el suyo.'
                        : 'Asigna al menos un grupo: el envío pasa a pertenecer al grupo, así que sin grupos no hay a quién pertenecer.'}
                </Paragraph>
            </div>
            <div>
                <Typography.Text strong>Usuarios asignados (individual)</Typography.Text>
                <div style={{ marginTop: 8 }}>
                    <MemberPicker
                        usuarios={usuarios}
                        value={usuarioIds}
                        onChange={(ids) => { setUsuarioIds(ids); save(grupoIds, ids); }}
                    />
                </div>
            </div>
        </Space>
    );
}
