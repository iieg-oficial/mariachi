import api from '@shared/services/api';

const periodParams = (period = {}) => ({
    date_from: period.dateFrom,
    date_to: period.dateTo,
    grain: period.grain,
});

export const getOverview = async (period) => {
    const res = await api.get('/mapalab-stats/overview', { params: periodParams(period) });
    return res.data;
};

export const getTopLayers = async (limit = 20, period) => {
    const res = await api.get('/mapalab-stats/layers', { params: { limit, ...periodParams(period) } });
    return res.data;
};

export const getButtons = async (period) => {
    const res = await api.get('/mapalab-stats/buttons', { params: periodParams(period) });
    return res.data;
};

export const getEventos = async (limit = 50, period) => {
    const res = await api.get('/mapalab-stats/eventos', { params: { limit, ...periodParams(period) } });
    return res.data;
};

export const getTools = async (period) => {
    const res = await api.get('/mapalab-stats/tools', { params: periodParams(period) });
    return res.data;
};

export const getDaily = async (period) => {
    const res = await api.get('/mapalab-stats/daily', { params: periodParams(period) });
    return res.data;
};

export const getSessions = async ({ page = 1, pageSize = 25, source = 'all', period } = {}) => {
    const res = await api.get('/mapalab-stats/sessions', {
        params: { page, page_size: pageSize, source, ...periodParams(period) },
    });
    return res.data;
};

export const refreshStats = async () => {
    const res = await api.post('/mapalab-stats/refresh');
    return res.data;
};

export const getHighlights = async () => {
    const res = await api.get('/mapalab-stats/highlights');
    return res.data;
};

export const getMcpOverview = async (period) => {
    const res = await api.get('/mapalab-stats/mcp/overview', { params: periodParams(period) });
    return res.data;
};

export const getMcpTools = async (limit = 30, period) => {
    const res = await api.get('/mapalab-stats/mcp/tools', { params: { limit, ...periodParams(period) } });
    return res.data;
};

export const getMcpDaily = async (period) => {
    const res = await api.get('/mapalab-stats/mcp/daily', { params: periodParams(period) });
    return res.data;
};

export const getMcpClients = async (period) => {
    const res = await api.get('/mapalab-stats/mcp/clients', { params: periodParams(period) });
    return res.data;
};
