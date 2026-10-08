import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Form, Segmented, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router';
import api from '@shared/services/api';
import { useSldEditor, fetchStylesForLayer } from '@features/mapalab-layers/hooks/useSldEditor';
import { message } from '@shared/services/message';
import { useAuth } from '@shared/contexts/useAuth';
import SldHistoryDrawer from './SldHistoryDrawer';
import SldNotEditableFallback from './SldNotEditableFallback';
import SldRejectModal from './SldRejectModal';
import LayerGroupWarning from './LayerGroupWarning';
import SldEditorLayout from './SldEditorLayout';
import { SHAPE_OPTIONS, emptyModelForShape, stripPrefix } from './sldEditorHelpers';

const { Text } = Typography;

export default function SldEditor({ layer, derivedFeatureType }) {
    const workspace = layer?.workspaceAlias || derivedFeatureType?.workspace || null;
    const layerName = layer?.geoserverLayer || derivedFeatureType?.geoserverLayer || null;
    const layerStyles = layer?.styles || [];
    const isDerived = !layer?.workspaceAlias && !!derivedFeatureType;
    const layerId = layer?.id || null;

    const [searchParams] = useSearchParams();
    const reviewMode = searchParams.get('review') === 'true';
    const borradorId = searchParams.get('borrador') || null;
    const styleFromQuery = searchParams.get('style') || null;

    const [stylesForLayer, setStylesForLayer] = useState(layerStyles.map(stripPrefix));
    const [styleName, setStyleName] = useState(stripPrefix(styleFromQuery) || stripPrefix(layerStyles[0]) || null);
    const [isLayerGroup, setIsLayerGroup] = useState(false);

    useEffect(() => {
        if (!workspace || !layerName) return undefined;
        let cancelled = false;
        fetchStylesForLayer(workspace, layerName)
            .then(({ styles, isLayerGroup: lg }) => {
                if (cancelled) return;
                const bareList = styles.map(stripPrefix);
                setStylesForLayer(bareList);
                setIsLayerGroup(lg);
                setStyleName((prev) => {
                    if (prev && bareList.includes(prev)) return prev;
                    const queryStyle = stripPrefix(styleFromQuery);
                    if (queryStyle && bareList.includes(queryStyle)) return queryStyle;
                    return bareList[0] || null;
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [workspace, layerName, styleFromQuery]);

    if (!workspace || !layerName) {
        return (
            <Empty description="Esta capa no tiene workspace + layer GeoServer configurados; no hay SLD que editar." />
        );
    }

    if (isLayerGroup && stylesForLayer.length === 0) {
        return <LayerGroupWarning workspace={workspace} layerName={layerName} />;
    }

    return (
        <div>
            {isDerived && (
                <Tooltip title={`Este nodo no tiene workspace ni capa de GeoServer propios: se edita el SLD de ${workspace}:${layerName}, el feature type que comparten todas sus capas hijas.`}>
                    <Text type="secondary" style={{ fontSize: 12, cursor: 'help', display: 'block', marginBottom: 12 }}>
                        Feature type heredado de sus capas hijas
                    </Text>
                </Tooltip>
            )}
            <Form.Item label="Estilo a editar" style={{ marginBottom: 16 }}>
                <Select
                    value={styleName}
                    onChange={setStyleName}
                    options={stylesForLayer.map((s) => ({ value: s, label: s }))}
                    style={{ maxWidth: 480 }}
                    placeholder="Selecciona un estilo"
                />
            </Form.Item>

            {styleName && (
                <SldEditorBody
                    workspace={workspace}
                    layerName={layerName}
                    styleName={styleName}
                    layerId={layerId}
                    reviewMode={reviewMode}
                    borradorId={borradorId}
                />
            )}
        </div>
    );
}

function SldEditorBody({ workspace, layerName, styleName, layerId, reviewMode, borradorId }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';
    const { loading, error, data, draft, saveDraft, requestReview, reload } = useSldEditor({
        workspace,
        styleName,
    });

    const [model, setModel] = useState(null);
    const [shape, setShape] = useState(null);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [availableFields, setAvailableFields] = useState([]);
    const [forcedEditable, setForcedEditable] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    const handlePublicarDirecto = async () => {
        setPublishing(true);
        try {
            const savedDraft = await saveDraft(payloadWithShape(model));
            const newBorradorId = savedDraft?.id;
            if (!newBorradorId) throw new Error('No se obtuvo borradorId al guardar el borrador');
            await api.post(
                `/borradores/sld/${encodeURIComponent(`${workspace}:${styleName}`)}/solicitar-revision`,
            );
            await api.post(`/borradores/por-id/${newBorradorId}/aprobar`);
            message.success('SLD publicado directamente en GeoServer');
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || err?.message || 'No se pudo publicar');
        } finally {
            setPublishing(false);
        }
    };

    const handleAprobar = async () => {
        if (!borradorId) return;
        setApproving(true);
        try {
            await api.post(`/borradores/por-id/${borradorId}/aprobar`);
            message.success('Borrador aprobado y SLD aplicado en GeoServer');
            navigate('/revision');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo aprobar el borrador');
        } finally {
            setApproving(false);
        }
    };

    const handleRechazar = async () => {
        if (!borradorId) return;
        setRejecting(true);
        try {
            await api.post(`/borradores/por-id/${borradorId}/rechazar`, { comentario: rejectComment });
            message.success('Borrador rechazado');
            setRejectOpen(false);
            navigate('/revision');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo rechazar');
        } finally {
            setRejecting(false);
        }
    };

    const initialModel = useMemo(() => draft?.data || data?.model || null, [data, draft]);
    const initialShape = useMemo(() => draft?.data?.shape || data?.shape || 'choropleth', [data, draft]);

    useEffect(() => {
        setModel(initialModel ? structuredClone(initialModel) : null);
    }, [initialModel]);

    useEffect(() => { setShape(initialShape); }, [initialShape]);

    const handleShapeChange = (newShape) => {
        if (newShape === shape) return;
        setShape(newShape);
        const layerNameForModel = model?.layer_name || data?.model?.layer_name || layerName || '';
        const styleTitleForModel = model?.style_title || data?.model?.style_title || '';
        setModel(emptyModelForShape(newShape, layerNameForModel, styleTitleForModel));
    };

    useEffect(() => {
        if (!workspace || !layerName) return undefined;
        let cancelled = false;
        api.get(`/geoserver/workspaces/${encodeURIComponent(workspace)}/layers/${encodeURIComponent(layerName)}/fields`)
            .then((res) => { if (!cancelled) setAvailableFields(res.data?.fields || []); })
            .catch(() => { if (!cancelled) setAvailableFields([]); });
        return () => { cancelled = true; };
    }, [workspace, layerName]);

    if (loading) return <Spin />;
    if (error) {
        return <Alert closable type="error" title="Error al cargar el SLD" description={String(error.message || error)} showIcon />;
    }
    if (!data) return <Empty description="No se pudo cargar este estilo" />;

    if (!data.editable && !forcedEditable) {
        return (
            <SldNotEditableFallback
                data={data}
                workspace={workspace}
                styleName={styleName}
                layerName={layerName}
                setShape={setShape}
                setModel={setModel}
                setForcedEditable={setForcedEditable}
            />
        );
    }

    if (!model || !shape) return <Spin />;

    const payloadWithShape = (m) => ({ ...m, shape, layer_id: layerId, style_name: styleName });

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveDraft(payloadWithShape(model));
            message.success('Borrador guardado');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar el borrador');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitReview = async () => {
        setSubmitting(true);
        try {
            await saveDraft(payloadWithShape(model));
            await requestReview();
            message.success('Borrador enviado a revisión');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo solicitar revisión');
        } finally {
            setSubmitting(false);
        }
    };

    const sharedBy = data.sharedBy || [];
    const sharedByOthers = sharedBy.filter((l) => l !== layerName);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {sharedByOthers.length > 0 && (
                <Alert closable
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    title={`Este estilo lo comparten ${sharedByOthers.length} capa(s) más`}
                    description={
                        <Text style={{ fontSize: 12 }}>
                            Editarlo afectará a: {sharedByOthers.join(', ')}.
                        </Text>
                    }
                />
            )}

            <Card size="small" styles={{ body: { padding: 12 } }}>
                <Space wrap size="middle" align="center">
                    <Text strong style={{ fontSize: 13 }}>Tipo de simbología:</Text>
                    <Segmented
                        options={SHAPE_OPTIONS}
                        value={shape}
                        onChange={handleShapeChange}
                    />
                    {shape !== initialShape && (
                        <Tag color="orange">
                            Cambio de tipo · se descartará el modelo anterior al aprobar
                        </Tag>
                    )}
                </Space>
            </Card>


            <SldEditorLayout
                shape={shape}
                model={model}
                setModel={setModel}
                availableFields={availableFields}
                data={data}
                workspace={workspace}
                styleName={styleName}
                layerName={layerName}
                reviewMode={reviewMode}
                sidebarProps={{
                    draft,
                    reviewMode,
                    borradorId,
                    isAdmin,
                    saving,
                    submitting,
                    publishing,
                    approving,
                    onSave: handleSave,
                    onSubmitReview: handleSubmitReview,
                    onPublicar: handlePublicarDirecto,
                    onAprobar: handleAprobar,
                    onRechazarOpen: () => setRejectOpen(true),
                    onReload: reload,
                    onHistoryOpen: () => setHistoryOpen(true),
                }}
            />

            <SldHistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                workspace={workspace}
                styleName={styleName}
                onRestored={reload}
            />

            <SldRejectModal
                open={rejectOpen}
                onOk={handleRechazar}
                onCancel={() => setRejectOpen(false)}
                loading={rejecting}
                comment={rejectComment}
                onCommentChange={setRejectComment}
            />
        </Space>
    );
}
