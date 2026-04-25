import { useCallback, useEffect, useRef, useState } from 'react';

export default function useResizableWidth({ initialWidth, storageKey, min = 200, max = 800 }) {
    const [width, setWidth] = useState(() => {
        if (storageKey && typeof window !== 'undefined') {
            const stored = window.localStorage.getItem(storageKey);
            const parsed = stored ? parseInt(stored, 10) : NaN;
            if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) return parsed;
        }
        return initialWidth;
    });

    const widthRef = useRef(width);
    useEffect(() => { widthRef.current = width; }, [width]);

    const handleStart = useCallback((e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = widthRef.current;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';

        const handleMove = (ev) => {
            const next = Math.max(min, Math.min(max, startWidth + (ev.clientX - startX)));
            widthRef.current = next;
            setWidth(next);
        };
        const handleEnd = () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            if (storageKey) window.localStorage.setItem(storageKey, String(widthRef.current));
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }, [min, max, storageKey]);

    return { width, handleStart };
}
