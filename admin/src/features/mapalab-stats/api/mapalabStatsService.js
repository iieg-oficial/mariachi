import api from '@shared/services/api';


export const getOverview = async () => {
    const res = await api.get('/mapalab-stats/overview');
    return res.data;
};

export const getTopLayers = async (limit = 20) => {
    const res = await api.get('/mapalab-stats/layers', { params: { limit } });
    return res.data;
};

export const getButtons = async () => {
    const res = await api.get('/mapalab-stats/buttons');
    return res.data;
};

export const getTools = async () => {
    const res = await api.get('/mapalab-stats/tools');
    return res.data;
};

export const getDaily = async (days = 30) => {
    const res = await api.get('/mapalab-stats/daily', { params: { days } });
    return res.data;
};

export const getSessions = async ({ page = 1, pageSize = 25, source = 'all' } = {}) => {
    const res = await api.get('/mapalab-stats/sessions', {
        params: { page, page_size: pageSize, source },
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
