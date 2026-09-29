export const DIMENSIONES = [
    { campo: 'vinculo', etiqueta: 'Vínculo' },
    { campo: 'medio', etiqueta: 'Marca' },
    { campo: 'horario', etiqueta: 'Horario' },
];

const NOMBRE_HORARIO = { '8-16': '8 a 4', '9-17': '9 a 5', otro: 'Sin horario fijo' };

export const etiquetaValor = (campo, valor) => {
    if (!valor) return 'Sin dato';
    return campo === 'horario' ? (NOMBRE_HORARIO[valor] ?? valor) : valor;
};
