import { useEffect, useMemo, useState } from 'react';
import { Form, Modal, Space, Switch, Tag, Typography } from 'antd';
import { isFieldVisible, isPropertyOfGroup, PROPERTY_HELP, tipoQueGobierna } from '@features/mapalab-layers/constants/nodeTypes';
import { findNodeContext } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { useCapasGeoServer } from '@features/mapalab-layers/hooks/useCapasGeoServer';
import { useAuth } from '@shared/contexts/useAuth';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import { RAIZ } from '@features/mapalab-layers/utils/treeSelect';
import {
    aplicarCambios, capaDelGrupo, erroresDeFilas, filaNueva, filasConCapas, hermanosDe, nodoPorId, ordenConNuevos, POSICION_FINAL,
} from '@features/mapalab-layers/utils/nodoNuevo';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import NodeTypeCards from '@features/mapalab-layers/components/layerCreate/NodeTypeCards';
import GeoServerLayerField from '@features/mapalab-layers/components/layerCreate/GeoServerLayerField';
import PropertySourceField from '@features/mapalab-layers/components/layerCreate/PropertySourceField';
import PositionField from '@features/mapalab-layers/components/layerCreate/PositionField';
import ParentTreePicker from '@features/mapalab-layers/components/layerCreate/ParentTreePicker';
import NodosLote from '@features/mapalab-layers/components/layerCreate/NodosLote';
import PendingWorkspacesLine from '@features/sextante/components/PendingWorkspacesLine';

const { Text } = Typography;
const PILDORA = { borderRadius: 20, paddingInline: 24 };

const Etiqueta = ({ texto, ayuda }) => (
    <Space size={6}>
        <Text style={{ fontSize: 13, fontWeight: 600 }}>{texto}</Text>
        {ayuda && <InfoIcon title={ayuda} />}
    </Space>
);

const erroresDelServidor = (detail, filas) => {
    if (!detail?.errores) return null;
    return detail.errores.reduce((acc, e) => {
        const fila = filas[e.fila];
        return fila ? { ...acc, [fila.uid]: e.detail } : acc;
    }, {});
};

