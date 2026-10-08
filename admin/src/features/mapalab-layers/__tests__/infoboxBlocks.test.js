import { describe, it, expect } from 'vitest';
import {
    blockInstances,
    naturalOrder,
    planAddBlock,
    planDuplicateBlock,
    planRemoveBlock,
    planSetBlockItems,
    resolveBodyOrder,
} from '@features/mapalab-layers/constants/infoboxBlocks';

const aplicar = (config, plan) => {
    const next = { ...config, ...plan.patch };
    Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
    return next;
};

const paso = (config, plan) => ({ config: aplicar(config, plan), focusKey: plan.focusKey });

describe('blockInstances', () => {
    it('lee la forma de siempre como una sola instancia', () => {
        const cfg = { list: [{ field: 'a', label: 'A' }] };
        expect(blockInstances(cfg, 'list')).toEqual([
            { key: 'list', type: 'list', id: null, items: [{ field: 'a', label: 'A' }] },
        ]);
    });

    it('lee la forma con ids como varias instancias', () => {
        const cfg = { list: [{ id: 'x', items: [{ field: 'a' }] }, { id: 'y', items: [{ field: 'b' }] }] };
        expect(blockInstances(cfg, 'list').map((i) => i.key)).toEqual(['list:x', 'list:y']);
    });

    it('un bloque ausente o vacío no da instancias', () => {
        expect(blockInstances({}, 'list')).toEqual([]);
        expect(blockInstances({ list: [] }, 'list')).toEqual([]);
    });
});

describe('planAddBlock', () => {
    it('el primero se guarda en la forma de siempre, sin blockOrder', () => {
        const { config } = paso({}, planAddBlock({}, [], 'list'));
        expect(config.list).toEqual([{ field: '', label: '' }]);
        expect(config.blockOrder).toBeUndefined();
    });

    it('el segundo del mismo tipo pasa a la forma con ids', () => {
        const base = { list: [{ field: 'a', label: 'A' }] };
        const { config, focusKey } = paso(base, planAddBlock(base, resolveBodyOrder(base), 'list'));
        expect(config.list).toHaveLength(2);
        expect(config.list[0].items).toEqual([{ field: 'a', label: 'A' }]);
        expect(focusKey).toBe(`list:${config.list[1].id}`);
    });

    it('cards arrastra su cardsColumns', () => {
        const { config } = paso({}, planAddBlock({}, [], 'cards'));
        expect(config.cardsColumns).toBe(1);
    });
});

describe('planDuplicateBlock', () => {
    it('la copia queda justo después del original', () => {
        const base = {
            labelGroups: [{ fields: ['municipio'] }],
            list: [{ field: 'a', label: 'A' }],
        };
        const orden = resolveBodyOrder(base);
        expect(orden).toEqual(['labelGroups', 'list']);
        const { config, focusKey } = paso(base, planDuplicateBlock(base, orden, 'labelGroups'));
        expect(config.labelGroups).toHaveLength(2);
        expect(resolveBodyOrder(config)).toEqual([
            `labelGroups:${config.labelGroups[0].id}`,
            focusKey,
            'list',
        ]);
        expect(config.blockOrder).toBeUndefined();
    });

    it('respeta un orden propio y mete la copia en su sitio', () => {
        const base = {
            labelGroups: [{ fields: ['municipio'] }],
            list: [{ field: 'a', label: 'A' }],
            blockOrder: ['list', 'labelGroups'],
        };
        const { config, focusKey } = paso(base, planDuplicateBlock(base, resolveBodyOrder(base), 'labelGroups'));
        expect(config.blockOrder).toEqual([
            'list',
            `labelGroups:${config.labelGroups[0].id}`,
            focusKey,
        ]);
    });

    it('la copia no comparte referencia con el original', () => {
        const base = { list: [{ field: 'a', label: 'A' }] };
        const { config } = paso(base, planDuplicateBlock(base, resolveBodyOrder(base), 'list'));
        config.list[1].items[0].label = 'cambiada';
        expect(config.list[0].items[0].label).toBe('A');
    });

    it('duplicar dos veces deja tres instancias en orden', () => {
        let config = { list: [{ field: 'a', label: 'A' }] };
        ({ config } = paso(config, planDuplicateBlock(config, resolveBodyOrder(config), 'list')));
        const primera = `list:${config.list[0].id}`;
        ({ config } = paso(config, planDuplicateBlock(config, resolveBodyOrder(config), primera)));
        expect(config.list).toHaveLength(3);
        expect(resolveBodyOrder(config)).toHaveLength(3);
    });

    it('una llave que no existe no cambia nada', () => {
        expect(planDuplicateBlock({ list: [{ field: 'a' }] }, ['list'], 'list:nope')).toBeNull();
    });
});

describe('planRemoveBlock', () => {
    it('al quedar una sola instancia vuelve a la forma de siempre', () => {
        let config = { list: [{ field: 'a', label: 'A' }] };
        ({ config } = paso(config, planDuplicateBlock(config, resolveBodyOrder(config), 'list')));
        const segunda = `list:${config.list[1].id}`;
        ({ config } = paso(config, planRemoveBlock(config, resolveBodyOrder(config), segunda)));
        expect(config.list).toEqual([{ field: 'a', label: 'A' }]);
        expect(config.blockOrder).toBeUndefined();
    });

    it('quitar el último borra la clave y su cardsColumns', () => {
        const base = { cards: [{ field: 'a', label: 'A' }], cardsColumns: 2 };
        const { config } = paso(base, planRemoveBlock(base, resolveBodyOrder(base), 'cards'));
        expect(config.cards).toBeUndefined();
        expect(config.cardsColumns).toBeUndefined();
    });

    it('quitar uno no altera el orden de los demás', () => {
        const base = {
            labelGroups: [{ fields: ['m'] }],
            list: [{ field: 'a' }],
            cards: [{ field: 'n', label: 'N' }],
            blockOrder: ['cards', 'labelGroups', 'list'],
        };
        const { config } = paso(base, planRemoveBlock(base, resolveBodyOrder(base), 'labelGroups'));
        expect(config.blockOrder).toEqual(['cards', 'list']);
    });
});

describe('planSetBlockItems', () => {
    it('vaciar una instancia la elimina', () => {
        const base = { list: [{ field: 'a', label: 'A' }] };
        const { config } = paso(base, planSetBlockItems(base, resolveBodyOrder(base), 'list', []));
        expect(config.list).toBeUndefined();
    });

    it('cambiar los items no toca las otras instancias', () => {
        let config = { list: [{ field: 'a', label: 'A' }] };
        ({ config } = paso(config, planDuplicateBlock(config, resolveBodyOrder(config), 'list')));
        const primera = `list:${config.list[0].id}`;
        ({ config } = paso(config, planSetBlockItems(config, resolveBodyOrder(config), primera, [{ field: 'z', label: 'Z' }])));
        expect(config.list[0].items).toEqual([{ field: 'z', label: 'Z' }]);
        expect(config.list[1].items).toEqual([{ field: 'a', label: 'A' }]);
    });
});

describe('naturalOrder', () => {
    it('sigue el orden de tipos del visor', () => {
        const cfg = { cards: [{ field: 'a' }], labelGroups: [{ fields: ['m'] }], list: [{ field: 'b' }] };
        expect(naturalOrder(cfg)).toEqual(['labelGroups', 'list', 'cards']);
    });
});
