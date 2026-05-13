import { useEffect, useMemo, useState } from 'react';

let _cache = null;
let _inflight = null;


const fetchTree = async () => {
    if (_cache) return _cache;
    if (_inflight) return _inflight;
    _inflight = fetch('/mapalab/api/layers/tree', { credentials: 'omit' })
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((data) => {
            _cache = Array.isArray(data) ? data : (data?.tree || []);
            return _cache;
        })
        .finally(() => { _inflight = null; });
    return _inflight;
};


const buildOption = (node) => {
    const wms = node.wmsConfig;
    const ws = wms?.workspace;
    const gsLayer = wms?.geoserverLayer;
    const ref = ws && gsLayer ? `${ws}:${gsLayer}` : null;
    const kids = (node.children || []).map(buildOption).filter(Boolean);
    return {
        title: node.label || node.id,
        value: ref || `__group_${node.id}`,
        key: node.id,
        selectable: !!ref,
        disabled: !ref && kids.length === 0,
        nodeType: node.nodeType,
        children: kids.length > 0 ? kids : undefined,
    };
};


const collectLabelMap = (nodes, out = {}) => {
    for (const node of nodes || []) {
        const wms = node.wmsConfig;
        const ref = wms?.workspace && wms?.geoserverLayer ? `${wms.workspace}:${wms.geoserverLayer}` : null;
        if (ref) out[ref] = node.label || node.id;
        if (node.id) out[node.id] = node.label || node.id;
        if (Array.isArray(node.children)) collectLabelMap(node.children, out);
    }
    return out;
};


export const useLayerTree = () => {
    const [rawTree, setRawTree] = useState(_cache || null);
    const [loading, setLoading] = useState(!_cache);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        if (_cache) {
            setRawTree(_cache);
            return undefined;
        }
        setLoading(true);
        fetchTree()
            .then((tree) => {
                if (cancelled) return;
                setRawTree(tree);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'Error al cargar capas');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const treeData = useMemo(() => (rawTree || []).map(buildOption), [rawTree]);
    const labelByRef = useMemo(() => collectLabelMap(rawTree || []), [rawTree]);

    return { treeData, labelByRef, loading, error };
};
