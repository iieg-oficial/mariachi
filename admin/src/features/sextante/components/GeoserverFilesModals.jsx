import DeleteFolderModal from '@features/sextante/components/DeleteFolderModal';
import MoveResourcesModal from '@features/sextante/components/MoveResourcesModal';
import RenameResourceModal from '@features/sextante/components/RenameResourceModal';

export default function GeoserverFilesModals({ actions, workspace, selected }) {
    return (
        <>
            <RenameResourceModal
                resource={actions.renaming}
                workspace={workspace}
                onClose={actions.closeRename}
                onRenamed={actions.afterChange}
            />
            <DeleteFolderModal
                folder={actions.deletingFolder}
                workspace={workspace}
                onClose={actions.closeDeleteFolder}
                onDeleted={actions.afterChange}
            />
            <MoveResourcesModal
                items={actions.moveOpen ? selected : []}
                workspace={workspace}
                onClose={actions.closeMove}
                onMoved={actions.afterChange}
            />
        </>
    );
}
