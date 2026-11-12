import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Empty, Input, Layout, Select, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { CloudUploadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import useIsMobile from '@shared/hooks/useIsMobile';
import PageHeader from '@features/sextante/components/PageHeader';
import StyleDetail from '@features/sextante/components/StyleDetail';
import useAllStyles from '@features/sextante/hooks/useAllStyles';

const { Content } = Layout;
const { Text } = Typography;

const PAGE_TIP = 'Estilos publicados en GeoServer. Toca uno para ver su leyenda y su SLD. Se editan desde Simbología en la capa o en lote.';
const BATCH_PERMISSION = 'mariachi.geoserver.manage';
const ALL = '';
const PAGE_SIZE = 20;
const TABLE_HEIGHT = 'calc(100vh - 300px)';

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
    const [page, setPage] = useState(1);
    const { workspaces, styles, loading, error } = useAllStyles(includeGlobal);
    const canBatch = Boolean(user?.permissions?.includes?.(BATCH_PERMISSION));

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return styles.filter((s) => (
            (!alias || s.isGlobal || s.alias === alias) && (!needle || s.name.toLowerCase().includes(needle))
        ));
    }, [styles, alias, search]);

    const filterBy = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const filters = (
        <Space size={8} onClick={(e) => e.stopPropagation()}>
            <Select
                size="small"
                variant="borderless"
                value={alias}
                onChange={filterBy(setAlias)}
                showSearch
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                aria-label="Workspace"
                style={{ minWidth: 110 }}
                options={[
                    { value: ALL, label: 'Todos' },
                    ...workspaces.map((w) => ({ value: w.alias, label: w.alias })),
                ]}
            />
            <Tooltip title="Incluir los estilos globales">
                <Switch size="small" checked={includeGlobal} onChange={filterBy(setIncludeGlobal)} aria-label="Incluir los estilos globales" />
            </Tooltip>
        </Space>
    );

    const actions = (
        <>
            <Input
                allowClear
                prefix={<SearchOutlined />}
                suffix={filters}
                placeholder={`Buscar entre ${styles.length} estilos`}
                value={search}
                onChange={(e) => filterBy(setSearch)(e.target.value)}
                aria-label="Buscar estilo"
                style={{ borderRadius: 999, width: isMobile ? '100%' : 440 }}
            />
            {canBatch && (
                <Button type="primary" shape="round" icon={<CloudUploadOutlined />} onClick={() => navigate('/sextante/estilos/lote')}>
                    Cargar en lote
                </Button>
            )}
        </>
    );

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <PageHeader title="Estilos (SLD)" tip={PAGE_TIP} actions={actions} />
                {error && <Text type="danger">{error}</Text>}
                <Table
                    rowKey={rowKey}
                    size="small"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    sticky
                    scroll={{ y: TABLE_HEIGHT }}
                    pagination={{
                        current: page,
                        pageSize: PAGE_SIZE,
                        onChange: setPage,
                        showSizeChanger: false,
                        hideOnSinglePage: true,
                        showTotal: (total) => `${total} estilos`,
                    }}
                    expandable={{
                        expandRowByClick: true,
                        expandedRowRender: (row) => <StyleDetail alias={row.alias} styleName={row.name} canEdit={canBatch} />,
                    }}
                    locale={{ emptyText: <Empty description={loading ? 'Cargando…' : 'Sin estilos'} /> }}
                />
            </Space>
        </Content>
    );
}
