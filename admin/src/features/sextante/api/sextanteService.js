import api from '@shared/services/api';

const BASE = '/geoserver';

export const listPendingWorkspaces = async () => {
    const res = await api.get(`${BASE}/workspaces/pending`);
    return res.data;
};

export const registerWorkspace = async (payload) => {
    const res = await api.post(`${BASE}/workspaces/register`, payload);
    return res.data;
};

export const listWorkspaceStyles = async (alias, includeGlobal = false) => {
    const res = await api.get(`${BASE}/workspaces/${encodeURIComponent(alias)}/styles`, {
        params: { include_global: includeGlobal },
    });
    return res.data;
};

export const getStyleDetail = async (alias, styleName) => {
    const res = await api.get(
        `${BASE}/styles/${encodeURIComponent(alias)}/${encodeURIComponent(styleName)}`,
    );
    return res.data;
};

export const listLayerFields = async (alias, layer, includeSamples = false) => {
    const res = await api.get(
        `${BASE}/workspaces/${encodeURIComponent(alias)}/layers/${encodeURIComponent(layer)}/fields`,
        { params: { include_samples: includeSamples } },
    );
    return res.data;
};

export const listLayerStyles = async (alias, layer) => {
    const res = await api.get(
        `${BASE}/workspaces/${encodeURIComponent(alias)}/layers/${encodeURIComponent(layer)}/styles`,
    );
    return res.data;
};
