import { useCallback, useState } from 'react';
import { deleteGeoserverResources } from '@features/sextante/api/geoserverFilesService';
import { toResourceRef } from '@features/sextante/hooks/useGeoserverSelection';
import { message } from '@shared/services/message';

export default function useGeoserverFileActions({ selected, onChanged, onClearSelection }) {
    const [renaming, setRenaming] = useState(null);
    const [deletingFolder, setDeletingFolder] = useState(null);
    const [moveOpen, setMoveOpen] = useState(false);

    const closeRename = useCallback(() => setRenaming(null), []);
    const closeDeleteFolder = useCallback(() => setDeletingFolder(null), []);
    const closeMove = useCallback(() => setMoveOpen(false), []);

    const afterChange = useCallback(() => {
        onClearSelection?.();
        onChanged?.();
    }, [onChanged, onClearSelection]);

    const bulkDelete = useCallback(async () => {
        if (selected.length === 0) return;
        try {
            const res = await deleteGeoserverResources(selected.map(toResourceRef));
            if (res.deleted) message.success(`${res.deleted} recurso(s) eliminado(s)`);
            if (res.failed) {
                message.warning(`${res.failed} no se eliminaron: ${res.errors.slice(0, 2).join(' · ')}`);
            }
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            afterChange();
        }
    }, [selected, afterChange]);

    return {
        renaming,
        deletingFolder,
        moveOpen,
        startRename: setRenaming,
        startDeleteFolder: setDeletingFolder,
        startMove: () => setMoveOpen(true),
        closeRename,
        closeDeleteFolder,
        closeMove,
        bulkDelete,
        afterChange,
    };
}
