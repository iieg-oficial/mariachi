import { useEffect, useMemo, useState } from 'react';
import { Button, Select, Space, Transfer, Typography, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';
import { bulkCreate, bulkDelete, listGeoserverLayers } from '../api/catalogoService';

const { Text } = Typography;

const BulkByWorkspace = ({ workspaces, capas, tagOptions, onChanged }) => {
    const [selectedWs, setSelectedWs] = useState();
    const [gsLayers, setGsLayers] = useState([]);
    const [loadingLayers, setLoadingLayers] = useState(false);
    const [targetKeys, setTargetKeys] = useState([]);
    const [busy, setBusy] = useState(false);
    const [tags, setTags] = useState([]);

    const workspaceOptions = useMemo(
        () => workspaces.map((w) => ({
            value: w.alias,
            label: w.label ? `${w.alias} — ${w.label}` : w.alias,
        })),
        [workspaces],
    );

    const nameToId = useMemo(() => {
        const map = {};
        capas
            .filter((c) => c.workspaceAlias === selectedWs)
            .forEach((c) => { map[c.geoserverLayer] = c.id; });
        return map;
    }, [capas, selectedWs]);

    useEffect(() => {
        if (!selectedWs) {
            setGsLayers([]);
            return;
        }
        setLoadingLayers(true);
        listGeoserverLayers(selectedWs)
            .then(setGsLayers)
            .catch(() => setGsLayers([]))
            .finally(() => setLoadingLayers(false));
    }, [selectedWs]);

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
                    searchTags: tags.length ? tags : undefined,
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

    const handleImportAll = async () => {
        const nuevas = gsLayers.map((l) => l.name).filter((n) => !nameToId[n]);
        if (!nuevas.length) {
            message.info('No hay capas nuevas por importar');
            return;
        }
        setBusy(true);
        try {
            const res = await bulkCreate({
                workspaceAlias: selectedWs,
                geoserverLayers: nuevas,
                searchTags: tags.length ? tags : undefined,
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

    return (
        <div>
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
                <Select
                    mode="tags"
                    style={{ minWidth: 260 }}
                    value={tags}
                    onChange={setTags}
                    options={tagOptions.map((t) => ({ value: t, label: t }))}
                    placeholder="Etiquetas para las capas agregadas (opcional)"
                />
                <Button
                    icon={<ImportOutlined />}
                    onClick={handleImportAll}
                    disabled={!selectedWs || busy || !gsLayers.length}
                    loading={busy}
                >
                    Importar todo
                </Button>
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
        </div>
    );
};

export default BulkByWorkspace;
