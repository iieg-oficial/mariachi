import api from '@shared/services/api';

const BASE = '/geoserver/files';
const WORKSPACES_BASE = '/geoserver/workspaces';


export const listGeoserverWorkspaces = async () => {
    const res = await api.get(WORKSPACES_BASE);
    return res.data;
};

export const searchGeoserverFiles = async (q) => {
    const res = await api.get(`${BASE}/search`, { params: { q } });
    return res.data;
};

export const browseGeoserverFiles = async (path = '', workspace = '') => {
    const params = {};
    if (path) params.path = path;
    if (workspace) params.workspace = workspace;
    const res = await api.get(BASE, { params });
    return res.data;
};

export const GEOSERVER_CHUNK_SIZE = 25 * 1024 * 1024;
export const GEOSERVER_CHUNK_THRESHOLD = 5 * 1024 * 1024;

export const uploadGeoserverFile = async ({ file, name, workspace, onProgress }) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    if (workspace) form.append('workspace', workspace);
    const res = await api.post(BASE, form, {
        timeout: Math.max(120000, Math.ceil((file.size || 0) / 1024) * 2),
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
            if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
        },
    });
    return res.data;
};

export const initChunkedGeoserverUpload = async ({ name, workspace, contentType, totalSize, totalChunks }) => {
    const form = new FormData();
    form.append('name', name);
    if (workspace) form.append('workspace', workspace);
    if (contentType) form.append('content_type', contentType);
    form.append('total_size', String(totalSize));
    form.append('total_chunks', String(totalChunks));
    const res = await api.post(`${BASE}/chunked/init`, form, {
        timeout: 30000,
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const uploadGeoserverChunk = async (sessionId, partNumber, chunkBlob) => {
    const form = new FormData();
    form.append('part_number', String(partNumber));
    form.append('chunk', chunkBlob, `chunk.${partNumber}`);
    const res = await api.post(`${BASE}/chunked/${sessionId}/part`, form, {
        timeout: Math.max(120000, Math.ceil((chunkBlob.size || 0) / 1024) * 2),
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const completeChunkedGeoserverUpload = async (sessionId, totalSize = 0) => {
    const timeout = Math.min(3600000, Math.max(600000, Math.ceil(totalSize / (1024 * 1024)) * 1000));
    const res = await api.post(`${BASE}/chunked/${sessionId}/complete`, null, { timeout });
    return res.data;
};

export const uploadGeoserverFileSmart = async ({ file, name, workspace, onProgress }) => {
    if (file.size <= GEOSERVER_CHUNK_THRESHOLD) {
        return uploadGeoserverFile({ file, name, workspace, onProgress });
    }
    const totalChunks = Math.ceil(file.size / GEOSERVER_CHUNK_SIZE);
    const { session_id: sessionId } = await initChunkedGeoserverUpload({
        name,
        workspace,
        contentType: file.type,
        totalSize: file.size,
        totalChunks,
    });
    for (let i = 0; i < totalChunks; i += 1) {
        const start = i * GEOSERVER_CHUNK_SIZE;
        const blob = file.slice(start, Math.min(start + GEOSERVER_CHUNK_SIZE, file.size));
        let attempts = 0;
        for (;;) {
            try {
                await uploadGeoserverChunk(sessionId, i + 1, blob);
                break;
            } catch (err) {
                attempts += 1;
                if (err?.response?.status === 429 && attempts <= 5) {
                    const retryAfter = Number(err.response.headers?.['retry-after']) || 5;
                    await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
                    continue;
                }
                throw err;
            }
        }
        onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
    }
    return completeChunkedGeoserverUpload(sessionId, file.size);
};

export const listGeoserverFonts = async () => {
    const res = await api.get('/geoserver/fonts');
    return res.data;
};

export const reloadGeoserverFonts = async () => {
    const res = await api.post('/geoserver/fonts/reload', null, { timeout: 180000 });
    return res.data;
};

export const deleteGeoserverFile = async (name, workspace = '') => {
    const parts = name.split('/').map(encodeURIComponent).join('/');
    const params = workspace ? { workspace } : {};
    await api.delete(`${BASE}/${parts}`, { params });
};

export const buildGeoserverFolderZipUrl = (path = '', workspace = '') => {
    const qs = new URLSearchParams();
    if (path) qs.set('path', path);
    if (workspace) qs.set('workspace', workspace);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return `${api.defaults.baseURL}${BASE}/zip${suffix}`;
};
