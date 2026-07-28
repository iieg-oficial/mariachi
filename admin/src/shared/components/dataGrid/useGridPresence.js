import { useEffect, useRef, useState } from 'react';
import {
    clearGridPresence,
    fetchGridPresence,
    registerGridPresence,
} from '@shared/services/gridService';

const HEARTBEAT_MS = 15000;
const POLL_MS = 10000;

export default function useGridPresence({ resource, activeRowKey, enabled = true }) {
    const [presenceByRow, setPresenceByRow] = useState({});
    const previousRow = useRef(null);

    useEffect(() => {
        if (!enabled) return undefined;
        let cancelled = false;

        const poll = async () => {
            try {
                const data = await fetchGridPresence(resource);
                if (!cancelled) setPresenceByRow(data || {});
            } catch {
                if (!cancelled) setPresenceByRow({});
            }
        };

        poll();
        const timer = setInterval(poll, POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [resource, enabled]);

    useEffect(() => {
        if (!enabled) return undefined;

        const previous = previousRow.current;
        if (previous && previous !== activeRowKey) {
            clearGridPresence(resource, previous).catch(() => {});
        }
        previousRow.current = activeRowKey;

        if (!activeRowKey) return undefined;

        const beat = () => registerGridPresence(resource, activeRowKey).catch(() => {});
        beat();
        const timer = setInterval(beat, HEARTBEAT_MS);
        return () => clearInterval(timer);
    }, [resource, activeRowKey, enabled]);

    useEffect(() => () => {
        const current = previousRow.current;
        if (current) clearGridPresence(resource, current).catch(() => {});
    }, [resource]);

    return { presenceByRow };
}
