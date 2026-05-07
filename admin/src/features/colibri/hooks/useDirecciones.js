import { useCallback, useEffect, useMemo, useState } from 'react';
import { listDirecciones } from '@features/colibri/api/direccionesService';


export function useDirecciones({ activo, autoload = true } = {}) {
    const [direcciones, setDirecciones] = useState([]);
    const [loading, setLoading] = useState(autoload);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (typeof activo === 'boolean') params.activo = activo;
            const data = await listDirecciones(params);
            setDirecciones(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar direcciones');
            setDirecciones([]);
        } finally {
            setLoading(false);
        }
    }, [activo]);

    useEffect(() => { if (autoload) reload(); }, [reload, autoload]);

    const byId = useMemo(
        () => Object.fromEntries(direcciones.map((d) => [d.id, d])),
        [direcciones],
    );

    return { direcciones, byId, loading, error, reload, setDirecciones };
}
