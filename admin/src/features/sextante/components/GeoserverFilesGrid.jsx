import GeoserverFileCard from '@features/sextante/components/GeoserverFileCard';
import GeoserverFolderCard from '@features/sextante/components/GeoserverFolderCard';

export default function GeoserverFilesGrid({
    folders = [],
    files = [],
    minWidth = 180,
    fromSearch = false,
    deletingName,
    onOpenFolder,
    onDownloadZip,
    onSnippet,
    onDelete,
    editMode = false,
    isSelected,
    onToggleSelect,
    onRename,
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
                    onOpen={onOpenFolder}
                    onDownloadZip={onDownloadZip}
                    editMode={editMode}
                    selected={isSelected?.({ ...f, isDir: true })}
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
                    deleting={deletingName === f.name}
                    onSnippet={onSnippet}
                    onDelete={onDelete}
                    editMode={editMode}
                    selected={isSelected?.({ ...f, isDir: false })}
                    onToggleSelect={onToggleSelect}
                    onRename={onRename}
                />
            ))}
        </div>
    );
}
