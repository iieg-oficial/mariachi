import { useEffect, useRef, useState } from 'react';
import { acquireThumbSlot, releaseThumbSlot } from '@features/sextante/utils/thumbQueue';

export default function GeoserverThumb({ src, alt, style }) {
    const [resolvedSrc, setResolvedSrc] = useState(null);
    const holding = useRef(false);

    useEffect(() => {
        let cancelled = false;
        setResolvedSrc(null);

        acquireThumbSlot().then(() => {
            if (cancelled) {
                releaseThumbSlot();
                return;
            }
            holding.current = true;
            setResolvedSrc(src);
        });

        return () => {
            cancelled = true;
            if (holding.current) {
                holding.current = false;
                releaseThumbSlot();
            }
        };
    }, [src]);

    const free = () => {
        if (!holding.current) return;
        holding.current = false;
        releaseThumbSlot();
    };

    if (!resolvedSrc) return null;

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={free}
            onError={free}
            style={style}
        />
    );
}
