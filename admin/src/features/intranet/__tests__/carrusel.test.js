import { describe, expect, it } from 'vitest';

import { aPayload } from '../helpers/carrusel';

describe('aPayload del carrusel', () => {
    it('manda el enlace y el botón cuando hay enlace', () => {
        const datos = aPayload(
            { name: 'X', title: 'Y', description: 'Z', background_url: '#123456', enlace: ' /calendario ', boton: 'Ver' },
            { edicion: true },
        );
        expect(datos.get('enlace')).toBe('/calendario');
        expect(datos.get('boton')).toBe('Ver');
        expect(datos.get('vaciar')).toBeNull();
        expect(datos.get('sin_enlace')).toBeNull();
    });

    it('al editar pide vaciar los campos que quedaron vacíos o con solo espacios', () => {
        const datos = aPayload(
            { name: 'X', title: 'Y', description: '  ', background_url: '', enlace: ' ', boton: null },
            { edicion: true },
        );
        expect(datos.get('vaciar')).toBe('description,background_url,enlace,boton');
        expect(datos.get('description')).toBeNull();
        expect(datos.get('enlace')).toBeNull();
        expect(datos.get('boton')).toBeNull();
    });

    it('no reenvía ni vacía la ruta de un archivo ya subido', () => {
        const datos = aPayload(
            { name: 'X', title: 'Y', description: 'Z', enlace: '', boton: 'Ver', background_url: '/static/uploads/carousel/a.png' },
            { edicion: true },
        );
        expect(datos.get('background_url')).toBeNull();
        expect(datos.get('vaciar')).toBe('enlace');
    });

    it('en el alta no manda vaciar', () => {
        const datos = aPayload({ name: 'X', title: 'Y', enlace: '' });
        expect(datos.get('vaciar')).toBeNull();
        expect(datos.get('enlace')).toBeNull();
        expect(datos.get('name')).toBe('X');
    });
});
