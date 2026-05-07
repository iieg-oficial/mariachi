import api from '@shared/services/api';


export const listRoutes = async (params = {}) => {
    const res = await api.get('/colibri/routes', { params });
    return res.data;
};

export const crearRoute = async (payload) => {
    const res = await api.post('/colibri/routes', payload);
    return res.data;
};

export const actualizarRoute = async (id, payload) => {
    const res = await api.patch(`/colibri/routes/${id}`, payload);
    return res.data;
};

export const eliminarRoute = async (id) => {
    await api.delete(`/colibri/routes/${id}`);
};
