import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export default function useSearchParamState(key, fallback = null) {
    const [searchParams, setSearchParams] = useSearchParams();
    const value = searchParams.get(key) ?? fallback;

    const setValue = useCallback((next, extra = {}) => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            const apply = (k, v) => {
                if (v == null || v === '') params.delete(k);
                else params.set(k, v);
            };
            apply(key, next);
            Object.entries(extra).forEach(([k, v]) => apply(k, v));
            return params;
        }, { replace: true });
    }, [key, setSearchParams]);

    return [value, setValue];
}
