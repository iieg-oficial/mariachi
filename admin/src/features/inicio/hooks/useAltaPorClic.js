import { useCallback } from 'react';
import { ALTO, ANCHO } from '@features/inicio/constants/roadmapModelo';
import { fechaEnX, zonaEnY } from '@features/inicio/helpers/roadmapLayout';

export default function useAltaPorClic(svgRef, ciclos, alCrear) {
    return useCallback((evento) => {
        if (!svgRef.current) return;
        const caja = svgRef.current.getBoundingClientRect();
        const x = ((evento.clientX - caja.left) / caja.width) * ANCHO;
        const y = ((evento.clientY - caja.top) / caja.height) * ALTO;
        const zona = zonaEnY(y, ciclos);
        if (!zona) return;

        const fecha = fechaEnX(x);
        if (zona.tipo === 'hitos') {
            alCrear('hitos', { f: fecha, fecha });
            return;
        }
        if (zona.tipo === 'procesos') {
            alCrear('procesos', { desde: fecha, cada: fecha.slice(5), fecha: `anual · desde ${fecha}` });
            return;
        }
        alCrear('ciclos', {
            x0: Math.max(60, x - 120),
            x1: Math.min(2340, x + 120),
            y0: zona.vecino.y0 ?? null,
            y1: zona.vecino.y1 ?? null,
        });
    }, [svgRef, ciclos, alCrear]);
}
