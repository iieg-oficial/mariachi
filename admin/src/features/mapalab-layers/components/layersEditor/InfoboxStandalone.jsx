import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Form, Space, Spin, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import TarjetitaEditor from '@features/mapalab-layers/components/layersEditor/TarjetitaEditor';
import { SampleFeaturesProvider } from '@features/mapalab-layers/components/layersEditor/SampleFeaturesContext';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { refrescarArbol } from '@features/mapalab-layers/utils/refrescoArbol';
import { message } from '@shared/services/message';

const { Text } = Typography;

export default function InfoboxStandalone({ layer, inherited = null, onSaved, puedePublicar = false }) {
    const { updateLayer, listGeoserverFields, rawTree, reload } = useLayerTreeAdmin();
    const [form] = Form.useForm();
    const [availableFields, setAvailableFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);
    const [saving, setSaving] = useState(false);

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
            refrescarArbol(reload);
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
            <SampleFeaturesProvider workspaceAlias={layer.workspaceAlias} geoserverLayer={layer.geoserverLayer}>
                <Form.Item name="infoboxConfig" label={null}>
                    <TarjetitaEditor
                        availableFields={availableFields}
                        fieldsLoading={loadingFields}
                        hasFeatureType={!!layer.workspaceAlias && !!layer.geoserverLayer}
                        rawTree={rawTree}
                        currentLayerId={layer.id}
                        inherited={inherited}
                        nodeType={layer.nodeType || 'leaf'}
                        updateLayer={updateLayer}
                        reloadTree={reload}
                        puedePublicar={puedePublicar}
                    />
                </Form.Item>
            </SampleFeaturesProvider>
        </Form>
    );
}
