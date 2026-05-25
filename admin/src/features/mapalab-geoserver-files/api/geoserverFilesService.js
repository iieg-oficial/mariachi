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

export const uploadGeoserverFile = async ({ file, name, workspace }) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    if (workspace) form.append('workspace', workspace);
    const res = await api.post(BASE, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
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
