import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb, Button, Input, Modal, Pagination, Segmented, Select, Typography } from 'antd';
import { AppstoreOutlined, CloudUploadOutlined, HomeOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { getAcervoFiles } from '@features/acervo/api/acervoService';
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
    mode,
    title = 'Seleccionar archivo',
    allowUpload = true,
    uploadAccept,
}) {
    const { buckets: accessibleBuckets, loading: bucketsLoading } = useAccessibleBuckets(bucketSlugs);

    const [activeBucketId, setActiveBucketId] = useState(bucketId ?? null);
    const [viewMode, setViewMode] = useState(() => mode || loadViewMode('grid'));
    const [currentPath, setCurrentPath] = useState('');
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

    useEffect(() => { setPage(1); }, [search, currentPath, activeBucketId]);

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
        if (currentPath !== '') setCurrentPath('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeBucketId]);

    useEffect(() => {
        if (!open || !activeBucketId) return;
        let cancelled = false;
        setLoading(true);
        getAcervoFiles({
            bucketId: activeBucketId,
            folder: currentPath || undefined,
            search: search || undefined,
            recursive: Boolean(search),
        })
            .then((data) => { if (!cancelled) setObjects(data || []); })
            .catch(() => message.error('No se pudieron listar los archivos del bucket'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, activeBucketId, currentPath, search, reloadKey]);

    const activeBucket = useMemo(
        () => accessibleBuckets.find((b) => b.id === activeBucketId) || null,
        [accessibleBuckets, activeBucketId],
    );
    const showBucketSelector = !bucketId && accessibleBuckets.length > 1;

    const sortedFiles = useMemo(() =>
        [...objects].sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return (a.originalName || a.name || '').localeCompare(b.originalName || b.name || '');
        }),
    [objects]);

    const breadcrumbItems = useMemo(() => {
        const linkStyle = { cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' };
        const items = [{
            title: (
                <button type="button" style={linkStyle} onClick={() => setCurrentPath('')}>
                    <HomeOutlined /> {activeBucket?.display_name || 'Raíz'}
                </button>
            ),
        }];
        if (currentPath) {
            const parts = currentPath.replace(/\/$/, '').split('/');
            let acc = '';
            parts.forEach((p, i) => {
                acc += `${p}/`;
                const path = acc;
                items.push({
                    title: i === parts.length - 1 ? p : (
                        <button type="button" style={linkStyle} onClick={() => setCurrentPath(path)}>{p}</button>
                    ),
                });
            });
        }
        return items;
    }, [currentPath, activeBucket]);

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedFiles.slice(start, start + pageSize);
    }, [sortedFiles, page, pageSize]);

    const handlePick = (record) => {
        const basename = record.originalName || record.name.split('/').pop();
        onSelect({
            nombre: basename,
            enlace: `/${record.name.startsWith('/') ? record.name.slice(1) : record.name}`,
            url: record.url,
            bucketId: activeBucketId,
        });
        onClose();
    };

    const handleEnterDir = (record) => {
        const cleanName = record.name.endsWith('/') ? record.name : `${record.name}/`;
        setCurrentPath(cleanName);
        setPage(1);
    };

    const handleUploaded = () => {
        setUploaderOpen(false);
        setReloadKey((k) => k + 1);
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
                    <div style={{ marginBottom: 8 }}>
                        <Breadcrumb items={breadcrumbItems} />
                    </div>
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
                        <BucketFileGrid records={paginated} loading={loading} onPick={handlePick} onEnterDir={handleEnterDir} />
                    ) : (
                        <BucketFileList records={paginated} loading={loading} onPick={handlePick} onEnterDir={handleEnterDir} />
                    )}
                </div>

                {sortedFiles.length > 0 && (
                    <div style={footerStyle}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {sortedFiles.length} elemento{sortedFiles.length === 1 ? '' : 's'}
                        </Text>
                        <Pagination
                            current={page}
                            pageSize={pageSize}
                            total={sortedFiles.length}
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
                    prefixes={currentPath ? [currentPath] : ['']}
                    title={activeBucket ? `Subir a ${activeBucket.display_name}` : 'Subir archivo'}
                    accept={uploadAccept}
                />
            )}
        </Modal>
    );
}
