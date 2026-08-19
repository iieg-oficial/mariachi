// El "área" del biométrico no sirve para filtrar: de sus 19 valores, 10 no son
// áreas sino el vínculo o la baja de la persona —«Servicio Social», «Bajas»,
// «Limpieza (Bajas)»—, y las que sí lo son aparecen dos veces, con y sin sufijo.
// El vínculo ya cubre esa mitad, así que aquí sólo quedan las tres que discriminan.
export const DIMENSIONES = [
    { campo: 'vinculo', etiqueta: 'Vínculo' },
    { campo: 'medio', etiqueta: 'Marca' },
    { campo: 'horario', etiqueta: 'Horario' },
];

export const SIN_FILTROS = {
    ...Object.fromEntries(DIMENSIONES.map(({ campo }) => [campo, []])),
    bajas: false,
};

const NOMBRE_HORARIO = { '8-16': '8 a 4', '9-17': '9 a 5', otro: 'Sin horario fijo' };

export const etiquetaValor = (campo, valor) => {
    if (!valor) return 'Sin dato';
    return campo === 'horario' ? (NOMBRE_HORARIO[valor] ?? valor) : valor;
};

export const aplicarFiltros = (filas, valores) => filas
    .filter((f) => valores.bajas || !f.baja)
    .filter((f) => DIMENSIONES.every(({ campo }) => {
        const elegidos = valores[campo];
        return !elegidos?.length || elegidos.includes(f[campo] ?? '');
    }));

export const contarActivos = (valores) => DIMENSIONES.reduce(
    (n, { campo }) => n + (valores[campo]?.length ?? 0),
    valores.bajas ? 1 : 0,
);

// La segunda columna muestra aquello por lo que se esta filtrando: si el filtro
// es de marca, ver la marca dice mas que ver el vinculo de todos. Sin filtros
// —y con mas de uno, donde no hay una respuesta buena— vuelve al vinculo.
export const columnaSegunFiltro = (valores) => {
    const activas = DIMENSIONES.filter(({ campo }) => valores[campo]?.length);
    return activas.length === 1 ? activas[0] : DIMENSIONES[0];
};
