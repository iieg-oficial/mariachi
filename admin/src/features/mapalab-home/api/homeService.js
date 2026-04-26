import api from '@shared/services/api';


export const listSecciones = async () => {
    const res = await api.get('/home');
    return res.data;
};

export const getSeccion = async (key) => {
    const res = await api.get(`/home/${key}`);
    return res.data;
};

export const saveBorrador = async (key, payload) => {
    const res = await api.put(`/home/${key}`, payload);
    return res.data;
};

export const publicarSeccion = async (key) => {
    const res = await api.post(`/home/${key}/publicar`);
    return res.data;
};

export const descartarBorrador = async (key) => {
    const res = await api.post(`/home/${key}/descartar`);
    return res.data;
};
