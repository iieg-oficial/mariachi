import { useEffect, useState } from 'react';
import { Button, Empty, Form, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import LayerNoticeSection from './LayerNoticeSection';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { message } from '@shared/services/message';

export default function NoticeStandalone({ layer, onSaved }) {
    const { updateLayer, listGeoserverWorkspaces } = useLayerTreeAdmin();
    const [notice, setNotice] = useState(null);
    const [workspaces, setWorkspaces] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setNotice(layer?.notice || null);
    }, [layer]);

    useEffect(() => {
        let cancelled = false;
        listGeoserverWorkspaces()
            .then((data) => { if (!cancelled) setWorkspaces(data); })
            .catch(() => { if (!cancelled) setWorkspaces([]); });
        return () => { cancelled = true; };
    }, [listGeoserverWorkspaces]);

    if (!layer) return <Empty description="Sin capa cargada" />;

    const wsObj = workspaces.find((w) => w.alias === layer.workspaceAlias);
    const resolvedWs = wsObj?.geoserverWorkspace || layer.workspaceAlias || null;
    const styles = Array.isArray(layer.styles) ? layer.styles.join(',') : (layer.styles || '');

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateLayer(layer.id, { notice: notice || null });
            message.success('Aviso actualizado');
            onSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar el aviso');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Form layout="vertical">
            <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 12 }}>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                    Guardar aviso
                </Button>
            </Space>
            <LayerNoticeSection
                value={notice}
                onChange={setNotice}
                geoserverWorkspace={resolvedWs}
                geoserverLayer={layer.geoserverLayer || null}
                styles={styles}
                cqlFilter={layer.cqlFilter || ''}
                defaultZoom={layer.defaultZoom ?? null}
            />
        </Form>
    );
}
