import { uploadGeoserverFileSmart } from '@features/sextante/api/geoserverFilesService';

let items = [];
let running = false;
let seq = 0;
let guarded = false;
const listeners = new Set();
const uploadedListeners = new Set();

export const isActiveUpload = (item) => item.status === 'queued' || item.status === 'uploading';

const blockUnload = (event) => {
    event.preventDefault();
    event.returnValue = '';
};

const syncUnloadGuard = () => {
    if (typeof window === 'undefined') return;
    const active = items.some(isActiveUpload);
    if (active === guarded) return;
    guarded = active;
    if (active) window.addEventListener('beforeunload', blockUnload);
    else window.removeEventListener('beforeunload', blockUnload);
};

const commit = (next) => {
    items = next;
    syncUnloadGuard();
    listeners.forEach((fn) => fn());
};

const patch = (id, changes) => commit(items.map((it) => (it.id === id ? { ...it, ...changes } : it)));

export const getUploads = () => items;

export const subscribeUploads = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

export const onFileUploaded = (fn) => {
    uploadedListeners.add(fn);
    return () => uploadedListeners.delete(fn);
};

const run = async () => {
    if (running) return;
    running = true;
    for (;;) {
        const next = items.find((it) => it.status === 'queued');
        if (!next) break;
        patch(next.id, { status: 'uploading', percent: 0, error: null });
        try {
            await uploadGeoserverFileSmart({
                file: next.file,
                name: next.name,
                workspace: next.workspace,
                onProgress: (percent) => patch(next.id, { percent }),
            });
            patch(next.id, { status: 'done', percent: 100 });
            uploadedListeners.forEach((fn) => fn({ name: next.name, workspace: next.workspace }));
        } catch (err) {
            patch(next.id, { status: 'error', error: err?.response?.data?.detail || 'Error al subir' });
        }
    }
    running = false;
};

export const enqueueUploads = (entries) => {
    if (!entries.length) return;
    commit([
        ...items,
        ...entries.map((entry) => ({
            ...entry,
            id: ++seq,
            status: 'queued',
            percent: 0,
            error: null,
        })),
    ]);
    run();
};

export const retryUpload = (id) => {
    patch(id, { status: 'queued', percent: 0, error: null });
    run();
};

export const removeUpload = (id) => commit(items.filter((it) => it.id !== id || it.status === 'uploading'));

export const clearFinishedUploads = () => commit(items.filter(isActiveUpload));

export const summarizeUploads = (list) => {
    const total = list.reduce((acc, it) => acc + (it.size || 0), 0);
    const sent = list.reduce((acc, it) => {
        if (it.status === 'done' || it.status === 'error') return acc + (it.size || 0);
        if (it.status === 'uploading') return acc + ((it.size || 0) * it.percent) / 100;
        return acc;
    }, 0);
    const done = list.filter((it) => it.status === 'done').length;
    const failed = list.filter((it) => it.status === 'error').length;
    return {
        total: list.length,
        done,
        failed,
        position: Math.min(list.length, done + failed + 1),
        active: list.some(isActiveUpload),
        current: list.find((it) => it.status === 'uploading') || null,
        percent: total ? Math.round((sent * 100) / total) : 0,
    };
};
