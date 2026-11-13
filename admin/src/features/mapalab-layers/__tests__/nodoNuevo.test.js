import { describe, it, expect } from 'vitest';
import {
    aplicarCambios, capaDelGrupo, erroresDeFilas, filaNueva, filasConCapas, hermanosDe, nodoPorId, ordenConNuevos, POSICION_FINAL, POSICION_INICIO,
} from '@features/mapalab-layers/utils/nodoNuevo';

const ARBOL = [
    {
        key: 'economia', title: 'Economía', nodeType: 'tema',
        children: [
            {
                key: 'cultivos', title: 'Cultivos', nodeType: 'group', parentNodeType: 'tema',
                children: [
                    { key: 'agave', title: 'Agave', nodeType: 'leaf', workspaceAlias: 'economia', geoserverLayer: 'cultivos' },
                    {
                        key: 'etq', title: 'Frutales', nodeType: 'label',
                        children: [
                            { key: 'aguacate', title: 'Aguacate', nodeType: 'leaf', workspaceAlias: 'economia', geoserverLayer: 'cultivos' },
                        ],
                    },
                ],
            },
            { key: 'vacio', title: 'Grupo vacío', nodeType: 'group', children: [] },
        ],
    },
    { key: 'salud', title: 'Salud', nodeType: 'tema', children: [] },
];

describe('capaDelGrupo', () => {
    it('toma la capa de sus propiedades cuando el grupo no trae una', () => {
        expect(capaDelGrupo(nodoPorId(ARBOL, 'cultivos')))
            .toEqual({ workspaceAlias: 'economia', geoserverLayer: 'cultivos' });
    });

    it('un grupo sin propiedades no inventa capa', () => {
        expect(capaDelGrupo(nodoPorId(ARBOL, 'vacio'))).toBeNull();
        expect(capaDelGrupo(null)).toBeNull();
    });

    it('prefiere la capa propia del grupo si la tiene', () => {
        const grupo = { key: 'g', nodeType: 'group', workspaceAlias: 'salud', geoserverLayer: 'clinicas', children: [] };
        expect(capaDelGrupo(grupo)).toEqual({ workspaceAlias: 'salud', geoserverLayer: 'clinicas' });
    });
});

describe('hermanosDe', () => {
    it('sin padre son los nodos de la raiz', () => {
        expect(hermanosDe(ARBOL, null).map((n) => n.key)).toEqual(['economia', 'salud']);
    });

    it('con padre son sus hijos directos, etiquetas incluidas', () => {
        expect(hermanosDe(ARBOL, 'cultivos').map((n) => n.key)).toEqual(['agave', 'etq']);
    });

    it('un padre desconocido no tiene hermanos', () => {
        expect(hermanosDe(ARBOL, 'no-existe')).toEqual([]);
    });
});

describe('ordenConNuevos', () => {
    const ids = ['a', 'b', 'c'];

    it('por defecto va al final', () => {
        expect(ordenConNuevos(ids, ['n'])).toEqual(['a', 'b', 'c', 'n']);
        expect(ordenConNuevos(ids, ['n'], POSICION_FINAL)).toEqual(['a', 'b', 'c', 'n']);
    });

    it('al inicio', () => {
        expect(ordenConNuevos(ids, ['n'], POSICION_INICIO)).toEqual(['n', 'a', 'b', 'c']);
    });

    it('despues de un hermano', () => {
        expect(ordenConNuevos(ids, ['n'], 'a')).toEqual(['a', 'n', 'b', 'c']);
        expect(ordenConNuevos(ids, ['n'], 'c')).toEqual(['a', 'b', 'c', 'n']);
    });

    it('si el nuevo ya viene en la lista no se duplica', () => {
        expect(ordenConNuevos(['a', ['n'], 'b'], 'n', 'b')).toEqual(['a', 'b', 'n']);
    });

    it('un hermano que ya no existe manda al final', () => {
        expect(ordenConNuevos(ids, ['n'], 'zzz')).toEqual(['a', 'b', 'c', 'n']);
    });
});

describe('ordenConNuevos en lote', () => {
    it('inserta el bloque en orden', () => {
        expect(ordenConNuevos(['a', 'b'], ['x', 'y'], 'a')).toEqual(['a', 'x', 'y', 'b']);
        expect(ordenConNuevos(['a', 'b'], ['x', 'y'], POSICION_INICIO)).toEqual(['x', 'y', 'a', 'b']);
    });
});

describe('filas del lote', () => {
    it('propone nombre e ID desde la capa', () => {
        const fila = filaNueva('ws::cuerpos_de_agua');
        expect(fila.label).toBe('Cuerpos de agua');
        expect(fila.id).toBe('cuerpos-de-agua');
    });

    it('el ID sigue al nombre hasta que se edita', () => {
        const fila = aplicarCambios(filaNueva(), { label: 'Ríos' });
        expect(fila.id).toBe('rios');
        const manual = aplicarCambios(aplicarCambios(fila, { id: 'mio' }), { label: 'Presas' });
        expect(manual.id).toBe('mio');
        expect(manual.slug).toBe('presas');
    });

    it('sincroniza filas con las capas elegidas y reemplaza la vacía', () => {
        const filas = filasConCapas([filaNueva()], ['ws::a', 'ws::b']);
        expect(filas.map((f) => f.gsRef)).toEqual(['ws::a', 'ws::b']);
        expect(filasConCapas(filas, ['ws::b']).map((f) => f.gsRef)).toEqual(['ws::b']);
        expect(filasConCapas(filas, [])).toHaveLength(1);
    });

    it('marca nombres vacíos e IDs repetidos', () => {
        const a = aplicarCambios(filaNueva(), { label: 'Ríos' });
        const b = aplicarCambios(filaNueva(), { label: 'Rios' });
        const c = filaNueva();
        const errores = erroresDeFilas([a, b, c], true);
        expect(errores[b.uid]).toMatch(/repite/);
        expect(errores[c.uid]).toMatch(/nombre/);
    });
});
