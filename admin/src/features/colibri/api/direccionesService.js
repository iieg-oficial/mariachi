import api from '@shared/services/api';


export const listDirecciones = async (params = {}) => {
    const res = await api.get('/colibri/direcciones', { params });
    return res.data;
};

export const crearDireccion = async (payload) => {
    const res = await api.post('/colibri/direcciones', payload);
    return res.data;
};

export const actualizarDireccion = async (id, payload) => {
    const res = await api.patch(`/colibri/direcciones/${id}`, payload);
    return res.data;
};

export const eliminarDireccion = async (id) => {
    await api.delete(`/colibri/direcciones/${id}`);
};
