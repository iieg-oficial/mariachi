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

export const SIN_CONFIGURACION = { bajas: false, medio: [], horario: [] };

export const configuracionActiva = (c) => c.bajas || c.medio.length > 0 || c.horario.length > 0;

export const aplicarConfiguracion = (filas, c) => filas
    .filter((f) => c.bajas || !f.baja)
    .filter((f) => !c.medio.length || c.medio.includes(f.medio ?? ''))
    .filter((f) => !c.horario.length || c.horario.includes(f.horario ?? ''));
