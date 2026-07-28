import { describe, expect, it } from 'vitest';
import {
    assignCol, assignColSpan, colChoicesFor, groupIntoRows, layoutOf, nearestCol, placedColOf,
    rowMatesOf, snapColSpan,
    reflowCol, materializeLayout, layoutSlots, moveToSlot, cabeUnCampo, unitsOfField,
} from '../fieldLayout';
import { rowSlotsResolver } from '../fieldUtils';
import { CASOS, aCampo, marca } from '../__fixtures__/layoutContract';

const field = (name, colSpan = 1, col) => ({
    name,
    label: name.toUpperCase(),
    layout: col == null ? { colSpan } : layoutOf(colSpan, col),
});

const allIdx = (fields) => fields.map((_, i) => i);

const rowsOf = (fields) => groupIntoRows(fields, allIdx(fields)).map((r) => r.indices);

const colsOf = (fields) => groupIntoRows(fields, allIdx(fields))
    .map((r) => r.items.map((it) => it.col));

describe('groupIntoRows sin posición explícita', () => {
    it('un campo de fila completa ocupa su propia línea', () => {
        expect(rowsOf([field('a'), field('b'), field('c')])).toEqual([[0], [1], [2]]);
    });

    it('dos campos de media fila comparten línea', () => {
        expect(rowsOf([field('a', 2), field('b', 2), field('c', 2)])).toEqual([[0, 1], [2]]);
    });

    it('tres campos de un tercio comparten línea', () => {
        const fields = [field('a', 3), field('b', 3), field('c', 3), field('d', 3)];
        expect(rowsOf(fields)).toEqual([[0, 1, 2], [3]]);
    });

    it('el campo que no cabe salta a la línea siguiente sin rellenar el hueco previo', () => {
        expect(rowsOf([field('a', 2), field('b', 3), field('c', 3)])).toEqual([[0, 1], [2]]);
    });

    it('reporta el espacio libre de cada línea', () => {
        const rows = groupIntoRows([field('a', 3), field('b', 2)], [0, 1]);
        expect(rows).toHaveLength(1);
        expect(rows[0].used).toBe(5);
        expect(rows[0].free).toBe(1);
    });

    it('respeta el subconjunto de índices visibles de la pestaña', () => {
        const fields = [field('a', 2), field('b', 1), field('c', 2)];
        expect(groupIntoRows(fields, [0, 2]).map((r) => r.indices)).toEqual([[0, 2]]);
    });
});

describe('groupIntoRows con posición explícita', () => {
    it('un tercio a la derecha deja libre el espacio de la izquierda', () => {
        const fields = [field('a', 3, 5)];
        expect(colsOf(fields)).toEqual([[5]]);
        expect(groupIntoRows(fields, [0])[0].free).toBe(4);
    });

    it('coloca dos campos en la misma línea dejando un hueco entre ellos', () => {
        const fields = [field('a', 3, 1), field('b', 3, 5)];
        expect(rowsOf(fields)).toEqual([[0, 1]]);
        expect(colsOf(fields)).toEqual([[1, 5]]);
    });

    it('una posición que ya quedó atrás abre línea nueva', () => {
        const fields = [field('a', 2, 4), field('b', 2, 1)];
        expect(rowsOf(fields)).toEqual([[0], [1]]);
        expect(colsOf(fields)).toEqual([[4], [1]]);
    });

    it('la columna 1 equivale a empezar línea nueva', () => {
        const fields = [field('a', 2, 1), field('b', 2, 1)];
        expect(rowsOf(fields)).toEqual([[0], [1]]);
    });

    it('newRow heredado de definiciones previas sigue cortando la línea', () => {
        const fields = [
            field('a', 2),
            { name: 'b', label: 'B', layout: { colSpan: 2, newRow: true } },
        ];
        expect(rowsOf(fields)).toEqual([[0], [1]]);
    });

    it('recorta una posición que se saldría de la cuadrícula', () => {
        expect(colsOf([field('a', 2, 5)])).toEqual([[4]]);
    });

    it('placedColOf devuelve la columna real de un campo que fluye', () => {
        const fields = [field('a', 2), field('b', 2)];
        expect(placedColOf(fields, allIdx(fields), 1)).toBe(4);
    });
});

describe('campos que reservan su línea', () => {
    const alone = (name, colSpan, col) => ({
        name,
        label: name.toUpperCase(),
        layout: { ...layoutOf(colSpan, col), alone: true },
    });

    it('un tercio con línea reservada queda solo aunque quepan más', () => {
        const fields = [alone('a', 3, 1), field('b', 3, 3), field('c', 3, 5)];
        expect(rowsOf(fields)).toEqual([[0], [1, 2]]);
    });

    it('no deja que el campo anterior se le pegue', () => {
        const fields = [field('a', 3, 1), alone('b', 3, 3)];
        expect(rowsOf(fields)).toEqual([[0], [1]]);
    });

    it('conserva su posición dentro de la línea reservada', () => {
        const fields = [alone('a', 3, 5)];
        expect(colsOf(fields)).toEqual([[5]]);
        expect(groupIntoRows(fields, [0])[0].free).toBe(4);
    });

    it('assignColSpan preserva la línea reservada', () => {
        const fields = [alone('a', 3, 5)];
        expect(assignColSpan(fields, 0, 2)[0].layout)
            .toEqual({ colSpan: 2, col: 4, alone: true });
    });

    it('assignCol preserva la línea reservada', () => {
        const fields = [alone('a', 3, 5)];
        expect(assignCol(fields, 0, 1)[0].layout)
            .toEqual({ colSpan: 3, col: 1, newRow: true, alone: true });
    });
});

