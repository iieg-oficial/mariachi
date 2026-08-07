import { useCallback, useEffect, useRef } from 'react';

export default function useInfiniteScroll({ hasMore, loading, onLoadMore, root = null, rootMargin = '300px' }) {
    const sentinelRef = useRef(null);
    const onLoadMoreRef = useRef(onLoadMore);

    useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore || loading) return undefined;
        if (typeof IntersectionObserver === 'undefined') return undefined;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) onLoadMoreRef.current?.();
        }, { root, rootMargin });

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loading, root, rootMargin]);

    const setSentinel = useCallback((node) => { sentinelRef.current = node; }, []);

    return { sentinelRef, setSentinel };
}
