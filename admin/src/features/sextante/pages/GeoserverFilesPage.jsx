import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Layout, Typography, theme } from 'antd';
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
import GeoserverSearchBar from '@features/sextante/components/GeoserverSearchBar';
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
    basename,
    workspaceLabel,
} from '@features/sextante/utils/geoserverFiles';
import PageHeading from '@shared/components/PageHeading';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Text } = Typography;
const { useToken } = theme;

const GLOBAL_SCOPE = '__global__';
const EMPTY = { path: '', workspace: null, folders: [], files: [] };
const scopeName = (ws) => {
    if (ws === null) return null;
    if (ws === RASTER_SCOPE) return RASTER_ROOT;
    return ws || 'styles';
};
const AYUDA = 'Imágenes, fuentes y .properties sin límite de tamaño. Los SLD del mismo ámbito los '
    + 'referencian con xlink:href="ruta/archivo.ext"; los .properties configuran los ImageMosaic.';

export default function GeoserverFilesPage() {
    const [workspace, setWorkspace] = useState(null);
    const [workspaces, setWorkspaces] = useState([]);
    const [currentPath, setCurrentPath] = useState('');
    const [pendingFolders, setPendingFolders] = useState([]);
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [deletingName, setDeletingName] = useState(null);
    const { isMobile } = useIsMobile();
    const selection = useGeoserverSelection();
    const search = useGeoserverSearch();
    const { token } = useToken();

    const refreshWorkspaces = useCallback(async () => {
        try {
            const items = await listGeoserverWorkspaces();
            setWorkspaces(items.filter((w) => w.registered));
        } catch { /* keep stale list */ }
    }, []);

    const reload = useCallback(async () => {
        setError(null);
        refreshWorkspaces();
        if (workspace === null) {
            setData(EMPTY);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const result = await browseGeoserverFiles(currentPath, workspace);
            setData(result);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar archivos');
        } finally {
            setLoading(false);
        }
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

    const openScope = useCallback((ws) => {
        setWorkspace(ws);
        setCurrentPath('');
        setPendingFolders([]);
    }, []);

    const goRoot = useCallback(() => openScope(null), [openScope]);
    const openFolder = (path) => {
        if (workspace !== null) setCurrentPath(path);
        else openScope(path === GLOBAL_SCOPE ? '' : path);
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

    const scopeFolders = useMemo(() => [
        { name: 'styles', path: GLOBAL_SCOPE, scope: true, title: 'Global · styles/' },
        { name: RASTER_ROOT, path: RASTER_SCOPE, scope: true, title: `Rásters · ${RASTER_ROOT}/` },
        ...workspaces.map((w) => ({
            name: w.geoserverWorkspace,
            path: w.geoserverWorkspace,
            scope: true,
            title: w.alias && w.alias !== w.geoserverWorkspace
                ? `${w.alias} · workspaces/${w.geoserverWorkspace}/`
                : `workspaces/${w.geoserverWorkspace}/`,
        })),
    ], [workspaces]);

    const destinationLabel = workspaceLabel(workspace);
    const currentScope = scopeName(workspace);
    const { isSearchMode } = search;

    const visibleFolders = useMemo(() => {
        if (workspace === null) return scopeFolders;
        const seen = new Set(data.folders.map((f) => f.path));
        const extras = pendingFolders
            .filter((p) => {
                const parent = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
                return parent === currentPath && !seen.has(p);
            })
            .map((p) => ({ name: basename(p), path: p, pending: true }));
        return [...data.folders, ...extras];
    }, [workspace, scopeFolders, data.folders, pendingFolders, currentPath]);

    const gridMinWidth = isMobile ? 140 : 180;
    const downloadZip = (path) => window.open(buildGeoserverFolderZipUrl(path, workspace), '_blank');
    const downloadFile = (file) => window.open(file.downloadUrl, '_blank');

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <PageHeading
                icon={<FileTextOutlined />}
                title="Recursos GeoServer"
                description={
                    <TituloConAyuda
                        titulo={currentScope
                            ? `Archivos que usan los estilos de ${destinationLabel}`
                            : 'Archivos que usan los estilos de GeoServer'}
                        ayuda={AYUDA}
                    />
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
                    <GeoserverSearchBar
                        isMobile={isMobile}
                        search={search.search}
                        onSearchChange={search.setSearch}
                    />
                    <GeoserverFilesToolbar
                        uploadDisabled={workspace === null || isSearchMode}
                        onUpload={() => setUploadOpen(true)}
                        selectedCount={selection.count}
                        onBulkMove={actions.startMove}
                        onBulkDelete={actions.bulkDelete}
                        extraActions={<MosaicActions workspace={workspace} currentPath={currentPath} onDone={reload} />}
                    />
                </div>

                {currentScope && !isSearchMode && (
                    <div style={{ marginBottom: 12 }}>
                        <GeoserverPathBreadcrumb
                            scopeName={currentScope}
                            currentPath={currentPath}
                            onRoot={goRoot}
                            onNavigate={setCurrentPath}
                        />
                    </div>
                )}

                {error && (
                    <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
                        <ExclamationCircleOutlined /> {error}
                    </Text>
                )}

                <div style={{ padding: 12, borderRadius: token.borderRadiusLG, background: token.colorFillQuaternary }}>
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
                        onOpenFolder={openFolder}
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
                        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
                            {visibleFolders.length} carpeta(s) · {data.files.length} archivo(s)
                        </Text>
                    )}
                </div>
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
                onNewFolder={handleNewFolder}
                onClose={() => setUploadOpen(false)}
            />
        </Content>
    );
}
