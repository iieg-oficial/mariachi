import { useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Space, Table, Tag, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';

const { Text } = Typography;


function flattenLeaves(nodes, acc = []) {
    for (const n of nodes || []) {
        if (n.nodeType === 'leaf') {
            acc.push({ id: n.id, label: n.label });
        }
        if (n.children?.length) flattenLeaves(n.children, acc);
    }
    return acc;
}


export default function LayerIdsField({ value = [], onChange, disabled }) {
    const { rawTree, loading } = useLayerTreeAdmin();
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const ids = Array.isArray(value) ? value : [];

    const leaves = useMemo(() => flattenLeaves(rawTree), [rawTree]);
    const byId = useMemo(() => new Map(leaves.map((l) => [l.id, l])), [leaves]);

    const taken = useMemo(() => new Set(ids), [ids]);

    const available = useMemo(() => {
        const filtered = leaves.filter((l) => !taken.has(l.id));
        if (!search) return filtered;
        const q = search.toLowerCase();
        return filtered.filter((l) =>
            l.id.toLowerCase().includes(q) ||
            (l.label || '').toLowerCase().includes(q),
        );
    }, [leaves, taken, search]);

    const add = (leaf) => {
        onChange?.([...ids, leaf.id]);
    };

    const remove = (idx) => {
        const next = ids.filter((_, i) => i !== idx);
        onChange?.(next);
    };

    const move = (idx, dir) => {
        const target = idx + dir;
        if (target < 0 || target >= ids.length) return;
        const next = [...ids];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange?.(next);
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Capas que se activarán al hacer click en este subtema.
                </Text>
                <Button size="small" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} disabled={disabled || loading}>
                    Agregar capa
                </Button>
            </Space>

            {ids.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin capas" style={{ margin: 0 }} />
            ) : (
                <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                    {ids.map((id, idx) => {
                        const meta = byId.get(id);
                        return (
                            <Space key={id} style={{ justifyContent: 'space-between', width: '100%' }}>
                                <Space size={4}>
                                    {meta ? (
                                        <Tag color="blue">{meta.label} <span style={{ opacity: 0.6 }}>({id})</span></Tag>
                                    ) : (
                                        <Tag color="red">{id} (no existe)</Tag>
                                    )}
                                </Space>
                                <Space size={2}>
                                    <Button size="small" icon={<ArrowUpOutlined />} disabled={disabled || idx === 0} onClick={() => move(idx, -1)} />
                                    <Button size="small" icon={<ArrowDownOutlined />} disabled={disabled || idx === ids.length - 1} onClick={() => move(idx, 1)} />
                                    <Button size="small" danger icon={<DeleteOutlined />} disabled={disabled} onClick={() => remove(idx)} />
                                </Space>
                            </Space>
                        );
                    })}
                </Space>
            )}

            <Modal
                title="Agregar capa al subtema"
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={720}
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Input.Search
                        placeholder="Buscar por id, label o layer"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                    />
                    <Table
                        rowKey="id"
                        size="small"
                        columns={[
                            { title: 'Capa', dataIndex: 'label', key: 'label' },
                            { title: 'ID', dataIndex: 'id', key: 'id', render: (v) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                            {
                                title: '',
                                key: 'add',
                                width: 80,
                                render: (_, r) => (
                                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => add(r)}>
                                        Agregar
                                    </Button>
                                ),
                            },
                        ]}
                        dataSource={available}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                    />
                </Space>
            </Modal>
        </Space>
    );
}
