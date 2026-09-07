import GeoserverFileCard from '@features/sextante/components/GeoserverFileCard';
import GeoserverFolderCard from '@features/sextante/components/GeoserverFolderCard';

export default function GeoserverFilesGrid({
    folders = [],
    files = [],
    minWidth = 180,
    fromSearch = false,
    isMobile = false,
    deletingName,
    anySelected = false,
    isSelected,
    onOpenFolder,
    onDownloadZip,
    onDownloadFile,
    onToggleSelect,
    onRename,
    onDelete,
    onDeleteFolder,
}) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
                gap: 12,
            }}
        >
            {folders.map((f) => (
                <GeoserverFolderCard
                    key={`folder-${f.path}`}
                    folder={f}
                    isMobile={isMobile}
                    selected={isSelected?.({ ...f, isDir: true })}
                    anySelected={anySelected}
                    onOpen={onOpenFolder}
                    onDownloadZip={onDownloadZip}
                    onToggleSelect={onToggleSelect}
                    onRename={onRename}
                    onDelete={onDeleteFolder}
                />
            ))}
            {files.map((f) => (
                <GeoserverFileCard
                    key={`file-${f.workspace || ''}-${f.name}`}
                    file={f}
                    fromSearch={fromSearch}
                    isMobile={isMobile}
                    deleting={deletingName === f.name}
                    selected={isSelected?.({ ...f, isDir: false })}
                    anySelected={anySelected}
                    onToggleSelect={onToggleSelect}
                    onRename={onRename}
                    onDelete={onDelete}
                    onDownload={onDownloadFile}
                />
            ))}
        </div>
    );
}
