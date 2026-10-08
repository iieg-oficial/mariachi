import { describe, it, expect } from 'vitest';

import { aPruebas, deLasPruebas } from '../helpers/pruebas';

describe('ligas de pruebas', () => {
    it('una por línea, «Etiqueta | URL», ida y vuelta', () => {
        const texto = 'Espejo | https://portalito.iieg/mapalab/mapa\n\nLocal | https://canario.iieg/mapalab/mapa\nsin url';
        const pruebas = aPruebas(texto);
        expect(pruebas).toEqual([
            { etiqueta: 'Espejo', url: 'https://portalito.iieg/mapalab/mapa' },
            { etiqueta: 'Local', url: 'https://canario.iieg/mapalab/mapa' },
        ]);
        expect(aPruebas(deLasPruebas(pruebas))).toEqual(pruebas);
        expect(aPruebas('')).toEqual([]);
    });
});
