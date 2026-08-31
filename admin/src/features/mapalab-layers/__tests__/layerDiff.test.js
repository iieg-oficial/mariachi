import { describe, expect, it } from 'vitest';
import { describeValue, diffPayload, labelOf, sectionOf } from '@features/mapalab-layers/utils/layerDiff';

const publicada = {
    label: 'Establecimientos de salud',
    slug: 'establecimientos-salud',
    hiddenInMenu: false,
    searchTags: ['salud'],
    cqlFilter: '',
};

describe('diffPayload', () => {
    it('solo devuelve lo que cambió', () => {
        const cambios = diffPayload({ ...publicada, label: 'Unidades médicas' }, publicada);

        expect(cambios).toEqual({ label: 'Unidades médicas' });
    });

    it('no considera cambio pasar de vacío a nulo', () => {
        expect(diffPayload({ cqlFilter: null }, publicada)).toEqual({});
        expect(diffPayload({ cqlFilter: undefined }, publicada)).toEqual({});
    });

    it('compara arreglos por contenido, no por referencia', () => {
        expect(diffPayload({ searchTags: ['salud'] }, publicada)).toEqual({});
        expect(diffPayload({ searchTags: ['salud', 'clínicas'] }, publicada))
            .toEqual({ searchTags: ['salud', 'clínicas'] });
    });

    it('detecta un booleano que se apaga', () => {
        expect(diffPayload({ hiddenInMenu: true }, publicada)).toEqual({ hiddenInMenu: true });
    });

    it('trata como nuevo cualquier campo que la capa publicada no tenga', () => {
        expect(diffPayload({ badge: { enabled: true } }, publicada))
            .toEqual({ badge: { enabled: true } });
    });
});

describe('presentación de los cambios', () => {
    it('agrupa cada campo en la pestaña donde se edita', () => {
        expect(sectionOf('label')).toBe('Identidad');
        expect(sectionOf('badge')).toBe('Apariencia');
        expect(sectionOf('infoboxConfig')).toBe('Tarjetita');
        expect(sectionOf('cqlFilter')).toBe('Servicios');
    });

    it('nombra los campos como los ve el usuario', () => {
        expect(labelOf('hiddenInMenu')).toBe('Oculta en menú');
        expect(labelOf('campoDesconocido')).toBe('campoDesconocido');
    });

    it('describe valores sin volcar JSON crudo', () => {
        expect(describeValue(true)).toBe('sí');
        expect(describeValue(null)).toBe('—');
        expect(describeValue(['a', 'b'])).toBe('a, b');
        expect(describeValue({ enabled: true })).toBe('configuración');
    });
});

describe('cambios fantasma', () => {
    it('un arreglo vacío no es un cambio frente a nulo', () => {
        expect(diffPayload({ searchTags: [] }, { searchTags: null })).toEqual({});
        expect(diffPayload({ searchTags: [] }, {})).toEqual({});
    });

    it('un objeto vacío no es un cambio frente a nulo', () => {
        expect(diffPayload({ infoboxConfig: {} }, { infoboxConfig: null })).toEqual({});
    });

    it('el orden de las llaves no inventa un cambio', () => {
        const antes = { badge: { enabled: true, texto: 'Nuevo' } };
        const ahora = { badge: { texto: 'Nuevo', enabled: true } };

        expect(diffPayload(ahora, antes)).toEqual({});
    });

    it('un número y su texto son el mismo valor', () => {
        expect(diffPayload({ sortOrder: '7' }, { sortOrder: 7 })).toEqual({});
    });

    it('apagar un interruptor sí es un cambio', () => {
        expect(diffPayload({ disabled: false }, { disabled: true }))
            .toEqual({ disabled: false });
    });

    it('cero no se confunde con vacío', () => {
        expect(diffPayload({ sortOrder: 0 }, { sortOrder: null })).toEqual({ sortOrder: 0 });
    });
});
