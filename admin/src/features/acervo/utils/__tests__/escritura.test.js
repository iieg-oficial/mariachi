import { describe, expect, it } from 'vitest';
import { puedeEn, puedeSubir, puedeSubirEn } from '../escritura';

const modulo = { acciones: [], carpetas_escribibles: ['metadata/', 'svg/temas/'] };
const completo = { acciones: ['create', 'update', 'delete'], carpetas_escribibles: [] };

describe('escritura en el Acervo', () => {
    it('con acciones del bucket sube a cualquier carpeta', () => {
        expect(puedeSubirEn(completo, '')).toBe(true);
        expect(puedeSubirEn(completo, 'plugin/')).toBe(true);
    });

    it('con carpetas de módulo solo sube dentro de ellas', () => {
        expect(puedeSubirEn(modulo, 'metadata/xlsx/')).toBe(true);
        expect(puedeSubirEn(modulo, '/svg/temas')).toBe(true);
        expect(puedeSubirEn(modulo, '')).toBe(false);
        expect(puedeSubirEn(modulo, 'svg/')).toBe(false);
        expect(puedeSubirEn(modulo, 'metadata/../plugin')).toBe(false);
    });

    it('sin acciones ni carpetas no sube', () => {
        expect(puedeSubir({ acciones: [], carpetas_escribibles: [] })).toBe(false);
        expect(puedeSubir(undefined)).toBe(false);
        expect(puedeSubir(modulo)).toBe(true);
    });

    it('distingue cada acción', () => {
        expect(puedeEn({ acciones: ['create'] }, 'delete')).toBe(false);
        expect(puedeEn({ acciones: ['delete'] }, 'delete')).toBe(true);
    });
});