describe('colChoicesFor y nearestCol', () => {
    it('ofrece las posiciones que caben según el ancho', () => {
        expect(colChoicesFor(1)).toEqual([1]);
        expect(colChoicesFor(2)).toEqual([1, 4]);
        expect(colChoicesFor(3)).toEqual([1, 3, 5]);
    });

    it('ajusta una posición inválida a la más cercana del nuevo ancho', () => {
        expect(nearestCol(2, 5)).toBe(4);
        expect(nearestCol(1, 5)).toBe(1);
        expect(nearestCol(3, 4)).toBe(3);
    });
});

describe('layoutOf', () => {
    it('marca newRow solo en la primera columna', () => {
        expect(layoutOf(2, 1)).toEqual({ colSpan: 2, col: 1, newRow: true });
        expect(layoutOf(2, 4)).toEqual({ colSpan: 2, col: 4 });
    });
});

describe('assignColSpan', () => {
    it('re-ajusta la posición explícita al cambiar el ancho', () => {
        const fields = [field('a', 3, 5)];
        expect(assignColSpan(fields, 0, 2)[0].layout).toEqual({ colSpan: 2, col: 4 });
    });

    it('no asigna posición a un campo que aún fluye', () => {
        const fields = [field('a', 3)];
        expect(assignColSpan(fields, 0, 2)[0].layout).toEqual({ colSpan: 2 });
    });
});

describe('rowMatesOf', () => {
    it('devuelve los campos que comparten línea', () => {
        const fields = [field('a', 2), field('b', 2), field('c', 2)];
        expect(rowMatesOf(fields, allIdx(fields), 0).map((f) => f.name)).toEqual(['b']);
    });

    it('no devuelve vecinos cuando el campo ocupa la fila completa', () => {
        expect(rowMatesOf([field('a'), field('b', 2)], [0, 1], 0)).toEqual([]);
    });
});

describe('rowSlotsResolver', () => {
    const resolve = (fields, idx) => rowSlotsResolver({
        fields, tabs: [], hasTabs: false, activeKey: undefined, idx,
    });

    it('describe la línea con vecinos y huecos en orden', () => {
        const fields = [field('a', 2, 1), field('b', 3, 5)];
        expect(resolve(fields, 1)(3, 5)).toEqual([
            { kind: 'field', name: 'a', label: 'A', units: 3 },
            { kind: 'gap', units: 1 },
            { kind: 'self', name: 'b', label: 'B', units: 2 },
        ]);
    });

    it('marca el hueco previo cuando el campo se coloca a la derecha', () => {
        const fields = [field('a', 3, 5)];
        expect(resolve(fields, 0)(3, 5)).toEqual([
            { kind: 'gap', units: 4 },
            { kind: 'self', name: 'a', label: 'A', units: 2 },
        ]);
    });

    it('describe un campo nuevo aún no agregado', () => {
        const fields = [field('a', 2, 1)];
        const slots = resolve(fields, 'new')(2, 4);
        expect(slots).toEqual([
            { kind: 'field', name: 'a', label: 'A', units: 3 },
            { kind: 'self', name: undefined, label: 'Este campo', units: 3 },
        ]);
    });
});

describe('snapColSpan', () => {
    it('ajusta la proporción arrastrada al ancho más cercano', () => {
        expect(snapColSpan(1)).toBe(1);
        expect(snapColSpan(0.8)).toBe(1);
        expect(snapColSpan(0.6)).toBe(2);
        expect(snapColSpan(0.45)).toBe(2);
        expect(snapColSpan(0.3)).toBe(3);
        expect(snapColSpan(-0.5)).toBe(3);
    });
});

describe('contrato de acomodo (compartido con el renderer de SIEEJ)', () => {
    const filasDeModelo = (campos) => groupIntoRows(campos, campos.map((_, i) => i))
        .map((row) => row.items.map((it) => marca(campos[it.idx].name, it.col, it.units)));

    CASOS.forEach(({ nombre, campos, filas }) => {
        it(nombre, () => {
            expect(filasDeModelo(campos.map(aCampo))).toEqual(filas);
        });
    });
});

describe('reflowCol', () => {
    it('recoloca el campo movido en la posición que le toca tras el arrastre', () => {
        const campos = [field('a', 2, 1), field('b', 2, 4)];
        const movido = [campos[1], campos[0]];
        expect(reflowCol(movido, [0, 1], 0)[0].layout).toEqual({
            colSpan: 2, col: 1, newRow: true,
        });
    });

    it('deja intacto un campo que ya fluye', () => {
        const campos = [field('a', 2), field('b', 2)];
        expect(reflowCol(campos, [0, 1], 1)).toBe(campos);
    });

    it('conserva la línea reservada al recolocar', () => {
        const campos = [
            { name: 'a', label: 'A', layout: { colSpan: 3, col: 5, alone: true } },
            field('b', 3, 1),
        ];
        expect(reflowCol(campos, [0, 1], 0)[0].layout).toEqual({
            colSpan: 3, col: 1, newRow: true, alone: true,
        });
    });
});

