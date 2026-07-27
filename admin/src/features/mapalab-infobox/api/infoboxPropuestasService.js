import api from '@shared/services/api';

const BASE = '/mapalab/infobox-propuestas';

export const listPropuestas = async (estado = 'pendiente') =>
    (await api.get(BASE, { params: { estado } })).data;

export const aprobarPropuesta = async (id) => (await api.post(`${BASE}/${id}/aprobar`)).data;

export const rechazarPropuesta = async (id, comentario) =>
    (await api.post(`${BASE}/${id}/rechazar`, { comentario })).data;
