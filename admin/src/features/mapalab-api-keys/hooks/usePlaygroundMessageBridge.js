import { useEffect } from 'react';
import { baseOrigin } from '@features/mapalab-api-keys/components/playgroundHelpers';

export function usePlaygroundMessageBridge({
    baseUrl,
    pendingView,
    setPendingView,
    setCenter,
    setZoom,
    sendViewToIframe,
}) {
    useEffect(() => {
        const expectedOrigin = baseOrigin(baseUrl);
        const handler = (event) => {
            if (!expectedOrigin || event.origin !== expectedOrigin) return;
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type === 'mapalab:viewchange') {
                const p = data.payload || {};
                if (typeof p.lon === 'number' && typeof p.lat === 'number') {
                    setCenter(`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`);
                }
                if (typeof p.zoom === 'number') {
                    setZoom(Math.round(p.zoom * 10) / 10);
                }
            } else if (data.type === 'mapalab:ready' && pendingView) {
                sendViewToIframe(pendingView);
                setPendingView(null);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [baseUrl, pendingView, sendViewToIframe, setCenter, setZoom, setPendingView]);
}
