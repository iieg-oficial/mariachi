import { describe, it, expect } from 'vitest';

import { aEnlaceConFestejo, deEnlaceConFestejo, separarEmojis } from '../helpers/festejo';

describe('festejos en el carrusel', () => {
    it('el festejo elegido viaja como @festejo:<id> y vuelve al formulario', () => {
        expect(aEnlaceConFestejo({ title: 'X', enlace: '', festejo_id: 3 })).toEqual({ title: 'X', enlace: '@festejo:3' });
        expect(aEnlaceConFestejo({ title: 'X', enlace: '/calendario', festejo_id: undefined })).toEqual({ title: 'X', enlace: '/calendario' });
        expect(deEnlaceConFestejo({ id: 5, enlace: '@festejo:3' })).toEqual({ id: 5, enlace: '', festejo_id: 3 });
        expect(deEnlaceConFestejo({ id: 5, enlace: '/calendario' })).toEqual({ id: 5, enlace: '/calendario' });
    });

    it('separa los emojis aunque sean compuestos', () => {
        expect(separarEmojis('🎄⭐🎁')).toEqual(['🎄', '⭐', '🎁']);
    });
});
