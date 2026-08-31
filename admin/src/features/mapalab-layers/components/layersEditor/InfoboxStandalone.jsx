import { useEffect, useState } from 'react';
import { Alert, Button, Col, Empty, Form, Row, Space, Spin, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import InfoBoxEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxEditor';
import InfoBoxEditorHeader from '@features/mapalab-layers/components/layersEditor/InfoBoxEditorHeader';
import InfoBoxPreview from '@features/mapalab-layers/components/layersEditor/InfoBoxPreview';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { message } from '@shared/services/message';

const { Text } = Typography;

export default function InfoboxStandalone({ layer, inherited = null, onSaved }) {
    const { updateLayer, listGeoserverFields, rawTree } = useLayerTreeAdmin();
    const [form] = Form.useForm();
    const watchedConfig = Form.useWatch('infoboxConfig', form);
    const [availableFields, setAvailableFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState('visual');

    useEffect(() => {
        form.setFieldsValue({ infoboxConfig: layer?.infoboxConfig || null });
    }, [layer, form]);

    useEffect(() => {
        if (!layer?.workspaceAlias || !layer?.geoserverLayer) {
            setAvailableFields([]);
            return;
        }
        let cancelled = false;
        setLoadingFields(true);
        listGeoserverFields(layer.workspaceAlias, layer.geoserverLayer)
            .then((res) => { if (!cancelled) setAvailableFields(res?.fields || []); })
            .catch(() => { if (!cancelled) setAvailableFields([]); })
            .finally(() => { if (!cancelled) setLoadingFields(false); });
        return () => { cancelled = true; };
    }, [layer?.workspaceAlias, layer?.geoserverLayer, listGeoserverFields]);

    const crudo = watchedConfig || inherited?.config || null;
    const previewValue = crudo && Object.keys(crudo).length > 0 ? crudo : null;

    if (!layer) return <Empty description="Sin capa cargada" />;

    if (!layer.workspaceAlias || !layer.geoserverLayer) {
        return (
            <Alert
                type="warning"
                showIcon
                title="La capa no tiene workspace o feature type definido"
                description="No se pueden listar campos disponibles para construir la tarjeta. Asigna workspace y geoserver_layer en el editor de capas."
            />
        );
    }

    const handleSave = async () => {
        const values = form.getFieldsValue();
        setSaving(true);
        try {
            await updateLayer(layer.id, { infoboxConfig: values.infoboxConfig || null });
            message.success('Tarjetita actualizada');
            onSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar la tarjetita');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Form form={form} layout="vertical">
            <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                    Guardar tarjetita
                </Button>
            </Space>
            {loadingFields && <Spin size="small" style={{ marginBottom: 12 }} />}
            <Row gutter={24}>
                <Col xs={24} md={previewValue ? 14 : 24}>
                    <InfoBoxEditorHeader
                        mode={mode}
                        onModeChange={setMode}
                        onApplyTemplate={(config) => form.setFieldsValue({ infoboxConfig: config })}
                        availableFields={availableFields}
                        fieldsLoading={loadingFields}
                        hasFeatureType={!!layer.workspaceAlias && !!layer.geoserverLayer}
                        rawTree={rawTree}
                        currentConfig={watchedConfig}
                        currentLayerId={layer.id}
                    />
                    <Form.Item name="infoboxConfig" label={null}>
                        <InfoBoxEditor
                            mode={mode}
                            availableFields={availableFields}
                            inherited={inherited}
                            nodeType={layer.nodeType || 'leaf'}
                        />
                    </Form.Item>
                </Col>
                {previewValue && (
                    <Col xs={24} md={10}>
                        <div style={{ position: 'sticky', top: 0 }}>
                            <Text strong style={{ display: 'block', marginBottom: 8 }}>Vista previa</Text>
                            <InfoBoxPreview value={previewValue} />
                        </div>
                    </Col>
                )}
            </Row>
        </Form>
    );
}
