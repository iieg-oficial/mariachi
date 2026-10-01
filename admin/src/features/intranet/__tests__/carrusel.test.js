import { describe, expect, it } from 'vitest';

import { aPayload } from '../helpers/carrusel';

describe('aPayload del carrusel', () => {
    it('manda el enlace y el botón cuando hay enlace', () => {
        const datos = aPayload({ name: 'X', title: 'Y', enlace: ' /calendario ', boton: 'Ver' });
        expect(datos.get('enlace')).toBe('/calendario');
        expect(datos.get('boton')).toBe('Ver');
        expect(datos.get('sin_enlace')).toBeNull();
    });

    it('sin enlace pide borrarlo y no reenvía la ruta de un archivo ya subido', () => {
        const datos = aPayload({ name: 'X', title: 'Y', enlace: '', background_url: '/static/uploads/carousel/a.png' });
        expect(datos.get('sin_enlace')).toBe('true');
        expect(datos.get('enlace')).toBeNull();
        expect(datos.get('background_url')).toBeNull();
    });
});
