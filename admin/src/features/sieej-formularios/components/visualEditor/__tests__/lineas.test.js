import { describe, expect, it } from 'vitest';
import {
    assignColSpan, groupIntoRows, layoutOf, materializeLayout, moveRow, setOpensRow,
    unirLineaAnterior,
} from '../fieldLayout';

const field = (name, colSpan = 1, col) => ({
    name,
    label: name.toUpperCase(),
    layout: col == null ? { colSpan } : layoutOf(colSpan, col),
});

const allIdx = (fields) => fields.map((_, i) => i);
describe('crear y quitar lineas', () => {
    const lineasDe = (fields) => groupIntoRows(fields, allIdx(fields))
        .map((r) => r.items.map((it) => `${fields[it.idx].name}@${it.col}`));

    it('marcar un campo abre una linea desde el', () => {
        const fields = materializeLayout(
            [field('a', 3), field('b', 3), field('c', 3)],
            [0, 1, 2],
        );
        expect(lineasDe(fields)).toEqual([['a@1', 'b@3', 'c@5']]);

        expect(lineasDe(setOpensRow(fields, allIdx(fields), 1, true)))
            .toEqual([['a@1'], ['b@3', 'c@5']]);
    });

    it('quitar la marca sube la linea a la anterior si cabe', () => {
        const fields = materializeLayout(
            [field('a', 3), field('b', 3, 1), field('c', 3)],
            [0, 1, 2],
        );
        expect(lineasDe(fields)).toEqual([['a@1'], ['b@1', 'c@3']]);

        expect(lineasDe(unirLineaAnterior(fields, allIdx(fields), 1)))
            .toEqual([['a@1', 'b@3', 'c@5']]);
    });

    it('quitar la marca no encima campos cuando ya no cabe', () => {
        const fields = materializeLayout(
            [field('a', 2), field('b', 2, 1), field('c', 2)],
            [0, 1, 2],
        );
        const despues = unirLineaAnterior(fields, allIdx(fields), 1);

        expect(lineasDe(despues)).toEqual([['a@1', 'b@4'], ['c@1']]);
    });

    it('la marca sobrevive a un cambio de ancho', () => {
        const fields = materializeLayout([field('a', 3), field('b', 3)], [0, 1]);
        const conLinea = setOpensRow(fields, allIdx(fields), 1, true);

        expect(assignColSpan(conLinea, 1, 2)[1].layout)
            .toEqual({ colSpan: 2, col: 4, newRow: true });
    });
});

describe('mover una linea completa', () => {
    const lineasDe = (fields) => groupIntoRows(fields, allIdx(fields))
        .map((r) => r.items.map((it) => fields[it.idx].name).join(','));

    const base = () => materializeLayout(
        [field('a', 2), field('b', 2), field('c', 1), field('d', 3), field('e', 3)],
        [0, 1, 2, 3, 4],
    );

    it('sube la linea con todos sus campos', () => {
        const fields = base();
        expect(lineasDe(fields)).toEqual(['a,b', 'c', 'd,e']);
        expect(lineasDe(moveRow(fields, allIdx(fields), 2, -1))).toEqual(['a,b', 'd,e', 'c']);
    });

    it('baja la linea con todos sus campos', () => {
        const fields = base();
        expect(lineasDe(moveRow(fields, allIdx(fields), 0, 1))).toEqual(['c', 'a,b', 'd,e']);
    });

    it('no hace nada en los extremos', () => {
        const fields = base();
        expect(moveRow(fields, allIdx(fields), 0, -1)).toBe(fields);
        expect(moveRow(fields, allIdx(fields), 2, 1)).toBe(fields);
    });
});
