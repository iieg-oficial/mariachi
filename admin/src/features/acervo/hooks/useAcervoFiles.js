import { useCallback, useEffect, useRef, useState } from 'react';
import { ACERVO_PAGE_SIZE, getAcervoFiles } from '@features/acervo/api/acervoService';

export default function useAcervoFiles({
    bucketId,
    folder,
    type,
    search,
    recursive,
    enabled = true,
    pageSize = ACERVO_PAGE_SIZE,
    onError,
}) {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const requestId = useRef(0);
    const onErrorRef = useRef(onError);

    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const fetchPage = useCallback(async (offset) => {
        if (!enabled || !bucketId) {
            requestId.current += 1;
            setItems([]);
            setTotal(0);
            setHasMore(false);
            setLoading(false);
            setLoadingMore(false);
            return;
        }
        const id = ++requestId.current;
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);
        try {
            const page = await getAcervoFiles({
                bucketId,
                folder: folder || undefined,
                type: type || undefined,
                search: search || undefined,
                recursive,
                limit: pageSize,
                offset,
            });
            if (id !== requestId.current) return;
            const recibidos = page?.items || [];
            setItems((prev) => (offset === 0 ? recibidos : [...prev, ...recibidos]));
            setTotal(page?.total || 0);
            setHasMore(Boolean(page?.hasMore));
        } catch (error) {
            if (id === requestId.current) onErrorRef.current?.(error);
        } finally {
            if (id === requestId.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [enabled, bucketId, folder, type, search, recursive, pageSize]);

    useEffect(() => { fetchPage(0); }, [fetchPage]);

    const reload = useCallback(() => fetchPage(0), [fetchPage]);

    const loadMore = useCallback(() => {
        if (loading || loadingMore || !hasMore) return;
        fetchPage(items.length);
    }, [loading, loadingMore, hasMore, items.length, fetchPage]);

    return { items, total, hasMore, loading, loadingMore, reload, loadMore };
}
