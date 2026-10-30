import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Layout, Select, Typography } from 'antd';
import { ExclamationCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import {
    browseGeoserverFiles,
    buildGeoserverFolderZipUrl,
    deleteGeoserverFile,
    listGeoserverWorkspaces,
} from '@features/sextante/api/geoserverFilesService';
import FileUploadModal from '@features/sextante/components/FileUploadModal';
import GeoserverFilesContent from '@features/sextante/components/GeoserverFilesContent';
import GeoserverFilesModals from '@features/sextante/components/GeoserverFilesModals';
import GeoserverPathBreadcrumb from '@features/sextante/components/GeoserverPathBreadcrumb';
import GeoserverFilesToolbar from '@features/sextante/components/GeoserverFilesToolbar';
import MosaicActions from '@features/sextante/components/MosaicActions';
import ResetCachesButton from '@features/sextante/components/ResetCachesButton';
import useGeoserverFileActions from '@features/sextante/hooks/useGeoserverFileActions';
import useGeoserverSearch from '@features/sextante/hooks/useGeoserverSearch';
import useGeoserverSelection from '@features/sextante/hooks/useGeoserverSelection';
import { useOnUploaded } from '@features/sextante/hooks/useUploadQueue';
import { promptNewFolder } from '@features/sextante/components/newFolderPrompt';
import {
    RASTER_ROOT,
    RASTER_SCOPE,
    WORKSPACE_STORAGE_KEY,
    basename,
    workspaceLabel,
} from '@features/sextante/utils/geoserverFiles';
import PageHeading from '@shared/components/PageHeading';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Text } = Typography;

const GLOBAL_SCOPE = '__global__';
const AYUDA = 'Imágenes, fuentes y .properties sin límite de tamaño. Los SLD del mismo ámbito los '
    + 'referencian con xlink:href="ruta/archivo.ext"; los .properties configuran los ImageMosaic.';

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
    const [uploadOpen, setUploadOpen] = useState(false);
    const [deletingName, setDeletingName] = useState(null);
    const { isMobile } = useIsMobile();
    const selection = useGeoserverSelection();
    const search = useGeoserverSearch(workspace);

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

    useOnUploaded(workspace, (names) => {
        setPendingFolders((prev) => prev.filter((p) => !names.some((n) => n.startsWith(`${p}/`))));
        reload();
    });

    const handleWorkspaceChange = (next) => {
        const ws = next === GLOBAL_SCOPE ? '' : next;
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
            if (search.results) search.dropResult(name, ws);
            else await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setDeletingName(null);
        }
    };

    const handleNewFolder = () => {
        promptNewFolder(currentPath, (fullPath) => {
            setPendingFolders((prev) => [...new Set([...prev, fullPath])]);
            setCurrentPath(fullPath);
        });
    };

    const scopeOptions = useMemo(() => [
        { value: GLOBAL_SCOPE, label: 'Global · styles/' },
        { value: RASTER_SCOPE, label: `Rásters · ${RASTER_ROOT}/` },
        ...workspaces.map((w) => ({
            value: w.geoserverWorkspace,
            label: w.alias && w.alias !== w.geoserverWorkspace
                ? `${w.geoserverWorkspace} · ${w.alias}`
                : w.geoserverWorkspace,
        })),
    ], [workspaces]);

    const destinationLabel = workspaceLabel(workspace);
    const { isSearchMode } = search;

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
    const downloadFile = (file) => window.open(file.downloadUrl, '_blank');

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <PageHeading
                icon={<FileTextOutlined />}
                title="Recursos GeoServer"
                description={
                    <TituloConAyuda titulo={`Archivos que usan los estilos de ${destinationLabel}`} ayuda={AYUDA} />
                }
                extra={<ResetCachesButton />}
            />

            <Card>
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 8,
                    marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            aria-label="Ámbito"
                            value={workspace || GLOBAL_SCOPE}
                            onChange={handleWorkspaceChange}
                            options={scopeOptions}
                            style={{ width: isMobile ? '100%' : 240 }}
                        />
                        {currentPath && !isSearchMode && (
                            <GeoserverPathBreadcrumb currentPath={currentPath} onNavigate={setCurrentPath} />
                        )}
                    </div>
                    <GeoserverFilesToolbar
                        isMobile={isMobile}
                        search={search.search}
                        onSearchChange={search.setSearch}
                        searchScoped={search.scoped}
                        onSearchScopedChange={search.setScoped}
                        disabled={isSearchMode}
                        onNewFolder={handleNewFolder}
                        onUpload={() => setUploadOpen(true)}
                        selectedCount={selection.count}
                        onBulkMove={actions.startMove}
                        onBulkDelete={actions.bulkDelete}
                        extraActions={<MosaicActions workspace={workspace} currentPath={currentPath} onDone={reload} />}
                    />
                </div>

                {error && (
                    <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
                        <ExclamationCircleOutlined /> {error}
                    </Text>
                )}

                <GeoserverFilesContent
                    gridMinWidth={gridMinWidth}
                    isMobile={isMobile}
                    loading={loading}
                    searchMode={isSearchMode}
                    searching={search.searching}
                    searchResults={search.results}
                    folders={visibleFolders}
                    files={data.files}
                    currentPath={currentPath}
                    deletingName={deletingName}
                    onOpenFolder={setCurrentPath}
                    onDownloadZip={downloadZip}
                    onDelete={handleDelete}
                    onDownloadFile={downloadFile}
                    anySelected={selection.count > 0}
                    isSelected={selection.isSelected}
                    onToggleSelect={selection.toggle}
                    onRename={actions.startRename}
                    onDeleteFolder={actions.startDeleteFolder}
                />

                {!isSearchMode && !loading && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
                        {visibleFolders.length} carpeta(s) · {data.files.length} archivo(s)
                    </Text>
                )}
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
            />
        </Content>
    );
}
