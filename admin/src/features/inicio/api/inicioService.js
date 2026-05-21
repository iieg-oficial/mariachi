import api from '@shared/services/api';

export const getMisBorradores = async () => {
    const res = await api.get('/borradores/mios');
    return res.data;
};

export const getBorradoresPendientes = async () => {
    const res = await api.get('/borradores/pendientes');
    return res.data;
};

export const getPlataformas = async () => {
    const res = await api.get('/sistema/plataformas');
    return res.data;
};

export const getNotasVersion = async (limit = 5) => {
    const res = await api.get(`/sistema/notas-version?limit=${limit}`);
    return res.data;
};

export const getColibriConfig = async () => {
    const res = await api.get('/sistema/colibri-config');
    return res.data;
};
