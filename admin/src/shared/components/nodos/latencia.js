import { SEMANTIC } from '@app/providers/brand';

export const LATENCIA = {
    fluida: 20,
    lenta: 100,
};

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

const CURVATURA = 0.18;

export const controlDeCurva = (origen, destino) => {
    const medioX = (origen.x + destino.x) / 2;
    const medioY = (origen.y + destino.y) / 2;
    const dx = destino.x - origen.x;
    const dy = destino.y - origen.y;
    return {
        x: medioX - dy * CURVATURA,
        y: medioY + dx * CURVATURA,
    };
};

export const curvaDe = (origen, destino) => {
    const control = controlDeCurva(origen, destino);
    return `M ${origen.x} ${origen.y} Q ${control.x} ${control.y} ${destino.x} ${destino.y}`;
};

export const puntoEnCurva = (origen, destino, t) => {
    const control = controlDeCurva(origen, destino);
    const u = 1 - t;
    return {
        x: u * u * origen.x + 2 * u * t * control.x + t * t * destino.x,
        y: u * u * origen.y + 2 * u * t * control.y + t * t * destino.y,
    };
};

export const duracionTravesia = (origen, destino, ms) => {
    const distancia = Math.hypot(destino.x - origen.x, destino.y - origen.y);
    const factor = 1 + (ms ?? 0) / MS_POR_DUPLICAR;
    return Math.max(DURACION_MINIMA, (distancia / PIXELES_POR_SEGUNDO) * 1000 * factor);
};
