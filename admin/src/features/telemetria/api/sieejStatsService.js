import api from '@shared/services/api';

export const getSieejStats = async () => {
    const res = await api.get('/sieej/stats');
    return res.data;
};
