import { useCallback, useEffect, useState } from 'react';
import {
    createEvento,
    despublicarEvento,
    eliminarEvento,
    getEvento,
    listEventos,
    publicarEvento,
    updateEvento,
} from '@features/mapalab-eventos/api/eventosService';


export function useEventosList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await listEventos());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { items, loading, error, reload };
}

export function useEvento(id) {
    const [evento, setEvento] = useState(null);
    const [loading, setLoading] = useState(Boolean(id));
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            setEvento(await getEvento(id));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar evento');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { reload(); }, [reload]);

    return { evento, loading, error, reload, setEvento };
}

export {
    createEvento,
    updateEvento,
    publicarEvento,
    despublicarEvento,
    eliminarEvento,
};
