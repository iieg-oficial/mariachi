import api from '@shared/services/api';

export const formulariosApi = {
    list: (params = {}) => api.get('/sieej/formularios', { params }).then((r) => r.data),
    get: (idOrSlug) => api.get(`/sieej/formularios/${idOrSlug}`).then((r) => r.data),
    create: (data) => api.post('/sieej/formularios', data).then((r) => r.data),
    update: (id, data) => api.put(`/sieej/formularios/${id}`, data).then((r) => r.data),
    publicar: (id) => api.post(`/sieej/formularios/${id}/publicar`).then((r) => r.data),
    cerrar: (id) => api.post(`/sieej/formularios/${id}/cerrar`).then((r) => r.data),
    eliminar: (id) => api.delete(`/sieej/formularios/${id}`).then((r) => r.data),
    asignaciones: (id, payload) => api.put(`/sieej/formularios/${id}/asignaciones`, payload).then((r) => r.data),
    listEnvios: (id, params = {}) => api.get(`/sieej/formularios/${id}/envios`, { params }).then((r) => r.data),
    getEnvio: (id, envioId) => api.get(`/sieej/formularios/${id}/envios/${envioId}`).then((r) => r.data),
    reabrirEnvio: (id, envioId) => api.post(`/sieej/formularios/${id}/envios/${envioId}/reabrir`).then((r) => r.data),
    descargarEnvioPdf: (id, envioId) => api.get(`/sieej/formularios/${id}/envios/${envioId}/pdf`, { responseType: 'blob' }),
    exportarEnvios: (id) => api.get(`/sieej/formularios/${id}/exportar-envios`, { responseType: 'blob' }),
};

export const gruposApi = {
    list: () => api.get('/sieej/grupos').then((r) => r.data),
    get: (id) => api.get(`/sieej/grupos/${id}`).then((r) => r.data),
    create: (data) => api.post('/sieej/grupos', data).then((r) => r.data),
    update: (id, data) => api.put(`/sieej/grupos/${id}`, data).then((r) => r.data),
    eliminar: (id) => api.delete(`/sieej/grupos/${id}`).then((r) => r.data),
    actualizarMiembros: (id, usuarios) => api.put(`/sieej/grupos/${id}/usuarios`, { usuarios }).then((r) => r.data),
    listMiembros: (id) => api.get(`/sieej/grupos/${id}/usuarios`).then((r) => r.data),
};

export const usuariosApi = {
    list: () => api.get('/usuarios').then((r) => r.data),
};
