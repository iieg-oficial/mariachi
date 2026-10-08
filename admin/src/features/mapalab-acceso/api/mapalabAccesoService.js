import api from '@shared/services/api';

const BASE = '/mapalab/acceso';

export const listarUsuarios = async () => (await api.get(`${BASE}/usuarios`)).data;
export const crearUsuario = async (payload) => (await api.post(`${BASE}/usuarios`, payload)).data;
export const actualizarUsuario = async (id, payload) => (await api.patch(`${BASE}/usuarios/${id}`, payload)).data;
export const eliminarUsuario = async (id) => { await api.delete(`${BASE}/usuarios/${id}`); };

export const listarGrupos = async () => (await api.get(`${BASE}/grupos`)).data;
export const crearGrupo = async (payload) => (await api.post(`${BASE}/grupos`, payload)).data;
export const editarGrupo = async (id, payload) => (await api.put(`${BASE}/grupos/${id}`, payload)).data;
export const eliminarGrupo = async (id) => { await api.delete(`${BASE}/grupos/${id}`); };

export const listarCapasPrivadas = async () => (await api.get(`${BASE}/capas`)).data;
export const leerAccesoDeCapa = async (layerId) => (await api.get(`${BASE}/capas/${encodeURIComponent(layerId)}`)).data;
export const guardarAccesoDeCapa = async (layerId, payload) => (
    await api.put(`${BASE}/capas/${encodeURIComponent(layerId)}`, payload)
).data;

export const sincronizarGeoserver = async () => (await api.post(`${BASE}/geoserver/sincronizar`)).data;

export const leerArbol = async () => (await api.get('/layers/arbol')).data;
