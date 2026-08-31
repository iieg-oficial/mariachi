export const ANCHO = 2400;
export const ALTO = 860;
export const ESPINA_Y = 400;
export const FIN_PASADO = 1492;
export const FIN_EJE = 2340;

export const NIVELES = [500, 300, 560, 244, 620, 188, 680, 132, 740, 76];
export const CARRIL_ABAJO = [ESPINA_Y + 44, ESPINA_Y + 66, ESPINA_Y + 88];
export const CARRIL_ARRIBA = [ESPINA_Y - 30, ESPINA_Y - 52];

export const COLOR_PROYECTO = {
    mariachi: '#5C2472',
    mapalab: '#1F6FB2',
    sieej: '#B03A5B',
    sextante: '#1F7A4D',
    dataengine: '#7A5C1F',
    'gateway-hub': '#2E4372',
    huachicol: '#A34400',
    vine: '#6B7A1F',
    wacha: '#8A2E8A',
    intranet: '#1F6E7A',
    sitio2026: '#B0521F',
    acervo: '#4A4A8A',
    colibri: '#B0356B',
    identidad: '#7A3FA0',
    minerva: '#8A6A1F',
    igibot: '#7A2E5B',
    mirador: '#4B6A2E',
    agent: '#6A2E7A',
    godin: '#7A6A2E',
    infra: '#5A5A66',
    heredado: '#9A9AA2',
    legado: '#8C8C94',
    cuadernillos: '#8A3C1F',
};

export const ANIOS = [
    { anio: 2024, x0: 60, x1: 190 },
    { anio: 2025, x0: 190, x1: 450 },
    { anio: 2026, x0: 450, x1: 1700 },
    { anio: 2027, x0: 1700, x1: 1860 },
    { anio: 2028, x0: 1860, x1: 2020 },
    { anio: 2029, x0: 2020, x1: 2180 },
    { anio: 2030, x0: 2180, x1: 2340 },
];

export const TRIMESTRES = [
    { texto: 'ene', x: 502 },
    { texto: 'abr', x: 815 },
    { texto: 'jul', x: 1110 },
    { texto: 'oct', x: 1440 },
];

export const CICLOS = [
    {
        id: 'c-infra',
        nombre: 'estabilización de la infraestructura',
        x0: 60, x1: 320,
        color: '#2E4372', tinte: 'rgba(46,67,114,0.05)',
        nota: 'casi dos años',
        motivo: 'El trabajo que no dejó releases porque no era código. El GitLab del instituto es de esta etapa: su proyecto más viejo es del 18 de diciembre de 2024.',
    },
    {
        id: 'c-sin',
        nombre: 'sin ciclo con nombre',
        x0: 320, x1: 703,
        color: '#9A9AA2', tinte: 'rgba(5,5,5,0.02)',
        nota: 'construcción',
        motivo: 'Del arranque del GitLab hasta que gateway-hub toma el ruteo. Los nombres de ciclo se acuñaron el 6 de agosto de 2026; antes no hay ninguno en los registros.',
    },
    {
        id: 'c-rojo',
        nombre: 'tamal-rojo',
        x0: 1200, x1: 1492, y0: 46, y1: 400,
        color: '#B3261E', tinte: 'rgba(179,38,30,0.06)',
        nota: 'lo nuevo · cierra el 1 nov',
        motivo: 'Doce frentes en seis quincenas, con minerva como motivo. Se commitea directo, sin ramas de feature.',
    },
    {
        id: 'c-verde',
        nombre: 'tamal-verde',
        x0: 703, x1: 1330, y0: 400, y1: 806,
        color: '#1F7A4D', tinte: 'rgba(31,122,77,0.055)',
        nota: 'mar — sep 2026 · cierra con sitio2026',
        motivo: 'Arrancó casi junto con gateway-hub y cierra con el despliegue de sitio2026, a mediados de septiembre. Desde el 6 de agosto solo recibe fixes.',
    },
    {
        id: 'c-prox',
        nombre: 'próximos ciclos',
        x0: 1492, x1: 2340, y0: 46, y1: 400,
        color: '#9A9AA2', tinte: 'rgba(5,5,5,0.02)',
        nota: 'sin nombre ni fecha',
        motivo: 'Ningún archivo del ecosistema tiene una fecha comprometida después del 1 de noviembre de 2026.',
    },
];

export const PROCESOS = [
    {
        id: 'cuadernillos',
        txt: 'cuadernillos municipales',
        proy: 'cuadernillos',
        desde: '2026-03-23',
        cada: '03-23',
        fecha: 'anual · desde el 23 mar 2026',
        motivo: 'Proceso anual, no un release: un PDF por cada uno de los 125 municipios, de PostgreSQL a LaTeX. Solo la primera edición tiene fecha registrada; las demás son la periodicidad.',
    },
];

export const MARCADORES = ['🐶', '🐕', '🎺', '🌮', '🌵', '🚀', '🔥', '⚡', '🧭', '🛻', '📍', '🦴'];
