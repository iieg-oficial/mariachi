import api from '@shared/services/api';

const BASE = '/geoserver/mosaicos';

export const listMosaics = async () => {
    const res = await api.get(BASE);
    return res.data?.mosaicos || [];
};

export const reindexMosaic = async ({ workspace, store, reset = true }) => {
    const res = await api.post(`${BASE}/reindexar`, { workspace, store, reset }, { timeout: 300000 });
    return res.data;
};

export const resetGeoserver = async () => {
    const res = await api.post('/geoserver/reset', null, { timeout: 180000 });
    return res.data;
};
