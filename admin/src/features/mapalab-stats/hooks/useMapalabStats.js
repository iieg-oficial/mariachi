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
    getThemes,
    getTools,
    getTopLayers,
} from '@features/mapalab-stats/api/mapalabStatsService';

const periodKey = (period) => `${period?.grain || ''}|${period?.dateFrom || ''}|${period?.dateTo || ''}`;


export function useMapalabOverview(period) {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setOverview(await getOverview(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar overview');
            setOverview(null);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { overview, loading, error, reload };
}


export function useTopLayers({ limit = 20, period } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getTopLayers(limit, period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar top capas');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit, key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useEventoStats({ limit = 50, period } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getEventos(limit, period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar eventos');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit, key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useThemeStats({ limit = 50, period } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getThemes(limit, period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar temas');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit, key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useButtonStats(period) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getButtons(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar botones');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useToolStats(period) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getTools(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar herramientas');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useDailyStats(period) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getDaily(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar serie temporal');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useMcpOverview(period) {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setOverview(await getMcpOverview(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar overview MCP');
            setOverview(null);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { overview, loading, error, reload };
}


export function useMcpTools({ limit = 30, period } = {}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getMcpTools(limit, period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar tools MCP');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit, key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useMcpDaily(period) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getMcpDaily(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar serie temporal MCP');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useMcpClients(period) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setRows(await getMcpClients(period));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar clientes MCP');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { rows, loading, error, reload };
}


export function useSessions({ page = 1, pageSize = 25, source = 'all', period } = {}) {
    const [data, setData] = useState({ items: [], total: 0, page, pageSize });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const key = periodKey(period);
    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await getSessions({ page, pageSize, source, period }));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar sesiones');
            setData({ items: [], total: 0, page, pageSize });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, source, key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { reload(); }, [reload]);

    return { data, loading, error, reload };
}
