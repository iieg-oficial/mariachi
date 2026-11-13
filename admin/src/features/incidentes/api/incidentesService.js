import api from '@shared/services/api';

export const getIncidentes = async (minutos) => {
    const res = await api.get('/incidentes', { params: { minutos } });
    return res.data;
};
