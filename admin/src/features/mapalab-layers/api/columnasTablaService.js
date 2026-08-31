import api from '@shared/services/api';

const ruta = (layerKey) => `/layer-metadata/${encodeURIComponent(layerKey)}/columnas`;

export const getColumnas = async (layerKey) => {
    const res = await api.get(ruta(layerKey));
    return res.data?.columnas || [];
};

export const saveColumnas = async (layerKey, columnas) => {
    const res = await api.put(ruta(layerKey), { columnas });
    return res.data?.columnas || [];
};
