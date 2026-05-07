import api from '@shared/services/api';


export const listReportes = async (params = {}) => {
    const res = await api.get('/reportes', { params });
    return res.data;
};

export const getReporte = async (id) => {
    const res = await api.get(`/reportes/${id}`);
    return res.data;
};

export const updateReporte = async (id, payload) => {
    const res = await api.patch(`/reportes/${id}`, payload);
    return res.data;
};

export const eliminarReporte = async (id) => {
    await api.delete(`/reportes/${id}`);
};

export const getReportesContadores = async () => {
    const res = await api.get('/reportes/stats/contadores');
    return res.data;
};