describe('el acomodo no se reorganiza solo', () => {
    const lineas = (fields) => groupIntoRows(fields, allIdx(fields))
        .map((r) => r.items.map((it) => `${fields[it.idx].name}@${it.col}`));

    it('cambiar un campo de línea completa a un tercio no mueve a los demás', () => {
        const fields = [field('titulo'), field('a'), field('b', 2), field('c', 2)];
        expect(lineas(fields)).toEqual([['titulo@1'], ['a@1'], ['b@1', 'c@4']]);

        const fijo = materializeLayout(fields, allIdx(fields));
        expect(lineas(assignColSpan(fijo, 1, 3)))
            .toEqual([['titulo@1'], ['a@1'], ['b@1', 'c@4']]);
    });

    it('cambiar la posición de un campo no recorre a sus vecinos', () => {
        const fields = [field('a', 3), field('b', 3), field('c', 3)];
        expect(lineas(fields)).toEqual([['a@1', 'b@3', 'c@5']]);

        const fijo = materializeLayout(fields, allIdx(fields));
        expect(lineas(assignCol(fijo, 0, 5)))
            .toEqual([['a@5'], ['b@3', 'c@5']]);
    });

    it('materializeLayout deja la posición de cada campo tal como se veía', () => {
        const fields = [field('a', 2), field('b', 3), field('c', 3)];
        expect(materializeLayout(fields, allIdx(fields)).map((f) => f.layout)).toEqual([
            { colSpan: 2, col: 1, newRow: true },
            { colSpan: 3, col: 4 },
            { colSpan: 3, col: 1, newRow: true },
        ]);
    });
});

describe('soltar un campo en un espacio libre', () => {
    const campos = () => [
        field('titulo'),
        field('chico', 3, 1), field('otro', 3, 3),
        field('x', 3, 1), field('y', 3, 3),
    ];

    it('ofrece un hueco por cada espacio libre de cada línea', () => {
        const fields = campos();
        expect(layoutSlots(fields, allIdx(fields))
            .filter((s) => s.kind === 'gap')
            .map((s) => [s.row, s.col, s.units]))
            .toEqual([[1, 5, 2], [2, 5, 2]]);
    });

    it('el campo aterriza en la columna del hueco y al final de esa línea', () => {
        const fields = campos();
        const hueco = layoutSlots(fields, allIdx(fields))
            .find((s) => s.kind === 'gap' && s.row === 2);
        const movido = moveToSlot(fields, allIdx(fields), 1, hueco);

        expect(groupIntoRows(movido, allIdx(movido))
            .map((r) => r.items.map((it) => `${movido[it.idx].name}@${it.col}`)))
            .toEqual([['titulo@1'], ['otro@3'], ['x@1', 'y@3', 'chico@5']]);
    });

    it('un hueco donde no cabe ni el campo mas chico no se ofrece', () => {
        const fields = [field('a', 3), field('b', 2)];
        const huecos = layoutSlots(fields, allIdx(fields)).filter((s) => s.kind === 'gap');

        expect(huecos.map((s) => s.units)).toEqual([1]);
        expect(huecos.filter((s) => cabeUnCampo(s.units))).toEqual([]);
    });

    it('recorta la columna si el campo no cabe en el hueco', () => {
        const fields = [field('a', 3, 1), field('grande', 2)];
        const hueco = { row: 0, col: 5, units: 2, after: 0 };
        expect(moveToSlot(fields, allIdx(fields), 1, hueco)[1].layout)
            .toEqual({ colSpan: 2, col: 4 });
    });
});

describe('un hueco solo admite lo que le cabe', () => {
    it('el hueco entre dos campos no admite uno mas ancho que el', () => {
        const fields = materializeLayout(
            [field('a', 3, 1), field('b', 3, 5), field('media', 2)],
            [0, 1, 2],
        );
        const hueco = layoutSlots(fields, allIdx(fields))
            .find((s) => s.kind === 'gap' && s.row === 0);

        expect(hueco.units).toBe(2);
        expect(unitsOfField(fields[2])).toBe(3);
        expect(unitsOfField(fields[2]) <= hueco.units).toBe(false);
    });

    it('soltar ahi un campo que no cabe empujaria al vecino de linea', () => {
        const fields = materializeLayout(
            [field('a', 3, 1), field('b', 3, 5), field('media', 2)],
            [0, 1, 2],
        );
        const hueco = layoutSlots(fields, allIdx(fields))
            .find((s) => s.kind === 'gap' && s.row === 0);
        const movido = moveToSlot(fields, allIdx(fields), 2, hueco);

        expect(groupIntoRows(movido, allIdx(movido)).length).toBe(2);
    });
});
