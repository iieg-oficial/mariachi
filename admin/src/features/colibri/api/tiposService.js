import api from '@shared/services/api';


export const listTipos = async (params = {}) => {
    const res = await api.get('/colibri/tipos', { params });
    return res.data;
};

export const getTipo = async (id) => {
    const res = await api.get(`/colibri/tipos/${id}`);
    return res.data;
};

export const crearTipo = async (payload) => {
    const res = await api.post('/colibri/tipos', payload);
    return res.data;
};

export const actualizarTipo = async (id, payload) => {
    const res = await api.patch(`/colibri/tipos/${id}`, payload);
    return res.data;
};

export const eliminarTipo = async (id) => {
    await api.delete(`/colibri/tipos/${id}`);
};

export const reordenarTipos = async (items) => {
    const res = await api.patch('/colibri/tipos/reorder/batch', { items });
    return res.data;
};
