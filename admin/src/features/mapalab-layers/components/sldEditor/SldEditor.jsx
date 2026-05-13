import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Form, Input, Modal, Popconfirm, Row, Segmented, Select, Space, Spin, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CheckOutlined, CloseOutlined, CloudUploadOutlined, ExclamationCircleOutlined, HistoryOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router';
import api from '@shared/services/api';
import { useSldEditor, fetchStylesForLayer } from '@features/mapalab-layers/hooks/useSldEditor';
import { message } from '@shared/services/message';
import { useAuth } from '@shared/contexts/useAuth';
import LegendPreview from './LegendPreview';
import RawXmlFallback from './RawXmlFallback';
import DiffPanel from './DiffPanel';
import BoundaryEditor from './BoundaryEditor';
import ChoroplethEditor from './ChoroplethEditor';
import PointEditor from './PointEditor';
import BorradorPreview from './BorradorPreview';
import SldHistoryDrawer from './SldHistoryDrawer';

const { Text } = Typography;

const stateColor = {
    en_progreso: 'blue',
    pendiente_revision: 'orange',
    aprobado: 'green',
    rechazado: 'red',
};

const SHAPE_OPTIONS = [
    { label: 'Coroplético', value: 'choropleth' },
    { label: 'Boundary', value: 'boundary' },
    { label: 'Punto', value: 'point' },
];

