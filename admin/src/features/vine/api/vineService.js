import api from '@shared/services/api';

export const getResumen = async (dias = 30) => {
    const res = await api.get('/vine/estadisticas/resumen', { params: { dias } });
    return res.data;
};

export const getRitmo = async (dias = 30, meses = 36) => {
    const res = await api.get('/vine/estadisticas/ritmo', { params: { dias, meses } });
    return res.data;
};

export const getPersonas = async (dias = 30, limite = 10) => {
    const res = await api.get('/vine/estadisticas/personas', { params: { dias, limite } });
    return res.data;
};

export const sincronizar = async () => {
    const res = await api.post('/vine/sincronizar');
    return res.data;
};
