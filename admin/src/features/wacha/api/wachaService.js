import api from '@shared/services/api';

const BASE = '/wacha';

export const listCamaras = async () => {
    const res = await api.get(`${BASE}/camaras`);
    return res.data;
};

export const createCamara = async (payload) => {
    const res = await api.post(`${BASE}/camaras`, payload);
    return res.data;
};

export const updateCamara = async (id, payload) => {
    const res = await api.put(`${BASE}/camaras/${id}`, payload);
    return res.data;
};

export const deleteCamara = async (id) => {
    await api.delete(`${BASE}/camaras/${id}`);
};

export const getEstado = async () => {
    const res = await api.get(`${BASE}/estado`);
    return res.data;
};

export const getPreview = async () => {
    const res = await api.get(`${BASE}/preview`);
    return res.data;
};

export const aplicar = async () => {
    const res = await api.post(`${BASE}/aplicar`);
    return res.data;
};
