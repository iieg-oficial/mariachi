import api from '@shared/services/api';

export const getMonitorStatus = async () => {
    const res = await api.get('/sistema/monitor/status');
    return res.data;
};

export const getMonitorServicio = async (slug, limit = 100) => {
    const res = await api.get(`/sistema/monitor/status/${slug}?limit=${limit}`);
    return res.data;
};

export const getMonitorEventos = async (limit = 50) => {
    const res = await api.get(`/sistema/monitor/events?limit=${limit}`);
    return res.data;
};
