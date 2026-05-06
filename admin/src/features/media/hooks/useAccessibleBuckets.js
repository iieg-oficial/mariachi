import { useEffect, useState } from 'react';
import { getBuckets } from '@features/media/api/mediaService';

let bucketsCache = null;
let bucketsPromise = null;
const subscribers = new Set();

const fetchBuckets = () => {
    if (!bucketsPromise) {
        bucketsPromise = getBuckets()
            .then((data) => {
                bucketsCache = Array.isArray(data) ? data : [];
                return bucketsCache;
            })
            .catch((err) => {
                bucketsPromise = null;
                throw err;
            });
    }
    return bucketsPromise;
};

const notify = () => {
    for (const cb of subscribers) cb(bucketsCache);
};

export const invalidateAccessibleBucketsCache = () => {
    bucketsCache = null;
    bucketsPromise = null;
    notify();
};

const matchSlugs = (buckets, slugs) => {
    if (!Array.isArray(slugs) || slugs.length === 0) return buckets;
    const set = new Set(slugs);
    const order = new Map(slugs.map((s, i) => [s, i]));
    return buckets
        .filter((b) => set.has(b.acervo_bucket))
        .sort((a, b) => (order.get(a.acervo_bucket) ?? 0) - (order.get(b.acervo_bucket) ?? 0));
};

export default function useAccessibleBuckets(slugs) {
    const [buckets, setBuckets] = useState(() =>
        bucketsCache ? matchSlugs(bucketsCache, slugs) : []
    );
    const [loading, setLoading] = useState(() => bucketsCache === null);
    const [error, setError] = useState(null);

    const slugsKey = Array.isArray(slugs) ? slugs.join('|') : '';

    useEffect(() => {
        let cancelled = false;

        const update = (list) => {
            if (cancelled || !list) return;
            setBuckets(matchSlugs(list, slugs));
        };

        if (bucketsCache) {
            setBuckets(matchSlugs(bucketsCache, slugs));
            setLoading(false);
        } else {
            setLoading(true);
            fetchBuckets()
                .then((list) => {
                    if (cancelled) return;
                    setBuckets(matchSlugs(list, slugs));
                    setError(null);
                })
                .catch((err) => {
                    if (cancelled) return;
                    setError(err);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }

        subscribers.add(update);
        return () => {
            cancelled = true;
            subscribers.delete(update);
        };
    }, [slugsKey, slugs]);

    return { buckets, loading, error };
}
