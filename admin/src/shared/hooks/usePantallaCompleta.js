import { useCallback, useEffect, useRef, useState } from 'react';

export default function usePantallaCompleta(alFallar) {
    const marcoRef = useRef(null);
    const [activa, setActiva] = useState(false);

    useEffect(() => {
        const alCambiar = () => setActiva(document.fullscreenElement === marcoRef.current);
        document.addEventListener('fullscreenchange', alCambiar);
        return () => document.removeEventListener('fullscreenchange', alCambiar);
    }, []);

    const alternar = useCallback(async () => {
        if (!marcoRef.current) return;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await marcoRef.current.requestFullscreen();
        } catch {
            alFallar?.();
        }
    }, [alFallar]);

    return { marcoRef, activa, alternar };
}
