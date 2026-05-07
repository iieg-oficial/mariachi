import { useCallback, useEffect, useState } from 'react';
import {
    eliminarReporte,
    getReporte,
    getReportesContadores,
    listReportes,
    updateReporte,
} from '@features/colibri/api/reportesService';


export function useReportesList(initialParams = {}) {
    const [data, setData] = useState({ items: [], total: 0, page: 1, size: 20 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [params, setParams] = useState({ page: 1, size: 20, ...initialParams });

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cleaned = Object.fromEntries(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
            );
            const res = await listReportes(cleaned);
            setData(res);
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar reportes');
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => { reload(); }, [reload]);

    return { data, loading, error, reload, params, setParams };
}

export function useReporte(id) {
    const [reporte, setReporte] = useState(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            setReporte(await getReporte(id));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar reporte');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { reload(); }, [reload]);

    return { reporte, loading, error, reload, setReporte };
}

export function useReportesContadores() {
    const [contadores, setContadores] = useState({});
    const [loading, setLoading] = useState(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            setContadores(await getReportesContadores());
        } catch {
            setContadores({});
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { contadores, loading, reload };
}

export {
    updateReporte,
    eliminarReporte,
};
