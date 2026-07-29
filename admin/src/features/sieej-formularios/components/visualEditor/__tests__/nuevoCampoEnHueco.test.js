import { describe, expect, it } from 'vitest';
import {
    groupIntoRows, layoutOf, layoutSlots, materializeLayout, moveToSlot, opensRow,
} from '../fieldLayout';

const field = (name, colSpan = 1, col) => ({
    name,
    label: name.toUpperCase(),
    layout: col == null ? { colSpan } : layoutOf(colSpan, col),
});

const allIdx = (fields) => fields.map((_, i) => i);

const lineasDe = (fields) => groupIntoRows(fields, allIdx(fields))
    .map((r) => r.items.map((it) => `${fields[it.idx].name}@${it.col}`));

const huecoDe = (fields, cumple) => layoutSlots(fields, allIdx(fields))
    .find((s) => s.kind === 'gap' && cumple(s));

const agregarEnHueco = (fields, nuevo, hueco) => {
    const conNuevo = [...fields, nuevo];
    return moveToSlot(conNuevo, allIdx(conNuevo), conNuevo.length - 1, hueco);
};

describe('agregar un campo nuevo en un hueco', () => {
    it('lo coloca a la derecha cuando el hueco cierra la linea', () => {
        const fields = materializeLayout([field('a', 2, 1)], [0]);
        const hueco = huecoDe(fields, (s) => s.after != null);

        expect(lineasDe(agregarEnHueco(fields, field('nuevo', 2), hueco)))
            .toEqual([['a@1', 'nuevo@4']]);
    });

    it('lo coloca a la izquierda y le traspasa la apertura de linea', () => {
        const fields = materializeLayout([field('previo', 1, 1), field('a', 2, 4)], [0, 1]);
        const hueco = huecoDe(fields, (s) => s.row === 1 && s.after == null);
        const out = agregarEnHueco(fields, field('nuevo', 2), hueco);

        expect(lineasDe(out)).toEqual([['previo@1'], ['nuevo@1', 'a@4']]);
        expect(opensRow(out.find((f) => f.name === 'nuevo'))).toBe(true);
        expect(opensRow(out.find((f) => f.name === 'a'))).toBe(false);
    });
});
