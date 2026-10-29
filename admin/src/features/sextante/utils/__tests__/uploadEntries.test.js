import { describe, expect, it } from 'vitest';
import { describeFile, filesFromDataTransfer, joinPath, toSafePath } from '@features/sextante/utils/uploadEntries';

const EXT = ['svg', 'png'];
const archivo = (name, size = 10) => ({ name, size });

const fileEntry = (name) => ({ isFile: true, isDirectory: false, name, file: (ok) => ok(archivo(name)) });
const dirEntry = (name, children) => ({
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
        let entregado = false;
        return {
            readEntries: (ok) => {
                ok(entregado ? [] : children);
                entregado = true;
            },
        };
    },
});

describe('toSafePath', () => {
    it('normaliza cada segmento y conserva la estructura', () => {
        expect(toSafePath('Señalética Vial/Flecha Roja.SVG')).toBe('senaletica-vial/flecha-roja.svg');
    });

    it('quita acentos y eñes sin perder la letra', () => {
        expect(toSafePath('Año/Ñandú.png')).toBe('ano/nandu.png');
    });

    it('descarta segmentos vacíos', () => {
        expect(toSafePath('/a//b.png')).toBe('a/b.png');
    });
});

describe('describeFile', () => {
    it('acepta extensiones soportadas', () => {
        expect(describeFile(archivo('Icono.PNG'), 'iconos/Icono.PNG', EXT)).toEqual({
            safe: 'iconos/icono.png', valid: true, reason: null,
        });
    });

    it('omite extensiones no soportadas y ocultos', () => {
        expect(describeFile(archivo('.DS_Store'), 'iconos/.DS_Store', EXT).valid).toBe(false);
        expect(describeFile(archivo('notas.txt'), 'notas.txt', EXT).valid).toBe(false);
    });

    it('omite archivos vacíos', () => {
        expect(describeFile(archivo('a.svg', 0), 'a.svg', EXT).reason).toMatch(/vacío/);
    });
});

describe('joinPath', () => {
    it('ignora partes vacías', () => {
        expect(joinPath('', 'a.svg')).toBe('a.svg');
        expect(joinPath('base', 'sub/a.svg')).toBe('base/sub/a.svg');
    });
});

describe('filesFromDataTransfer', () => {
    it('recorre carpetas soltadas con su ruta relativa', async () => {
        const raiz = dirEntry('iconos', [fileEntry('a.svg'), dirEntry('sub', [fileEntry('b.png')])]);
        const dt = { items: [{ kind: 'file', webkitGetAsEntry: () => raiz }], files: [] };
        const out = await filesFromDataTransfer(dt);
        expect(out.map((f) => f.relativePath)).toEqual(['iconos/a.svg', 'iconos/sub/b.png']);
    });

    it('cae a la lista plana si el navegador no da entradas', async () => {
        const dt = { items: [], files: [archivo('a.svg')] };
        const out = await filesFromDataTransfer(dt);
        expect(out).toEqual([{ file: archivo('a.svg'), relativePath: 'a.svg' }]);
    });
});
