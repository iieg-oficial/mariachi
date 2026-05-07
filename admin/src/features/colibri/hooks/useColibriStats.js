import { useCallback, useEffect, useState } from 'react';
import { getStats } from '@features/colibri/api/statsService';


export function useColibriStats({ days = 30, sourceApp, topN = 10 } = {}) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { days, top_n: topN };
            if (sourceApp) params.source_app = sourceApp;
            setStats(await getStats(params));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar estadísticas');
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, [days, sourceApp, topN]);

    useEffect(() => { reload(); }, [reload]);

    return { stats, loading, error, reload };
}
