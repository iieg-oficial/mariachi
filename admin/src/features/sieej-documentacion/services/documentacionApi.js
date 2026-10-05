import api from '@shared/services/api';

const BASE = '/sieej-documentacion';

export const listarPipelines = async () => (await api.get(`${BASE}/pipelines`)).data;

export const listarSincronizaciones = async () => (await api.get(`${BASE}/sincronizaciones`)).data;

export const obtenerPipeline = async (clave) => (await api.get(`${BASE}/pipelines/${clave}`)).data;

export const guardarBorrador = async (clave, contenido, expectedUpdatedAt) => {
    const params = expectedUpdatedAt ? { expectedUpdatedAt } : undefined;
    return (await api.put(`${BASE}/pipelines/${clave}`, contenido, { params })).data;
};

export const publicarPipeline = async (clave) => (await api.post(`${BASE}/pipelines/${clave}/publicar`)).data;

export const descartarBorrador = async (clave) => (await api.post(`${BASE}/pipelines/${clave}/descartar`)).data;

export const ajustarPipeline = async (clave, ajustes) => (await api.patch(`${BASE}/pipelines/${clave}`, ajustes)).data;

export const rutaPresencia = (clave) => `${BASE}/pipelines/${clave}`;

export const crearPipeline = async (datos) => (await api.post(`${BASE}/pipelines`, datos)).data;

export const despublicarPipeline = async (clave) => (await api.post(`${BASE}/pipelines/${clave}/despublicar`)).data;

export const eliminarPipeline = async (clave) => api.delete(`${BASE}/pipelines/${clave}`);
