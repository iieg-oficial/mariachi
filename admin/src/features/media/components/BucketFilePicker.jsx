import { useEffect, useState } from 'react';
import { Modal, Table, Tabs, Input, Space, Typography, message } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { listBucketObjects } from '@features/media/api/mediaService';

const { Text } = Typography;

export default function BucketFilePicker({ open, onClose, onSelect, bucketId, prefixes = [''], title = 'Seleccionar archivo' }) {
    const [activePrefix, setActivePrefix] = useState(prefixes[0] || '');
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!open || !bucketId) return;
        let cancelled = false;
        listBucketObjects(bucketId, activePrefix)
            .then((data) => { if (!cancelled) setObjects(data); })
            .catch(() => message.error('No se pudieron listar los archivos del bucket'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, bucketId, activePrefix]);

    const filtered = search
        ? objects.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
        : objects;

    const columns = [
        {
            title: 'Archivo',
            dataIndex: 'name',
            key: 'name',
            render: (name) => {
                const basename = name.split('/').pop();
                return (
                    <Space direction="vertical" size={0}>
                        <Text strong>{basename}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{name}</Text>
                    </Space>
                );
            },
        },
        {
            title: 'Tamaño',
            dataIndex: 'size',
            key: 'size',
            width: 100,
            render: (size) => {
                if (!size) return '—';
                const kb = size / 1024;
                return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
            },
        },
        {
            title: 'Modificado',
            dataIndex: 'last_modified',
            key: 'last_modified',
            width: 160,
            render: (d) => (d ? new Date(d).toLocaleString('es-MX') : '—'),
        },
    ];

    const tabItems = prefixes.map((p) => ({
        key: p || '(root)',
        label: p ? p.replace(/\/$/, '') : 'Raíz',
    }));

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            footer={null}
            width={720}
        >
            {prefixes.length > 1 && (
                <Tabs
                    activeKey={activePrefix || '(root)'}
                    onChange={(k) => setActivePrefix(k === '(root)' ? '' : k)}
                    items={tabItems}
                />
            )}
            <Input.Search
                placeholder="Buscar por nombre"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 12 }}
                allowClear
            />
            <Table
                columns={columns}
                dataSource={filtered}
                rowKey="name"
                loading={loading}
                size="small"
                pagination={{ pageSize: 10, simple: true }}
                onRow={(record) => ({
                    onClick: () => {
                        const basename = record.name.split('/').pop();
                        onSelect({
                            nombre: basename,
                            enlace: `/${record.name.startsWith('/') ? record.name.slice(1) : record.name}`,
                            url: record.url,
                        });
                        onClose();
                    },
                    style: { cursor: 'pointer' },
                })}
                locale={{
                    emptyText: (
                        <Space direction="vertical" align="center" style={{ padding: 24 }}>
                            <FolderOpenOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
                            <Text type="secondary">El bucket está vacío en este prefijo</Text>
                        </Space>
                    ),
                }}
            />
        </Modal>
    );
}
