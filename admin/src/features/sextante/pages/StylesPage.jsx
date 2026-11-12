import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Empty, Input, Layout, Select, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { CloudUploadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import StyleDetailDrawer from '@features/sextante/components/StyleDetailDrawer';
import PageHeader from '@features/sextante/components/PageHeader';
import useWorkspaceStyles from '@features/sextante/hooks/useWorkspaceStyles';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Content } = Layout;
const { Text } = Typography;

const PAGE_TIP = 'Estilos publicados en GeoServer por workspace. Para editar uno, usa Simbología en la capa o cárgalos en lote.';
const BATCH_PERMISSION = 'mariachi.geoserver.manage';

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
        render: (isGlobal) => (isGlobal ? <Tag color="gold">Global</Tag> : <Tag>Del workspace</Tag>),
    },
];

export default function StylesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { workspaces, alias, setAlias, includeGlobal, setIncludeGlobal, styles, loading, error, reload } = useWorkspaceStyles();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const { isMobile } = useIsMobile();
    const canBatch = Boolean(user?.permissions?.includes?.(BATCH_PERMISSION));

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return needle ? styles.filter((s) => s.name.toLowerCase().includes(needle)) : styles;
    }, [styles, search]);

    const changeWorkspace = (next) => {
        setAlias(next);
        setSearch('');
    };

    const actions = (
        <>
            {canBatch && (
                <Button type="primary" shape="round" icon={<CloudUploadOutlined />} onClick={() => navigate('/sextante/estilos/lote')}>
                    Cargar en lote
                </Button>
            )}
            <Tooltip title="Recargar">
                <Button shape="circle" icon={<ReloadOutlined />} onClick={reload} disabled={loading || !alias} aria-label="Recargar" />
            </Tooltip>
        </>
    );

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <PageHeader title="Estilos (SLD)" tip={PAGE_TIP} actions={actions} />
                {error && <Text type="danger">{error}</Text>}
                <Space wrap size="middle">
                    <Select
                        style={{ minWidth: 240 }}
                        value={alias || undefined}
                        onChange={changeWorkspace}
                        placeholder="Workspace"
                        showSearch
                        optionFilterProp="label"
                        options={workspaces.map((w) => ({ value: w.alias, label: w.label ? `${w.alias} — ${w.label}` : w.alias }))}
                    />
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Buscar estilo"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 260 }}
                    />
                    <Space size={6}>
                        <Switch size="small" checked={includeGlobal} onChange={setIncludeGlobal} aria-label="Incluir globales" />
                        <Text type="secondary">Incluir globales</Text>
                    </Space>
                </Space>
                <Table
                    rowKey="name"
                    size="small"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
                    onRow={(row) => ({ onClick: () => setSelected(row.name), style: { cursor: 'pointer' } })}
                    locale={{ emptyText: <Empty description={alias ? 'Sin estilos publicados' : 'Elige un workspace'} /> }}
                />
            </Space>
            <StyleDetailDrawer open={selected != null} alias={alias} styleName={selected} onClose={() => setSelected(null)} />
        </Content>
    );
}
