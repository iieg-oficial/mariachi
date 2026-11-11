export const TABLE_COLUMNS = [
    'capa',
    'nombre_capa_geoserver',
    'campo',
    'unidades',
    'paleta',
    'orientacion_favorable',
    'cortes_rangos',
];

export const ORIENTATIONS = [
    { value: 'Inferior', icon: '↓', label: 'Menor es mejor' },
    { value: 'Superior', icon: '↑', label: 'Mayor es mejor' },
    { value: 'Central', icon: '◎', label: 'Lo ideal es el centro' },
    { value: '', icon: '–', label: 'Sin juicio' },
];

const OPEN_END = /^(null|none|y m[aá]s|\+)$/i;

const quote = (value) => {
    const text = String(value ?? '');
    return /[",\n\t]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const parseCuts = (text) => String(text ?? '')
    .replace(/[[\]]/g, '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (OPEN_END.test(part) ? null : Number(part)));

export const formatCuts = (cuts) => `[${cuts.map((c) => (c === null ? 'null' : c)).join(', ')}]`;

export const cutsForDisplay = (text) => parseCuts(text).map((c, index) => {
    if (c !== null) return c;
    return index === 0 ? 'y menos' : 'y más';
});

export const classCount = (text) => Math.max(parseCuts(text).length - 1, 0);

export const hasZeroClass = (text) => {
    const cuts = parseCuts(text);
    return cuts.length > 2 && cuts[0] !== null && cuts[0] === cuts[1];
};

export const rowsToTable = (rows) => [
    TABLE_COLUMNS.join(','),
    ...rows.map((row) => [
        row.nombre,
        `${row.workspace}:${row.layer_name}`,
        row.attribute,
        row.unidades,
        row.paleta,
        row.orientacion,
        row.cortes_texto,
    ].map(quote).join(',')),
].join('\n');

export const updateRow = (rows, fila, changes) => rows.map((row) => (
    row.fila === fila ? { ...row, ...changes } : row
));

export const severityOf = (paletteName) => {
    const match = /_(SENSIBLE|COMPARATIVA|CRITICA)$/.exec(paletteName || '');
    return match ? match[1] : 'SENSIBLE';
};
