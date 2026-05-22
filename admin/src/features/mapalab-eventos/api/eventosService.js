import api from '@shared/services/api';


export const listEventos = async () => {
    const res = await api.get('/eventos');
    return res.data;
};

export const getEvento = async (id) => {
    const res = await api.get(`/eventos/${id}`);
    return res.data;
};

export const createEvento = async (payload) => {
    const res = await api.post('/eventos', payload);
    return res.data;
};

export const updateEvento = async (id, payload) => {
    const res = await api.patch(`/eventos/${id}`, payload);
    return res.data;
};

export const publicarEvento = async (id) => {
    const res = await api.post(`/eventos/${id}/publicar`);
    return res.data;
};

export const despublicarEvento = async (id) => {
    const res = await api.post(`/eventos/${id}/despublicar`);
    return res.data;
};

export const eliminarEvento = async (id, { deleteOrphanLayers = false } = {}) => {
    const res = await api.delete(`/eventos/${id}`, {
        params: deleteOrphanLayers ? { delete_orphan_layers: true } : undefined,
    });
    return res.data;
};

export const previewOrphanLayers = async (id) => {
    const res = await api.get(`/eventos/${id}/orphan-layers-preview`);
    return res.data;
};
