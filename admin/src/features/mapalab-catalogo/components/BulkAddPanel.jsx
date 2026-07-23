import { useEffect, useMemo, useState } from 'react';
import { Card, Select, Space, Transfer, Typography, message } from 'antd';
import { bulkCreate, bulkDelete } from '../api/catalogoService';
import { useGeoserverLayers } from '../hooks/useGeoserverLayers';

const { Text } = Typography;

const BulkAddPanel = ({ workspaceOptions, capas, onChanged }) => {
    const [selectedWs, setSelectedWs] = useState();
    const [targetKeys, setTargetKeys] = useState([]);
    const [busy, setBusy] = useState(false);
    const { layers: gsLayers, loading: loadingLayers } = useGeoserverLayers(selectedWs);

    const nameToId = useMemo(() => {
        const map = {};
        capas
            .filter((c) => c.workspaceAlias === selectedWs)
            .forEach((c) => { map[c.geoserverLayer] = c.id; });
        return map;
    }, [capas, selectedWs]);

    useEffect(() => {
        const inCatalogo = new Set(Object.keys(nameToId));
        setTargetKeys(gsLayers.map((l) => l.name).filter((n) => inCatalogo.has(n)));
    }, [gsLayers, nameToId]);

    const dataSource = useMemo(
        () => gsLayers.map((l) => ({
            key: l.name,
            title: l.title ? `${l.name} — ${l.title}` : l.name,
        })),
        [gsLayers],
    );

    const handleTransfer = async (nextTargetKeys, direction, moveKeys) => {
        setBusy(true);
        try {
            if (direction === 'right') {
                await bulkCreate({
                    workspaceAlias: selectedWs,
                    geoserverLayers: moveKeys,
                });
            } else {
                const ids = moveKeys.map((n) => nameToId[n]).filter(Boolean);
                if (ids.length) await bulkDelete(ids);
            }
            setTargetKeys(nextTargetKeys);
            onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error en la operación masiva');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card size="small" title="Agregar múltiples capas" style={{ marginBottom: 16 }}>
            <Space wrap style={{ marginBottom: 16 }}>
                <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: 260 }}
                    placeholder="Selecciona workspace"
                    options={workspaceOptions}
                    value={selectedWs}
                    onChange={setSelectedWs}
                />
            </Space>

            {selectedWs ? (
                <Transfer
                    dataSource={dataSource}
                    targetKeys={targetKeys}
                    onChange={handleTransfer}
                    showSearch
                    disabled={busy}
                    listStyle={{ width: '46%', height: 440 }}
                    titles={['Disponibles en GeoServer', 'En catálogo']}
                    render={(item) => item.title}
                    locale={{ itemUnit: 'capa', itemsUnit: 'capas', searchPlaceholder: 'Buscar' }}
                    pagination
                />
            ) : (
                <Text type="secondary">Elige un workspace para ver sus capas.</Text>
            )}
            {loadingLayers && (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Cargando capas…</Text>
                </div>
            )}
        </Card>
    );
};

export default BulkAddPanel;
