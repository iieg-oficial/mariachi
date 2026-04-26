import { useCallback, useEffect, useState } from 'react';
import api from '@shared/services/api';


const toAntTreeData = (nodes) =>
    nodes.map((n) => ({
        key: n.id,
        title: n.label,
        nodeType: n.nodeType,
        workspaceAlias: n.workspaceAlias,
        geoserverLayer: n.geoserverLayer,
        disabled: n.disabled,
        hiddenInMenu: n.hiddenInMenu,
        raw: n,
        children: n.children && n.children.length > 0 ? toAntTreeData(n.children) : undefined,
    }));


const fetchLayerTreePublic = async () => {
    const res = await fetch('/mapalab/api/layers/tree', { credentials: 'include' });
    if (!res.ok) throw new Error(`GET /mapalab/api/layers/tree fallo: ${res.status}`);
    return res.json();
};


export const useLayerTreeAdmin = () => {
    const [treeData, setTreeData] = useState([]);
    const [rawTree, setRawTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setError(null);
        try {
            const tree = await fetchLayerTreePublic();
            setRawTree(tree);
            setTreeData(toAntTreeData(tree));
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchLayerTreePublic()
            .then((tree) => {
                if (cancelled) return;
                setRawTree(tree);
                setTreeData(toAntTreeData(tree));
            })
            .catch((err) => { if (!cancelled) setError(err.message || String(err)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const getLayer = useCallback(async (layerId) => {
        const res = await api.get(`/layers/${layerId}`);
        return res.data;
    }, []);

    const updateLayer = useCallback(async (layerId, data) => {
        const res = await api.put(`/layers/${layerId}`, data);
        return res.data;
    }, []);

    const saveLayerDraft = useCallback(async (layerId, data) => {
        const res = await api.put(`/borradores/layer/${layerId}`, { data });
        return res.data;
    }, []);

    const requestReview = useCallback(async (layerId) => {
        await api.post(`/borradores/layer/${layerId}/solicitar-revision`);
    }, []);

    const getLayerDraft = useCallback(async (layerId) => {
        try {
            const res = await api.get(`/borradores/layer/${layerId}`);
            return res.data;
        } catch (err) {
            if (err.response?.status === 404) return null;
            throw err;
        }
    }, []);

    const deleteLayer = useCallback(async (layerId) => {
        await api.delete(`/layers/${layerId}`);
    }, []);

    const listGeoserverWorkspaces = useCallback(async () => {
        const res = await api.get('/geoserver/workspaces');
        return res.data;
    }, []);

    const listGeoserverFields = useCallback(async (alias, layer, { includeSamples = false } = {}) => {
        const params = includeSamples ? '?include_samples=true' : '';
        const res = await api.get(`/geoserver/workspaces/${alias}/layers/${layer}/fields${params}`);
        return res.data;
    }, []);

    const listGeoserverStyles = useCallback(async (alias, layer) => {
        const res = await api.get(`/geoserver/workspaces/${alias}/layers/${layer}/styles`);
        return res.data.styles || [];
    }, []);

    const bulkUpdateTags = useCallback(async (updates) => {
        const res = await api.patch('/layers/bulk-tags', { updates });
        return res.data;
    }, []);

    const reorderLayers = useCallback(async (parentId, orderedIds) => {
        const res = await api.patch('/layers/reorder', {
            parent_id: parentId,
            order: orderedIds,
        });
        return res.data;
    }, []);

    const getInitialOrder = useCallback(async () => {
        const res = await api.get('/layers/initial-order');
        return res.data;
    }, []);

    const setInitialOrder = useCallback(async (orderedIds) => {
        const res = await api.patch('/layers/initial-order', { layers: orderedIds });
        return res.data;
    }, []);

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

    const previewLayerStat = useCallback(async (layerKey, cfg) => {
        const res = await api.post(`/layer-metadata/${encodeURIComponent(layerKey)}/stats/preview`, cfg);
        return res.data;
    }, []);

    const refreshLayerStats = useCallback(async (layerKey) => {
        const res = await api.post(`/layer-metadata/${encodeURIComponent(layerKey)}/stats/refresh`);
        return res.data;
    }, []);

    const listLayerAliases = useCallback(async (layerId) => {
        const res = await api.get(`/layers/${layerId}/aliases`);
        return res.data;
    }, []);

    const createLayerAlias = useCallback(async (layerId, alias) => {
        const res = await api.post(`/layers/${layerId}/aliases`, { alias });
        return res.data;
    }, []);

    const deleteLayerAlias = useCallback(async (layerId, alias) => {
        await api.delete(`/layers/${layerId}/aliases/${encodeURIComponent(alias)}`);
    }, []);

    const suggestSlug = useCallback(async (label) => {
        const res = await api.post('/layers/slugs/suggest', { label });
        return res.data;
    }, []);

    const bulkGenerateSlugs = useCallback(async (overwrite = false) => {
        const res = await api.post('/layers/slugs/bulk-generate', { overwrite });
        return res.data;
    }, []);

    return {
        treeData,
        rawTree,
        loading,
        error,
        reload,
        getLayer,
        updateLayer,
        saveLayerDraft,
        requestReview,
        getLayerDraft,
        deleteLayer,
        listGeoserverWorkspaces,
        listGeoserverFields,
        listGeoserverStyles,
        bulkUpdateTags,
        reorderLayers,
        getInitialOrder,
        setInitialOrder,
        getLayerMetadata,
        updateLayerMetadata,
        getLayerStats,
        updateLayerStats,
        previewLayerStat,
        refreshLayerStats,
        listLayerAliases,
        createLayerAlias,
        deleteLayerAlias,
        suggestSlug,
        bulkGenerateSlugs,
    };
};
