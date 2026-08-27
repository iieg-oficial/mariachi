import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Empty,
    Input,
    Layout,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { listGeoserverWorkspaces } from '@features/sextante/api/geoserverFilesService';
import { listPendingWorkspaces } from '@features/sextante/api/sextanteService';
import RegisterWorkspaceModal from '@features/sextante/components/RegisterWorkspaceModal';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function WorkspacesPage() {
    const [registered, setRegistered] = useState([]);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const { isMobile } = useIsMobile();

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [all, pendientes] = await Promise.all([
                listGeoserverWorkspaces(),
                listPendingWorkspaces().catch(() => []),
            ]);
            setRegistered(all.filter((w) => w.registered));
            setPending(pendientes);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar workspaces');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return registered;
        return registered.filter((w) => (
            [w.alias, w.geoserverWorkspace, w.dbSchema, w.label]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(needle))
        ));
    }, [registered, search]);

    const columns = [
        {
            title: 'Alias',
            dataIndex: 'alias',
            key: 'alias',
            render: (alias) => <Text strong>{alias}</Text>,
            sorter: (a, b) => a.alias.localeCompare(b.alias),
        },
        {
            title: 'Workspace en GeoServer',
            dataIndex: 'geoserverWorkspace',
            key: 'geoserverWorkspace',
            render: (name) => <Text code>{name}</Text>,
        },
        {
            title: 'Schema DataEngine',
            dataIndex: 'dbSchema',
            key: 'dbSchema',
            responsive: ['md'],
            render: (schema) => (schema ? <Text code>{schema}</Text> : <Text type="secondary">—</Text>),
        },
        {
            title: 'Etiqueta',
            dataIndex: 'label',
            key: 'label',
            responsive: ['lg'],
            render: (label) => label || <Text type="secondary">—</Text>,
        },
        {
            title: 'Capas',
            key: 'layers',
            width: 100,
            align: 'right',
            render: (_, row) => <Tag color={row.layers.length ? 'blue' : 'default'}>{row.layers.length}</Tag>,
            sorter: (a, b) => a.layers.length - b.layers.length,
        },
    ];

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>Workspaces</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 720 }}>
                            Workspaces de GeoServer registrados en <Text code>mapalab.workspaces</Text>. Solo los
                            registrados pueden respaldar capas del catálogo: el <Text strong>alias</Text> es la llave
                            que usan las capas y el <Text strong>schema</Text> es la fuente en DataEngine.
                        </Paragraph>
                    </div>
                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading} />
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setModalOpen(true)}
                            disabled={pending.length === 0}
                        >
                            Registrar workspace
                        </Button>
                    </Space>
                </div>

                {error && <Alert type="error" showIcon closable title={error} />}

                {pending.length > 0 ? (
                    <Alert
                        type="warning"
                        showIcon
                        title={`${pending.length} workspace${pending.length === 1 ? '' : 's'} sin registrar`}
                        description={
                            <span>
                                {pending.map((p) => `${p.geoserverWorkspace} (${p.layerCount})`).join(', ')}
                                . Sus capas no están disponibles para el catálogo hasta que los registres.
                            </span>
                        }
                    />
                ) : (
                    !loading && !error && (
                        <Alert
                            type="success"
                            showIcon
                            closable
                            title="Todos los workspaces de GeoServer están registrados"
                        />
                    )
                )}

                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Buscar por alias, workspace, schema o etiqueta"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <Table
                    rowKey="alias"
                    size="small"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={false}
                    locale={{ emptyText: <Empty description="Sin workspaces registrados" /> }}
                    expandable={{
                        expandedRowRender: (row) => (
                            row.layers.length === 0
                                ? <Text type="secondary">Este workspace no expone capas en GeoServer.</Text>
                                : (
                                    <Space size={[4, 4]} wrap>
                                        {row.layers.map((name) => <Tag key={name}>{name}</Tag>)}
                                    </Space>
                                )
                        ),
                    }}
                />
            </Space>

            <RegisterWorkspaceModal
                open={modalOpen}
                pending={pending}
                onClose={() => setModalOpen(false)}
                onRegistered={() => { setModalOpen(false); reload(); }}
            />
        </Content>
    );
}
