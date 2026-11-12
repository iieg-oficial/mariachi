import { describe, expect, it } from 'vitest';
import { normalizeHex, parseCsv, parsePaletteTable } from '@features/sextante/utils/paletteFile';

describe('paletteFile', () => {
    it('restores the zeros that Excel ate', () => {
        expect(normalizeHex('6466')).toBe('#006466');
        expect(normalizeHex('#ffe3ea')).toBe('#FFE3EA');
        expect(normalizeHex('zz')).toBeNull();
    });

    it('reads quoted cells and other delimiters', () => {
        expect(parseCsv('a;b\n"x;y";"z ""q"""\n')).toEqual([['a', 'b'], ['x;y', 'z "q"']]);
    });

    it('groups the pipeline table by palette and step', () => {
        const text = [
            'palette_name,tipo_paleta,step,hex',
            'S_MAGENTA_3,secuencial,2,FFACC4',
            'S_MAGENTA_3,secuencial,1,FFE3EA',
            'S_MAGENTA_3,secuencial,3,6466',
            'S_MALA,secuencial,1,nope',
        ].join('\n');
        expect(parsePaletteTable(text)).toEqual([
            { name: 'S_MAGENTA_3', colors: ['#FFE3EA', '#FFACC4', '#006466'] },
        ]);
    });

    it('accepts one row per palette with a colors column', () => {
        expect(parsePaletteTable('nombre,colores\nMia,"#111111 222222"')).toEqual([
            { name: 'Mia', colors: ['#111111', '#222222'] },
        ]);
        expect(parsePaletteTable('x,y\n1,2')).toEqual([]);
    });
});
