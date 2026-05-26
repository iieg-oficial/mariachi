import { useCallback, useRef, useState } from 'react';
import api from '@shared/services/api';

const BASE = '/layers/highlight';

export function useHighlightBulk() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const lastSnapshotRef = useRef(null);
    const [hasUndo, setHasUndo] = useState(false);
    const undoTimerRef = useRef(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`${BASE}/stats`);
            setStats(data);
            return data;
        } finally {
            setLoading(false);
        }
    }, []);

    const dryRun = useCallback(async ({ color, shape, applyTo, themeIds }) => {
        const { data } = await api.post(`${BASE}/bulk`, {
            color, shape, applyTo, themeIds, dryRun: true,
        });
        return data;
    }, []);

    const apply = useCallback(async ({ color, shape, applyTo, themeIds }) => {
        setLoading(true);
        try {
            const { data } = await api.post(`${BASE}/bulk`, {
                color, shape, applyTo, themeIds, dryRun: false,
            });
            lastSnapshotRef.current = data.snapshot || [];
            setHasUndo((data.snapshot || []).length > 0);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            undoTimerRef.current = setTimeout(() => setHasUndo(false), 5 * 60 * 1000);
            return data;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(async ({ themeIds }) => {
        setLoading(true);
        try {
            const { data } = await api.post(`${BASE}/reset`, {
                themeIds, dryRun: false,
            });
            lastSnapshotRef.current = data.snapshot || [];
            setHasUndo((data.snapshot || []).length > 0);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            undoTimerRef.current = setTimeout(() => setHasUndo(false), 5 * 60 * 1000);
            return data;
        } finally {
            setLoading(false);
        }
    }, []);

    const undo = useCallback(async () => {
        const snap = lastSnapshotRef.current;
        if (!snap || snap.length === 0) return null;
        setLoading(true);
        try {
            const { data } = await api.post(`${BASE}/restore`, { snapshot: snap });
            lastSnapshotRef.current = null;
            setHasUndo(false);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            return data;
        } finally {
            setLoading(false);
        }
    }, []);

    return { stats, fetchStats, dryRun, apply, reset, undo, loading, hasUndo };
}
