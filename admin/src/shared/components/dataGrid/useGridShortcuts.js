import { useEffect } from 'react';

export default function useGridShortcuts({ active, undo, dirtyCount, focusSearch, setFilterOpen, setColumnOpen }) {
    useEffect(() => {
        if (!active) return undefined;
        const onKeyDown = (event) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            const key = event.key.toLowerCase();

            if (key === 'z') {
                event.preventDefault();
                undo();
                return;
            }

            if (key === 'f') {
                event.preventDefault();
                event.stopPropagation();
                if (event.shiftKey) {
                    setFilterOpen(true);
                } else {
                    setFilterOpen(false);
                    focusSearch();
                }
                return;
            }

            if (key === 'g') {
                event.preventDefault();
                event.stopPropagation();
                setColumnOpen(true);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [active, undo, focusSearch, setFilterOpen, setColumnOpen]);

    useEffect(() => {
        if (!dirtyCount) return undefined;
        const onBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirtyCount]);
}
