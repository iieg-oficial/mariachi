import { useCallback, useEffect, useState } from 'react';
import { listGeoserverWorkspaces } from '@features/sextante/api/geoserverFilesService';
import { listWorkspaceStyles } from '@features/sextante/api/sextanteService';

const WORKSPACE_STORAGE_KEY = 'sextante.styles.workspace';

const storedAlias = () => {
    try { return localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''; }
    catch { return ''; }
};

const errorText = (err, fallback) => err?.response?.data?.detail || fallback;

export default function useWorkspaceStyles() {
    const [workspaces, setWorkspaces] = useState([]);
    const [alias, setAliasState] = useState(storedAlias);
    const [includeGlobal, setIncludeGlobal] = useState(false);
    const [styles, setStyles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        listGeoserverWorkspaces()
            .then((items) => {
                const registered = items.filter((w) => w.registered);
                setWorkspaces(registered);
                setAliasState((prev) => (
                    registered.some((w) => w.alias === prev) ? prev : (registered[0]?.alias || '')
                ));
            })
            .catch((err) => setError(errorText(err, 'No se pudieron cargar los workspaces')));
    }, []);

    const reload = useCallback(async () => {
        if (!alias) return;
        setLoading(true);
        setError(null);
        try {
            const data = await listWorkspaceStyles(alias, includeGlobal);
            setStyles(data.styles);
        } catch (err) {
            setStyles([]);
            setError(errorText(err, 'No se pudieron cargar los estilos'));
        } finally {
            setLoading(false);
        }
    }, [alias, includeGlobal]);

    useEffect(() => { reload(); }, [reload]);

    const setAlias = (next) => {
        setAliasState(next);
        try { localStorage.setItem(WORKSPACE_STORAGE_KEY, next); } catch { /* noop */ }
    };

    return { workspaces, alias, setAlias, includeGlobal, setIncludeGlobal, styles, loading, error, reload };
}
