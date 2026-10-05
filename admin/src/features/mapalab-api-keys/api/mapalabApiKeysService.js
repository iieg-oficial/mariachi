import api from '@shared/services/api';


export const listApiKeys = async (params = {}) => {
    const res = await api.get('/mapalab/api-keys', { params });
    return res.data;
};

export const crearApiKey = async (payload) => {
    const res = await api.post('/mapalab/api-keys', payload);
    return res.data;
};

export const actualizarApiKey = async (id, payload) => {
    const res = await api.patch(`/mapalab/api-keys/${id}`, payload);
    return res.data;
};

export const rotarApiKey = async (id, visibility) => {
    const body = visibility ? { visibility } : {};
    const res = await api.post(`/mapalab/api-keys/${id}/rotate-key`, body);
    return res.data;
};

export const revokeApiKey = async (id) => {
    const res = await api.post(`/mapalab/api-keys/${id}/revoke`);
    return res.data;
};

export const suspendApiKey = async (id) => {
    const res = await api.post(`/mapalab/api-keys/${id}/suspend`);
    return res.data;
};

export const reactivateApiKey = async (id) => {
    const res = await api.post(`/mapalab/api-keys/${id}/reactivate`);
    return res.data;
};

export const eliminarApiKey = async (id) => {
    await api.delete(`/mapalab/api-keys/${id}`);
};

export const listEmbeds = async (id) => {
    const res = await api.get(`/mapalab/api-keys/${id}/embeds`);
    return res.data;
};

export const crearEmbed = async (id, payload) => {
    const res = await api.post(`/mapalab/api-keys/${id}/embeds`, payload);
    return res.data;
};

export const crearEmbedFromLayers = async (id, payload) => {
    const res = await api.post(`/mapalab/api-keys/${id}/embeds/from-layers`, payload);
    return res.data;
};

export const eliminarEmbed = async (id, shareId) => {
    await api.delete(`/mapalab/api-keys/${id}/embeds/${shareId}`);
};

export const listAccesos = async (id, params = {}) => {
    const res = await api.get(`/mapalab/api-keys/${id}/accesos`, { params });
    return res.data;
};

export const listUso = async (id, dias) => {
    const res = await api.get(`/mapalab/api-keys/${id}/usage`, { params: { dias } });
    return res.data;
};

export const listRendimiento = async (id, params = {}) => {
    const res = await api.get(`/mapalab/api-keys/${id}/rendimiento`, { params });
    return res.data;
};

export const listSitios = async (id, params = {}) => {
    const res = await api.get(`/mapalab/api-keys/${id}/sitios`, { params });
    return res.data;
};
