export const SEGMENTOS_JORNADA = [
    { clave: 'dentro', nombre: 'Dentro del horario', color: '#3B5BA9' },
    { clave: 'antes', nombre: 'Llegó antes', color: '#D98A1E' },
    { clave: 'despues', nombre: 'Se quedó después', color: '#B4441A' },
    { clave: 'afuera', nombre: 'Afuera', color: '#2E9C8A' },
    { clave: 'sin_marca', nombre: 'Sin marca', color: '#8C8C8C', textura: true },
];

export const TEXTURA_SIN_MARCA = 'repeating-linear-gradient(45deg, #8C8C8C 0 2px, transparent 2px 5px)';

export const JORNADA_ESPERADA_MIN = 480;

export const COLOR_TINTA = 'rgba(0, 0, 0, 0.65)';

export const COLOR_REFERENCIA = 'rgba(0, 0, 0, 0.35)';

export const formatoMinutos = (minutos) => {
    const m = Math.round(minutos ?? 0);
    if (m < 60) return `${m} min`;
    const resto = m % 60;
    return resto ? `${Math.floor(m / 60)} h ${resto} min` : `${m / 60} h`;
};

export const aMinutos = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return (h * 60) + m;
};
