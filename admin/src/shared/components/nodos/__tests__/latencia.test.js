import { describe, it, expect } from 'vitest';
import { colorLatencia, colorArista, duracionTravesia, LATENCIA } from '@shared/components/nodos/latencia';
import { SEMANTIC } from '@app/providers/brand';

const corto = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
const largo = [{ x: 0, y: 0 }, { x: 600, y: 0 }];

describe('color por latencia', () => {
    it('un enlace fluido va en verde', () => {
        expect(colorLatencia(4)).toBe(SEMANTIC.success);
        expect(colorLatencia(LATENCIA.fluida)).toBe(SEMANTIC.success);
    });

    it('a partir del umbral pasa a ambar', () => {
        expect(colorLatencia(LATENCIA.fluida + 1)).toBe(SEMANTIC.warning);
        expect(colorLatencia(LATENCIA.lenta)).toBe(SEMANTIC.warning);
    });

    it('por encima del segundo umbral va en rojo', () => {
        expect(colorLatencia(LATENCIA.lenta + 1)).toBe(SEMANTIC.danger);
    });

    it('sin medicion queda neutro y no finge estar sano', () => {
        expect(colorLatencia(null)).toBe(SEMANTIC.neutral);
    });

    it('una arista caida manda sobre su latencia', () => {
        expect(colorArista({ estado: 'down', ms: 2 })).toBe(SEMANTIC.danger);
        expect(colorArista({ estado: 'ok', ms: 2 })).toBe(SEMANTIC.success);
    });
});

describe('duracion de la travesia', () => {
    it('a igual latencia el tramo largo tarda mas: la velocidad es la misma', () => {
        const lento = duracionTravesia(largo[0], largo[1], 30);
        const rapido = duracionTravesia(corto[0], corto[1], 30);
        expect(lento).toBeGreaterThan(rapido);
        expect(lento / largo[1].x).toBeCloseTo(rapido / corto[1].x, 5);
    });

    it('a igual distancia mas latencia tarda mas', () => {
        expect(duracionTravesia(largo[0], largo[1], 40))
            .toBeGreaterThan(duracionTravesia(largo[0], largo[1], 4));
    });

    it('nunca baja del piso, para que un enlace rapido no parpadee', () => {
        expect(duracionTravesia({ x: 0, y: 0 }, { x: 5, y: 0 }, 0)).toBe(700);
    });

    it('sin medicion se comporta como latencia cero', () => {
        expect(duracionTravesia(largo[0], largo[1], null))
            .toBe(duracionTravesia(largo[0], largo[1], 0));
    });
});
