import { useEffect, useRef, useState } from 'react';
import { formulariosApi } from '../services/formulariosAdminApi';

const HEARTBEAT_MS = 20000;

export default function usePresenciaFormulario(formularioId, seccion) {
    const [editores, setEditores] = useState([]);
    const seccionRef = useRef(seccion);

    useEffect(() => {
        seccionRef.current = seccion;
    }, [seccion]);

    useEffect(() => {
        if (!formularioId) return undefined;

        let vigente = true;

        const latir = async () => {
            if (document.hidden) return;
            try {
                await formulariosApi.marcarPresencia(formularioId, seccionRef.current);
                const otros = await formulariosApi.presencia(formularioId);
                if (vigente) setEditores(otros);
            } catch {
                if (vigente) setEditores([]);
            }
        };

        const salirPorCierre = () => formulariosApi.salirPresenciaBeacon(formularioId);

        latir();
        const timer = setInterval(latir, HEARTBEAT_MS);
        document.addEventListener('visibilitychange', latir);
        window.addEventListener('pagehide', salirPorCierre);

        return () => {
            vigente = false;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', latir);
            window.removeEventListener('pagehide', salirPorCierre);
            formulariosApi.salirPresencia(formularioId).catch(() => {});
        };
    }, [formularioId]);

    useEffect(() => {
        if (!formularioId) return;
        formulariosApi.marcarPresencia(formularioId, seccion).catch(() => {});
    }, [formularioId, seccion]);

    return editores;
}
