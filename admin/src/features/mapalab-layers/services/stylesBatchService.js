import api from '@shared/services/api';

const BASE = '/geoserver/estilos-lote';
const LONG_TIMEOUT = 120000;

export const reviewTable = async (text) => {
    const res = await api.post(`${BASE}/revisar`, { texto: text }, { timeout: LONG_TIMEOUT });
    return res.data.filas;
};

export const createDrafts = async (text) => {
    const res = await api.post(`${BASE}/borradores`, { texto: text }, { timeout: LONG_TIMEOUT });
    return res.data;
};

export const fetchPreview = async ({ alias, layerName, row, width = 360 }) => {
    const res = await api.post(
        `${BASE}/vista-previa`,
        { alias, layer_name: layerName, fila: row || null },
        { params: { width }, responseType: 'blob', timeout: LONG_TIMEOUT },
    );
    return URL.createObjectURL(res.data);
};

export const approveDraft = async (id) => {
    const res = await api.post(`/borradores/por-id/${id}/aprobar`);
    return res.data;
};

export const batchErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return detail?.mensaje || err?.message || fallback;
};
