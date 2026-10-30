import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getUploads, onFileUploaded, subscribeUploads } from '@features/sextante/utils/uploadQueue';

const RELOAD_DEBOUNCE_MS = 400;

export const useUploadQueue = () => useSyncExternalStore(subscribeUploads, getUploads, getUploads);

export const useOnUploaded = (workspace, handler) => {
    const handlerRef = useRef(handler);
    useEffect(() => { handlerRef.current = handler; });

    useEffect(() => {
        let names = [];
        let timer = null;
        const off = onFileUploaded((item) => {
            if ((item.workspace || '') !== (workspace || '')) return;
            names.push(item.name);
            clearTimeout(timer);
            timer = setTimeout(() => {
                const batch = names;
                names = [];
                handlerRef.current?.(batch);
            }, RELOAD_DEBOUNCE_MS);
        });
        return () => {
            off();
            clearTimeout(timer);
        };
    }, [workspace]);
};
