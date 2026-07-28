import api from '@shared/services/api';

const BASE = '/grid';

export const fetchGridRows = async (resource, { workspace, search } = {}) => {
    const res = await api.get(`${BASE}/${resource}/rows`, {
        params: { workspace: workspace || undefined, search: search || undefined },
    });
    return res.data;
};

export const patchGridCells = async (resource, changes) => {
    const res = await api.patch(`${BASE}/${resource}/cells`, { changes });
    return res.data;
};

export const fetchGridHistory = async (resource, { rowKey, desde, hasta, limit } = {}) => {
    const res = await api.get(`${BASE}/${resource}/historial`, {
        params: { rowKey: rowKey || undefined, desde: desde || undefined, hasta: hasta || undefined, limit },
    });
    return res.data;
};

export const exportGrid = async (resource, { formato = 'xlsx', hoja, workspace, search, desde, hasta } = {}) =>
    api.get(`${BASE}/${resource}/export`, {
        params: {
            formato,
            hoja: hoja || undefined,
            workspace: workspace || undefined,
            search: search || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
        },
        responseType: 'blob',
        timeout: 120000,
    });

export const fetchGridPresence = async (resource) => {
    const res = await api.get(`${BASE}/${resource}/presencia`);
    return res.data;
};

export const registerGridPresence = async (resource, rowKey) => {
    await api.put(`${BASE}/${resource}/presencia`, { rowKey });
};

export const clearGridPresence = async (resource, rowKey) => {
    await api.delete(`${BASE}/${resource}/presencia`, { params: { rowKey } });
};
