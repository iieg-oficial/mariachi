import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Empty, Input, Layout, Select, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { CloudUploadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import useIsMobile from '@shared/hooks/useIsMobile';
import PageHeader from '@features/sextante/components/PageHeader';
import StyleDetail from '@features/sextante/components/StyleDetail';
import IconAction from '@features/sextante/components/stylesBatch/IconAction';
import useAllStyles from '@features/sextante/hooks/useAllStyles';

const { Content } = Layout;
const { Text } = Typography;

const PAGE_TIP = 'Estilos publicados en GeoServer. Toca uno para ver su leyenda y su SLD. Se editan desde Simbología en la capa o en lote.';
const BATCH_PERMISSION = 'mariachi.geoserver.manage';
const ALL = '';

const rowKey = (row) => `${row.alias}:${row.name}:${row.isGlobal ? 'g' : 'w'}`;

const columns = [
    {
        title: 'Estilo',
        dataIndex: 'name',
        key: 'name',
        render: (name) => <Text strong>{name}</Text>,
        sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
        title: 'Workspace',
        dataIndex: 'alias',
        key: 'alias',
        width: 200,
        render: (alias, row) => (row.isGlobal ? <Text type="secondary">—</Text> : alias),
        sorter: (a, b) => a.alias.localeCompare(b.alias),
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
    const { isMobile } = useIsMobile();
    const [includeGlobal, setIncludeGlobal] = useState(false);
    const [alias, setAlias] = useState(ALL);
    const [search, setSearch] = useState('');
    const { workspaces, styles, loading, error, reload } = useAllStyles(includeGlobal);
    const canBatch = Boolean(user?.permissions?.includes?.(BATCH_PERMISSION));

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return styles.filter((s) => (
            (!alias || s.isGlobal || s.alias === alias) && (!needle || s.name.toLowerCase().includes(needle))
        ));
    }, [styles, alias, search]);

    const actions = (
        <>
            {canBatch && (
                <IconAction title="Cargar estilos en lote" icon={<CloudUploadOutlined />} onClick={() => navigate('/sextante/estilos/lote')} />
            )}
            <IconAction title="Recargar" icon={<ReloadOutlined />} disabled={loading} onClick={reload} />
        </>
    );

    const globalSwitch = (
        <Tooltip title="Incluir los estilos globales">
            <Switch size="small" checked={includeGlobal} onChange={setIncludeGlobal} aria-label="Incluir los estilos globales" />
        </Tooltip>
    );

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <PageHeader title="Estilos (SLD)" tip={PAGE_TIP} actions={actions} />
                {error && <Text type="danger">{error}</Text>}
                <Space.Compact style={{ width: '100%', maxWidth: 720 }}>
                    <Select
                        style={{ minWidth: 200 }}
                        value={alias}
                        onChange={setAlias}
                        showSearch
                        optionFilterProp="label"
                        aria-label="Workspace"
                        options={[
                            { value: ALL, label: 'Todos los workspaces' },
                            ...workspaces.map((w) => ({ value: w.alias, label: w.alias })),
                        ]}
                    />
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        suffix={globalSwitch}
                        placeholder={`Buscar entre ${styles.length} estilos`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar estilo"
                    />
                </Space.Compact>
                <Table
                    rowKey={rowKey}
                    size="small"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={false}
                    expandable={{
                        expandRowByClick: true,
                        expandedRowRender: (row) => <StyleDetail alias={row.alias} styleName={row.name} />,
                    }}
                    locale={{ emptyText: <Empty description={loading ? 'Cargando…' : 'Sin estilos'} /> }}
                />
            </Space>
        </Content>
    );
}
