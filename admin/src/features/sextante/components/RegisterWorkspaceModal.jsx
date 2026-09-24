import { useEffect, useMemo, useState } from 'react';
import { Form, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import { message } from '@shared/services/message';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import { listDbSchemas, listRegisteredWorkspaces, registerWorkspace } from '@features/sextante/api/sextanteService';
import { aliasSugerido, aliasTomado } from '@features/sextante/utils/workspaceAlias';

const { Text } = Typography;
const PILDORA = { borderRadius: 20, paddingInline: 24 };

const AYUDA_ALIAS = 'El nombre corto con el que las capas se cuelgan de este workspace. Se abrevia a propósito: «seguridad» para «seguridad_y_proteccion_ciudadana». Nunca se usa para armar llaves contra GeoServer.';
const AYUDA_SCHEMA = 'El schema de PostgreSQL que respalda al workspace en dataengine. De aquí sale la llave con la que se busca la periodicidad de cada capa; si no corresponde, el selector de fechas del visor sale vacío.';
const AYUDA_ETIQUETA = 'Cómo se lee el workspace en los selectores del CMS. Si lo dejas vacío se muestra el alias.';

export default function RegisterWorkspaceModal({ open, onClose, onRegistered, pending = [] }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [schemas, setSchemas] = useState([]);
    const [registrados, setRegistrados] = useState([]);
    const watchedGs = Form.useWatch('geoserver_workspace', form);
    const watchedAlias = Form.useWatch('alias', form);
    const watchedSchema = Form.useWatch('db_schema', form);

    useEffect(() => {
        if (!open) return;
        const primero = pending[0]?.geoserverWorkspace || '';
        form.setFieldsValue({
            geoserver_workspace: primero,
            alias: aliasSugerido(primero),
            db_schema: primero,
            label: '',
        });
    }, [open, pending, form]);

    useEffect(() => {
        if (!open) return undefined;
        let cancelado = false;
        Promise.all([listDbSchemas(), listRegisteredWorkspaces()])
            .then(([listaSchemas, listaWs]) => {
                if (cancelado) return;
                setSchemas(listaSchemas || []);
                setRegistrados(listaWs || []);
            })
            .catch(() => { if (!cancelado) { setSchemas([]); setRegistrados([]); } });
        return () => { cancelado = true; };
    }, [open]);

    useEffect(() => {
        if (!open || !watchedGs) return;
        const actual = form.getFieldsValue();
        const updates = {};
        if (!actual.alias || pending.some((p) => aliasSugerido(p.geoserverWorkspace) === actual.alias)) {
            updates.alias = aliasSugerido(watchedGs);
        }
        if (!actual.db_schema || pending.some((p) => p.geoserverWorkspace === actual.db_schema)) {
            updates.db_schema = watchedGs;
        }
        if (Object.keys(updates).length) form.setFieldsValue(updates);
    }, [watchedGs, open, pending, form]);

    const opcionesWs = pending.map((p) => ({
        value: p.geoserverWorkspace,
        label: `${p.geoserverWorkspace} · ${p.layerCount} ${p.layerCount === 1 ? 'capa' : 'capas'}`,
    }));

    const opcionesSchema = useMemo(() => schemas.map((s) => ({ value: s, label: s })), [schemas]);
    const chocado = aliasTomado(watchedAlias, registrados);
    const capas = pending.find((p) => p.geoserverWorkspace === watchedGs)?.layerCount ?? null;
    const schemaDesconocido = watchedSchema && schemas.length > 0 && !schemas.includes(watchedSchema);

    const handleOk = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        setSubmitting(true);
        try {
            const created = await registerWorkspace({
                geoserver_workspace: values.geoserver_workspace,
                alias: values.alias,
                db_schema: values.db_schema,
                label: values.label || null,
            });
            message.success(`Workspace "${created.alias}" conectado al catálogo`);
            onRegistered?.(created);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo conectar el workspace');
        } finally {
            setSubmitting(false);
        }
    };

    const etiqueta = (texto, ayuda) => (
        <Space size={6}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>{texto}</Text>
            <InfoIcon title={ayuda} />
        </Space>
    );

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText="Conectar"
            cancelText="Cancelar"
            confirmLoading={submitting}
            okButtonProps={{ style: PILDORA, disabled: Boolean(chocado) }}
            cancelButtonProps={{ style: PILDORA }}
            title="Conectar workspace al catálogo"
            destroyOnHidden
            width={520}
        >
            <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 8 }}>
                <Form.Item
                    name="geoserver_workspace"
                    label={etiqueta('Workspace en GeoServer', 'El workspace publicado. Es la llave con la que se guardan metadatos, numeralia y estadísticas de sus capas.')}
                    rules={[{ required: true, message: 'Requerido' }]}
                >
                    <Select options={opcionesWs} placeholder="Selecciona un workspace" showSearch optionFilterProp="label" />
                </Form.Item>
                {capas !== null && (
                    <Space size={6} style={{ marginTop: -12, marginBottom: 16 }} wrap>
                        <Tag bordered={false}>{capas} {capas === 1 ? 'capa entra' : 'capas entran'} al catálogo</Tag>
                    </Space>
                )}

                <Form.Item
                    name="alias"
                    label={etiqueta('Alias interno', AYUDA_ALIAS)}
                    validateStatus={chocado ? 'error' : undefined}
                    help={chocado ? `Ya lo usa ${chocado.geoserverWorkspace || chocado.alias}` : undefined}
                    rules={[
                        { required: true, message: 'Requerido' },
                        { pattern: /^[a-z0-9_-]+$/, message: 'Minúsculas, números, guion bajo o medio' },
                        { max: 50 },
                    ]}
                >
                    <Input placeholder="eventos" />
                </Form.Item>

                <Form.Item
                    name="db_schema"
                    label={etiqueta('Schema en dataengine', AYUDA_SCHEMA)}
                    validateStatus={schemaDesconocido ? 'warning' : undefined}
                    help={schemaDesconocido ? 'Ese schema no existe hoy en dataengine' : undefined}
                    rules={[{ required: true, message: 'Requerido' }, { max: 200 }]}
                >
                    <Select
                        showSearch
                        placeholder="Selecciona el schema"
                        options={opcionesSchema}
                        optionFilterProp="label"
                        notFoundContent="Sin schemas"
                    />
                </Form.Item>

                <Form.Item name="label" label={etiqueta('Etiqueta visible', AYUDA_ETIQUETA)} rules={[{ max: 200 }]}>
                    <Input placeholder="Eventos" />
                </Form.Item>

                {watchedGs && (
                    <Space direction="vertical" size={2}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Metadatos y numeralia se guardarán como <Text code>{watchedGs}:capa</Text>
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            La periodicidad se buscará como <Text code>{watchedSchema || '—'}:tabla</Text>
                        </Text>
                    </Space>
                )}
            </Form>
        </Modal>
    );
}
