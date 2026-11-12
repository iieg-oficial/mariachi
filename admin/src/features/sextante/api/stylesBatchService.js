import api from '@shared/services/api';

const BASE = '/geoserver/estilos-lote';
const LONG_TIMEOUT = 120000;

export const reviewTable = async (text) => {
    const res = await api.post(`${BASE}/revisar`, { texto: text }, { timeout: LONG_TIMEOUT });
    return res.data.filas;
};

export const readTableFile = async (file) => {
    const form = new FormData();
    form.append('archivo', file);
    const res = await api.post(`${BASE}/leer-archivo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: LONG_TIMEOUT,
    });
    return res.data.texto;
};

export const createDrafts = async (text, replacing = []) => {
    const res = await api.post(`${BASE}/borradores`, { texto: text, reemplazar: replacing }, { timeout: LONG_TIMEOUT });
    return res.data;
};

export const editDrafts = async (ids) => {
    const res = await api.post(`${BASE}/editar`, { ids }, { timeout: LONG_TIMEOUT });
    return res.data.filas;
};

export const rowsFromStyle = async (alias, style) => {
    const res = await api.post(`${BASE}/desde-estilo`, { alias, estilo: style }, { timeout: LONG_TIMEOUT });
    return res.data.filas;
};

export const saveXmlDraft = async ({ alias, style, layerName, xml }) => (
    await api.post(`${BASE}/xml`, { alias, estilo: style, capa: layerName || '', xml })
).data;

export const fetchPreview = async ({ alias, layerName, row, width = 360 }) => {
    const body = row?.xml
        ? { alias, layer_name: layerName, sld: row.xml }
        : { alias, layer_name: layerName, fila: row || null };
    const res = await api.post(
        `${BASE}/vista-previa`,
        body,
        { params: { width }, responseType: 'blob', timeout: LONG_TIMEOUT },
    );
    return URL.createObjectURL(res.data);
};

export const fetchUnpublished = async () => (await api.get(`${BASE}/sin-publicar`)).data;

export const fetchHistory = async () => (await api.get(`${BASE}/historial`)).data;

export const approveDraft = async (id) => (await api.post(`/borradores/por-id/${id}/aprobar`)).data;

export const discardDraft = async (id) => (await api.delete(`/borradores/por-id/${id}`)).data;

export const reapplyDraft = async (id) => (await api.post(`/borradores/por-id/${id}/re-aplicar`)).data;

export const batchErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return detail?.mensaje || err?.message || fallback;
};
