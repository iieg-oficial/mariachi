import api from '@shared/services/api';

export const getResumen = async (dias = 30) => {
    const res = await api.get('/vine/estadisticas/resumen', { params: { dias } });
    return res.data;
};

export const getRitmo = async (dias = 30, meses = 36) => {
    const res = await api.get('/vine/estadisticas/ritmo', { params: { dias, meses } });
    return res.data;
};

export const getPersonas = async (dias = 30, limite = 10) => {
    const res = await api.get('/vine/estadisticas/personas', { params: { dias, limite } });
    return res.data;
};

export const getPersonal = async (dias = 90, incluirBajas = false) => {
    const res = await api.get('/vine/personal', { params: { dias, incluir_bajas: incluirBajas } });
    return res.data;
};

export const getCamposExportables = async () => {
    const res = await api.get('/vine/personal/campos-exportables');
    return res.data;
};

export const exportarPersonal = async (datos) => {
    const res = await api.post('/vine/personal/exportar', datos, { responseType: 'blob' });
    return res;
};

export const getDetallePersona = async (pin) => {
    const res = await api.get(`/vine/personal/${pin}`);
    return res.data;
};

export const guardarFicha = async (pin, datos) => {
    const res = await api.patch(`/vine/personal/${pin}`, datos);
    return res.data;
};

export const getIncidencias = async (pin) => {
    const res = await api.get(`/vine/personal/${pin}/incidencias`);
    return res.data;
};

export const crearIncidencia = async (pin, datos) => {
    const res = await api.post(`/vine/personal/${pin}/incidencias`, datos);
    return res.data;
};

export const borrarIncidencia = async (pin, id) => {
    const res = await api.delete(`/vine/personal/${pin}/incidencias/${id}`);
    return res.data;
};

export const getListadoIncidencias = async (params = {}) => {
    const res = await api.get('/vine/incidencias', { params });
    return res.data;
};

export const crearIncidenciasMasivas = async (datos) => {
    const res = await api.post('/vine/incidencias', datos);
    return res.data;
};

export const getCatalogos = async (tipo, soloActivos = false) => {
    const res = await api.get('/vine/catalogos', { params: { tipo, solo_activos: soloActivos } });
    return res.data;
};

export const crearCatalogo = async (tipo, datos) => {
    const res = await api.post(`/vine/catalogos/${tipo}`, datos);
    return res.data;
};

export const actualizarCatalogo = async (id, datos) => {
    const res = await api.patch(`/vine/catalogos/${id}`, datos);
    return res.data;
};

export const borrarCatalogo = async (id) => {
    const res = await api.delete(`/vine/catalogos/${id}`);
    return res.data;
};

export const getAsistenciaPersona = async (pin, dias = 90) => {
    const res = await api.get(`/vine/personal/${pin}/asistencia`, { params: { dias } });
    return res.data;
};

export const sincronizar = async () => {
    const res = await api.post('/vine/sincronizar');
    return res.data;
};
