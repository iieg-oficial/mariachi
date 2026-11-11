import { useEffect, useRef, useState } from 'react';
import { fetchPreview } from '@features/mapalab-layers/services/stylesBatchService';

const MAX_PARALLEL = 3;
const waiting = [];
let running = 0;

const runNext = () => {
    while (running < MAX_PARALLEL && waiting.length) {
        const job = waiting.shift();
        running += 1;
        job().finally(() => {
            running -= 1;
            runNext();
        });
    }
};

const enqueue = (task) => new Promise((resolve, reject) => {
    waiting.push(() => task().then(resolve, reject));
    runNext();
});

const hasObserver = () => typeof IntersectionObserver !== 'undefined';

export default function useStylePreview(alias, layerName, row) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(() => !hasObserver());
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState({ src: null, failed: false, attempt: -1 });

    useEffect(() => {
        if (visible || !ref.current) return undefined;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setVisible(true);
        }, { rootMargin: '200px' });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!visible) return undefined;
        let url = null;
        let cancelled = false;
        enqueue(() => (cancelled ? Promise.reject(new Error('cancelled')) : fetchPreview({ alias, layerName, row })))
            .then((objectUrl) => {
                url = objectUrl;
                if (!cancelled) setResult({ src: objectUrl, failed: false, attempt });
            })
            .catch(() => { if (!cancelled) setResult({ src: null, failed: true, attempt }); });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [visible, alias, layerName, row, attempt]);

    const current = result.attempt === attempt;
    return {
        ref,
        src: current ? result.src : null,
        failed: current && result.failed,
        retry: () => setAttempt((n) => n + 1),
    };
}
