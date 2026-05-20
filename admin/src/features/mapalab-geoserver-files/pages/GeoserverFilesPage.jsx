import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Tabs,
    Tag,
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
    GlobalOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import {
    browseGeoserverFiles,
    deleteGeoserverFile,
    listGeoserverWorkspaces,
    searchGeoserverFiles,
} from '@features/mapalab-geoserver-files/api/geoserverFilesService';
import FileUploadModal from '@features/mapalab-geoserver-files/components/FileUploadModal';
import SldSnippetModal from '@features/mapalab-geoserver-files/components/SldSnippetModal';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const PREVIEWABLE_EXT = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
const FOLDER_NAME_RE = /^[a-zA-Z0-9._-]+$/;
const WORKSPACE_STORAGE_KEY = 'mapalab.geoserverFiles.workspace';
const SEARCH_DEBOUNCE_MS = 350;

const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
const isPreviewable = (name) => PREVIEWABLE_EXT.includes(extOf(name));
const basename = (path) => path.split('/').filter(Boolean).pop() || '';
const workspaceLabel = (ws) => ws ? `workspaces/${ws}/styles/` : 'styles/';


export default function GeoserverFilesPage() {
    const [workspace, setWorkspace] = useState(() => {
        try { return localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''; }
        catch { return ''; }
    });
    const [workspaces, setWorkspaces] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [pendingFolders, setPendingFolders] = useState([]);
    const [data, setData] = useState({ path: '', workspace: null, folders: [], files: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [snippetFile, setSnippetFile] = useState(null);
    const [deletingName, setDeletingName] = useState(null);
    const { isMobile } = useIsMobile();
    const searchTimer = useRef(null);

    const refreshWorkspaces = useCallback(async () => {
        try {
            const items = await listGeoserverWorkspaces();
            setWorkspaces(items.filter((w) => w.registered));
        } catch { /* keep stale list */ }
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await browseGeoserverFiles(currentPath, workspace);
            setData(result);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar archivos');
        } finally {
            setLoading(false);
        }
        refreshWorkspaces();
    }, [currentPath, workspace, refreshWorkspaces]);

    useEffect(() => { reload(); }, [reload]);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!search.trim()) {
            setSearchResults(null);
            return;
        }
        setSearching(true);
        searchTimer.current = setTimeout(() => {
            searchGeoserverFiles(search.trim())
                .then((res) => setSearchResults(res))
                .catch((err) => {
                    setSearchResults(null);
                    message.error(err?.response?.data?.detail || 'Error al buscar');
                })
                .finally(() => setSearching(false));
        }, SEARCH_DEBOUNCE_MS);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    const handleWorkspaceChange = (next) => {
        const ws = next === '__global__' ? '' : next;
        setWorkspace(ws);
        setCurrentPath('');
        setPendingFolders([]);
        try { localStorage.setItem(WORKSPACE_STORAGE_KEY, ws); } catch { /* noop */ }
    };

    const handleDelete = async (name, fromWorkspace) => {
        const ws = fromWorkspace !== undefined ? fromWorkspace : workspace;
        setDeletingName(name);
        try {
            await deleteGeoserverFile(name, ws);
            message.success(`Eliminado: ${basename(name)}`);
            if (searchResults) {
                setSearchResults((prev) => prev && ({
                    ...prev,
                    results: prev.results.filter((f) => !(f.name === name && (f.workspace || '') === (ws || ''))),
                }));
            } else {
                await reload();
            }
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

    const tabItems = useMemo(() => [
        {
            key: '__global__',
            label: (
                <span><GlobalOutlined /> Global <span style={{ color: '#999', fontSize: 11 }}>(styles/)</span></span>
            ),
        },
        ...workspaces.map((w) => ({
            key: w.geoserverWorkspace,
            label: (
                <span>
                    {w.geoserverWorkspace}
                    {w.alias && w.alias !== w.geoserverWorkspace && (
                        <span style={{ color: '#999', fontSize: 11 }}> ({w.alias})</span>
                    )}
                </span>
            ),
        })),
    ], [workspaces]);

    const activeTab = workspace || '__global__';
    const destinationLabel = workspaceLabel(workspace);
    const isSearchMode = Boolean(search.trim());

    const visibleFolders = useMemo(() => {
        const seen = new Set(data.folders.map((f) => f.path));
        const extras = pendingFolders
            .filter((p) => {
                const parent = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
                return parent === currentPath && !seen.has(p);
            })
            .map((p) => ({ name: basename(p), path: p, pending: true }));
        return [...data.folders, ...extras];
    }, [data.folders, pendingFolders, currentPath]);

    const crumbs = useMemo(() => {
        const items = [{ title: 'Raíz', onClick: () => setCurrentPath('') }];
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

    const renderFileCard = (f, fromSearch = false) => {
        const fileWorkspace = f.workspace || '';
        const displayPath = fromSearch
            ? `${workspaceLabel(fileWorkspace)}${f.name}`
            : f.name;
        return (
            <Card
                key={`file-${fileWorkspace}-${f.name}`}
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
                {fromSearch && (
                    <Tag color={fileWorkspace ? 'blue' : 'default'} style={{ marginBottom: 4, fontSize: 10 }}>
                        {fileWorkspace ? fileWorkspace : 'global'}
                    </Tag>
                )}
                <Tooltip title={displayPath}>
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
                        onConfirm={() => handleDelete(f.name, fileWorkspace)}
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
        );
    };

    const renderBrowseGrid = () => {
        const isEmpty = visibleFolders.length === 0 && data.files.length === 0;
        if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
        if (isEmpty) {
            return (
                <Empty
                    description={
                        currentPath
                            ? `La carpeta "${currentPath}" está vacía. Sube un archivo o crea una subcarpeta.`
                            : 'No hay archivos ni carpetas aquí. Empieza con "Subir archivo" o "Nueva carpeta".'
                    }
                />
            );
        }
        return (
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
                {data.files.map((f) => renderFileCard(f, false))}
            </div>
        );
    };

    const renderSearchResults = () => {
        if (searching) return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;
        if (!searchResults) return null;
        if (searchResults.results.length === 0) {
            return <Empty description={`Sin coincidencias para "${searchResults.query}"`} />;
        }
        return (
            <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {searchResults.results.length} resultado(s){searchResults.truncated && ' (mostrando primeros 500)'} para "{searchResults.query}"
                </Text>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 140 : 180}px, 1fr))`,
                        gap: 12,
                    }}
                >
                    {searchResults.results.map((f) => renderFileCard(f, true))}
                </div>
            </>
        );
    };

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>Recursos GeoServer</Title>
                        <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 720 }}>
                            Archivos (SVG, PNG, JPG, WebP, GIF, TIFF) disponibles en <Text code>{destinationLabel}</Text>.
                            Los analistas referencian estos archivos desde sus SLDs del mismo ámbito con{' '}
                            <Text code>xlink:href="ruta/archivo.ext"</Text>.
                        </Paragraph>
                    </div>
                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading || isSearchMode} />
                        <Button icon={<FolderAddOutlined />} onClick={handleNewFolder} disabled={isSearchMode}>
                            Nueva carpeta
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setUploadOpen(true)}
                            disabled={isSearchMode}
                        >
                            Subir archivo
                        </Button>
                    </Space>
                </div>

                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Buscar en todos los recursos GeoServer (global + workspaces)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="large"
                />

                {error && <Alert type="error" showIcon closable message={error} />}

                {isSearchMode ? (
                    renderSearchResults()
                ) : (
                    <>
                        <Tabs
                            activeKey={activeTab}
                            onChange={handleWorkspaceChange}
                            items={tabItems}
                            size="small"
                            tabBarStyle={{ marginBottom: 0 }}
                        />

                        {currentPath && (
                            <Breadcrumb
                                items={crumbs.map((c, idx) => ({
                                    title: idx === crumbs.length - 1
                                        ? <Text strong>{c.title}</Text>
                                        : <a onClick={c.onClick}>{c.title}</a>,
                                }))}
                            />
                        )}

                        {renderBrowseGrid()}
                    </>
                )}
            </Space>

            <FileUploadModal
                open={uploadOpen}
                currentPath={currentPath}
                workspace={workspace}
                destinationLabel={destinationLabel}
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
