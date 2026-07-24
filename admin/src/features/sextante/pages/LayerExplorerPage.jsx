import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Empty,
    Input,
    Layout,
    List,
    Select,
    Space,
    Spin,
    Tag,
    Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { listGeoserverWorkspaces } from '@features/sextante/api/geoserverFilesService';
import LayerDetailDrawer from '@features/sextante/components/LayerDetailDrawer';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const WORKSPACE_STORAGE_KEY = 'sextante.explorador.workspace';

export default function LayerExplorerPage() {
    const [workspaces, setWorkspaces] = useState([]);
    const [alias, setAlias] = useState(() => {
        try { return localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''; }
        catch { return ''; }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [reloadToken, setReloadToken] = useState(0);
    const { isMobile } = useIsMobile();

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        listGeoserverWorkspaces()
            .then((items) => {
                if (!active) return;
                const registrados = items.filter((w) => w.registered);
                setWorkspaces(registrados);
                setAlias((prev) => (
                    registrados.some((w) => w.alias === prev) ? prev : (registrados[0]?.alias || '')
                ));
            })
            .catch((err) => {
                if (active) setError(err?.response?.data?.detail || 'Error al cargar workspaces');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [reloadToken]);

    const activeWorkspace = workspaces.find((w) => w.alias === alias) || null;

    const handleWorkspaceChange = (next) => {
        setAlias(next);
        setSearch('');
        try { localStorage.setItem(WORKSPACE_STORAGE_KEY, next); } catch { /* noop */ }
    };

    const layers = useMemo(() => {
        const all = activeWorkspace?.layers || [];
        const needle = search.trim().toLowerCase();
        if (!needle) return all;
        return all.filter((name) => name.toLowerCase().includes(needle));
    }, [activeWorkspace, search]);

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>Explorador de capas</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 720 }}>
                            Introspección directa de GeoServer: qué capas expone cada workspace, qué campos tiene cada
                            capa (con valores de muestra) y qué estilos trae asignados. Útil para armar filtros CQL,
                            InfoBox y simbología sin adivinar nombres de columnas.
                        </Paragraph>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={() => setReloadToken((t) => t + 1)} disabled={loading} />
                </div>

                {error && <Alert type="error" showIcon closable message={error} />}

                <Space wrap>
                    <Select
                        style={{ minWidth: 240 }}
                        value={alias || undefined}
                        onChange={handleWorkspaceChange}
                        placeholder="Selecciona un workspace"
                        showSearch
                        optionFilterProp="label"
                        options={workspaces.map((w) => ({
                            value: w.alias,
                            label: w.label ? `${w.alias} — ${w.label}` : w.alias,
                        }))}
                    />
                    {activeWorkspace && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <Text code>{activeWorkspace.geoserverWorkspace}</Text>
                            {' · '}{activeWorkspace.layers.length} capa{activeWorkspace.layers.length === 1 ? '' : 's'}
                        </Text>
                    )}
                </Space>

                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Buscar capa por nombre"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
                ) : (
                    <List
                        bordered
                        size="small"
                        dataSource={layers}
                        locale={{
                            emptyText: (
                                <Empty
                                    description={alias
                                        ? 'Este workspace no expone capas en GeoServer'
                                        : 'Selecciona un workspace para ver sus capas'}
                                />
                            ),
                        }}
                        pagination={layers.length > 50 ? { pageSize: 50, showSizeChanger: false } : false}
                        renderItem={(name) => (
                            <List.Item
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelected(name)}
                                actions={[<Tag key="ver">Ver detalle</Tag>]}
                            >
                                <Text code>{name}</Text>
                            </List.Item>
                        )}
                    />
                )}
            </Space>

            <LayerDetailDrawer
                open={selected != null}
                alias={alias}
                geoserverWorkspace={activeWorkspace?.geoserverWorkspace}
                layer={selected}
                onClose={() => setSelected(null)}
            />
        </Content>
    );
}
