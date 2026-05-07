import api from '@shared/services/api';


export const listSourceApps = async (params = {}) => {
    const res = await api.get('/colibri/source-apps', { params });
    return res.data;
};

export const getSourceApp = async (id) => {
    const res = await api.get(`/colibri/source-apps/${id}`);
    return res.data;
};

export const crearSourceApp = async (payload) => {
    const res = await api.post('/colibri/source-apps', payload);
    return res.data;
};

export const actualizarSourceApp = async (id, payload) => {
    const res = await api.patch(`/colibri/source-apps/${id}`, payload);
    return res.data;
};

export const eliminarSourceApp = async (id) => {
    await api.delete(`/colibri/source-apps/${id}`);
};

export const rotarApiKey = async (id, visibility = 'public') => {
    const res = await api.post(`/colibri/source-apps/${id}/rotate-key`, { visibility });
    return res.data;
};
