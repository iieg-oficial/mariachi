import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, Modal, Select, Space, Switch, TreeSelect, Typography, message } from 'antd';
import { NODE_TYPE_HELP, NODE_TYPE_OPTIONS, isFieldVisible } from '@features/mapalab-layers/constants/nodeTypes';

const { Text } = Typography;


function buildTreeSelectData(nodes) {
    return (nodes || []).map((n) => ({
        value: n.key,
        title: n.title,
        children: n.children?.length ? buildTreeSelectData(n.children) : undefined,
    }));
}


function slugify(text) {
    if (!text) return '';
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}


export default function LayerCreateModal({ open, onClose, onSubmit, treeData = [], defaultParentId = null, defaultNodeType = 'leaf' }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [labelTouched, setLabelTouched] = useState(false);
    const [idTouched, setIdTouched] = useState(false);
    const [slugTouched, setSlugTouched] = useState(false);
    const watchedNodeType = Form.useWatch('node_type', form);
    const watchedLabel = Form.useWatch('label', form);

    const treeSelectData = useMemo(() => buildTreeSelectData(treeData), [treeData]);

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                node_type: defaultNodeType || 'leaf',
                parent_id: defaultParentId || null,
                label: '',
                id: '',
                slug: '',
                workspace_alias: '',
                geoserver_layer: '',
                hidden_in_menu: false,
                disabled: false,
            });
            setLabelTouched(false);
            setIdTouched(false);
            setSlugTouched(false);
        }
    }, [open, defaultNodeType, defaultParentId, form]);

    useEffect(() => {
        if (!open || !labelTouched) return;
        const auto = slugify(watchedLabel);
        const updates = {};
        if (!idTouched && auto) updates.id = auto;
        if (!slugTouched && auto && isFieldVisible('slug', watchedNodeType)) updates.slug = auto;
        if (Object.keys(updates).length) form.setFieldsValue(updates);
    }, [watchedLabel, labelTouched, idTouched, slugTouched, watchedNodeType, open, form]);

    const handleOk = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        const payload = {
            id: values.id,
            label: values.label,
            node_type: values.node_type,
            parent_id: values.parent_id || null,
            slug: values.slug || null,
            sort_order: 9999,
            hidden_in_menu: Boolean(values.hidden_in_menu),
            disabled: Boolean(values.disabled),
        };
        if (values.workspace_alias) payload.workspace_alias = values.workspace_alias;
        if (values.geoserver_layer) payload.geoserver_layer = values.geoserver_layer;

        setSubmitting(true);
        try {
            await onSubmit(payload);
            message.success(`Nodo "${values.label}" creado`);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo crear');
        } finally {
            setSubmitting(false);
        }
    };

    const help = NODE_TYPE_HELP[watchedNodeType];
    const showSlug = isFieldVisible('slug', watchedNodeType);
    const showWorkspace = ['group', 'leaf'].includes(watchedNodeType);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText="Crear"
            cancelText="Cancelar"
            confirmLoading={submitting}
            title="Crear nuevo nodo"
            destroyOnHidden
            width={520}
        >
            <Form form={form} layout="vertical" preserve={false}>
                <Form.Item
                    name="node_type"
                    label="Tipo de nodo"
                    rules={[{ required: true }]}
                >
                    <Select options={NODE_TYPE_OPTIONS} />
                </Form.Item>
                {help && (
                    <Alert
                        type="info"
                        message={help.title}
                        description={help.body}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Form.Item
                    name="parent_id"
                    label="Padre (opcional)"
                    extra="Si lo dejas vacío, queda en la raíz del árbol."
                >
                    <TreeSelect
                        treeData={treeSelectData}
                        placeholder="Sin padre (raíz)"
                        allowClear
                        showSearch
                        treeNodeFilterProp="title"
                        styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                    />
                </Form.Item>
                <Form.Item
                    name="label"
                    label="Nombre"
                    rules={[{ required: true, message: 'Requerido' }, { max: 255 }]}
                >
                    <Input
                        placeholder="Ej: Cuerpos de agua"
                        onChange={() => setLabelTouched(true)}
                    />
                </Form.Item>
                <Form.Item
                    name="id"
                    label="ID"
                    extra="Identificador único en el árbol. Solo letras minúsculas, números y guiones."
                    rules={[
                        { required: true, message: 'Requerido' },
                        { pattern: /^[a-z0-9-]+$/, message: 'Solo minúsculas, números y guiones' },
                        { max: 100 },
                    ]}
                >
                    <Input
                        placeholder="cuerpos-de-agua"
                        onChange={() => setIdTouched(true)}
                    />
                </Form.Item>
                {showSlug && (
                    <Form.Item
                        name="slug"
                        label="Slug (URL del visor)"
                        extra="Si lo dejas vacío, se usa el ID. Solo aplica a grupos y capas."
                        rules={[{ pattern: /^[a-z0-9-]*$/, message: 'Solo minúsculas, números y guiones' }, { max: 60 }]}
                    >
                        <Input
                            placeholder="cuerpos-de-agua"
                            onChange={() => setSlugTouched(true)}
                        />
                    </Form.Item>
                )}
                {showWorkspace && (
                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item name="workspace_alias" label="Workspace (opcional)" style={{ flex: 1, minWidth: 0 }}>
                            <Input placeholder="general" />
                        </Form.Item>
                        <Form.Item name="geoserver_layer" label="GeoServer layer (opcional)" style={{ flex: 1, minWidth: 0 }}>
                            <Input placeholder="cuerpos_de_agua_50k" />
                        </Form.Item>
                    </Space>
                )}
                <Space size="large">
                    <Form.Item name="hidden_in_menu" label="Oculto del menú" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item name="disabled" label="Deshabilitado" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Space>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Después de crear puedes editar el resto de campos (estilos, infobox, metadatos, etc.) abriendo el nodo.
                </Text>
            </Form>
        </Modal>
    );
}
