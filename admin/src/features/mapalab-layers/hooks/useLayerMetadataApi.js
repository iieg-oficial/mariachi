import { useCallback } from 'react';
import api from '@shared/services/api';

export const useLayerMetadataApi = () => {
    const getLayerMetadata = useCallback(async (layerKey) => {
        try {
            const res = await api.get(`/layer-metadata/${encodeURIComponent(layerKey)}`);
            return res.data;
        } catch (err) {
            if (err.response?.status === 404) return null;
            throw err;
        }
    }, []);

    const updateLayerMetadata = useCallback(async (layerKey, payload) => {
        const res = await api.put(`/layer-metadata/${encodeURIComponent(layerKey)}`, payload);
        return res.data;
    }, []);

    const getLayerStats = useCallback(async (layerKey) => {
        try {
            const res = await api.get(`/layer-metadata/${encodeURIComponent(layerKey)}/stats`);
            return res.data;
        } catch (err) {
            if (err.response?.status === 404) return null;
            throw err;
        }
    }, []);

    const updateLayerStats = useCallback(async (layerKey, payload) => {
        const res = await api.put(`/layer-metadata/${encodeURIComponent(layerKey)}/stats`, payload);
        return res.data;
    }, []);

    const previewLayerStat = useCallback(async (layerKey, cfg, context) => {
        const params = {};
        if (context?.municipio?.length) params.municipio = context.municipio.join(',');
        if (context?.fechaInicio) params.fecha_inicio = context.fechaInicio;
        if (context?.fechaFin) params.fecha_fin = context.fechaFin;
        const res = await api.post(
            `/layer-metadata/${encodeURIComponent(layerKey)}/stats/preview`,
            cfg,
            { params },
        );
        return res.data;
    }, []);

    const listMunicipios = useCallback(async () => {
        const res = await api.get('/layer-metadata/municipios');
        return res.data;
    }, []);

    const refreshLayerStats = useCallback(async (layerKey) => {
        const res = await api.post(`/layer-metadata/${encodeURIComponent(layerKey)}/stats/refresh`);
        return res.data;
    }, []);
    const saveMetadataDraft = useCallback(async (layerKey, data) => {
        const res = await api.put(`/borradores/layer_metadata/${encodeURIComponent(layerKey)}`, { data });
        return res.data;
    }, []);

    return {
        getLayerMetadata,
        saveMetadataDraft,
        updateLayerMetadata,
        getLayerStats,
        updateLayerStats,
        previewLayerStat,
        listMunicipios,
        refreshLayerStats,
    };
};

