import { SEMANTIC } from '@app/providers/brand';

export const LATENCIA = {
    fluida: 20,
    lenta: 100,
};

export const ESCALA_LATENCIA = [
    { texto: `hasta ${LATENCIA.fluida} ms`, color: SEMANTIC.success },
    { texto: `hasta ${LATENCIA.lenta} ms`, color: SEMANTIC.warning },
    { texto: `más de ${LATENCIA.lenta} ms`, color: SEMANTIC.danger },
];

export const colorLatencia = (ms) => {
    if (ms == null) return SEMANTIC.neutral;
    if (ms <= LATENCIA.fluida) return SEMANTIC.success;
    if (ms <= LATENCIA.lenta) return SEMANTIC.warning;
    return SEMANTIC.danger;
};

export const colorArista = (arista) => (
    arista.estado === 'ok' ? colorLatencia(arista.ms) : SEMANTIC.danger
);

const PIXELES_POR_SEGUNDO = 260;
const DURACION_MINIMA = 700;
const MS_POR_DUPLICAR = 12;

export const duracionTravesia = (origen, destino, ms) => {
    const distancia = Math.hypot(destino.x - origen.x, destino.y - origen.y);
    const factor = 1 + (ms ?? 0) / MS_POR_DUPLICAR;
    return Math.max(DURACION_MINIMA, (distancia / PIXELES_POR_SEGUNDO) * 1000 * factor);
};
