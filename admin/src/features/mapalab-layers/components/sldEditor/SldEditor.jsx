import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Empty, Form, Row, Select, Space, Spin, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloudUploadOutlined, ExclamationCircleOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { useSldEditor, fetchStylesForLayer } from '@features/mapalab-layers/hooks/useSldEditor';
import { message } from '@shared/services/message';
import LegendPreview from './LegendPreview';
import RawXmlFallback from './RawXmlFallback';
import DiffPanel from './DiffPanel';
import BoundaryEditor from './BoundaryEditor';
import ChoroplethEditor from './ChoroplethEditor';
import api from '@shared/services/api';

const { Text } = Typography;

const stateColor = {
    en_progreso: 'blue',
    pendiente_revision: 'orange',
    aprobado: 'green',
    rechazado: 'red',
};

export default function SldEditor({ layer, derivedFeatureType }) {
    const workspace = layer?.workspaceAlias || derivedFeatureType?.workspace || null;
    const layerName = layer?.geoserverLayer || derivedFeatureType?.geoserverLayer || null;
    const layerStyles = layer?.styles || [];
    const isDerived = !layer?.workspaceAlias && !!derivedFeatureType;

    const stripPrefix = (s) => (s && s.includes(':') ? s.split(':').slice(1).join(':') : s);
    const [stylesForLayer, setStylesForLayer] = useState(layerStyles.map(stripPrefix));
    const [styleName, setStyleName] = useState(stripPrefix(layerStyles[0]) || null);
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
                setStyleName((prev) => (prev && bareList.includes(prev) ? prev : bareList[0] || null));
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [workspace, layerName]);

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
                />
            )}
        </div>
    );
}

function SldEditorBody({ workspace, layerName, styleName }) {
    const { loading, error, data, draft, saveDraft, requestReview, reload } = useSldEditor({
        workspace,
        styleName,
    });

    const [model, setModel] = useState(null);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [availableFields, setAvailableFields] = useState([]);

    const initialModel = useMemo(() => {
        if (draft?.data) return draft.data;
        return data?.model || null;
    }, [data, draft]);

    useEffect(() => {
        setModel(initialModel ? structuredClone(initialModel) : null);
    }, [initialModel]);

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

    if (!data.editable) {
        return (
            <RawXmlFallback
                rawXml={data.rawXml}
                reason={data.reason}
                workspace={workspace}
                styleName={styleName}
                layerName={layerName}
            />
        );
    }

    if (!model) return <Spin />;

    const shape = data.shape || 'choropleth';
    const payloadWithShape = (m) => ({ ...m, shape });

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

            <Row gutter={24}>
                <Col xs={24} lg={16}>
                    <Card size="small">
                        {shape === 'boundary' ? (
                            <BoundaryEditor
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
                                <Button
                                    icon={<SaveOutlined />}
                                    onClick={handleSave}
                                    loading={saving}
                                    block
                                >
                                    Guardar borrador
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<CloudUploadOutlined />}
                                    onClick={handleSubmitReview}
                                    loading={submitting}
                                    block
                                >
                                    Solicitar revisión
                                </Button>
                                <Button
                                    icon={<SyncOutlined />}
                                    onClick={reload}
                                    block
                                >
                                    Recargar de GeoServer
                                </Button>
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
        </Space>
    );
}
