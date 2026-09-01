import { useCallback, useRef, useState } from 'react';
import { ANCHO } from '@features/inicio/constants/roadmapModelo';
import { fechaEnX } from '@features/inicio/helpers/roadmapLayout';

export default function useArrastreHito(svgRef, alSoltar) {
    const [arrastre, setArrastre] = useState(null);
    const fechaRef = useRef(null);

    const arrastrar = useCallback((hito, evento) => {
        if (!svgRef.current) return;
        evento.stopPropagation();
        evento.currentTarget.setPointerCapture?.(evento.pointerId);
        const caja = svgRef.current.getBoundingClientRect();
        const escala = ANCHO / caja.width;
        fechaRef.current = hito.f;

        const mover = (e) => {
            fechaRef.current = fechaEnX((e.clientX - caja.left) * escala);
            setArrastre({ id: hito.id, fecha: fechaRef.current });
        };
        const soltar = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
            setArrastre(null);
            if (fechaRef.current !== hito.f) alSoltar({ ...hito, f: fechaRef.current });
        };
        window.addEventListener('pointermove', mover);
        window.addEventListener('pointerup', soltar);
    }, [svgRef, alSoltar]);

    return { arrastre, arrastrar };
}
