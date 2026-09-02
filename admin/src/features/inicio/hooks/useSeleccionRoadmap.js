import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const tipoDe = (item) => {
    if (!item) return 'hitos';
    if (item.x0 != null) return 'ciclos';
    if (item.cada != null) return 'procesos';
    return 'hitos';
};

export default function useSeleccionRoadmap({ datos, ciclos, procesos, marcoRef }) {
    const [seleccion, setSeleccion] = useState(null);
    const [fijado, setFijado] = useState(false);
    const [tip, setTip] = useState(null);
    const [anclaBarra, setAnclaBarra] = useState(null);
    const [verFormulario, setVerFormulario] = useState(false);
    const tipRef = useRef(null);

    const buscar = useCallback(
        (id) => [...datos, ...ciclos, ...procesos].find((item) => item.id === id) || null,
        [datos, ciclos, procesos],
    );

    const activo = seleccion ? buscar(seleccion) : null;
    const esCiclo = Boolean(activo && activo.x0 != null);
    const familia = activo && !esCiclo ? (activo.de || activo.proy) : null;

    const relacionados = useMemo(() => {
        if (!activo || esCiclo) return new Set();
        const ids = new Set([activo.id]);
        datos.forEach((h) => {
            if ((h.de || h.proy) === familia) ids.add(h.id);
        });
        const sumarLinaje = (id) => {
            datos.forEach((h) => {
                if (h.id === id && h.naceDe && !ids.has(h.naceDe)) {
                    ids.add(h.naceDe);
                    sumarLinaje(h.naceDe);
                }
                if (h.naceDe === id && !ids.has(h.id)) {
                    ids.add(h.id);
                    sumarLinaje(h.id);
                }
            });
        };
        [...ids].forEach(sumarLinaje);
        return ids;
    }, [activo, esCiclo, familia, datos]);

    const limpiar = useCallback(() => {
        setFijado(false);
        setSeleccion(null);
        setTip(null);
        setAnclaBarra(null);
        setVerFormulario(false);
    }, []);

    useEffect(() => {
        if (!fijado) return undefined;
        const alClicFuera = (evento) => {
            if (tipRef.current?.contains(evento.target)) return;
            limpiar();
        };
        document.addEventListener('click', alClicFuera);
        return () => document.removeEventListener('click', alClicFuera);
    }, [fijado, limpiar]);

    const situarTip = useCallback((id, evento) => {
        const item = buscar(id);
        if (!item || !marcoRef.current) return;
        const marco = marcoRef.current.getBoundingClientRect();
        setTip({
            item,
            x: Math.min(Math.max(evento.clientX - marco.left + 14, 8), Math.max(8, marco.width - 336)),
            y: Math.max(8, evento.clientY - marco.top + 16),
        });
    }, [buscar, marcoRef]);

    const anclar = useCallback((id, evento) => {
        if (!marcoRef.current) return setAnclaBarra(null);
        const marco = marcoRef.current.getBoundingClientRect();
        const caja = evento?.currentTarget?.getBoundingClientRect?.();
        const cx = evento?.clientX || (caja ? caja.left + caja.width / 2 : marco.left + marco.width / 2);
        const cy = evento?.clientY || (caja ? caja.top : marco.top + 60);
        return setAnclaBarra({
            id,
            x: Math.min(Math.max(cx - marco.left - 150, 8), Math.max(8, marco.width - 320)),
            y: Math.max(8, cy - marco.top - 54),
        });
    }, [marcoRef]);

    return {
        seleccion, setSeleccion, fijado, setFijado, tip, setTip, tipRef,
        anclaBarra, setAnclaBarra, verFormulario, setVerFormulario,
        activo, esCiclo, familia, relacionados, buscar, limpiar, situarTip, anclar,
    };
}
