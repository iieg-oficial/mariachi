import { useEffect, useMemo, useState } from 'react';
import { Modal, Pagination, Segmented, Select, Tabs, Input, Typography, Button } from 'antd';
import { AppstoreOutlined, CloudUploadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { listBucketObjects } from '@features/acervo/api/acervoService';
import useAccessibleBuckets from '@features/acervo/hooks/useAccessibleBuckets';
import BucketFileUploader from '@features/acervo/components/BucketFileUploader';
import BucketFileGrid from '@features/acervo/components/BucketFileGrid';
import BucketFileList from '@features/acervo/components/BucketFileList';
import { message } from '@shared/services/message';

const { Text } = Typography;
const VIEW_MODE_KEY = 'mariachi.bucketFilePicker.viewMode';

function loadViewMode(fallback) {
    if (typeof window === 'undefined') return fallback;
    try { return window.localStorage.getItem(VIEW_MODE_KEY) || fallback; } catch { return fallback; }
}

export default function BucketFilePicker({
    open,
    onClose,
    onSelect,
    bucketId,
    bucketSlugs,
    prefixes,
    mode,
    title = 'Seleccionar archivo',
    allowUpload = true,
    uploadAccept,
}) {
    const { buckets: accessibleBuckets, loading: bucketsLoading } = useAccessibleBuckets(bucketSlugs);

    const [activeBucketId, setActiveBucketId] = useState(bucketId ?? null);
    const [viewMode, setViewMode] = useState(() => mode || loadViewMode('grid'));
    const [activePrefix, setActivePrefix] = useState('');
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [uploaderOpen, setUploaderOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        if (mode) return;
        try { window.localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
    }, [viewMode, mode]);

    useEffect(() => { setPage(1); }, [search, activePrefix, activeBucketId]);

    useEffect(() => {
        if (bucketId != null) {
            setActiveBucketId(bucketId);
            return;
        }
        if (accessibleBuckets.length > 0) {
            setActiveBucketId((prev) => {
                if (prev != null && accessibleBuckets.some((b) => b.id === prev)) return prev;
                return accessibleBuckets[0].id;
            });
        } else {
            setActiveBucketId(null);
        }
    }, [bucketId, accessibleBuckets]);

    useEffect(() => {
        if (!open || !activeBucketId) return;
        let cancelled = false;
        setLoading(true);
        listBucketObjects(activeBucketId, '')
            .then((data) => { if (!cancelled) setObjects(data); })
            .catch(() => message.error('No se pudieron listar los archivos del bucket'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, activeBucketId, reloadKey]);

    const activeBucket = useMemo(
        () => accessibleBuckets.find((b) => b.id === activeBucketId) || null,
        [accessibleBuckets, activeBucketId],
    );
    const showBucketSelector = !bucketId && accessibleBuckets.length > 1;

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

    const filtered = useMemo(() => {
        const scoped = activePrefix ? objects.filter((o) => o.name.startsWith(activePrefix)) : objects;
        return search ? scoped.filter((o) => o.name.toLowerCase().includes(search.toLowerCase())) : scoped;
    }, [objects, activePrefix, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const tabItems = effectivePrefixes.map((p) => ({
        key: p || '(root)',
        label: p ? p.replace(/\/$/, '') : 'Todo',
    }));

    const handlePick = (record) => {
        const basename = record.name.split('/').pop();
        onSelect({
            nombre: basename,
            enlace: `/${record.name.startsWith('/') ? record.name.slice(1) : record.name}`,
            url: record.url,
            bucketId: activeBucketId,
        });
        onClose();
    };

    const handleUploaded = (uploaded) => {
        setUploaderOpen(false);
        setReloadKey((k) => k + 1);
        if (uploaded?.enlace) {
            const prefix = uploaded.enlace.replace(/^\//, '');
            const idx = prefix.indexOf('/');
            if (idx > 0) setActivePrefix(prefix.slice(0, idx + 1));
        }
    };

    const headerStyle = {
        position: 'sticky',
        top: 0,
        zIndex: 11,
        background: '#fff',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
    };
    const footerStyle = {
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
    };

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
                <div style={headerStyle}>
                    {showBucketSelector && (
                        <div style={{ marginBottom: 8 }}>
                            <Select
                                value={activeBucketId}
                                onChange={setActiveBucketId}
                                loading={bucketsLoading}
                                style={{ minWidth: 220 }}
                                options={accessibleBuckets.map((b) => ({
                                    value: b.id,
                                    label: b.display_name,
                                }))}
                            />
                        </div>
                    )}
                    {effectivePrefixes.length > 1 && (
                        <Tabs
                            activeKey={activePrefix || '(root)'}
                            onChange={(k) => setActivePrefix(k === '(root)' ? '' : k)}
                            items={tabItems}
                            size="small"
                            style={{ marginBottom: 8 }}
                        />
                    )}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Input.Search
                            placeholder="Buscar por nombre"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            allowClear
                            style={{ flex: '1 1 200px', minWidth: 160 }}
                        />
                        {allowUpload && (
                            <Button
                                icon={<CloudUploadOutlined />}
                                onClick={() => setUploaderOpen(true)}
                                disabled={!activeBucketId}
                            >
                                Subir
                            </Button>
                        )}
                        {!mode && (
                            <Segmented
                                value={viewMode}
                                onChange={setViewMode}
                                options={[
                                    { value: 'grid', icon: <AppstoreOutlined /> },
                                    { value: 'list', icon: <UnorderedListOutlined /> },
                                ]}
                            />
                        )}
                    </div>
                    {activeBucket && (
                        <div style={{ marginTop: 6 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Bucket: {activeBucket.display_name}
                            </Text>
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px' }}>
                    {viewMode === 'grid' ? (
                        <BucketFileGrid records={paginated} loading={loading} onPick={handlePick} />
                    ) : (
                        <BucketFileList records={paginated} loading={loading} onPick={handlePick} />
                    )}
                </div>

                {filtered.length > 0 && (
                    <div style={footerStyle}>
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

            {allowUpload && (
                <BucketFileUploader
                    open={uploaderOpen}
                    onClose={() => setUploaderOpen(false)}
                    onUploaded={handleUploaded}
                    bucketId={activeBucketId}
                    prefixes={effectivePrefixes.length ? effectivePrefixes : ['']}
                    title={activeBucket ? `Subir a ${activeBucket.display_name}` : 'Subir archivo'}
                    accept={uploadAccept}
                />
            )}
        </Modal>
    );
}
