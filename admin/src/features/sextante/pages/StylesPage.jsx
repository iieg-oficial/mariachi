import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Empty,
    Input,
    Layout,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { listGeoserverWorkspaces } from '@features/sextante/api/geoserverFilesService';
import { listWorkspaceStyles } from '@features/sextante/api/sextanteService';
import StyleDetailDrawer from '@features/sextante/components/StyleDetailDrawer';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const WORKSPACE_STORAGE_KEY = 'sextante.styles.workspace';

export default function StylesPage() {
    const [workspaces, setWorkspaces] = useState([]);
    const [alias, setAlias] = useState(() => {
        try { return localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''; }
        catch { return ''; }
    });
    const [includeGlobal, setIncludeGlobal] = useState(false);
    const [styles, setStyles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const { isMobile } = useIsMobile();

    useEffect(() => {
        listGeoserverWorkspaces()
            .then((items) => {
                const registrados = items.filter((w) => w.registered);
                setWorkspaces(registrados);
                setAlias((prev) => (
                    registrados.some((w) => w.alias === prev) ? prev : (registrados[0]?.alias || '')
                ));
            })
            .catch((err) => setError(err?.response?.data?.detail || 'Error al cargar workspaces'));
    }, []);

    const reload = useCallback(async () => {
        if (!alias) return;
        setLoading(true);
        setError(null);
        try {
            const data = await listWorkspaceStyles(alias, includeGlobal);
            setStyles(data.styles);
        } catch (err) {
            setStyles([]);
            setError(err?.response?.data?.detail || 'Error al cargar estilos');
        } finally {
            setLoading(false);
        }
    }, [alias, includeGlobal]);

    useEffect(() => { reload(); }, [reload]);

    const handleWorkspaceChange = (next) => {
        setAlias(next);
        setSearch('');
        try { localStorage.setItem(WORKSPACE_STORAGE_KEY, next); } catch { /* noop */ }
    };

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return styles;
        return styles.filter((s) => s.name.toLowerCase().includes(needle));
    }, [styles, search]);

    const columns = [
        {
            title: 'Estilo',
            dataIndex: 'name',
            key: 'name',
            render: (name) => <Text strong>{name}</Text>,
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Ámbito',
            dataIndex: 'isGlobal',
            key: 'isGlobal',
            width: 140,
            render: (isGlobal) => (
                isGlobal ? <Tag color="gold">Global</Tag> : <Tag>Del workspace</Tag>
            ),
        },
    ];

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>Estilos (SLD)</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 720 }}>
                            Catálogo de estilos publicados en GeoServer por workspace. Muestra el tipo detectado, qué
                            capas comparten cada estilo y su leyenda en vivo. La edición visual sigue viviendo en la
                            pestaña Simbología de cada capa, con flujo de revisión.
                        </Paragraph>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading || !alias} />
                </div>

                {error && <Alert type="error" showIcon closable title={error} />}

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
                    <Space size={6}>
                        <Switch
                            size="small"
                            checked={includeGlobal}
                            onChange={setIncludeGlobal}
                        />
                        <Text type="secondary" style={{ fontSize: 12 }}>Incluir estilos globales</Text>
                    </Space>
                </Space>

                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Buscar estilo por nombre"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Table
                    rowKey="name"
                    size="small"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
                    onRow={(row) => ({
                        onClick: () => setSelected(row.name),
                        style: { cursor: 'pointer' },
                    })}
                    locale={{
                        emptyText: (
                            <Empty
                                description={alias
                                    ? 'Este workspace no tiene estilos publicados'
                                    : 'Selecciona un workspace para ver sus estilos'}
                            />
                        ),
                    }}
                />
            </Space>

            <StyleDetailDrawer
                open={selected != null}
                alias={alias}
                styleName={selected}
                onClose={() => setSelected(null)}
            />
        </Content>
    );
}
