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

export const inspectMosaicFolder = async (path) => {
    const res = await api.get(`${BASE}/carpeta`, { params: { path }, timeout: 60000 });
    return res.data;
};

export const getMosaicStatus = async ({ workspace, store }) => {
    const res = await api.get(`${BASE}/estado`, { params: { workspace, store }, timeout: 60000 });
    return res.data;
};

export const publishMosaic = async ({ workspace, path, dateFormat }) => {
    const res = await api.post(
        `${BASE}/publicar`,
        { workspace, path, date_format: dateFormat },
        { timeout: 600000 },
    );
    return res.data;
};

export const enableMosaicTime = async ({ workspace, store }) => {
    const res = await api.post(`${BASE}/activar-tiempo`, { workspace, store }, { timeout: 120000 });
    return res.data;
};

export const harvestMosaic = async ({ workspace, store }) => {
    const res = await api.post(`${BASE}/cosechar`, { workspace, store }, { timeout: 600000 });
    return res.data;
};
