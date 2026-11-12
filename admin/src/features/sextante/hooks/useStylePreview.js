import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { fetchPreview } from '@features/sextante/api/stylesBatchService';

const MAX_PARALLEL = 3;
const waiting = [];
const cache = new Map();
const listeners = new Set();
let running = 0;
let version = 0;

const emit = () => {
    version += 1;
    listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const getVersion = () => version;

const runNext = () => {
    while (running < MAX_PARALLEL && waiting.length) {
        const job = waiting.shift();
        running += 1;
        job().finally(() => {
            running -= 1;
            runNext();
        });
    }
};

const enqueue = (task) => new Promise((resolve, reject) => {
    waiting.push(() => task().then(resolve, reject));
    runNext();
});

export const previewKey = (alias, layerName, row) => JSON.stringify([
    alias, layerName, row ? [row.attribute, row.cortes, row.colores] : null,
]);

export const clearPreviewCache = () => {
    cache.forEach((url) => URL.revokeObjectURL(url));
    cache.clear();
    emit();
};

export function usePreviewCache() {
    useSyncExternalStore(subscribe, getVersion);
    return useCallback((key) => cache.has(key), []);
}

export default function useStylePreview(alias, layerName, row) {
    useSyncExternalStore(subscribe, getVersion);
    const key = previewKey(alias, layerName, row);
    const [attempt, setAttempt] = useState(0);
    const [failure, setFailure] = useState(null);
    const src = cache.get(key) || null;

    useEffect(() => {
        if (cache.has(key)) return undefined;
        let cancelled = false;
        enqueue(() => (cancelled ? Promise.reject(new Error('cancelled')) : fetchPreview({ alias, layerName, row })))
            .then((url) => {
                cache.set(key, url);
                emit();
            })
            .catch(() => { if (!cancelled) setFailure(`${key}#${attempt}`); });
        return () => { cancelled = true; };
    }, [key, alias, layerName, row, attempt]);

    return {
        src,
        failed: !src && failure === `${key}#${attempt}`,
        retry: () => setAttempt((n) => n + 1),
    };
}
