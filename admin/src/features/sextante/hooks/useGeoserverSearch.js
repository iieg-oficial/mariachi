import { useEffect, useState } from 'react';
import { searchGeoserverFiles } from '@features/sextante/api/geoserverFilesService';
import { SEARCH_DEBOUNCE_MS } from '@features/sextante/utils/geoserverFiles';
import { message } from '@shared/services/message';

export default function useGeoserverSearch(workspace) {
    const [search, setSearch] = useState('');
    const [scoped, setScoped] = useState(false);
    const [results, setResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const query = search.trim();
    const scope = scoped && workspace !== null ? workspace : undefined;

    useEffect(() => {
        if (!query) {
            setResults(null);
            setSearching(false);
            return undefined;
        }
        setSearching(true);
        let cancelled = false;
        const timer = setTimeout(() => {
            searchGeoserverFiles(query, scope)
                .then((res) => { if (!cancelled) setResults(res); })
                .catch((err) => {
                    if (cancelled) return;
                    setResults(null);
                    message.error(err?.response?.data?.detail || 'Error al buscar');
                })
                .finally(() => { if (!cancelled) setSearching(false); });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, scope]);

    const dropResult = (name, ws) => setResults((prev) => prev && ({
        ...prev,
        results: prev.results.filter((f) => !(f.name === name && (f.workspace || '') === (ws || ''))),
    }));

    return {
        search,
        setSearch,
        scoped,
        setScoped,
        results,
        searching,
        isSearchMode: Boolean(query),
        dropResult,
    };
}
