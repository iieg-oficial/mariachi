import { useEffect, useState } from 'react';

export default function useElementHeight(ref, { fallback = 420, min = 160 } = {}) {
    const [height, setHeight] = useState(fallback);

    useEffect(() => {
        const node = ref.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver((entries) => {
            const measured = entries[0]?.contentRect?.height;
            if (measured) setHeight(Math.max(min, Math.round(measured)));
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, min]);

    return height;
}
