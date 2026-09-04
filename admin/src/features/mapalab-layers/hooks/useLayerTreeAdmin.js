import { useCallback, useEffect, useState } from 'react';
import api from '@shared/services/api';
import { tipoQueGobierna } from '@features/mapalab-layers/constants/nodeTypes';
import { optimisticMoveRawTree, optimisticReorderRawTree } from '@features/mapalab-layers/utils/treeOptimistic';
import { useLayerMetadataApi } from '@features/mapalab-layers/hooks/useLayerMetadataApi';


export const toAntTreeData = (nodes, parentNodeType = null) =>
    (nodes || []).map((n) => {
        const label = String(n.label || '');
        const legacyDisabled = label.startsWith('*');
        return {
            key: n.id,
            title: legacyDisabled ? label.slice(1) : label,
            nodeType: n.nodeType,
            parentNodeType,
            workspaceAlias: n.workspaceAlias || n.wmsConfig?.workspace || null,
            geoserverLayer: n.geoserverLayer || n.wmsConfig?.geoserverLayer || null,
            geometryType: n.geometryType || null,
            cqlFilter: n.wmsConfig?.cqlFilter || '',
            disabled: n.disabled === true || legacyDisabled,
            hiddenInMenu: n.hiddenInMenu === true,
            iconUrl: n.iconUrl,
            tarjetita: n.littleCard ? (n.inheritedFrom ? 'heredada' : 'propia') : null,
            raw: n,
            children: n.children && n.children.length > 0
                ? toAntTreeData(n.children, tipoQueGobierna(n.nodeType, parentNodeType))
                : undefined,
        };
    });

export const flattenLeaves = (nodes, acc = []) => {
    for (const n of nodes || []) {
        const ws = n.workspaceAlias || n.wmsConfig?.workspace;
        const layer = n.geoserverLayer || n.wmsConfig?.geoserverLayer;
        if (n.nodeType === 'leaf' && ws && layer) {
            acc.push({ id: n.id, label: n.label, workspace: ws, layer });
        }
        if (n.children?.length) flattenLeaves(n.children, acc);
    }
    return acc;
};

export const findNodeContext = (treeData, layerId) => {
    for (const n of treeData) {
        if (n.key === layerId) return { node: n, parentNodeType: n.parentNodeType ?? null };
        if (n.children?.length) {
            const found = findNodeContext(n.children, layerId);
            if (found) return found;
        }
    }
    return null;
};


const fetchLayerTreePublic = async () => {
    const res = await fetch('/mapalab/api/layers/tree', { credentials: 'include' });
    if (!res.ok) throw new Error(`GET /mapalab/api/layers/tree fallo: ${res.status}`);
    return res.json();
};


export const useLayerTreeAdmin = () => {
    const metadataApi = useLayerMetadataApi();
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

    const requestReview = useCallback(async (resourceId, resourceType = 'layer') => {
        await api.post(`/borradores/${resourceType}/${encodeURIComponent(resourceId)}/solicitar-revision`);
    }, []);

    const saveStatsDraft = useCallback(async (layerKey, data) => {
        const res = await api.put(`/borradores/layer_stats/${encodeURIComponent(layerKey)}`, { data });
        return res.data;
    }, []);

    const discardDraft = useCallback(async (borradorId) => {
        await api.delete(`/borradores/por-id/${borradorId}`);
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

    const createLayer = useCallback(async (payload) => {
        const res = await api.post('/layers', payload);
        return res.data;
    }, []);

    const deleteLayer = useCallback(async (layerId, { force = false, cascade = false } = {}) => {
        const res = await api.delete(`/layers/${layerId}`, { params: { force, cascade } });
        return res.data;
    }, []);

    const restoreLayer = useCallback(async (layerId) => {
        const res = await api.post(`/layers/${layerId}/restore`);
        return res.data;
    }, []);

    const purgeLayer = useCallback(async (layerId) => {
        await api.delete(`/layers/${layerId}/purge`);
    }, []);

    const listDeletedLayers = useCallback(async () => {
        const res = await api.get('/layers/deleted');
        return res.data;
    }, []);

    const getLayerReferences = useCallback(async (layerId) => {
        const res = await api.get(`/layers/${layerId}/references`);
        return res.data;
    }, []);

    const requestLayerDeletion = useCallback(async (layerId) => {
        const res = await api.post(`/borradores/layer/${layerId}/solicitar-eliminacion`);
        return res.data;
    }, []);

    const listGeoserverWorkspaces = useCallback(async ({ availableOnly = false } = {}) => {
        const params = availableOnly ? '?available_only=true' : '';
        const res = await api.get(`/geoserver/workspaces${params}`);
        return res.data;
    }, []);

    const listPendingWorkspaces = useCallback(async () => {
        const res = await api.get('/geoserver/workspaces/pending');
        return res.data;
    }, []);

    const registerWorkspace = useCallback(async (payload) => {
        const res = await api.post('/geoserver/workspaces/register', payload);
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

    const optimisticMoveParent = useCallback((layerId, newParentId) => {
        setRawTree(prev => {
            const result = optimisticMoveRawTree(prev, layerId, newParentId);
            if (!result) return prev;
            setTreeData(toAntTreeData(result));
            return result;
        });
    }, []);

    const optimisticReorderChildren = useCallback((parentId, orderedIds) => {
        setRawTree(prev => {
            const result = optimisticReorderRawTree(prev, parentId, orderedIds);
            setTreeData(toAntTreeData(result));
            return result;
        });
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
        optimisticMoveParent,
        optimisticReorderChildren,
        getLayer,
        createLayer,
        updateLayer,
        saveLayerDraft,
        requestReview,
        saveStatsDraft,
        discardDraft,
        getLayerDraft,
        deleteLayer,
        restoreLayer,
        purgeLayer,
        listDeletedLayers,
        getLayerReferences,
        requestLayerDeletion,
        listGeoserverWorkspaces,
        listPendingWorkspaces,
        registerWorkspace,
        listGeoserverFields,
        listGeoserverStyles,
        bulkUpdateTags,
        reorderLayers,
        getInitialOrder,
        setInitialOrder,
        ...metadataApi,
        listLayerAliases,
        createLayerAlias,
        deleteLayerAlias,
        suggestSlug,
        bulkGenerateSlugs,
    };
};
