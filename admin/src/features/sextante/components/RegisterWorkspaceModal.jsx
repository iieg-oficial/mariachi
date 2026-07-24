import { useEffect, useState } from 'react';
import { Form, Input, Modal, Select, Typography } from 'antd';
import { message } from '@shared/services/message';
import { registerWorkspace } from '@features/sextante/api/sextanteService';

const { Text } = Typography;

function defaultAliasFor(geoserverWorkspace) {
    if (!geoserverWorkspace) return '';
    return geoserverWorkspace.split('_')[0].toLowerCase();
}

export default function RegisterWorkspaceModal({ open, onClose, onRegistered, pending = [] }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const watchedGs = Form.useWatch('geoserver_workspace', form);

    useEffect(() => {
        if (open) {
            const first = pending[0]?.geoserverWorkspace || '';
            form.setFieldsValue({
                geoserver_workspace: first,
                alias: defaultAliasFor(first),
                db_schema: first,
                label: '',
            });
        }
    }, [open, pending, form]);

    useEffect(() => {
        if (!open || !watchedGs) return;
        const current = form.getFieldsValue();
        const updates = {};
        if (!current.alias || pending.some((p) => defaultAliasFor(p.geoserverWorkspace) === current.alias)) {
            updates.alias = defaultAliasFor(watchedGs);
        }
        if (!current.db_schema || pending.some((p) => p.geoserverWorkspace === current.db_schema)) {
            updates.db_schema = watchedGs;
        }
        if (Object.keys(updates).length) form.setFieldsValue(updates);
    }, [watchedGs, open, pending, form]);

    const options = pending.map((p) => ({
        value: p.geoserverWorkspace,
        label: `${p.geoserverWorkspace} (${p.layerCount} ${p.layerCount === 1 ? 'capa' : 'capas'})`,
    }));

    const handleOk = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                geoserver_workspace: values.geoserver_workspace,
                alias: values.alias,
                db_schema: values.db_schema,
                label: values.label || null,
            };
            const created = await registerWorkspace(payload);
            message.success(`Workspace "${created.alias}" registrado`);
            onRegistered?.(created);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo registrar el workspace');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText="Registrar"
            cancelText="Cancelar"
            confirmLoading={submitting}
            title="Registrar workspace de GeoServer"
            destroyOnHidden
            width={520}
        >
            <Form form={form} layout="vertical" preserve={false}>
                <Form.Item
                    name="geoserver_workspace"
                    label="Workspace en GeoServer"
                    rules={[{ required: true, message: 'Requerido' }]}
                >
                    <Select
                        options={options}
                        placeholder="Selecciona un workspace"
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>
                <Form.Item
                    name="alias"
                    label="Alias interno"
                    extra="Identificador corto que usaran las capas (FK). Solo minusculas, numeros, guion bajo o guion medio."
                    rules={[
                        { required: true, message: 'Requerido' },
                        { pattern: /^[a-z0-9_-]+$/, message: 'Formato invalido' },
                        { max: 50 },
                    ]}
                >
                    <Input placeholder="eventos" />
                </Form.Item>
                <Form.Item
                    name="db_schema"
                    label="Schema en DataEngine"
                    extra="Schema de PostgreSQL que respalda este workspace. Por defecto se asume igual al nombre del workspace."
                    rules={[{ required: true, message: 'Requerido' }, { max: 200 }]}
                >
                    <Input placeholder="eventos" />
                </Form.Item>
                <Form.Item
                    name="label"
                    label="Etiqueta visible (opcional)"
                    rules={[{ max: 200 }]}
                >
                    <Input placeholder="Eventos" />
                </Form.Item>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    El workspace queda registrado en mapalab.workspaces y sus capas pasan a estar disponibles para crear nodos.
                </Text>
            </Form>
        </Modal>
    );
}
