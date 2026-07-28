import { describe, expect, it } from 'vitest';
import {
    assignCol, assignColSpan, cabeUnCampo, colChoicesFor, groupIntoRows, layoutSlots,
    materializeLayout, moveToSlot, swapFields, unitsOfField,
} from '../fieldLayout';

const idx = (fs) => fs.map((_, i) => i);

const campo = (name, colSpan = 1, col, alone) => ({
    name,
    label: name.toUpperCase(),
    layout: {
        colSpan,
        ...(col != null ? { col, ...(col === 1 ? { newRow: true } : {}) } : {}),
        ...(alone ? { alone: true } : {}),
    },
});

const lineas = (fields) => groupIntoRows(fields, idx(fields))
    .map((r) => r.items.map((it) => `${fields[it.idx].name}@${it.col}`).join(' '));

const lineasSin = (fields, tocados) => lineas(fields)
    .map((l) => l.split(' ').filter((t) => !tocados.includes(t.split('@')[0])).join(' '))
    .filter(Boolean)
    .join(' || ');

const ESCENARIOS = {
    'tres tercios y dos mitades': [
        campo('a', 3), campo('b', 3), campo('c', 3), campo('d', 2), campo('e', 2),
    ],
    'una fila completa entre tercios': [
        campo('a', 3), campo('b', 3), campo('c', 1), campo('d', 3), campo('e', 3),
    ],
    'lineas con hueco': [
        campo('a', 3, 1), campo('b', 3, 5), campo('c', 2, 1), campo('d', 3, 1), campo('e', 3, 3),
    ],
    'anchos mezclados': [
        campo('a', 2), campo('b', 3), campo('c', 3), campo('d', 3), campo('e', 2), campo('g', 2),
    ],
    'con linea reservada': [
        campo('a', 3, 1), campo('b', 3, 3, true), campo('c', 2), campo('d', 2),
    ],
};

describe('invariante del acomodo: mover un campo no altera las lineas ajenas', () => {
    Object.entries(ESCENARIOS).forEach(([nombre, base]) => {
        const fijo = materializeLayout(base, idx(base));

        it(`${nombre}: soltar en un hueco solo toca al campo movido`, () => {
            const huecos = layoutSlots(fijo, idx(fijo))
                .filter((s) => s.kind === 'gap' && cabeUnCampo(s.units));

            fijo.forEach((f, i) => {
                huecos
                    .filter((hueco) => unitsOfField(f) <= hueco.units)
                    .forEach((hueco) => {
                        const despues = moveToSlot(fijo, idx(fijo), i, hueco);
                        expect(
                            lineasSin(despues, [f.name]),
                            `mover ${f.name} al hueco de la linea ${hueco.row + 1} col ${hueco.col}`,
                        ).toBe(lineasSin(fijo, [f.name]));
                    });
            });
        });

        it(`${nombre}: intercambiar dos campos del mismo ancho no toca al resto`, () => {
            fijo.forEach((f, i) => {
                fijo.forEach((otro, j) => {
                    if (i === j || unitsOfField(f) !== unitsOfField(otro)) return;
                    const despues = swapFields(fijo, idx(fijo), i, j);
                    expect(
                        lineasSin(despues, [f.name, otro.name]),
                        `intercambiar ${f.name} con ${otro.name}`,
                    ).toBe(lineasSin(fijo, [f.name, otro.name]));
                });
            });
        });

        it(`${nombre}: eliminar un campo no reacomoda a los demas`, () => {
            fijo.forEach((f, i) => {
                const despues = fijo.filter((_, k) => k !== i);
                expect(lineasSin(despues, [f.name]), `eliminar ${f.name}`)
                    .toBe(lineasSin(fijo, [f.name]));
            });
        });

        it(`${nombre}: el acomodo materializado es estable`, () => {
            expect(materializeLayout(fijo, idx(fijo))).toEqual(fijo);
        });
    });
});

describe('invariante del acomodo: cambiar ancho o posicion solo mueve su linea', () => {
    const otrasLineas = (fields, nombre) => lineas(fields)
        .filter((l) => !l.split(' ').some((t) => t.split('@')[0] === nombre));

    Object.entries(ESCENARIOS).forEach(([nombre, base]) => {
        const fijo = materializeLayout(base, idx(base));

        it(`${nombre}: el ancho no altera las lineas que no comparten con el campo`, () => {
            fijo.forEach((f, i) => {
                const propia = lineas(fijo).find((l) => l.includes(`${f.name}@`));
                const ajenas = otrasLineas(fijo, f.name);
                [1, 2, 3].forEach((cs) => {
                    if (cs === f.layout.colSpan) return;
                    const despues = otrasLineas(assignColSpan(fijo, i, cs), f.name);
                    const perdidas = ajenas.filter((l) => !despues.includes(l));
                    expect(
                        perdidas.every((l) => propia.split(' ')
                            .some((t) => l.includes(t.split('@')[0]))),
                        `ancho de ${f.name} -> ${cs}: se altero una linea ajena`,
                    ).toBe(true);
                });
            });
        });

        it(`${nombre}: la posicion no altera las lineas ajenas`, () => {
            fijo.forEach((f, i) => {
                const propia = lineas(fijo).find((l) => l.includes(`${f.name}@`));
                const ajenas = otrasLineas(fijo, f.name);
                colChoicesFor(f.layout.colSpan).forEach((col) => {
                    if (col === f.layout.col) return;
                    const despues = otrasLineas(assignCol(fijo, i, col), f.name);
                    const perdidas = ajenas.filter((l) => !despues.includes(l));
                    expect(
                        perdidas.every((l) => propia.split(' ')
                            .some((t) => l.includes(t.split('@')[0]))),
                        `posicion de ${f.name} -> col ${col}: se altero una linea ajena`,
                    ).toBe(true);
                });
            });
        });
    });
});
