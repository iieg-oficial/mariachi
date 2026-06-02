import { useEffect, useState } from 'react';
import { Drawer, Empty, Spin, Tabs, Tag, Typography } from 'antd';
import InfoboxStandalone from '@features/mapalab-layers/components/layersEditor/InfoboxStandalone';
import NoticeStandalone from '@features/mapalab-layers/components/layersEditor/NoticeStandalone';
import LayerMetadataSection from '@features/mapalab-layers/components/layersEditor/LayerMetadataSection';
import SldEditor from '@features/mapalab-layers/components/sldEditor/SldEditor';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';

const { Text } = Typography;

export default function LayerContentDrawer({ open, layerId, onClose, onSaved }) {
    const { getLayer, listGeoserverFields } = useLayerTreeAdmin();
    const [layer, setLayer] = useState(null);
    const [availableFields, setAvailableFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('infobox');

    useEffect(() => {
        if (!open || !layerId) return;
        let cancelled = false;
        setLoading(true);
        getLayer(layerId)
            .then((data) => { if (!cancelled) setLayer(data); })
            .catch(() => { if (!cancelled) setLayer(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, layerId, getLayer]);

    useEffect(() => {
        if (!open) {
            setLayer(null);
            setAvailableFields([]);
            setActiveTab('infobox');
        }
    }, [open]);

    useEffect(() => {
        if (!layer?.workspaceAlias || !layer?.geoserverLayer) {
            setAvailableFields([]);
            return;
        }
        let cancelled = false;
        listGeoserverFields(layer.workspaceAlias, layer.geoserverLayer)
            .then((res) => { if (!cancelled) setAvailableFields(res?.fields || []); })
            .catch(() => { if (!cancelled) setAvailableFields([]); });
        return () => { cancelled = true; };
    }, [layer?.workspaceAlias, layer?.geoserverLayer, listGeoserverFields]);

    const reload = async () => {
        if (!layerId) return;
        try {
            const fresh = await getLayer(layerId);
            setLayer(fresh);
            onSaved?.(fresh);
        } catch {
            /* noop */
        }
    };

    const layerKey = layer?.workspaceAlias && layer?.geoserverLayer
        ? `${layer.workspaceAlias}:${layer.geoserverLayer}`
        : null;

    const items = [
        {
            key: 'infobox',
            label: 'Tarjeta',
            children: <InfoboxStandalone layer={layer} onSaved={reload} />,
        },
        {
            key: 'aviso',
            label: 'Aviso',
            children: <NoticeStandalone layer={layer} onSaved={reload} />,
        },
        {
            key: 'metadatos',
            label: 'Metadatos',
            children: layerKey ? (
                <LayerMetadataSection
                    layerKey={layerKey}
                    workspace={layer.workspaceAlias}
                    geoserverLayer={layer.geoserverLayer}
                    availableFields={availableFields}
                />
            ) : (
                <Empty description="La capa no tiene feature type definido" />
            ),
        },
        {
            key: 'simbologia',
            label: 'Simbología',
            children: layer ? <SldEditor layer={layer} /> : null,
        },
    ];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={920}
            title={layer ? (
                <span>
                    Editar contenido de la capa <Tag color="blue">{layer.workspaceAlias}:{layer.geoserverLayer}</Tag>
                    <Text type="secondary" style={{ marginLeft: 8, fontWeight: 'normal' }}>{layer.label}</Text>
                </span>
            ) : 'Editar contenido de la capa'}
            destroyOnHidden
        >
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                    <Spin />
                </div>
            ) : !layer ? (
                <Empty description="Capa no encontrada" />
            ) : (
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    destroyOnHidden={false}
                />
            )}
        </Drawer>
    );
}
