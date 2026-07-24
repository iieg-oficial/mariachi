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
    exportarEnvios: (id, formato = 'xlsx') => api.get(`/sieej/formularios/${id}/exportar-envios`, { params: { formato }, responseType: 'blob' }),
    periodos: (id) => api.get(`/sieej/formularios/${id}/periodos`).then((r) => r.data),
    notificaciones: (id) => api.get(`/sieej/formularios/${id}/notificaciones`).then((r) => r.data),
    exportarNotificaciones: (id, formato = 'xlsx') => api.get(`/sieej/formularios/${id}/notificaciones/exportar`, { params: { formato }, responseType: 'blob' }),
    tickPeriodos: () => api.post('/sieej/periodos/tick').then((r) => r.data),
};

export const catalogosApi = {
    get: () => api.get('/formularios/catalogos').then((r) => r.data),
    listar: () => api.get('/sieej/catalogos').then((r) => r.data),
    items: (clave) => api.get(`/sieej/catalogos/${clave}`).then((r) => r.data),
    crear: (clave, value) => api.post(`/sieej/catalogos/${clave}`, { value }).then((r) => r.data),
    reordenar: (clave, orden) => api.put(`/sieej/catalogos/${clave}/reordenar`, { orden }).then((r) => r.data),
    renombrar: (clave, id, value) => api.put(`/sieej/catalogos/${clave}/${id}`, { value }).then((r) => r.data),
    eliminar: (clave, id) => api.delete(`/sieej/catalogos/${clave}/${id}`).then((r) => r.data),
    createCatalog: (label, clave) => api.post('/sieej/catalogos', { label, clave: clave || null }).then((r) => r.data),
    updateCatalog: (clave, label) => api.put(`/sieej/catalogos/${clave}`, { label }).then((r) => r.data),
    deleteCatalog: (clave) => api.delete(`/sieej/catalogos/${clave}`).then((r) => r.data),
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
