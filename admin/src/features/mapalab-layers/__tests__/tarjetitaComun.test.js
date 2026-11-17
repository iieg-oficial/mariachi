import { describe, it, expect } from 'vitest';
import {
    grupoDePropiedad,
    mismaTarjetita,
    tarjetitaComun,
} from '@features/mapalab-layers/utils/propagacionTarjetita';

const TARJETA = { headerField: 'nombre', list: [{ field: 'fecha', label: 'Fecha' }] };
const MISMA_EN_OTRO_ORDEN = { list: [{ label: 'Fecha', field: 'fecha' }], headerField: 'nombre' };

const arbol = (grupoCard, hijos) => [{
    id: 'tema', label: 'Tema', nodeType: 'tema', children: [{
        id: 'g', label: 'Cultivos', nodeType: 'group', littleCard: grupoCard, children: hijos,
    }],
}];

describe('mismaTarjetita', () => {
    it('ignora el orden de las claves', () => {
        expect(mismaTarjetita(TARJETA, MISMA_EN_OTRO_ORDEN)).toBe(true);
        expect(mismaTarjetita(TARJETA, { headerField: 'otro' })).toBe(false);
    });
});

describe('tarjetitaComun', () => {
    it('detecta propiedades con la misma tarjetita copiada, también bajo etiquetas', () => {
        const t = arbol(null, [
            { id: 'a', nodeType: 'leaf', littleCard: TARJETA },
            { id: 'e', nodeType: 'label', children: [{ id: 'b', nodeType: 'leaf', littleCard: MISMA_EN_OTRO_ORDEN }] },
        ]);
        expect(tarjetitaComun(t, 'g')).toEqual({
            grupo: { id: 'g', label: 'Cultivos' },
            config: TARJETA,
            ids: ['a', 'b'],
        });
    });

    it('no aplica si difieren, si hay una sola o si el grupo ya tiene la suya', () => {
        const distintas = arbol(null, [
            { id: 'a', nodeType: 'leaf', littleCard: TARJETA },
            { id: 'b', nodeType: 'leaf', littleCard: { headerField: 'otro' } },
        ]);
        const una = arbol(null, [{ id: 'a', nodeType: 'leaf', littleCard: TARJETA }]);
        const conPropia = arbol(TARJETA, [
            { id: 'a', nodeType: 'leaf', littleCard: TARJETA },
            { id: 'b', nodeType: 'leaf', littleCard: TARJETA },
        ]);
        expect(tarjetitaComun(distintas, 'g')).toBeNull();
        expect(tarjetitaComun(una, 'g')).toBeNull();
        expect(tarjetitaComun(conPropia, 'g')).toBeNull();
        expect(tarjetitaComun(distintas, 'tema')).toBeNull();
    });
});

describe('grupoDePropiedad', () => {
    const t = arbol(null, [
        { id: 'a', nodeType: 'leaf' },
        { id: 'e', nodeType: 'label', children: [{ id: 'b', nodeType: 'leaf' }] },
    ]);

    it('encuentra el grupo atravesando etiquetas', () => {
        expect(grupoDePropiedad(t, 'a').id).toBe('g');
        expect(grupoDePropiedad(t, 'b').id).toBe('g');
    });

    it('no aplica a nodos que no son propiedad', () => {
        expect(grupoDePropiedad(t, 'g')).toBeNull();
        expect(grupoDePropiedad([{ id: 'x', nodeType: 'category', children: [{ id: 'y', nodeType: 'leaf' }] }], 'y')).toBeNull();
    });
});
