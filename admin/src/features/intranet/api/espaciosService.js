import api from '@shared/services/api';

const BASE = '/intranet/espacios';

export const listarEspacios = async () => (await api.get(BASE)).data;

export const editarEspacio = async (fid, cambios) => (await api.put(`${BASE}/${fid}`, cambios)).data;

export const historialEspacio = async (fid) => (await api.get(`${BASE}/${fid}/historial`)).data;

export const restaurarEspacio = async (fid, historialId) => (
    await api.post(`${BASE}/${fid}/historial/${historialId}/restaurar`)
).data;
