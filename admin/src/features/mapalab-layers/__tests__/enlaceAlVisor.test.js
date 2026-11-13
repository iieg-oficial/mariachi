import { describe, expect, it } from 'vitest';
import { enlaceAlVisor } from '@features/mapalab-layers/utils/enlaceAlVisor';

describe('enlaceAlVisor', () => {
    it('arma el deeplink con la vista inicial y la capa', () => {
        expect(enlaceAlVisor('aeropuertos', 'https://iieg.jalisco.gob.mx'))
            .toBe('https://iieg.jalisco.gob.mx/mapalab/mapa?zoom=8.30&lat=20.850000&lon=-103.800000&layers=aeropuertos');
    });

    it('sin capa no propone nada', () => {
        expect(enlaceAlVisor(null, 'https://x')).toBe('');
    });
});
