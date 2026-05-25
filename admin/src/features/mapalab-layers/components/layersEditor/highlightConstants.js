export const HIGHLIGHT_COLORS = [
    { value: null, label: 'Morado (default)', stroke: '#5C2472', fill: 'rgba(92, 36, 114, 0.18)' },
    { value: 'naranja', label: 'Naranja institucional', stroke: '#FF8300', fill: 'rgba(255, 131, 0, 0.18)' },
    { value: 'sombreado', label: 'Sombreado discreto', stroke: 'rgba(46, 67, 114, 0.55)', fill: 'rgba(46, 67, 114, 0.18)' },
    { value: '__custom__', label: 'Personalizado (hex)', stroke: '#5C2472', fill: 'rgba(92, 36, 114, 0.18)' },
];

export const HIGHLIGHT_SHAPES = [
    { value: null, label: 'Área + línea', preview: 'area' },
    { value: 'linea', label: 'Solo línea', preview: 'linea' },
    { value: 'off', label: 'Sin resaltar', preview: 'off' },
];

export const isHexHighlight = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v);

export const resolveColorEntry = (value) => {
    if (isHexHighlight(value)) {
        const fill = `${value}2D`;
        return { value: '__custom__', stroke: value, fill, label: `Personalizado (${value})` };
    }
    const v = value === undefined ? null : value;
    return HIGHLIGHT_COLORS.find((c) => c.value === v) || HIGHLIGHT_COLORS[0];
};
