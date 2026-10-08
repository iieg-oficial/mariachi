import { describe, it, expect } from 'vitest';
import { isEditableText } from '@features/sextante/utils/geoserverFiles';

describe('isEditableText', () => {
    it('los properties de un mosaico se editan como texto', () => {
        expect(isEditableText({ name: 'indices/nddi/indexer.properties', isDir: false })).toBe(true);
    });

    it('la extension no distingue mayusculas', () => {
        expect(isEditableText({ name: 'TimeRegex.PROPERTIES', isDir: false })).toBe(true);
    });

    it('las imagenes y fuentes solo se renombran', () => {
        expect(isEditableText({ name: 'logo.svg', isDir: false })).toBe(false);
        expect(isEditableText({ name: 'fuente.ttf', isDir: false })).toBe(false);
    });

    it('una carpeta nunca es texto editable', () => {
        expect(isEditableText({ name: 'algo.properties', path: 'algo.properties', isDir: true })).toBe(false);
    });

    it('tolera un recurso vacio', () => {
        expect(isEditableText(null)).toBe(false);
    });
});
