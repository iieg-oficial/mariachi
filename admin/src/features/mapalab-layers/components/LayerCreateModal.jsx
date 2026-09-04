import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Form, Input, Modal, Select, Space, Switch, TreeSelect, Typography } from 'antd';
import { NODE_TYPE_HELP, NODE_TYPE_OPTIONS, isFieldVisible, isPropertyOfGroup, tipoQueGobierna } from '@features/mapalab-layers/constants/nodeTypes';
import { findNodeContext } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import api from '@shared/services/api';
import { buildTreeSelectData } from '@features/mapalab-layers/utils/treeSelect';
import PendingWorkspacesAlert from '@features/sextante/components/PendingWorkspacesAlert';

const { Text } = Typography;

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
    const [availableOnly, setAvailableOnly] = useState(true);
    const [workspacesData, setWorkspacesData] = useState([]);
    const [loadingWs, setLoadingWs] = useState(false);
    const [pendingWorkspaces, setPendingWorkspaces] = useState([]);
    const [wsReloadKey, setWsReloadKey] = useState(0);
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const watchedNodeType = Form.useWatch('node_type', form);
    const watchedLabel = Form.useWatch('label', form);
    const watchedParentId = Form.useWatch('parent_id', form);
    const watchedGsRef = Form.useWatch('gs_ref', form);

    const parentCtx = watchedParentId ? findNodeContext(treeData, watchedParentId) : null;
    const parentNodeType = tipoQueGobierna(parentCtx?.node?.nodeType, parentCtx?.parentNodeType) ?? null;
    const willBeProperty = isPropertyOfGroup(watchedNodeType, parentNodeType);

    const treeSelectData = useMemo(() => buildTreeSelectData(treeData), [treeData]);

    useEffect(() => {
        if (open) {
            form.setFieldsValue({
                node_type: defaultNodeType || 'leaf',
                parent_id: defaultParentId || null,
                label: '',
                id: '',
                slug: '',
                gs_ref: undefined,
                hidden_in_menu: false,
                disabled: false,
            });
            setLabelTouched(false);
            setIdTouched(false);
            setSlugTouched(false);
            setAvailableOnly(true);
        }
    }, [open, defaultNodeType, defaultParentId, form]);

    useEffect(() => {
        if (!open) return;
        if (!['group', 'leaf'].includes(watchedNodeType)) return;
        let cancelled = false;
        setLoadingWs(true);
        api.get('/geoserver/workspaces', { params: availableOnly ? { available_only: true } : {} })
            .then((res) => { if (!cancelled) setWorkspacesData(res.data || []); })
            .catch(() => { if (!cancelled) setWorkspacesData([]); })
            .finally(() => { if (!cancelled) setLoadingWs(false); });
        return () => { cancelled = true; };
    }, [open, watchedNodeType, availableOnly, wsReloadKey]);

    useEffect(() => {
        if (!open || !isAdmin) return;
        if (!['group', 'leaf'].includes(watchedNodeType)) return;
        let cancelled = false;
        api.get('/geoserver/workspaces/pending')
            .then((res) => { if (!cancelled) setPendingWorkspaces(res.data || []); })
            .catch(() => { if (!cancelled) setPendingWorkspaces([]); });
        return () => { cancelled = true; };
    }, [open, watchedNodeType, isAdmin, wsReloadKey]);

    const handleWorkspaceRegistered = useCallback(() => {
        setWsReloadKey((k) => k + 1);
    }, []);

    const gsOptions = useMemo(() => (
        (workspacesData || [])
            .filter((ws) => (ws.layers || []).length > 0)
            .map((ws) => ({
                label: ws.label ? `${ws.alias} — ${ws.label}` : ws.alias,
                title: ws.alias,
                options: (ws.layers || []).map((name) => ({
                    value: `${ws.alias}::${name}`,
                    label: name,
                })),
            }))
    ), [workspacesData]);

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
        if (values.gs_ref) {
            const [alias, layerName] = values.gs_ref.split('::');
            if (alias) payload.workspace_alias = alias;
            if (layerName) payload.geoserver_layer = layerName;
        }

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
                {help && !willBeProperty && (
                    <Alert closable
                        type="info"
                        title={help.title}
                        description={help.body}
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}
                {willBeProperty && (
                    <Alert closable
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                        title="Se creará como Propiedad del grupo"
                        description="El padre seleccionado es un Grupo, así que este nodo cuenta como Propiedad: comparte feature type con el grupo y se enciende automáticamente cuando se enciende el grupo en el visor. Distínguelo de sus hermanas con un Filtro CQL en la pestaña Servicios después de crearlo."
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
                {showWorkspace && isAdmin && (
                    <PendingWorkspacesAlert
                        pending={pendingWorkspaces}
                        onRegistered={handleWorkspaceRegistered}
                    />
                )}
                {showWorkspace && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13 }}>Capa de GeoServer (opcional)</Text>
                            <Space size={6}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Solo no registradas</Text>
                                <Switch
                                    size="small"
                                    checked={availableOnly}
                                    onChange={setAvailableOnly}
                                />
                            </Space>
                        </div>
                        <Form.Item name="gs_ref" style={{ marginBottom: 16 }}>
                            <Select
                                showSearch
                                allowClear
                                loading={loadingWs}
                                placeholder={availableOnly ? 'Buscar capa no registrada...' : 'Buscar entre todas las capas...'}
                                options={gsOptions}
                                optionFilterProp="label"
                                filterOption={(input, option) => {
                                    if (!option?.value) return false;
                                    const q = input.toLowerCase();
                                    return option.label?.toLowerCase().includes(q) || option.value.toLowerCase().includes(q);
                                }}
                                notFoundContent={loadingWs ? 'Cargando...' : 'Sin capas disponibles'}
                                styles={{ popup: { root: { maxHeight: 320 } } }}
                            />
                        </Form.Item>
                        {watchedGsRef && (
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: -10, marginBottom: 16 }}>
                                Workspace: <strong>{watchedGsRef.split('::')[0]}</strong> · Layer: <strong>{watchedGsRef.split('::')[1]}</strong>
                            </Text>
                        )}
                    </>
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
