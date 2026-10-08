import api from '@shared/services/api';
import { CAPAS, aPlataforma, ORDEN_CAPA } from '@shared/services/catalogoServicios';

export { CAPAS };

export const getMisBorradores = async () => {
    const res = await api.get('/borradores/mios');
    return res.data;
};

export const getBorradoresPendientes = async () => {
    const res = await api.get('/borradores/pendientes');
    return res.data;
};

export const getPlataformas = async () => {
    const res = await api.get('/sistema/monitor/status');
    const servicios = res.data?.services ?? [];
    return servicios
        .map(aPlataforma)
        .sort((a, b) => (ORDEN_CAPA[a.capa] - ORDEN_CAPA[b.capa]) || a.label.localeCompare(b.label));
};

export const getNotasVersion = async (limit = 5) => {
    const res = await api.get(`/sistema/notas-version?limit=${limit}`);
    return res.data;
};

export const getColibriConfig = async () => {
    const res = await api.get('/sistema/colibri-config');
    return res.data;
};
