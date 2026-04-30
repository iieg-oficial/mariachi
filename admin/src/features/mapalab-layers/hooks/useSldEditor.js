import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@shared/services/api';

const sldResourceId = (workspace, styleName) => `${workspace}:${styleName}`;

export function useSldEditor({ workspace, styleName }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState(null);
    const reqIdRef = useRef(0);

    const reload = useCallback(async () => {
        if (!workspace || !styleName) {
            setData(null);
            setDraft(null);
            return;
        }
        const myId = ++reqIdRef.current;
        setLoading(true);
        setError(null);
        try {
            const [sldRes, draftRes] = await Promise.all([
                api.get(`/geoserver/styles/${encodeURIComponent(workspace)}/${encodeURIComponent(styleName)}`),
                api
                    .get(`/borradores/sld/${encodeURIComponent(sldResourceId(workspace, styleName))}`)
                    .catch((err) => (err.response?.status === 404 ? { data: null } : Promise.reject(err))),
            ]);
            if (reqIdRef.current !== myId) return;
            setData(sldRes.data);
            setDraft(draftRes.data || null);
        } catch (err) {
            if (reqIdRef.current !== myId) return;
            setError(err);
        } finally {
            if (reqIdRef.current === myId) setLoading(false);
        }
    }, [workspace, styleName]);

    useEffect(() => {
        reload();
    }, [reload]);

    const saveDraft = useCallback(async (model) => {
        const res = await api.put(
            `/borradores/sld/${encodeURIComponent(sldResourceId(workspace, styleName))}`,
            { data: model },
        );
        setDraft(res.data);
        return res.data;
    }, [workspace, styleName]);

    const requestReview = useCallback(async () => {
        await api.post(
            `/borradores/sld/${encodeURIComponent(sldResourceId(workspace, styleName))}/solicitar-revision`,
        );
        await reload();
    }, [workspace, styleName, reload]);

    const deleteDraft = useCallback(async () => {
        await api.delete(`/borradores/sld/${encodeURIComponent(sldResourceId(workspace, styleName))}`);
        setDraft(null);
    }, [workspace, styleName]);

    return {
        loading,
        error,
        data,
        draft,
        reload,
        saveDraft,
        requestReview,
        deleteDraft,
    };
}

export async function fetchPalettes() {
    const res = await api.get('/geoserver/palettes');
    return res.data.palettes || [];
}

export async function fetchStylesForLayer(workspaceAlias, layerName) {
    const res = await api.get(
        `/geoserver/workspaces/${encodeURIComponent(workspaceAlias)}/layers/${encodeURIComponent(layerName)}/styles`,
    );
    return {
        styles: res.data.styles || [],
        isLayerGroup: !!res.data.isLayerGroup,
    };
}
