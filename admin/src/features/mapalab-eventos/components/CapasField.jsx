import { useMemo, useState } from 'react';
import {
    Button,
    Empty,
    Input,
    Modal,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';

const { Text } = Typography;


function flattenLeaves(nodes, acc = []) {
    for (const n of nodes || []) {
        if (n.nodeType === 'leaf' && n.workspaceAlias && n.geoserverLayer) {
            acc.push({
                id: n.id,
                label: n.label,
                workspace: n.workspaceAlias,
                layer: n.geoserverLayer,
            });
        }
        if (n.children?.length) flattenLeaves(n.children, acc);
    }
    return acc;
}


export default function CapasField({ value = [], onChange, disabled }) {
    const { rawTree, loading } = useLayerTreeAdmin();
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const allLeaves = useMemo(() => flattenLeaves(rawTree), [rawTree]);

    const taken = useMemo(
        () => new Set(value.map((c) => `${c.workspace}/${c.layer}`)),
        [value],
    );

    const available = useMemo(() => {
        const filtered = allLeaves.filter((l) => !taken.has(`${l.workspace}/${l.layer}`));
        if (!search) return filtered;
        const q = search.toLowerCase();
        return filtered.filter((l) =>
            l.label.toLowerCase().includes(q) ||
            l.layer.toLowerCase().includes(q) ||
            l.workspace.toLowerCase().includes(q),
        );
    }, [allLeaves, taken, search]);

    const addCapa = (leaf) => {
        const next = [
            ...value,
            { workspace: leaf.workspace, layer: leaf.layer, alias: leaf.label, orden: value.length },
        ];
        onChange?.(next);
        message.success(`"${leaf.label}" agregada`);
    };

    const removeCapa = (idx) => {
        const next = value.filter((_, i) => i !== idx).map((c, i) => ({ ...c, orden: i }));
        onChange?.(next);
    };

    const updateAlias = (idx, alias) => {
        const next = value.map((c, i) => (i === idx ? { ...c, alias } : c));
        onChange?.(next);
    };

    const moveCapa = (idx, dir) => {
        const target = idx + dir;
        if (target < 0 || target >= value.length) return;
        const next = [...value];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange?.(next.map((c, i) => ({ ...c, orden: i })));
    };

    const columns = [
        {
            title: 'Capa',
            key: 'capa',
            render: (_, record, idx) => (
                <Space direction="vertical" size={0}>
                    <Tag color="blue">{record.workspace}:{record.layer}</Tag>
                    <Input
                        size="small"
                        placeholder="Alias mostrado en el panel"
                        value={record.alias || ''}
                        onChange={(e) => updateAlias(idx, e.target.value)}
                        disabled={disabled}
                        style={{ marginTop: 4, maxWidth: 320 }}
                    />
                </Space>
            ),
        },
        {
            title: 'Orden',
            key: 'orden',
            width: 110,
            render: (_, record, idx) => (
                <Space size={2}>
                    <Button size="small" disabled={disabled || idx === 0} onClick={() => moveCapa(idx, -1)}></Button>
                    <Button size="small" disabled={disabled || idx === value.length - 1} onClick={() => moveCapa(idx, 1)}></Button>
                </Space>
            ),
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            render: (_, __, idx) => (
                <Button danger size="small" icon={<DeleteOutlined />} disabled={disabled} onClick={() => removeCapa(idx)} />
            ),
        },
    ];

    const modalColumns = [
        { title: 'Capa', dataIndex: 'label', key: 'label' },
        {
            title: 'Workspace:Layer',
            key: 'wl',
            render: (_, r) => <Tag>{r.workspace}:{r.layer}</Tag>,
        },
        {
            title: '',
            key: 'add',
            width: 80,
            render: (_, r) => (
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addCapa(r)}>
                    Agregar
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Capas que aparecerán en el panel del evento. Reordena con los botones.
                </Text>
                <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)} disabled={disabled || loading}>
                    Agregar capa
                </Button>
            </Space>

            {value.length === 0 ? (
                <Empty description="Sin capas asignadas" />
            ) : (
                <Table
                    rowKey={(r) => `${r.workspace}/${r.layer}`}
                    columns={columns}
                    dataSource={value}
                    pagination={false}
                    size="small"
                />
            )}

            <Modal
                title="Agregar capa al evento"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={720}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Input.Search
                        placeholder="Buscar por label, workspace o layer"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                    />
                    <Table
                        rowKey="id"
                        columns={modalColumns}
                        dataSource={available}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        size="small"
                    />
                </Space>
            </Modal>
        </Space>
    );
}
