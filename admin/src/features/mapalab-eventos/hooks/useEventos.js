import { useCallback, useEffect, useReducer, useState } from 'react';
import {
    createEvento,
    despublicarEvento,
    eliminarEvento,
    getEvento,
    listEventos,
    publicarEvento,
    updateEvento,
} from '@features/mapalab-eventos/api/eventosService';


function fetchReducer(state, action) {
    switch (action.type) {
    case 'fetching':
        return { ...state, loading: true, error: null };
    case 'success':
        return { data: action.data, loading: false, error: null };
    case 'error':
        return { ...state, loading: false, error: action.error };
    default:
        return state;
    }
}

const formatError = (err, fallback) =>
    err?.response?.data?.detail || err?.message || fallback;


export function useEventosList() {
    const [state, dispatch] = useReducer(fetchReducer, { data: [], loading: true, error: null });
    const [reloadKey, setReloadKey] = useState(0);

    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        let cancelled = false;
        dispatch({ type: 'fetching' });
        listEventos()
            .then((data) => { if (!cancelled) dispatch({ type: 'success', data }); })
            .catch((err) => {
                if (!cancelled) dispatch({ type: 'error', error: formatError(err, 'Error al cargar eventos') });
            });
        return () => { cancelled = true; };
    }, [reloadKey]);

    return { items: state.data, loading: state.loading, error: state.error, reload };
}

export function useEvento(id) {
    const [state, dispatch] = useReducer(fetchReducer, { data: null, loading: Boolean(id), error: null });
    const [reloadKey, setReloadKey] = useState(0);

    const reload = useCallback(() => setReloadKey((k) => k + 1), []);

    useEffect(() => {
        if (!id) return undefined;
        let cancelled = false;
        dispatch({ type: 'fetching' });
        getEvento(id)
            .then((data) => { if (!cancelled) dispatch({ type: 'success', data }); })
            .catch((err) => {
                if (!cancelled) dispatch({ type: 'error', error: formatError(err, 'Error al cargar evento') });
            });
        return () => { cancelled = true; };
    }, [id, reloadKey]);

    return { evento: state.data, loading: state.loading, error: state.error, reload };
}

export {
    createEvento,
    updateEvento,
    publicarEvento,
    despublicarEvento,
    eliminarEvento,
};
