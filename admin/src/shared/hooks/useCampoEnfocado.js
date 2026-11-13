import { useEffect, useState } from 'react';

export const CAMPO_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
const SALIDA_MS = 400;

export default function useCampoEnfocado(selector, activo = true) {
    const [campo, setCampo] = useState(null);

    useEffect(() => {
        if (!activo || !selector) return undefined;
        let timer = null;
        const alEnfocar = (evento) => {
            const id = evento.target?.closest?.(selector) ? evento.target.id : null;
            if (!id) return;
            clearTimeout(timer);
            setCampo(CAMPO_VALIDO.test(id) ? id : null);
        };
        const alSalir = (evento) => {
            if (!evento.target?.closest?.(selector)) return;
            clearTimeout(timer);
            timer = setTimeout(() => setCampo(null), SALIDA_MS);
        };
        document.addEventListener('focusin', alEnfocar);
        document.addEventListener('focusout', alSalir);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('focusin', alEnfocar);
            document.removeEventListener('focusout', alSalir);
        };
    }, [selector, activo]);

    return activo ? campo : null;
}