function emptyModelForShape(shape, layerName, styleTitle) {
    const base = { layer_name: layerName || '', style_title: styleTitle || '' };
    if (shape === 'boundary') {
        return { ...base, polygon: null, label: null };
    }
    if (shape === 'point') {
        return {
            ...base,
            point: { symbol_id: null, size: 16, rotation: 0, opacity: 1.0 },
            label: null,
        };
    }
    return {
        ...base,
        attribute: '',
        cortes: [0, 100],
        labels: ['Sin definir'],
        colors: ['#cccccc'],
        stroke: { color: '#7A7A7A', width: 0.35, opacity: 1, linejoin: 'bevel' },
        null_style: null,
    };
}

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

    const stripPrefix = (s) => (s && s.includes(':') ? s.split(':').slice(1).join(':') : s);
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
        return (
            <Alert
                type="info"
                showIcon
                closable
                message="Esta capa es un Layer Group de GeoServer"
                description={
                    <div>
                        <p style={{ marginBottom: 8 }}>
                            <code>{workspace}:{layerName}</code> está configurado en GeoServer como <strong>Layer Group</strong> (varias capas combinadas en una sola entidad), no como capa individual.
                        </p>
                        <p style={{ marginBottom: 0 }}>
                            El editor solo soporta SLDs de capas individuales. Para modificar la simbología, edita el estilo de cada capa miembro del grupo por separado, o pide apoyo al equipo de geografía.
                        </p>
                    </div>
                }
            />
        );
    }

    return (
        <div>
            {isDerived && (
                <Alert closable
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Feature type heredado de los descendientes"
                    description={`Este nodo (Grupo) no tiene workspace/geoserver_layer propios. Se está editando el SLD del feature type ${workspace}:${layerName}, que es el que comparten todas sus capas hijas.`}
                />
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

    const initialModel = useMemo(() => {
        if (draft?.data) return draft.data;
        return data?.model || null;
    }, [data, draft]);

    const initialShape = useMemo(() => {
        if (draft?.data?.shape) return draft.data.shape;
        return data?.shape || 'choropleth';
    }, [data, draft]);

    useEffect(() => {
        setModel(initialModel ? structuredClone(initialModel) : null);
    }, [initialModel]);

    useEffect(() => {
        setShape(initialShape);
    }, [initialShape]);

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
        return <Alert closable type="error" message="Error al cargar el SLD" description={String(error.message || error)} showIcon />;
    }
    if (!data) return <Empty description="No se pudo cargar este estilo" />;

    if (!data.editable && !forcedEditable) {
        return (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <RawXmlFallback
                    rawXml={data.rawXml}
                    reason={data.reason}
                    workspace={workspace}
                    styleName={styleName}
                    layerName={layerName}
                />
                <Card size="small" title="Empezar desde cero">
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            El SLD actual no es editable visualmente. Puedes reemplazarlo con un nuevo
                            estilo desde cero — esto descartará el SLD existente al aprobarse el borrador.
                        </Typography.Text>
                        <Popconfirm
                            title="Reemplazar el estilo con simbología de punto"
                            description="Se generará un nuevo SLD con PointSymbolizer (emoji o imagen del catálogo). El SLD actual será sobreescrito al aprobarse el borrador."
                            okText="Empezar"
                            cancelText="Cancelar"
                            onConfirm={() => {
                                setShape('point');
                                setModel(emptyModelForShape('point', layerName, styleName));
                                setForcedEditable(true);
                            }}
                        >
                            <Button type="primary">Crear simbología de punto (emoji / imagen)</Button>
                        </Popconfirm>
                    </Space>
                </Card>
            </Space>
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

    const draftBadge = draft ? (
        <Tag color={stateColor[draft.estado] || 'default'}>
            Borrador: {draft.estado}
        </Tag>
    ) : null;

    const sharedBy = data.sharedBy || [];
    const sharedByOthers = sharedBy.filter((l) => l !== layerName);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {sharedByOthers.length > 0 && (
                <Alert closable
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message={`Este estilo lo comparten ${sharedByOthers.length} capa(s) más`}
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


            <Row gutter={24}>
                <Col xs={24} lg={16}>
                    <Card size="small">
                        {shape === 'boundary' ? (
                            <BoundaryEditor
                                model={model}
                                onChange={setModel}
                                availableFields={availableFields}
                            />
                        ) : shape === 'point' ? (
                            <PointEditor
                                model={model}
                                onChange={setModel}
                                availableFields={availableFields}
                            />
                        ) : (
                            <ChoroplethEditor model={model} onChange={setModel} />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        {reviewMode && <BorradorPreview shape={shape} model={model} />}
                        <LegendPreview
                            workspace={workspace}
                            geoserverWorkspace={data.workspace}
                            styleName={styleName}
                            layerName={layerName}
                        />
                        {shape === 'choropleth' && (
                            <Card size="small" title="Cambios pendientes">
                                <DiffPanel baseline={data.model} current={model} />
                            </Card>
                        )}
                        <Card size="small">
                            <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                                {draftBadge}
                                {reviewMode && borradorId ? (
                                    <>
                                        <Tag color="orange" style={{ width: '100%', textAlign: 'center', padding: 4 }}>
                                            Modo revisión
                                        </Tag>
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            onClick={handleAprobar}
                                            loading={approving}
                                            block
                                        >
                                            Aprobar y aplicar
                                        </Button>
                                        <Button
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => setRejectOpen(true)}
                                            block
                                        >
                                            Rechazar
                                        </Button>
                                        <Button
                                            icon={<SyncOutlined />}
                                            onClick={reload}
                                            block
                                        >
                                            Recargar
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            icon={<SaveOutlined />}
                                            onClick={handleSave}
                                            loading={saving}
                                            block
                                        >
                                            Guardar borrador
                                        </Button>
                                        {isAdmin ? (
                                            <Popconfirm
                                                title="Publicar SLD directo"
                                                description="Se aplicará en GeoServer inmediatamente sin pasar por revisión."
                                                okText="Publicar"
                                                cancelText="Cancelar"
                                                onConfirm={handlePublicarDirecto}
                                            >
                                                <Button
                                                    type="primary"
                                                    icon={<CheckOutlined />}
                                                    loading={publishing}
                                                    block
                                                >
                                                    Publicar directo (admin)
                                                </Button>
                                            </Popconfirm>
                                        ) : (
                                            <Button
                                                type="primary"
                                                icon={<CloudUploadOutlined />}
                                                onClick={handleSubmitReview}
                                                loading={submitting}
                                                block
                                            >
                                                Solicitar revisión
                                            </Button>
                                        )}
                                        <Button
                                            icon={<SyncOutlined />}
                                            onClick={reload}
                                            block
                                        >
                                            Recargar de GeoServer
                                        </Button>
                                        {isAdmin && (
                                            <Button
                                                icon={<HistoryOutlined />}
                                                onClick={() => setHistoryOpen(true)}
                                                block
                                            >
                                                Historial
                                            </Button>
                                        )}
                                    </>
                                )}
                                {draft?.estado === 'aprobado' && (
                                    <Tag icon={<CheckCircleOutlined />} color="success" style={{ width: '100%', textAlign: 'center', padding: 4 }}>
                                        Aprobado y aplicado en GeoServer
                                    </Tag>
                                )}
                            </Space>
                        </Card>
                    </Space>
                </Col>
            </Row>

            <SldHistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                workspace={workspace}
                styleName={styleName}
                onRestored={reload}
            />

            <Modal
                title="Rechazar borrador"
                open={rejectOpen}
                onOk={handleRechazar}
                onCancel={() => setRejectOpen(false)}
                confirmLoading={rejecting}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
            >
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    rows={3}
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                />
            </Modal>
        </Space>
    );
}
