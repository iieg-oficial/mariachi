import { useCallback, useEffect, useState } from 'react';
import {
    getButtons,
    getDaily,
    getEventos,
    getMcpClients,
    getMcpDaily,
    getMcpOverview,
    getMcpTools,
    getOverview,
    getSessions,
    getTools,
    getTopLayers,
} from '@features/mapalab-stats/api/mapalabStatsService';


export function useMapalabOverview() {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setOverview(await getOverview());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar overview');
            setOverview(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { overview, loading, error, reload };
}


export function useTopLayers({ limit = 20 } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getTopLayers(limit));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar top capas');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useEventoStats({ limit = 50 } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getEventos(limit));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar eventos');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useButtonStats() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getButtons());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar botones');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useToolStats() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getTools());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar herramientas');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useDailyStats({ days = 30 } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getDaily(days));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar serie diaria');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useMcpOverview() {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setOverview(await getMcpOverview());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar overview MCP');
            setOverview(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { overview, loading, error, reload };
}


export function useMcpTools({ limit = 30 } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getMcpTools(limit));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar tools MCP');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useMcpDaily({ days = 30 } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getMcpDaily(days));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar serie diaria MCP');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useMcpClients() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getMcpClients());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar clientes MCP');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useSessions({ page = 1, pageSize = 25, source = 'all' } = {}) {
    const [data, setData] = useState({ items: [], total: 0, page, pageSize });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await getSessions({ page, pageSize, source }));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar sesiones');
            setData({ items: [], total: 0, page, pageSize });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, source]);

    useEffect(() => { reload(); }, [reload]);

    return { data, loading, error, reload };
}
