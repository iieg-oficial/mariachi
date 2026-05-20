import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Breadcrumb,
    Button,
    Card,
    Empty,
    Input,
    Layout,
    Modal,
    Popconfirm,
    Space,
    Spin,
    Tooltip,
    Typography,
} from 'antd';
import {
    CodeOutlined,
    DeleteOutlined,
    FileImageOutlined,
    FolderAddOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    HomeOutlined,
    PlusOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import {
    browseGeoserverFiles,
    deleteGeoserverFile,
} from '@features/mapalab-geoserver-files/api/geoserverFilesService';
import FileUploadModal from '@features/mapalab-geoserver-files/components/FileUploadModal';
import SldSnippetModal from '@features/mapalab-geoserver-files/components/SldSnippetModal';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const PREVIEWABLE_EXT = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
const FOLDER_NAME_RE = /^[a-zA-Z0-9._-]+$/;

const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
const isPreviewable = (name) => PREVIEWABLE_EXT.includes(extOf(name));
const basename = (path) => path.split('/').filter(Boolean).pop() || '';


export default function GeoserverFilesPage() {
    const [currentPath, setCurrentPath] = useState('');
    const [pendingFolders, setPendingFolders] = useState([]);
    const [data, setData] = useState({ path: '', folders: [], files: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [snippetFile, setSnippetFile] = useState(null);
    const [deletingName, setDeletingName] = useState(null);
    const { isMobile } = useIsMobile();

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await browseGeoserverFiles(currentPath);
            setData(result);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar archivos');
        } finally {
            setLoading(false);
        }
    }, [currentPath]);

    useEffect(() => { reload(); }, [reload]);

    useEffect(() => { setSearch(''); }, [currentPath]);

    const handleDelete = async (name) => {
        setDeletingName(name);
        try {
            await deleteGeoserverFile(name);
            message.success(`Eliminado: ${basename(name)}`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setDeletingName(null);
        }
    };

    const handleNewFolder = () => {
        let name = '';
        Modal.confirm({
            title: 'Nueva carpeta',
            content: (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        La carpeta se crea cuando subas el primer archivo dentro.
                    </Text>
                    <Input
                        placeholder="Ej. tiff"
                        maxLength={60}
                        onChange={(e) => { name = e.target.value.trim(); }}
                    />
                </Space>
            ),
            okText: 'Crear y entrar',
            cancelText: 'Cancelar',
            onOk: () => {
                if (!name || !FOLDER_NAME_RE.test(name)) {
                    message.error('Nombre inválido: solo letras, números, guion, guion bajo y punto');
                    return Promise.reject(new Error('invalid'));
                }
                const fullPath = currentPath ? `${currentPath}/${name}` : name;
                setPendingFolders((prev) => [...new Set([...prev, fullPath])]);
                setCurrentPath(fullPath);
                return Promise.resolve();
            },
        });
    };

    const visibleFolders = useMemo(() => {
        const seen = new Set(data.folders.map((f) => f.path));
        const extras = pendingFolders
            .filter((p) => {
                const parent = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
                return parent === currentPath && !seen.has(p);
            })
            .map((p) => ({ name: basename(p), path: p, pending: true }));
        const folders = [...data.folders, ...extras];
        return search
            ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
            : folders;
    }, [data.folders, pendingFolders, currentPath, search]);

    const visibleFiles = useMemo(
        () => (
            search
                ? data.files.filter((f) => basename(f.name).toLowerCase().includes(search.toLowerCase()))
                : data.files
        ),
        [data.files, search],
    );

    const crumbs = useMemo(() => {
        const items = [{ title: <span><HomeOutlined /> Raíz</span>, onClick: () => setCurrentPath('') }];
        if (currentPath) {
            const segments = currentPath.split('/');
            let acc = '';
            for (const seg of segments) {
                acc = acc ? `${acc}/${seg}` : seg;
                const target = acc;
                items.push({ title: seg, onClick: () => setCurrentPath(target) });
            }
        }
        return items;
    }, [currentPath]);

    const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0;

    return (
        <Content style={{ padding: isMobile ? 12 : 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>Recursos GeoServer</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 720 }}>
                            Archivos (SVG, PNG, JPG, WebP, GIF, TIFF) disponibles en <Text code>geoserver_data/styles/</Text>.
                            Los analistas referencian estos archivos desde sus SLDs en GeoServer Web Admin con{' '}
                            <Text code>xlink:href="ruta/archivo.ext"</Text>.
                        </Paragraph>
                    </div>
                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading} />
                        <Button icon={<FolderAddOutlined />} onClick={handleNewFolder}>Nueva carpeta</Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setUploadOpen(true)}
                        >
                            Subir archivo
                        </Button>
                    </Space>
                </div>

                <Breadcrumb
                    items={crumbs.map((c, idx) => ({
                        title: idx === crumbs.length - 1
                            ? <Text strong>{c.title}</Text>
                            : <a onClick={c.onClick}>{c.title}</a>,
                    }))}
                />

                {error && <Alert type="error" showIcon closable message={error} />}

                <Input.Search
                    allowClear
                    placeholder="Buscar en esta carpeta"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 360 }}
                />

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
                ) : isEmpty ? (
                    <Empty
                        description={
                            currentPath
                                ? `La carpeta "${currentPath}" está vacía. Sube un archivo o crea una subcarpeta.`
                                : 'No hay archivos ni carpetas en la raíz. Empieza con "Subir archivo" o "Nueva carpeta".'
                        }
                    />
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 : 180}px, 1fr))`,
                            gap: 12,
                        }}
                    >
                        {visibleFolders.map((f) => (
                            <Card
                                key={`folder-${f.path}`}
                                size="small"
                                hoverable
                                onClick={() => setCurrentPath(f.path)}
                                styles={{ body: { padding: 8 } }}
                            >
                                <div
                                    style={{
                                        height: 100,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#fffbe6',
                                        border: '1px dashed #faad14',
                                        borderRadius: 4,
                                        marginBottom: 6,
                                        gap: 4,
                                    }}
                                >
                                    <FolderOpenOutlined style={{ fontSize: 36, color: '#faad14' }} />
                                    {f.pending && (
                                        <Text type="warning" style={{ fontSize: 10 }}>(pendiente)</Text>
                                    )}
                                </div>
                                <Tooltip title={f.path}>
                                    <Text ellipsis style={{ display: 'block', fontSize: 12 }}>
                                        <FolderOutlined style={{ marginRight: 4 }} />
                                        {f.name}
                                    </Text>
                                </Tooltip>
                            </Card>
                        ))}
                        {visibleFiles.map((f) => (
                            <Card
                                key={`file-${f.name}`}
                                size="small"
                                hoverable
                                styles={{ body: { padding: 8 } }}
                            >
                                <div
                                    style={{
                                        height: 100,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#fafafa',
                                        border: '1px dashed #f0f0f0',
                                        borderRadius: 4,
                                        marginBottom: 6,
                                        overflow: 'hidden',
                                        gap: 4,
                                    }}
                                >
                                    {isPreviewable(f.name) ? (
                                        <img
                                            src={f.downloadUrl}
                                            alt={basename(f.name)}
                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <>
                                            <FileImageOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                                            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                                                {extOf(f.name)}
                                            </Text>
                                        </>
                                    )}
                                </div>
                                <Tooltip title={f.name}>
                                    <Text ellipsis style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>
                                        {basename(f.name)}
                                    </Text>
                                </Tooltip>
                                <Space size={4} style={{ width: '100%', justifyContent: 'space-between' }}>
                                    <Tooltip title="Ver snippet SLD">
                                        <Button
                                            size="small"
                                            icon={<CodeOutlined />}
                                            onClick={() => setSnippetFile(f)}
                                        />
                                    </Tooltip>
                                    <Popconfirm
                                        title="¿Eliminar este archivo?"
                                        description="Si algún SLD lo está usando, dejará de renderearse."
                                        okText="Eliminar"
                                        okButtonProps={{ danger: true }}
                                        cancelText="Cancelar"
                                        onConfirm={() => handleDelete(f.name)}
                                    >
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            loading={deletingName === f.name}
                                        />
                                    </Popconfirm>
                                </Space>
                            </Card>
                        ))}
                    </div>
                )}
            </Space>

            <FileUploadModal
                open={uploadOpen}
                currentPath={currentPath}
                onClose={() => setUploadOpen(false)}
                onUploaded={(result) => {
                    setPendingFolders((prev) => prev.filter((p) => !result.name.startsWith(`${p}/`)));
                    reload();
                }}
            />
            <SldSnippetModal
                open={snippetFile != null}
                file={snippetFile}
                onClose={() => setSnippetFile(null)}
            />
        </Content>
    );
}
