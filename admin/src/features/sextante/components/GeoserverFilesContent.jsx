import { Empty, Spin, Typography } from 'antd';
import GeoserverFilesGrid from '@features/sextante/components/GeoserverFilesGrid';
import GeoserverFilesList from '@features/sextante/components/GeoserverFilesList';

const { Text } = Typography;

const Loader = () => <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;

export default function GeoserverFilesContent({
    viewMode,
    gridMinWidth,
    loading,
    searchMode,
    searching,
    searchResults,
    folders = [],
    files = [],
    currentPath,
    deletingName,
    onOpenFolder,
    onDownloadZip,
    onSnippet,
    onDelete,
}) {
    const render = (items, extra = {}) => (viewMode === 'list' ? (
        <GeoserverFilesList
            files={items}
            deletingName={deletingName}
            onSnippet={onSnippet}
            onDelete={onDelete}
            {...extra}
        />
    ) : (
        <GeoserverFilesGrid
            files={items}
            minWidth={gridMinWidth}
            deletingName={deletingName}
            onSnippet={onSnippet}
            onDelete={onDelete}
            {...extra}
        />
    ));

    if (searchMode) {
        if (searching) return <Loader />;
        if (!searchResults) return null;
        if (searchResults.results.length === 0) {
            return <Empty description={`Sin coincidencias para "${searchResults.query}"`} />;
        }
        return (
            <>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {searchResults.results.length} resultado(s)
                    {searchResults.truncated && ' (mostrando primeros 500)'} para "{searchResults.query}"
                </Text>
                {render(searchResults.results, { fromSearch: true })}
            </>
        );
    }

    if (loading) return <Loader />;

    if (folders.length === 0 && files.length === 0) {
        return (
            <Empty
                description={
                    currentPath
                        ? `La carpeta "${currentPath}" está vacía. Sube un archivo o crea una subcarpeta.`
                        : 'No hay archivos ni carpetas aquí. Empieza con "Subir archivos" o "Nueva carpeta".'
                }
            />
        );
    }

    return render(files, { folders, onOpenFolder, onDownloadZip });
}
