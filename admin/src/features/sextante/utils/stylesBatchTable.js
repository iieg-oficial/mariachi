export const TABLE_COLUMNS = [
    'capa',
    'nombre_capa_geoserver',
    'campo',
    'unidades',
    'paleta',
    'orientacion_favorable',
    'cortes_rangos',
];

const EXTRA_COLUMNS = ['nombre_estilo', 'colores'];

export const ORIENTATIONS = [
    { value: 'Inferior', icon: '↓', label: 'Menor es mejor' },
    { value: 'Superior', icon: '↑', label: 'Mayor es mejor' },
    { value: 'Central', icon: '◎', label: 'Lo ideal es el centro' },
    { value: '', icon: '–', label: 'Sin juicio' },
];

const OPEN_WORDS = new Set([
    '', 'null', 'none', 'nan', '+', '-', 'y más', 'y mas', 'y menos', 'más', 'mas', 'menos',
    'más de', 'mas de', 'menos de', 'sin límite', 'sin limite', 'abierto', '∞', '-∞', '+∞',
]);
const NOT_ALLOWED = /[^0-9a-záéíóúñ.\-+∞ ]/g;

const quote = (value) => {
    const text = String(value ?? '');
    return /[",\n\t]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const parseCut = (part) => {
    const clean = part.toLowerCase().replaceAll('−', '-').replace(NOT_ALLOWED, '').replace(/\s+/g, ' ').trim();
    if (OPEN_WORDS.has(clean)) return null;
    const number = Number(clean.replaceAll(' ', ''));
    return Number.isFinite(number) ? number : Number.NaN;
};

export const parseCuts = (text) => {
    const parts = String(text ?? '').replace(/[[\]]/g, '').split(',');
    if (parts.every((part) => !part.trim())) return [];
    return parts.map(parseCut);
};

export const formatCuts = (cuts) => `[${cuts.map((c) => (c === null ? 'null' : c)).join(', ')}]`;

export const cutsForDisplay = (text) => parseCuts(text).map((c, index) => {
    if (c !== null) return Number.isNaN(c) ? '?' : c;
    return index === 0 ? 'y menos' : 'y más';
});

export const cutsForEditing = (text) => cutsForDisplay(text).join(', ');

export const classCount = (text) => Math.max(parseCuts(text).length - 1, 0);

export const hasZeroClass = (text) => {
    const cuts = parseCuts(text);
    return cuts.length > 2 && cuts[0] !== null && cuts[0] === cuts[1];
};

export const rowsToTable = (rows) => [
    [...TABLE_COLUMNS, ...EXTRA_COLUMNS].join(','),
    ...rows.map((row) => [
        row.nombre,
        `${row.workspace}:${row.layer_name}`,
        row.attribute,
        row.unidades,
        row.paleta,
        row.orientacion,
        row.cortes_texto,
        row.estilo,
        row.colores_propios,
    ].map(quote).join(',')),
].join('\n');

const isHeaderRow = (row) => TABLE_COLUMNS.every((column) => (row[column] || '').trim().toLowerCase() === column);

export const gridToTable = (gridRows) => {
    const rows = gridRows
        .filter((row) => TABLE_COLUMNS.some((column) => (row[column] || '').trim()))
        .filter((row) => !isHeaderRow(row));
    if (!rows.length) return '';
    return [
        TABLE_COLUMNS.join(','),
        ...rows.map((row) => TABLE_COLUMNS.map((column) => quote((row[column] || '').trim())).join(',')),
    ].join('\n');
};

export const updateRow = (rows, fila, changes) => rows.map((row) => (
    row.fila === fila ? { ...row, ...changes } : row
));

export const removeRows = (rows, filas) => rows.filter((row) => !filas.includes(row.fila));

export const severityOf = (paletteName) => {
    const match = /_(SENSIBLE|COMPARATIVA|CRITICA)$/.exec(paletteName || '');
    return match ? match[1] : 'SENSIBLE';
};

export const draftToRow = (draft) => ({
    fila: draft.id,
    nombre: draft.data?.style_title || draft.resource_id,
    alias: draft.resource_id.split(':')[0],
    layer_name: draft.data?.layer_name,
    attribute: draft.data?.attribute,
    unidades: (draft.data?.style_abstract || '').replace(/^Unidades: /, ''),
    cortes: draft.data?.cortes || [],
    labels: draft.data?.labels || [],
    colores: draft.data?.colors || [],
    reemplaza: true,
});

export const emptyGrid = (count = 6) => Array.from({ length: count }, () => ({}));