export default function LayerCreateModal({ open, onClose, onSubmit, treeData = [], defaultParentId = null, defaultNodeType = 'leaf' }) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [editandoIds, setEditandoIds] = useState(false);
    const [filas, setFilas] = useState(() => [filaNueva()]);
    const [errores, setErrores] = useState({});
    const [filtro, setFiltro] = useState('');
    const [posicion, setPosicion] = useState(POSICION_FINAL);
    const { can } = useAuth();
    const { isMobile } = useIsMobile();
    const isAdmin = can('mariachi.geoserver.manage');
    const watchedNodeType = Form.useWatch('node_type', form);
    const watchedParentId = Form.useWatch('parent_id', form);

    const padreId = watchedParentId && watchedParentId !== RAIZ ? watchedParentId : null;
    const parentCtx = padreId ? findNodeContext(treeData, padreId) : null;
    const parentNodeType = tipoQueGobierna(parentCtx?.node?.nodeType, parentCtx?.parentNodeType) ?? null;
    const willBeProperty = isPropertyOfGroup(watchedNodeType, parentNodeType);
    const capaHeredada = willBeProperty ? capaDelGrupo(nodoPorId(treeData, padreId)) : null;
    const showWorkspace = ['group', 'leaf'].includes(watchedNodeType);
    const conCapas = showWorkspace && !capaHeredada;
    const showSlug = isFieldVisible('slug', watchedNodeType);
    const hermanos = useMemo(() => hermanosDe(treeData, padreId), [treeData, padreId]);
    const { opciones, pendientes, cargando, recargar } = useCapasGeoServer({ activo: open && conCapas, isAdmin });
    const refs = filas.filter((f) => f.gsRef).map((f) => f.gsRef);

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            node_type: defaultNodeType || 'leaf',
            parent_id: defaultParentId || RAIZ,
            hidden_in_menu: false, disabled: false,
        });
        setEditandoIds(false);
        setFilas([filaNueva()]);
        setErrores({});
        setFiltro('');
        setPosicion(POSICION_FINAL);
    }, [open, defaultNodeType, defaultParentId, form]);

    useEffect(() => {
        setPosicion(POSICION_FINAL);
    }, [padreId]);

    useEffect(() => {
        if (!conCapas) setFilas((prev) => (prev.some((f) => f.gsRef) ? prev.map((f) => ({ ...f, gsRef: null, geometria: null })) : prev));
        if (capaHeredada) setFilas((prev) => (prev.length > 1 ? prev.slice(0, 1) : prev));
    }, [conCapas, capaHeredada]);

    const cambiarFila = (uid, cambios) => {
        setFilas((prev) => prev.map((f) => (f.uid === uid ? aplicarCambios(f, cambios) : f)));
        if ('label' in cambios || 'id' in cambios || 'slug' in cambios) {
            setErrores((prev) => (prev[uid] ? { ...prev, [uid]: undefined } : prev));
        }
    };

    const payloadDe = (fila, i, values) => {
        const payload = {
            id: fila.id,
            label: fila.label.trim(),
            node_type: values.node_type,
            parent_id: padreId,
            slug: showSlug ? (fila.slug || null) : null,
            sort_order: 9999 + i,
            hidden_in_menu: Boolean(values.hidden_in_menu),
            disabled: Boolean(values.disabled),
        };
        if (capaHeredada) {
            payload.workspace_alias = capaHeredada.workspaceAlias;
            payload.geoserver_layer = capaHeredada.geoserverLayer;
            if (filtro.trim()) payload.cql_filter = filtro.trim();
        } else if (fila.gsRef) {
            const [alias, layerName] = fila.gsRef.split('::');
            payload.workspace_alias = alias;
            payload.geoserver_layer = layerName;
            if (fila.geometria) payload.geometry_type = fila.geometria;
        }
        return payload;
    };

    const handleOk = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        const encontrados = erroresDeFilas(filas, showSlug);
        setErrores(encontrados);
        if (Object.keys(encontrados).length) return;

        const payloads = filas.map((fila, i) => payloadDe(fila, i, values));
        const ids = payloads.map((p) => p.id);
        const orden = posicion === POSICION_FINAL ? null : ordenConNuevos(hermanos.map((h) => h.key), ids, posicion);

        setSubmitting(true);
        try {
            await onSubmit(payloads, { orden });
            message.success(payloads.length === 1 ? `Nodo "${payloads[0].label}" creado` : `${payloads.length} nodos creados`);
            onClose?.();
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const porFila = erroresDelServidor(detail, filas);
            if (porFila) {
                setErrores(porFila);
                message.error('Hay nodos con error; no se creó ninguno');
            } else {
                message.error(typeof detail === 'string' ? detail : 'No se pudo crear');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const estilosMovil = {
        container: { height: 'calc(100dvh - 16px)', display: 'flex', flexDirection: 'column', padding: 16 },
        body: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' },
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={handleOk}
            okText={filas.length > 1 ? `Crear ${filas.length}` : 'Crear'}
            cancelText="Cancelar"
            confirmLoading={submitting}
            okButtonProps={{ style: PILDORA }}
            cancelButtonProps={{ style: PILDORA }}
            title="Nuevo nodo"
            destroyOnHidden
            width={isMobile ? '100%' : 600}
            style={isMobile ? { top: 8, maxWidth: 'calc(100vw - 16px)', paddingBottom: 0 } : undefined}
            styles={isMobile ? estilosMovil : { body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', overflowX: 'hidden' } }}
        >
            <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 8 }}>
                <Etiqueta texto="Qué vas a crear" />
                <Form.Item name="node_type" rules={[{ required: true }]} style={{ marginTop: 6, marginBottom: 8 }}>
                    <NodeTypeCards parentNodeType={parentNodeType} />
                </Form.Item>
                <Form.Item name="parent_id" noStyle>
                    <ParentTreePicker treeData={treeData} />
                </Form.Item>
                {willBeProperty && (
                    <Space size={6} style={{ marginTop: 8 }} wrap>
                        <Tag bordered={false} color="green">{PROPERTY_HELP.title}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>de {parentCtx?.node?.title}</Text>
                        <InfoIcon title={PROPERTY_HELP.body} />
                    </Space>
                )}
                <div style={{ height: 16 }} />

                {showWorkspace && capaHeredada && (
                    <div style={{ marginBottom: 16 }}>
                        <PropertySourceField capa={capaHeredada} nombreGrupo={parentCtx?.node?.title} filtro={filtro} onFiltro={setFiltro} />
                    </div>
                )}
                {conCapas && isAdmin && (
                    <div style={{ marginBottom: 16 }}>
                        <PendingWorkspacesLine pending={pendientes} onRegistered={recargar} />
                    </div>
                )}
                {conCapas && (
                    <div style={{ marginBottom: 16 }}>
                        <GeoServerLayerField
                            value={refs}
                            onChange={(nuevos) => setFilas((prev) => filasConCapas(prev, nuevos || []))}
                            opciones={opciones}
                            cargando={cargando}
                        />
                    </div>
                )}

                <div style={{ marginBottom: 16 }}>
                    <NodosLote
                        filas={filas}
                        errores={errores}
                        onCambio={cambiarFila}
                        onQuitar={(uid) => setFilas((prev) => prev.filter((f) => f.uid !== uid))}
                        onAgregar={capaHeredada ? null : () => setFilas((prev) => [...prev, filaNueva()])}
                        editandoIds={editandoIds}
                        onEditarIds={() => setEditandoIds((v) => !v)}
                        showSlug={showSlug}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <PositionField hermanos={hermanos} value={posicion} onChange={setPosicion} />
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 24, flexWrap: 'wrap' }}>
                    <Space size={8}>
                        <Form.Item name="hidden_in_menu" valuePropName="checked" noStyle>
                            <Switch size="small" />
                        </Form.Item>
                        <Etiqueta texto="Oculto del menú" ayuda="Existe y se abre por URL, pero no aparece en el árbol del visor." />
                    </Space>
                    <Space size={8}>
                        <Form.Item name="disabled" valuePropName="checked" noStyle>
                            <Switch size="small" />
                        </Form.Item>
                        <Etiqueta texto="Deshabilitado" ayuda="Se ve en gris y no se puede encender. Para capas en preparación." />
                    </Space>
                </div>
            </Form>
        </Modal>
    );
}
