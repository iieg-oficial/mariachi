import { describe, expect, it } from 'vitest';
import {
    contextoDeUbicacion,
    descendientes,
    planDeMovimiento,
} from '@features/mapalab-layers/utils/gridArbol';

const FILAS = [
    { id: 'orto', parent_id: null, label: 'Ortofotos', node_type: 'tema', sort_order: 0 },
    { id: 'orto24', parent_id: null, label: 'Ortofotos 2024', node_type: 'tema', sort_order: 1 },
    { id: 'zm', parent_id: 'orto24', label: 'ZM', node_type: 'category', sort_order: 4 },
    { id: 'acatic', parent_id: 'orto', label: 'Acatic', node_type: 'category', sort_order: 2 },
    { id: 'acatic-23', parent_id: 'acatic', label: 'Acatic 2023', node_type: 'leaf', sort_order: 0 },
    { id: 'ameca', parent_id: 'orto', label: 'Ameca', node_type: 'category', sort_order: 1 },
];

const fila = (id) => FILAS.find((f) => f.id === id);

describe('gridArbol', () => {
    it('arma la ruta completa del padre', () => {
        expect(contextoDeUbicacion(FILAS).pathOf('acatic')).toBe('Ortofotos › Acatic');
    });

    it('junta todas las descendientes', () => {
        expect([...descendientes(FILAS, ['orto'])].sort()).toEqual(['acatic', 'acatic-23', 'ameca']);
    });

    it('mueve al final del destino conservando el orden', () => {
        const { parches, omitidas } = planDeMovimiento(FILAS, [fila('acatic'), fila('ameca')], 'orto24');
        expect(omitidas).toBe(0);
        expect(parches).toEqual([
            { rowKey: 'ameca', column: 'parent_id', value: 'orto24' },
            { rowKey: 'ameca', column: 'sort_order', value: 5 },
            { rowKey: 'acatic', column: 'parent_id', value: 'orto24' },
            { rowKey: 'acatic', column: 'sort_order', value: 6 },
        ]);
    });

    it('las hijas seleccionadas viajan con su padre y los temas no se mueven', () => {
        const seleccion = [fila('acatic'), fila('acatic-23'), fila('orto')];
        const { parches, omitidas } = planDeMovimiento(FILAS, seleccion, 'orto24');
        expect(parches.map((p) => p.rowKey)).toEqual(['acatic', 'acatic']);
        expect(omitidas).toBe(2);
    });

    it('rechaza destinos que no contienen nodos o que quedan dentro de la selección', () => {
        expect(planDeMovimiento(FILAS, [fila('ameca')], 'acatic-23').motivo).toBeTruthy();
        expect(planDeMovimiento(FILAS, [fila('acatic')], 'acatic').motivo).toBeTruthy();
    });
});
