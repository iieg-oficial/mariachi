import { describe, it, expect } from 'vitest';
import { buildParentOptions, rutaDeNodo } from '@features/mapalab-layers/utils/treeSelect';

const ARBOL = [
    {
        key: 'medio-ambiente', title: 'Medio ambiente', nodeType: 'tema',
        children: [
            {
                key: 'hidrologia', title: 'Hidrología', nodeType: 'category',
                children: [
                    { key: 'presas', title: 'Presas', nodeType: 'group', children: [
                        { key: 'presa-calderon', title: 'Presa Calderón', nodeType: 'leaf' },
                    ] },
                    { key: 'rios', title: 'Ríos', nodeType: 'leaf' },
                ],
            },
            { key: 'separador', title: 'Cuerpos de agua', nodeType: 'label' },
        ],
    },
];

describe('buildParentOptions', () => {
    it('solo ofrece tema, categoria y grupo', () => {
        expect(buildParentOptions(ARBOL).map((o) => o.value))
            .toEqual(['medio-ambiente', 'hidrologia', 'presas']);
    });

    it('cada opcion trae la ruta completa legible', () => {
        const presas = buildParentOptions(ARBOL).find((o) => o.value === 'presas');
        expect(presas.label).toBe('Medio ambiente › Hidrología › Presas');
        expect(presas.tipo).toBe('Grupo');
    });

    it('no ofrece capas ni etiquetas como padre', () => {
        const valores = buildParentOptions(ARBOL).map((o) => o.value);
        expect(valores).not.toContain('rios');
        expect(valores).not.toContain('separador');
        expect(valores).not.toContain('presa-calderon');
    });

    it('un arbol vacio no truena', () => {
        expect(buildParentOptions([])).toEqual([]);
        expect(buildParentOptions(undefined)).toEqual([]);
    });
});

describe('rutaDeNodo', () => {
    it('devuelve la ruta del nodo pedido', () => {
        expect(rutaDeNodo(ARBOL, 'hidrologia')).toBe('Medio ambiente › Hidrología');
    });

    it('sin id o con uno desconocido devuelve null', () => {
        expect(rutaDeNodo(ARBOL, null)).toBeNull();
        expect(rutaDeNodo(ARBOL, 'no-existe')).toBeNull();
    });
});
