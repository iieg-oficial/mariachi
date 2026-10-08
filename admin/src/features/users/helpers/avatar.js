export const AVATAR_COLORS = [
    '#2E4372',
    '#5C2472',
    '#0F766E',
    '#9F1239',
    '#166534',
    '#1D4ED8',
    '#7C2D12',
    '#B45309',
];

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'van', 'von']);

export const inicialesDe = (nombre = '') => {
    const palabras = String(nombre ?? '')
        .trim()
        .split(/\s+/)
        .filter((palabra) => palabra && !PARTICULAS.has(palabra.toLowerCase()));
    if (palabras.length === 0) return '?';
    const apellido = palabras.length >= 4 ? palabras[2] : palabras[1];
    return `${palabras[0][0]}${apellido ? apellido[0] : ''}`.toUpperCase();
};

export const colorDe = (semilla = '') => {
    let hash = 0;
    for (let i = 0; i < semilla.length; i += 1) {
        hash = (hash * 31 + semilla.charCodeAt(i)) % 1000003;
    }
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};
