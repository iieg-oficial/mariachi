import { describe, it, expect } from 'vitest';
import { aliasSugerido, aliasTomado } from '@features/sextante/utils/workspaceAlias';

describe('aliasSugerido', () => {
    it('abrevia hasta el primer guion bajo', () => {
        expect(aliasSugerido('seguridad_y_proteccion_ciudadana')).toBe('seguridad');
    });

    it('deja igual un nombre de una sola palabra y lo pasa a minusculas', () => {
        expect(aliasSugerido('Educacion')).toBe('educacion');
    });

    it('sin workspace devuelve cadena vacia', () => {
        expect(aliasSugerido('')).toBe('');
        expect(aliasSugerido(undefined)).toBe('');
    });
});

describe('aliasTomado', () => {
    const registrados = [
        { alias: 'salud', geoserverWorkspace: 'salud' },
        { alias: 'seguridad', geoserverWorkspace: 'seguridad_y_proteccion_ciudadana' },
    ];

    it('encuentra el workspace que ya usa ese alias', () => {
        expect(aliasTomado('seguridad', registrados).geoserverWorkspace)
            .toBe('seguridad_y_proteccion_ciudadana');
    });

    it('devuelve null cuando el alias esta libre', () => {
        expect(aliasTomado('turismo', registrados)).toBeNull();
    });

    it('sin alias o sin lista no falla', () => {
        expect(aliasTomado('', registrados)).toBeNull();
        expect(aliasTomado('salud', undefined)).toBeNull();
    });
});
