import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Switch, Tag, TreeSelect, Typography } from 'antd';
import { isFieldVisible, isPropertyOfGroup, PROPERTY_HELP, tipoQueGobierna } from '@features/mapalab-layers/constants/nodeTypes';
import { findNodeContext } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import api from '@shared/services/api';
import { buildTreeSelectData } from '@features/mapalab-layers/utils/treeSelect';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import NodeTypeCards from '@features/mapalab-layers/components/layerCreate/NodeTypeCards';
import GeoServerLayerField from '@features/mapalab-layers/components/layerCreate/GeoServerLayerField';
import PendingWorkspacesLine from '@features/sextante/components/PendingWorkspacesLine';

const { Text } = Typography;
const PILDORA = { borderRadius: 20, paddingInline: 24 };

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

function nombreDesdeCapa(nombre) {
    const limpio = (nombre || '').replace(/[_-]+/g, ' ').trim();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
}

const Etiqueta = ({ texto, ayuda }) => (
    <Space size={6}>
        <Text style={{ fontSize: 13, fontWeight: 600 }}>{texto}</Text>
        {ayuda && <InfoIcon title={ayuda} />}
    </Space>
);

export default function LayerCreateModal({ open, onClose, onSubmit, treeData = [], defaultParentId = null, defaultNodeType = 'leaf' }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [labelTouched, setLabelTouched] = useState(false);
    const [editandoIds, setEditandoIds] = useState(false);
    const [cambiandoPadre, setCambiandoPadre] = useState(false);
    const [availableOnly, setAvailableOnly] = useState(true);
    const [workspacesData, setWorkspacesData] = useState([]);
    const [loadingWs, setLoadingWs] = useState(false);
    const [pendingWorkspaces, setPendingWorkspaces] = useState([]);
    const [wsReloadKey, setWsReloadKey] = useState(0);
    const [geometria, setGeometria] = useState(null);
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const watchedNodeType = Form.useWatch('node_type', form);
    const watchedLabel = Form.useWatch('label', form);
    const watchedParentId = Form.useWatch('parent_id', form);
    const watchedId = Form.useWatch('id', form);
    const watchedSlug = Form.useWatch('slug', form);

    const parentCtx = watchedParentId ? findNodeContext(treeData, watchedParentId) : null;
    const parentNodeType = tipoQueGobierna(parentCtx?.node?.nodeType, parentCtx?.parentNodeType) ?? null;
    const willBeProperty = isPropertyOfGroup(watchedNodeType, parentNodeType);
    const treeSelectData = useMemo(() => buildTreeSelectData(treeData), [treeData]);

    useEffect(() => {
        if (!open) return;
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
        setEditandoIds(false);
        setCambiandoPadre(!defaultParentId);
        setAvailableOnly(true);
        setGeometria(null);
    }, [open, defaultNodeType, defaultParentId, form]);

    useEffect(() => {
        if (!open) return undefined;
        if (!['group', 'leaf'].includes(watchedNodeType)) return undefined;
        let cancelado = false;
        setLoadingWs(true);
        api.get('/geoserver/workspaces', { params: availableOnly ? { available_only: true } : {} })
            .then((res) => { if (!cancelado) setWorkspacesData(res.data || []); })
            .catch(() => { if (!cancelado) setWorkspacesData([]); })
            .finally(() => { if (!cancelado) setLoadingWs(false); });
        return () => { cancelado = true; };
    }, [open, watchedNodeType, availableOnly, wsReloadKey]);

    useEffect(() => {
        if (!open || !isAdmin) return undefined;
        if (!['group', 'leaf'].includes(watchedNodeType)) return undefined;
        let cancelado = false;
        api.get('/geoserver/workspaces/pending')
            .then((res) => { if (!cancelado) setPendingWorkspaces(res.data || []); })
            .catch(() => { if (!cancelado) setPendingWorkspaces([]); });
        return () => { cancelado = true; };
    }, [open, watchedNodeType, isAdmin, wsReloadKey]);

    useEffect(() => {
        if (!open) return;
        const auto = slugify(watchedLabel);
        if (!auto) return;
        const updates = { id: auto };
        if (isFieldVisible('slug', watchedNodeType)) updates.slug = auto;
        if (!editandoIds) form.setFieldsValue(updates);
    }, [watchedLabel, watchedNodeType, editandoIds, open, form]);

    const handleWorkspaceRegistered = useCallback(() => setWsReloadKey((k) => k + 1), []);

    const gsOptions = useMemo(() => (
        (workspacesData || [])
            .filter((ws) => (ws.layers || []).length > 0)
            .map((ws) => ({
                label: ws.label ? `${ws.alias} — ${ws.label}` : ws.alias,
                title: ws.alias,
                options: (ws.layers || []).map((name) => ({ value: `${ws.alias}::${name}`, label: name })),
            }))
    ), [workspacesData]);

    const handleGsChange = (valor) => {
        form.setFieldsValue({ gs_ref: valor });
        if (!valor || labelTouched) return;
        const propuesto = nombreDesdeCapa(valor.split('::')[1]);
        if (propuesto) form.setFieldsValue({ label: propuesto });
    };

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
            if (geometria) payload.geometry_type = geometria;
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

    const showSlug = isFieldVisible('slug', watchedNodeType);
    const showWorkspace = ['group', 'leaf'].includes(watchedNodeType);
    const rutaPadre = parentCtx?.node?.title || 'la raíz del árbol';

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText="Crear"
            cancelText="Cancelar"
            confirmLoading={submitting}
            okButtonProps={{ style: PILDORA }}
            cancelButtonProps={{ style: PILDORA }}
            title="Nuevo nodo"
            destroyOnHidden
            width={560}
        >
            <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 8 }}>
                <Space size={6} style={{ marginBottom: 16 }} wrap>
                    <Text type="secondary" style={{ fontSize: 12.5 }}>Dentro de <strong>{rutaPadre}</strong></Text>
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setCambiandoPadre((v) => !v)}>
                        {cambiandoPadre ? 'Listo' : 'Cambiar'}
                    </Button>
                </Space>
                <Form.Item name="parent_id" hidden={!cambiandoPadre} style={{ marginBottom: 16 }}>
                    <TreeSelect
                        treeData={treeSelectData}
                        placeholder="Sin padre (raíz)"
                        allowClear
                        showSearch
                        treeNodeFilterProp="title"
                        styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
                    />
                </Form.Item>

                <Etiqueta texto="Qué vas a crear" />
                <Form.Item name="node_type" rules={[{ required: true }]} style={{ marginTop: 6, marginBottom: willBeProperty ? 6 : 16 }}>
                    <NodeTypeCards parentNodeType={parentNodeType} />
                </Form.Item>
                {willBeProperty && (
                    <Space size={6} style={{ marginBottom: 16 }} wrap>
                        <Tag bordered={false} color="green">{PROPERTY_HELP.title}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Comparte feature type, simbología y metadatos con {rutaPadre}
                        </Text>
                        <InfoIcon title={PROPERTY_HELP.body} />
                    </Space>
                )}

                {showWorkspace && isAdmin && (
                    <div style={{ marginBottom: 16 }}>
                        <PendingWorkspacesLine pending={pendingWorkspaces} onRegistered={handleWorkspaceRegistered} />
                    </div>
                )}
                {showWorkspace && (
                    <div style={{ marginBottom: 16 }}>
                        <Form.Item name="gs_ref" noStyle>
                            <GeoServerLayerField
                                opciones={gsOptions}
                                cargando={loadingWs}
                                soloNoRegistradas={availableOnly}
                                onSoloNoRegistradas={setAvailableOnly}
                                onChange={handleGsChange}
                                onGeometry={setGeometria}
                            />
                        </Form.Item>
                    </div>
                )}

                <Form.Item
                    name="label"
                    label={<Etiqueta texto="Nombre" ayuda="Es lo que se lee en el árbol del visor. Se propone desde el nombre de la capa de GeoServer; cámbialo si el público la conoce de otra forma." />}
                    rules={[{ required: true, message: 'Requerido' }, { max: 255 }]}
                >
                    <Input placeholder="Ej: Cuerpos de agua" onChange={() => setLabelTouched(true)} />
                </Form.Item>

                <Space size={10} wrap style={{ marginBottom: editandoIds ? 12 : 16 }}>
                    <Text type="secondary" style={{ fontSize: 12.5 }}>ID <Text code>{watchedId || '—'}</Text></Text>
                    {showSlug && <Text type="secondary" style={{ fontSize: 12.5 }}>URL <Text code>/{watchedSlug || '—'}</Text></Text>}
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setEditandoIds((v) => !v)}>
                        {editandoIds ? 'Listo' : 'Editar'}
                    </Button>
                </Space>
                <Form.Item
                    name="id"
                    hidden={!editandoIds}
                    label={<Etiqueta texto="ID" ayuda="Identificador único en el árbol. Solo letras minúsculas, números y guiones." />}
                    rules={[
                        { required: true, message: 'Requerido' },
                        { pattern: /^[a-z0-9-]+$/, message: 'Solo minúsculas, números y guiones' },
                        { max: 100 },
                    ]}
                >
                    <Input placeholder="cuerpos-de-agua" />
                </Form.Item>
                {showSlug && (
                    <Form.Item
                        name="slug"
                        hidden={!editandoIds}
                        label={<Etiqueta texto="Slug" ayuda="La URL del visor. Si lo dejas vacío se usa el ID." />}
                        rules={[{ pattern: /^[a-z0-9-]*$/, message: 'Solo minúsculas, números y guiones' }, { max: 60 }]}
                    >
                        <Input placeholder="cuerpos-de-agua" />
                    </Form.Item>
                )}

                <Space size="large" wrap>
                    <Form.Item name="hidden_in_menu" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Switch size="small" />
                    </Form.Item>
                    <Etiqueta texto="Oculto del menú" ayuda="Existe y se abre por URL, pero no aparece en el árbol del visor." />
                    <Form.Item name="disabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                        <Switch size="small" />
                    </Form.Item>
                    <Etiqueta texto="Deshabilitado" ayuda="Se ve en gris y no se puede encender. Para capas en preparación." />
                </Space>
            </Form>
        </Modal>
    );
}
