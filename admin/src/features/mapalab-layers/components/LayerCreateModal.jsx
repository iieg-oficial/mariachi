import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Switch, Tag, Typography } from 'antd';
import { isFieldVisible, isPropertyOfGroup, PROPERTY_HELP, tipoQueGobierna } from '@features/mapalab-layers/constants/nodeTypes';
import { findNodeContext } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useCapasGeoServer } from '@features/mapalab-layers/hooks/useCapasGeoServer';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import { buildParentOptions, RAIZ, rutaDeNodo } from '@features/mapalab-layers/utils/treeSelect';
import { capaDelGrupo, hermanosDe, nodoPorId, ordenConNuevo, POSICION_FINAL } from '@features/mapalab-layers/utils/nodoNuevo';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import NodeTypeCards from '@features/mapalab-layers/components/layerCreate/NodeTypeCards';
import GeoServerLayerField from '@features/mapalab-layers/components/layerCreate/GeoServerLayerField';
import PropertySourceField from '@features/mapalab-layers/components/layerCreate/PropertySourceField';
import PositionField from '@features/mapalab-layers/components/layerCreate/PositionField';
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
    const [geometria, setGeometria] = useState(null);
    const [filtro, setFiltro] = useState('');
    const [posicion, setPosicion] = useState(POSICION_FINAL);
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const watchedNodeType = Form.useWatch('node_type', form);
    const watchedLabel = Form.useWatch('label', form);
    const watchedParentId = Form.useWatch('parent_id', form);
    const watchedId = Form.useWatch('id', form);
    const watchedSlug = Form.useWatch('slug', form);

    const padreId = watchedParentId && watchedParentId !== RAIZ ? watchedParentId : null;
    const parentCtx = padreId ? findNodeContext(treeData, padreId) : null;
    const parentNodeType = tipoQueGobierna(parentCtx?.node?.nodeType, parentCtx?.parentNodeType) ?? null;
    const willBeProperty = isPropertyOfGroup(watchedNodeType, parentNodeType);
    const capaHeredada = willBeProperty ? capaDelGrupo(nodoPorId(treeData, padreId)) : null;
    const showWorkspace = ['group', 'leaf'].includes(watchedNodeType);
    const hermanos = useMemo(() => hermanosDe(treeData, padreId), [treeData, padreId]);
    const opcionesPadre = useMemo(() => ([
        { value: RAIZ, label: 'Raíz del árbol', tipo: 'Sin padre' },
        ...buildParentOptions(treeData),
    ]), [treeData]);
    const { opciones, pendientes, cargando, recargar } = useCapasGeoServer({ activo: open && showWorkspace && !capaHeredada, isAdmin });

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            node_type: defaultNodeType || 'leaf',
            parent_id: defaultParentId || RAIZ,
            label: '', id: '', slug: '', gs_ref: undefined,
            hidden_in_menu: false, disabled: false,
        });
        setLabelTouched(false);
        setEditandoIds(false);
        setCambiandoPadre(false);
        setGeometria(null);
        setFiltro('');
        setPosicion(POSICION_FINAL);
    }, [open, defaultNodeType, defaultParentId, form]);

    useEffect(() => {
        setPosicion(POSICION_FINAL);
    }, [padreId]);

    useEffect(() => {
        if (!open || editandoIds) return;
        const auto = slugify(watchedLabel);
        if (!auto) return;
        const updates = { id: auto };
        if (isFieldVisible('slug', watchedNodeType)) updates.slug = auto;
        form.setFieldsValue(updates);
    }, [watchedLabel, watchedNodeType, editandoIds, open, form]);

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
            parent_id: padreId,
            slug: values.slug || null,
            sort_order: 9999,
            hidden_in_menu: Boolean(values.hidden_in_menu),
            disabled: Boolean(values.disabled),
        };
        if (capaHeredada) {
            payload.workspace_alias = capaHeredada.workspaceAlias;
            payload.geoserver_layer = capaHeredada.geoserverLayer;
            if (filtro.trim()) payload.cql_filter = filtro.trim();
        } else if (values.gs_ref) {
            const [alias, layerName] = values.gs_ref.split('::');
            if (alias) payload.workspace_alias = alias;
            if (layerName) payload.geoserver_layer = layerName;
            if (geometria) payload.geometry_type = geometria;
        }
        const orden = posicion === POSICION_FINAL
            ? null
            : ordenConNuevo(hermanos.map((h) => h.key), values.id, posicion);

        setSubmitting(true);
        try {
            await onSubmit(payload, { orden });
            message.success(`Nodo "${values.label}" creado`);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo crear');
        } finally {
            setSubmitting(false);
        }
    };

    const showSlug = isFieldVisible('slug', watchedNodeType);
    const rutaPadre = rutaDeNodo(treeData, padreId) || 'la raíz del árbol';

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
                    <Select
                        showSearch
                        placeholder="Escribe parte del nombre o de su ruta"
                        options={opcionesPadre}
                        optionFilterProp="label"
                        styles={{ popup: { root: { maxHeight: 360 } } }}
                        optionRender={({ data }) => (
                            <Space size={8} style={{ justifyContent: 'space-between', width: '100%' }}>
                                <span>{data.label}</span>
                                <Text type="secondary" style={{ fontSize: 11 }}>{data.tipo}</Text>
                            </Space>
                        )}
                    />
                </Form.Item>

                <Etiqueta texto="Qué vas a crear" />
                <Form.Item name="node_type" rules={[{ required: true }]} style={{ marginTop: 6, marginBottom: willBeProperty ? 6 : 16 }}>
                    <NodeTypeCards parentNodeType={parentNodeType} />
                </Form.Item>
                {willBeProperty && (
                    <Space size={6} style={{ marginBottom: 16 }} wrap>
                        <Tag bordered={false} color="green">{PROPERTY_HELP.title}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>de {parentCtx?.node?.title}</Text>
                        <InfoIcon title={PROPERTY_HELP.body} />
                    </Space>
                )}

                {showWorkspace && capaHeredada && (
                    <div style={{ marginBottom: 16 }}>
                        <PropertySourceField
                            capa={capaHeredada}
                            nombreGrupo={parentCtx?.node?.title}
                            filtro={filtro}
                            onFiltro={setFiltro}
                        />
                    </div>
                )}
                {showWorkspace && !capaHeredada && isAdmin && (
                    <div style={{ marginBottom: 16 }}>
                        <PendingWorkspacesLine pending={pendientes} onRegistered={recargar} />
                    </div>
                )}
                {showWorkspace && !capaHeredada && (
                    <div style={{ marginBottom: 16 }}>
                        <Form.Item name="gs_ref" noStyle>
                            <GeoServerLayerField opciones={opciones} cargando={cargando} onChange={handleGsChange} onGeometry={setGeometria} />
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

                <div style={{ marginBottom: 16 }}>
                    <PositionField hermanos={hermanos} value={posicion} onChange={setPosicion} />
                </div>

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
