import { describe, expect, it } from 'vitest';

import {
    aplicarFormato,
    camposConAnio,
    conAnio,
    elegirCamposSimples,
    esCampoConEstilo,
    esCampoSimple,
    marcarAnio,
} from '../formatoCampo';

describe('aplicarFormato', () => {
    it('sin formato deja el valor intacto', () => {
        expect(aplicarFormato('2026-01-01', undefined)).toBe('2026-01-01');
    });

    it('con año recorta el texto ISO sin pasar por la zona horaria', () => {
        expect(aplicarFormato('2024-01-01', 'anio')).toBe('2024');
        expect(aplicarFormato('2024-12-31T23:00:00Z', 'anio')).toBe('2024');
    });

    it('deja pasar lo que no es fecha', () => {
        expect(aplicarFormato('sin dato', 'anio')).toBe('sin dato');
        expect(aplicarFormato('', 'anio')).toBe('');
        expect(aplicarFormato(null, 'anio')).toBeNull();
    });
});

describe('conAnio', () => {
    it('pone y quita la llave sin tocar lo demás', () => {
        const fila = { field: 'fecha', label: 'Año', raw: true };
        expect(conAnio(fila, true)).toEqual({ ...fila, formato: 'anio' });
        expect(conAnio({ ...fila, formato: 'anio' }, false)).toEqual(fila);
    });
});

describe('campos de un grupo de etiquetas', () => {
    it('distingue un campo con año de uno con estilo propio', () => {
        expect(esCampoSimple('fecha')).toBe(true);
        expect(esCampoSimple({ field: 'fecha', formato: 'anio' })).toBe(true);
        expect(esCampoConEstilo({ field: 'fecha', color: '#000' })).toBe(true);
        expect(esCampoConEstilo({ field: 'fecha', formato: 'anio' })).toBe(false);
    });

    it('marcar año conserva el orden y regresa a texto al desmarcar', () => {
        const campos = ['fecha', 'municipio', { field: 'tipo', color: '#000' }];
        const marcados = marcarAnio(campos, ['fecha', 'tipo']);
        expect(marcados).toEqual([
            { field: 'fecha', formato: 'anio' },
            'municipio',
            { field: 'tipo', color: '#000', formato: 'anio' },
        ]);
        expect(camposConAnio(marcados)).toEqual(['fecha', 'tipo']);
        expect(marcarAnio(marcados, [])).toEqual(campos);
    });

    it('elegir campos simples no mueve los que ya estaban', () => {
        const campos = [{ field: 'fecha', formato: 'anio' }, 'municipio', { field: 'tipo', color: '#000' }];
        expect(elegirCamposSimples(campos, ['municipio', 'fecha', 'region'])).toEqual([
            { field: 'fecha', formato: 'anio' },
            'municipio',
            { field: 'tipo', color: '#000' },
            'region',
        ]);
        expect(elegirCamposSimples(campos, ['municipio'])).toEqual(['municipio', { field: 'tipo', color: '#000' }]);
    });
});
