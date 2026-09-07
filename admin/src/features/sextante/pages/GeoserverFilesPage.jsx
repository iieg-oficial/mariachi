import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Layout,
    Tabs,
    Typography,
} from 'antd';
import {
    FileTextOutlined,
    GlobalOutlined,
    PictureOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import {
    browseGeoserverFiles,
    buildGeoserverFolderZipUrl,
    deleteGeoserverFile,
    listGeoserverWorkspaces,
    searchGeoserverFiles,
} from '@features/sextante/api/geoserverFilesService';
import FileUploadModal from '@features/sextante/components/FileUploadModal';
import SldSnippetModal from '@features/sextante/components/SldSnippetModal';
import GeoserverFilesContent from '@features/sextante/components/GeoserverFilesContent';
import GeoserverFilesModals from '@features/sextante/components/GeoserverFilesModals';
import GeoserverPathBreadcrumb from '@features/sextante/components/GeoserverPathBreadcrumb';
import GeoserverFilesToolbar from '@features/sextante/components/GeoserverFilesToolbar';
import MosaicActions from '@features/sextante/components/MosaicActions';
import useGeoserverFileActions from '@features/sextante/hooks/useGeoserverFileActions';
import useGeoserverSelection from '@features/sextante/hooks/useGeoserverSelection';
import { promptNewFolder } from '@features/sextante/components/newFolderPrompt';
import {
    RASTER_ROOT,
    RASTER_SCOPE,
    SEARCH_DEBOUNCE_MS,
    WORKSPACE_STORAGE_KEY,
    basename,
    workspaceLabel,
} from '@features/sextante/utils/geoserverFiles';
import PageHeading from '@shared/components/PageHeading';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Text } = Typography;

const VIEW_STORAGE_KEY = 'mapalab.geoserverFiles.viewMode';


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
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem(VIEW_STORAGE_KEY) || 'grid'; }
        catch { return 'grid'; }
    });
    const { isMobile } = useIsMobile();
    const searchTimer = useRef(null);
    const selection = useGeoserverSelection();

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

    const { clear: clearSelection } = selection;
    const actions = useGeoserverFileActions({
        selected: selection.selected,
        onChanged: reload,
        onClearSelection: clearSelection,
    });

    useEffect(() => { reload(); }, [reload]);

    useEffect(() => { clearSelection(); }, [currentPath, workspace, clearSelection]);

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

    const handleViewModeChange = (next) => {
        setViewMode(next);
        try { localStorage.setItem(VIEW_STORAGE_KEY, next); } catch { /* noop */ }
    };

    const handleNewFolder = () => {
        promptNewFolder(currentPath, (fullPath) => {
            setPendingFolders((prev) => [...new Set([...prev, fullPath])]);
            setCurrentPath(fullPath);
        });
    };

    const tabItems = useMemo(() => [
        {
            key: '__global__',
            label: <span><GlobalOutlined /> Global <span style={{ color: '#999', fontSize: 11 }}>(styles/)</span></span>,
        },
        {
            key: RASTER_SCOPE,
            label: <span><PictureOutlined /> Rásters <span style={{ color: '#999', fontSize: 11 }}>({RASTER_ROOT}/)</span></span>,
        },
        ...workspaces.map((w) => ({
            key: w.geoserverWorkspace,
            label: (
                <span>
                    {w.geoserverWorkspace}
                    {w.alias && w.alias !== w.geoserverWorkspace
                        && <span style={{ color: '#999', fontSize: 11 }}> ({w.alias})</span>}
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

    const gridMinWidth = isMobile ? 140 : 180;
    const downloadZip = (path) => window.open(buildGeoserverFolderZipUrl(path, workspace), '_blank');


    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <PageHeading
                icon={<FileTextOutlined />}
                title="Recursos GeoServer"
                description={
                    <>
                        Imágenes, fuentes y <Text code>.properties</Text> en <Text code>{destinationLabel}</Text>, sin
                        límite de tamaño. Los SLD del mismo ámbito los referencian con{' '}
                        <Text code>xlink:href="ruta/archivo.ext"</Text>; los <Text code>.properties</Text> configuran
                        los ImageMosaic.
                    </>
                }
                extra={
                    <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading || isSearchMode} />
                }
            />

            <Card>
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column-reverse' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 8,
                    marginBottom: 12,
                }}>
                    {currentPath
                        ? <GeoserverPathBreadcrumb currentPath={currentPath} onNavigate={setCurrentPath} />
                        : <span />}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {visibleFolders.length} carpeta(s) · {data.files.length} archivo(s)
                    </Text>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={handleWorkspaceChange}
                    items={tabItems}
                    size="small"
                    tabBarStyle={{ marginBottom: 4 }}
                />

                <GeoserverFilesToolbar
                    isMobile={isMobile}
                    search={search}
                    onSearchChange={setSearch}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    disabled={isSearchMode}
                    onNewFolder={handleNewFolder}
                    onUpload={() => setUploadOpen(true)}
                    editMode={selection.editMode}
                    onToggleEditMode={selection.toggleEditMode}
                    selectedCount={selection.count}
                    onBulkMove={actions.startMove}
                    onBulkDelete={actions.bulkDelete}
                    extraActions={(
                        <MosaicActions
                            workspace={workspace}
                            currentPath={currentPath}
                            onDone={reload}
                        />
                    )}
                />

                {error && <Alert type="error" showIcon closable title={error} style={{ marginBottom: 12 }} />}

                <GeoserverFilesContent
                    viewMode={viewMode}
                    gridMinWidth={gridMinWidth}
                    loading={loading}
                    searchMode={isSearchMode}
                    searching={searching}
                    searchResults={searchResults}
                    folders={visibleFolders}
                    files={data.files}
                    currentPath={currentPath}
                    deletingName={deletingName}
                    onOpenFolder={setCurrentPath}
                    onDownloadZip={downloadZip}
                    onSnippet={setSnippetFile}
                    onDelete={handleDelete}
                    editMode={selection.editMode && !isSearchMode}
                    isSelected={selection.isSelected}
                    onToggleSelect={selection.toggle}
                    onReplaceSelection={selection.replace}
                    onRename={actions.startRename}
                    onDeleteFolder={actions.startDeleteFolder}
                />
            </Card>

            <GeoserverFilesModals
                actions={actions}
                workspace={workspace}
                selected={selection.selected}
            />

            <FileUploadModal
                open={uploadOpen}
                currentPath={currentPath}
                workspace={workspace}
                destinationLabel={destinationLabel}
                onClose={() => setUploadOpen(false)}
                onUploaded={(results) => {
                    const names = (results || []).map((r) => r.name);
                    setPendingFolders((prev) => prev.filter((p) => !names.some((n) => n.startsWith(`${p}/`))));
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
