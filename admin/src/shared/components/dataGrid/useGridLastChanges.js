import { useEffect, useState } from 'react';
import { fetchGridLastChanges } from '@shared/services/gridService';

const EMPTY = new Map();

export default function useGridLastChanges(resource, loading) {
    const [lastChanges, setLastChanges] = useState(EMPTY);

    useEffect(() => {
        if (loading || !resource) return undefined;
        let cancelled = false;
        fetchGridLastChanges(resource)
            .then((items) => {
                if (cancelled) return;
                setLastChanges(new Map((items || []).map((item) => [`${item.row_key}::${item.column_key}`, item])));
            })
            .catch(() => {
                if (!cancelled) setLastChanges(EMPTY);
            });
        return () => { cancelled = true; };
    }, [resource, loading]);

    return lastChanges;
}
