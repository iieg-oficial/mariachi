import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_PASOS = 30;
const COALESCE_MS = 500;

const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/*
 * Pila de deshacer sobre la configuración de la tarjetita.
 *
 * Coalesce los cambios seguidos: escribir una etiqueta manda un cambio por tecla y
 * sin esto cada Ctrl+Z borraría una sola letra. Dentro de medio segundo se reemplaza
 * la cima en vez de apilar, así que un deshacer equivale a una edición, no a un caracter.
 */
export const useInfoboxUndo = (value, onChange) => {
    const [pasado, setPasado] = useState([]);
    const [futuro, setFuturo] = useState([]);
    const ultimoRef = useRef(value);
    const marcaRef = useRef(0);
    const internoRef = useRef(false);

    useEffect(() => {
        if (igual(value, ultimoRef.current)) return;
        const previo = ultimoRef.current;
        ultimoRef.current = value;
        if (internoRef.current) {
            internoRef.current = false;
            return;
        }
        const ahora = Date.now();
        const seguido = ahora - marcaRef.current < COALESCE_MS;
        marcaRef.current = ahora;
        setPasado((p) => ((seguido && p.length) ? p : [...p, previo].slice(-MAX_PASOS)));
        setFuturo([]);
    }, [value]);

    const aplicar = useCallback((siguiente) => {
        internoRef.current = true;
        marcaRef.current = 0;
        onChange?.(siguiente ?? null);
    }, [onChange]);

    const undo = useCallback(() => {
        if (!pasado.length) return;
        setPasado(pasado.slice(0, -1));
        setFuturo([...futuro, ultimoRef.current]);
        aplicar(pasado[pasado.length - 1]);
    }, [pasado, futuro, aplicar]);

    const redo = useCallback(() => {
        if (!futuro.length) return;
        setFuturo(futuro.slice(0, -1));
        setPasado([...pasado, ultimoRef.current].slice(-MAX_PASOS));
        aplicar(futuro[futuro.length - 1]);
    }, [pasado, futuro, aplicar]);

    useEffect(() => {
        const escribiendo = (el) => {
            const etiqueta = el?.tagName;
            return etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || el?.isContentEditable;
        };
        const alTeclear = (e) => {
            if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
            if (escribiendo(e.target)) return;
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
        };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [undo, redo]);

    return { undo, redo, canUndo: pasado.length > 0, canRedo: futuro.length > 0 };
};
