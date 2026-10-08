import { describe, it, expect } from 'vitest';
import {
    capaDelGrupo, hermanosDe, nodoPorId, ordenConNuevo, POSICION_FINAL, POSICION_INICIO,
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

describe('ordenConNuevo', () => {
    const ids = ['a', 'b', 'c'];

    it('por defecto va al final', () => {
        expect(ordenConNuevo(ids, 'n')).toEqual(['a', 'b', 'c', 'n']);
        expect(ordenConNuevo(ids, 'n', POSICION_FINAL)).toEqual(['a', 'b', 'c', 'n']);
    });

    it('al inicio', () => {
        expect(ordenConNuevo(ids, 'n', POSICION_INICIO)).toEqual(['n', 'a', 'b', 'c']);
    });

    it('despues de un hermano', () => {
        expect(ordenConNuevo(ids, 'n', 'a')).toEqual(['a', 'n', 'b', 'c']);
        expect(ordenConNuevo(ids, 'n', 'c')).toEqual(['a', 'b', 'c', 'n']);
    });

    it('si el nuevo ya viene en la lista no se duplica', () => {
        expect(ordenConNuevo(['a', 'n', 'b'], 'n', 'b')).toEqual(['a', 'b', 'n']);
    });

    it('un hermano que ya no existe manda al final', () => {
        expect(ordenConNuevo(ids, 'n', 'zzz')).toEqual(['a', 'b', 'c', 'n']);
    });
});
