import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@shared/services/api';

const TIPOS = new Set(['layer', 'layer_metadata', 'layer_stats']);

const isLayerDraft = (b) => TIPOS.has(b?.resource_type || b?.resourceType);

const draftFields = (draft) => {
    const data = draft?.data || {};
    return Object.keys(data).filter((k) => k !== 'action');
};

export const useLayerDrafts = () => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        try {
            const res = await api.get('/borradores/mios');
            setDrafts((res.data || []).filter(isLayerDraft));
        } catch {
            setDrafts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const pendingCount = useMemo(
        () => drafts.reduce((acc, d) => acc + draftFields(d).length, 0),
        [drafts],
    );

    return { drafts, pendingCount, loading, reload, draftFields };
};

export default useLayerDrafts;
