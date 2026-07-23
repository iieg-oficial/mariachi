import api from '@shared/services/api';

export const listCapas = async () => (await api.get('/catalogo')).data;

export const crearCapa = async (payload) => (await api.post('/catalogo', payload)).data;

export const actualizarCapa = async (id, payload) => (await api.put(`/catalogo/${id}`, payload)).data;

export const eliminarCapa = async (id) => {
    await api.delete(`/catalogo/${id}`);
};

export const listWorkspaces = async () => (await api.get('/layers/workspaces')).data;

export const listGeoserverLayers = async (alias) =>
    (await api.get(`/catalogo/geoserver/${alias}/layers`)).data.layers || [];

export const listTags = async () => (await api.get('/catalogo/tags')).data;

export const bulkCreate = async (payload) => (await api.post('/catalogo/bulk', payload)).data;

export const bulkDelete = async (ids) => (await api.post('/catalogo/bulk-delete', { ids })).data;

export const reorderCapas = async (ids) => (await api.put('/catalogo/reorder', { ids })).data;
