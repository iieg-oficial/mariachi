import { useCallback, useEffect, useState } from 'react';
import { listGeoserverWorkspaces } from '@features/sextante/api/geoserverFilesService';
import { listWorkspaceStyles } from '@features/sextante/api/sextanteService';

const PARALLEL = 4;

const errorText = (err, fallback) => err?.response?.data?.detail || fallback;

const mapLimit = async (items, task) => {
    const results = [];
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await task(items[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
    return results;
};

const stylesOf = async (workspace, failed) => {
    try {
        const data = await listWorkspaceStyles(workspace.alias, false);
        return data.styles.filter((s) => !s.isGlobal).map((s) => ({ ...s, alias: workspace.alias }));
    } catch {
        failed.push(workspace.alias);
        return [];
    }
};

const globalsOf = async (workspace) => {
    const data = await listWorkspaceStyles(workspace.alias, true);
    return data.styles.filter((s) => s.isGlobal).map((s) => ({ ...s, alias: workspace.alias }));
};

export default function useAllStyles(includeGlobal) {
    const [workspaces, setWorkspaces] = useState([]);
    const [styles, setStyles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const registered = (await listGeoserverWorkspaces()).filter((w) => w.registered);
            const failed = [];
            const perWorkspace = await mapLimit(registered, (w) => stylesOf(w, failed));
            const globals = includeGlobal && registered.length ? await globalsOf(registered[0]) : [];
            setWorkspaces(registered);
            setStyles([...perWorkspace.flat(), ...globals]);
            if (failed.length) setError(`No se pudieron leer: ${failed.join(', ')}`);
        } catch (err) {
            setStyles([]);
            setError(errorText(err, 'No se pudieron cargar los estilos'));
        } finally {
            setLoading(false);
        }
    }, [includeGlobal]);

    useEffect(() => { reload(); }, [reload]);

    return { workspaces, styles, loading, error, reload };
}
