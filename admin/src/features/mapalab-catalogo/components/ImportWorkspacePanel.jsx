import { useMemo, useState } from 'react';
import { Button, Card, Select, Space, Typography, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { bulkCreate } from '../api/catalogoService';
import { useGeoserverLayers } from '../hooks/useGeoserverLayers';

const { Text } = Typography;

const ImportWorkspacePanel = ({ workspaceOptions, capas, onChanged }) => {
    const [selectedWs, setSelectedWs] = useState();
    const [busy, setBusy] = useState(false);
    const { layers: gsLayers, loading } = useGeoserverLayers(selectedWs);

    const existing = useMemo(
        () => new Set(capas.filter((c) => c.workspaceAlias === selectedWs).map((c) => c.geoserverLayer)),
        [capas, selectedWs],
    );
    const nuevas = useMemo(() => gsLayers.filter((l) => !existing.has(l.name)), [gsLayers, existing]);

    const handleImportAll = async () => {
        if (!nuevas.length) {
            message.info('No hay capas nuevas por importar');
            return;
        }
        setBusy(true);
        try {
            const res = await bulkCreate({
                workspaceAlias: selectedWs,
                geoserverLayers: nuevas.map((l) => l.name),
            });
            const extra = res.skipped ? `, ${res.skipped} omitidas` : '';
            message.success(`Importadas ${res.created} capa(s)${extra}`);
            onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al importar');
        } finally {
            setBusy(false);
        }
    };

    const status = () => {
        if (loading) return 'Cargando capas…';
        if (!selectedWs) return 'Elige un workspace para importar todas sus capas de golpe.';
        return `${gsLayers.length} capa(s) en GeoServer · ${nuevas.length} nueva(s) por importar`;
    };

    return (
        <Card size="small" title="Importar workspace completo" style={{ marginBottom: 16 }}>
            <Space wrap>
                <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: 260 }}
                    placeholder="Selecciona workspace"
                    options={workspaceOptions}
                    value={selectedWs}
                    onChange={setSelectedWs}
                />
                <Button
                    type="primary"
                    icon={<ImportOutlined />}
                    onClick={handleImportAll}
                    disabled={!selectedWs || busy || !gsLayers.length}
                    loading={busy}
                >
                    Importar todo
                </Button>
            </Space>
            <div style={{ marginTop: 8 }}>
                <Text type="secondary">{status()}</Text>
            </div>
        </Card>
    );
};

export default ImportWorkspacePanel;
