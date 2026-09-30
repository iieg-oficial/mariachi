import api from '@shared/services/api';

const BASE = '/intranet';
const PREFIJO_ARCHIVOS = '/static/uploads/';

export const listar = async (recurso) => {
    const res = await api.get(`${BASE}/${recurso}`);
    return res.data;
};

export const crear = async (recurso, payload) => {
    const res = await api.post(`${BASE}/${recurso}`, payload);
    return res.data;
};

export const actualizar = async (recurso, id, payload) => {
    const res = await api.put(`${BASE}/${recurso}/${id}`, payload);
    return res.data;
};

export const eliminar = async (recurso, id) => {
    await api.delete(`${BASE}/${recurso}/${id}`);
};

export const revisar = async (id, status) => {
    const res = await api.put(`${BASE}/carrusel/${id}/revisar`, { status });
    return res.data;
};

export const urlArchivo = (ruta) => {
    if (!ruta || !ruta.startsWith(PREFIJO_ARCHIVOS)) return null;
    const base = import.meta.env.VITE_ADMIN_API_URL || '/api/mariachi';
    return `${base}${BASE}/archivos/${ruta.slice(PREFIJO_ARCHIVOS.length)}`;
};

export const aFormData = (valores) => {
    const datos = new FormData();
    Object.entries(valores).forEach(([clave, valor]) => {
        if (valor === undefined || valor === null || valor === '') return;
        datos.append(clave, valor);
    });
    return datos;
};
