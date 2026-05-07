import api from '@shared/services/api';


export const getStats = async (params = {}) => {
    const res = await api.get('/colibri/stats', { params });
    return res.data;
};
