export const CASOS = [
    {
        nombre: 'campos de fila completa, uno por línea',
        campos: [{ name: 'a' }, { name: 'b' }],
        filas: [['a@1w6'], ['b@1w6']],
    },
    {
        nombre: 'dos mitades comparten línea',
        campos: [{ name: 'a', colSpan: 2 }, { name: 'b', colSpan: 2 }],
        filas: [['a@1w3', 'b@4w3']],
    },
    {
        nombre: 'el que no cabe baja sin rellenar el hueco',
        campos: [
            { name: 'a', colSpan: 2 }, { name: 'b', colSpan: 3 }, { name: 'c', colSpan: 3 },
        ],
        filas: [['a@1w3', 'b@4w2'], ['c@1w2']],
    },
    {
        nombre: 'tercios en las tres posiciones',
        campos: [
            { name: 'a', colSpan: 3, col: 1 },
            { name: 'b', colSpan: 3, col: 3 },
            { name: 'c', colSpan: 3, col: 5 },
        ],
        filas: [['a@1w2', 'b@3w2', 'c@5w2']],
    },
    {
        nombre: 'hueco intencional entre dos campos de la misma línea',
        campos: [{ name: 'a', colSpan: 3, col: 1 }, { name: 'b', colSpan: 3, col: 5 }],
        filas: [['a@1w2', 'b@5w2']],
    },
    {
        nombre: 'una posición que ya quedó atrás abre línea nueva',
        campos: [{ name: 'a', colSpan: 2, col: 4 }, { name: 'b', colSpan: 2, col: 1 }],
        filas: [['a@4w3'], ['b@1w3']],
    },
    {
        nombre: 'línea reservada: nadie se le pega por la derecha',
        campos: [
            { name: 'a', colSpan: 3, col: 1, alone: true },
            { name: 'b', colSpan: 3, col: 3 },
        ],
        filas: [['a@1w2'], ['b@3w2']],
    },
    {
        nombre: 'línea reservada: nadie se le pega por la izquierda',
        campos: [
            { name: 'a', colSpan: 3, col: 1 },
            { name: 'b', colSpan: 3, col: 3, alone: true },
        ],
        filas: [['a@1w2'], ['b@3w2']],
    },
    {
        nombre: 'línea reservada a la derecha, tras un campo que fluye',
        campos: [{ name: 'a', colSpan: 2 }, { name: 'b', colSpan: 2, col: 4, alone: true }],
        filas: [['a@1w3'], ['b@4w3']],
    },
    {
        nombre: 'línea reservada en el extremo derecho',
        campos: [
            { name: 'a', colSpan: 3, col: 3 },
            { name: 'b', colSpan: 3, col: 5, alone: true },
        ],
        filas: [['a@3w2'], ['b@5w2']],
    },
    {
        nombre: 'dos líneas reservadas seguidas no se juntan',
        campos: [
            { name: 'a', colSpan: 3, col: 3, alone: true },
            { name: 'b', colSpan: 3, col: 3, alone: true },
        ],
        filas: [['a@3w2'], ['b@3w2']],
    },
    {
        nombre: 'una posición que no cabe se recorta en lugar de desbordar',
        campos: [{ name: 'a', colSpan: 2, col: 5 }],
        filas: [['a@4w3']],
    },
    {
        nombre: 'posición no alineada al ancho se respeta tal cual',
        campos: [{ name: 'a', colSpan: 3, col: 4 }],
        filas: [['a@4w2']],
    },
    {
        nombre: 'fila completa siempre abre línea',
        campos: [{ name: 'a', colSpan: 3 }, { name: 'b' }, { name: 'c', colSpan: 3 }],
        filas: [['a@1w2'], ['b@1w6'], ['c@1w2']],
    },
    {
        nombre: 'cinco tercios se reparten en dos líneas',
        campos: [
            { name: 'a', colSpan: 3 }, { name: 'b', colSpan: 3 }, { name: 'c', colSpan: 3 },
            { name: 'd', colSpan: 3 }, { name: 'e', colSpan: 3 },
        ],
        filas: [['a@1w2', 'b@3w2', 'c@5w2'], ['d@1w2', 'e@3w2']],
    },
    {
        nombre: 'la marca de linea abre una linea aunque la columna quepa a la derecha',
        campos: [
            { name: 'a', colSpan: 3, col: 1 },
            { name: 'b', colSpan: 3, col: 3, newRow: true },
        ],
        filas: [['a@1w2'], ['b@3w2']],
    },
    {
        nombre: 'sin marca de linea, una columna a la derecha se queda en la misma linea',
        campos: [
            { name: 'a', colSpan: 3, col: 1 },
            { name: 'b', colSpan: 3, col: 3 },
        ],
        filas: [['a@1w2', 'b@3w2']],
    },
    {
        nombre: 'una columna donde el campo ya no cabe abre linea en vez de encimarse',
        campos: [
            { name: 'a', colSpan: 3, col: 1 },
            { name: 'b', colSpan: 2, col: 3 },
            { name: 'c', colSpan: 3, col: 5 },
        ],
        filas: [['a@1w2', 'b@3w3'], ['c@5w2']],
    },
];

export const aCampo = ({ name, colSpan = 1, col, alone, newRow }) => ({
    name,
    label: name.toUpperCase(),
    type: 'text',
    layout: {
        colSpan,
        ...(col != null ? { col } : {}),
        ...(newRow || col === 1 ? { newRow: true } : {}),
        ...(alone ? { alone: true } : {}),
    },
});

export const marca = (name, col, units) => `${name}@${col}w${units}`;
