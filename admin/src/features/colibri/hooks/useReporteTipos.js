import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTipos } from '@features/colibri/api/tiposService';
import { TIPO_COLORS as FALLBACK_COLORS, TIPO_LABELS as FALLBACK_LABELS } from '@features/colibri/constants';


export function useReporteTipos({ activo, autoload = true } = {}) {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(autoload);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (typeof activo === 'boolean') params.activo = activo;
            const data = await listTipos(params);
            setTipos(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar tipos');
            setTipos([]);
        } finally {
            setLoading(false);
        }
    }, [activo]);

    useEffect(() => { if (autoload) reload(); }, [reload, autoload]);

    const labels = useMemo(() => {
        if (tipos.length === 0) return FALLBACK_LABELS;
        return Object.fromEntries(tipos.map((t) => [t.slug, t.label]));
    }, [tipos]);

    const colors = useMemo(() => {
        if (tipos.length === 0) return FALLBACK_COLORS;
        return Object.fromEntries(tipos.map((t) => [t.slug, t.color || 'default']));
    }, [tipos]);

    const bySlug = useMemo(
        () => Object.fromEntries(tipos.map((t) => [t.slug, t])),
        [tipos],
    );

    return { tipos, labels, colors, bySlug, loading, error, reload, setTipos };
}
