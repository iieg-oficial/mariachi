import { useEffect, useMemo, useState } from 'react';
import { Modal, Pagination, Table, Tabs, Input, Space, Typography, Empty, Spin } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import { listBucketObjects } from '@features/media/api/mediaService';
import { message } from '@shared/services/message';

const { Text } = Typography;

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i;

export default function BucketFilePicker({ open, onClose, onSelect, bucketId, prefixes, mode = 'list', title = 'Seleccionar archivo' }) {
    const [activePrefix, setActivePrefix] = useState('');
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => { setPage(1); }, [search, activePrefix]);

    useEffect(() => {
        if (!open || !bucketId) return;
        let cancelled = false;
        setLoading(true);
        listBucketObjects(bucketId, '')
            .then((data) => { if (!cancelled) setObjects(data); })
            .catch(() => message.error('No se pudieron listar los archivos del bucket'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, bucketId]);

    const effectivePrefixes = useMemo(() => {
        if (Array.isArray(prefixes) && prefixes.length > 0) return prefixes;
        const set = new Set(['']);
        for (const o of objects) {
            const idx = o.name.indexOf('/');
            if (idx > 0) set.add(o.name.slice(0, idx + 1));
        }
        return Array.from(set).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
    }, [prefixes, objects]);

    useEffect(() => {
        if (effectivePrefixes.length && !effectivePrefixes.includes(activePrefix)) {
            setActivePrefix(effectivePrefixes[0]);
        }
    }, [effectivePrefixes, activePrefix]);

    const scopedObjects = useMemo(() => (
        activePrefix ? objects.filter((o) => o.name.startsWith(activePrefix)) : objects
    ), [objects, activePrefix]);

    const filtered = useMemo(() => (
        search ? scopedObjects.filter((o) => o.name.toLowerCase().includes(search.toLowerCase())) : scopedObjects
    ), [search, scopedObjects]);

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const columns = [
        {
            title: 'Archivo',
            dataIndex: 'name',
            key: 'name',
            render: (name) => {
                const basename = name.split('/').pop();
                return (
                    <Space orientation="vertical" size={0} style={{ width: '100%' }}>
                        <Text strong style={{ wordBreak: 'break-all' }}>{basename}</Text>
                        <Text type="secondary" style={{ fontSize: 11, wordBreak: 'break-all' }}>{name}</Text>
                    </Space>
                );
            },
        },
        {
            title: 'Tamaño',
            dataIndex: 'size',
            key: 'size',
            width: 90,
            align: 'right',
            responsive: ['sm'],
            render: (size) => {
                if (!size) return '—';
                const kb = size / 1024;
                return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
            },
        },
    ];

    const tabItems = effectivePrefixes.map((p) => ({
        key: p || '(root)',
        label: p ? p.replace(/\/$/, '') : 'Todo',
    }));

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            footer={null}
            width="95%"
            centered
            styles={{ body: { padding: 0, height: 'calc(95vh - 56px)' } }}
            destroyOnHidden
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 11,
                    background: '#fff',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                }}>
                    {effectivePrefixes.length > 1 && (
                        <Tabs
                            activeKey={activePrefix || '(root)'}
                            onChange={(k) => setActivePrefix(k === '(root)' ? '' : k)}
                            items={tabItems}
                            size="small"
                            style={{ marginBottom: 8 }}
                        />
                    )}
                    <Input.Search
                        placeholder="Buscar por nombre"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        allowClear
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px' }}>
                    {mode === 'grid' ? (
                        loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                                <Spin />
                            </div>
                        ) : paginated.length === 0 ? (
                            <Empty
                                image={<FolderOpenOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />}
                                description={<Text type="secondary">Sin archivos en esta carpeta</Text>}
                                style={{ padding: 48 }}
                            />
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: 12,
                                padding: '12px 0',
                            }}>
                                {paginated.map((record) => {
                                    const basename = record.name.split('/').pop();
                                    const isImage = IMAGE_EXTENSIONS.test(basename);
                                    return (
                                        <button
                                            key={record.name}
                                            type="button"
                                            onClick={() => {
                                                onSelect({
                                                    nombre: basename,
                                                    enlace: `/${record.name.startsWith('/') ? record.name.slice(1) : record.name}`,
                                                    url: record.url,
                                                });
                                                onClose();
                                            }}
                                            style={{
                                                border: '1px solid #f0f0f0',
                                                borderRadius: 8,
                                                background: '#fff',
                                                padding: 8,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 6,
                                                transition: 'border-color .15s, box-shadow .15s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#1890ff';
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#f0f0f0';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}
                                        >
                                            <div style={{
                                                width: '100%',
                                                aspectRatio: '1 / 1',
                                                background: '#fafafa',
                                                borderRadius: 6,
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                {isImage && record.url ? (
                                                    <img
                                                        src={record.url}
                                                        alt={basename}
                                                        loading="lazy"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <FolderOpenOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                                                )}
                                            </div>
                                            <Text style={{ fontSize: 11, textAlign: 'center', wordBreak: 'break-all' }} ellipsis={{ tooltip: basename }}>
                                                {basename}
                                            </Text>
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={paginated}
                            rowKey="name"
                            loading={loading}
                            size="small"
                            sticky={{ offsetHeader: 0 }}
                            pagination={false}
                            tableLayout="fixed"
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
                                    <Space orientation="vertical" align="center" style={{ padding: 24 }}>
                                        <FolderOpenOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
                                        <Text type="secondary">Sin archivos en esta carpeta</Text>
                                    </Space>
                                ),
                            }}
                        />
                    )}
                </div>

                {filtered.length > 0 && (
                    <div style={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 11,
                        background: '#fff',
                        padding: '8px 16px',
                        borderTop: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                    }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {filtered.length} archivo{filtered.length === 1 ? '' : 's'}
                        </Text>
                        <Pagination
                            current={page}
                            pageSize={pageSize}
                            total={filtered.length}
                            onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
                            showSizeChanger
                            pageSizeOptions={[10, 25, 50, 100]}
                            size="small"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
}
