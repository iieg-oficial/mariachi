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

export const bulkUpdate = async (ids, cambios) =>
    (await api.post('/catalogo/bulk-update', { ids, ...cambios })).data;

export const listInstituciones = async () => (await api.get('/catalogo/instituciones')).data;

export const crearInstitucion = async (payload) =>
    (await api.post('/catalogo/instituciones', payload)).data;

export const actualizarInstitucion = async (id, payload) =>
    (await api.put(`/catalogo/instituciones/${id}`, payload)).data;

export const eliminarInstitucion = async (id) => {
    await api.delete(`/catalogo/instituciones/${id}`);
};

export const reorderInstituciones = async (ids) =>
    (await api.put('/catalogo/instituciones/reorder', { ids })).data;
